'use client'

import { memo, useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  ArrowUpRight, ArrowDownRight, AlertCircle, CheckCircle2,
  Plus, Minus, Calculator,
} from 'lucide-react'
import { api } from '@/lib/api'
import { invalidateFxsim } from '@/lib/fxsim'
import { useTerminal } from '@/store/terminal'
import { usePrices } from '@/store/prices'
import { cn } from '@/lib/cn'
import { fmtPrice, fmtUSD, toNum, fmtLots } from '@/lib/format'
import { symbolDigits, pipSize, estimatedPipValue } from '@/lib/symbol-meta'
import { useQuery } from '@tanstack/react-query'
import type { Account, ChallengePlan } from '@/types/api'
import { playOrderSuccessSound } from '@/lib/sound'

type Mode = 'market' | 'pending'
type PendingType = 'buy_limit' | 'sell_limit' | 'buy_stop' | 'sell_stop'

interface Props {
  /** Compact layout for mobile sheet (tighter spacing). */
  compact?: boolean
  /** Account for risk-calculator / free-margin display. */
  account?: Account | null
  /** Plan rules to enforce */
  plan?: ChallengePlan | null
  /** Optional active challenge */
  challenge?: any
  /** Called after position / order changes to trigger unified refresh. */
  onChanged?: () => void
  /** Called after a successful order so the parent can close a sheet. */
  onSubmitted?: () => void
}

