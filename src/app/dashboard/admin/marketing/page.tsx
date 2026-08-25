'use client'

import { useState } from 'react'
import { cn } from '@/lib/cn'
import AdminBannersPage from '../banners/page'
import AdminCouponsPage from '../coupons/page'
import AdminAffiliatesPage from '../affiliates/page'
import AdminEmailPage from '../email/page'
import { Megaphone } from 'lucide-react'

export default function MarketingHubPage() {
  const [activeTab, setActiveTab] = useState<'banners' | 'coupons' | 'affiliates' | 'email'>('coupons')

  return (
    <div className="space-y-6">
      {/* Vibrant Header Banner */}
      <div className="relative isolate overflow-hidden bg-surface rounded-2xl border border-border p-6 sm:p-8">
        {/* Ambient background glow */}
        <div className="absolute -top-24 -right-24 -z-10 h-64 w-64 rounded-full bg-accent/30 blur-3xl opacity-60 mix-blend-screen" />
        <div className="absolute -bottom-24 -left-24 -z-10 h-64 w-64 rounded-full bg-success/20 blur-3xl opacity-60 mix-blend-screen" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-[150%] w-[150%] bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-accent to-accent-foreground drop-shadow-sm flex items-center gap-3">
              <Megaphone className="h-8 w-8 text-accent" />
              Marketing Hub
            </h1>
            <p className="text-sm text-text-muted mt-2 max-w-xl leading-relaxed">
              Manage promotions, coupons, affiliate programs, and campaigns.
            </p>
          </div>
          <div className="flex bg-surface-muted/50 backdrop-blur-sm p-1 rounded-lg shrink-0 overflow-x-auto border border-border/50 shadow-sm">
            <button 
              onClick={() => setActiveTab('coupons')}
              className={cn("px-4 py-2 text-sm font-medium rounded-md transition-all duration-300", activeTab === 'coupons' ? "bg-surface shadow text-accent" : "text-text-muted hover:text-text hover:bg-surface/50")}
            >
              Coupons
            </button>
            <button 
              onClick={() => setActiveTab('affiliates')}
              className={cn("px-4 py-2 text-sm font-medium rounded-md transition-all duration-300", activeTab === 'affiliates' ? "bg-surface shadow text-accent" : "text-text-muted hover:text-text hover:bg-surface/50")}
            >
              Affiliates
            </button>
            <button 
              onClick={() => setActiveTab('banners')}
              className={cn("px-4 py-2 text-sm font-medium rounded-md transition-all duration-300", activeTab === 'banners' ? "bg-surface shadow text-accent" : "text-text-muted hover:text-text hover:bg-surface/50")}
            >
              Banners
            </button>
            <button 
              onClick={() => setActiveTab('email')}
              className={cn("px-4 py-2 text-sm font-medium rounded-md transition-all duration-300", activeTab === 'email' ? "bg-surface shadow text-accent" : "text-text-muted hover:text-text hover:bg-surface/50")}
            >
              Email Campaigns
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'coupons' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <AdminCouponsPage />
        </div>
      )}
      
      {activeTab === 'affiliates' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <AdminAffiliatesPage />
        </div>
      )}
      
      {activeTab === 'banners' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <AdminBannersPage />
        </div>
      )}

      {activeTab === 'email' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <AdminEmailPage />
        </div>
      )}
    </div>
  )
}
