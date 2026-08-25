'use client'

import * as React from 'react'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { 
  Search, Filter, Download, MoreVertical, Shield, User, 
  ExternalLink, Sliders, KeyRound, Ban, CheckCircle2, 
  Clock, AlertTriangle, RefreshCw, Plus, ArrowUpRight,
  TrendingUp, TrendingDown, DollarSign, Eye, UserCheck, Wallet
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/store/auth'
import { useImpersonation } from '@/store/impersonation'
import { setSession, clearFxsimCache } from '@/lib/fxsim'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { DataTable, ColumnDef } from '@/components/ui/DataTable'
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuLabel 
} from '@/components/ui/dropdown-menu'
import { EnterpriseOverrideModal, TraderOverrideTarget } from '@/components/admin/EnterpriseOverrideModal'
import { DirectPasswordResetModal, DirectPasswordResetTarget } from '@/components/admin/DirectPasswordResetModal'
import { Mt5UnassignedBanner } from '@/components/admin/mt5-unassigned-banner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { toast } from 'sonner'

// Helper currency & number formatters
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

export interface TraderRowItem {
  id: number
  user_id: number
  name: string
  username: string
  user_login?: string
  email: string
  user_email?: string
  account_id: number | string
  plan_name: string
  phase: number
  phase_name?: string
  status: 'active' | 'passed' | 'failed' | 'funded' | 'violated' | 'banned' | string
  balance: number
  equity: number
  starting_balance: number
  kyc_status: 'verified' | 'pending' | 'unverified'
  created_at: string
  profit_split?: number
  max_daily_loss?: number
  max_total_loss?: number
  min_days?: number
  news_trading?: boolean
  weekend_holding?: boolean
}

