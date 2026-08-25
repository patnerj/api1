'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ResponsiveContainer, BarChart, Bar, AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, type TooltipProps } from 'recharts'
import { TrendingUp, Users as UsersIcon, Trophy, DollarSign, AlertCircle, PieChart } from 'lucide-react'
import { api } from '@/lib/api'
import { fmtUSD, fmtNum, fmtPct, toNum } from '@/lib/format'
import type { AnalyticsRevenue, AnalyticsGrowth, AnalyticsChallenges } from '@/types/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export default function AdminAnalyticsPage() {
  const [revenue,   setRevenue]   = useState<AnalyticsRevenue | null>(null)
  const [growth,    setGrowth]    = useState<AnalyticsGrowth | null>(null)
  const [challenges, setChallenges] = useState<AnalyticsChallenges | null>(null)
  const [error,     setError]     = useState<string | null>(null)
  const [period,    setPeriod]    = useState<'daily' | 'weekly' | 'monthly'>('monthly')

  const refresh = useCallback(async () => {
    const [r, g, c] = await Promise.all([
      api.admin.analyticsRevenue(period),
      api.admin.analyticsGrowth(period),
      api.admin.analyticsChallenges(),
    ])
    if (r.ok) setRevenue(r.data)
    if (g.ok) setGrowth(g.data)
    if (c.ok) setChallenges(c.data)
    if (!r.ok && !g.ok && !c.ok) setError(r.error)
  }, [period])
  useEffect(() => { refresh() }, [refresh])

  const periodLabel = period === 'daily' ? 'last 30 days' : period === 'weekly' ? 'last 12 weeks' : 'last 12 months'

  return (
    <div className="space-y-6">
      {/* Vibrant Header Banner */}
      <div className="relative isolate overflow-hidden bg-surface rounded-2xl border border-border p-6 sm:p-8">
        {/* Ambient background glow */}
        <div className="absolute -top-24 -right-24 -z-10 h-64 w-64 rounded-full bg-accent/30 blur-3xl opacity-60 mix-blend-screen" />
        <div className="absolute -bottom-24 -left-24 -z-10 h-64 w-64 rounded-full bg-info/20 blur-3xl opacity-60 mix-blend-screen" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-[150%] w-[150%] bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-accent to-accent-foreground drop-shadow-sm flex items-center gap-3">
              <PieChart className="h-8 w-8 text-accent" />
              Analytics
            </h1>
            <p className="text-sm text-text-muted mt-2 max-w-xl leading-relaxed">
              Revenue, growth, and challenge performance — {periodLabel}.
            </p>
          </div>
          <div className="inline-flex rounded-lg border border-border/50 p-1 bg-surface-muted/50 backdrop-blur-sm shadow-sm">
            {(['daily', 'weekly', 'monthly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 text-sm font-medium rounded-md capitalize transition-all duration-300 ${period === p ? 'bg-surface shadow text-accent' : 'text-text-muted hover:text-text hover:bg-surface/50'}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-3 rounded-md bg-danger-muted border border-danger/30 text-sm">
          <AlertCircle className="h-4 w-4 text-danger shrink-0 mt-0.5" />
          <span className="text-danger">{error}</span>
        </div>
      )}

      {/* Headline stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {!revenue || !growth ? (
          Array.from({ length: 4 }).map((_, i) => <Card key={i} className="p-5"><Skeleton className="h-14 w-full" /></Card>)
        ) : (
          <>
            <Headline icon={DollarSign} label="Total revenue"     value={fmtUSD(revenue.total)} tone="success" />
            <Headline icon={UsersIcon}  label="Total users"        value={fmtNum(growth.total_users)} tone="accent" />
            <Headline icon={Trophy}     label="Total challenges"   value={fmtNum(growth.total_challenges)} tone="info" />
            <Headline icon={TrendingUp} label="Funded accounts"    value={fmtNum(growth.total_funded)} tone="success" />
          </>
        )}
      </div>

      {/* Revenue chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue</CardTitle>
          <p className="text-2xs text-text-muted">Approved orders, {periodLabel}</p>
        </CardHeader>
        <CardContent className="p-0">
          {revenue ? <RevenueChart data={revenue.monthly} /> : <Skeleton className="h-64 mx-6 mb-6" />}
        </CardContent>
      </Card>

      {/* Growth + Plans side-by-side */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Growth</CardTitle>
            <p className="text-2xs text-text-muted">New users, challenges, and funded accounts per month</p>
          </CardHeader>
          <CardContent className="p-0">
            {growth ? <GrowthChart growth={growth} /> : <Skeleton className="h-64 mx-6 mb-6" />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Revenue by plan</CardTitle></CardHeader>
          <CardContent>
            {revenue ? <PlanRevenueList rows={revenue.by_plan} /> : <Skeleton className="h-48" />}
          </CardContent>
        </Card>
      </div>

      {/* Challenge analytics */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Challenge status breakdown</CardTitle></CardHeader>
          <CardContent>
            {challenges ? <StatusBreakdown rows={challenges.status_counts} /> : <Skeleton className="h-48" />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Pass rates by plan</CardTitle></CardHeader>
          <CardContent>
            {challenges ? <PassRatesList rows={challenges.pass_rates} /> : <Skeleton className="h-48" />}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ── Headline tile ─────────────────────────────────────────────────────

function Headline({ icon: Icon, label, value, tone }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  tone: 'accent' | 'success' | 'info'
}) {
  const TONES = {
    accent:  'bg-accent-muted text-accent',
    success: 'bg-success-muted text-success',
    info:    'bg-info-muted text-info',
  }
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between mb-2">
        <div className="text-2xs uppercase tracking-wider text-text-muted">{label}</div>
        <div className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${TONES[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="text-xl sm:text-2xl font-bold tracking-tight tabular truncate">{value}</div>
    </Card>
  )
}

// ── Charts ────────────────────────────────────────────────────────────

function RevenueChart({ data }: { data: AnalyticsRevenue['monthly'] }) {
  const series = useMemo(() => data.map((d) => ({ month: d.month, total: toNum(d.total) })), [data])
  if (series.length === 0) return <div className="h-64 flex items-center justify-center text-sm text-text-muted">No revenue yet</div>
  return (
    <div className="h-64 px-2 pb-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
          <defs>
            <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#7c6ef5" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#7c6ef5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 4" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="month" stroke="rgba(156,163,175,0.6)" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={fmtMonthTick} />
          <YAxis stroke="rgba(156,163,175,0.6)" tickLine={false} axisLine={false} tick={{ fontSize: 11 }}
                 tickFormatter={(v: number) => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} width={50} allowDecimals={false} />
          <Tooltip content={<MoneyTooltip label="Revenue" />} cursor={{ stroke: 'rgba(124,110,245,0.4)', strokeDasharray: '3 4' }} />
          <Area type="monotone" dataKey="total" stroke="#7c6ef5" strokeWidth={2} fill="url(#revFill)" dot={{ r: 3, fill: '#7c6ef5', strokeWidth: 0 }} activeDot={{ r: 5 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function GrowthChart({ growth }: { growth: AnalyticsGrowth }) {
  // Merge the three series by month
  const months = useMemo(() => {
    const set = new Set<string>()
    growth.new_users?.forEach((d) => set.add(d.month))
    growth.new_challenges?.forEach((d) => set.add(d.month))
    growth.funded_monthly?.forEach((d) => set.add(d.month))
    const months = Array.from(set).sort()
    return months.map((m) => ({
      month:      m,
      users:      toNum(growth.new_users?.find((d) => d.month === m)?.count ?? 0),
      challenges: toNum(growth.new_challenges?.find((d) => d.month === m)?.count ?? 0),
      funded:     toNum(growth.funded_monthly?.find((d) => d.month === m)?.count ?? 0),
    }))
  }, [growth])
  if (months.length === 0) return <div className="h-64 flex items-center justify-center text-sm text-text-muted">No data yet</div>
  return (
    <div className="h-64 px-2 pb-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={months} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 4" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="month" stroke="rgba(156,163,175,0.6)" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={fmtMonthTick} />
          <YAxis stroke="rgba(156,163,175,0.6)" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={36} allowDecimals={false} />
          <Tooltip content={<CountTooltip />} cursor={{ stroke: 'rgba(124,110,245,0.4)', strokeDasharray: '3 4' }} />
          <Line type="monotone" dataKey="users"      stroke="#7c6ef5" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Users" />
          <Line type="monotone" dataKey="challenges" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Challenges" />
          <Line type="monotone" dataKey="funded"     stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Funded" />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-4 text-2xs text-text-muted -mt-1 mb-2">
        <Legend color="#7c6ef5" label="Users" />
        <Legend color="#0ea5e9" label="Challenges" />
        <Legend color="#10B981" label="Funded" />
      </div>
    </div>
  )
}

/** Turn bucket keys (2026-06, 2026-06-09, 2026-W23) into short readable ticks. */
function fmtMonthTick(v: string): string {
  if (!v) return ''
  const m = /^(\d{4})-(\d{2})$/.exec(v)
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, 1).toLocaleDateString(undefined, { month: 'short' })
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
  if (d) return new Date(Number(d[1]), Number(d[2]) - 1, Number(d[3])).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return v.replace(/^\d{4}-/, '')
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}

function MoneyTooltip({ label, active, payload }: TooltipProps<number, string> & { label: string }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload as { month: string; total: number }
  return (
    <div className="rounded-lg glass-strong px-3 py-2 shadow-card-lg text-xs">
      <div className="text-text-muted">{p.month}</div>
      <div className="font-semibold tabular text-text mt-0.5">{label}: {fmtUSD(p.total)}</div>
    </div>
  )
}

function CountTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const month = payload[0].payload.month
  return (
    <div className="rounded-lg glass-strong px-3 py-2 shadow-card-lg text-xs space-y-1">
      <div className="text-text-muted">{month}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-text-muted">{p.name}:</span>
          <span className="tabular font-medium">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Lists ─────────────────────────────────────────────────────────────

function PlanRevenueList({ rows }: { rows: AnalyticsRevenue['by_plan'] }) {
  if (rows.length === 0) return <div className="text-center py-8 text-sm text-text-muted">No revenue yet</div>
  const max = Math.max(...rows.map((r) => toNum(r.revenue))) || 1
  return (
    <div className="space-y-2">
      {rows.map((r, i) => {
        const pct = (toNum(r.revenue) / max) * 100
        return (
          <motion.div
            key={r.plan_name}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.2) }}
          >
            <div className="flex items-center justify-between mb-1 text-2xs">
              <span className="text-text">{r.plan_name}</span>
              <span className="text-text-muted tabular">{r.sales} sales · {fmtUSD(r.revenue)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden">
              <div className="h-full bg-accent transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

function StatusBreakdown({ rows }: { rows: AnalyticsChallenges['status_counts'] }) {
  if (rows.length === 0) return <div className="text-center py-8 text-sm text-text-muted">No challenges yet</div>
  const total = rows.reduce((s, r) => s + r.count, 0)
  return (
    <div className="space-y-2">
      {rows.map((r, i) => {
        const pct = total > 0 ? (r.count / total) * 100 : 0
        const stat = r.status.toLowerCase()
        const tone =
          stat === 'funded' || stat === 'passed' ? 'bg-success' :
          stat === 'failed' || stat === 'breached' ? 'bg-danger' :
          stat === 'active' ? 'bg-info' : 'bg-text-muted'
        return (
          <motion.div key={r.status} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.22, delay: Math.min(i * 0.04, 0.2) }}>
            <div className="flex items-center justify-between mb-1 text-2xs">
              <span className="capitalize">{r.status}</span>
              <span className="text-text-muted tabular">{r.count} ({fmtPct(pct, 1)})</span>
            </div>
            <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden">
              <div className={`h-full ${tone} transition-all duration-500 shadow-glow`} style={{ width: `${pct}%` }} />
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

function PassRatesList({ rows }: { rows: AnalyticsChallenges['pass_rates'] }) {
  if (rows.length === 0) return <div className="text-center py-8 text-sm text-text-muted">Not enough data yet</div>
  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const total = toNum(r.total), passed = toNum(r.passed), failed = toNum(r.failed)
        const passRate = total > 0 ? (passed / total) * 100 : 0
        return (
          <div key={r.plan_name} className="rounded-md bg-bg-subtle/60 border border-border-subtle p-3 text-2xs">
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="font-medium">{r.plan_name}</span>
              <Badge tone={passRate >= 50 ? 'success' : passRate >= 25 ? 'warn' : 'danger'}>
                {fmtPct(passRate, 1)} pass
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-text-muted">
              <div><div className="text-text-faint">Total</div><div className="text-text tabular">{total}</div></div>
              <div><div className="text-text-faint">Passed</div><div className="text-success tabular">{passed}</div></div>
              <div><div className="text-text-faint">Failed</div><div className="text-danger tabular">{failed}</div></div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
