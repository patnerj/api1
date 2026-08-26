'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight, BarChart3, Clock, ListOrdered, PanelLeftClose, PanelLeftOpen, ShoppingCart, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import { useTerminal } from '@/store/terminal'
import { usePrices } from '@/store/prices'
import { useQuery } from '@tanstack/react-query'
import { useMediaQuery } from '@/hooks/use-media-query'
import { fmtPrice, toNum, fmtUSD, fmtPct } from '@/lib/format'
import { invalidateFxsim } from '@/lib/fxsim'
import { playOrderCloseSound } from '@/lib/sound'
import { symbolDigits } from '@/lib/symbol-meta'
import type { Account, NoChallengeResp, Position, PendingOrder, ChallengeAccount, ChallengePlan, ChallengeMetrics, TournamentMine } from '@/types/api'

import { MarketWatch }        from '@/components/dashboard/trading/market-watch'
import { ChartPanel }         from '@/components/dashboard/trading/chart-panel'
import { OrderTicket }        from '@/components/dashboard/trading/order-ticket'
import { PositionsTable }     from '@/components/dashboard/trading/positions-table'
import { PendingOrdersTable } from '@/components/dashboard/trading/pending-orders-table'
import { AccountStrip }       from '@/components/dashboard/trading/account-strip'
import { AccountSwitcher, buildSwitchEntries, type SwitchEntry } from '@/components/dashboard/trading/account-switcher'
import { MobileBottomSheet }  from '@/components/dashboard/trading/mobile-bottom-sheet'
import { SectionErrorBoundary } from '@/components/ui/section-error-boundary'
import { cn }                 from '@/lib/cn'
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle, type PanelImperativeHandle } from 'react-resizable-panels'
import { useRef } from 'react'

function isAccount(x: Account | NoChallengeResp | null): x is Account {
  return !!x && (x as Account).balance !== undefined && !(x as NoChallengeResp).no_challenge
}

type Tab = 'positions' | 'pending'

