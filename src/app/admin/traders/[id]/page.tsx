'use client'

import * as React from 'react'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft, User, Mail, Calendar, Hash, ShieldCheck, ShieldAlert,
  Sliders, KeyRound, Ban, DollarSign, TrendingUp, TrendingDown,
  Activity, Target, Award, CheckCircle2, Clock, FileText,
  CreditCard, Wallet, AlertTriangle, Loader2, ExternalLink,
  Lock, RefreshCw, Send, Check, X, Shield, Sparkles, Server,
  Radio, Terminal, Eye, EyeOff, Save
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/store/auth'
import { useImpersonation } from '@/store/impersonation'
import { setSession, clearFxsimCache } from '@/lib/fxsim'
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter 
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Label } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { DataTable, ColumnDef } from '@/components/ui/DataTable'
import { EnterpriseOverrideModal, TraderOverrideTarget } from '@/components/admin/EnterpriseOverrideModal'
import { DirectPasswordResetModal, DirectPasswordResetTarget } from '@/components/admin/DirectPasswordResetModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { toast } from 'sonner'

// Helper currency formatters
function formatCurrency(val: number | string | undefined | null) {
  const num = typeof val === 'string' ? parseFloat(val) : (val ?? 0)
  if (isNaN(num)) return '$0'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(num)
}

