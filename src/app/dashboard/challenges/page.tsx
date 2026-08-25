'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import { fmtUSD, fmtPct, fmtDate, toNum, statusLabel, statusTone, pnlClass } from '@/lib/format'
import type { ChallengeAccount, ChallengeMetrics } from '@/types/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/ui/page-header'
import { ChallengeProgressCard } from '@/components/dashboard/challenge-progress-card'
import { ChevronDown, Plus, Trophy } from 'lucide-react'
import { cn } from '@/lib/cn'

export default function DashboardChallenges() {
  const [metrics, setMetrics] = useState<Record<number, ChallengeMetrics | undefined>>({})
  const [expanded, setExpanded] = useState<number | null>(null)

  const { data: rawList, isPending } = useQuery({
    queryKey: ['challengeMy'],
    queryFn: async () => {
      const res = await api.challengeMy()
      if (!res.ok) throw new Error('Failed to fetch')
      return res.data
    },
    refetchInterval: 15_000,
  })

  const list = (rawList as ChallengeAccount[]) || null
  const loading = isPending && !list

  useEffect(() => {
    if (!list) return
    const active = list.find((c) => c.status === 'active')
    if (active && !metrics[active.id]) {
      api.challengeMetrics(active.id).then((m) => {
        if (m.ok) setMetrics((prev) => ({ ...prev, [active.id]: m.data }))
      })
    }
  }, [list, metrics])

  const toggleExpand = async (id: number) => {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    if (!metrics[id]) {
      const m = await api.challengeMetrics(id)
      if (m.ok) setMetrics((prev) => ({ ...prev, [id]: m.data }))
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        variant="hero"
        title="Your challenges"
        description="Track active evaluations, see past results, and start new challenges."
        icon={Trophy}
        badge={{ label: 'Evaluations', tone: 'accent' }}
        actions={
          <Button asChild size="sm">
            <Link href="/challenges"><Plus className="h-4 w-4 mr-1.5" /> New challenge</Link>
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Card key={i} className="p-5"><Skeleton className="h-20 w-full" /></Card>)}
        </div>
      ) : !list || list.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="p-10 text-center">
            <div className="inline-flex h-12 w-12 rounded-xl bg-accent/10 text-accent items-center justify-center mb-4">
              <Trophy className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-text">No challenges yet</h2>
            <p className="text-sm text-text-muted mt-2 max-w-md mx-auto leading-relaxed">
              Buy your first challenge to start the evaluation process.
            </p>
            <Button asChild size="lg" className="mt-6">
              <Link href="/challenges">Browse challenges →</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {list.map((c) => {
            const exp     = expanded === c.id
            const m       = metrics[c.id]
            const profit  = toNum(c.current_balance) - toNum(c.starting_balance)
            const profitPct = (profit / Math.max(1, toNum(c.starting_balance))) * 100
            return (
              <Card key={c.id} className="overflow-hidden border-border/60">
                <button
                  onClick={() => toggleExpand(c.id)}
                  className="w-full p-4 sm:p-5 flex items-center gap-4 hover:bg-surface-muted/30 transition-colors text-left focus-ring"
                  aria-expanded={exp}
                >
                  <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4">
                    <div>
                      <div className="font-semibold text-text truncate">{c.plan_name ?? `Challenge #${c.id}`}</div>
                      <div className="text-2xs text-text-muted tabular">{fmtUSD(c.account_size ?? 0, { decimals: 0 })}</div>
                    </div>
                    <div className="hidden sm:block">
                      <div className="text-2xs text-text-muted">Phase</div>
                      <div className="text-sm font-medium text-text">{c.phase}</div>
                    </div>
                    <div className="hidden sm:block">
                      <div className="text-2xs text-text-muted">P&L</div>
                      <div className={cn('text-sm font-medium tabular', pnlClass(profit))}>
                        {fmtUSD(profit, { sign: true })} <span className="text-2xs text-text-muted">({fmtPct(profitPct, 1, true)})</span>
                      </div>
                    </div>
                    <div className="flex items-center sm:justify-end gap-2">
                      <Badge tone={statusTone(c.status)}>{statusLabel(c.status)}</Badge>
                    </div>
                  </div>
                  <ChevronDown className={cn('h-4 w-4 text-text-muted shrink-0 transition-transform duration-200', exp && 'rotate-180')} />
                </button>

                <AnimatePresence initial={false}>
                  {exp && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden border-t border-border-subtle"
                    >
                      <div className="p-4 sm:p-5">
                        {m ? (
                          <div className="grid lg:grid-cols-2 gap-4">
                            <ChallengeProgressCard metrics={m} />
                            <ChallengeDetailCard challenge={c} metrics={m} />
                          </div>
                        ) : (
                          <Skeleton className="h-64 w-full" />
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ChallengeDetailCard({ challenge: c, metrics: m }: { challenge: ChallengeAccount; metrics: ChallengeMetrics }) {
  return (
    <Card className="h-full relative overflow-hidden border-border/60">
      <CardHeader><CardTitle>Account details</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <KV label="Started"           value={fmtDate(c.created_at)} />
        <KV label="Phase started"     value={fmtDate(c.phase_started_at)} />
        {c.passed_at  && <KV label="Phase passed" value={fmtDate(c.passed_at)} />}
        {c.failed_at  && <KV label="Failed"       value={fmtDate(c.failed_at)} tone="danger" />}
        {c.funded_at  && <KV label="Funded"       value={fmtDate(c.funded_at)} tone="success" />}
        <hr className="border-border-subtle" />
        <KV label="Starting balance" value={fmtUSD(m.starting_balance)} mono />
        <KV label="Current balance"  value={fmtUSD(m.balance)} mono />
        <KV label="Equity"           value={fmtUSD(m.equity)} mono />
        <KV label="Peak balance"     value={fmtUSD(c.peak_balance)} mono />
        <hr className="border-border-subtle" />
        <KV label="Win rate"      value={fmtPct(m.win_rate)} />
        <KV label="Profit factor" value={m.profit_factor.toFixed(2)} mono />
        <KV label="Total trades"  value={String(m.total_trades)} />
      </CardContent>
    </Card>
  )
}

function KV({ label, value, mono, tone }: { label: string; value: string; mono?: boolean; tone?: 'success' | 'danger' }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-text-muted">{label}</span>
      <span className={cn(
        'font-medium',
        mono && 'tabular',
        tone === 'success' && 'text-success',
        tone === 'danger'  && 'text-danger',
      )}>{value}</span>
    </div>
  )
}
