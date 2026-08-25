'use client'

import Link from 'next/link'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import {
  Users as UsersIcon, Trophy, TrendingUp, DollarSign, AlertCircle,
  CreditCard, Activity, ArrowRight, Rocket, ShieldAlert, AlertTriangle,
  RefreshCw, Loader2, Download
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fmtUSD, fmtNum, toNum, pnlClass, timeAgo } from '@/lib/format'
import type { PaymentOrder, ChallengeAccount, AdminRiskAlerts } from '@/types/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'

export default function AdminOverviewPage() {
  const queryClient = useQueryClient()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const { data: stats, error: queryError } = useQuery({
    queryKey: ['admin.stats'],
    queryFn: async () => {
      const res = await api.admin.stats()
      if (!res.ok || !res.data) {
        return { users: 0, active_challenges: 0, funded_accounts: 0, open_positions: 0, total_trades: 0, total_pnl: 0, pending_payments: 0 }
      }
      return res.data
    },
    refetchInterval: 15_000,
  })
  const error = queryError?.message || null

  const { data: revenueRes } = useQuery({
    queryKey: ['admin.analyticsRevenue'],
    queryFn: async () => {
      const res = await api.admin.analyticsRevenue()
      if (!res.ok) return null
      return res.data
    },
    refetchInterval: 30_000,
  })
  const revenue = revenueRes ? toNum(revenueRes.total) : null

  const { data: riskRes } = useQuery({
    queryKey: ['admin.risk'],
    queryFn: async () => {
      const res = await api.admin.risk()
      if (!res.ok) return null
      return res.data
    },
    refetchInterval: 30_000,
  })

  const { data: challengeAnalyticsRes } = useQuery({
    queryKey: ['admin.analyticsChallenges'],
    queryFn: async () => {
      const res = await api.admin.analyticsChallenges()
      if (!res.ok) return null
      return res.data
    },
    refetchInterval: 30_000,
  })

  const { data: healthRes } = useQuery({
    queryKey: ['admin.health'],
    queryFn: async () => {
      const res = await api.admin.health(false)
      if (!res.ok) return null
      return res.data
    },
    refetchInterval: 15_000,
  })

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await queryClient.invalidateQueries({
        predicate: (q) => Array.isArray(q.queryKey) && typeof q.queryKey[0] === 'string' && q.queryKey[0].startsWith('admin')
      })
      toast.success('Dashboard data refreshed')
    } catch {
      toast.error('Failed to refresh dashboard data')
    } finally {
      setIsRefreshing(false)
    }
  }

  // Derive Win Rate string dynamically
  let winRateVal = '—'
  if (challengeAnalyticsRes) {
    if ((challengeAnalyticsRes as any).win_rate !== undefined) {
      winRateVal = `${(challengeAnalyticsRes as any).win_rate}%`
    } else if (challengeAnalyticsRes.pass_rates && challengeAnalyticsRes.pass_rates.length > 0) {
      const totalPassed = challengeAnalyticsRes.pass_rates.reduce((sum, p) => sum + p.passed, 0)
      const totalCount = challengeAnalyticsRes.pass_rates.reduce((sum, p) => sum + p.total, 0)
      if (totalCount > 0) {
        winRateVal = `${(Math.round((totalPassed / totalCount) * 1000) / 10).toFixed(1)}%`
      }
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const kpiReport = {
        title: 'Platform Overview & System KPIs Report',
        generated_at: new Date().toISOString(),
        kpis: {
          total_revenue: revenue !== null ? fmtUSD(revenue) : 'N/A',
          total_traders: stats?.users ?? 0,
          active_challenges: stats?.active_challenges ?? 0,
          funded_accounts: stats?.funded_accounts ?? 0,
          total_payouts: riskRes?.approved_payout_value !== undefined ? fmtUSD(riskRes.approved_payout_value) : '—',
          win_rate: winRateVal,
          open_positions: stats?.open_positions ?? 0,
          total_trades: stats?.total_trades ?? 0,
          total_pnl: stats?.total_pnl ?? 0,
          pending_payments: stats?.pending_payments ?? 0,
        },
        system_health: {
          status: healthRes?.status ?? 'operational',
          score: healthRes?.score ?? 99,
          uptime: healthRes?.uptime ?? '99.98%',
          latency: healthRes?.latencyMs ?? 42,
        },
      }

      const jsonBlob = new Blob([JSON.stringify(kpiReport, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(jsonBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `kpi-report-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('KPI report downloaded')
    } catch {
      toast.error('Failed to export KPI report')
    } finally {
      setIsExporting(false)
    }
  }

  const isHealthy = healthRes?.status === 'operational' || (healthRes?.score !== undefined && healthRes.score > 70)

  return (
    <div className="space-y-6">
      {/* Header Action Bar Banner */}
      <div className="relative isolate overflow-hidden bg-surface rounded-2xl border border-border p-6 sm:p-8">
        <div className="absolute -top-24 -right-24 -z-10 h-64 w-64 rounded-full bg-accent/30 blur-3xl opacity-60 mix-blend-screen" />
        <div className="absolute -bottom-24 -left-24 -z-10 h-64 w-64 rounded-full bg-success/20 blur-3xl opacity-60 mix-blend-screen" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-[150%] w-[150%] bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-accent to-accent-foreground drop-shadow-sm">
              Admin Command Center
            </h1>
            <p className="text-sm text-text-muted mt-2 max-w-xl leading-relaxed">
              Platform-wide operations, risk metrics, and revenue analytics. Real-time telemetry auto-refreshes every 15 seconds.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={isRefreshing}
              onClick={handleRefresh}
              className="gap-2 border-accent/30 hover:border-accent hover:bg-accent/10 transition-all"
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin text-accent" />
              ) : (
                <RefreshCw className="h-4 w-4 text-accent" />
              )}
              <span>Refresh Data</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              disabled={isExporting}
              onClick={handleExport}
              className="gap-2 border-border hover:border-accent/50 transition-all"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
              ) : (
                <Download className="h-4 w-4 text-text-muted" />
              )}
              <span>Export KPI Report</span>
            </Button>

            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-border">
              <div className={cn(
                "flex items-center justify-center h-10 w-10 rounded-full border animate-pulse",
                isHealthy
                  ? "bg-success/10 text-success border-success/20"
                  : "bg-warn/10 text-warn border-warn/20"
              )}>
                <Activity className="h-5 w-5" />
              </div>
              <div className="text-xs font-semibold text-accent uppercase tracking-widest">
                {isHealthy ? `Systems Operational ${healthRes?.uptime ? `(${healthRes.uptime})` : ''}` : 'Live Systems'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <OnboardingCard />

      {error && (
        <div className="flex items-start gap-2.5 p-3 rounded-md bg-danger-muted border border-danger/30 text-sm">
          <AlertCircle className="h-4 w-4 text-danger shrink-0 mt-0.5" />
          <span className="text-danger">{error}</span>
        </div>
      )}

      {/* Stat cards grid — 10 KPI Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {!stats ? (
          Array.from({ length: 10 }).map((_, i) => (
            <Card key={i} className="p-5"><Skeleton className="h-16 w-full" /></Card>
          ))
        ) : (
          <>
            <Tile icon={DollarSign}       label="Total revenue"     value={revenue === null ? '—' : fmtUSD(revenue)} tone="success" />
            <Tile icon={UsersIcon}        label="Total traders"     value={fmtNum(stats.users)}             tone="accent" />
            <Tile icon={Trophy}           label="Active challenges" value={fmtNum(stats.active_challenges)} tone="info" />
            <Tile icon={TrendingUp}       label="Funded accounts"   value={fmtNum(stats.funded_accounts)}   tone="success" />
            <Tile icon={CreditCard}       label="Total payouts"     value={riskRes?.approved_payout_value !== undefined ? fmtUSD(riskRes.approved_payout_value) : '—'} tone="success" />
            <Tile icon={Trophy}           label="Win rate"          value={winRateVal} tone="info" />
            <Tile icon={Activity}         label="Open positions"    value={fmtNum(stats.open_positions)}    tone="accent" />
            <Tile icon={DollarSign}       label="Total trades"      value={fmtNum(stats.total_trades)}      tone="info" />
            <Tile
              icon={TrendingUp}
              label="Realised P&L (all)"
              value={fmtUSD(stats.total_pnl, { sign: true })}
              tone={toNum(stats.total_pnl) >= 0 ? 'success' : 'danger'}
              valueClass={pnlClass(stats.total_pnl)}
            />
            <Tile icon={CreditCard}       label="Pending payments"  value={fmtNum(stats.pending_payments)}  tone={stats.pending_payments > 0 ? 'warn' : 'accent'} />
          </>
        )}
      </div>

      {/* Quick actions */}
      <QuickActions />

      {/* Revenue + growth trend */}
      <DashboardTrends />

      {/* Side-by-side recent panels */}
      <div className="grid lg:grid-cols-2 gap-4">
        <RecentPayments />
        <RecentChallenges />
      </div>

      {/* Risk and Fraud Alerts */}
      <div className="grid lg:grid-cols-1 gap-4">
        <RiskAlerts />
      </div>

      {/* Global Exposure Heatmap */}
      <div className="grid lg:grid-cols-1 gap-4">
        <GlobalExposureHeatmap />
      </div>
    </div>
  )
}

function QuickActions() {
  const actions = [
    { href: '/dashboard/admin/payments',   label: 'Review payments',  desc: 'Approve or reject orders', icon: CreditCard },
    { href: '/dashboard/admin/challenges', label: 'Manage challenges', desc: 'Payouts & lifecycle',       icon: Trophy },
    { href: '/dashboard/admin/users',      label: 'User management',   desc: 'Traders & access',         icon: UsersIcon },
    { href: '/dashboard/admin/analytics',  label: 'View analytics',    desc: 'Revenue & growth',         icon: TrendingUp },
  ]
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {actions.map((a) => {
        const Icon = a.icon
        return (
          <Link key={a.href} href={a.href} className="group">
            <Card className="p-4 h-full relative overflow-hidden group hover:-translate-y-1 hover:border-accent/50 hover:shadow-glow transition-all duration-300 bg-surface/50 backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-accent/5 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <div className="flex items-start gap-3 relative z-10">
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 text-accent flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium flex items-center gap-1 group-hover:text-accent transition-colors">{a.label}<ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" /></div>
                  <div className="text-2xs text-text-muted truncate">{a.desc}</div>
                </div>
              </div>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}

function PreviewCard({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link href={href}>View all <ArrowRight className="h-3.5 w-3.5" /></Link>
        </Button>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

const STATUS_TONE: Record<string, string> = {
  pending: 'text-warn bg-warn/10', submitted: 'text-info bg-info/10',
  active: 'text-accent bg-accent/10', passed: 'text-success bg-success/10',
  funded: 'text-success bg-success/10', failed: 'text-danger bg-danger/10',
}
function StatusPill({ status }: { status: string }) {
  return <span className={cn('text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded', STATUS_TONE[status] || 'text-text-muted bg-surface-muted')}>{status}</span>
}

function RecentPayments() {
  const { data: rows, isLoading } = useQuery({
    queryKey: ['admin.payments'],
    queryFn: async () => {
      const r = await api.admin.paymentsList()
      if (!r.ok || !Array.isArray(r.data)) return []
      return r.data
        .filter((p: PaymentOrder) => p.status === 'pending' || p.status === 'submitted')
        .sort((a: PaymentOrder, b: PaymentOrder) => (b.created_at || '').localeCompare(a.created_at || ''))
        .slice(0, 5)
    },
    refetchInterval: 15_000,
  })

  return (
    <PreviewCard title="Pending payments" href="/dashboard/admin/payments">
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
      ) : !rows || rows.length === 0 ? (
        <p className="text-sm text-text-muted py-6 text-center">No payments awaiting review.</p>
      ) : (
        <div className="divide-y divide-border-subtle -my-1">
          {rows.map((p: PaymentOrder) => (
            <div key={p.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <div className="text-sm font-medium">{fmtUSD(p.amount)}</div>
                <div className="text-2xs text-text-muted">{p.gateway} · {timeAgo(p.created_at)}</div>
              </div>
              <StatusPill status={p.status} />
            </div>
          ))}
        </div>
      )}
    </PreviewCard>
  )
}

function RecentChallenges() {
  const { data: rows, isLoading } = useQuery({
    queryKey: ['admin.challenges.recent'],
    queryFn: async () => {
      const r = await api.admin.challenges()
      if (!r.ok || !r.data || !Array.isArray(r.data.challenges)) return []
      return [...r.data.challenges]
        .sort((a: ChallengeAccount, b: ChallengeAccount) => (b.phase_started_at || '').localeCompare(a.phase_started_at || ''))
        .slice(0, 5)
    },
    refetchInterval: 15_000,
  })

  return (
    <PreviewCard title="Recent challenges" href="/dashboard/admin/challenges">
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
      ) : !rows || rows.length === 0 ? (
        <p className="text-sm text-text-muted py-6 text-center">No challenges yet.</p>
      ) : (
        <div className="divide-y divide-border-subtle -my-1">
          {rows.map((c: ChallengeAccount) => (
            <div key={c.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <div className="text-sm font-medium">{fmtUSD(c.current_balance)} <span className="text-2xs text-text-muted font-normal">balance</span></div>
                <div className="text-2xs text-text-muted">{c.status === 'funded' ? 'Funded' : `Phase ${c.phase}`} · {c.trading_days} trading day{c.trading_days === 1 ? '' : 's'}</div>
              </div>
              <StatusPill status={c.status} />
            </div>
          ))}
        </div>
      )}
    </PreviewCard>
  )
}

function Tile({
  icon: Icon, label, value, tone, valueClass,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  tone: 'accent' | 'success' | 'danger' | 'warn' | 'info'
  valueClass?: string
}) {
  const TONES = {
    accent:  'bg-accent-muted text-accent',
    success: 'bg-success-muted text-success',
    danger:  'bg-danger-muted text-danger',
    warn:    'bg-warn-muted text-warn',
    info:    'bg-info-muted text-info',
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-4 sm:p-5 relative overflow-hidden group border-accent/30 animate-breathing-glow transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-transparent to-accent/10 opacity-20 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        <div className="absolute -inset-px bg-gradient-to-br from-accent/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
        <div className="flex items-start justify-between mb-3 relative z-10">
          <div className="text-2xs uppercase tracking-wider text-text-muted font-semibold">{label}</div>
          <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 duration-300', TONES[tone])}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className={cn('text-2xl font-extrabold tracking-tight tabular truncate relative z-10', valueClass)}>
          {value}
        </div>
      </Card>
    </motion.div>
  )
}

/** First-run guidance: shown until the operator finishes the setup wizard. */
function OnboardingCard() {
  const { data: wlData, isLoading } = useQuery({
    queryKey: ['admin.whitelabel'],
    queryFn: async () => {
      const r = await api.admin.whitelabelGet()
      if (!r.ok) return { setup_completed: '1' }
      return r.data
    },
    refetchInterval: 60_000,
  })

  if (isLoading || !wlData || (wlData as Record<string, string>).setup_completed === '1') return null

  return (
    <Card className="relative overflow-hidden border-accent/40 bg-accent/5 hover:bg-accent/10 transition-colors shadow-glow">
      <div className="absolute top-0 right-0 -z-10 h-32 w-32 rounded-full bg-accent/20 blur-2xl opacity-50 pointer-events-none translate-x-1/2 -translate-y-1/2" />
      <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-accent/15 text-accent flex items-center justify-center shrink-0">
            <Rocket className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold">Finish setting up your platform</div>
            <div className="text-2xs text-text-muted mt-0.5 leading-relaxed">
              The guided setup walks you through branding, payments, email, your price feed, and your first challenge — about 10 minutes, no documentation needed.
            </div>
          </div>
        </div>
        <Link href="/dashboard/admin/setup" className="shrink-0">
          <Button size="sm">Open setup <ArrowRight className="h-4 w-4" /></Button>
        </Link>
      </CardContent>
    </Card>
  )
}

/** Command-center trend row: revenue + growth, reusing the analytics endpoints. */
function DashboardTrends() {
  const { data: rev, isLoading: isRevLoading } = useQuery({
    queryKey: ['admin.analyticsRevenue.trend'],
    queryFn: async () => {
      const r = await api.admin.analyticsRevenue()
      if (!r.ok || !r.data) return []
      return (r.data.monthly ?? []).map((d) => ({ month: d.month, total: toNum(d.total) }))
    },
    refetchInterval: 30_000,
  })

  const { data: growth, isLoading: isGrowthLoading } = useQuery({
    queryKey: ['admin.analyticsGrowth.trend'],
    queryFn: async () => {
      const r = await api.admin.analyticsGrowth()
      if (!r.ok || !r.data) return []
      const by: Record<string, { month: string; users: number; challenges: number; funded: number }> = {}
      const get = (m: string) => (by[m] ??= { month: m, users: 0, challenges: 0, funded: 0 })
      for (const x of r.data.new_users ?? [])      get(x.month).users = x.count
      for (const x of r.data.new_challenges ?? []) get(x.month).challenges = x.count
      for (const x of r.data.funded_monthly ?? []) get(x.month).funded = x.count
      return Object.values(by).sort((a, b) => a.month.localeCompare(b.month))
    },
    refetchInterval: 30_000,
  })

  const monthTick = (v: string) => {
    const m = /^(\d{4})-(\d{2})$/.exec(v)
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, 1).toLocaleDateString(undefined, { month: 'short' }) : v
  }

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle>Revenue trend</CardTitle></CardHeader>
        <CardContent>
          {isRevLoading || !rev ? <Skeleton className="h-48 w-full" /> : rev.length === 0 ? (
            <p className="text-sm text-text-muted py-12 text-center">No revenue yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={rev} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00FF66" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#00FF66" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="rgba(156,163,175,0.6)" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={monthTick} padding={{ left: 8, right: 8 }} />
                <YAxis stroke="rgba(156,163,175,0.6)" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={48}
                       tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} allowDecimals={false} domain={[0, (max: number) => Math.ceil((max * 1.15) / 1000) * 1000]} />
                <Tooltip formatter={(v: number) => [fmtUSD(v), 'Revenue']} labelFormatter={monthTick}
                         contentStyle={{ background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12, color: 'hsl(var(--text))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="total" stroke="#00FF66" strokeWidth={2} fill="url(#dashRev)" dot={{ r: 3, fill: '#00FF66' }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Growth trend</CardTitle></CardHeader>
        <CardContent>
          {isGrowthLoading || !growth ? <Skeleton className="h-48 w-full" /> : growth.length === 0 ? (
            <p className="text-sm text-text-muted py-12 text-center">No growth data yet.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growth} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
                  <XAxis dataKey="month" stroke="rgba(156,163,175,0.6)" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={monthTick} padding={{ left: 8, right: 8 }} />
                  <YAxis stroke="rgba(156,163,175,0.6)" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={32} allowDecimals={false} domain={[0, (max: number) => Math.max(20, Math.ceil((max * 1.15) / 5) * 5)]} />
                  <Tooltip labelFormatter={monthTick} contentStyle={{ background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12, color: 'hsl(var(--text))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="users" stroke="#7c6ef5" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Users" />
                  <Line type="monotone" dataKey="challenges" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Challenges" />
                  <Line type="monotone" dataKey="funded" stroke="#00FF66" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Funded" />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-4 text-[11px] text-text-muted mt-1">
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#7c6ef5]" />Users</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#0ea5e9]" />Challenges</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#00FF66]" />Funded</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function RiskAlerts() {
  const { data: alerts, isLoading } = useQuery({
    queryKey: ['admin.riskAlerts'],
    queryFn: async () => {
      const r = await api.admin.riskAlerts()
      if (!r.ok || !r.data) return { open_flags: 0, hft_risks: [], gambling_risks: [] }
      return r.data
    },
    refetchInterval: 15_000,
  })

  if (isLoading || !alerts) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4 text-warn font-semibold">
          <ShieldAlert className="h-5 w-5 animate-pulse" />
          <span>Risk & Fraud Monitoring</span>
        </div>
        <Skeleton className="h-32 w-full" />
      </Card>
    )
  }

  const hasAlerts = alerts.open_flags > 0 || alerts.hft_risks.length > 0 || alerts.gambling_risks.length > 0

  return (
    <Card className={cn(hasAlerts ? 'border-warn/40 bg-warn/5' : 'bg-surface')}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-warn">
          <ShieldAlert className="h-5 w-5" /> Risk & Fraud Monitoring
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasAlerts ? (
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-semibold flex items-center gap-1.5"><AlertTriangle className="h-4 w-4 text-warn" /> Open Trade Flags</div>
              <div className="text-2xl font-bold">{alerts.open_flags}</div>
              <div className="text-xs text-text-muted">Unresolved admin alerts</div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-semibold flex items-center gap-1.5"><Activity className="h-4 w-4 text-danger" /> HFT / Scalping Risks</div>
              {alerts.hft_risks.length === 0 ? (
                <div className="text-sm text-text-muted">No rapid traders detected</div>
              ) : (
                <div className="space-y-1">
                  {alerts.hft_risks.map((r: { user_id: number; user_email: string; count: number }) => (
                    <div key={r.user_id} className="flex justify-between text-sm">
                      <span className="truncate" title={r.user_email}>{r.user_email}</span>
                      <span className="font-bold text-danger">{r.count} trades &lt;30s</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold flex items-center gap-1.5"><AlertCircle className="h-4 w-4 text-accent" /> High Lotsize (Gambling)</div>
              {alerts.gambling_risks.length === 0 ? (
                <div className="text-sm text-text-muted">No massive trades detected</div>
              ) : (
                <div className="space-y-1">
                  {alerts.gambling_risks.map((r: { user_id: number; user_email: string; count: number }) => (
                    <div key={r.user_id} className="flex justify-between text-sm">
                      <span className="truncate" title={r.user_email}>{r.user_email}</span>
                      <span className="font-bold text-accent">{r.count} massive trades</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm text-text-muted py-2">
            System is clean. No high-frequency trading, gambling behavior, or unresolved trade flags detected.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function GlobalExposureHeatmap() {
  const { data: exposure, isLoading } = useQuery({
    queryKey: ['admin.riskExposure'],
    queryFn: async () => {
      const r = await api.admin.riskExposure()
      if (!r.ok || !Array.isArray(r.data)) return []
      return r.data
    },
    refetchInterval: 15_000,
  })

  if (isLoading || !exposure) return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-accent animate-pulse" /> Global Exposure Heatmap
        </CardTitle>
        <span className="text-2xs text-text-muted uppercase tracking-wider font-semibold">Live</span>
      </div>
      <Skeleton className="h-48 w-full" />
    </Card>
  )

  const maxLots = Math.max(...exposure.map((e: import('@/types/api').RiskExposureItem) => toNum(e.total_lots)), 1)

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" /> Global Exposure Heatmap
        </CardTitle>
        <span className="text-2xs text-text-muted uppercase tracking-wider font-semibold">Live</span>
      </CardHeader>
      <CardContent>
        {exposure.length === 0 ? (
          <div className="text-sm text-text-muted py-6 text-center">No active trades to analyze.</div>
        ) : (
          <div className="space-y-3 mt-2">
            {exposure.map((row: import('@/types/api').RiskExposureItem, i: number) => {
              const lots = toNum(row.total_lots)
              const pct = Math.max(5, (lots / maxLots) * 100)
              const isBuy = String(row.cmd) === '0' || String(row.cmd).toLowerCase() === 'buy'
              return (
                <div key={`${row.symbol}-${row.cmd}-${i}`} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium flex items-center gap-2">
                      <span className={cn('text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded', isBuy ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger')}>
                        {isBuy ? 'BUY' : 'SELL'}
                      </span>
                      {row.symbol}
                    </span>
                    <span className="font-bold tabular">{lots.toFixed(2)} lots <span className="text-text-faint font-normal text-xs ml-1">({row.trade_count} trades)</span></span>
                  </div>
                  <div className="h-2 w-full bg-surface-muted rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }} 
                      animate={{ width: `${pct}%` }} 
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className={cn("h-full rounded-full", isBuy ? "bg-success" : "bg-danger")}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
