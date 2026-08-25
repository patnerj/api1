'use client'

import * as React from 'react'
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  BarChart3, DollarSign, Users as UsersIcon, Trophy, TrendingUp, 
  Loader2, ArrowUpRight, CheckCircle2, XCircle, AlertCircle,
  Calendar, ShieldCheck, Activity, PieChart, Sparkles, RefreshCw,
  Layers, Target
} from 'lucide-react'
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from 'recharts'
import { api } from '@/lib/api'
import { cn } from '@/lib/cn'
import { toast } from 'sonner'

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly')

  const { data: revenue, isPending: isRevPending, refetch: refetchRevenue } = useQuery({
    queryKey: ['admin-analytics-revenue', period],
    queryFn: async () => {
      const res = await api.admin.analyticsRevenue(period)
      if (!res.ok) throw new Error(res.error || 'Failed to load revenue analytics')
      return res.data
    },
    staleTime: 15000,
  })

  const { data: growth, isPending: isGrowthPending, refetch: refetchGrowth } = useQuery({
    queryKey: ['admin-analytics-growth', period],
    queryFn: async () => {
      const res = await api.admin.analyticsGrowth(period)
      if (!res.ok) throw new Error(res.error || 'Failed to load growth analytics')
      return res.data
    },
    staleTime: 15000,
  })

  const { data: challenges, isPending: isChallengesPending, refetch: refetchChallenges } = useQuery({
    queryKey: ['admin-analytics-challenges'],
    queryFn: async () => {
      const res = await api.admin.analyticsChallenges()
      if (!res.ok) throw new Error(res.error || 'Failed to load challenge analytics')
      return res.data
    },
    staleTime: 15000,
  })

  const isPending = isRevPending || isGrowthPending || isChallengesPending

  const handleRefreshAll = async () => {
    try {
      const [rRev, rGrowth, rChal] = await Promise.all([
        refetchRevenue(),
        refetchGrowth(),
        refetchChallenges()
      ])
      if (rRev.isError || rGrowth.isError || rChal.isError || !rRev.data || !rGrowth.data || !rChal.data) {
        const errMsg = rRev.error?.message || rGrowth.error?.message || rChal.error?.message || 'One or more analytics queries failed to refresh.'
        toast.error(errMsg)
        return
      }
      toast.success('Analytics intelligence metrics refreshed')
    } catch (err: any) {
      toast.error(err?.message || 'Failed to refresh analytics data')
    }
  }

  // Format currency helpers
  const formatMoney = (val: number | string | undefined | null) => {
    const num = typeof val === 'string' ? parseFloat(val) : (val || 0)
    if (isNaN(num)) return '$0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num)
  }

  const formatShortMoney = (val: number | string | undefined | null) => {
    const num = typeof val === 'string' ? parseFloat(val) : (val || 0)
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}k`
    return `$${num.toLocaleString()}`
  }

  const periodLabel = period === 'daily' ? 'last 7 days' : period === 'weekly' ? 'last 6 weeks' : 'last 7 months'

  // Dynamic Revenue Series
  const revenueChartData = useMemo(() => {
    if (revenue?.monthly && Array.isArray(revenue.monthly) && revenue.monthly.length > 0) {
      return revenue.monthly.map((r: any) => ({
        label: r.month || r.period || r.date || 'Period',
        revenue: Number(r.total ?? r.revenue ?? 0),
        count: Number(r.count ?? 0),
      }))
    }
    if (period === 'daily') {
      return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(label => ({ label, revenue: 0, count: 0 }))
    }
    if (period === 'weekly') {
      return ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'].map(label => ({ label, revenue: 0, count: 0 }))
    }
    return ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'].map(label => ({ label, revenue: 0, count: 0 }))
  }, [revenue, period])

  const hasRevenueData = useMemo(() => {
    return revenueChartData.some(d => d.revenue > 0)
  }, [revenueChartData])

  // Dynamic Growth Series — pair by date/month key rather than array index
  const growthChartData = useMemo(() => {
    const userList = Array.isArray(growth?.new_users) ? growth.new_users : []
    const challengeList = Array.isArray(growth?.new_challenges) ? growth.new_challenges : []

    if (userList.length > 0 || challengeList.length > 0) {
      const dateMap = new Map<string, { label: string; users: number; challenges: number }>()

      for (const u of userList) {
        const key = String(u.month || (u as any).period || (u as any).date || '')
        if (!key) continue
        if (!dateMap.has(key)) dateMap.set(key, { label: key, users: 0, challenges: 0 })
        dateMap.get(key)!.users = Number(u.count ?? 0)
      }

      for (const c of challengeList) {
        const key = String(c.month || (c as any).period || (c as any).date || '')
        if (!key) continue
        if (!dateMap.has(key)) dateMap.set(key, { label: key, users: 0, challenges: 0 })
        dateMap.get(key)!.challenges = Number(c.count ?? 0)
      }

      return Array.from(dateMap.values())
    }
    return ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'].map(label => ({ label, users: 0, challenges: 0 }))
  }, [growth])

  const hasGrowthData = useMemo(() => {
    return growthChartData.some(d => d.users > 0 || d.challenges > 0)
  }, [growthChartData])

  // Dynamic Plan Breakdown
  const planSalesData = useMemo(() => {
    if (revenue?.by_plan && Array.isArray(revenue.by_plan) && revenue.by_plan.length > 0) {
      const totalRevAll = revenue.by_plan.reduce((acc, p: any) => acc + Number(p.revenue || p.total || 0), 0) || 1
      return revenue.by_plan.map((p: any) => {
        const rev = Number(p.revenue || p.total || 0)
        return {
          name: p.plan_name || p.name || 'Custom Challenge Plan',
          purchases: Number(p.sales || p.count || 0),
          total: rev,
          sharePct: Math.round((rev / totalRevAll) * 100),
        }
      })
    }
    return []
  }, [revenue])

  // Headline KPI calculations
  const totalRevenueVal = Number(revenue?.total ?? 0)
  const totalUsersVal = Number(growth?.total_users ?? 0)
  const totalChallengesVal = Number(growth?.total_challenges ?? 0)
  const totalFundedVal = Number(growth?.total_funded ?? 0)

  // Dynamic MoM Revenue Growth
  const revenueTrend = useMemo(() => {
    const monthly = Array.isArray(revenue?.monthly) ? revenue.monthly : []
    if (monthly.length >= 2) {
      const cur = Number(monthly[monthly.length - 1]?.total || (monthly[monthly.length - 1] as any)?.amount || 0)
      const prev = Number(monthly[monthly.length - 2]?.total || (monthly[monthly.length - 2] as any)?.amount || 0)
      if (prev > 0) {
        const pct = ((cur - prev) / prev) * 100
        return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% MoM`
      } else if (cur > 0) {
        return '+100% MoM'
      }
    }
    return totalRevenueVal > 0 ? 'Live' : '0.0%'
  }, [revenue, totalRevenueVal])

  // Challenge Lifecycle status counts
  const activeCount = Number(challenges?.status_counts?.find?.((s: any) => s.status === 'active')?.count ?? 0)
  const fundedCount = Number(challenges?.status_counts?.find?.((s: any) => s.status === 'funded')?.count ?? 0)
  const passedCount = Number(challenges?.status_counts?.find?.((s: any) => s.status === 'passed')?.count ?? 0)
  const failedCount = Number(challenges?.status_counts?.find?.((s: any) => s.status === 'failed')?.count ?? 0)

  return (
    <div className="space-y-8 w-full pb-16">
      
      {/* ── Header & Timeframe Filter ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#1F2937]/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
              Platform Analytics
            </h1>
            <Badge tone="accent" size="sm" className="font-mono">
              Live Feed
            </Badge>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Real-time financial performance, challenge pass/fail ratios, and trader growth metrics — {periodLabel}.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-center">
          
          {/* Period Selector Tabs */}
          <div className="flex items-center gap-1 bg-[#111827] border border-[#1F2937] p-1 rounded-xl">
            {(['daily', 'weekly', 'monthly'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer",
                  period === p 
                    ? "bg-accent text-slate-950 shadow-sm font-bold" 
                    : "text-gray-400 hover:text-white hover:bg-gray-800/60"
                )}
              >
                {p}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            className="border-[#1F2937] text-gray-300 hover:text-white hover:bg-slate-800/80 gap-1.5 h-9"
          >
            <RefreshCw className="h-3.5 w-3.5 text-accent" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {isPending ? (
        <div className="flex h-96 items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto" />
            <p className="text-xs text-gray-400 font-mono">Aggregating real-time financial telemetry...</p>
          </div>
        </div>
      ) : (
        <>
          {/* ── 1. Top 4 Clean Unified KPI Cards ──────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Total Revenue */}
            <Card className="bg-[#111827] border-[#1F2937] hover:border-accent/40 hover:shadow-[0_0_15px_var(--accent-glow)] transition-all duration-200 group relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-accent/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400 group-hover:text-gray-200 transition-colors">
                    Total Revenue
                  </span>
                  <div className="h-8 w-8 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-gray-400 group-hover:text-accent group-hover:border-accent/40 transition-colors">
                    <DollarSign className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-3 flex items-baseline justify-between">
                  <h3 className="text-2xl font-bold font-mono text-white tracking-tight">
                    {formatShortMoney(totalRevenueVal)}
                  </h3>
                </div>

                <div className="mt-2.5 flex items-center justify-between gap-2 text-xs">
                  <span className="text-[11px] text-gray-400 leading-tight block flex-1">
                    Gross challenge fees & add-ons
                  </span>
                  <Badge tone="accent" size="sm" className="shrink-0 font-mono text-[10px] px-2 py-0.5">
                    {revenueTrend}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Total Registered Traders */}
            <Card className="bg-[#111827] border-[#1F2937] hover:border-accent/40 hover:shadow-[0_0_15px_var(--accent-glow)] transition-all duration-200 group relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400 group-hover:text-gray-200 transition-colors">
                    Total Traders
                  </span>
                  <div className="h-8 w-8 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-gray-400 group-hover:text-blue-400 group-hover:border-blue-500/40 transition-colors">
                    <UsersIcon className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-3 flex items-baseline justify-between">
                  <h3 className="text-2xl font-bold font-mono text-white tracking-tight">
                    {totalUsersVal.toLocaleString()}
                  </h3>
                </div>

                <div className="mt-2.5 flex items-center justify-between gap-2 text-xs">
                  <span className="text-[11px] text-gray-400 leading-tight block flex-1">
                    Active KYC & verified profiles
                  </span>
                  <Badge tone="info" size="sm" className="shrink-0 font-mono text-[10px] px-2 py-0.5">
                    {totalUsersVal > 0 ? `${totalUsersVal} Active` : '0 Active'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Challenges Sold */}
            <Card className="bg-[#111827] border-[#1F2937] hover:border-accent/40 hover:shadow-[0_0_15px_var(--accent-glow)] transition-all duration-200 group relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400 group-hover:text-gray-200 transition-colors">
                    Challenges Sold
                  </span>
                  <div className="h-8 w-8 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-gray-400 group-hover:text-purple-400 group-hover:border-purple-500/40 transition-colors">
                    <Trophy className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-3 flex items-baseline justify-between">
                  <h3 className="text-2xl font-bold font-mono text-white tracking-tight">
                    {totalChallengesVal.toLocaleString()}
                  </h3>
                </div>

                <div className="mt-2.5 flex items-center justify-between gap-2 text-xs">
                  <span className="text-[11px] text-gray-400 leading-tight block flex-1">
                    Total evaluation orders fulfilled
                  </span>
                  <Badge tone="accent" size="sm" className="shrink-0 font-mono text-[10px] px-2 py-0.5">
                    {totalChallengesVal > 0 ? `${totalChallengesVal} Fulfilled` : '0 Sold'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Card 4: Funded Accounts */}
            <Card className="bg-[#111827] border-[#1F2937] hover:border-accent/40 hover:shadow-[0_0_15px_var(--accent-glow)] transition-all duration-200 group relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-accent/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400 group-hover:text-gray-200 transition-colors">
                    Funded Accounts
                  </span>
                  <div className="h-8 w-8 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-gray-400 group-hover:text-accent group-hover:border-accent/40 transition-colors">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-3 flex items-baseline justify-between">
                  <h3 className="text-2xl font-bold font-mono text-accent tracking-tight">
                    {totalFundedVal.toLocaleString()}
                  </h3>
                </div>

                <div className="mt-2.5 flex items-center justify-between gap-2 text-xs">
                  <span className="text-[11px] text-gray-400 leading-tight block flex-1">
                    Active live capital accounts
                  </span>
                  <Badge tone="accent" size="sm" className="shrink-0 font-mono text-[10px] px-2 py-0.5">
                    {totalChallengesVal > 0 ? `${((totalFundedVal / totalChallengesVal) * 100).toFixed(1)}% Pass` : '0.0% Pass'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* ── 2. Glowing "Revenue Over Time" Area Chart ──────────────────────── */}
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-4 relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1F2937]/70 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-accent" />
                  Revenue Over Time
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Gross challenge purchases, resets, and add-on sales ({periodLabel})
                </p>
              </div>
              <Badge tone="accent" size="sm" className="font-mono text-xs self-start sm:self-center">
                Net Trajectory
              </Badge>
            </div>

            <div className="h-[320px] w-full pt-2 relative">
              {!hasRevenueData && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111827]/80 backdrop-blur-[2px] rounded-xl z-10 space-y-2.5 pointer-events-none">
                  <div className="p-3 rounded-2xl bg-accent/10 border border-accent/20 text-accent shadow-lg shadow-accent/10">
                    <TrendingUp className="h-6 w-6 animate-pulse" />
                  </div>
                  <div className="text-center space-y-1">
                    <span className="text-sm font-bold text-gray-200 block">Awaiting Billing Cycle Activity</span>
                    <span className="text-xs text-gray-400 font-mono block max-w-xs">Live chart telemetry will populate dynamically upon incoming checkout transactions</span>
                  </div>
                </div>
              )}

              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGradMidnight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-hex, #10B981)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--accent-hex, #10B981)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                  <XAxis 
                    dataKey="label" 
                    stroke="#6B7280" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#6B7280" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(v) => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#111827', 
                      borderColor: '#374151', 
                      borderRadius: '12px',
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
                      padding: '12px'
                    }}
                    labelStyle={{ color: '#F3F4F6', fontWeight: 600, marginBottom: '4px' }}
                    formatter={(v: any) => [`$${Number(v).toLocaleString()}`, 'Gross Inflow']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="var(--accent-hex, #10B981)" 
                    strokeWidth={2.5} 
                    fill="url(#revGradMidnight)" 
                    dot={{ fill: 'var(--accent-hex, #10B981)', r: 4, strokeWidth: 2, stroke: '#0B0F19' }}
                    activeDot={{ r: 6, fill: 'var(--accent-hex, #10B981)', stroke: '#FFFFFF', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── 3. Growth Comparison & Plan Sales Breakdown ────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Chart: Platform Growth */}
            <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-4 flex flex-col justify-between relative">
              <div>
                <div className="flex items-center justify-between border-b border-[#1F2937]/70 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-blue-400" />
                      Platform Trader & Challenge Growth
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      New user signups vs new challenge evaluations ({periodLabel})
                    </p>
                  </div>
                </div>

                <div className="h-[280px] w-full pt-4 relative">
                  {!hasGrowthData && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111827]/80 backdrop-blur-[2px] rounded-xl z-10 space-y-2.5 pointer-events-none">
                      <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shadow-lg shadow-blue-500/10">
                        <UsersIcon className="h-6 w-6 animate-pulse" />
                      </div>
                      <div className="text-center space-y-1">
                        <span className="text-sm font-bold text-gray-200 block">Awaiting Platform Growth Data</span>
                        <span className="text-xs text-gray-400 font-mono block max-w-xs">New user registration and challenge pass metrics will render here</span>
                      </div>
                    </div>
                  )}

                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={growthChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                      <XAxis dataKey="label" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#111827', 
                          borderColor: '#374151', 
                          borderRadius: '12px',
                          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                          padding: '12px'
                        }}
                        labelStyle={{ color: '#FFFFFF', fontWeight: 600 }}
                      />
                      <Legend 
                        verticalAlign="top" 
                        align="right" 
                        iconType="circle"
                        wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
                      />
                      <Bar dataKey="users" name="New Traders" fill="#3B82F6" radius={[6, 6, 0, 0]} maxBarSize={32} />
                      <Bar dataKey="challenges" name="New Challenges" fill="var(--accent-hex, #10B981)" radius={[6, 6, 0, 0]} maxBarSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* List: Revenue by Challenge Plan */}
            <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#1F2937]/70 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <PieChart className="h-4 w-4 text-accent" />
                    Revenue by Challenge Plan
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Sales distribution across active tier sizes
                  </p>
                </div>
                <Badge tone="accent" size="sm" className="font-mono">
                  {planSalesData.length} Tiers
                </Badge>
              </div>

              <div className="space-y-4 pt-1">
                {planSalesData.length > 0 ? (
                  planSalesData.map((plan, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-white block">{plan.name}</span>
                          <span className="text-gray-400 font-mono text-[11px]">
                            {plan.purchases} sales • {plan.sharePct}% total revenue
                          </span>
                        </div>
                        <span className="font-bold text-accent font-mono text-sm">
                          {formatMoney(plan.total)}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-accent rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, Math.max(5, plan.sharePct))}%` }} 
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center space-y-3">
                    <div className="h-10 w-10 rounded-xl bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mx-auto shadow-md shadow-accent/10">
                      <PieChart className="h-5 w-5" />
                    </div>
                    <p className="text-xs text-gray-400 font-mono">No challenge sales recorded for this timeframe</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* ── 4. Pass Rates & Challenge Lifecycle Overview ───────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Pass Rates by Plan */}
            <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#1F2937]/70 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-accent" />
                  Pass Rates & Milestone Performance
                </h3>
                <span className="text-xs text-gray-500 font-mono">Phase 1 & 2 Success</span>
              </div>

              <div className="space-y-3.5 pt-1">
                {challenges?.pass_rates && challenges.pass_rates.length > 0 ? (
                  challenges.pass_rates.map((pr: any, i: number) => {
                    const passRate = pr.total > 0 ? Math.round(((pr.passed || 0) / pr.total) * 100) : 0
                    return (
                      <div key={i} className="p-3 bg-[#0B0F19] rounded-xl border border-[#1F2937] flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-white block">{pr.plan_name || pr.name}</span>
                          <span className="text-[11px] text-gray-400 font-mono">
                            {pr.passed || 0} passed / {pr.total || 0} evaluations
                          </span>
                        </div>
                        <Badge tone="accent" size="sm" className="font-mono font-bold">
                          {passRate}% Pass Rate
                        </Badge>
                      </div>
                    )
                  })
                ) : (
                  <div className="py-10 text-center space-y-2">
                    <div className="h-9 w-9 rounded-xl bg-accent/10 border border-accent/20 text-accent flex items-center justify-center mx-auto shadow-md shadow-accent/10">
                      <Target className="h-4 w-4" />
                    </div>
                    <p className="text-xs text-gray-400 font-mono">Awaiting completed challenge evaluations to calculate pass conversion</p>
                  </div>
                )}
              </div>
            </div>

            {/* Challenge Lifecycle Overview */}
            <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#1F2937]/70 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity className="h-4 w-4 text-accent" />
                  Challenge Lifecycle Status
                </h3>
                <span className="text-xs text-gray-500 font-mono">Active Breakdown</span>
              </div>

              <div className="grid grid-cols-2 gap-3.5 pt-1">
                <div className="p-4 bg-[#0B0F19] rounded-xl border border-[#1F2937] text-left space-y-1">
                  <span className="text-[11px] font-semibold text-gray-400 block uppercase tracking-wider">Active Evaluations</span>
                  <span className="text-2xl font-extrabold text-blue-400 font-mono block">
                    {activeCount}
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">Phase 1 & Phase 2</span>
                </div>

                <div className="p-4 bg-[#0B0F19] rounded-xl border border-[#1F2937] text-left space-y-1">
                  <span className="text-[11px] font-semibold text-gray-400 block uppercase tracking-wider">Funded Live Pro</span>
                  <span className="text-2xl font-extrabold text-accent font-mono block">
                    {fundedCount}
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">Generating PnL</span>
                </div>

                <div className="p-4 bg-[#0B0F19] rounded-xl border border-[#1F2937] text-left space-y-1">
                  <span className="text-[11px] font-semibold text-gray-400 block uppercase tracking-wider">Completed / Passed</span>
                  <span className="text-2xl font-extrabold text-purple-400 font-mono block">
                    {passedCount}
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">Ready for KYC/Funded</span>
                </div>

                <div className="p-4 bg-[#0B0F19] rounded-xl border border-[#1F2937] text-left space-y-1">
                  <span className="text-[11px] font-semibold text-gray-400 block uppercase tracking-wider">Breached / Reset</span>
                  <span className="text-2xl font-extrabold text-red-400 font-mono block">
                    {failedCount}
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">Drawdown Exceeded</span>
                </div>
              </div>
            </div>

          </div>
        </>
      )}

    </div>
  )
}
