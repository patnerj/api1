'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { HealthReport, HealthItem } from '@/types/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/cn'
import { HeartPulse, RefreshCw, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'

const ORDER = [
  'mt5_feed', 'last_price_update', 'stripe', 'stripe_webhook',
  'smtp', 'rest_api', 'certificates', 'storage', 'cron', 'ssl',
] as const

export default function AdminHealthPage() {
  const [report, setReport] = useState<HealthReport | null>(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    const res = await api.admin.health(true)
    setLoading(false)
    if (res.ok) setReport(res.data)
  }
  useEffect(() => { load() }, [])

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System health</h1>
          <p className="text-sm text-text-muted mt-1">
            Read-only monitoring of platform services. Checks never modify trading, payment, or challenge systems.
          </p>
        </div>
        <Button variant="outline" onClick={load} loading={loading}>
          {!loading && <RefreshCw className="h-4 w-4" />} Re-run checks
        </Button>
      </div>

      {!report ? (
        <Card className="p-6"><Skeleton className="h-72 w-full" /></Card>
      ) : (
        <>
          {/* Score */}
          <Card>
            <CardContent className="py-6 flex items-center gap-5">
              <ScoreRing score={report.score} />
              <div>
                <div className="text-sm font-medium">System Health Score</div>
                <div className="text-2xs text-text-muted mt-1 leading-relaxed">
                  {report.score >= 90 ? 'All core services are operating normally.'
                    : report.score >= 70 ? 'The platform is operational with items worth attention below.'
                    : 'One or more core services need attention before going live.'}
                </div>
                <div className="text-2xs text-text-faint mt-1.5">
                  Checked {new Date(report.generated_at * 1000).toLocaleTimeString()}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HeartPulse className="h-4 w-4 text-accent" /> Service checks
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border-subtle/60 -mt-1">
              {ORDER.map((key) => {
                const item = report.items[key]
                if (!item) return null
                return <HealthRow key={key} item={item} />
              })}
              {/* Any extra items the backend adds in future versions */}
              {Object.entries(report.items)
                .filter(([k]) => !(ORDER as readonly string[]).includes(k))
                .map(([k, item]) => <HealthRow key={k} item={item} />)}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function HealthRow({ item }: { item: HealthItem }) {
  const icon = item.state === 'ok'
    ? <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
    : item.state === 'warn'
      ? <AlertTriangle className="h-5 w-5 text-warn shrink-0" />
      : <XCircle className="h-5 w-5 text-danger shrink-0" />
  return (
    <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <div className="mt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium">{item.label}</div>
          <StatusPill state={item.state} />
        </div>
        <div className="text-2xs text-text-muted mt-0.5 leading-relaxed">{item.detail}</div>
        {item.explain && (
          <div className="text-2xs text-text-faint mt-1 leading-relaxed italic">What this means: {item.explain}</div>
        )}
      </div>
    </div>
  )
}

function StatusPill({ state }: { state: HealthItem['state'] }) {
  const cfg = {
    ok:    { text: 'Healthy', cls: 'bg-success-muted text-success' },
    warn:  { text: 'Warning', cls: 'bg-warn-muted text-warn' },
    error: { text: 'Error',   cls: 'bg-danger-muted text-danger' },
  }[state]
  return <span className={cn('text-2xs font-medium px-2 py-0.5 rounded-full shrink-0', cfg.cls)}>{cfg.text}</span>
}

function ScoreRing({ score }: { score: number }) {
  const r = 34
  const c = 2 * Math.PI * r
  const filled = (score / 100) * c
  const color = score >= 90 ? 'text-success' : score >= 70 ? 'text-warn' : 'text-danger'
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 84 84" className="h-24 w-24 -rotate-90">
        <circle cx="42" cy="42" r={r} className="stroke-border-subtle" strokeWidth="7" fill="none" />
        <circle
          cx="42" cy="42" r={r}
          className={cn('transition-all duration-700', color)}
          stroke="currentColor" strokeWidth="7" fill="none"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c - filled}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold tabular leading-none">{score}</span>
        <span className="text-2xs text-text-faint">/ 100</span>
      </div>
    </div>
  )
}
