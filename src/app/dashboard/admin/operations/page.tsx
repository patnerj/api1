'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { invalidateFxsim } from '@/lib/fxsim'
import { fmtUSD, fmtNum } from '@/lib/format'
import type { AdminRisk } from '@/types/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/cn'
import { Wallet, Users, TrendingUp, AlertTriangle, ShieldAlert, Ban, Activity, PauseCircle } from 'lucide-react'

import AdminRiskPage from '../risk/page'
import AdminHealthPage from '../health/page'

export default function OperationsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'risk' | 'health'>('overview')

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Operations Hub</h1>
          <p className="text-sm text-text-muted mt-1">Risk overview, emergency controls, AI analysis, and system health.</p>
        </div>
        <div className="flex bg-surface-muted p-1 rounded-lg shrink-0 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('overview')}
            className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-colors", activeTab === 'overview' ? "bg-surface shadow text-text" : "text-text-muted hover:text-text")}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('risk')}
            className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-colors", activeTab === 'risk' ? "bg-surface shadow text-text" : "text-text-muted hover:text-text")}
          >
            Risk & AI
          </button>
          <button 
            onClick={() => setActiveTab('health')}
            className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-colors", activeTab === 'health' ? "bg-surface shadow text-text" : "text-text-muted hover:text-text")}
          >
            System Health
          </button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <RiskPanel />
          <EmergencyControls />
        </div>
      )}
      
      {activeTab === 'risk' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <AdminRiskPage />
        </div>
      )}
      
      {activeTab === 'health' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <AdminHealthPage />
        </div>
      )}
    </div>
  )
}

// ── #5 Risk Dashboard ────────────────────────────────────────────────────────
function RiskPanel() {
  const [risk, setRisk] = useState<AdminRisk | null>(null)
  useEffect(() => { api.admin.risk().then((r) => { if (r.ok) setRisk(r.data) }) }, [])

  const cards = risk ? [
    { label: 'Funded accounts',    value: fmtNum(risk.funded_count),               icon: Users,       tone: 'accent' as const },
    { label: 'Funded capital',     value: fmtUSD(risk.funded_capital),             icon: Wallet,      tone: 'accent' as const },
    { label: 'Active challenges',  value: fmtNum(risk.active_challenges),          icon: Activity,    tone: 'accent' as const },
    { label: 'Pending payouts',    value: fmtUSD(risk.pending_payout_value),       icon: TrendingUp,  tone: risk.pending_payout_value > 0 ? 'warn' as const : 'accent' as const, sub: `${risk.pending_payout_count} request${risk.pending_payout_count === 1 ? '' : 's'}` },
    { label: 'Approved payouts',   value: fmtUSD(risk.approved_payout_value),      icon: TrendingUp,  tone: 'accent' as const },
    { label: 'Accounts near breach', value: fmtNum(risk.near_breach),              icon: AlertTriangle, tone: risk.near_breach > 0 ? 'warn' as const : 'accent' as const },
    { label: 'Frozen accounts',    value: fmtNum(risk.frozen_count),               icon: ShieldAlert, tone: risk.frozen_count > 0 ? 'warn' as const : 'accent' as const },
    { label: 'Banned accounts',    value: fmtNum(risk.banned_count),               icon: Ban,         tone: risk.banned_count > 0 ? 'danger' as const : 'accent' as const },
  ] : []

  const toneCls = { accent: 'text-accent bg-accent/10', warn: 'text-warn bg-warn/10', danger: 'text-danger bg-danger/10' }

  return (
    <div>
      <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Risk overview</h2>
      {!risk ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Card key={i} className="p-4 sm:p-5"><Skeleton className="h-12 w-full" /></Card>)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {cards.map((c) => {
            const Icon = c.icon
            return (
              <Card key={c.label} className="p-4 sm:p-5">
                <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center mb-3', toneCls[c.tone])}><Icon className="h-4 w-4" /></div>
                <div className="text-xl font-bold tabular-nums">{c.value}</div>
                <div className="text-2xs text-text-muted mt-0.5">{c.label}{('sub' in c && c.sub) ? ` · ${c.sub}` : ''}</div>
              </Card>
            )
          })}
        </div>
      )}
      <p className="text-2xs text-text-muted mt-2">&ldquo;Near breach&rdquo; is a heuristic: active/funded accounts with little cushion above their starting balance. Review them individually before acting.</p>
    </div>
  )
}

