'use client'

import { create } from 'zustand'
import { api } from '@/lib/api'
import { fxsimStream, invalidateFxsim } from '@/lib/fxsim'
import type { PricesMap, PriceTick, Account, Position, PendingOrder } from '@/types/api'

export type TradingContext =
  | { kind: 'challenge'; accountId?: number; title?: string }
  | { kind: 'tournament'; tournamentId: number; title: string }
  | null

interface PriceState {
  prices:    PricesMap
  account:   Account | null
  positions: Position[] | null
  optimisticPositions: Position[]
  pending:   PendingOrder[] | null
  ts:        number
  connected: boolean
  source:    'ws' | 'poll' | 'idle'
  hasFetched: boolean
  /** Active trading context: null = default (latest active challenge),
   *  challenge+accountId = a specific challenge account (multi-account),
   *  tournament = a tournament's dedicated account. */
  tradingContext: TradingContext
  /** True while a context switch is re-fetching everything. */
  contextSwitching: boolean

  start: () => void
  stop:  () => void
  get:   (symbol: string) => PriceTick | undefined
  refresh: () => Promise<boolean>
  refreshUser: () => Promise<void>
  /** Wipe ALL user data (logout) — shared-computer leak prevention. */
  reset: () => void
  /** Switch trading context and immediately re-fetch everything. */
  setTradingContext: (ctx: TradingContext) => Promise<void>
  addOptimisticPosition: (pos: Position) => void
  injectOptimisticPosition: (pos: Position) => void
  removeOptimisticPosition: (id: number) => void
  injectOptimisticPending: (pending: PendingOrder) => void
  removeOptimisticPending: (id: number) => void
}

let pollTimer:   ReturnType<typeof setInterval> | null = null
let stream:      WebSocket | null = null
let visListener: (() => void) | null = null
let refCount     = 0
const POLL_MS = 4000
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0

export function buildContextParams(ctx: TradingContext): { account_id?: number; tournament_id?: number } | undefined {
  if (!ctx) return undefined
  if (ctx.kind === 'tournament') return { tournament_id: ctx.tournamentId }
  if (ctx.accountId) return { account_id: ctx.accountId }
  return undefined
}

function clearPoll() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}
function closeStream() {
  if (stream) { stream.close(); stream = null }
}

/** Narrow an /account response to a real Account (or null for no-challenge). */
function toAccount(res: Awaited<ReturnType<typeof api.account>>): Account | null {
  if (!res.ok) return null
  return 'no_challenge' in res.data ? null : (res.data as Account)
}

