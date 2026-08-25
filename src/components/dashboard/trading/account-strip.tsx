'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import { fmtUSD, fmtPct, toNum, pnlClass } from '@/lib/format'
import type { Account, ChallengeMetrics } from '@/types/api'
import { cn } from '@/lib/cn'
import { usePrices } from '@/store/prices'

interface Props {
  account: Account | null
  /** Sum of open-position PnL — passed in so the parent owns the data flow. */
  openPnL?: number
  metrics?: ChallengeMetrics | null
  compact?: boolean
}

export const AccountStrip = memo(function AccountStrip({ account, openPnL, metrics, compact }: Props) {
  const connected = usePrices((s) => s.connected)
  const source = usePrices((s) => s.source)

  if (!account) {
    return (
      compact
        ? <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skel h-12 rounded-md shrink-0 w-28" />)}</div>
        : <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 lg:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skel h-12 rounded-md" />)}</div>
    )
  }

  const balance = toNum(account.balance)
  const equity  = toNum(account.equity)
  const used    = toNum(account.margin_used)
  const free    = equity - used
  const level   = used > 0 ? (equity / used) * 100 : null
  const lev     = toNum(account.leverage) || 100
  const pnl     = openPnL ?? (equity - balance)

  const mcLevel = metrics?.plan?.margin_call_level ? toNum(metrics.plan.margin_call_level) : 100
  const marginTone = level !== null && level <= mcLevel ? 'text-danger' : level !== null && level <= mcLevel * 1.2 ? 'text-warn' : 'default' as const

  const items = [
    { label: 'Balance',  value: fmtUSD(balance),               tone: 'default' as const },
    { label: 'Equity',   value: fmtUSD(equity),                tone: 'default' as const, emphasize: true },
    { label: 'P&L',      value: fmtUSD(pnl, { sign: true }),   tone: pnlClass(pnl) },
    { label: 'Free margin', value: fmtUSD(free),               tone: 'default' as const },
    { label: 'Margin level', value: level !== null ? fmtPct(level, 1) : '—',
        tone: marginTone },
    { label: 'Leverage', value: `1:${lev}`,                    tone: 'default' as const },
  ]
  const visible = compact ? items.slice(0, 4) : items

  const feedBadge = (
    <div className="flex items-center gap-1.5 text-3xs font-medium uppercase tracking-wider text-text-muted px-1">
      <span className={cn(
        'w-1.5 h-1.5 rounded-full inline-block',
        connected ? 'bg-success animate-pulse' : 'bg-warn'
      )} />
      <span>{connected ? 'Connected' : 'Connecting'}</span>
    </div>
  )

  const renderProgressBars = () => {
    // The backend returns `[]` (a truthy empty array, not null) when a
    // challenge's plan/account row can't be resolved — guard on .plan too,
    // or metrics.plan.drawdown_type below throws and takes down the dashboard.
    if (!metrics || !metrics.plan) return null

    const maxDdPct = metrics.max_dd_progress * 100
    const dailyDdPct = metrics.daily_dd_progress * 100
    
    // Highlight UI in red/warning as it approaches limits (e.g. >80% is warning, >95% is danger)
    const maxTone = maxDdPct >= 95 ? 'bg-danger' : maxDdPct >= 80 ? 'bg-warn' : 'bg-primary'
    const dailyTone = dailyDdPct >= 95 ? 'bg-danger' : dailyDdPct >= 80 ? 'bg-warn' : 'bg-primary'

    return (
      <div className={cn('grid gap-2 mt-2', compact ? 'grid-cols-1 px-4' : 'grid-cols-1 sm:grid-cols-2')}>
        {/* Daily DD */}
        <div className="rounded-md px-3 py-2 border bg-bg-subtle/40 border-border-subtle flex flex-col justify-center gap-1.5">
          <div className="flex items-center justify-between text-2xs uppercase tracking-wider text-text-muted">
            <span>Daily Loss Limit</span>
            <span className={cn('font-semibold', dailyDdPct >= 80 ? 'text-warn' : dailyDdPct >= 95 ? 'text-danger' : 'text-text')}>
              {fmtUSD(metrics.current_daily_loss)} / {fmtUSD(metrics.daily_dd_val)}
            </span>
          </div>
          <div className="h-1.5 w-full bg-surface-hover rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full transition-all duration-500', dailyTone)} style={{ width: `${Math.min(dailyDdPct, 100)}%` }} />
          </div>
        </div>

        {/* Max DD */}
        <div className="rounded-md px-3 py-2 border bg-bg-subtle/40 border-border-subtle flex flex-col justify-center gap-1.5">
          <div className="flex items-center justify-between text-2xs uppercase tracking-wider text-text-muted">
            <span>Max Loss Limit ({metrics.plan.drawdown_type.replace('_', ' ')})</span>
            <span className={cn('font-semibold', maxDdPct >= 80 ? 'text-warn' : maxDdPct >= 95 ? 'text-danger' : 'text-text')}>
              {fmtUSD(metrics.current_dd)} / {fmtUSD(metrics.max_dd_val)}
            </span>
          </div>
          <div className="h-1.5 w-full bg-surface-hover rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full transition-all duration-500', maxTone)} style={{ width: `${Math.min(maxDdPct, 100)}%` }} />
          </div>
        </div>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between px-4">
          <span className="text-3xs text-text-muted font-mono uppercase tracking-wider">Telemetry</span>
          {feedBadge}
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5 px-4">
          {visible.map((it, i) => (
            <motion.div
              key={it.label}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.2) }}
              className={cn(
                'rounded-md px-2.5 py-2 border shrink-0 w-28',
                it.emphasize
                  ? 'bg-accent-muted/60 border-accent/30'
                  : 'bg-bg-subtle/60 border-border-subtle',
              )}
            >
              <div className="text-2xs uppercase tracking-wider text-text-muted truncate">{it.label}</div>
              <div className={cn('tabular font-semibold text-xs mt-0.5 truncate', it.tone === 'default' ? '' : it.tone)}>
                {it.value}
              </div>
            </motion.div>
          ))}
        </div>
        {renderProgressBars()}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between px-1">
        <span className="text-3xs text-text-muted font-mono uppercase tracking-wider">Trading Account Telemetry</span>
        {feedBadge}
      </div>
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {visible.map((it, i) => (
          <motion.div
            key={it.label}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.2) }}
            className={cn(
              'rounded-md px-2.5 py-2 sm:px-3 border min-w-0',
              it.emphasize
                ? 'bg-accent-muted/60 border-accent/30'
                : 'bg-bg-subtle/60 border-border-subtle',
            )}
          >
            <div className="text-2xs uppercase tracking-wider text-text-muted truncate">{it.label}</div>
            <div className={cn(
              'tabular font-semibold text-xs sm:text-sm mt-0.5 truncate',
              it.tone === 'default' ? '' : it.tone,
            )}>
              {it.value}
            </div>
          </motion.div>
        ))}
      </div>
      {renderProgressBars()}
    </div>
  )
})
