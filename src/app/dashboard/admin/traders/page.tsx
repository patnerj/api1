'use client'

import { useState } from 'react'
import { cn } from '@/lib/cn'
import AdminUsersPage from '../users/page'
import AdminChallengesPage from '../challenges/page'
import AdminPayoutsPage from '../payments/page'
import { Mt5UnassignedBanner } from '@/components/admin/mt5-unassigned-banner'
import { Users } from 'lucide-react'

export default function TradersHubPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'challenges' | 'payouts'>('users')

  return (
    <div className="space-y-6">
      {/* Vibrant Header Banner */}
      <div className="relative isolate overflow-hidden bg-surface rounded-2xl border border-border p-6 sm:p-8">
        {/* Ambient background glow */}
        <div className="absolute -top-24 -right-24 -z-10 h-64 w-64 rounded-full bg-info/30 blur-3xl opacity-60 mix-blend-screen" />
        <div className="absolute -bottom-24 -left-24 -z-10 h-64 w-64 rounded-full bg-accent/20 blur-3xl opacity-60 mix-blend-screen" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-[150%] w-[150%] bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-info to-info-foreground drop-shadow-sm flex items-center gap-3">
              <Users className="h-8 w-8 text-info" />
              Traders Hub
            </h1>
            <p className="text-sm text-text-muted mt-2 max-w-xl leading-relaxed">
              Manage users, view challenge progress, and process payouts.
            </p>
          </div>
          <div className="flex bg-surface-muted/50 backdrop-blur-sm p-1 rounded-lg shrink-0 overflow-x-auto border border-border/50 shadow-sm">
            <button 
              onClick={() => setActiveTab('users')}
              className={cn("px-4 py-2 text-sm font-medium rounded-md transition-all duration-300", activeTab === 'users' ? "bg-surface shadow text-info" : "text-text-muted hover:text-text hover:bg-surface/50")}
            >
              Users & KYC
            </button>
            <button 
              onClick={() => setActiveTab('challenges')}
              className={cn("px-4 py-2 text-sm font-medium rounded-md transition-all duration-300", activeTab === 'challenges' ? "bg-surface shadow text-info" : "text-text-muted hover:text-text hover:bg-surface/50")}
            >
              Challenges
            </button>
            <button 
              onClick={() => setActiveTab('payouts')}
              className={cn("px-4 py-2 text-sm font-medium rounded-md transition-all duration-300", activeTab === 'payouts' ? "bg-surface shadow text-info" : "text-text-muted hover:text-text hover:bg-surface/50")}
            >
              Payouts
            </button>
          </div>
        </div>
      </div>

      <Mt5UnassignedBanner />

      {activeTab === 'users' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <AdminUsersPage />
        </div>
      )}
      
      {activeTab === 'challenges' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <AdminChallengesPage />
        </div>
      )}
      
      {activeTab === 'payouts' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <AdminPayoutsPage />
        </div>
      )}
    </div>
  )
}