export default function TradingTerminalPage() {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const bootstrapTerm = useTerminal((s) => s.bootstrap)
  const refreshSymbols = useTerminal((s) => s.refreshSymbols)
  const symbolsLoaded = useTerminal((s) => s.symbolsLoaded)
  const active        = useTerminal((s) => s.active)

  // Real-time state from store
  const account   = usePrices((s) => s.account as Account | NoChallengeResp | null)
  const rawPositions = usePrices((s) => s.positions)
  const optimisticPositions = usePrices((s) => s.optimisticPositions)
  const positions = useMemo(() => {
    if (!rawPositions && (!optimisticPositions || optimisticPositions.length === 0)) return rawPositions
    const real = rawPositions || []
    const opt = (optimisticPositions || []).filter(o => !real.some(r => r.id === o.id))
    return [...opt, ...real]
  }, [rawPositions, optimisticPositions])
  const pending   = usePrices((s) => s.pending)
  
  // Local state for challenges fallback
  const [chs,       setChs]       = useState<ChallengeAccount[] | null>(null)
  const [loaded,    setLoaded]    = useState(false)
  // Fresh-account gate: on mount we force-refetch /account so a stale cached
  // "no challenge / read_only" payload (from before the purchase completed)
  // never flashes the frozen/lock screen for a second before the real
  // active-challenge data lands.
  const [freshCheck, setFreshCheck] = useState(false)
  // Escape hatch: if symbols AND positions both keep failing, don't spin forever.
  const [loadTimedOut, setLoadTimedOut] = useState(false)
  // Tournaments this trader has joined — powers the terminal account switcher.
  const { data: myTournaments } = useQuery({
    queryKey: ['tournamentsMine'],
    queryFn: () => api.tournaments.mine().then(r => (r.ok ? r.data : [])),
    staleTime: 60_000,
  })

  // Switcher entries: every ACTIVE/FUNDED challenge + every joined tournament.
  const switchEntries = buildSwitchEntries(chs ?? [], myTournaments ?? [])

  // Bootstrap symbols once
  useEffect(() => { bootstrapTerm() }, [bootstrapTerm])

  // BUG-011 (Defect A): keep the symbol list in sync with admin activation
  // changes — revalidate on mount and every 30s while the terminal is open, and
  // again when the tab regains focus. No Disable/Enable cycle or manual refresh
  // is ever needed for enabled symbols to appear (or disabled ones to drop).
  useQuery({
    queryKey: ['refreshSymbols'],
    queryFn: async () => {
      await refreshSymbols()
      return true
    },
    refetchInterval: 30_000,
  })

  // Start the prices stream while the terminal page is mounted
  const pricesStart = usePrices((s) => s.start)
  const pricesStop  = usePrices((s) => s.stop)
  useEffect(() => {
    pricesStart()
    return () => pricesStop()
  }, [pricesStart, pricesStop])

  // Refresh callback for trade mutations (close, partial close, SL/TP update, cancel, open, pending)
  const refreshAll = useCallback(async () => {
    invalidateFxsim('/positions')
    invalidateFxsim('/account')
    invalidateFxsim('/history')
    invalidateFxsim('/pending-order/my')
    invalidateFxsim('/pending-order')
    await usePrices.getState().refresh()
  }, [])

  // One-time fetch for challenges (in case user has no active account and needs the lock screen)
  useEffect(() => {
    let mounted = true
    const check = async () => {
      const ch = await api.challengeMy()
      if (mounted) {
        if (ch.ok) {
          setChs(ch.data)
        } else {
          toast.error(ch.error || 'Failed to load challenges')
        }
        setLoaded(true)
      }
    }
    check()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setLoadTimedOut(true), 15_000)
    return () => clearTimeout(t)
  }, [])

  // Mount-time fresh account fetch — see freshCheck above. The gate flips only
  // when the fetch SUCCEEDED: rendering a lock/frozen verdict from a failed
  // fetch's stale-or-null store data would falsely freeze active traders.
  // One retry, then fall through (store data is still better than a hang).
  useEffect(() => {
    let mounted = true
    const run = async () => {
      invalidateFxsim('/account')
      let ok = await usePrices.getState().refresh()
      if (!ok) {
        await new Promise((r) => setTimeout(r, 800))
        ok = await usePrices.getState().refresh()
      }
      if (mounted) setFreshCheck(true)
    }
    run()
    return () => { mounted = false }
  }, [])

  const acc = isAccount(account) ? account : null
  const readOnly = acc?.read_only === true
  // No usable trading account once the first load has settled — covers both an
  // explicit no_challenge payload AND a 404 (account left null). Without the
  // `loaded` gate the page used to fall through and render the terminal with a
  // null account, leaving the stat cards as skeletons forever.
  const noChallenge = (!!account && !isAccount(account)) || (loaded && !acc)

  // Aggregate open PnL — drives AccountStrip's "P&L" tile
  const openPnL = useMemo(() => {
    if (!positions) return 0
    return positions.reduce((s, p) => s + toNum(p.pnl) + toNum(p.swap) - toNum(p.commission), 0)
  }, [positions])

  const accountId = account && 'id' in account ? account.id : null

  const { data: metrics = null } = useQuery({
    queryKey: ['challengeMetrics', accountId],
    queryFn: async () => {
      if (!accountId || !chs) return null
      const ch = chs.find(c => c.fxsim_account_id === accountId)
      if (!ch) return null
      const res = await api.challengeMetrics(ch.id)
      return res.ok ? res.data : null
    },
    enabled: !!accountId && !!chs,
    refetchInterval: 15_000,
  })

  // ── No-challenge / frozen state ──────────────────────────────────────
  // read-only = a failed/passed challenge: keep the final snapshot visible but
  // freeze trading. Funded/active accounts trade normally.
  // Gated on freshCheck: only trust a lock/frozen verdict from data fetched
  // AFTER this mount — stale pre-purchase cache must not flash here.
  if ((noChallenge || readOnly) && freshCheck) {
    return <TradingLockState accounts={chs} account={acc} challengeStatus={acc?.challenge_status ?? null} />
  }

  // ── Loading state ────────────────────────────────────────────────────
  const switching = usePrices((s) => s.contextSwitching)
  if ((switching || !freshCheck || (!symbolsLoaded && positions === null)) && !loadTimedOut) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-sm text-text-muted">
          <div className="h-7 w-7 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          Loading terminal…
        </div>
      </div>
    )
  }

  const plan = metrics?.plan ?? null

  // ── Render layout ────────────────────────────────────────────────────
  return isDesktop
    ? <DesktopLayout account={acc} openPnL={openPnL} positions={positions} pending={pending} plan={plan} metrics={metrics} onChanged={refreshAll} myTournaments={myTournaments} switchEntries={switchEntries} />
    : <MobileLayout  account={acc} openPnL={openPnL} positions={positions} pending={pending} plan={plan} metrics={metrics} onChanged={refreshAll} myTournaments={myTournaments} switchEntries={switchEntries} />
}