export const OrderTicket = memo(function OrderTicket({ compact, account, plan, challenge, onChanged, onSubmitted }: Props) {
  const active = useTerminal((s) => s.active)
  const meta   = useTerminal((s) => s.getMeta(active))
  const tick   = usePrices((s) => s.prices[active])
  
  const injectOptimisticPosition = usePrices((s) => s.injectOptimisticPosition)
  const removeOptimisticPosition = usePrices((s) => s.removeOptimisticPosition)
  const injectOptimisticPending = usePrices((s) => s.injectOptimisticPending)
  const removeOptimisticPending = usePrices((s) => s.removeOptimisticPending)
  const refreshUser = usePrices((s) => s.refreshUser)

  const [mode, setMode] = useState<Mode>('market')
  const [pendingType, setPendingType] = useState<PendingType>('buy_limit')
  const [lot, setLot]    = useState('0.10')
  const [sl,  setSl]     = useState('')
  const [tp,  setTp]     = useState('')
  const [target, setTarget] = useState('')   // pending only
  const [risk, setRisk]  = useState('1')     // risk % for calculator
  const [showCalc, setShowCalc] = useState(false)
  const [busy, setBusy]  = useState<'buy' | 'sell' | 'pending' | null>(null)

  const { data: newsEvents } = useQuery({
    queryKey: ['newsEvents'],
    queryFn: () => api.newsEvents(),
    refetchInterval: 30000,
  })

  // Check if we are currently inside the restricted news window for this pair
  const isNewsRestricted = useMemo(() => {
    if (!plan || plan.news_trading === 1) return false
    const events = newsEvents && newsEvents.ok ? newsEvents.data : null
    if (!events || !Array.isArray(events)) return false

    const windowMs = (plan.news_window_minutes || 2) * 60 * 1000
    const now = Date.now()
    
    return events.some((event: any) => {
      if (event.impact !== 'High') return false
      // The symbol (e.g. EURUSD) must include the currency (e.g. USD)
      if (!active.includes(event.currency)) return false
      const eventTime = new Date(event.event_time_utc.replace(' ', 'T') + 'Z').getTime()
      return Math.abs(eventTime - now) <= windowMs
    })
  }, [plan, newsEvents, active])

  const isIpRestricted = !!((plan as any)?.ip_match_required && ((account as any)?.ip_restricted || (account as any)?.is_ip_restricted))

  const digits = meta?.digits || symbolDigits(active)
  const minLot = toNum(meta?.min_lot)  || 0.01
  let maxLot = toNum(meta?.max_lot)  || 100
  if (plan?.max_lot_size) {
    maxLot = Math.min(maxLot, toNum(plan.max_lot_size))
  }
  const lotStep = 0.01
  const contractSize = toNum(meta?.contract_size) || 100000

  const bid = toNum(tick?.bid)
  const ask = toNum(tick?.ask)
  const spread = bid && ask ? Math.max(0, ask - bid) : 0
  const spreadPips = spread / pipSize(active, digits)

  // Numeric versions for previews
  const lotN = toNum(lot)
  const slN  = sl.trim() ? toNum(sl) : null
  const tpN  = tp.trim() ? toNum(tp) : null
  const targetN = target.trim() ? toNum(target) : null

  // Reset SL/TP/target when switching active symbol
  useEffect(() => {
    setSl(''); setTp(''); setTarget('')
  }, [active])

  // Bump lot by step
  const bumpLot = useCallback((delta: number) => {
    const next = Math.min(maxLot, Math.max(minLot, Math.round((lotN + delta) * 100) / 100))
    setLot(next.toFixed(2))
  }, [lotN, minLot, maxLot])

  // Risk calculator: lot sized to risk X% of balance per the SL distance
  const recommendedLot = useMemo(() => {
    if (!account || !slN || !ask) return null
    const balance = toNum(account.balance)
    const riskPct = toNum(risk)
    const riskAmt = balance * (riskPct / 100)
    const entry   = mode === 'market' ? ask : (targetN || ask)
    const priceDiff = Math.abs(entry - slN)
    if (priceDiff <= 0) return null
    const perLotRisk = priceDiff * contractSize
    if (perLotRisk <= 0) return null
    const rec = riskAmt / perLotRisk
    return Math.min(maxLot, Math.max(minLot, Math.round(rec * 100) / 100))
  }, [account, slN, ask, risk, mode, targetN, contractSize, minLot, maxLot])

  const allPrices = usePrices((s) => s.prices)

  // Approximate margin for the order (mirrors backend calc_margin_usd)
  const leverage = toNum(account?.leverage) || 100
  const entryPx  = mode === 'market' ? ask : (targetN || ask)
  
  const margin = useMemo(() => {
    if (leverage <= 0) return 0
    const baseMargin = (lotN * contractSize) / leverage
    
    // Check quote/base currency for margin calculation
    if (['EURUSD','GBPUSD','AUDUSD','NZDUSD','XAUUSD','XAGUSD','BTCUSD','ETHUSD'].includes(active)) {
      return baseMargin * entryPx
    } else if (['USDJPY','USDCAD','USDCHF'].includes(active)) {
      return baseMargin
    } else if (active === 'EURGBP') {
      const eurusd = allPrices['EURUSD']
      const rate = eurusd ? (eurusd.mid || eurusd.bid) : 1.10
      return baseMargin * rate
    } else if (['EURJPY', 'GBPJPY'].includes(active)) {
      const base = active.substring(0, 3) + 'USD'
      const baseusd = allPrices[base]
      const rate = baseusd ? (baseusd.mid || baseusd.bid) : 1.20
      return baseMargin * rate
    }
    
    return baseMargin * entryPx // fallback
  }, [active, lotN, contractSize, leverage, entryPx, allPrices])

  // SL/TP preview — in market mode we don't know buy/sell yet so we show the
  // absolute risk/reward magnitude. In pending mode we know the side and can
  // show a signed P&L.
  const slPnL = useMemo(() => {
    if (!slN || !ask) return null
    if (mode === 'market') {
      // Magnitude only — sign will resolve when user picks BUY or SELL
      return Math.abs(slN - ask) * contractSize * lotN
    }
    const direction = pendingType.startsWith('buy') ? 1 : -1
    const px = targetN || ask
    return (slN - px) * direction * contractSize * lotN
  }, [slN, ask, lotN, contractSize, mode, pendingType, targetN])

  const tpPnL = useMemo(() => {
    if (!tpN || !ask) return null
    if (mode === 'market') {
      return Math.abs(tpN - ask) * contractSize * lotN
    }
    const direction = pendingType.startsWith('buy') ? 1 : -1
    const px = targetN || ask
    return (tpN - px) * direction * contractSize * lotN
  }, [tpN, ask, lotN, contractSize, mode, pendingType, targetN])

  // ── Submit ────────────────────────────────────────────────────────────
  // Client-side free-margin gate — mirrors the server check so traders get an
  // instant, clear rejection instead of waiting for a server error.
  const freeMargin = account ? toNum(account.equity) - toNum(account.margin_used) : Infinity
  const marginExceeded = Number.isFinite(freeMargin) && margin > freeMargin

  const rejectIfNoMargin = (): boolean => {
    if (marginExceeded) {
      toast.error(
        `Insufficient free margin: order needs ${fmtUSD(margin)}, you have ${fmtUSD(Math.max(0, freeMargin))}. Reduce the lot size or close positions.`,
      )
      return true
    }
    return false
  }

  const submitMarket = async (side: 'buy' | 'sell') => {
    if (!Number.isFinite(lotN) || lotN < minLot) {
      toast.error(`Lot size must be at least ${minLot}`); return
    }
    if (rejectIfNoMargin()) return
    if (plan?.stop_loss_required && slN === null) {
      toast.error('Stop Loss is required by your plan rules.'); return
    }
    if (isNewsRestricted) {
      toast.error(`Trading restricted: High-impact news event window (${plan?.news_window_minutes}m)`); return
    }
    if (isIpRestricted) {
      toast.error(`Trading restricted: IP address mismatch (Strict Mode)`); return
    }
    setBusy(side)

    const optId = -Math.floor(Math.random() * 1000000)
    const optPos: any = {
      id: optId,
      symbol: active,
      type: side,
      lot_size: lotN,
      open_price: side === 'buy' ? ask : bid,
      open_time: new Date().toISOString(),
      sl: slN ?? null,
      tp: tpN ?? null,
      status: 'simulated'
    }
    injectOptimisticPosition(optPos)

    const res = await api.open({
      symbol:   active,
      type:     side,
      lot_size: lotN,
      sl:       slN ?? null,
      tp:       tpN ?? null,
    })
    setBusy(null)
    if (res.ok && res.data.success) {
      playOrderSuccessSound()
      toast.success(`${side.toUpperCase()} ${lotN} ${active} opened`)
      if (onChanged) {
        onChanged()
      } else {
        refreshUser()
        invalidateFxsim('/positions')
        invalidateFxsim('/account')
      }
      setSl(''); setTp('')
      onSubmitted?.()
    } else {
      removeOptimisticPosition(optId)
      toast.error(res.ok ? (res.data.message || 'Order rejected') : res.error)
    }
  }

  const submitPending = async () => {
    if (!targetN) { toast.error('Enter a trigger price'); return }
    if (!Number.isFinite(lotN) || lotN < minLot) {
      toast.error(`Lot size must be at least ${minLot}`); return
    }
    if (rejectIfNoMargin()) return
    if (plan?.stop_loss_required && slN === null) {
      toast.error('Stop Loss is required by your plan rules.'); return
    }
    if (isNewsRestricted) {
      toast.error(`Trading restricted: High-impact news event window (${plan?.news_window_minutes}m)`); return
    }
    if (isIpRestricted) {
      toast.error(`Trading restricted: IP address mismatch (Strict Mode)`); return
    }
    const side = pendingType.startsWith('buy') ? 'buy' : 'sell'
    setBusy('pending')

    const optId = -Math.floor(Math.random() * 1000000)
    const optOrd: any = {
      id: optId,
      account_id: 0,
      symbol: active,
      order_type: pendingType,
      type: side,
      lot_size: lotN,
      target_price: targetN,
      sl: slN ?? null,
      tp: tpN ?? null,
      margin: 0,
      status: 'pending',
      expires_at: null,
      reject_reason: null,
      created_at: new Date().toISOString(),
      isOptimistic: true,
    }
    injectOptimisticPending(optOrd)

    const res = await api.pendingPlace({
      symbol:       active,
      order_type:   pendingType,
      type:         side,
      lot_size:     lotN,
      target_price: targetN,
      sl:           slN ?? null,
      tp:           tpN ?? null,
    })
    setBusy(null)
    if (res.ok && res.data.success) {
      playOrderSuccessSound()
      toast.success(`${pendingType.replace('_', ' ')} ${lotN} ${active} placed @ ${fmtPrice(targetN, digits)}`)
      if (onChanged) {
        onChanged()
      } else {
        refreshUser()
        invalidateFxsim('/pending-order/my')
        invalidateFxsim('/pending-order')
        invalidateFxsim('/account')
      }
      setSl(''); setTp(''); setTarget('')
      onSubmitted?.()
    } else {
      removeOptimisticPending(optId)
      toast.error(res.ok ? (res.data.message || 'Order rejected') : res.error)
    }
  }

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Mode toggle */}
      <div className={cn('shrink-0 px-3 pt-3', compact && 'px-3 pt-3')}>
        <div className="flex gap-1 p-0.5 rounded-md bg-surface-muted/60 text-2xs">
          {(['market', 'pending'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                'flex-1 h-7 rounded transition-colors font-medium uppercase tracking-wider',
                mode === m ? 'bg-bg-subtle text-text shadow-card' : 'text-text-muted hover:text-text',
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
        {/* Pending type selector */}
        {mode === 'pending' && (
          <div className="grid grid-cols-2 gap-1 text-2xs">
            {(['buy_limit', 'sell_limit', 'buy_stop', 'sell_stop'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setPendingType(t)}
                className={cn(
                  'h-8 rounded-md border font-medium uppercase tracking-wider transition-colors px-1 truncate whitespace-nowrap',
                  pendingType === t
                    ? t.startsWith('buy')
                      ? 'border-success/40 bg-success-muted text-success'
                      : 'border-danger/40 bg-danger-muted text-danger'
                    : 'border-border bg-surface text-text-muted hover:text-text hover:border-border-strong',
                )}
              >
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>
        )}

        {/* Market info strip */}
        <div className="grid grid-cols-3 gap-1 rounded-md bg-bg-subtle/60 border border-border-subtle p-2 text-2xs min-w-0">
          <div className="min-w-0">
            <div className="text-text-faint">Bid</div>
            <div className="tabular font-medium text-success truncate">{bid ? fmtPrice(bid, digits) : '—'}</div>
          </div>
          <div className="text-center min-w-0">
            <div className="text-text-faint">Spread</div>
            <div className="tabular font-medium truncate">{bid && ask ? `${spreadPips.toFixed(1)}p` : '—'}</div>
          </div>
          <div className="text-right min-w-0">
            <div className="text-text-faint">Ask</div>
            <div className="tabular font-medium text-danger truncate">{ask ? fmtPrice(ask, digits) : '—'}</div>
          </div>
        </div>

        {/* Volume */}
        <Field label="Volume (lots)" hint={`min ${minLot} · max ${maxLot}`}>
          <div className="flex items-stretch gap-1">
            <button onClick={() => bumpLot(-lotStep)} className="h-9 w-9 rounded-md border border-border bg-surface text-text-muted hover:text-text hover:bg-surface-muted/60 focus-ring flex items-center justify-center">
              <Minus className="h-3.5 w-3.5" />
            </button>
            <input
              type="text"
              inputMode="decimal"
              value={lot}
              onChange={(e) => setLot(e.target.value.replace(/[^\d.]/g, ''))}
              onBlur={() => {
                const n = Math.min(maxLot, Math.max(minLot, toNum(lot) || minLot))
                setLot(n.toFixed(2))
              }}
              className="flex-1 h-9 px-3 rounded-md bg-surface border border-border text-sm tabular text-center focus-ring focus:border-accent"
            />
            <button onClick={() => bumpLot(lotStep)} className="h-9 w-9 rounded-md border border-border bg-surface text-text-muted hover:text-text hover:bg-surface-muted/60 focus-ring flex items-center justify-center">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          {/* Lot presets */}
          <div className="flex gap-1 mt-1.5">
            {[0.01, 0.1, 0.5, 1, 5].filter((v) => v >= minLot && v <= maxLot).map((v) => (
              <button
                key={v}
                onClick={() => setLot(v.toFixed(2))}
                className={cn(
                  'flex-1 h-6 rounded text-2xs font-medium transition-colors tabular',
                  lotN === v
                    ? 'bg-accent-muted text-accent'
                    : 'bg-surface-muted/50 text-text-muted hover:text-text',
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </Field>

        {/* Pending target price */}
        {mode === 'pending' && (
          <Field label="Trigger price">
            <input
              type="text"
              inputMode="decimal"
              value={target}
              onChange={(e) => setTarget(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder={ask ? fmtPrice(ask, digits) : '0.00000'}
              className="w-full h-9 px-3 rounded-md bg-surface border border-border text-sm tabular focus-ring focus:border-accent"
            />
          </Field>
        )}

        {/* SL */}
        <Field label="Stop loss" hint={
          slPnL !== null && Number.isFinite(slPnL)
            ? <span className={mode === 'market' ? 'text-danger' : pnlClassOrNull(slPnL)}>
                {mode === 'market' ? '−' : ''}{fmtUSD(Math.abs(slPnL))} {mode === 'market' && <span className="text-text-faint">risk</span>}
              </span>
            : null
        }>
          <input
            type="text"
            inputMode="decimal"
            value={sl}
            onChange={(e) => setSl(e.target.value.replace(/[^\d.]/g, ''))}
            placeholder="Optional"
            className="w-full h-10 px-3 rounded-md bg-bg-subtle border border-border-subtle shadow-inner text-sm tabular focus-ring focus:bg-surface focus:border-accent transition-colors"
          />
        </Field>

        {/* TP */}
        <Field label="Take profit" hint={
          tpPnL !== null && Number.isFinite(tpPnL)
            ? <span className={mode === 'market' ? 'text-success' : pnlClassOrNull(tpPnL)}>
                {mode === 'market' ? '+' : ''}{fmtUSD(Math.abs(tpPnL))} {mode === 'market' && <span className="text-text-faint">target</span>}
              </span>
            : null
        }>
          <input
            type="text"
            inputMode="decimal"
            value={tp}
            onChange={(e) => setTp(e.target.value.replace(/[^\d.]/g, ''))}
            placeholder="Optional"
            className="w-full h-10 px-3 rounded-md bg-bg-subtle border border-border-subtle shadow-inner text-sm tabular focus-ring focus:bg-surface focus:border-accent transition-colors"
          />
        </Field>

        {/* Risk calculator */}
        <button
          onClick={() => setShowCalc((v) => !v)}
          className="w-full inline-flex items-center justify-center gap-1.5 h-7 rounded-md border border-border-subtle bg-surface text-2xs text-text-muted hover:text-text hover:border-border focus-ring"
        >
          <Calculator className="h-3 w-3" />
          {showCalc ? 'Hide' : 'Show'} risk calculator
        </button>
        <AnimatePresence initial={false}>
          {showCalc && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="rounded-md bg-bg-subtle/60 border border-border-subtle p-3 space-y-2 text-2xs">
                <div className="flex items-center gap-2">
                  <span className="text-text-muted">Risk</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={risk}
                    onChange={(e) => setRisk(e.target.value.replace(/[^\d.]/g, ''))}
                    className="w-14 h-7 px-2 rounded border border-border bg-surface text-2xs tabular text-center focus-ring"
                  />
                  <span className="text-text-muted">% of balance</span>
                  {recommendedLot !== null && (
                    <button
                      onClick={() => setLot(recommendedLot.toFixed(2))}
                      className="ml-auto h-6 px-2 rounded bg-accent-muted text-accent text-2xs font-medium hover:bg-accent/30 transition-colors"
                    >
                      Use {recommendedLot.toFixed(2)} lots
                    </button>
                  )}
                </div>
                <div className="text-text-faint">
                  {recommendedLot === null
                    ? 'Enter a stop loss to calculate position size.'
                    : `Risking ${fmtUSD(toNum(account?.balance) * toNum(risk) / 100)} of ${fmtUSD(account?.balance)}`}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cost preview */}
        <div className="rounded-md bg-bg-subtle/40 border border-border-subtle p-3.5 space-y-2 text-2xs shadow-sm">
          <KV label="Position size"  value={`${fmtLots(lotN)} lots`} />
          <KV label="Pip value"      value={fmtUSD(estimatedPipValue(active, contractSize, lotN))} />
          <KV label="Required margin" value={fmtUSD(margin)} mono />
          {account?.equity != null && (
            <KV label="Free margin" value={fmtUSD(toNum(account.equity) - toNum(account.margin_used))} mono />
          )}
        </div>
      </div>

      {/* Buy/Sell action bar — pinned at bottom of ticket */}
      <div className="shrink-0 px-3 pb-3 pt-2 bg-surface border-t border-border-subtle flex flex-col gap-2">
        {isNewsRestricted && (
          <div className="flex items-center gap-2 rounded-md bg-warning-muted text-warning-strong p-2.5 text-2xs shadow-sm border border-warning/20">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              High-impact news window active ({plan?.news_window_minutes} min). Trading is disabled.
            </span>
          </div>
        )}
        {isIpRestricted && (
          <div className="flex items-center gap-2 rounded-md bg-destructive-muted text-destructive-strong p-2.5 text-2xs shadow-sm border border-destructive/20">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              Strict Mode active: Your current IP address does not match your registered IP. Trading is disabled.
            </span>
          </div>
        )}

        {mode === 'market' ? (
          <div className="grid grid-cols-2 gap-1.5">
            <ActionButton
              tone="sell"
              busy={busy === 'sell'}
              disabled={busy !== null || !bid || isNewsRestricted || isIpRestricted}
              onClick={() => submitMarket('sell')}
            >
              <ArrowDownRight className="h-4 w-4 shrink-0" />
              <div className="flex flex-col items-start leading-tight min-w-0">
                <span className="text-2xs opacity-80">SELL</span>
                <span className="text-xs sm:text-sm tabular font-semibold truncate">{bid ? fmtPrice(bid, digits) : '—'}</span>
              </div>
            </ActionButton>
            <ActionButton
              tone="buy"
              busy={busy === 'buy'}
              disabled={busy !== null || !ask || isNewsRestricted || isIpRestricted}
              onClick={() => submitMarket('buy')}
            >
              <div className="flex flex-col items-end leading-tight min-w-0">
                <span className="text-2xs opacity-80">BUY</span>
                <span className="text-xs sm:text-sm tabular font-semibold truncate">{ask ? fmtPrice(ask, digits) : '—'}</span>
              </div>
              <ArrowUpRight className="h-4 w-4 shrink-0" />
            </ActionButton>
          </div>
        ) : (
          <button
            disabled={busy !== null || !targetN || isNewsRestricted || isIpRestricted}
            onClick={submitPending}
            className={cn(
              'w-full h-11 rounded-md font-semibold text-sm flex items-center justify-center gap-2 transition-all focus-ring',
              busy === 'pending' && 'opacity-60',
              pendingType.startsWith('buy')
                ? 'bg-success text-white hover:bg-success-hover disabled:bg-success/40'
                : 'bg-danger text-white hover:bg-danger-hover disabled:bg-danger/40',
            )}
          >
            {busy === 'pending'
              ? <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              : <CheckCircle2 className="h-4 w-4" />}
            Place {pendingType.replace('_', ' ').toUpperCase()}
          </button>
        )}
      </div>
    </div>
  )
})

// ── Subcomponents ────────────────────────────────────────────────────────

function Field({
  label, hint, children,
}: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <label className="text-2xs uppercase tracking-wider text-text-muted font-medium">{label}</label>
        {hint && <span className="text-2xs tabular">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function KV({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-text-muted">{label}</span>
      <span className={cn('font-medium text-text', mono && 'tabular')}>{value}</span>
    </div>
  )
}

function ActionButton({
  tone, busy, disabled, onClick, children,
}: {
  tone: 'buy' | 'sell'
  busy?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'group relative h-12 rounded-md font-semibold text-white px-2.5 flex items-center justify-between gap-1 transition-all focus-ring overflow-hidden',
        'shadow-[0_2px_4px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.15)] active:scale-[0.98]',
        tone === 'buy'
          ? 'bg-gradient-to-b from-success/90 to-success hover:from-success hover:to-success-hover shadow-success/20 disabled:from-success/40 disabled:to-success/40'
          : 'bg-gradient-to-b from-danger/90 to-danger hover:from-danger hover:to-danger-hover shadow-danger/20 disabled:from-danger/40 disabled:to-danger/40',
        disabled && 'cursor-not-allowed shadow-none',
      )}
    >
      {busy && (
        <span className="absolute inset-0 flex items-center justify-center rounded-md bg-inherit z-10">
          <span className="h-5 w-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
        </span>
      )}
      <div className={cn("relative z-0 flex items-center justify-between w-full", busy && "opacity-0")}>
        {children}
      </div>
    </button>
  )
}

function pnlClassOrNull(v: number | null) {
  if (v === null || !Number.isFinite(v)) return 'text-text-muted'
  if (v > 0) return 'text-success'
  if (v < 0) return 'text-danger'
  return 'text-text-muted'
}
