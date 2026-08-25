'use client'

import { useTheme } from 'next-themes'
import { api } from '@/lib/api'
import { fmtUSD, fmtDate } from '@/lib/format'
import { useQuery } from '@tanstack/react-query'
import type { FullStats, AdvancedStats } from '@/types/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard, StatGrid } from '@/components/ui/stat-card'
import { PageHeader } from '@/components/ui/page-header'
import { BarChart3, TrendingUp, CalendarDays, Clock, Activity, Target } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Cell, PieChart, Pie, AreaChart, Area
} from 'recharts'
import { CalendarHeatmap } from '@/components/dashboard/calendar-heatmap'

export default function AnalyticsPage() {
  const { theme } = useTheme()
  
  const { data, isPending } = useQuery({
    queryKey: ['analyticsData'],
    queryFn: async () => {
      const [fRes, aRes] = await Promise.all([
        api.statsFull(),
        api.statsAdvanced()
      ])
      
      let error = null
      let full = null
      let adv = null
      
      if (!fRes.ok || ('no_challenge' in fRes.data && fRes.data.no_challenge)) {
        error = !fRes.ok ? (fRes.error || 'Failed to load') : 'You need an active challenge to view analytics.'
      } else {
        full = fRes.data as FullStats
        if (aRes.ok && !('no_challenge' in aRes.data)) {
          adv = aRes.data as AdvancedStats
        }
      }
      return { full, adv, error }
    }
  })

  const loading = isPending && !data

  const full = data?.full ?? null
  const adv = data?.adv ?? null
  const error = data?.error ?? null

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  if (error || !full) {
    return (
      <div className="space-y-8 pb-12">
        <PageHeader
          title="Trade Analytics"
          description="Deep dive into your performance patterns and journal stats."
          variant="hero"
          badge={{ label: 'Insights', tone: 'accent' }}
          icon={Activity}
        />

        <Card>
          <CardContent className="p-10 text-center">
            <div className="inline-flex h-12 w-12 rounded-xl bg-accent/10 text-accent items-center justify-center mb-4">
              <Activity className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-text">{error || 'No active challenge'}</h2>
            <p className="text-sm text-text-muted mt-2 max-w-md mx-auto leading-relaxed">
              Check back once you have closed a few trades.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const dayData = adv?.days.map(d => ({
    name: d.name.substring(0, 3),
    winRate: d.win_rate,
    pnl: d.pnl
  })) || []

  const hourData = adv?.hours.map(h => ({
    hour: `${h.hour}:00`,
    winRate: h.win_rate,
    pnl: h.pnl
  })) || []

  const symbolData = Object.entries(full.by_symbol || {}).map(([sym, d]) => ({
    name: sym,
    trades: d.trades,
    pnl: d.pnl
  })).sort((a, b) => b.trades - a.trades).slice(0, 5)

  const drawdownData = (adv?.drawdown_curve || []).map(d => ({
    date: fmtDate(d.date),
    drawdown: d.drawdown_pct
  }))

  const rrData = (adv?.rr_list || []).map((rr, i) => ({
    trade: `T${i + 1}`,
    rr: rr
  }))

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444']
  const chartTextColor = theme === 'dark' ? '#888' : '#666'

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Trade Analytics"
        description="Deep dive into your performance patterns and journal stats."
        variant="hero"
        badge={{ label: 'Insights', tone: 'accent' }}
        icon={Activity}
      />

      <StatGrid columns={4}>
        <StatCard label="Win Rate" value={`${full.win_rate.toFixed(1)}%`} icon={Target} tone="info" />
        <StatCard label="Avg R:R" value={adv?.avg_rr ? `1:${adv.avg_rr.toFixed(2)}` : 'N/A'} icon={TrendingUp} tone="accent" />
        <StatCard label="Max Drawdown" value={`${full.max_drawdown_pct.toFixed(2)}%`} icon={Activity} tone="danger" />
        <StatCard label="Profit Factor" value={full.profit_factor.toFixed(2)} icon={BarChart3} tone={full.profit_factor >= 1 ? 'success' : 'danger'} />
        
        <StatCard label="Best Trade" value={fmtUSD(full.best_trade, { sign: true })} icon={TrendingUp} tone="success" />
        <StatCard label="Worst Trade" value={fmtUSD(full.worst_trade, { sign: true })} icon={TrendingUp} tone="danger" />
        <StatCard label="Avg Win" value={fmtUSD(full.avg_win)} tone="success" />
        <StatCard label="Avg Loss" value={fmtUSD(full.avg_loss)} tone="danger" />
      </StatGrid>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-text-muted" /> Activity Heatmap (90 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {full.trades && full.trades.length > 0 ? (
            <CalendarHeatmap trades={full.trades} />
          ) : (
            <div className="h-32 flex items-center justify-center text-text-muted">Not enough trade history</div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-text-muted" /> PnL by Day of Week
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {dayData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#333' : '#e5e5e5'} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: chartTextColor, fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: chartTextColor, fontSize: 12 }} tickFormatter={(val) => `$${val}`} />
                  <RechartsTooltip
                    cursor={{ fill: theme === 'dark' ? '#222' : '#f5f5f5' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--text))' }}
                    formatter={(val: number) => [fmtUSD(val, { sign: true }), 'Net P&L']}
                  />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                    {dayData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? 'hsl(var(--success))' : 'hsl(var(--danger))'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-text-muted">Not enough data</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-text-muted" /> Win Rate by Hour
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {hourData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hourData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#333' : '#e5e5e5'} />
                  <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: chartTextColor, fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: chartTextColor, fontSize: 12 }} tickFormatter={(val) => `${val}%`} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--text))' }}
                    formatter={(val: number) => [`${val.toFixed(1)}%`, 'Win Rate']}
                  />
                  <Line type="monotone" dataKey="winRate" stroke="hsl(var(--info))" strokeWidth={3} dot={{ r: 4, fill: 'hsl(var(--info))' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-text-muted">Not enough data</div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Top Traded Symbols</CardTitle>
          </CardHeader>
          <CardContent className="h-80 flex flex-col md:flex-row items-center">
            {symbolData.length > 0 ? (
              <>
                <div className="flex-1 h-full w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={symbolData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="trades"
                      >
                        {symbolData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--text))' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-3 w-full max-w-sm px-4">
                  {symbolData.map((sym, i) => (
                    <div key={sym.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="font-medium">{sym.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{sym.trades} trades</div>
                        <div className={`text-xs ${sym.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                          {fmtUSD(sym.pnl, { sign: true })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-text-muted">No symbol data available</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-text-muted" /> Drawdown Curve
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {drawdownData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={drawdownData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorDd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--danger))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--danger))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#333' : '#e5e5e5'} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: chartTextColor, fontSize: 12 }} dy={10} minTickGap={30} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: chartTextColor, fontSize: 12 }} tickFormatter={(val) => `${val.toFixed(1)}%`} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--text))' }}
                    formatter={(val: number) => [`${val.toFixed(2)}%`, 'Drawdown']}
                  />
                  <Area type="monotone" dataKey="drawdown" stroke="hsl(var(--danger))" fillOpacity={1} fill="url(#colorDd)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-text-muted">Not enough data</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-text-muted" /> R:R History (Last 50 Wins)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {rrData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rrData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#333' : '#e5e5e5'} />
                  <XAxis dataKey="trade" axisLine={false} tickLine={false} tick={{ fill: chartTextColor, fontSize: 12 }} dy={10} minTickGap={20} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: chartTextColor, fontSize: 12 }} tickFormatter={(val) => `1:${val}`} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--text))' }}
                    formatter={(val: number) => [`1:${val.toFixed(2)}`, 'Risk/Reward']}
                  />
                  <Line type="stepAfter" dataKey="rr" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 3, fill: 'hsl(var(--success))' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-text-muted">Not enough winning trades</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
