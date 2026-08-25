'use client'

import * as React from 'react'
import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Bell, Check, CheckCheck, Info, AlertCircle, AlertTriangle, 
  CheckCircle2, User, Loader2, RefreshCw, ShieldAlert, Wallet,
  Zap, DollarSign, Trophy, ArrowUpRight, Search, X, Filter,
  MessageSquare, CreditCard, ShieldCheck, Flame, ScrollText, ChevronLeft, ChevronRight
} from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { cn } from '@/lib/cn'
import type { AdminNotification, AdminNotificationsResp } from '@/types/api'

type EventCategory = 'all' | 'purchases' | 'breaches' | 'passes' | 'support'

interface AuditLogRow {
  id: number
  admin_id: number
  user_login?: string
  action: string
  target_user_id?: number | null
  details?: string | null
  created_at?: string
}

export default function AdminActivityPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [category, setCategory] = useState<EventCategory>('all')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [logPage, setLogPage] = useState(1)
  const [showAuditTrail, setShowAuditTrail] = useState(false)

  const { data, isPending, refetch } = useQuery<AdminNotificationsResp>({
    queryKey: ['admin-activity-notifications'],
    queryFn: () => api.admin.notifications().then(res => res.ok ? res.data : { notifications: [], unread_count: 0 }),
    refetchInterval: 15000 // auto-poll every 15s
  })

  // Admin audit trail — the backend logs every privileged action here.
  const { data: auditRows, isPending: auditPending } = useQuery<AuditLogRow[]>({
    queryKey: ['admin-audit-log', logPage],
    queryFn: () => api.admin.log(logPage).then(res => res.ok && Array.isArray(res.data) ? res.data as AuditLogRow[] : []),
    enabled: showAuditTrail,
    staleTime: 15_000,
  })

  const rawList = data?.notifications ?? []
  const unreadCount = data?.unread_count ?? rawList.filter(n => !n.is_read).length

  // Filter logic
  const filteredList = useMemo(() => {
    return rawList.filter((n) => {
      // 1. Unread Only filter
      if (unreadOnly && n.is_read) return false

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = n.title?.toLowerCase().includes(q)
        const matchMsg = n.message?.toLowerCase().includes(q)
        const matchUser = n.ref_user_label?.toLowerCase().includes(q)
        if (!matchTitle && !matchMsg && !matchUser) return false
      }

      // 3. Category filter
      if (category === 'purchases') {
        const text = `${n.title} ${n.message}`.toLowerCase()
        return text.includes('purchase') || text.includes('payment') || text.includes('order') || 
               text.includes('stripe') || text.includes('checkout') || text.includes('crypto') || 
               text.includes('usdt') || text.includes('paid')
      }

      if (category === 'breaches') {
        const text = `${n.title} ${n.message}`.toLowerCase()
        return text.includes('breach') || text.includes('drawdown') || text.includes('violation') || 
               text.includes('halted') || text.includes('failed') || text.includes('risk') || 
               text.includes('scalping') || text.includes('rule') || n.type === 'error'
      }

      if (category === 'passes') {
        const text = `${n.title} ${n.message}`.toLowerCase()
        return text.includes('passed') || text.includes('phase') || text.includes('promoted') || 
               text.includes('funded') || text.includes('payout') || text.includes('withdrawal') || 
               text.includes('milestone')
      }

      if (category === 'support') {
        const text = `${n.title} ${n.message}`.toLowerCase()
        return text.includes('ticket') || text.includes('support') || text.includes('inquiry') || 
               text.includes('kyc') || text.includes('verification') || text.includes('audit') || 
               text.includes('review')
      }

      return true
    })
  }, [rawList, unreadOnly, searchQuery, category])

  const hasActiveFilters = searchQuery.trim() !== '' || category !== 'all' || unreadOnly

  const handleClearFilters = () => {
    setSearchQuery('')
    setCategory('all')
    setUnreadOnly(false)
  }

  const handleMarkAllRead = async () => {
    try {
      const res = await api.admin.notificationsRead([])
      if (res.ok) {
        toast.success('All notifications marked as read.')
        queryClient.invalidateQueries({ queryKey: ['admin-activity-notifications'] })
      } else {
        toast.error(res.error || 'Failed to mark notifications as read.')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to mark notifications as read.')
    }
  }

  const handleMarkOneRead = async (id: number) => {
    try {
      const res = await api.admin.notificationsRead([id])
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['admin-activity-notifications'] })
      } else {
        toast.error(res.error || 'Failed to mark notification as read.')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to mark notification as read.')
    }
  }

  const timeAgo = (dateStr?: string) => {
    if (!dateStr) return 'just now'
    const ms = Date.now() - new Date(dateStr.replace(' ', 'T')).getTime()
    const s = Math.max(1, Math.round(ms / 1000))
    const m = Math.round(s / 60)
    const h = Math.round(m / 60)
    const d = Math.round(h / 24)
    if (s < 60) return `${s}s ago`
    if (m < 60) return `${m}m ago`
    if (h < 24) return `${h}h ago`
    return `${d}d ago`
  }

  return (
    <div className="space-y-6 w-full pb-16">
      
      {/* ── 1. Top Header Banner ────────────────────────────────────────────── */}
      <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-sans">
                Global Activity & Audit Hub
              </h1>
              {unreadCount > 0 && (
                <Badge tone="accent" size="sm" className="font-mono font-bold">
                  {unreadCount} New
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-400 mt-1">
              Real-time multi-dimensional feed of challenge sales, risk infractions, phase passes, and trader actions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center">
          {unreadCount > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleMarkAllRead} 
              className="gap-1.5 text-xs border-[#1F2937] text-gray-300 hover:text-white hover:bg-slate-800"
            >
              <CheckCheck className="h-4 w-4 text-emerald-400" />
              <span>Mark all read</span>
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-activity-notifications'] })}
            className="h-9 w-9 p-0 border-[#1F2937] text-gray-400 hover:text-white hover:bg-slate-800"
            title="Refresh feed"
          >
            <RefreshCw className="h-4 w-4 text-emerald-400" />
          </Button>
        </div>
      </div>

      {/* ── 2. Smart Multi-Category Filter Bar ───────────────────────────────── */}
      <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-4 shadow-lg space-y-3.5">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Quick Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search trader, account #, or event keyword..."
              className="w-full pl-9 pr-8 py-2 bg-[#0B0F19] border border-[#1F2937] focus:border-emerald-500 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Right Controls: Read/Unread Toggle & Clear Filters */}
          <div className="flex items-center gap-2 self-start md:self-center">
            
            {/* Read/Unread Pill Toggle */}
            <button
              type="button"
              onClick={() => setUnreadOnly(!unreadOnly)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                unreadOnly
                  ? "bg-emerald-500 text-black font-bold shadow-md shadow-emerald-500/20"
                  : "bg-[#0B0F19] hover:bg-slate-800 text-gray-400 hover:text-white border border-[#1F2937]"
              )}
            >
              <span>Unread Only</span>
              {unreadCount > 0 && (
                <span className={cn(
                  "h-4 px-1.5 rounded-full text-[10px] font-bold font-mono",
                  unreadOnly ? "bg-black text-emerald-400" : "bg-emerald-500/20 text-emerald-400"
                )}>
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 h-8 gap-1"
              >
                <X className="h-3.5 w-3.5" />
                <span>Reset</span>
              </Button>
            )}

          </div>
        </div>

        {/* Event Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-t border-[#1F2937]/60 pt-3">
          
          <button
            type="button"
            onClick={() => setCategory('all')}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5",
              category === 'all'
                ? "bg-emerald-500 text-black font-bold shadow-md shadow-emerald-500/20"
                : "bg-[#0B0F19] hover:bg-slate-800 text-gray-400 hover:text-white border border-[#1F2937]"
            )}
          >
            <span>🌐 All Activity</span>
            <span className="text-[10px] opacity-75 font-mono">({rawList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setCategory('purchases')}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5",
              category === 'purchases'
                ? "bg-emerald-500 text-black font-bold shadow-md shadow-emerald-500/20"
                : "bg-[#0B0F19] hover:bg-slate-800 text-gray-400 hover:text-white border border-[#1F2937]"
            )}
          >
            <CreditCard className="h-3.5 w-3.5 text-emerald-400" />
            <span>💳 Purchases & Payments</span>
          </button>

          <button
            type="button"
            onClick={() => setCategory('breaches')}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5",
              category === 'breaches'
                ? "bg-rose-500 text-white font-bold shadow-md shadow-rose-500/20"
                : "bg-[#0B0F19] hover:bg-slate-800 text-gray-400 hover:text-white border border-[#1F2937]"
            )}
          >
            <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
            <span>⚠️ Breaches & Violations</span>
          </button>

          <button
            type="button"
            onClick={() => setCategory('passes')}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5",
              category === 'passes'
                ? "bg-emerald-500 text-black font-bold shadow-md shadow-emerald-500/20"
                : "bg-[#0B0F19] hover:bg-slate-800 text-gray-400 hover:text-white border border-[#1F2937]"
            )}
          >
            <Trophy className="h-3.5 w-3.5 text-purple-400" />
            <span>🏆 Passes & Payouts</span>
          </button>

          <button
            type="button"
            onClick={() => setCategory('support')}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5",
              category === 'support'
                ? "bg-blue-500 text-white font-bold shadow-md shadow-blue-500/20"
                : "bg-[#0B0F19] hover:bg-slate-800 text-gray-400 hover:text-white border border-[#1F2937]"
            )}
          >
            <MessageSquare className="h-3.5 w-3.5 text-blue-400" />
            <span>💬 Support & Inquiries</span>
          </button>

        </div>

      </div>

      {/* ── 3. High-Density Responsive 3-to-4 Column Grid Layout ───────────── */}
      {isPending ? (
        <div className="py-24 text-center bg-[#111827] border border-[#1F2937] rounded-2xl">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mx-auto" />
          <p className="text-xs text-gray-400 font-mono mt-2">Loading activity logs...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="py-20 text-center text-gray-400 bg-[#111827] border border-[#1F2937] rounded-2xl space-y-3">
          <Bell className="h-10 w-10 mx-auto text-gray-600" />
          <p className="font-semibold text-white text-base">
            {rawList.length === 0 ? 'No activity logs recorded yet' : 'No activity matches your filters'}
          </p>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            {rawList.length === 0 
              ? 'Real-time platform events will appear here automatically as traders purchase challenges, place trades, trigger risk rules, and request payouts.'
              : 'Try resetting your search query or selecting a different event category tab.'}
          </p>
          {hasActiveFilters ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="border-[#1F2937] text-gray-300 hover:text-white hover:bg-slate-800 mt-2"
            >
              Reset Filters
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="border-[#1F2937] text-gray-300 hover:text-white hover:bg-slate-800 mt-2 gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh Feed</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredList.map((n: AdminNotification) => {
            const isPurchase = n.type === 'success' || n.title?.toLowerCase().includes('purchase') || n.title?.toLowerCase().includes('payment')
            const isBreach = n.type === 'error' || n.title?.toLowerCase().includes('breach') || n.title?.toLowerCase().includes('drawdown') || n.title?.toLowerCase().includes('fail')
            const isPass = n.title?.toLowerCase().includes('passed') || n.title?.toLowerCase().includes('funded') || n.title?.toLowerCase().includes('payout')
            const isWarning = n.type === 'warning' || n.title?.toLowerCase().includes('ticket') || n.title?.toLowerCase().includes('review')
            
            // Glowing event icon styling
            let iconContainer = 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
            let IconComponent = Info

            if (isPurchase) {
              iconContainer = 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              IconComponent = CreditCard
            } else if (isBreach) {
              iconContainer = 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
              IconComponent = AlertCircle
            } else if (isPass) {
              iconContainer = 'bg-purple-500/10 border border-purple-500/20 text-purple-400'
              IconComponent = Trophy
            } else if (isWarning) {
              iconContainer = 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
              IconComponent = AlertTriangle
            }

            return (
              <div
                key={n.id}
                className={cn(
                  "bg-[#111827] hover:bg-[#151D2C] border rounded-2xl p-4 transition-all duration-200 shadow-md flex flex-col justify-between group relative",
                  !n.is_read 
                    ? "border-emerald-500/40 shadow-emerald-500/5 bg-[#111827]" 
                    : "border-[#1F2937] hover:border-slate-700"
                )}
              >
                <div>
                  {/* Top Card Row: Icon, Title & Time */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={cn("p-2 rounded-xl shrink-0 flex items-center justify-center", iconContainer)}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                          {n.title}
                        </h4>
                        {!n.is_read && (
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            UNREAD
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="text-[11px] font-mono text-gray-500 shrink-0">
                      {timeAgo(n.created_at_iso || n.created_at)}
                    </span>
                  </div>

                  {/* Middle Row: Message Text */}
                  <p className="text-xs text-gray-400 leading-relaxed line-clamp-3 my-3">
                    {n.message}
                  </p>
                </div>

                {/* Bottom Row: User Tag Pill & Action Button */}
                <div className="pt-3 border-t border-[#1F2937]/70 flex items-center justify-between gap-2">
                  {n.ref_user_label ? (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#0B0F19] border border-[#1F2937] text-[11px] font-mono text-gray-300 truncate max-w-[75%]">
                      <User className="h-3 w-3 text-emerald-400 shrink-0" />
                      <span className="truncate">{n.ref_user_label}</span>
                    </div>
                  ) : (
                    <div className="text-[11px] font-mono text-gray-500">System Event</div>
                  )}

                  {!n.is_read ? (
                    <button
                      type="button"
                      onClick={() => handleMarkOneRead(n.id)}
                      className="p-1.5 rounded-lg hover:bg-[#0B0F19] border border-transparent hover:border-[#1F2937] text-gray-400 hover:text-emerald-400 transition-colors shrink-0"
                      title="Mark as read"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <span className="p-1 text-gray-600 shrink-0" title="Read">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── 4. Admin Audit Trail ────────────────────────────────────────────── */}
      <div className="bg-[#111827] border border-[#1F2937] rounded-2xl shadow-lg">
        <button
          type="button"
          onClick={() => setShowAuditTrail((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <ScrollText className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Admin Audit Trail</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Every privileged action (payouts, impersonation, balance adjustments, config changes) — 100 per page.
              </p>
            </div>
          </div>
          {showAuditTrail ? <ChevronLeft className="h-4 w-4 text-gray-400 rotate-[-90deg]" /> : <ChevronRight className="h-4 w-4 text-gray-400 rotate-90" />}
        </button>

        {showAuditTrail && (
          <div className="px-5 pb-5">
            {auditPending ? (
              <div className="py-10 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-purple-400 mx-auto" />
                <p className="text-xs text-gray-400 font-mono mt-2">Loading audit trail…</p>
              </div>
            ) : !auditRows || auditRows.length === 0 ? (
              <p className="py-8 text-center text-xs text-gray-500">No audit entries recorded yet.</p>
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-[#1F2937]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[#0B0F19] text-gray-400 text-left">
                        <th className="px-3 py-2 font-semibold">When</th>
                        <th className="px-3 py-2 font-semibold">Admin</th>
                        <th className="px-3 py-2 font-semibold">Action</th>
                        <th className="px-3 py-2 font-semibold">Target user</th>
                        <th className="px-3 py-2 font-semibold">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditRows.map((row) => (
                        <tr key={row.id} className="border-t border-[#1F2937]/60 hover:bg-[#151D2C]">
                          <td className="px-3 py-2 font-mono text-gray-500 whitespace-nowrap">{row.created_at || '—'}</td>
                          <td className="px-3 py-2 text-gray-200 whitespace-nowrap">{row.user_login || `#${row.admin_id}`}</td>
                          <td className="px-3 py-2 font-mono text-purple-300 whitespace-nowrap">{row.action}</td>
                          <td className="px-3 py-2 text-gray-300 whitespace-nowrap">{row.target_user_id ? `#${row.target_user_id}` : '—'}</td>
                          <td className="px-3 py-2 text-gray-400 max-w-xs truncate" title={row.details || ''}>{row.details || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-gray-500 font-mono">Page {logPage}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline" size="sm"
                      disabled={logPage <= 1}
                      onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                      className="border-[#1F2937] text-gray-300 hover:text-white hover:bg-slate-800 gap-1"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" /> Prev
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      disabled={!auditRows || auditRows.length < 100}
                      onClick={() => setLogPage((p) => p + 1)}
                      className="border-[#1F2937] text-gray-300 hover:text-white hover:bg-slate-800 gap-1"
                    >
                      Next <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

    </div>
  )
}
