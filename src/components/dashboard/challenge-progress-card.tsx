'use client'

import type { ChallengeMetrics } from '@/types/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CircularProgress } from '@/components/ui/circular-progress'
import { fmtUSD, fmtPct, statusLabel, statusTone, toNum } from '@/lib/format'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface Props { metrics: ChallengeMetrics }

export function ChallengeProgressCard({ metrics: m }: Props) {
  const phase  = m.phase
  const isFunded = m.status === 'funded'
  const planSize = toNum(m.plan?.account_size ?? m.challenge.account_size ?? 0)

  return (
    <Card className="h-full relative overflow-hidden group border-border/60 hover:border-border-strong hover:shadow-sm transition-all duration-200">
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-accent/5 opacity-20 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-2xs uppercase tracking-wider text-text-muted">Active challenge</div>
            <CardTitle className="mt-1 text-base truncate">
              {m.plan?.name ?? `Challenge #${m.challenge.id}`}
            </CardTitle>
            <div className="text-2xs text-text-muted mt-0.5 tabular flex items-center gap-1.5 flex-wrap">
              <span>{fmtUSD(planSize, { decimals: 0 })}</span>
              <span>&middot;</span>
              <span>Phase {phase}</span>
              {m.challenge.drawdown_type && (
                <>
                  <span>&middot;</span>
                  <span>{m.challenge.drawdown_type === 'trailing' ? 'Trailing DD' : m.challenge.drawdown_type === 'eod_trailing' ? 'EOD Trailing DD' : 'Static DD'}</span>
                </>
              )}
              {(m.challenge.scaling_level ?? 0) > 0 && (
                <>
                  <span>&middot;</span>
                  <span className="text-success">Scale Lv {m.challenge.scaling_level}</span>
                </>
              )}
            </div>
          </div>
          <Badge tone={statusTone(m.status)} className="shadow-glow">{statusLabel(m.status)}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 relative z-10">
        {m.breach_reason && (
          <div className="flex items-start gap-2 p-2.5 rounded-md bg-danger-muted border border-danger/30 text-2xs">
            <AlertCircle className="h-3.5 w-3.5 text-danger shrink-0 mt-0.5" />
            <span className="text-danger">{m.breach_reason}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* Profit target / Scaling target */}
          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-surface-muted/30 border border-border-subtle">
            <div className="text-2xs text-text-muted mb-2 uppercase tracking-wider">
              {isFunded && (toNum(m.plan?.scaling_enabled) === 1) ? 'Scaling Target' : 'Profit Target'}
            </div>
            <CircularProgress value={m.profit_target_val === 0 ? 100 : m.profit_progress} size={70} strokeWidth={5} tone="success">
              <span className="text-xs font-bold tabular text-success">
                {m.profit_target_val === 0 ? '---' : fmtPct(m.current_profit_pct, 1, true)}
              </span>
            </CircularProgress>
            <div className="text-2xs text-text-muted mt-2 tabular">
              {m.profit_target_val === 0 ? (
                <span className="opacity-70">No Target</span>
              ) : (
                <>{fmtUSD(m.current_profit, { sign: true })} of {fmtUSD(m.profit_target_val)}</>
              )}
            </div>
          </div>

          {/* Daily DD */}
          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-surface-muted/30 border border-border-subtle">
            <div className="text-2xs text-text-muted mb-2 uppercase tracking-wider">Daily Drawdown</div>
            <CircularProgress 
              value={m.daily_dd_progress} 
              size={70} 
              strokeWidth={5} 
              tone={m.daily_dd_progress > 70 ? 'danger' : 'warn'}
            >
              <span className="text-xs font-bold tabular">{fmtPct(m.daily_dd_used_pct, 1)}</span>
            </CircularProgress>
            <div className="text-2xs text-text-muted mt-2 tabular">
              limit {fmtPct(m.daily_dd_pct)}
            </div>
          </div>

          {/* Max DD */}
          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-surface-muted/30 border border-border-subtle">
            <div className="text-2xs text-text-muted mb-2 uppercase tracking-wider">Max Drawdown</div>
            <CircularProgress 
              value={m.max_dd_progress} 
              size={70} 
              strokeWidth={5} 
              tone={m.max_dd_progress > 70 ? 'danger' : 'warn'}
            >
              <span className="text-xs font-bold tabular">{fmtPct(m.current_dd_pct, 1)}</span>
            </CircularProgress>
            <div className="text-2xs text-text-muted mt-2 tabular">
              limit {fmtPct(m.max_dd_pct)}
            </div>
          </div>

          {/* Trading days */}
          {!isFunded ? (
            <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-surface-muted/30 border border-border-subtle">
              <div className="text-2xs text-text-muted mb-2 uppercase tracking-wider">Trading Days</div>
              <CircularProgress value={m.days_progress} size={70} strokeWidth={5} tone="info">
                <span className="text-xs font-bold tabular">{m.trading_days_done}</span>
              </CircularProgress>
              <div className="text-2xs text-text-muted mt-2 tabular">
                min {m.min_trading_days} days
              </div>
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-surface-muted/30 border border-border-subtle">
              <div className="text-2xs text-text-muted mb-2 uppercase tracking-wider">Status</div>
              <div className="h-[70px] flex items-center justify-center">
                 <Badge tone="success" className="shadow-glow-success px-3 py-1 text-sm">Funded</Badge>
              </div>
              <div className="text-2xs text-text-muted mt-2">
                 Active
              </div>
            </div>
          )}
        </div>

        {isFunded && (
          <Button asChild variant="success" size="sm" className="w-full mt-4 shadow-glow-success">
            <Link href="/dashboard/payouts">Request payout →</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
