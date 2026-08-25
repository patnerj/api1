'use client'

import { useAdminRiskQuery, useAdminRiskAlertsQuery, useAdminRiskExposureQuery } from '@/hooks/useApi'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AlertTriangle, TrendingUp, ShieldAlert, Activity, UserX, AlertOctagon, TrendingDown, Clock, BanknoteIcon, Radio } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Badge } from '@/components/ui/badge'

export default function AdminRiskPage() {
  const { data: risk, isLoading: isRiskLoading } = useAdminRiskQuery()
  const { data: alerts, isLoading: isAlertsLoading } = useAdminRiskAlertsQuery()
  const { data: exposure, isLoading: isExposureLoading } = useAdminRiskExposureQuery()

  // Color mapping for exposure directions
  const COLORS = {
    buy: 'hsl(var(--success))',
    sell: 'hsl(var(--destructive))',
  }

  // Format exposure data for the chart
  const formattedExposure = exposure?.reduce((acc: any[], item: any) => {
    const symbol = item.symbol
    const cmd = String(item.cmd) === '0' || item.cmd === 'buy' ? 'buy' : 'sell'
    const lots = parseFloat(String(item.total_lots))

    let existing = acc.find(a => a.symbol === symbol)
    if (!existing) {
      existing = { symbol, buy: 0, sell: 0, net: 0 }
      acc.push(existing)
    }
    existing[cmd] += lots
    existing.net = existing.buy - existing.sell // Net exposure
    return acc
  }, [])?.sort((a: any, b: any) => Math.abs(b.net) - Math.abs(a.net)).slice(0, 10) || [] // Top 10 by absolute net exposure

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Risk Management & AI</h1>
          <p className="text-text-muted mt-1">
            Monitor firm-wide exposure, detect toxic behavior, and manage liabilities in real-time.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-full shadow-sm">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-text">Live System</span>
        </div>
      </div>

      {/* Firm Overview KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Funded Capital Liability</CardTitle>
            <ShieldAlert className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(risk?.funded_capital || 0).toLocaleString()}
            </div>
            <p className="text-xs text-text-muted mt-1">
              Across {risk?.funded_count || 0} funded accounts
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
            <BanknoteIcon className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              ${(risk?.pending_payout_value || 0).toLocaleString()}
            </div>
            <p className="text-xs text-text-muted mt-1">
              {risk?.pending_payout_count || 0} requests awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Near Breach (Drawdown)</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {risk?.near_breach || 0}
            </div>
            <p className="text-xs text-text-muted mt-1">
              Active accounts close to max DD
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Frozen / Banned</CardTitle>
            <UserX className="h-4 w-4 text-text-muted" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {risk?.frozen_count || 0} / {risk?.banned_count || 0}
            </div>
            <p className="text-xs text-text-muted mt-1">
              Accounts suspended for violations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AI Alerts & Toxic Behavior */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-destructive" />
              High Frequency Trading (HFT) Alerts
            </CardTitle>
            <CardDescription>
              AI detected multiple trades closed in under 30 seconds.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {alerts?.hft_risks && alerts.hft_risks.length > 0 ? (
              <div className="space-y-4">
                {alerts.hft_risks.map((user: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-destructive" />
                      <div>
                        <p className="text-sm font-medium">{user.user_email}</p>
                        <p className="text-xs text-destructive font-medium">{user.count} HFT trades detected</p>
                      </div>
                    </div>
                    <Badge tone="danger" className="uppercase">Review</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-text-muted">
                <ShieldAlert className="h-10 w-10 mb-2 opacity-20" />
                <p>No HFT activity detected</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertOctagon className="h-5 w-5 text-warning" />
              Gambling / Massive Lots Alerts
            </CardTitle>
            <CardDescription>
              AI detected unusually large position sizing ({'>'}20 lots).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {alerts?.gambling_risks && alerts.gambling_risks.length > 0 ? (
              <div className="space-y-4">
                {alerts.gambling_risks.map((user: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-warning/20 bg-warning/5">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-5 w-5 text-warning" />
                      <div>
                        <p className="text-sm font-medium">{user.user_email}</p>
                        <p className="text-xs text-warning font-medium">{user.count} massive lot trades detected</p>
                      </div>
                    </div>
                    <Badge tone="warn" className="uppercase">Review</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-text-muted">
                <ShieldAlert className="h-10 w-10 mb-2 opacity-20" />
                <p>No gambling activity detected</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Global Market Exposure */}
      <Card>
        <CardHeader>
          <CardTitle>Global Market Exposure (Top 10 Symbols)</CardTitle>
          <CardDescription>
            Firm-wide aggregate lot exposure across all open trader positions. Helps hedge risk against A-book providers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {formattedExposure.length > 0 ? (
            <div className="h-[350px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={formattedExposure} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <XAxis dataKey="symbol" stroke="hsl(var(--border))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--border))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val} Lots`} />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--surface-muted))' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--surface))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    formatter={(value: number, name: string) => [
                      `${value.toFixed(2)} Lots`,
                      name === 'buy' ? 'Longs' : name === 'sell' ? 'Shorts' : 'Net Exposure'
                    ]}
                  />
                  <Bar dataKey="buy" name="Longs" fill={COLORS.buy} radius={[4, 4, 0, 0]} maxBarSize={40} stackId="a" />
                  <Bar dataKey="sell" name="Shorts" fill={COLORS.sell} radius={[4, 4, 0, 0]} maxBarSize={40} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[250px] text-text-muted">
              <TrendingDown className="h-10 w-10 mb-2 opacity-20" />
              <p>No open positions found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

