'use client'

import * as React from 'react'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { 
  ShieldAlert, ShieldCheck, Wallet, AlertTriangle, Ban, 
  TrendingDown, TrendingUp, BarChart3, Loader2, AlertOctagon,
  RefreshCw, Activity, ArrowUpRight, Flame, Scale, CheckCircle2,
  ExternalLink, Sliders, XCircle, Zap, Shield, Eye, Save, Clock, Radio, Search, Filter
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { SyndicateRadarSettings, SyndicateCluster } from '@/types/api'
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter 
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable, ColumnDef } from '@/components/ui/DataTable'
import { Progress } from '@/components/ui/progress'
import { Input, Label } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'

function formatMoney(val: number | string | undefined | null) {
  const num = typeof val === 'string' ? parseFloat(val) : (val ?? 0)
  if (isNaN(num)) return '$0'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(num)
}

function formatExactMoney(val: number | string | undefined | null) {
  const num = typeof val === 'string' ? parseFloat(val) : (val ?? 0)
  if (isNaN(num)) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

export interface ViolationAlertRow {
  id: number
  trader_name: string
  email: string
  user_id: number
  account_id: string
  rule_type: 'HFT Arbitrage' | 'Martingale Stacking' | 'News Window Spike' | 'Same-IP Collusion' | string
  risk_level: 'critical' | 'high' | 'medium' | 'low'
  details: string
  detected_at: string
  open_lots: number
}

export default function RiskManagementHubPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'overview' | 'syndicate'>('overview')

  // ─────────────────────────────────────────────────────────────────
  // ANTI-SYNDICATE FRAUD & GROUP HEDGING RADAR STATE
  // ─────────────────────────────────────────────────────────────────
  const [syndicateSettingsForm, setSyndicateSettingsForm] = useState<SyndicateRadarSettings>({
    time_delta_ms: 1500,
    lot_match_pct: 85,
    ip_mode: 'subnet_24',
  })
  const [syndicateSearch, setSyndicateSearch] = useState('')
  const [syndicateStatusFilter, setSyndicateStatusFilter] = useState<'all' | 'flagged' | 'frozen'>('all')

  const { data: syndicatesData, isLoading: isLoadingSyndicates, refetch: refetchSyndicates } = useQuery({
    queryKey: ['admin-syndicates-data'],
    queryFn: async () => {
      const res = await api.admin.syndicatesGet()
      return res.ok && res.data ? res.data : null
    },
    staleTime: 5000,
  })

  React.useEffect(() => {
    if (syndicatesData?.settings) {
      setSyndicateSettingsForm(syndicatesData.settings)
    }
  }, [syndicatesData])

  const saveSyndicateSettingsMutation = useMutation({
    mutationFn: async (payload: Partial<SyndicateRadarSettings>) => {
      const res = await api.admin.syndicatesSaveSettings(payload)
      if (!res.ok) throw new Error(res.error || 'Failed to save radar settings.')
      return res.data
    },
    onSuccess: () => {
      toast.success('Syndicate Radar thresholds updated!')
      queryClient.invalidateQueries({ queryKey: ['admin-syndicates-data'] })
    },
    onError: (err: any) => {
      toast.error('Save Error: ' + err.message)
    },
  })

  const freezeClusterMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.admin.syndicateFreeze(id)
      if (!res.ok) throw new Error(res.error || 'Failed to freeze syndicate cluster.')
      return res.data
    },
    onSuccess: (data) => {
      toast.error('🚨 RED ALERT: ' + (data?.message || 'Cluster frozen and accounts suspended!'), {
        duration: 6000,
      })
      refetchSyndicates()
    },
    onError: (err: any) => {
      toast.error('Freeze Error: ' + err.message)
    },
  })

  // API Queries
  const { data: riskStats, isLoading: isRiskLoading, refetch: refetchStats } = useQuery({
    queryKey: ['admin-risk-overview'],
    queryFn: () => api.admin.risk().then(res => res.ok ? res.data : null),
    staleTime: 10000,
  })

  const { data: alertsData, refetch: refetchAlerts } = useQuery({
    queryKey: ['admin-risk-alerts-data'],
    queryFn: () => api.admin.riskAlerts().then(res => res.ok ? res.data : null),
    staleTime: 10000,
  })

  // Symbol Exposure Data (Top 4 Instruments - Dynamic)
  const symbolExposures = useMemo(() => {
    const rawExposures = (riskStats as any)?.symbol_exposures
    if (rawExposures && Array.isArray(rawExposures) && rawExposures.length > 0) {
      return rawExposures
    }
    return [
      {
        symbol: 'US30',
        name: 'Wall Street 30 Index',
        longLots: 0.0,
        shortLots: 0.0,
        totalLots: 0.0,
        netLots: 0.0,
        direction: 'Flat' as const,
        openTrades: 0,
      },
      {
        symbol: 'NAS100',
        name: 'US Tech 100 Index',
        longLots: 0.0,
        shortLots: 0.0,
        totalLots: 0.0,
        netLots: 0.0,
        direction: 'Flat' as const,
        openTrades: 0,
      },
      {
        symbol: 'EURUSD',
        name: 'Euro / US Dollar',
        longLots: 0.0,
        shortLots: 0.0,
        totalLots: 0.0,
        netLots: 0.0,
        direction: 'Flat' as const,
        openTrades: 0,
      },
      {
        symbol: 'XAUUSD',
        name: 'Gold (Spot / USD)',
        longLots: 0.0,
        shortLots: 0.0,
        totalLots: 0.0,
        netLots: 0.0,
        direction: 'Flat' as const,
        openTrades: 0,
      },
    ]
  }, [riskStats])

  // Algorithmic Rule Violations Dataset (Dynamic from API)
  const violationAlerts: ViolationAlertRow[] = useMemo(() => {
    const rawList = alertsData?.alerts || (Array.isArray(alertsData) ? alertsData : (alertsData?.breaches || []))
    if (rawList && rawList.length > 0) {
      return rawList.map((a: any, idx: number) => ({
        id: a.id || idx + 1,
        trader_name: a.trader_name || a.username || a.display_name || `Trader #${a.user_id || idx + 1}`,
        email: a.email || a.user_email || `${a.username || 'trader'}@example.com`,
        user_id: a.user_id || 101,
        account_id: a.account_id || (a.challenge_id ? `#CH-${a.challenge_id}` : `#TRD-${a.user_id || idx + 1}`),
        rule_type: a.rule_type || a.violation_type || 'Risk Limit Exceeded',
        risk_level: a.risk_level || 'high',
        details: a.details || a.description || 'Drawdown or leverage limit breach detected.',
        detected_at: a.detected_at || a.created_at || 'Just now',
        open_lots: Number(a.open_lots || 0),
      }))
    }
    return []
  }, [alertsData])

  // Handlers for quick risk actions
  const handleForceClose = async (row: ViolationAlertRow) => {
    try {
      const res = await api.admin.riskForceClose({ user_id: row.user_id, account_id: row.account_id })
      if (res.ok && res.data?.success) {
        toast.success(res.data.message || `All open trades for ${row.account_id} closed at market price.`)
        refetchAlerts()
        refetchStats()
      } else {
        const errorMsg = (!res.ok ? res.error : res.data?.message) || `Failed to force close trades on ${row.account_id}`
        toast.error(errorMsg)
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to force close trades')
    }
  }

  const handleFlagTrader = async (row: ViolationAlertRow) => {
    try {
      const res = await api.admin.riskFlagTrader({ user_id: row.user_id, reason: row.details })
      if (res.ok && res.data.success) {
        toast.warning(`Account ${row.account_id} tagged with Compliance Risk Flag. Trader notified of audit.`)
        refetchAlerts()
      } else {
        toast.error((!res.ok ? res.error : res.data.message) || 'Failed to flag trader')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to flag trader')
    }
  }

  // DataTable Column Definitions
  const columns: ColumnDef<ViolationAlertRow>[] = [
    {
      key: 'trader',
      header: 'Trader & Account',
      render: (row) => (
        <div className="space-y-0.5">
          <Link 
            href={`/admin/traders/${row.user_id}`}
            className="font-semibold text-gray-100 hover:text-emerald-400 text-xs transition-colors flex items-center gap-1.5"
          >
            {row.trader_name}
            <ExternalLink className="h-3 w-3 opacity-60" />
          </Link>
          <span className="font-mono text-[11px] text-gray-500">{row.account_id} • {row.email}</span>
        </div>
      )
    },
    {
      key: 'rule_type',
      header: 'Algorithmic Anomaly',
      render: (row) => (
        <div className="flex items-center gap-2">
          <AlertTriangle className={`h-4 w-4 shrink-0 ${
            row.risk_level === 'critical' ? 'text-red-400' :
            row.risk_level === 'high' ? 'text-amber-400' : 'text-blue-400'
          }`} />
          <span className="text-xs font-semibold text-gray-200">{row.rule_type}</span>
        </div>
      )
    },
    {
      key: 'risk_level',
      header: 'Risk Tier',
      align: 'center',
      render: (row) => {
        if (row.risk_level === 'critical') {
          return <Badge tone="danger" size="sm" pulsing>Critical Breach</Badge>
        }
        if (row.risk_level === 'high') {
          return <Badge tone="warning" size="sm" pulsing>High Risk</Badge>
        }
        return <Badge tone="info" size="sm">Medium Risk</Badge>
      }
    },
    {
      key: 'details',
      header: 'Audit Telemetry Details',
      render: (row) => (
        <p className="text-xs text-gray-400 max-w-[280px] font-mono leading-relaxed">
          {row.details}
        </p>
      )
    },
    {
      key: 'detected_at',
      header: 'Detected',
      align: 'right',
      render: (row) => (
        <span className="text-xs text-gray-500 font-mono">
          {row.detected_at}
        </span>
      )
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleFlagTrader(row)}
            className="h-7 text-xs border-amber-500/40 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500"
          >
            Flag Account
          </Button>

          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleForceClose(row)}
            className="h-7 text-xs"
          >
            Force Close
          </Button>
        </div>
      )
    }
  ]

  const clusters = syndicatesData?.clusters || []
  const filteredClusters = useMemo(() => {
    return clusters.filter((c: SyndicateCluster) => {
      if (syndicateStatusFilter !== 'all' && c.status !== syndicateStatusFilter) return false
      if (syndicateSearch.trim()) {
        const q = syndicateSearch.toLowerCase()
        const matchCode = c.cluster_code.toLowerCase().includes(q)
        const matchSym = c.symbol.toLowerCase().includes(q)
        const matchA = (c.trader_a_name || '').toLowerCase().includes(q) || (c.trader_a_email || '').toLowerCase().includes(q) || String(c.account_a_id).includes(q)
        const matchB = (c.trader_b_name || '').toLowerCase().includes(q) || (c.trader_b_email || '').toLowerCase().includes(q) || String(c.account_b_id).includes(q)
        const matchIP = (c.ip_a || '').includes(q) || (c.ip_b || '').includes(q)
        return matchCode || matchSym || matchA || matchB || matchIP
      }
      return true
    })
  }, [clusters, syndicateStatusFilter, syndicateSearch])

  const flaggedClustersCount = clusters.filter((c: SyndicateCluster) => c.status === 'flagged').length

  const fundedCap = Number(riskStats?.funded_capital ?? 0)
  const unhedgedExp = Number((riskStats as any)?.unhedged_exposure ?? 0)
  const highRiskCount = Number((riskStats as any)?.high_drawdown_accounts ?? 0)
  const activeAlertsCount = violationAlerts.length

  return (
    <div className="w-full space-y-8 pb-16">
      
      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1F2937]/70 pb-6 w-full">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Institutional Risk & Threat Control
            </h1>
            <Badge tone="accent" size="sm" pulsing className="font-mono">
              Live Feed Active
            </Badge>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Real-time monitoring of funded liabilities, symbol net exposures, anti-syndicate reverse hedging, and algorithmic collusion.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-[#111827] p-1 rounded-xl border border-[#1F2937]">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'overview'
                  ? 'bg-accent text-slate-950 font-bold shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              Exposure & Violations
            </button>

            <button
              onClick={() => setActiveTab('syndicate')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'syndicate'
                  ? 'bg-red-600 text-white font-bold shadow-sm shadow-red-600/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
              Syndicate Risk Radar
              {flaggedClustersCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-red-500/20 text-red-300 border border-red-500/40 font-bold">
                  {flaggedClustersCount}
                </span>
              )}
            </button>
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              if (activeTab === 'overview') {
                refetchStats()
                refetchAlerts()
                toast.success('Risk telemetry refreshed')
              } else {
                refetchSyndicates()
                toast.success('Syndicate radar refreshed')
              }
            }}
            className="border-[#1F2937] text-gray-300 hover:text-white hover:bg-slate-800/80 gap-2 h-9"
          >
            <RefreshCw className="h-4 w-4 text-accent" />
            Refresh
          </Button>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: OVERVIEW & EXPOSURE MONITOR                                  */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-8 w-full">
          {/* 1. Risk Exposure Telemetry Cards (4 Key Metrics) */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            
            {/* Card 1: Funded Capital Liability */}
            <Card className="bg-[#111827] border-[#1F2937] hover:border-accent/40 hover:shadow-[0_0_15px_var(--accent-glow)] transition-all duration-200 group relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-accent/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400 group-hover:text-gray-200 transition-colors">
                    Total Funded Liability
                  </span>
                  <div className="h-8 w-8 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-gray-400 group-hover:text-accent group-hover:border-accent/40 transition-colors">
                    <Wallet className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-3 flex items-baseline justify-between">
                  <h3 className="text-2xl font-bold font-mono text-white tracking-tight">
                    {formatMoney(fundedCap)}
                  </h3>
                </div>

                <div className="mt-2.5 flex items-center justify-between gap-2 text-xs">
                  <span className="text-[11px] text-gray-400 leading-tight block flex-1">
                    Pool backed by liquidity reserve
                  </span>
                  <Badge tone="accent" size="sm" className="shrink-0 font-mono text-[10px] px-2 py-0.5">
                    {fundedCap > 0 ? 'Allocated' : '$0 Allocated'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Net Unhedged Exposure */}
            <Card className="bg-[#111827] border-[#1F2937] hover:border-accent/40 hover:shadow-[0_0_15px_var(--accent-glow)] transition-all duration-200 group relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400 group-hover:text-gray-200 transition-colors">
                    Net Unhedged Exposure
                  </span>
                  <div className="h-8 w-8 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-gray-400 group-hover:text-blue-400 group-hover:border-blue-500/40 transition-colors">
                    <Scale className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-3 flex items-baseline justify-between">
                  <h3 className="text-2xl font-bold font-mono text-white tracking-tight">
                    {formatMoney(unhedgedExp)}
                  </h3>
                </div>

                <div className="mt-2.5 flex items-center justify-between gap-2 text-xs">
                  <span className="text-[11px] text-gray-400 leading-tight block flex-1">
                    Floating exposure in market
                  </span>
                  <Badge tone="info" size="sm" className="shrink-0 font-mono text-[10px] px-2 py-0.5">
                    {unhedgedExp > 0 ? `${((unhedgedExp / (fundedCap || 1)) * 100).toFixed(1)}% of pool` : '0.0% of pool'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: High-Risk Accounts */}
            <Card className="bg-[#111827] border-[#1F2937] hover:border-accent/40 hover:shadow-[0_0_15px_var(--accent-glow)] transition-all duration-200 group relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400 group-hover:text-gray-200 transition-colors">
                    High Drawdown Accounts
                  </span>
                  <div className="h-8 w-8 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-gray-400 group-hover:text-amber-400 group-hover:border-amber-500/40 transition-colors">
                    <TrendingDown className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-3 flex items-baseline justify-between">
                  <h3 className="text-2xl font-bold font-mono text-white tracking-tight">
                    {highRiskCount}
                  </h3>
                </div>

                <div className="mt-2.5 flex items-center justify-between gap-2 text-xs">
                  <span className="text-[11px] text-gray-400 leading-tight block flex-1">
                    Accounts &gt; 80% DD threshold
                  </span>
                  <Badge tone={highRiskCount > 0 ? "warning" : "neutral"} size="sm" className="shrink-0 font-mono text-[10px] px-2 py-0.5">
                    {highRiskCount > 0 ? "Approaching Breach" : "0 Breaches"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Card 4: Active Algorithmic Threat Alerts */}
            <Card className="bg-[#111827] border-[#1F2937] hover:border-accent/40 hover:shadow-[0_0_15px_var(--accent-glow)] transition-all duration-200 group relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400 group-hover:text-gray-200 transition-colors">
                    Algorithmic Violations
                  </span>
                  <div className="h-8 w-8 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-gray-400 group-hover:text-red-400 group-hover:border-red-500/40 transition-colors">
                    <ShieldAlert className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-3 flex items-baseline justify-between">
                  <h3 className={`text-2xl font-bold font-mono tracking-tight ${activeAlertsCount > 0 ? 'text-red-400' : 'text-accent'}`}>
                    {activeAlertsCount > 0 ? `${activeAlertsCount} Active` : '0 Active'}
                  </h3>
                </div>

                <div className="mt-2.5 flex items-center justify-between gap-2 text-xs">
                  <span className="text-[11px] text-gray-400 leading-tight block flex-1">
                    HFT, martingale & spike detection
                  </span>
                  <Badge tone={activeAlertsCount > 0 ? "danger" : "accent"} size="sm" className="shrink-0 font-mono text-[10px] px-2 py-0.5">
                    {activeAlertsCount > 0 ? "Immediate Review" : "System Safe"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

          </section>

          {/* 2. Real-Time Symbol Net Exposure Heatmap */}
          <section className="space-y-4 w-full">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-100 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-accent" />
                  Instrument Net Exposure & Long / Short Balance
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Aggregate lot sizing open across all active trader contracts
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
              {symbolExposures.map((item: any) => {
                const total = Number(item.totalLots || 0)
                const longLots = Number(item.longLots || 0)
                const shortLots = Number(item.shortLots || 0)
                const longPct = total > 0 ? ((longLots / total) * 100).toFixed(0) : '50'
                const shortPct = total > 0 ? (100 - Number(longPct)).toFixed(0) : '50'

                return (
                  <Card key={item.symbol} className="bg-[#111827] border-[#1F2937] hover:border-accent/40 transition-all">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-base font-mono text-gray-100">{item.symbol}</CardTitle>
                        <CardDescription className="text-[11px] text-gray-400">{item.name}</CardDescription>
                      </div>
                      <Badge 
                        tone={item.direction === 'Flat' ? 'neutral' : item.netLots >= 0 ? 'accent' : 'danger'} 
                        size="sm"
                        className="font-mono text-[10px]"
                      >
                        {item.direction}
                      </Badge>
                    </CardHeader>

                    <CardContent className="space-y-3 pt-2">
                      <div className="flex justify-between items-baseline text-xs font-mono">
                        <span className="text-gray-400">Total Volume:</span>
                        <span className="text-white font-bold">{total.toFixed(1)} Lots</span>
                      </div>

                      {/* Long vs Short visual split bar */}
                      <div className="space-y-1">
                        <div className="h-2 w-full rounded-full bg-slate-800 flex overflow-hidden">
                          <div 
                            style={{ width: `${total > 0 ? longPct : 0}%` }}
                            className="bg-accent h-full transition-all"
                            title={`Long: ${longLots} Lots (${longPct}%)`}
                          />
                          <div 
                            style={{ width: `${total > 0 ? shortPct : 0}%` }}
                            className="bg-red-500 h-full transition-all"
                            title={`Short: ${shortLots} Lots (${shortPct}%)`}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] font-mono text-gray-400">
                          <span className="text-accent font-semibold">{total > 0 ? `${longPct}% Long (${longLots}L)` : '0% Long'}</span>
                          <span className="text-red-400 font-semibold">{total > 0 ? `${shortPct}% Short (${shortLots}L)` : '0% Short'}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#1F2937]/50 flex justify-between items-center text-xs font-mono text-gray-500">
                        <span>Net Delta: <strong className={item.netLots > 0 ? 'text-accent' : item.netLots < 0 ? 'text-red-400' : 'text-gray-400'}>
                          {item.netLots > 0 ? `+${item.netLots}` : item.netLots} Lots
                        </strong></span>
                        <span>{item.openTrades || 0} Positions</span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </section>

          {/* 3. Algorithmic Rule Violations & Alerts Table */}
          <Card className="bg-[#111827] border-[#1F2937]">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base text-gray-100 flex items-center gap-2">
                  <AlertOctagon className="h-4 w-4 text-red-400" />
                  Algorithmic Violation Alerts & Threat Detection
                </CardTitle>
                <CardDescription className="text-xs text-gray-400">
                  Automated heuristics for HFT scalping, Martingale stacking, same-IP collusion, and news trading
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <DataTable<ViolationAlertRow>
                columns={columns}
                data={violationAlerts}
                emptyMessage="No active risk violations detected — all trading accounts operate within safe drawdown parameters."
                className="border-0 rounded-none bg-transparent"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: ANTI-SYNDICATE FRAUD & GROUP HEDGING RADAR                   */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'syndicate' && (
        <div className="space-y-8 w-full">
          
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-red-950/40 via-red-900/20 to-slate-900/60 p-6 rounded-2xl border border-red-500/30 backdrop-blur-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      Anti-Syndicate Fraud & Group Hedging Radar
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-red-500/20 text-red-300 border border-red-500/40 font-bold animate-pulse">
                        Active Interceptor
                      </span>
                    </h2>
                    <p className="text-xs text-gray-300">
                      Autonomous real-time detection of coordinated reverse-hedging clusters, identical subnet trade execution, and group risk exploitation.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <div className="bg-slate-950/80 px-4 py-2 rounded-xl border border-red-500/20 text-right">
                  <div className="text-[10px] font-mono uppercase text-gray-400">Flagged Clusters</div>
                  <div className="text-xl font-bold font-mono text-red-400 flex items-center justify-end gap-1.5">
                    <Radio className="h-4 w-4 animate-ping text-red-500" />
                    {flaggedClustersCount} Threat(s)
                  </div>
                </div>

                <div className="bg-slate-950/80 px-4 py-2 rounded-xl border border-emerald-500/20 text-right">
                  <div className="text-[10px] font-mono uppercase text-gray-400">Radar Sensitivity</div>
                  <div className="text-xl font-bold font-mono text-emerald-400">
                    {syndicateSettingsForm.time_delta_ms} ms
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 1. Cluster Detection Settings Card */}
          <Card className="bg-[#111827] border-[#1F2937] overflow-hidden">
            <CardHeader className="border-b border-[#1F2937]/70 pb-4">
              <CardTitle className="text-base text-gray-100 flex items-center gap-2">
                <Sliders className="h-4 w-4 text-emerald-400" />
                Cluster Detection & Cross-Account Sensitivity Settings
              </CardTitle>
              <CardDescription className="text-xs text-gray-400">
                Configure millisecond time thresholds, lot size correlation tolerances, and IP subnet matching modes for autonomous cluster identification.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Time Delta Sensitivity */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-blue-400" />
                    Time Delta Sensitivity (ms)
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min={100}
                      max={10000}
                      step={100}
                      value={syndicateSettingsForm.time_delta_ms}
                      onChange={(e) => setSyndicateSettingsForm({ ...syndicateSettingsForm, time_delta_ms: Number(e.target.value) })}
                      className="bg-[#0B0F19] border-[#1F2937] text-white font-mono h-10"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-gray-500 font-mono">ms</span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Maximum time window between opposing trades to trigger syndicate flagging (Default: 1,500ms).
                  </p>
                </div>

                {/* Lot Size Match Ratio */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                    <Scale className="h-3.5 w-3.5 text-amber-400" />
                    Lot Size Match Ratio (%)
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min={50}
                      max={100}
                      step={1}
                      value={syndicateSettingsForm.lot_match_pct}
                      onChange={(e) => setSyndicateSettingsForm({ ...syndicateSettingsForm, lot_match_pct: Number(e.target.value) })}
                      className="bg-[#0B0F19] border-[#1F2937] text-white font-mono h-10"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-gray-500 font-mono">%</span>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Volume symmetry requirement between Buy & Sell legs to qualify as reverse hedging (Default: 85%).
                  </p>
                </div>

                {/* Strict IP Matching Mode */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-purple-400" />
                    IP Address Correlation Mode
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSyndicateSettingsForm({ ...syndicateSettingsForm, ip_mode: 'subnet_24' })}
                      className={`p-2 rounded-lg text-xs font-semibold border transition-all text-center ${
                        syndicateSettingsForm.ip_mode === 'subnet_24'
                          ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 shadow-sm'
                          : 'bg-[#0B0F19] border-[#1F2937] text-gray-400 hover:text-white'
                      }`}
                    >
                      Subnet /24
                      <span className="block text-[9px] text-gray-500 font-normal">Proxy/VPN Cluster</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSyndicateSettingsForm({ ...syndicateSettingsForm, ip_mode: 'exact' })}
                      className={`p-2 rounded-lg text-xs font-semibold border transition-all text-center ${
                        syndicateSettingsForm.ip_mode === 'exact'
                          ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 shadow-sm'
                          : 'bg-[#0B0F19] border-[#1F2937] text-gray-400 hover:text-white'
                      }`}
                    >
                      Exact Match
                      <span className="block text-[9px] text-gray-500 font-normal">Identical IP Only</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Subnet /24 detects VPN colluders rotating within the same data center range.
                  </p>
                </div>

              </div>
            </CardContent>

            <CardFooter className="bg-[#0B0F19]/60 border-t border-[#1F2937]/70 p-4 flex items-center justify-between">
              <div className="text-xs text-gray-400 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Real-time cross-account matcher updates immediately upon saving</span>
              </div>

              <Button
                variant="primary"
                onClick={() => saveSyndicateSettingsMutation.mutate(syndicateSettingsForm)}
                loading={saveSyndicateSettingsMutation.isPending}
                className="gap-1.5 shadow-emerald-500/20"
              >
                <Save className="h-4 w-4" />
                Save Radar Thresholds
              </Button>
            </CardFooter>
          </Card>

          {/* 2. Live Syndicate Detection Table */}
          <Card className="bg-[#111827] border-[#1F2937] overflow-hidden">
            <CardHeader className="border-b border-[#1F2937]/70 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base text-gray-100 flex items-center gap-2">
                    <Radio className="h-4 w-4 text-red-400" />
                    Live Syndicate Detection & Collusion Queue
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-400">
                    Detected reverse-hedging pairs and coordinated account networks flagged by the trading engine interceptor.
                  </CardDescription>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-gray-500" />
                    <Input
                      placeholder="Search cluster, trader, IP..."
                      value={syndicateSearch}
                      onChange={(e) => setSyndicateSearch(e.target.value)}
                      className="pl-8 h-8 text-xs bg-[#0B0F19] border-[#1F2937] text-white w-48 font-mono"
                    />
                  </div>

                  <div className="flex items-center bg-[#0B0F19] p-0.5 rounded-lg border border-[#1F2937]">
                    <button
                      onClick={() => setSyndicateStatusFilter('all')}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                        syndicateStatusFilter === 'all'
                          ? 'bg-slate-800 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      All ({clusters.length})
                    </button>
                    <button
                      onClick={() => setSyndicateStatusFilter('flagged')}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                        syndicateStatusFilter === 'flagged'
                          ? 'bg-red-500/20 text-red-300 font-bold'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Active Flags ({flaggedClustersCount})
                    </button>
                    <button
                      onClick={() => setSyndicateStatusFilter('frozen')}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                        syndicateStatusFilter === 'frozen'
                          ? 'bg-slate-800 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Frozen ({clusters.filter(c => c.status === 'frozen').length})
                    </button>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#1F2937] bg-[#0B0F19]/80 text-gray-400 font-mono uppercase text-[11px]">
                      <th className="py-3.5 px-4">Cluster ID & Symbol</th>
                      <th className="py-3.5 px-4">Flagged Accounts</th>
                      <th className="py-3.5 px-4">Opposing Positions</th>
                      <th className="py-3.5 px-4">IP Correlation</th>
                      <th className="py-3.5 px-4 text-center">Time Delta</th>
                      <th className="py-3.5 px-4 text-center">Syndicate Risk</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2937]/50">
                    {isLoadingSyndicates ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-gray-500">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-emerald-400 mb-2" />
                          Scanning active order flow across accounts...
                        </td>
                      </tr>
                    ) : filteredClusters.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-gray-500">
                          <ShieldCheck className="h-8 w-8 mx-auto text-emerald-400/60 mb-2" />
                          No syndicate clusters matching filter. Threat radar running clean.
                        </td>
                      </tr>
                    ) : (
                      filteredClusters.map((cluster) => {
                        const isFrozen = cluster.status === 'frozen'
                        return (
                          <tr 
                            key={cluster.id} 
                            className={`transition-colors ${
                              isFrozen ? 'bg-slate-950/40 opacity-75' : 'hover:bg-red-950/10'
                            }`}
                          >
                            {/* Cluster ID & Symbol */}
                            <td className="py-4 px-4 align-top">
                              <div className="space-y-1">
                                <span className="font-mono font-bold text-gray-100 flex items-center gap-1.5">
                                  <ShieldAlert className={`h-3.5 w-3.5 ${isFrozen ? 'text-gray-500' : 'text-red-400'}`} />
                                  {cluster.cluster_code}
                                </span>
                                <Badge tone="info" size="sm" className="font-mono text-[10px]">
                                  {cluster.symbol}
                                </Badge>
                                <div className="text-[10px] text-gray-500 font-mono">
                                  {cluster.created_at}
                                </div>
                              </div>
                            </td>

                            {/* Flagged Accounts */}
                            <td className="py-4 px-4 align-top">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono text-[10px] font-bold">
                                    Leg A
                                  </span>
                                  <div>
                                    <Link 
                                      href={`/admin/traders/${cluster.user_a_id}`}
                                      className="font-semibold text-gray-200 hover:text-emerald-400 transition-colors text-xs flex items-center gap-1"
                                    >
                                      {cluster.trader_a_name || `Trader #${cluster.user_a_id}`}
                                      <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                                    </Link>
                                    <div className="text-[11px] text-gray-500 font-mono">
                                      Acc #{cluster.account_a_id} • {cluster.trader_a_email || 'trader@propfirm.com'}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-[10px] font-bold">
                                    Leg B
                                  </span>
                                  <div>
                                    <Link 
                                      href={`/admin/traders/${cluster.user_b_id}`}
                                      className="font-semibold text-gray-200 hover:text-emerald-400 transition-colors text-xs flex items-center gap-1"
                                    >
                                      {cluster.trader_b_name || `Trader #${cluster.user_b_id}`}
                                      <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                                    </Link>
                                    <div className="text-[11px] text-gray-500 font-mono">
                                      Acc #{cluster.account_b_id} • {cluster.trader_b_email || 'trader@propfirm.com'}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Opposing Positions */}
                            <td className="py-4 px-4 align-top">
                              <div className="space-y-1.5 font-mono text-xs">
                                <div className="flex items-center gap-1.5">
                                  <span className={cluster.action_a === 'BUY' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                                    {cluster.action_a} {cluster.lot_a} Lots
                                  </span>
                                  <span className="text-gray-500 text-[10px]">on {cluster.symbol}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className={cluster.action_b === 'BUY' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                                    {cluster.action_b} {cluster.lot_b} Lots
                                  </span>
                                  <span className="text-gray-500 text-[10px]">on {cluster.symbol}</span>
                                </div>
                                <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                  <Scale className="h-3 w-3 text-amber-400" />
                                  <span>Hedging Ratio: <strong>{Math.round((Math.min(Number(cluster.lot_a), Number(cluster.lot_b)) / Math.max(Number(cluster.lot_a), Number(cluster.lot_b))) * 100)}%</strong></span>
                                </div>
                              </div>
                            </td>

                            {/* IP Correlation */}
                            <td className="py-4 px-4 align-top">
                              <div className="space-y-1 font-mono text-[11px]">
                                <div className="text-gray-300 flex items-center gap-1">
                                  <span className="text-gray-500">A:</span> {cluster.ip_a}
                                </div>
                                <div className="text-gray-300 flex items-center gap-1">
                                  <span className="text-gray-500">B:</span> {cluster.ip_b}
                                </div>
                                <Badge 
                                  tone={cluster.ip_match_type === 'exact' ? 'danger' : 'warning'} 
                                  size="sm"
                                  className="text-[9px] uppercase tracking-wider font-mono mt-1"
                                >
                                  {cluster.ip_match_type === 'exact' ? 'Exact IP Match' : 'Subnet /24 Match'}
                                </Badge>
                              </div>
                            </td>

                            {/* Time Delta */}
                            <td className="py-4 px-4 align-top text-center">
                              <span className="inline-block px-2.5 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold">
                                +{cluster.time_delta_ms} ms
                              </span>
                              <div className="text-[10px] text-gray-500 font-mono mt-1">
                                Execution Gap
                              </div>
                            </td>

                            {/* Syndicate Risk Score */}
                            <td className="py-4 px-4 align-top text-center">
                              <div className="inline-flex flex-col items-center gap-1">
                                <span className={`font-mono text-sm font-extrabold ${
                                  Number(cluster.risk_score) >= 95 ? 'text-red-400 animate-pulse' : 'text-amber-400'
                                }`}>
                                  {Number(cluster.risk_score).toFixed(1)}% Risk
                                </span>
                                <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                  <div 
                                    style={{ width: `${cluster.risk_score}%` }}
                                    className="bg-red-500 h-full rounded-full"
                                  />
                                </div>
                                <span className="text-[9px] uppercase font-mono tracking-wider text-red-400/80">
                                  Critical Collusion
                                </span>
                              </div>
                            </td>

                            {/* Action */}
                            <td className="py-4 px-4 align-top text-right">
                              {isFrozen ? (
                                <div className="space-y-1">
                                  <Badge tone="danger" size="sm" className="font-mono text-[10px]">
                                    Frozen & Suspended
                                  </Badge>
                                  <div className="text-[10px] text-gray-500 font-mono">
                                    Positions Liquidated
                                  </div>
                                </div>
                              ) : (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => freezeClusterMutation.mutate(cluster.id)}
                                  loading={freezeClusterMutation.isPending}
                                  className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white font-bold gap-1.5 shadow-lg shadow-red-600/30 border border-red-500/50"
                                >
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  Freeze Cluster (Red Alert)
                                </Button>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

        </div>
      )}

    </div>
  )
}