function formatExactCurrency(val: number | string | undefined | null) {
  const num = typeof val === 'string' ? parseFloat(val) : (val ?? 0)
  if (isNaN(num)) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

export default function Trader360ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const adminUser = useAuth((s) => s.user)
  const startImpersonation = useImpersonation((s) => s.start)
  const userId = Number(params?.id) || 1

  // Modals & form states
  const [overrideModalOpen, setOverrideModalOpen] = useState(false)
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false)
  const [impersonateConfirmOpen, setImpersonateConfirmOpen] = useState(false)
  const [isImpersonating, setIsImpersonating] = useState(false)
  const [isBanned, setIsBanned] = useState(false)
  const [noteInput, setNoteInput] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)
  
  // Note list state
  const [adminNotesList, setAdminNotesList] = useState<Array<{ id: number; author: string; role: string; content: string; date: string }>>([])

  // MT5 Broker Connection State
  const [mt5Form, setMt5Form] = useState({
    login: '',
    password: '',
    server: 'MetaQuotes-Demo',
    account_type: 'demo',
  })
  const [isSavingMt5, setIsSavingMt5] = useState(false)
  const [showMt5Password, setShowMt5Password] = useState(false)

  // Fetch trader 360 data
  const { data: traderApiData, isLoading, refetch } = useQuery({
    queryKey: ['admin-trader-360', userId],
    queryFn: async () => {
      try {
        const res = await api.admin.getTrader360(userId)
        if (res.ok && res.data) {
          return res.data.data || res.data
        }
      } catch {
        // graceful fallback to detail endpoint
      }
      try {
        const detailRes = await api.admin.userDetail(userId)
        if (detailRes.ok && detailRes.data) {
          return detailRes.data
        }
      } catch {
        // fallback
      }
      return null
    },
    staleTime: 10000,
  })

  // Normalized Profile Data Model with strict real calculations
  const trader = useMemo(() => {
    const apiUser = traderApiData?.user || traderApiData
    const challenge = traderApiData?.challenge || traderApiData?.challenges?.[0]
    const startingBal = Number(challenge?.starting_balance || traderApiData?.account?.starting_balance || 0)
    const currentBal = Number(challenge?.current_balance || traderApiData?.account?.balance || startingBal || 0)
    const currentEq = Number(traderApiData?.account?.equity || currentBal || startingBal || 0)
    const pnl = currentEq - startingBal
    const pnlPct = startingBal > 0 ? (pnl / startingBal) * 100 : 0

    const profitSplit = Number(challenge?.custom_profit_split || challenge?.plan_profit_split || 80)
    const dailyDD = Number(challenge?.custom_daily_dd || 5.0)
    const maxDD = Number(challenge?.custom_max_dd || 10.0)
    const minDays = Number(challenge?.custom_min_days || challenge?.min_trading_days || 5)
    const newsTrading = challenge?.custom_news_trading !== undefined && challenge?.custom_news_trading !== null
      ? Boolean(Number(challenge.custom_news_trading))
      : Boolean(challenge?.news_trading ?? true)
    const weekendHolding = challenge?.custom_weekend_holding !== undefined && challenge?.custom_weekend_holding !== null
      ? Boolean(Number(challenge.custom_weekend_holding))
      : Boolean(challenge?.weekend_holding ?? false)

    const tradesList = traderApiData?.trades || []
    const wins = tradesList.filter((t: any) => Number(t.pnl || t.profit || 0) > 0).length
    const losses = tradesList.filter((t: any) => Number(t.pnl || t.profit || 0) < 0).length
    const totalTrades = tradesList.length
    const winRate = totalTrades > 0 ? Number(((wins / totalTrades) * 100).toFixed(1)) : 0

    const mt5Login = String(challenge?.mt5_login || apiUser?.mt5_login || '')
    const mt5Server = String(challenge?.mt5_server || apiUser?.mt5_server || 'MetaQuotes-Demo')
    const mt5AccountType = String(challenge?.mt5_account_type || apiUser?.mt5_account_type || 'demo')

    return {
      id: userId,
      user_id: userId,
      name: apiUser?.display_name || apiUser?.name || apiUser?.username || `Trader #${userId}`,
      email: apiUser?.email || apiUser?.user_email || '',
      username: apiUser?.username || apiUser?.user_login || `user_${userId}`,
      account_id: traderApiData?.account?.account_id || challenge?.id || `${userId}`,
      plan_name: challenge?.plan_name || 'Standard Evaluation',
      phase: Number(challenge?.phase || 1),
      phase_label: challenge?.status === 'funded' ? 'Funded Live' : (challenge?.phase ? `Phase ${challenge.phase}` : (challenge?.status || 'Active')),
      status: apiUser?.status || (isBanned ? 'suspended' : (challenge?.status || 'active')),
      joined_date: apiUser?.registered ? new Date(apiUser.registered).toLocaleDateString() : 'Recent',
      balance: currentBal,
      equity: currentEq,
      starting_balance: startingBal,
      pnl: pnl,
      pnl_pct: pnlPct,
      daily_dd: challenge?.daily_drawdown_pct ? Number(challenge.daily_drawdown_pct) : 0,
      daily_dd_limit: dailyDD,
      max_dd: challenge?.max_drawdown_pct ? Number(challenge.max_drawdown_pct) : 0,
      max_dd_limit: maxDD,
      min_days: minDays,
      news_trading: newsTrading,
      weekend_holding: weekendHolding,
      win_rate: winRate,
      wins: wins,
      losses: losses,
      total_trades: totalTrades,
      risk_level: traderApiData?.breaches?.length ? 'High Risk' : 'Normal',
      profit_split: profitSplit,
      kyc_status: traderApiData?.kyc?.status || 'unverified',
      kyc_submitted: traderApiData?.kyc?.created_at ? new Date(traderApiData.kyc.created_at).toLocaleDateString() : 'N/A',
      kyc_reviewer: traderApiData?.kyc?.reviewed_at ? 'Compliance Team' : 'Pending Review',
      mt5_login: mt5Login,
      mt5_server: mt5Server,
      mt5_account_type: mt5AccountType,
    }
  }, [traderApiData, userId, isBanned])

  // Sync initial note and MT5 credentials from API
  useEffect(() => {
    if (traderApiData?.note && typeof traderApiData.note === 'string') {
      setNoteInput(traderApiData.note)
      setAdminNotesList([
        {
          id: 1,
          author: 'System Compliance Log',
          role: 'Audit Record',
          content: traderApiData.note,
          date: 'Active',
        }
      ])
    }
    const ch = traderApiData?.challenge || traderApiData?.challenges?.[0]
    const u = traderApiData?.user || traderApiData
    if (ch || u) {
      setMt5Form({
        login: String(ch?.mt5_login || u?.mt5_login || ''),
        password: '',
        server: String(ch?.mt5_server || u?.mt5_server || 'MetaQuotes-Demo'),
        account_type: String(ch?.mt5_account_type || u?.mt5_account_type || 'demo'),
      })
    }
  }, [traderApiData])

  // Handlers
  const handleSaveNote = async () => {
    if (!noteInput.trim()) {
      toast.error('Please enter note text before saving.')
      return
    }

    setIsSavingNote(true)
    try {
      const res = await api.admin.saveUserNote(userId, noteInput.trim())
      if (!res.ok) {
        toast.error(res.error || 'Failed to save note')
        return
      }
      const newEntry = {
        id: Date.now(),
        author: 'Current Administrator',
        role: 'Risk Audit',
        content: noteInput.trim(),
        date: new Date().toLocaleString(),
      }
      setAdminNotesList([newEntry, ...adminNotesList])
      toast.success('Private administrative note saved to compliance trail.')
      setNoteInput('')
    } catch (err: any) {
      toast.error(err.message || 'Failed to save note')
    } finally {
      setIsSavingNote(false)
    }
  }

  const handleSaveMt5 = async () => {
    if (!mt5Form.login.trim()) {
      toast.error('MT5 Account Login ID is required.')
      return
    }

    setIsSavingMt5(true)
    try {
      const res = await api.admin.saveUserMt5(userId, {
        mt5_login: mt5Form.login.trim(),
        mt5_password: mt5Form.password.trim() || undefined,
        mt5_server: mt5Form.server.trim(),
        mt5_account_type: mt5Form.account_type,
      })
      if (res.ok) {
        toast.success(`MT5 Account #${mt5Form.login.trim()} linked & credentials saved!`)
        refetch()
        queryClient.invalidateQueries({ queryKey: ['admin-traders-list'] })
      } else {
        toast.error(res.error || 'Failed to save MT5 details')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save MT5 credentials')
    } finally {
      setIsSavingMt5(false)
    }
  }

  useEffect(() => {
    if (traderApiData) {
      const accStatus = traderApiData.account?.status || traderApiData.account_status
      const userStatus = traderApiData.user?.status
      if (accStatus === 'banned' || accStatus === 'frozen' || userStatus === 'banned' || userStatus === 'suspended') {
        setIsBanned(true)
      } else {
        setIsBanned(false)
      }

      if (traderApiData.notes && Array.isArray(traderApiData.notes)) {
        setAdminNotesList(traderApiData.notes)
      } else if (traderApiData.note) {
        setAdminNotesList([{
          id: 1,
          author: 'System Admin',
          role: 'Compliance',
          content: traderApiData.note,
          date: 'Audit Record',
        }])
      }
    }
  }, [traderApiData])

  const handleToggleFreeze = async () => {
    const nextState = !isBanned
    setIsBanned(nextState)
    try {
      const res = await api.admin.setStatus(userId, nextState ? 'banned' : 'active')
      if (!res.ok || !res.data?.success) {
        setIsBanned(!nextState)
        toast.error((!res.ok ? res.error : res.data?.message) || 'Failed to update account status')
        return
      }
      if (nextState) {
        toast.error(`Account frozen: ${trader.name} suspended & MT5 access disabled.`)
      } else {
        toast.success(`Account unlocked: ${trader.name} restored to active live trading.`)
      }
      queryClient.invalidateQueries({ queryKey: ['admin-traders-list'] })
      queryClient.invalidateQueries({ queryKey: ['admin-trader-360', userId] })
    } catch (err: any) {
      setIsBanned(!nextState)
      toast.error(err.message || 'Failed to update account status')
    }
  }

  const handleImpersonate = async () => {
    if (!adminUser) {
      toast.error('Admin session not ready.')
      return
    }
    try {
      const res = await api.admin.impersonate(userId)
      if (!res.ok || !res.data.success) {
        toast.error((!res.ok ? res.error : res.data.message) || 'Impersonation failed')
        return
      }
      startImpersonation({
        admin_username: adminUser.username,
        admin_display_name: adminUser.display_name,
        target_user_id: userId,
        target_username: trader.name || trader.email,
        started_at: Date.now(),
      })
      setSession({ nonce: null, bearer: null })
      clearFxsimCache()
      toast.success(`Switching to view dashboard as ${trader.name}...`)
      window.location.href = '/dashboard'
    } catch (err: any) {
      toast.error(err.message || 'Impersonation failed')
    }
  }

  // Transactions DataTable definition
  interface TxHistoryRow {
    id: string
    type: string
    amount: number
    gateway: string
    status: string
    date: string
  }

  const txColumns: ColumnDef<TxHistoryRow>[] = [
    {
      key: 'id',
      header: 'Reference',
      render: (row) => (
        <span className="font-mono text-xs text-gray-300 bg-[#0B0F19] px-2 py-0.5 rounded border border-[#1F2937]">
          {row.id}
        </span>
      )
    },
    {
      key: 'type',
      header: 'Transaction Type',
      render: (row) => (
        <span className="text-xs text-gray-200 font-medium">
          {row.type}
        </span>
      )
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (row) => {
        const isPayout = row.type.includes('Payout') || row.type.includes('Withdrawal')
        return (
          <span className={`font-mono text-xs font-bold ${
            isPayout ? 'text-emerald-400' : 'text-gray-100'
          }`}>
            {formatExactCurrency(row.amount)}
          </span>
        )
      }
    },
    {
      key: 'gateway',
      header: 'Gateway',
      render: (row) => (
        <span className="text-xs text-gray-400 font-mono">
          {row.gateway}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (row) => (
        <Badge tone="success" size="sm">
          {row.status}
        </Badge>
      )
    },
    {
      key: 'date',
      header: 'Date',
      align: 'right',
      render: (row) => (
        <span className="text-xs text-gray-400 font-mono">
          {row.date}
        </span>
      )
    }
  ]

  const txData: TxHistoryRow[] = useMemo(() => {
    if (traderApiData?.payouts?.length || traderApiData?.payments?.length) {
      const rows: TxHistoryRow[] = []
      traderApiData.payouts?.forEach((p: any) => {
        rows.push({
          id: `#PAY-${p.id}`,
          type: 'Profit Split Withdrawal',
          amount: Number(p.trader_amount || p.amount_requested || 0),
          gateway: p.gateway || 'USDT / Crypto',
          status: p.status === 'approved' || p.status === 'paid' ? 'Completed' : p.status,
          date: p.requested_at ? new Date(p.requested_at).toLocaleDateString() : 'Recent',
        })
      })
      traderApiData.payments?.forEach((p: any) => {
        rows.push({
          id: `#ORD-${p.id}`,
          type: 'Challenge Purchase',
          amount: Number(p.amount || 0),
          gateway: p.gateway || 'Card',
          status: p.status === 'approved' ? 'Completed' : p.status,
          date: p.created_at ? new Date(p.created_at).toLocaleDateString() : 'Recent',
        })
      })
      return rows
    }
    return []
  }, [traderApiData])

  // Timeline events definition
  const timelineEvents = useMemo(() => {
    if (traderApiData?.timeline?.length) {
      return traderApiData.timeline.map((item: any) => {
        let icon = Activity
        let tone: 'success' | 'accent' | 'info' | 'neutral' = 'neutral'
        if (item.type === 'challenge') { icon = Target; tone = 'accent'; }
        else if (item.type === 'payment') { icon = CreditCard; tone = 'info'; }
        else if (item.type === 'payout') { icon = Wallet; tone = 'success'; }
        else if (item.type === 'kyc') { icon = ShieldCheck; tone = 'success'; }
        else if (item.type === 'breach') { icon = ShieldAlert; tone = 'info'; }
        else if (item.type === 'admin') { icon = Sliders; tone = 'info'; }

        return {
          title: item.label,
          description: item.type === 'breach' ? 'Risk rule violation registered' : 'Activity milestone',
          date: item.at ? new Date(item.at).toLocaleString() : 'Recent',
          icon,
          tone,
        }
      })
    }
    return []
  }, [traderApiData])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 text-emerald-400 animate-spin" />
        <p className="text-gray-400 font-mono text-sm animate-pulse">
          Loading 360 Trader Profile for #{userId}...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto">
      
      {/* ── 1. Trader Hero Header ─────────────────────────────────────────── */}
      <div className="space-y-4 border-b border-[#1F2937]/70 pb-6">
        
        {/* Navigation Link */}
        <Link 
          href="/admin/traders"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Traders Hub
        </Link>

        {/* Hero Banner Details */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          
          {/* Trader Identity Pill */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-2xl shrink-0 shadow-lg shadow-emerald-500/10">
              {trader.name.charAt(0).toUpperCase()}
            </div>
            
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
                  {trader.name}
                </h1>
                <Badge tone="accent" size="sm" className="font-mono">
                  #TRD-{trader.account_id}
                </Badge>
                {isBanned ? (
                  <Badge tone="danger" size="sm" pulsing>
                    Account Frozen
                  </Badge>
                ) : (
                  <Badge tone="success" size="sm" pulsing>
                    {trader.phase_label}
                  </Badge>
                )}
                {trader.mt5_login && (
                  <Badge tone="accent" size="sm" className="font-mono gap-1">
                    <Server className="h-3 w-3 text-cyan-400" />
                    MT5: {trader.mt5_login}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 font-mono">
                <span className="flex items-center gap-1.5 text-gray-300">
                  <Mail className="h-3.5 w-3.5 text-gray-500" />
                  {trader.email || 'No email registered'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-gray-500" />
                  Joined {trader.joined_date}
                </span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">
                  {trader.plan_name}
                </span>
              </div>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={Boolean(adminUser?.id && (adminUser.id === userId || adminUser.id === trader.user_id))}
              onClick={() => {
                if (adminUser?.id && (adminUser.id === userId || adminUser.id === trader.user_id)) {
                  toast.info('Cannot impersonate your own admin account.')
                  return
                }
                setImpersonateConfirmOpen(true)
              }}
              className="border-cyan-500/30 text-cyan-300 hover:text-white hover:bg-cyan-500/20 gap-2 h-9 disabled:opacity-40 disabled:cursor-not-allowed"
              title={adminUser?.id && (adminUser.id === userId || adminUser.id === trader.user_id) ? 'Cannot impersonate own admin account' : undefined}
            >
              <Eye className="h-3.5 w-3.5 text-cyan-400" />
              View as Trader
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setResetPasswordModalOpen(true)}
              className="border-amber-500/30 text-amber-300 hover:text-white hover:bg-amber-500/20 gap-2 h-9"
            >
              <KeyRound className="h-3.5 w-3.5 text-amber-400" />
              Direct Password Reset
            </Button>

            <Button
              variant={isBanned ? 'primary' : 'destructive'}
              size="sm"
              onClick={handleToggleFreeze}
              className="gap-2 h-9"
            >
              <Ban className="h-3.5 w-3.5" />
              {isBanned ? 'Unfreeze Account' : 'Freeze Account'}
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setOverrideModalOpen(true)}
              className="gap-2 h-9 shadow-emerald-500/20"
            >
              <Sliders className="h-4 w-4" />
              Apply Override
            </Button>
          </div>

        </div>
      </div>

      {/* ── 2. Performance & Financial Metrics Grid (8 KPI Cards) ─────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            Live Financial & Risk Metrics
          </h2>
          <span className="text-xs text-gray-500 font-mono">Real-time Account State</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Balance */}
          <Card className="bg-[#111827] border-[#1F2937]">
            <CardContent className="p-4">
              <span className="text-xs text-gray-400 font-medium">Current Balance</span>
              <div className="mt-2 text-xl sm:text-2xl font-bold font-mono text-white">
                {formatExactCurrency(trader.balance)}
              </div>
              <p className="text-[11px] text-gray-500 mt-1 font-mono">
                Start: {formatCurrency(trader.starting_balance)}
              </p>
            </CardContent>
          </Card>

          {/* Card 2: Equity */}
          <Card className="bg-[#111827] border-[#1F2937]">
            <CardContent className="p-4">
              <span className="text-xs text-gray-400 font-medium">Live Equity</span>
              <div className="mt-2 text-xl sm:text-2xl font-bold font-mono text-emerald-400 flex items-center gap-1.5">
                {formatExactCurrency(trader.equity)}
              </div>
              <p className="text-[11px] text-emerald-500/80 mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {trader.equity >= trader.balance ? '+' : ''}{formatExactCurrency(trader.equity - trader.balance)} Floating
              </p>
            </CardContent>
          </Card>

          {/* Card 3: Realised PnL */}
          <Card className="bg-[#111827] border-[#1F2937]">
            <CardContent className="p-4">
              <span className="text-xs text-gray-400 font-medium">Realised PnL ($)</span>
              <div className={`mt-2 text-xl sm:text-2xl font-bold font-mono ${trader.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {trader.pnl >= 0 ? '+' : ''}{formatExactCurrency(trader.pnl)}
              </div>
              <Badge tone={trader.pnl >= 0 ? 'success' : 'danger'} size="sm" className="mt-1 font-mono text-[10px]">
                {trader.pnl_pct >= 0 ? '+' : ''}{trader.pnl_pct.toFixed(2)}% Net Yield
              </Badge>
            </CardContent>
          </Card>

          {/* Card 4: Daily Drawdown */}
          <Card className="bg-[#111827] border-[#1F2937]">
            <CardContent className="p-4">
              <span className="text-xs text-gray-400 font-medium">Daily Drawdown</span>
              <div className="mt-2 text-xl sm:text-2xl font-bold font-mono text-gray-100">
                {trader.daily_dd.toFixed(1)}% <span className="text-xs text-gray-500">/ {trader.daily_dd_limit}% Max</span>
              </div>
              <Badge tone={trader.daily_dd > trader.daily_dd_limit * 0.8 ? 'danger' : 'accent'} size="sm" className="mt-1 font-mono text-[10px]">
                {Math.max(0, trader.daily_dd_limit - trader.daily_dd).toFixed(1)}% Headroom
              </Badge>
            </CardContent>
          </Card>

          {/* Card 5: Max Drawdown */}
          <Card className="bg-[#111827] border-[#1F2937]">
            <CardContent className="p-4">
              <span className="text-xs text-gray-400 font-medium">Total Trailing DD</span>
              <div className="mt-2 text-xl sm:text-2xl font-bold font-mono text-gray-100">
                {trader.max_dd.toFixed(1)}% <span className="text-xs text-gray-500">/ {trader.max_dd_limit}% Max</span>
              </div>
              <Badge tone={trader.max_dd > trader.max_dd_limit * 0.8 ? 'danger' : 'accent'} size="sm" className="mt-1 font-mono text-[10px]">
                {Math.max(0, trader.max_dd_limit - trader.max_dd).toFixed(1)}% Headroom
              </Badge>
            </CardContent>
          </Card>

          {/* Card 6: Win Rate */}
          <Card className="bg-[#111827] border-[#1F2937]">
            <CardContent className="p-4">
              <span className="text-xs text-gray-400 font-medium">Win Rate</span>
              <div className="mt-2 text-xl sm:text-2xl font-bold font-mono text-emerald-400">
                {trader.win_rate}%
              </div>
              <p className="text-[11px] text-gray-500 mt-1 font-mono">
                {trader.wins} Wins • {trader.losses} Losses
              </p>
            </CardContent>
          </Card>

          {/* Card 7: Total Trades */}
          <Card className="bg-[#111827] border-[#1F2937]">
            <CardContent className="p-4">
              <span className="text-xs text-gray-400 font-medium">Total Executions</span>
              <div className="mt-2 text-xl sm:text-2xl font-bold font-mono text-gray-100">
                {trader.total_trades} Trades
              </div>
              <p className="text-[11px] text-gray-500 mt-1 font-mono">
                Closed positions history
              </p>
            </CardContent>
          </Card>

          {/* Card 8: Risk Rating */}
          <Card className="bg-[#111827] border-[#1F2937]">
            <CardContent className="p-4">
              <span className="text-xs text-gray-400 font-medium">Calculated Risk Level</span>
              <div className="mt-2 flex items-center gap-2">
                <Badge tone={trader.risk_level === 'High Risk' ? 'danger' : 'success'} size="md" pulsing className="font-mono text-xs px-2.5 py-1">
                  {trader.risk_level}
                </Badge>
              </div>
              <p className="text-[11px] text-gray-500 mt-1 font-mono">
                {traderApiData?.breaches?.length ? 'Infractions logged' : 'Compliant profile'}
              </p>
            </CardContent>
          </Card>

        </div>
      </section>

      {/* ── 3. Detailed Sections (2-Column Grid) ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: MT5 Connection, Challenge Progression & Tx History */}
        <div className="lg:col-span-2 space-y-6">

          {/* ── MT5 BROKER TELEMETRY & ACCOUNT BRIDGE CARD ────────────────────── */}
          <Card className="bg-[#111827] border-cyan-500/30 shadow-lg shadow-cyan-950/20">
            <CardHeader className="border-b border-cyan-500/20 pb-4 bg-gradient-to-r from-cyan-950/30 via-transparent to-transparent">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-base text-gray-100 flex items-center gap-2">
                    <Server className="h-5 w-5 text-cyan-400" />
                    <span>MetaTrader 5 Account & Telemetry Bridge</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-400">
                    Assign and bind MT5 broker credentials so the local Python Sync Daemon streams live equity and closed deals to this trader.
                  </CardDescription>
                </div>
                {trader.mt5_login ? (
                  <Badge tone="success" size="sm" className="font-mono gap-1.5 self-start sm:self-center">
                    <Radio className="h-3 w-3 animate-ping text-emerald-400" />
                    Bridge Bound: #{trader.mt5_login}
                  </Badge>
                ) : (
                  <Badge tone="neutral" size="sm" className="font-mono self-start sm:self-center">
                    Unlinked / Standalone
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* MT5 Login */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5 text-cyan-400" />
                    MT5 Account Number / Login ID
                  </Label>
                  <Input
                    placeholder="e.g. 10048291"
                    value={mt5Form.login}
                    onChange={(e) => setMt5Form({ ...mt5Form, login: e.target.value })}
                    className="bg-[#0B0F19] border-[#1F2937] font-mono text-sm text-cyan-300"
                  />
                  <span className="text-[10px] text-gray-500">Your broker demo or live login ID</span>
                </div>

                {/* MT5 Server */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Server className="h-3.5 w-3.5 text-cyan-400" />
                    Broker Server Name
                  </Label>
                  <Input
                    placeholder="e.g. MetaQuotes-Demo or Exness-Trial"
                    value={mt5Form.server}
                    onChange={(e) => setMt5Form({ ...mt5Form, server: e.target.value })}
                    className="bg-[#0B0F19] border-[#1F2937] font-mono text-sm text-slate-200"
                  />
                  <span className="text-[10px] text-gray-500">Exact MT5 broker server name</span>
                </div>

                {/* MT5 Password */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-cyan-400" />
                    MT5 Master Password
                  </Label>
                  <div className="relative">
                    <Input
                      type={showMt5Password ? 'text' : 'password'}
                      placeholder={trader.mt5_login ? '•••••••• (Leave blank to keep unchanged)' : 'Enter broker trader password'}
                      value={mt5Form.password}
                      onChange={(e) => setMt5Form({ ...mt5Form, password: e.target.value })}
                      className="bg-[#0B0F19] border-[#1F2937] font-mono text-sm text-slate-200 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowMt5Password(!showMt5Password)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showMt5Password ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-gray-500">Used by Python sync daemon to authenticate</span>
                </div>

                {/* Account Environment */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-cyan-400" />
                    Account Type / Environment
                  </Label>
                  <select
                    value={mt5Form.account_type}
                    onChange={(e) => setMt5Form({ ...mt5Form, account_type: e.target.value })}
                    className="w-full h-10 rounded-lg border border-[#1F2937] bg-[#0B0F19] px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="demo">Demo / Evaluation Simulation</option>
                    <option value="real">Real / Funded Live Broker</option>
                  </select>
                  <span className="text-[10px] text-gray-500">Demo accounts run through simulated risk rules</span>
                </div>

              </div>

              {/* Sync Daemon Status Box */}
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/10 p-3.5 flex items-start justify-between gap-4">
                <div className="flex items-start gap-2.5">
                  <Terminal className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-cyan-300 font-mono">
                      Telemetry Ingestion Endpoint: POST /wp-json/fxsim/v1/mt5/sync
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Run <code className="text-cyan-300 bg-black/40 px-1 py-0.5 rounded font-mono">python mt5-account-syncer.py</code> on your local PC or VPS to stream real-time broker ticks and trades.
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleSaveMt5}
                  disabled={isSavingMt5}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white gap-1.5 shrink-0 shadow-cyan-500/20 font-semibold"
                >
                  {isSavingMt5 ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save MT5 Credentials
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Active Challenge Parameters & Progress Bars */}
          <Card className="bg-[#111827] border-[#1F2937]">
            <CardHeader className="border-b border-[#1F2937]/60 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base text-gray-100 flex items-center gap-2">
                    <Target className="h-4 w-4 text-emerald-400" />
                    Account Progression & Rule Guardrails
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-400">
                    Live target attainment, drawdown limits, and trading days tracking
                  </CardDescription>
                </div>
                <Badge tone="accent" size="sm" className="font-mono self-start sm:self-center">
                  Profit Split: {trader.profit_split}%
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              
              {/* Progress 1: Profit Target */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-gray-200">Profit Target Progress</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {formatExactCurrency(trader.pnl)} ({trader.pnl_pct.toFixed(2)}%)
                  </span>
                </div>
                <Progress value={Math.min(100, Math.max(0, trader.pnl_pct * 10))} tone="success" className="h-2.5" />
                <p className="text-[11px] text-gray-500 flex justify-between">
                  <span>Starting Balance: {formatCurrency(trader.starting_balance)}</span>
                  <span className="text-emerald-400 font-medium">Target: +8.0% ($8,000.00)</span>
                </p>
              </div>

              {/* Progress 2: Daily Drawdown Limit */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-gray-200">Daily Drawdown Ceiling (Max {trader.daily_dd_limit}%)</span>
                  <span className="font-mono font-semibold text-gray-300">
                    {trader.daily_dd.toFixed(1)}% used • {Math.max(0, trader.daily_dd_limit - trader.daily_dd).toFixed(1)}% remaining
                  </span>
                </div>
                <Progress value={(trader.daily_dd / trader.daily_dd_limit) * 100} tone="accent" className="h-2.5" />
              </div>

              {/* Progress 3: Total Trailing Drawdown */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-gray-200">Max Trailing Drawdown (Max {trader.max_dd_limit}%)</span>
                  <span className="font-mono font-semibold text-gray-300">
                    {trader.max_dd.toFixed(1)}% used • {Math.max(0, trader.max_dd_limit - trader.max_dd).toFixed(1)}% remaining
                  </span>
                </div>
                <Progress value={(trader.max_dd / trader.max_dd_limit) * 100} tone="accent" className="h-2.5" />
              </div>

            </CardContent>
          </Card>

          {/* KYC Document Verification Status */}
          <Card className="bg-[#111827] border-[#1F2937]">
            <CardHeader className="border-b border-[#1F2937]/60 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base text-gray-100 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  KYC & Identity Verification
                </CardTitle>
                <CardDescription className="text-xs text-gray-400">
                  Status of identity documentation
                </CardDescription>
              </div>
              <div className="flex items-center gap-2.5">
                <Badge tone={trader.kyc_status === 'verified' ? 'success' : trader.kyc_status === 'pending' ? 'warning' : 'neutral'} size="sm">
                  {trader.kyc_status === 'verified' ? 'Verified' : trader.kyc_status === 'pending' ? 'Pending Review' : 'Unverified'}
                </Badge>
                <Button size="sm" asChild variant="outline" className="border-[#1F2937] text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 gap-1.5 h-7 text-xs">
                  <Link href="/admin/kyc">
                    <ExternalLink className="h-3 w-3" />
                    Review in KYC Hub
                  </Link>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg border border-[#1F2937] bg-[#0B0F19] flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                    <Check className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-200">Government ID</p>
                    <p className="text-[11px] text-gray-500">{trader.kyc_status === 'verified' ? 'Approved' : 'Pending'}</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-[#1F2937] bg-[#0B0F19] flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                    <Check className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-200">Proof of Address</p>
                    <p className="text-[11px] text-gray-500">{trader.kyc_status === 'verified' ? 'Approved' : 'Pending'}</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-[#1F2937] bg-[#0B0F19] flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                    <Check className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-200">Review Status</p>
                    <p className="text-[11px] text-gray-500">{trader.kyc_reviewer}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment & Payout History Table */}
          <Card className="bg-[#111827] border-[#1F2937]">
            <CardHeader className="border-b border-[#1F2937]/60 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base text-gray-100 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-emerald-400" />
                  Financial History ({txData.length})
                </CardTitle>
                <CardDescription className="text-xs text-gray-400">
                  Challenge purchases, fee settlements, and profit split payouts
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <DataTable<TxHistoryRow>
                columns={txColumns}
                data={txData}
                emptyMessage="No payments or payout records found for this account."
                className="border-0 rounded-none bg-transparent"
              />
            </CardContent>
          </Card>

          {/* Hard Breach Violations (if any) */}
          {traderApiData?.breaches && traderApiData.breaches.length > 0 && (
            <Card className="bg-[#111827] border-red-500/30">
              <CardHeader className="border-b border-red-500/20 pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base text-red-400 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    Breach Audit Trail ({traderApiData.breaches.length})
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-400">
                    Hard risk violations and auto-liquidation records
                  </CardDescription>
                </div>
                <Badge tone="danger" size="sm">
                  Violations Logged
                </Badge>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {traderApiData.breaches.map((b: any, idx: number) => (
                    <div key={idx} className="p-3 bg-[#0B0F19] rounded-xl border border-red-500/20 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-red-400 uppercase tracking-wide font-mono">{b.rule_type || b.reason}</span>
                          <span className="text-[10px] text-gray-500 font-mono">Challenge #{b.challenge_id}</span>
                        </div>
                        <p className="text-xs text-gray-300 mt-0.5">{b.description || 'Threshold breached'}</p>
                      </div>
                      <span className="text-[10px] text-gray-500 font-mono">{b.created_at ? new Date(b.created_at).toLocaleString() : 'Recent'}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        </div>

        {/* Right Column: Private Admin Notes & Activity Timeline */}
        <div className="space-y-6">
          
          {/* Private Administrative Notes */}
          <Card className="bg-[#111827] border-[#1F2937] flex flex-col">
            <CardHeader className="border-b border-[#1F2937]/60 pb-3">
              <CardTitle className="text-base text-gray-100 flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-400" />
                Private Admin Notes
              </CardTitle>
              <CardDescription className="text-xs text-gray-400">
                Internal compliance logs (hidden from trader)
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              
              {/* Note Input Box */}
              <div className="space-y-2">
                <Textarea
                  rows={3}
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Add internal audit note, compliance remarks, or override rationale..."
                  className="text-xs"
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleSaveNote}
                    loading={isSavingNote}
                    className="gap-1.5 text-xs h-8 shadow-emerald-500/20"
                  >
                    <Send className="h-3 w-3" />
                    Save Note
                  </Button>
                </div>
              </div>

              {/* Note History */}
              <div className="space-y-3 pt-2 border-t border-[#1F2937]/60">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                  Audit History ({adminNotesList.length})
                </span>
                
                {adminNotesList.length === 0 ? (
                  <p className="text-xs text-gray-500 italic py-2">No administrative notes recorded yet.</p>
                ) : (
                  <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                    {adminNotesList.map((note) => (
                      <div 
                        key={note.id}
                        className="p-3 rounded-lg border border-[#1F2937] bg-[#0B0F19] space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-emerald-400">{note.author}</span>
                          <span className="text-[10px] text-gray-500 font-mono">{note.date}</span>
                        </div>
                        <p className="text-xs text-gray-300 leading-relaxed">{note.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </CardContent>
          </Card>

          {/* Activity Audit Timeline */}
          <Card className="bg-[#111827] border-[#1F2937]">
            <CardHeader className="border-b border-[#1F2937]/60 pb-3">
              <CardTitle className="text-base text-gray-100 flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-400" />
                Account Audit Timeline
              </CardTitle>
              <CardDescription className="text-xs text-gray-400">
                Chronological system & trading milestones
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5">
              {timelineEvents.length === 0 ? (
                <p className="text-xs text-gray-500 italic">No milestone events recorded yet.</p>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-[#1F2937]">
                  {timelineEvents.map((event: any, idx: number) => {
                    const Icon = event.icon
                    return (
                      <div key={idx} className="relative">
                        {/* Timeline node icon */}
                        <div className={`absolute -left-[30px] top-0 h-6 w-6 rounded-full border flex items-center justify-center ${
                          event.tone === 'success' 
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                            : event.tone === 'accent'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : event.tone === 'info'
                            ? 'bg-blue-500/10 border-blue-500/40 text-blue-400'
                            : 'bg-[#111827] border-slate-700 text-gray-400'
                        }`}>
                          <Icon className="h-3 w-3" />
                        </div>

                        {/* Timeline event content */}
                        <div>
                          <p className="text-xs font-semibold text-gray-100">{event.title}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{event.description}</p>
                          <span className="text-[10px] text-gray-500 font-mono mt-1 block">
                            {event.date}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

        </div>

      </div>

      {/* ── 4. Enterprise Overrides Modal Integration ─────────────────────── */}
      <EnterpriseOverrideModal
        isOpen={overrideModalOpen}
        onClose={() => setOverrideModalOpen(false)}
        trader={{
          id: trader.id,
          user_id: trader.user_id,
          name: trader.name,
          username: trader.username,
          account_id: trader.account_id,
          plan_name: trader.plan_name,
          profit_split: trader.profit_split,
          max_daily_loss: trader.daily_dd_limit,
          max_total_loss: trader.max_dd_limit,
          min_days: trader.min_days,
          news_trading: trader.news_trading,
          weekend_holding: trader.weekend_holding,
        }}
        onSuccess={() => {
          refetch()
        }}
      />

      {/* ── 5. Direct Password Reset Modal ────────────────────────────────── */}
      <DirectPasswordResetModal
        isOpen={resetPasswordModalOpen}
        onClose={() => setResetPasswordModalOpen(false)}
        trader={{
          user_id: trader.user_id,
          name: trader.name,
          username: trader.username,
          email: trader.email,
        }}
        onSuccess={() => {
          refetch()
        }}
      />

      {/* ── 6. Impersonate Confirmation Dialog ──────────────────────────────── */}
      <ConfirmDialog
        isOpen={impersonateConfirmOpen}
        onCancel={() => setImpersonateConfirmOpen(false)}
        onConfirm={async () => {
          setIsImpersonating(true)
          setImpersonateConfirmOpen(false)
          await handleImpersonate()
          setIsImpersonating(false)
        }}
        title={`View Dashboard as ${trader.name}?`}
        description={`You are about to launch a read-only trader session for ${trader.name} (${trader.email}). You will be redirected to the trader dashboard to inspect account metrics and trading history.`}
        confirmText={isImpersonating ? 'Starting Session...' : 'Start Trader Session'}
        cancelText="Cancel"
      />

    </div>
  )
}
