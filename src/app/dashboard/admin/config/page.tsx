'use client'

import { useState } from 'react'
import { cn } from '@/lib/cn'
import AdminPlansPage from '../plans/page'
import AdminThemePage from '../theme/page'
import AdminSettingsPage from '../settings/page'
import AdminChallengeOpsPage from '../challenge-operations/page'
import AdminSetupPage from '../setup/page'

import { LayoutTemplate, Palette, Settings2, ShieldCheck, Wand2 } from 'lucide-react'

export default function ConfigHubPage() {
  const [activeTab, setActiveTab] = useState<'plans' | 'theme' | 'settings' | 'ops' | 'setup'>('plans')

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
              <Settings2 className="h-8 w-8 text-info" />
              Configuration Hub
            </h1>
            <p className="text-sm text-text-muted mt-2 max-w-xl leading-relaxed">
              Manage challenge plans, theme branding, and core system settings.
            </p>
          </div>
        </div>
      </div>
      {/* Tab Navigation */}
      <div className="flex bg-surface-muted p-1.5 rounded-xl border border-border-subtle shrink-0 overflow-x-auto shadow-sm">
        <button 
          onClick={() => setActiveTab('plans')}
          className={cn("px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 flex items-center gap-2", activeTab === 'plans' ? "bg-surface shadow text-info" : "text-text-muted hover:text-text hover:bg-surface/50")}
        >
          <LayoutTemplate className="h-4 w-4" />
          Plans
        </button>
        <button 
          onClick={() => setActiveTab('theme')}
          className={cn("px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 flex items-center gap-2", activeTab === 'theme' ? "bg-surface shadow text-info" : "text-text-muted hover:text-text hover:bg-surface/50")}
        >
          <Palette className="h-4 w-4" />
          Theme & Branding
        </button>
        <button 
          onClick={() => setActiveTab('ops')}
          className={cn("px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 flex items-center gap-2", activeTab === 'ops' ? "bg-surface shadow text-info" : "text-text-muted hover:text-text hover:bg-surface/50")}
        >
          <ShieldCheck className="h-4 w-4" />
          Challenge Ops
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={cn("px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 flex items-center gap-2", activeTab === 'settings' ? "bg-surface shadow text-info" : "text-text-muted hover:text-text hover:bg-surface/50")}
        >
          <Settings2 className="h-4 w-4" />
          Settings
        </button>
        <button 
          onClick={() => setActiveTab('setup')}
          className={cn("px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 flex items-center gap-2", activeTab === 'setup' ? "bg-surface shadow text-info" : "text-text-muted hover:text-text hover:bg-surface/50")}
        >
          <Wand2 className="h-4 w-4" />
          Setup Wizard
        </button>
      </div>

      {activeTab === 'plans' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <AdminPlansPage />
        </div>
      )}
      
      {activeTab === 'theme' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <AdminThemePage />
        </div>
      )}
      
      {activeTab === 'ops' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <AdminChallengeOpsPage />
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <AdminSettingsPage />
        </div>
      )}

      {activeTab === 'setup' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <AdminSetupPage />
        </div>
      )}
    </div>
  )
}