export default function TradersHubPage() {
  const queryClient = useQueryClient()
  const adminUser = useAuth((s) => s.user)
  const startImpersonation = useImpersonation((s) => s.start)

  // Filter & Pagination States
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [kycFilter, setKycFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  // Enterprise Override Modal State
  const [selectedTrader, setSelectedTrader] = useState<TraderOverrideTarget | null>(null)
  const [overrideModalOpen, setOverrideModalOpen] = useState(false)

  // Direct Password Reset Modal State
  const [resetPasswordTarget, setResetPasswordTarget] = useState<DirectPasswordResetTarget | null>(null)
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false)

  // Impersonate Confirmation State
  const [impersonateTarget, setImpersonateTarget] = useState<TraderRowItem | null>(null)
  const [isImpersonating, setIsImpersonating] = useState(false)

  // Balance Adjustment State (ported from the retired /dashboard/admin/users page)
  const [balanceTarget, setBalanceTarget] = useState<TraderRowItem | null>(null)

  const handleImpersonate = async (trader: TraderRowItem) => {
    if (!adminUser) {
      toast.error('Admin session not ready.')
      return
    }
    try {
      const res = await api.admin.impersonate(trader.user_id)
      if (!res.ok || !res.data.success) {
        toast.error((!res.ok ? res.error : res.data.message) || 'Impersonation failed')
        return
      }
      startImpersonation({
        admin_username: adminUser.username,
        admin_display_name: adminUser.display_name,
        target_user_id: trader.user_id,
        target_username: trader.username || trader.email,
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

  // API Queries
  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['admin-users-list', searchTerm, page, pageSize],
    queryFn: () => api.admin.users(searchTerm, page, pageSize).then(res => res.ok ? res.data : null),
    staleTime: 10000,
  })

  // User IDs for the active page to scope challenge fetching
  const userIds = useMemo(() => {
    const raw = usersData?.data || []
    return raw.map(u => Number(u.user_id)).filter(Boolean)
  }, [usersData?.data])

  const { data: challengesData } = useQuery({
    queryKey: ['admin-challenges-list', userIds],
    queryFn: () => {
      if (userIds.length === 0) return Promise.resolve([])
      return api.admin.challenges({ user_ids: userIds.join(',') }).then(res => res.ok ? res.data.challenges : [])
    },
    enabled: userIds.length > 0 || !usersLoading,
    staleTime: 10000,
  })

  // Normalize authentic API data — show all registered users, linking their challenges if present
  const allTraders: TraderRowItem[] = useMemo(() => {
    const rawUsers = usersData?.data || []
    const rawChallenges = Array.isArray(challengesData) ? challengesData : []

    if (rawUsers.length === 0 && rawChallenges.length === 0) return []

    // Index challenges by user_id
    const challengesByUser = new Map<number, any[]>()
    for (const c of rawChallenges) {
      const uid = Number(c.user_id || c.id)
      if (!challengesByUser.has(uid)) challengesByUser.set(uid, [])
      challengesByUser.get(uid)!.push(c)
    }

    const rows: TraderRowItem[] = []

    // 1. Process all registered users from database
    for (const u of rawUsers) {
      const uid = Number(u.user_id)
      const userChallenges = challengesByUser.get(uid) || []

      if (userChallenges.length > 0) {
        for (const c of userChallenges) {
          const startingBal = Number(c.starting_balance || 100000)
          const currentBal = Number(c.current_balance || c.balance || startingBal)
          const currentEq = Number(c.equity || currentBal)
          const phaseNum = Number(c.phase || 1)
          const isFunded = c.status === 'funded' || phaseNum === 3

          const isAccountBanned = u.status === 'banned' || u.status === 'suspended' || c.status === 'banned' || (c as any).account_status === 'banned'
          const isAccountFrozen = u.status === 'frozen' || c.status === 'frozen' || (c as any).account_status === 'frozen'
          const rowStatus = isAccountBanned ? 'banned' : (isAccountFrozen ? 'frozen' : (c.status || (isFunded ? 'funded' : 'active')))

          rows.push({
            id: Number(c.id),
            user_id: uid,
            name: u.user_login || c.username || `Trader #${uid}`,
            username: u.user_login || c.username || `trader_${uid}`,
            email: u.user_email || c.user_email || `trader_${uid}@propfirm.com`,
            account_id: c.account_id ? String(c.account_id) : String(c.id),
            plan_name: c.plan_name || '$100K Stellar 2-Step',
            phase: phaseNum,
            phase_name: isFunded ? 'Funded Pro' : `Phase ${phaseNum}`,
            status: rowStatus,
            balance: currentBal,
            equity: currentEq,
            starting_balance: startingBal,
            kyc_status: (c.kyc_status || u.kyc_status || 'unverified') as any,
            created_at: c.created_at || u.user_registered || new Date().toISOString(),
            profit_split: Number(c.custom_profit_split || c.funded_profit_split || 80),
            max_daily_loss: Number(c.custom_daily_dd || c.max_daily_loss_pct || 5),
            max_total_loss: Number(c.custom_max_dd || c.max_total_loss_pct || 10),
            min_days: Number(c.custom_min_days || c.min_trading_days || 5),
            news_trading: c.custom_news_trading !== undefined && c.custom_news_trading !== null ? Boolean(Number(c.custom_news_trading)) : Boolean(c.news_trading ?? true),
            weekend_holding: c.custom_weekend_holding !== undefined && c.custom_weekend_holding !== null ? Boolean(Number(c.custom_weekend_holding)) : Boolean(c.weekend_holding ?? false),
          })
        }
      } else {
        // Registered user who hasn't bought/started a challenge yet
        const startingBal = Number(u.starting_balance || 0)
        const currentBal = Number(u.balance || 0)
        const currentEq = Number(u.equity || 0)

        rows.push({
          id: uid,
          user_id: uid,
          name: u.user_login || `Trader #${uid}`,
          username: u.user_login || `trader_${uid}`,
          email: u.user_email || `trader_${uid}@example.com`,
          account_id: u.account_id ? String(u.account_id) : String(uid),
          plan_name: u.plan_name || 'No Active Challenge',
          phase: 0,
          phase_name: 'Registered',
          status: u.status === 'banned' ? 'banned' : (u.status === 'no_account' ? 'registered' : (u.status || 'active')),
          balance: currentBal,
          equity: currentEq,
          starting_balance: startingBal,
          kyc_status: (u.kyc_status || 'unverified') as any,
          created_at: u.user_registered || new Date().toISOString(),
          profit_split: 80,
          max_daily_loss: 5,
          max_total_loss: 10,
          min_days: 5,
          news_trading: true,
          weekend_holding: false,
        })
      }
    }

    return rows
  }, [usersData, challengesData])

  // Filtered dataset
  const filteredTraders = useMemo(() => {
    return allTraders.filter((trader) => {
      // 1. Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim()
        const matchesName = trader.name.toLowerCase().includes(query)
        const matchesEmail = trader.email.toLowerCase().includes(query)
        const matchesAccount = String(trader.account_id).toLowerCase().includes(query)
        if (!matchesName && !matchesEmail && !matchesAccount) return false
      }

      // 2. Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'phase1' && (trader.phase !== 1 || trader.status === 'violated' || trader.status === 'banned')) return false
        if (statusFilter === 'phase2' && (trader.phase !== 2 || trader.status === 'violated' || trader.status === 'banned')) return false
        if (statusFilter === 'funded' && trader.status !== 'funded' && trader.phase !== 3) return false
        if (statusFilter === 'violated' && trader.status !== 'violated' && trader.status !== 'failed') return false
        if (statusFilter === 'banned' && trader.status !== 'banned' && trader.status !== 'suspended') return false
        if (statusFilter === 'registered' && trader.phase !== 0 && trader.status !== 'registered') return false
      }

      // 3. KYC Status filter
      if (kycFilter !== 'all') {
        if (trader.kyc_status !== kycFilter) return false
      }

      return true
    })
  }, [allTraders, searchTerm, statusFilter, kycFilter])

  // Handlers for action dropdown
  const handleResetPassword = (trader: TraderRowItem) => {
    setResetPasswordTarget({
      user_id: trader.user_id,
      name: trader.name,
      username: trader.username,
      email: trader.email,
    })
    setResetPasswordModalOpen(true)
  }

  const handleToggleBan = async (trader: TraderRowItem) => {
    const isCurrentlyBanned = trader.status === 'banned' || trader.status === 'suspended'
    const newStatus = isCurrentlyBanned ? 'active' : 'banned'

    try {
      const res = await api.admin.setStatus(trader.user_id, newStatus)
      if (!res.ok || !res.data.success) {
        toast.error((!res.ok ? res.error : res.data.message) || 'Failed to update account status')
        return
      }
      toast.success(isCurrentlyBanned ? `Account unblocked: ${trader.name} restored to active trading.` : `Account locked: ${trader.name} suspended & trading access frozen.`)
      refetchUsers()
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    } catch (err: any) {
      toast.error(err.message || 'Failed to update account status')
    }
  }

  // Export CSV Handler
  const handleExportCSV = () => {
    if (filteredTraders.length === 0) {
      toast.error('No trader records found to export.')
      return
    }

    const headers = [
      'Trader ID',
      'Name',
      'Email',
      'Account ID',
      'Plan Name',
      'Phase',
      'Status',
      'Balance ($)',
      'Equity ($)',
      'KYC Status',
      'Profit Split (%)',
      'Registered Date',
    ]

    const rows = filteredTraders.map((t) => [
      t.user_id,
      `"${t.name.replace(/"/g, '""')}"`,
      `"${t.email}"`,
      `"#TRD-${t.account_id}"`,
      `"${t.plan_name}"`,
      t.phase_name || `Phase ${t.phase}`,
      t.status,
      t.balance.toFixed(2),
      t.equity.toFixed(2),
      t.kyc_status,
      t.profit_split ?? 80,
      `"${new Date(t.created_at).toLocaleDateString()}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `propfirm_traders_export_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success(`Exported ${filteredTraders.length} trader records to CSV`)
  }

  // DataTable Column Definitions
  const columns: ColumnDef<TraderRowItem>[] = [
    {
      key: 'trader',
      header: 'Trader',
      render: (row) => {
        const initial = (row.name || 'T').charAt(0).toUpperCase()
        return (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
              {initial}
            </div>
            <div className="min-w-0">
              <Link 
                href={`/admin/traders/${row.user_id}`}
                className="font-semibold text-gray-100 hover:text-emerald-400 transition-colors text-sm truncate block"
              >
                {row.name}
              </Link>
              <p className="text-xs text-gray-500 truncate font-mono">{row.email}</p>
            </div>
          </div>
        )
      }
    },
    {
      key: 'account_id',
      header: 'Account ID',
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-gray-300 bg-[#0B0F19] px-2.5 py-1 rounded-md border border-[#1F2937]">
          #TRD-{row.account_id}
        </span>
      )
    },
    {
      key: 'plan_phase',
      header: 'Plan & Phase',
      render: (row) => {
        const isFunded = row.status === 'funded' || row.phase === 3
        const isViolated = row.status === 'violated' || row.status === 'failed'
        const isBanned = row.status === 'banned' || row.status === 'suspended'
        const isPhase2 = row.phase === 2
        const isRegisteredOnly = row.phase === 0 || row.status === 'registered' || row.status === 'no_account'

        return (
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-200">{row.plan_name}</p>
            <div>
              {isBanned ? (
                <Badge tone="danger" size="sm">Banned</Badge>
              ) : isViolated ? (
                <Badge tone="danger" size="sm">Violated</Badge>
              ) : isFunded ? (
                <Badge tone="success" size="sm" pulsing>Funded Live</Badge>
              ) : isPhase2 ? (
                <Badge tone="info" size="sm">Phase 2 Verification</Badge>
              ) : isRegisteredOnly ? (
                <Badge tone="neutral" size="sm">Registered</Badge>
              ) : (
                <Badge tone="accent" size="sm" pulsing>Phase 1 Evaluation</Badge>
              )}
            </div>
          </div>
        )
      }
    },
    {
      key: 'balance_equity',
      header: 'Balance / Equity',
      align: 'right',
      render: (row) => {
        if (row.starting_balance === 0 && row.balance === 0) {
          return <span className="text-xs text-gray-500 font-mono">—</span>
        }
        const pnl = row.equity - row.starting_balance
        const isProfit = pnl >= 0
        return (
          <div className="text-right font-mono space-y-0.5">
            <div className="text-sm font-bold text-gray-100">
              {formatExactMoney(row.balance)}
            </div>
            <div className={`text-xs flex items-center justify-end gap-1 ${
              isProfit ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {isProfit ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span>{formatExactMoney(row.equity)} Eq</span>
            </div>
          </div>
        )
      }
    },
    {
      key: 'kyc_status',
      header: 'KYC Status',
      align: 'center',
      render: (row) => {
        if (row.kyc_status === 'verified') {
          return <Badge tone="success" size="sm">Verified</Badge>
        }
        if (row.kyc_status === 'pending') {
          return (
            <Link href="/admin/kyc" title="Click to open in KYC Review Hub">
              <Badge tone="warning" size="sm" pulsing className="cursor-pointer hover:opacity-80">
                Pending Review →
              </Badge>
            </Link>
          )
        }
        return <Badge tone="neutral" size="sm">Unverified</Badge>
      }
    },
    {
      key: 'joined_date',
      header: 'Joined Date',
      align: 'right',
      render: (row) => (
        <span className="text-xs text-gray-400 font-mono">
          {new Date(row.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })}
        </span>
      )
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => {
        const isBanned = row.status === 'banned' || row.status === 'suspended'
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-slate-800"
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Trader Actions</DropdownMenuLabel>
              
              <Link href={`/admin/traders/${row.user_id}`}>
                <DropdownMenuItem className="gap-2.5">
                  <ExternalLink className="h-4 w-4 text-emerald-400" />
                  View 360 Profile
                </DropdownMenuItem>
              </Link>

              <Link href="/admin/kyc">
                <DropdownMenuItem className="gap-2.5">
                  <UserCheck className="h-4 w-4 text-purple-400" />
                  Review KYC Hub
                </DropdownMenuItem>
              </Link>

              <DropdownMenuItem 
                className="gap-2.5"
                disabled={row.user_id === adminUser?.id || row.id === adminUser?.id}
                onClick={() => {
                  if (row.user_id === adminUser?.id || row.id === adminUser?.id) {
                    toast.info('Cannot impersonate your own admin account.')
                    return
                  }
                  setImpersonateTarget(row)
                }}
              >
                <Eye className="h-4 w-4 text-cyan-400" />
                View As Trader
              </DropdownMenuItem>

              <DropdownMenuItem 
                className="gap-2.5"
                onClick={() => {
                  setSelectedTrader(row)
                  setOverrideModalOpen(true)
                }}
              >
                <Sliders className="h-4 w-4 text-blue-400" />
                Apply Custom Overrides
              </DropdownMenuItem>

              <DropdownMenuItem
                className="gap-2.5"
                onClick={() => setBalanceTarget(row)}
              >
                <Wallet className="h-4 w-4 text-emerald-400" />
                Adjust Balance
              </DropdownMenuItem>

              <DropdownMenuItem 
                className="gap-2.5"
                onClick={() => handleResetPassword(row)}
              >
                <KeyRound className="h-4 w-4 text-amber-400" />
                Reset MT5 Password
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem 
                danger 
                className="gap-2.5"
                onClick={() => handleToggleBan(row)}
              >
                <Ban className="h-4 w-4" />
                {isBanned ? 'Unfreeze Account' : 'Ban / Freeze Account'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      }
    }
  ]

  return (
    <div className="space-y-6 pb-12">

      <Mt5UnassignedBanner />

      {/* ── Top Bar Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1F2937]/70 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Traders Management
            </h1>
            <Badge tone="accent" size="sm" className="font-mono">
              {allTraders.length} Active Accounts
            </Badge>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Directory of registered prop traders, challenge progression, KYC verification, and custom risk overrides.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportCSV}
            className="border-[#1F2937] text-gray-300 hover:text-white hover:bg-slate-800/80 gap-2 h-9"
          >
            <Download className="h-4 w-4 text-emerald-400" />
            Export CSV
          </Button>

          <Button 
            variant="primary" 
            size="sm" 
            className="gap-2 h-9 shadow-emerald-500/20"
            onClick={() => {
              if (filteredTraders.length > 0) {
                setSelectedTrader(filteredTraders[0])
                setOverrideModalOpen(true)
              } else {
                toast.info('Select a trader to apply overrides')
              }
            }}
          >
            <Sliders className="h-4 w-4" />
            Apply Overrides
          </Button>
        </div>
      </div>

      {/* ── Filter Bar Card ───────────────────────────────────────────────── */}
      <Card className="bg-[#111827] border-[#1F2937]">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search by trader name, email, or #TRD-88219..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#0B0F19] border-[#1F2937] text-sm"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-300"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              
              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-400">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-10 rounded-lg border border-[#1F2937] bg-[#0B0F19] px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="phase1">Phase 1 Evaluation</option>
                  <option value="phase2">Phase 2 Verification</option>
                  <option value="funded">Funded Live</option>
                  <option value="violated">Violated / Breached</option>
                  <option value="banned">Banned / Suspended</option>
                </select>
              </div>

              {/* KYC Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-400">KYC:</span>
                <select
                  value={kycFilter}
                  onChange={(e) => setKycFilter(e.target.value)}
                  className="h-10 rounded-lg border border-[#1F2937] bg-[#0B0F19] px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="all">All KYC</option>
                  <option value="verified">Verified</option>
                  <option value="pending">Pending Review</option>
                  <option value="unverified">Unverified</option>
                </select>
              </div>

              {/* Reset Filters */}
              {(searchTerm || statusFilter !== 'all' || kycFilter !== 'all') && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter('all')
                    setKycFilter('all')
                  }}
                  className="text-xs text-gray-400 hover:text-emerald-400 h-9"
                >
                  Reset
                </Button>
              )}

            </div>

          </div>
        </CardContent>
      </Card>

      {/* ── Traders Data Table ────────────────────────────────────────────── */}
      <Card className="bg-[#111827] border-[#1F2937]">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base text-gray-100">
              Traders Directory ({filteredTraders.length})
            </CardTitle>
            <CardDescription className="text-xs text-gray-400">
              Active evaluations, funded accounts, and balance health
            </CardDescription>
          </div>
          <span className="text-xs font-mono text-gray-500">
            Showing {filteredTraders.length} of {allTraders.length} records
          </span>
        </CardHeader>

        <CardContent className="p-0">
          <DataTable<TraderRowItem>
            columns={columns}
            data={filteredTraders}
            loading={usersLoading}
            emptyMessage={searchTerm || statusFilter !== 'all' || kycFilter !== 'all' ? 'No traders match the selected filter criteria.' : 'No registered traders found.'}
            className="border-0 rounded-none bg-transparent"
          />
        </CardContent>

        {/* Pagination Bar */}
        {usersData && (usersData.pages > 1 || (usersData.total && usersData.total > 25)) && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-[#1F2937] bg-[#0B0F19]/50">
            <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setPage(1)
                }}
                className="bg-[#111827] border border-[#1F2937] rounded px-2 py-1 text-xs text-gray-200 focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="ml-2">
                Page <strong className="text-white">{page}</strong> of <strong className="text-white">{usersData.pages || 1}</strong> ({usersData.total} total traders)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="text-xs h-8 px-3 border-[#1F2937] text-gray-300 disabled:opacity-40"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= (usersData.pages || 1)}
                onClick={() => setPage(p => p + 1)}
                className="text-xs h-8 px-3 border-[#1F2937] text-gray-300 disabled:opacity-40"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Enterprise Overrides Modal ────────────────────────────────────── */}
      <EnterpriseOverrideModal
        isOpen={overrideModalOpen}
        onClose={() => {
          setOverrideModalOpen(false)
          setSelectedTrader(null)
        }}
        trader={selectedTrader}
        onSuccess={() => {
          refetchUsers()
        }}
      />

      {/* ── Direct Password Reset Modal ───────────────────────────────────── */}
      <DirectPasswordResetModal
        isOpen={resetPasswordModalOpen}
        onClose={() => {
          setResetPasswordModalOpen(false)
          setResetPasswordTarget(null)
        }}
        trader={resetPasswordTarget}
        onSuccess={() => {
          refetchUsers()
        }}
      />

      {/* ── Balance Adjustment Dialog ─────────────────────────────────────── */}
      {balanceTarget && (
        <AdjustBalanceDialog
          user={balanceTarget}
          onClose={() => setBalanceTarget(null)}
          onSaved={() => refetchUsers()}
        />
      )}

      {/* ── Impersonate Confirmation Dialog ────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!impersonateTarget}
        onCancel={() => setImpersonateTarget(null)}
        onConfirm={async () => {
          if (!impersonateTarget) return
          const target = impersonateTarget
          setIsImpersonating(true)
          await handleImpersonate(target)
          setIsImpersonating(false)
          setImpersonateTarget(null)
        }}
        title={`View Dashboard as ${impersonateTarget?.name}?`}
        description={`You are about to launch a read-only trader session for ${impersonateTarget?.name} (${impersonateTarget?.email}). Write actions like placing trades or requesting payouts are blocked during impersonation.`}
        confirmText={isImpersonating ? 'Starting Session...' : 'Start Trader Session'}
        cancelText="Cancel"
      />

    </div>
  )
}

// ── Balance adjustment (ported from the retired /dashboard/admin/users page) ──
function AdjustBalanceDialog({ user, onClose, onSaved }: {
  user: TraderRowItem; onClose: () => void; onSaved: () => void
}) {
  const [amount, setAmount] = useState('')
  const [note,   setNote]   = useState('Admin adjustment')
  const [busy,   setBusy]   = useState(false)

  const amountN = parseFloat(amount)
  const isAdd = amountN > 0
  const newBalance = (user.balance || 0) + (Number.isFinite(amountN) ? amountN : 0)

  const submit = async () => {
    if (!Number.isFinite(amountN) || amountN === 0) { toast.error('Enter a non-zero amount'); return }
    if (!user.account_id) { toast.error('User has no trading account'); return }
    setBusy(true)
    const res = await api.admin.adjustBalance(user.user_id, Number(user.account_id), amountN, note.trim() || 'Admin adjustment')
    setBusy(false)
    if (res.ok && res.data.success) {
      toast.success(`Balance updated to ${formatExactMoney(res.data.new_balance)}`)
      onSaved(); onClose()
    } else {
      toast.error(res.ok ? 'Adjustment failed' : res.error)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust {user.name}&apos;s balance</DialogTitle>
          <DialogDescription>Use a negative amount to deduct. This is recorded in the admin audit log.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md bg-[#0B0F19] border border-[#1F2937] p-3 text-xs space-y-1">
            <div className="flex justify-between"><span className="text-gray-400">Current balance</span><span className="font-mono text-gray-200">{formatExactMoney(user.balance)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Adjustment</span>
              <span className={`font-mono font-medium ${amountN > 0 ? 'text-emerald-400' : amountN < 0 ? 'text-rose-400' : 'text-gray-500'}`}>
                {Number.isFinite(amountN) && amountN !== 0 ? (isAdd ? '+' : '') + formatExactMoney(amountN) : '—'}
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-[#1F2937]">
              <span className="font-medium text-gray-300">New balance</span>
              <span className="font-mono font-medium text-white">{formatExactMoney(newBalance)}</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="amt">Amount (USD)</Label>
            <Input id="amt" type="text" inputMode="decimal" value={amount}
                   onChange={(e) => setAmount(e.target.value.replace(/[^\d.\-]/g, ''))}
                   placeholder="e.g. -500 to deduct $500" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note">Note (audit log)</Label>
            <Textarea id="note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={busy} disabled={!Number.isFinite(amountN) || amountN === 0}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