// ── Desktop ─────────────────────────────────────────────────────────────

function DesktopLayout({
  account, openPnL, positions, pending, plan, metrics, onChanged, myTournaments, switchEntries,
}: {
  account: Account | null
  openPnL: number
  positions: Position[] | null
  pending: PendingOrder[] | null
  plan: ChallengePlan | null
  metrics: ChallengeMetrics | null
  onChanged: () => void
  myTournaments?: TournamentMine[] | null
  switchEntries: SwitchEntry[]
}) {
  const [tab, setTab] = useState<Tab>('positions')
  const mwPanelRef = useRef<PanelImperativeHandle>(null)
  const posPanelRef = useRef<PanelImperativeHandle>(null)

  // Collapsible positions panel — defaults to open (false) for clear visibility
  const [posCollapsed, setPosCollapsed] = useState(false)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('fxsim:term:pos')
      if (saved === '1') {
        setPosCollapsed(true)
        posPanelRef.current?.collapse()
      } else if (saved === '0') {
        setPosCollapsed(false)
        posPanelRef.current?.expand()
      }
    } catch { /* private mode */ }
  }, [])
  const togglePos = () => {
    const panel = posPanelRef.current
    if (panel) {
      if (panel.isCollapsed()) {
        panel.expand()
      } else {
        panel.collapse()
      }
    } else {
      setPosCollapsed((v) => {
        const next = !v
        try { localStorage.setItem('fxsim:term:pos', next ? '1' : '0') } catch { /* private mode */ }
        return next
      })
    }
  }

  // Collapsible market-watch pane — defaults to open (false) for clear visibility
  const [mwCollapsed, setMwCollapsed] = useState(false)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('fxsim:term:mw')
      if (saved === '1') {
        setMwCollapsed(true)
        mwPanelRef.current?.collapse()
      } else if (saved === '0') {
        setMwCollapsed(false)
        mwPanelRef.current?.expand()
      }
    } catch { /* private mode */ }
  }, [])
  const toggleMw = () => {
    const panel = mwPanelRef.current
    if (panel) {
      if (panel.isCollapsed()) {
        panel.expand()
      } else {
        panel.collapse()
      }
    } else {
      setMwCollapsed((v) => {
        const next = !v
        try { localStorage.setItem('fxsim:term:mw', next ? '1' : '0') } catch { /* private mode */ }
        return next
      })
    }
  }

  // Collapsible order-ticket pane — defaults to open (false)
  const [orderCollapsed, setOrderCollapsed] = useState(false)
  const orderPanelRef = useRef<PanelImperativeHandle>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('fxsim:term:order')
      if (saved === '1') {
        setOrderCollapsed(true)
        orderPanelRef.current?.collapse()
      } else if (saved === '0') {
        setOrderCollapsed(false)
        orderPanelRef.current?.expand()
      }
    } catch {}
  }, [])

  const toggleOrder = () => {
    const panel = orderPanelRef.current
    if (panel) {
      if (panel.isCollapsed()) {
        panel.expand()
      } else {
        panel.collapse()
      }
    } else {
      setOrderCollapsed((v) => {
        const next = !v
        try { localStorage.setItem('fxsim:term:order', next ? '1' : '0') } catch {}
        return next
      })
    }
  }

  // Close all positions handler
  const [isClosingAll, setIsClosingAll] = useState(false)
  const handleCloseAll = async () => {
    if (!positions || positions.length === 0 || isClosingAll) return
    setIsClosingAll(true)
    // Only REAL positions (id > 0) — optimistic rows use negative placeholder
    // ids and would turn into guaranteed-fail /close/-123 requests.
    const closable = positions.filter((p) => p.id > 0)
    if (closable.length === 0) { setIsClosingAll(false); return }
    const toastId = toast.loading(`Closing ${closable.length} position(s)...`)
    try {
      const results = await Promise.all(closable.map((p) => api.close(p.id)))
      const failed = results.filter((r) => !r.ok || !(r.data as any)?.success)
      const succeeded = results.length - failed.length

      invalidateFxsim('/positions')
      invalidateFxsim('/account')
      invalidateFxsim('/history')
      await usePrices.getState().refresh()
      onChanged?.()

      if (succeeded > 0) {
        playOrderCloseSound()
      }

      if (failed.length === 0) {
        toast.success(`Closed all ${positions.length} position(s)!`, { id: toastId })
      } else if (succeeded === 0) {
        const first = failed[0] as any
        const errMsg = first && !first.ok ? first.error : first?.data?.error || first?.data?.message || 'Failed to close positions.'
        toast.error(`Could not close positions: ${errMsg}`, { id: toastId })
      } else {
        toast.warning(`Closed ${succeeded} position(s), but ${failed.length} failed to close.`, { id: toastId })
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to close some positions.', { id: toastId })
    } finally {
      setIsClosingAll(false)
    }
  }

  const balance = toNum(account?.balance)
  const equity  = toNum(account?.equity)
  const used    = toNum(account?.margin_used)
  const free    = equity - used
  const level   = used > 0 ? (equity / used) * 100 : null
  const lev     = toNum(account?.leverage) || 100
  const pnl     = openPnL ?? (equity - balance)

  return (
    <div className="flex flex-col gap-2 h-[calc(100dvh-4.5rem)] min-h-[600px]">
      {/* Account switcher — Challenge ↔ Tournament trading context */}
      <AccountSwitcher entries={switchEntries} />
      <AccountStrip account={account} openPnL={openPnL} metrics={metrics} />
      <PanelGroup orientation="horizontal" className="flex-1 min-h-0 w-full rounded-lg">
        {/* Left: market watch */}
        <Panel
          panelRef={mwPanelRef}
          defaultSize="24%"
          minSize="18%"
          maxSize="30%"
          collapsible={true}
          collapsedSize="4%"
          onResize={(size) => {
            const isCol = size.asPercentage <= 5
            setMwCollapsed(isCol)
            try { localStorage.setItem('fxsim:term:mw', isCol ? '1' : '0') } catch {}
          }}
        >
          {mwCollapsed ? (
            <aside className="rounded-lg border border-border bg-surface flex flex-col items-center py-2 h-full overflow-hidden select-none">
              <button
                onClick={toggleMw}
                className="h-8 w-8 inline-flex items-center justify-center rounded text-text-muted hover:text-text hover:bg-surface-muted focus-ring shrink-0"
                aria-label="Show market watch"
                title="Show market watch"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
              <span className="mt-3 text-2xs font-semibold uppercase tracking-wider text-text-faint [writing-mode:vertical-rl] whitespace-nowrap">
                Market watch
              </span>
            </aside>
          ) : (
            <aside className="rounded-lg border border-border bg-surface flex flex-col h-full min-h-0 overflow-hidden">
              <div className="shrink-0 px-3 py-2.5 border-b border-border-subtle flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Market watch</h3>
                <button
                  onClick={toggleMw}
                  className="h-6 w-6 inline-flex items-center justify-center rounded text-text-muted hover:text-text hover:bg-surface-muted focus-ring"
                  aria-label="Hide market watch"
                  title="Hide market watch"
                >
                  <PanelLeftClose className="h-3.5 w-3.5" />
                </button>
              </div>
              <SectionErrorBoundary>
                <MarketWatch />
              </SectionErrorBoundary>
            </aside>
          )}
        </Panel>

        <PanelResizeHandle className="w-3 relative group">
          <div className="absolute inset-y-0 left-1.5 w-px bg-border-subtle group-hover:bg-accent transition-colors" />
        </PanelResizeHandle>

        {/* Center: chart + tabs */}
        <Panel defaultSize="52%" minSize="40%">
          <PanelGroup orientation="vertical">
            <Panel defaultSize="70%" minSize="30%">
              <section className="rounded-lg border border-border bg-surface overflow-hidden flex flex-col h-full min-h-0">
                <SectionErrorBoundary>
                  <ChartPanel positions={positions} plan={plan || metrics?.plan} />
                </SectionErrorBoundary>
              </section>
            </Panel>
            
            <PanelResizeHandle className="h-3 relative group">
              <div className="absolute inset-x-0 top-1.5 h-px bg-border-subtle group-hover:bg-accent transition-colors" />
            </PanelResizeHandle>

            <Panel
              panelRef={posPanelRef}
              defaultSize="30%"
              minSize="10%"
              collapsible={true}
              collapsedSize="5%"
              onResize={(size) => {
                const isCol = size.asPercentage <= 6
                setPosCollapsed(isCol)
                try { localStorage.setItem('fxsim:term:pos', isCol ? '1' : '0') } catch {}
              }}
            >
              <section className="rounded-lg border border-border bg-surface overflow-hidden flex flex-col h-full min-h-0">
                <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 border-b border-border-subtle bg-bg-subtle/40">
                  <TabButton active={tab === 'positions'} onClick={() => setTab('positions')}>
                    Positions
                    {positions && positions.length > 0 && (
                      <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-muted text-accent text-2xs font-medium px-1">
                        {positions.length}
                      </span>
                    )}
                  </TabButton>
                  <TabButton active={tab === 'pending'} onClick={() => setTab('pending')}>
                    Pending
                    {pending && pending.filter((o) => o.status === 'pending').length > 0 && (
                      <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-warn-muted text-warn text-2xs font-medium px-1">
                        {pending.filter((o) => o.status === 'pending').length}
                      </span>
                    )}
                  </TabButton>

                  {/* 1-Click Close All Positions Button */}
                  {tab === 'positions' && positions && positions.length > 0 && (
                    <button
                      onClick={handleCloseAll}
                      disabled={isClosingAll}
                      className="ml-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 transition-all cursor-pointer shadow-sm active:scale-95"
                      title="Close all open positions at current market price"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
                      {isClosingAll ? 'Closing...' : `Close All (${positions.length})`}
                    </button>
                  )}

                  {/* Connection indicator — real WS state, never hardcoded */}
                  <div className="ml-auto flex items-center gap-2">
                    <WsBadge />
                    <button
                      onClick={togglePos}
                      className="h-6 w-6 inline-flex items-center justify-center rounded text-text-muted hover:text-text hover:bg-surface-muted focus-ring"
                      aria-label={posCollapsed ? 'Expand positions panel' : 'Collapse positions panel'}
                      title={posCollapsed ? 'Expand positions panel' : 'Collapse positions panel'}
                    >
                      {posCollapsed
                        ? <PanelLeftOpen className="h-3.5 w-3.5 rotate-90" />
                        : <PanelLeftClose className="h-3.5 w-3.5 rotate-90" />
                      }
                    </button>
                  </div>
                </div>

                {!posCollapsed && (
                  <>
                    <div className="flex-1 overflow-y-auto min-h-0">
                      <SectionErrorBoundary>
                        {tab === 'positions'
                          ? <PositionsTable positions={positions} onChanged={onChanged} />
                          : <PendingOrdersTable orders={pending} onChanged={onChanged} />
                        }
                      </SectionErrorBoundary>
                    </div>

                    {/* MT5 Bottom Telemetry Summary Row with Dynamic Glow */}
                    {account && (
                      <div className="shrink-0 border-t border-border-subtle bg-bg-subtle/90 backdrop-blur px-3.5 py-1.5 flex items-center justify-between gap-4 text-xs font-mono select-none overflow-x-auto no-scrollbar">
                        <div className="flex items-center gap-4 sm:gap-6 shrink-0 text-text-muted">
                          <span>Balance: <strong className="text-white font-semibold">{fmtUSD(balance)}</strong></span>
                          <span>
                            Equity: <strong className={equity >= balance ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{fmtUSD(equity)}</strong>
                          </span>
                          <span>Margin: <strong className="text-gray-200 font-medium">{fmtUSD(used)}</strong></span>
                          <span>Free Margin: <strong className="text-white font-semibold">{fmtUSD(free)}</strong></span>
                          <span>Margin Level: <strong className={level !== null && level <= 120 ? 'text-rose-400 font-bold' : 'text-gray-200'}>{level !== null ? fmtPct(level, 1) : '—'}</strong></span>
                          <span>Leverage: <strong className="text-gray-300">1:{lev}</strong></span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-text-muted">Total P/L:</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold tabular ${pnl >= 0 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'}`}>
                            {fmtUSD(pnl, { sign: true })}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </section>
            </Panel>
          </PanelGroup>
        </Panel>

        <PanelResizeHandle className="w-3 relative group">
          <div className="absolute inset-y-0 left-1.5 w-px bg-border-subtle group-hover:bg-accent transition-colors" />
        </PanelResizeHandle>

        {/* Right: order ticket (collapsible) */}
        <Panel
          panelRef={orderPanelRef}
          defaultSize="24%"
          minSize="18%"
          maxSize="30%"
          collapsible={true}
          collapsedSize="4%"
          onResize={(size) => {
            const isCol = size.asPercentage <= 5
            setOrderCollapsed(isCol)
            try { localStorage.setItem('fxsim:term:order', isCol ? '1' : '0') } catch {}
          }}
        >
          {orderCollapsed ? (
            <aside className="rounded-lg border border-border bg-surface flex flex-col items-center py-2 h-full overflow-hidden select-none">
              <button
                onClick={toggleOrder}
                className="h-8 w-8 inline-flex items-center justify-center rounded text-text-muted hover:text-text hover:bg-surface-muted focus-ring shrink-0"
                aria-label="Show order ticket"
                title="Show order ticket"
              >
                <PanelLeftOpen className="h-4 w-4 rotate-180" />
              </button>
              <span className="mt-3 text-2xs font-semibold uppercase tracking-wider text-text-faint [writing-mode:vertical-rl] whitespace-nowrap">
                New order
              </span>
            </aside>
          ) : (
            <aside className="rounded-lg border border-border bg-surface overflow-hidden flex flex-col h-full min-h-0">
              <div className="shrink-0 px-3 py-2.5 border-b border-border-subtle flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">New order</h3>
                <button
                  onClick={toggleOrder}
                  className="h-6 w-6 inline-flex items-center justify-center rounded text-text-muted hover:text-text hover:bg-surface-muted focus-ring"
                  aria-label="Hide order ticket"
                  title="Hide order ticket"
                >
                  <PanelLeftClose className="h-3.5 w-3.5 rotate-180" />
                </button>
              </div>
              <SectionErrorBoundary>
                <OrderTicket account={account} plan={plan} onChanged={onChanged} />
              </SectionErrorBoundary>
            </aside>
          )}
        </Panel>
      </PanelGroup>
    </div>
  )
}

function TabButton({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative h-9 px-3 text-xs font-medium transition-colors focus-ring',
        active ? 'text-text' : 'text-text-muted hover:text-text',
      )}
    >
      {children}
      {active && (
        <motion.span
          layoutId="trading-tab-indicator"
          className="absolute inset-x-0 -bottom-px h-0.5 bg-accent rounded-full"
          transition={{ type: 'spring', damping: 28, stiffness: 380 }}
        />
      )}
    </button>
  )
}

/** Live price-feed status — reflects the real WebSocket state. */
function WsBadge() {
  const connected = usePrices((s) => s.connected)
  return (
    <div className={cn(
      'flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-md border',
      connected
        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
        : 'text-warn bg-warn-muted border-warn/30',
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full', connected ? 'bg-emerald-400 animate-pulse' : 'bg-warn animate-pulse')} />
      <span>{connected ? 'Connected' : 'Reconnecting…'}</span>
    </div>
  )
}

// ── Mobile ──────────────────────────────────────────────────────────────

function MobileLayout({
  account, openPnL, positions, pending, plan, metrics, onChanged, myTournaments, switchEntries,
}: {
  account: Account | null
  openPnL: number
  positions: Position[] | null
  pending: PendingOrder[] | null
  plan: ChallengePlan | null
  metrics: ChallengeMetrics | null
  onChanged: () => void
  myTournaments?: TournamentMine[] | null
  switchEntries: SwitchEntry[]
}) {
  type Sheet = null | 'watchlist' | 'order' | 'positions' | 'pending'
  const [sheet, setSheet] = useState<Sheet>(null)
  const active = useTerminal((s) => s.active)
  const getMeta = useTerminal((s) => s.getMeta)
  const tick = usePrices((s) => s.prices[active])
  const meta = getMeta(active)
  const digits = meta?.digits || symbolDigits(active)
  const bid = toNum(tick?.bid)
  const ask = toNum(tick?.ask)

  return (
    <div className="flex flex-col gap-2 h-[calc(100dvh-5rem)] -mx-3 -my-3 md:-mx-4 md:-my-4">
      {/* Account strip with real-time drawdown telemetry */}
      {account && (
        <div className="px-3 pt-2 shrink-0">
          <AccountSwitcher entries={switchEntries} />
          <AccountStrip account={account} openPnL={openPnL} metrics={metrics} compact />
        </div>
      )}

      {/* Chart — fills remaining space; ChartPanel header has symbol + tap-to-change */}
      <div className="flex-1 mx-4 rounded-lg border border-border overflow-hidden min-h-0">
        <SectionErrorBoundary>
          <ChartPanel compact positions={positions} plan={plan || metrics?.plan} onOpenWatchlist={() => setSheet('watchlist')} />
        </SectionErrorBoundary>
      </div>

      {/* Bottom dock — tab strip + floating buy/sell */}
      <div className="shrink-0 relative">
        <div className="grid grid-cols-3 gap-1 mx-4 mb-3 p-1 rounded-md bg-surface border border-border text-2xs">
          <DockButton
            icon={BarChart3}
            label="Markets"
            onClick={() => setSheet('watchlist')}
          />
          <DockButton
            icon={ListOrdered}
            label="Positions"
            count={positions?.length}
            onClick={() => setSheet('positions')}
          />
          <DockButton
            icon={Clock}
            label="Pending"
            count={pending?.filter((o) => o.status === 'pending').length}
            onClick={() => setSheet('pending')}
          />
        </div>
      </div>

      {/* Floating order FAB — anchored bottom-right above safe area */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setSheet('order')}
        className={cn(
          'fixed right-4 bottom-20 z-30 flex items-center gap-2 h-12 px-4 rounded-full font-semibold text-xs shadow-xl transition-shadow',
          'bg-accent text-accent-contrast hover:bg-accent-hover active:bg-accent-active',
          'border border-accent-contrast/20',
        )}
        aria-label="Open order ticket"
      >
        <ShoppingCart className="h-4 w-4" />
        <span>Trade</span>
        <span className="text-3xs opacity-80 tabular">
          {bid > 0 ? `${fmtPrice(bid, digits)} / ${fmtPrice(ask, digits)}` : active}
        </span>
      </motion.button>

      {/* Bottom sheets */}
      <MobileBottomSheet
        open={sheet === 'watchlist'}
        onClose={() => setSheet(null)}
        title="Markets"
        height={0.8}
      >
        <SectionErrorBoundary>
          <MarketWatch onPick={() => setSheet(null)} />
        </SectionErrorBoundary>
      </MobileBottomSheet>

      <MobileBottomSheet
        open={sheet === 'order'}
        onClose={() => setSheet(null)}
        title={`Trade ${active}`}
        height={0.92}
      >
        <SectionErrorBoundary>
          <OrderTicket compact account={account} plan={plan} onChanged={onChanged} onSubmitted={() => setSheet(null)} />
        </SectionErrorBoundary>
      </MobileBottomSheet>

      <MobileBottomSheet
        open={sheet === 'positions'}
        onClose={() => setSheet(null)}
        title={`Positions${positions?.length ? ` (${positions.length})` : ''}`}
        height={0.8}
      >
        <div className="flex-1 overflow-y-auto">
          <SectionErrorBoundary>
            <PositionsTable positions={positions} onChanged={onChanged} compact />
          </SectionErrorBoundary>
        </div>
      </MobileBottomSheet>

      <MobileBottomSheet
        open={sheet === 'pending'}
        onClose={() => setSheet(null)}
        title="Pending orders"
        height={0.8}
      >
        <div className="flex-1 overflow-y-auto">
          <SectionErrorBoundary>
            <PendingOrdersTable orders={pending} onChanged={onChanged} />
          </SectionErrorBoundary>
        </div>
      </MobileBottomSheet>
    </div>
  )
}

function DockButton({
  icon: Icon, label, count, onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  count?: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-center justify-center gap-0.5 h-12 rounded text-text-muted hover:text-text hover:bg-surface-muted/50 focus-ring transition-colors active:scale-95"
    >
      <Icon className="h-4 w-4" />
      <span className="text-2xs font-medium">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="absolute top-1 right-2 h-4 min-w-4 px-1 inline-flex items-center justify-center rounded-full bg-accent text-white text-2xs font-medium">
          {count}
        </span>
      )}
    </button>
  )
}

// ── No-challenge state ──────────────────────────────────────────────────

function TradingLockState({ accounts, account, challengeStatus }: {
  accounts: ChallengeAccount[] | null
  account?: Account | null
  challengeStatus?: string | null
}) {
  const passed = challengeStatus === 'passed' || !!accounts?.some((a) => a.status === 'passed')
  const failed = challengeStatus === 'failed' || !!accounts?.some((a) => a.status === 'failed')
  const funded = challengeStatus === 'funded'
  const reason: 'no_challenge' | 'phase_passed' | 'challenge_failed' | 'funded' =
    funded ? 'funded'
    : passed ? 'phase_passed'
    : failed ? 'challenge_failed'
    : (!accounts || accounts.length === 0) && !account ? 'no_challenge'
    : 'challenge_failed'

  const cfg = {
    no_challenge: {
      tone: 'accent' as const, icon: ShoppingCart,
      title: 'No active challenge',
      body: 'You need an active challenge to access the trading terminal. Purchase a challenge to get started.',
      cta: { href: '/challenges', label: 'Purchase Challenge' },
    },
    phase_passed: {
      tone: 'success' as const, icon: CheckCircle2,
      title: 'Phase passed — trading frozen',
      body: 'Congratulations! This phase has been passed and trading is frozen on it. Your next phase will be available shortly — check your dashboard.',
      cta: { href: '/dashboard', label: 'Go to Dashboard' },
    },
    challenge_failed: {
      tone: 'danger' as const, icon: XCircle,
      title: 'Challenge ended — trading frozen',
      body: 'This challenge has ended and trading is frozen. Your final results are shown below. You can start a new challenge whenever you’re ready.',
      cta: { href: '/challenges', label: 'Start a new challenge' },
    },
    funded: {
      tone: 'success' as const, icon: CheckCircle2,
      title: 'Funded account — trading frozen',
      body: 'This account is funded. Trading is currently frozen here; check your dashboard for next steps.',
      cta: { href: '/dashboard', label: 'Go to Dashboard' },
    },
  }[reason]

  const Icon = cfg.icon
  const bg = cfg.tone === 'success' ? 'bg-success-muted text-success'
    : cfg.tone === 'danger' ? 'bg-danger-muted text-danger' : 'bg-accent-muted text-accent'

  const statusLabel = failed ? 'Failed' : passed ? 'Passed' : funded ? 'Funded' : null

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="text-center max-w-md">
        <div className={`inline-flex h-12 w-12 rounded-xl items-center justify-center mb-4 ${bg}`}>
          <Icon className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight">{cfg.title}</h2>
        <p className="text-sm text-text-muted mt-2">{cfg.body}</p>

        {account && (
          <div className="mt-5 grid grid-cols-2 gap-2 text-left">
            {statusLabel && (
              <div className="col-span-2 flex items-center justify-between rounded-md border border-border-subtle px-3 py-2">
                <span className="text-2xs uppercase tracking-wider text-text-muted">Final status</span>
                <span className={`text-sm font-semibold ${failed ? 'text-danger' : 'text-success'}`}>{statusLabel}</span>
              </div>
            )}
            <div className="rounded-md border border-border-subtle px-3 py-2">
              <div className="text-2xs uppercase tracking-wider text-text-muted">Balance</div>
              <div className="text-sm font-semibold tabular">{fmtUSD(toNum(account.balance))}</div>
            </div>
            <div className="rounded-md border border-border-subtle px-3 py-2">
              <div className="text-2xs uppercase tracking-wider text-text-muted">Equity</div>
              <div className="text-sm font-semibold tabular">{fmtUSD(toNum(account.equity))}</div>
            </div>
          </div>
        )}

        <div className="mt-6">
          <a href={cfg.cta.href} className="inline-flex h-10 px-5 items-center rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-hover focus-ring">
            {cfg.cta.label}
          </a>
        </div>
      </div>
    </div>
  )
}