export const usePrices = create<PriceState>((set, get) => {
  // Only write keys whose value actually changed. For the array/object slices
  // (account/positions/pending) we compare by value so a 4s poll that returns
  // identical data does NOT push a new reference and re-render the terminal.
  const stableSet = (patch: Partial<PriceState>) => {
    const cur = get()
    const out: Partial<PriceState> = { ...patch }
    // Drop value-equal slices so identical poll results don't push new refs.
    if ('account' in patch && JSON.stringify(patch.account) === JSON.stringify(cur.account)) delete out.account
    if ('positions' in patch && JSON.stringify(patch.positions) === JSON.stringify(cur.positions)) delete out.positions
    if ('pending' in patch && JSON.stringify(patch.pending) === JSON.stringify(cur.pending)) delete out.pending
    if (Object.keys(out).length) set(out)
  }

  return {
    prices: {},
    account: null,
    positions: null,
    optimisticPositions: [],
    pending: null,
    ts: 0,
    connected: false,
    source: 'idle',
    hasFetched: false,
    tradingContext: null,
    contextSwitching: false,

    start: () => {
      refCount++
      if (refCount > 1) return
      if (typeof window === 'undefined') return

      // Poll account, positions, pending every 4s regardless of WS state, so the
      // WS can stay stateless/anonymous (prices only). Prices are polled too when
      // the WS is down.
      const startPollingUser = () => {
        if (pollTimer) return
        let consecutiveFailures = 0
        const tick = async () => {
          // Failure backoff: when the server is overloaded/resetting, hammering
          // it every 4s makes things worse. Skip ticks after consecutive failures.
          if (consecutiveFailures >= 3) {
            await new Promise((r) => setTimeout(r, 8000))
          }
          if (typeof document !== 'undefined' && document.hidden) return

          const shouldPollPrices = !get().connected || get().source !== 'ws'

          const tParams = buildContextParams(get().tradingContext)
          const [acc, pos, pen] = await Promise.all([
            api.account(tParams),
            api.positions(tParams),
            api.pendingMine(tParams),
          ])

          // Only overwrite from SUCCESSFUL responses. On a network failure we
          // keep the last-known account/positions/pending so a transient drop
          // never nulls the account (which would falsely trip the "challenge
          // ended" lock screen). A real no-challenge is an OK response that
          // toAccount() maps to null — that still updates.
          const patch: Partial<PriceState> = {}
          if (acc.ok) patch.account = toAccount(acc)
          if (pos.ok) {
            patch.positions = pos.data
            // If real position arrives, clear out optimistic ones with same symbol/side approx matching?
            // Actually, we'll just let usePlaceOrder remove it by ID once api.open resolves.
          }
          if (pen.ok) patch.pending = pen.data

          if (shouldPollPrices) {
            const res = await api.prices()
            if (res.ok) {
              patch.prices = res.data
              patch.ts = Date.now()
              patch.connected = true
              patch.source = 'poll'
            } else {
              patch.connected = false
            }
          }

          const allFailed = !acc.ok && !pos.ok && !pen.ok
          consecutiveFailures = allFailed ? consecutiveFailures + 1 : 0

          if (allFailed) {
            // WS is nominally "ws" but every user fetch failed — we're offline.
            patch.connected = false
          }

          stableSet(patch)
        }
        tick()
        pollTimer = setInterval(tick, POLL_MS)
      }

      const tryStream = () => {
        if (reconnectTimeout) clearTimeout(reconnectTimeout)

        const s = fxsimStream()
        if (!s) { set({ source: 'poll' }); return }
        stream = s
        set({ source: 'ws' })

        s.addEventListener('message', (ev) => {
          try {
            const data = JSON.parse((ev as MessageEvent).data)
            if (data.type === 'prices') {
              set((st) => ({ prices: { ...st.prices, ...data.data }, ts: Date.now(), connected: true }))
            }
          } catch { /* malformed */ }
        })

        s.onopen  = () => { reconnectAttempts = 0; set({ connected: true }) }
        s.onerror = () => {
          set({ connected: false })
          closeStream()

          reconnectAttempts++
          if (reconnectAttempts > 5) {
            set({ source: 'poll' })
          } else {
            const backoff = Math.min(1000 * Math.pow(2, reconnectAttempts), 15000)
            reconnectTimeout = setTimeout(tryStream, backoff)
          }
        }
      }

      // Pause everything when tab hidden, resume on visible.
      visListener = () => {
        if (document.hidden) {
          closeStream()
          clearPoll()
        } else if (get().source === 'idle' || (!stream && !pollTimer)) {
          tryStream()
          startPollingUser()
        }
      }
      document.addEventListener('visibilitychange', visListener)

      tryStream()
      startPollingUser()

      // One immediate fetch so the first paint isn't blank.
      const tParams0 = buildContextParams(get().tradingContext)
      Promise.all([api.prices(), api.account(tParams0), api.positions(tParams0), api.pendingMine(tParams0)])
        .then(([res, acc, pos, pen]) => {
          const patch: Partial<PriceState> = { hasFetched: true }
          if (acc.ok) patch.account = toAccount(acc)
          if (pos.ok) patch.positions = pos.data
          if (pen.ok) patch.pending = pen.data
          if (res.ok) {
            patch.prices = res.data
            patch.ts = Date.now()
            patch.connected = true
          }
          stableSet(patch)
        })
        .catch(() => { set({ hasFetched: true }) })
    },

    stop: () => {
      refCount = Math.max(0, refCount - 1)
      if (refCount > 0) return
      closeStream()
      clearPoll()
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
        reconnectTimeout = null
      }
      if (visListener && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', visListener)
        visListener = null
      }
      reconnectAttempts = 0
      set({ connected: false, source: 'idle' })
    },

    get: (symbol) => get().prices[symbol],

    refresh: async () => {
      const tParams = buildContextParams(get().tradingContext)
      const [acc, pos, pen] = await Promise.all([
        api.account(tParams),
        api.positions(tParams),
        api.pendingMine(tParams),
      ])
      const patch: Partial<PriceState> = {}
      if (acc.ok) patch.account = toAccount(acc)
      if (pos.ok) {
        patch.positions = pos.data
        set({ optimisticPositions: [] })
      }
      if (pen.ok) patch.pending = pen.data
      stableSet(patch)
      return acc.ok
    },

    /** Switch trading context (challenge ↔ tournament) and immediately
     *  re-fetch everything for the newly selected account. */
    setTradingContext: async (ctx) => {
      const prev = get().tradingContext
      if (JSON.stringify(prev) === JSON.stringify(ctx)) return
      // contextSwitching keeps the UI on the loading spinner — without it the
      // nulled account briefly renders the "challenge ended / frozen" screen.
      set({
        tradingContext: ctx,
        contextSwitching: true,
        account: null,
        positions: null,
        pending: null,
        optimisticPositions: [],
      })
      invalidateFxsim('/account')
      invalidateFxsim('/positions')
      invalidateFxsim('/pending-order/my')
      try {
        await get().refresh()
      } finally {
        set({ contextSwitching: false })
      }
    },

    /** Wipe ALL user data on logout — the next login on a shared computer must
     *  never see the previous user's balance/positions/optimistic rows. */
    reset: () => {
      set({
        account: null,
        positions: null,
        optimisticPositions: [],
        pending: null,
        prices: {},
        ts: 0,
        connected: false,
        source: 'idle',
        hasFetched: false,
    tradingContext: null,
    contextSwitching: false,
      })
    },

    refreshUser: async () => {
      await get().refresh()
    },

    addOptimisticPosition: (pos) => {
      set((s) => ({ optimisticPositions: [pos, ...s.optimisticPositions] }))
    },

    injectOptimisticPosition: (pos) => {
      get().addOptimisticPosition(pos)
    },

    removeOptimisticPosition: (id) => {
      set((s) => ({ optimisticPositions: s.optimisticPositions.filter(p => p.id !== id) }))
    },

    injectOptimisticPending: (pending) => {
      set((s) => ({ pending: s.pending ? [pending, ...s.pending] : [pending] }))
    },

    removeOptimisticPending: (id) => {
      set((s) => ({ pending: s.pending ? s.pending.filter(p => p.id !== id) : [] }))
    },
  }
})