import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

// ── #8 Emergency Controls ────────────────────────────────────────────────────
const SWITCHES = [
  { key: 'pause_registrations', label: 'Pause registrations', desc: 'New traders cannot sign up.' },
  { key: 'pause_purchases',     label: 'Pause challenge purchases', desc: 'Traders cannot buy new challenges.' },
  { key: 'pause_payouts',       label: 'Pause payout requests', desc: 'Funded traders cannot request payouts.' },
  { key: 'pause_trading',       label: 'Freeze trading', desc: 'No new positions can be opened platform-wide.' },
] as const

function EmergencyControls() {
  const [state, setState] = useState<Record<string, boolean> | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [confirmSwitch, setConfirmSwitch] = useState<{ key: string; next: boolean; label: string } | null>(null)

  const load = useCallback(async () => {
    const [r, newsRes] = await Promise.all([
      api.admin.whitelabelGet(),
      api.admin.newsLockGet()
    ])
    if (r.ok) {
      const s: Record<string, boolean> = {}
      for (const sw of SWITCHES) {
        if (sw.key === 'pause_trading') {
          s[sw.key] = r.data[sw.key] === '1' || Boolean(newsRes.ok && newsRes.data?.locked)
        } else {
          s[sw.key] = r.data[sw.key] === '1'
        }
      }
      setState(s)
    }
  }, [])
  useEffect(() => { load() }, [load])

  const executeToggle = async (key: string, next: boolean) => {
    setBusy(key)
    setConfirmSwitch(null)
    const promises: Promise<any>[] = [api.admin.whitelabelSave({ [key]: next ? '1' : '0' })]
    if (key === 'pause_trading') {
      promises.push(api.admin.newsLock(next))
    }
    const [r] = await Promise.all(promises)
    setBusy(null)
    if (r.ok && r.data.success) {
      setState((s) => ({ ...(s || {}), [key]: next }))
      invalidateFxsim('/admin/whitelabel')
      toast.success(next ? 'Enabled — control is now active' : 'Disabled')
    } else toast.error(r.ok ? 'Update failed' : r.error)
  }

  const handleToggleClick = (sw: typeof SWITCHES[number], next: boolean) => {
    if (next) {
      // Activating an emergency kill switch requires confirmation
      setConfirmSwitch({ key: sw.key, next, label: sw.label })
    } else {
      executeToggle(sw.key, next)
    }
  }

  const anyOn = state && Object.values(state).some(Boolean)

  return (
    <div>
      <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Emergency controls</h2>
      {anyOn && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>One or more emergency controls are active. Affected actions are blocked platform-wide until you turn them off.</span>
        </div>
      )}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><PauseCircle className="h-4 w-4" /> Global switches</CardTitle></CardHeader>
        <CardContent className="divide-y divide-border-subtle">
          {!state ? (
            <div className="space-y-3 py-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : SWITCHES.map((sw) => (
            <div key={sw.key} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">{sw.label}</div>
                <div className="text-2xs text-text-muted">{sw.desc}</div>
              </div>
              <button
                role="switch"
                aria-checked={state[sw.key]}
                disabled={busy === sw.key}
                onClick={() => handleToggleClick(sw, !state[sw.key])}
                className={cn('relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50',
                  state[sw.key] ? 'bg-warn' : 'bg-surface-muted')}
              >
                <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                  state[sw.key] ? 'translate-x-6' : 'translate-x-1')} />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>
      <p className="text-2xs text-text-muted mt-2">Changes take effect immediately and are recorded in your settings. Existing open positions are not closed by freezing trading.</p>

      {confirmSwitch && (
        <ConfirmDialog
          isOpen={!!confirmSwitch}
          title={`Activate ${confirmSwitch.label}?`}
          description="Enabling this emergency switch immediately blocks operations platform-wide for all traders until disabled. Are you sure you want to proceed?"
          isDestructive={true}
          confirmText="Activate Emergency Switch"
          loading={busy === confirmSwitch.key}
          onConfirm={() => executeToggle(confirmSwitch.key, confirmSwitch.next)}
          onCancel={() => setConfirmSwitch(null)}
        />
      )}
    </div>
  )
}
