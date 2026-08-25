'use client'

import * as React from 'react'
import Link from 'next/link'
import { Wallet, ShieldAlert, MessageSquare, ArrowRight, CheckCircle2, Sparkles, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface ActionCenterProps {
  pendingPayoutsCount: number
  pendingPayoutsAmount: number
  riskBreachesCount: number
  urgentTicketsCount: number
  onOpenPayoutReview?: () => void
}

export function FounderActionCenter({
  pendingPayoutsCount = 0,
  pendingPayoutsAmount = 0,
  riskBreachesCount = 0,
  urgentTicketsCount = 0,
  onOpenPayoutReview,
}: ActionCenterProps) {
  const allClear = pendingPayoutsCount === 0 && riskBreachesCount === 0 && urgentTicketsCount === 0

  if (allClear) {
    return (
      <div className="bg-[#111827] border border-emerald-500/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-white">All Systems Operational</h4>
              <Badge tone="success" size="sm">100% Caught Up</Badge>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">0 pending payouts • 0 unhandled risk alerts • Support queue cleared</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/traders"
            className="px-3.5 py-1.5 rounded-lg bg-[#0B0F19] border border-[#1F2937] hover:border-emerald-500/40 text-xs font-semibold text-gray-300 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <span>View Traders Hub</span>
            <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
          </Link>
        </div>
      </div>
    )
  }

  const totalUrgentItems = (pendingPayoutsCount > 0 ? 1 : 0) + (riskBreachesCount > 0 ? 1 : 0) + (urgentTicketsCount > 0 ? 1 : 0)

  return (
    <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-5 shadow-2xl relative overflow-hidden">
      {/* Subtle top ambient glow */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500/40 to-emerald-500/0" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-bold text-white tracking-tight">Founder&apos;s Morning Action Center</h3>
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            High-priority operational items requiring executive approval or review today
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="accent" size="sm">
            {totalUrgentItems} Action Category{totalUrgentItems > 1 ? 'ies' : 'y'} Pending
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* 1. Treasury Card */}
        <div 
          onClick={onOpenPayoutReview}
          className="group p-4 rounded-xl bg-[#0B0F19] border border-emerald-500/30 hover:border-emerald-500/70 cursor-pointer transition-all duration-200 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Treasury Action</span>
              <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Wallet className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-white mt-1.5 font-mono">
              ${pendingPayoutsAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {pendingPayoutsCount > 0 ? `${pendingPayoutsCount} payout withdrawal${pendingPayoutsCount > 1 ? 's' : ''} awaiting sign-off` : 'No pending payout requests'}
            </p>
          </div>
          <div className="mt-3.5 pt-2.5 border-t border-[#1F2937]/60 flex items-center justify-between text-xs font-semibold text-emerald-400 group-hover:text-emerald-300">
            <span>Review & Approve Payouts</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* 2. Risk Card */}
        <Link 
          href="/admin/risk"
          className="group p-4 rounded-xl bg-[#0B0F19] border border-amber-500/30 hover:border-amber-500/70 transition-all duration-200 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Risk Audit</span>
              <div className="h-7 w-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <ShieldAlert className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-white mt-1.5 font-mono">
              {riskBreachesCount} Flagged Account{riskBreachesCount === 1 ? '' : 's'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {riskBreachesCount > 0 ? 'HFT scalping, lot stacking, or drawdown warnings' : 'Zero active risk breaches detected'}
            </p>
          </div>
          <div className="mt-3.5 pt-2.5 border-t border-[#1F2937]/60 flex items-center justify-between text-xs font-semibold text-amber-400 group-hover:text-amber-300">
            <span>Inspect Risk Alerts</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* 3. Support Card */}
        <Link 
          href="/admin/helpdesk"
          className="group p-4 rounded-xl bg-[#0B0F19] border border-blue-500/30 hover:border-blue-500/70 transition-all duration-200 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Trader Support</span>
              <div className="h-7 w-7 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <MessageSquare className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-xl font-extrabold text-white mt-1.5 font-mono">
              {urgentTicketsCount} Active Ticket{urgentTicketsCount === 1 ? '' : 's'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {urgentTicketsCount > 0 ? 'Inquiries awaiting admin reply in helpdesk' : 'All trader support inquiries answered'}
            </p>
          </div>
          <div className="mt-3.5 pt-2.5 border-t border-[#1F2937]/60 flex items-center justify-between text-xs font-semibold text-blue-400 group-hover:text-blue-300">
            <span>Open Support Desk</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>
    </div>
  )
}
