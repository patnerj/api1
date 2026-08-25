'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Plus, Pencil, Layers, Settings2, Shield, TrendingUp, BarChart3, Zap, Info } from 'lucide-react'
import { api } from '@/lib/api'
import { invalidateFxsim } from '@/lib/fxsim'
import { fmtUSD, fmtPct, toNum } from '@/lib/format'
import type { ChallengePlan } from '@/types/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { FloatingActionBar } from '@/components/ui/floating-action-bar'
import { cn } from '@/lib/cn'

import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

/* ───────────────────────────── page ─────────────────────────────── */

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<ChallengePlan[] | null>(null)
  const [editing, setEditing] = useState<Partial<ChallengePlan> | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkEditing, setBulkEditing] = useState(false)
  const [confirmBulkInactive, setConfirmBulkInactive] = useState(false)

  const refresh = useCallback(async () => {
    const res = await api.admin.plansList()
    if (res.ok) {
      setPlans(res.data)
      setSelectedIds(new Set()) // clear selection on refresh
    }
  }, [])
  
  useEffect(() => { refresh() }, [refresh])

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const toggleAll = () => {
    if (!plans) return
    if (selectedIds.size === plans.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(plans.map(p => p.id)))
  }

  const handleBulkStatus = async (isActive: 0 | 1) => {
    if (!plans || selectedIds.size === 0) return
    setBulkBusy(true)
    setConfirmBulkInactive(false)
    try {
      const selectedPlans = plans.filter(p => selectedIds.has(p.id))
      // Fire updates concurrently
      await Promise.all(selectedPlans.map(p => 
        api.admin.planSave({ id: p.id, is_active: isActive })
      ))
      toast.success(`Successfully updated ${selectedIds.size} plans`)
      refresh()
      invalidateFxsim('/admin/plans')
    } catch (e) {
      toast.error('Failed to apply bulk update')
    } finally {
      setBulkBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Challenge plans</h1>
          <p className="text-sm text-text-muted mt-1">Pricing tiers, rules, leverage caps, and trading conditions.</p>
        </div>
        <Button onClick={() => setEditing({ phases: 2, is_active: 1, sort_order: 0, currency: 'USD', refundable_fee: 1, news_window_minutes: 5, evaluation_profit_share: 0 } as Partial<ChallengePlan>)}>
          <Plus className="h-4 w-4" /> New plan
        </Button>
      </div>

      {/* Bulk Actions Bar */}
      <FloatingActionBar
        selectedCount={selectedIds.size}
        onClear={() => setSelectedIds(new Set())}
        actions={
          <>
            <Button size="sm" variant="outline" className="h-8" disabled={bulkBusy} onClick={() => handleBulkStatus(1)}>
              Set Active
            </Button>
            <Button size="sm" variant="outline" className="h-8" disabled={bulkBusy} onClick={() => setConfirmBulkInactive(true)}>
              Set Inactive
            </Button>
            <Button size="sm" variant="primary" className="h-8 shadow-glow" onClick={() => setBulkEditing(true)}>
              Bulk Edit
            </Button>
          </>
        }
      />

      {confirmBulkInactive && (
        <ConfirmDialog
          isOpen={confirmBulkInactive}
          title={`Deactivate ${selectedIds.size} Challenge Plans?`}
          description="Deactivated plans will be hidden from new purchasers on the public pricing page. Existing active challenges under these plans will continue unaffected."
          isDestructive={true}
          confirmText="Deactivate Plans"
          loading={bulkBusy}
          onConfirm={() => handleBulkStatus(0)}
          onCancel={() => setConfirmBulkInactive(false)}
        />
      )}

      {plans === null ? (
        <Card className="p-8"><Skeleton className="h-64 w-full" /></Card>
      ) : plans.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <Layers className="h-8 w-8 mx-auto text-text-faint mb-3" />
          <div className="text-sm">No plans configured yet</div>
          <Button className="mt-4" onClick={() => setEditing({ phases: 2, is_active: 1, sort_order: 0, currency: 'USD', refundable_fee: 1, news_window_minutes: 5 } as Partial<ChallengePlan>)}>
            Create your first plan
          </Button>
        </CardContent></Card>
      ) : (
        <Card className="overflow-hidden border-border-subtle shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-surface-muted/50 border-b border-border-subtle text-xs uppercase text-text-muted">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input 
                      type="checkbox" 
                      className="rounded border-border-subtle text-brand focus:ring-brand"
                      checked={selectedIds.size === plans.length && plans.length > 0}
                      onChange={toggleAll}
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">Plan Name</th>
                  <th className="px-4 py-3 font-medium">Account Size</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Drawdown</th>
                  <th className="px-4 py-3 font-medium">Profit Target</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {plans.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-muted/30 transition-colors">
                    <td className="px-4 py-4">
                      <input 
                        type="checkbox" 
                        className="rounded border-border-subtle text-brand focus:ring-brand"
                        checked={selectedIds.has(p.id)}
                        onChange={() => toggleSelect(p.id)}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-text">{p.name}</div>
                      <div className="text-[10px] text-text-muted mt-0.5">{p.is_instant_funding ? 'Instant Funding' : `${p.phases}-Step`}</div>
                    </td>
                    <td className="px-4 py-4 font-bold tabular">{fmtUSD(p.account_size, { decimals: 0 })}</td>
                    <td className="px-4 py-4 tabular text-text-muted">{fmtUSD(p.price)}</td>
                    <td className="px-4 py-4 text-xs text-text-muted">
                      {p.drawdown_type === 'eod_trailing' ? 'EOD' : p.drawdown_type === 'trailing' ? 'Trailing' : 'Static'}
                    </td>
                    <td className="px-4 py-4 tabular text-text-muted">{fmtPct(p.p1_profit_target)}</td>
                    <td className="px-4 py-4">
                      {p.is_active === 1 
                        ? <Badge tone="success" className="h-5 px-1.5 text-[10px]">Active</Badge> 
                        : <Badge tone="neutral" className="h-5 px-1.5 text-[10px]">Inactive</Badge>}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button 
                        onClick={() => setEditing(p)} 
                        className="p-1.5 rounded-md text-text-muted hover:text-brand hover:bg-brand/10 transition-colors"
                        title="Edit Plan"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {editing && (
        <PlanDialog
          plan={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); invalidateFxsim('/admin/plans'); refresh() }}
        />
      )}

      {bulkEditing && (
        <BulkEditDialog
          selectedCount={selectedIds.size}
          onClose={() => setBulkEditing(false)}
          onApply={async (updates) => {
            if (!plans || selectedIds.size === 0) return
            setBulkBusy(true)
            try {
              const selectedPlans = plans.filter(p => selectedIds.has(p.id))
              await Promise.all(selectedPlans.map(p => 
                api.admin.planSave({ id: p.id, ...updates })
              ))
              toast.success(`Successfully updated ${selectedIds.size} plans`)
              refresh()
              invalidateFxsim('/admin/plans')
              setBulkEditing(false)
              setSelectedIds(new Set())
            } catch (e) {
              toast.error('Failed to apply bulk update')
            } finally {
              setBulkBusy(false)
            }
          }}
        />
      )}
    </div>
  )
}

/* ───────────────────── tabbed plan dialog ──────────────────────── */

const TABS = [
  { key: 'basic',   label: 'Basic Info',   icon: Settings2 },
  { key: 'phases',  label: 'Phase Rules',  icon: Layers },
  { key: 'funded',  label: 'Funded Stage', icon: BarChart3 },
  { key: 'rules',   label: 'Trading Rules',icon: Shield },
  { key: 'scaling', label: 'Scaling Plan', icon: TrendingUp },
] as const
type TabKey = typeof TABS[number]['key']

function PlanDialog({ plan, onClose, onSaved }: {
  plan: Partial<ChallengePlan>
  onClose: () => void
  onSaved: () => void
}) {
  const [draft, setDraft] = useState<Partial<ChallengePlan>>(plan)
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<TabKey>('basic')

  const update = <K extends keyof ChallengePlan>(k: K, v: ChallengePlan[K]) =>
    setDraft((d) => ({ ...d, [k]: v }))

  const submit = async () => {
    if (!draft.name?.trim() || !draft.account_size || !draft.price) {
      toast.error('Name, account size, and price are required'); return
    }
    setBusy(true)
    const res = await api.admin.planSave(draft)
    setBusy(false)
    if (res.ok && res.data.success) {
      toast.success(plan.id ? 'Plan updated' : 'Plan created')
      onSaved()
    } else {
      toast.error(res.ok ? 'Save failed' : res.error)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden flex flex-col md:flex-row gap-0 bg-bg md:h-[650px] max-h-[90vh]">
        
        {/* ── Sidebar Tabs ── */}
        <div className="w-full md:w-56 bg-surface border-b md:border-b-0 md:border-r border-border-subtle p-4 flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-y-auto shrink-0 z-10">
          <div className="hidden md:block px-3 py-2 mb-2">
            <h2 className="font-bold tracking-tight">{plan.id ? 'Edit Plan' : 'New Plan'}</h2>
            <p className="text-xs text-text-muted mt-1 truncate">{draft.name || 'Unnamed plan'}</p>
          </div>
          {TABS.map((t) => {
            const Icon = t.icon
            const active = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap rounded-lg transition-all',
                  active
                    ? 'bg-brand/10 text-brand'
                    : 'text-text-muted hover:text-text hover:bg-surface-muted',
                )}
              >
                <Icon className={cn("h-4 w-4", active ? "text-brand" : "text-text-muted")} />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* ── Main Content Area (Scrollable internally) ── */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          
          <div className="flex-1 overflow-y-auto p-6 lg:p-8">
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              {tab === 'basic' && <TabBasic draft={draft} update={update} />}
              {tab === 'phases' && <TabPhases draft={draft} update={update} />}
              {tab === 'funded' && <TabFunded draft={draft} update={update} />}
              {tab === 'rules' && <TabRules draft={draft} update={update} />}
              {tab === 'scaling' && <TabScaling draft={draft} update={update} />}
            </motion.div>
          </div>

          <div className="p-4 border-t border-border-subtle bg-surface/50 backdrop-blur-md flex justify-end gap-2 sticky bottom-0">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} loading={busy} className="shadow-lg shadow-brand/20">{plan.id ? 'Save changes' : 'Create plan'}</Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  )
}

/* ───────────────── Tab 1: Basic Info ────────────────────────────── */

function TabBasic({ draft, update }: TabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Basic Details</h3>
        <p className="text-xs text-text-muted mb-4">The core information that traders will see when selecting this plan.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <NumOrTextField label="Plan name" value={draft.name} onChange={(v) => update('name', v as string)} text />
          <NumOrTextField label="Account size (USD)" value={draft.account_size} onChange={(v) => update('account_size', v as number)} />
          <NumOrTextField label="Price (USD)" value={draft.price} onChange={(v) => update('price', v as number)} />
          <div className="space-y-1">
            <Label className="text-xs font-medium">Phases</Label>
            <select
              value={draft.phases ?? 2}
              onChange={(e) => update('phases', Number(e.target.value) as number)}
              className="flex h-10 w-full rounded-md border border-border-subtle bg-surface px-3 py-1 text-sm shadow-sm transition-colors focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
            >
              <option value={1}>1-Step Evaluation</option>
              <option value={2}>2-Step Evaluation</option>
              <option value={3}>3-Step Evaluation</option>
            </select>
          </div>
        </div>
      </div>

      <div className="border-t border-border-subtle pt-6">
        <h3 className="text-sm font-semibold mb-3">Configuration</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs font-medium">Drawdown type</Label>
            <select
              value={draft.drawdown_type ?? 'static'}
              onChange={(e) => update('drawdown_type', e.target.value as ChallengePlan['drawdown_type'])}
              className="flex h-10 w-full rounded-md border border-border-subtle bg-surface px-3 py-1 text-sm shadow-sm transition-colors focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
            >
              <option value="static">Static (Balance Based)</option>
              <option value="trailing">Trailing (High Water Mark)</option>
              <option value="eod_trailing">EOD Trailing (End of Day)</option>
            </select>
          </div>
          <NumOrTextField label="Sort order" value={draft.sort_order} onChange={(v) => update('sort_order', v as number)} />
        </div>
      </div>

      <div className="border-t border-border-subtle pt-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <Toggle label="Instant funding (no eval)" value={draft.is_instant_funding === 1} onChange={(v) => update('is_instant_funding', v ? 1 : 0)} />
          <Toggle label="Plan active (visible)" value={draft.is_active === 1} onChange={(v) => update('is_active', v ? 1 : 0)} />
        </div>
      </div>
    </div>
  )
}

/* ───────────────── Tab 2: Phase Rules ──────────────────────────── */

function TabPhases({ draft, update }: TabProps) {
  const phases = toNum(draft.phases) || 2
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-1">Evaluation Phases</h3>
        <p className="text-xs text-text-muted">Define the targets and constraints for each evaluation step.</p>
      </div>
      <div className="flex flex-col gap-6">
        <PhaseRow phase={1} draft={draft} update={update} />
        {phases >= 2 && <PhaseRow phase={2} draft={draft} update={update} />}
        {phases >= 3 && <PhaseRow phase={3} draft={draft} update={update} />}
      </div>
    </div>
  )
}

function PhaseRow({ phase, draft, update }: TabProps & { phase: 1 | 2 | 3 }) {
  const p = `p${phase}_` as const
  type PK = `p${typeof phase}_profit_target` | `p${typeof phase}_max_dd` | `p${typeof phase}_daily_dd` | `p${typeof phase}_min_days` | `p${typeof phase}_max_days`
  const key = (suffix: string) => `${p}${suffix}` as PK
  return (
    <div className="bg-surface-muted/30 border border-border-subtle rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-6 w-6 rounded-full bg-brand/10 text-brand flex items-center justify-center text-xs font-bold">{phase}</div>
        <h4 className="font-semibold text-sm">Phase {phase}</h4>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <NumOrTextField label="Profit target %" value={(draft as Record<string, unknown>)[key('profit_target')] as number} onChange={(v) => update(key('profit_target') as keyof ChallengePlan, v as number)} />
        <NumOrTextField label="Daily DD %" value={(draft as Record<string, unknown>)[key('daily_dd')] as number} onChange={(v) => update(key('daily_dd') as keyof ChallengePlan, v as number)} />
        <NumOrTextField label="Max DD %" value={(draft as Record<string, unknown>)[key('max_dd')] as number} onChange={(v) => update(key('max_dd') as keyof ChallengePlan, v as number)} />
        <NumOrTextField label="Min days" value={(draft as Record<string, unknown>)[key('min_days')] as number} onChange={(v) => update(key('min_days') as keyof ChallengePlan, v as number)} />
        <NumOrTextField label="Max days" value={(draft as Record<string, unknown>)[key('max_days')] as number} onChange={(v) => update(key('max_days') as keyof ChallengePlan, v as number)} />
      </div>
    </div>
  )
}

/* ───────────────── Tab 3: Funded Rules ─────────────────────────── */

function TabFunded({ draft, update }: TabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Funded Stage</h3>
        <p className="text-xs text-text-muted mb-4">Configure payouts and constraints once the trader passes evaluation.</p>
        
        <div className="grid sm:grid-cols-2 gap-4">
          <NumOrTextField label="Profit split % (to trader)" value={draft.funded_profit_split} onChange={(v) => update('funded_profit_split', v as number)} />
          <NumOrTextField label="Funded max DD %" value={draft.funded_max_dd} onChange={(v) => update('funded_max_dd', v as number)} />
          <NumOrTextField label="Evaluation profit share %" value={draft.evaluation_profit_share} onChange={(v) => update('evaluation_profit_share', v as number)} />
          <NumOrTextField label="News window (minutes)" value={draft.news_window_minutes} onChange={(v) => update('news_window_minutes', v as number)} />
        </div>
      </div>

      <div className="border-t border-border-subtle pt-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <Toggle label="Refundable fee (on 1st payout)" value={draft.refundable_fee === 1} onChange={(v) => update('refundable_fee', v ? 1 : 0)} />
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-surface-muted border border-border-subtle p-4 flex gap-3">
        <Info className="h-5 w-5 text-brand shrink-0" />
        <div className="text-xs text-text-muted space-y-2">
          <p>
            <strong className="text-text font-medium">Evaluation profit share:</strong> A FundedNext-style feature where traders receive a % of the profits they earned during evaluation phases upon their first payout.
          </p>
          <p>
            <strong className="text-text font-medium">News window:</strong> Defines the restricted window (minutes before/after) for high-impact news events. Trading is blocked during this time if "News trading" is disabled.
          </p>
        </div>
      </div>
    </div>
  )
}

/* ───────────────── Tab 4: Trading Rules ────────────────────────── */

function TabRules({ draft, update }: TabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Trading Rules</h3>
        <p className="text-xs text-text-muted mb-4">Toggle permitted trading styles and risk management rules.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Toggle label="News trading allowed" value={draft.news_trading === 1} onChange={(v) => update('news_trading', v ? 1 : 0)} />
        <Toggle label="Weekend holding" value={draft.weekend_holding === 1} onChange={(v) => update('weekend_holding', v ? 1 : 0)} />
        <Toggle label="EA / Bots allowed" value={draft.ea_allowed === 1} onChange={(v) => update('ea_allowed', v ? 1 : 0)} />
        <Toggle label="Hedging allowed" value={draft.hedging_allowed === 1} onChange={(v) => update('hedging_allowed', v ? 1 : 0)} />
        <Toggle label="Copy trading allowed" value={draft.copy_trading_allowed === 1} onChange={(v) => update('copy_trading_allowed', v ? 1 : 0)} />
        <Toggle label="Martingale allowed" value={draft.martingale_allowed === 1} onChange={(v) => update('martingale_allowed', v ? 1 : 0)} />
        <Toggle label="Stop loss required" value={draft.stop_loss_required === 1} onChange={(v) => update('stop_loss_required', v ? 1 : 0)} />
        <Toggle label="Strict IP matching" value={draft.ip_matching_required === 1} onChange={(v) => update('ip_matching_required', v ? 1 : 0)} />
      </div>

      <div className="border-t border-border-subtle pt-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <NumOrTextField label="Max leverage (1:X)" value={draft.max_leverage} onChange={(v) => update('max_leverage', v as number)} />
          <NumOrTextField label="Max lot size" value={draft.max_lot_size} onChange={(v) => update('max_lot_size', v as number)} />
          <NumOrTextField label="Max inactivity (days)" value={draft.max_inactivity_days} onChange={(v) => update('max_inactivity_days', v as number)} />
          <NumOrTextField label="Min trade holding (sec)" value={draft.min_trade_seconds} onChange={(v) => update('min_trade_seconds', v as number)} />
          <NumOrTextField label="Margin call level (%)" value={draft.margin_call_level} onChange={(v) => update('margin_call_level', v as number)} />
        </div>
      </div>

      <div className="border-t border-border-subtle pt-6">
        <div className="grid sm:grid-cols-2 gap-4 items-end">
          <Toggle label="Consistency rule enabled" value={draft.consistency_rule === 1} onChange={(v) => update('consistency_rule', v ? 1 : 0)} />
          {draft.consistency_rule === 1 && (
            <NumOrTextField label="Max single-day profit %" value={draft.consistency_pct} onChange={(v) => update('consistency_pct', v as number)} />
          )}
        </div>
      </div>
    </div>
  )
}

/* ───────────────── Tab 5: Scaling Plan ─────────────────────────── */

function TabScaling({ draft, update }: TabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-1">Scaling Plan</h3>
          <p className="text-xs text-text-muted">Reward consistent traders with increased capital.</p>
        </div>
        <Toggle label="Enable Scaling" value={draft.scaling_enabled === 1} onChange={(v) => update('scaling_enabled', v ? 1 : 0)} />
      </div>

      {draft.scaling_enabled === 1 ? (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <NumOrTextField label="Capital growth per scale %" value={draft.scaling_growth_pct} onChange={(v) => update('scaling_growth_pct', v as number)} />
            <NumOrTextField label="Interval (months)" value={draft.scaling_interval_months} onChange={(v) => update('scaling_interval_months', v as number)} />
            <NumOrTextField label="Required profit %" value={draft.scaling_required_profit_pct} onChange={(v) => update('scaling_required_profit_pct', v as number)} />
            <NumOrTextField label="Max balance cap (USD)" value={draft.scaling_max_balance} onChange={(v) => update('scaling_max_balance', v as number)} />
          </div>
          
          <div className="rounded-lg bg-brand/5 border border-brand/20 p-4 flex gap-3">
            <TrendingUp className="h-5 w-5 text-brand shrink-0" />
            <p className="text-xs text-brand/80 leading-relaxed">
              <strong>How scaling works:</strong> Every <em>{toNum(draft.scaling_interval_months) || 4}</em> months, if the trader achieves a net profit of <em>{toNum(draft.scaling_required_profit_pct) || 10}%</em>, their account balance is automatically increased by <em>{toNum(draft.scaling_growth_pct) || 25}%</em>, capped at a maximum of <em>{fmtUSD(draft.scaling_max_balance ?? 2000000, { decimals: 0 })}</em>.
            </p>
          </div>
        </motion.div>
      ) : (
        <div className="rounded-xl border border-dashed border-border-subtle p-8 flex flex-col items-center justify-center text-center bg-surface/30">
          <TrendingUp className="h-8 w-8 text-text-faint mb-3" />
          <h4 className="text-sm font-medium mb-1">Scaling is disabled</h4>
          <p className="text-xs text-text-muted max-w-sm">Traders will remain on their initial account balance forever, regardless of their performance.</p>
        </div>
      )}
    </div>
  )
}

/* ───────────────── shared components ──────────────────────────── */

type TabProps = {
  draft: Partial<ChallengePlan>
  update: <K extends keyof ChallengePlan>(k: K, v: ChallengePlan[K]) => void
}

function NumOrTextField({ label, value, onChange, text }: {
  label: string
  value: number | string | undefined
  onChange: (v: number | string) => void
  text?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-text">{label}</Label>
      <Input
        type="text"
        inputMode={text ? undefined : 'decimal'}
        value={value ?? ''}
        onChange={(e) => onChange(text ? e.target.value : toNum(e.target.value))}
        className="h-10 transition-colors focus:border-brand focus:ring-1 focus:ring-brand shadow-sm"
      />
    </div>
  )
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 px-4 h-12 rounded-xl border border-border-subtle bg-surface hover:bg-surface-muted transition-colors cursor-pointer min-w-0 shadow-sm">
      <span className="text-xs font-medium min-w-0 truncate select-none">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-ring',
          value ? 'bg-brand' : 'bg-surface-muted border border-border-subtle',
        )}
        aria-pressed={value}
      >
        <span className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
          value ? 'translate-x-[18px]' : 'translate-x-[2px]',
        )} />
      </button>
    </label>
  )
}

/* ───────────────── Bulk Edit Dialog ────────────────────────────── */

function BulkEditDialog({ selectedCount, onClose, onApply }: {
  selectedCount: number
  onClose: () => void
  onApply: (updates: Partial<ChallengePlan>) => Promise<void>
}) {
  const [draft, setDraft] = useState<Partial<ChallengePlan>>({})
  const [enabled, setEnabled] = useState<Set<keyof ChallengePlan>>(new Set())
  const [busy, setBusy] = useState(false)

  const toggleField = (key: keyof ChallengePlan, defaultVal: any) => {
    const next = new Set(enabled)
    if (next.has(key)) {
      next.delete(key)
      setDraft(d => { const r = { ...d }; delete r[key]; return r })
    } else {
      next.add(key)
      setDraft(d => ({ ...d, [key]: defaultVal }))
    }
    setEnabled(next)
  }

  const update = <K extends keyof ChallengePlan>(k: K, v: ChallengePlan[K]) =>
    setDraft((d) => ({ ...d, [k]: v }))

  const submit = async () => {
    if (enabled.size === 0) {
      toast.error('Select at least one field to update')
      return
    }
    setBusy(true)
    await onApply(draft)
    setBusy(false)
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl p-0 overflow-hidden bg-bg border-border-strong shadow-glow">
        <DialogHeader className="p-6 border-b border-border-subtle bg-surface-muted/30">
          <DialogTitle className="text-xl">Bulk Edit {selectedCount} Plans</DialogTitle>
          <p className="text-xs text-text-muted mt-1">Select the fields you want to override across all selected plans. Fields left unchecked will remain unchanged.</p>
        </DialogHeader>

        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-5">
          <BulkField 
            label="Drawdown Type" 
            enabled={enabled.has('drawdown_type')} 
            onToggle={() => toggleField('drawdown_type', 'static')}
          >
            <select
              value={draft.drawdown_type ?? 'static'}
              onChange={(e) => update('drawdown_type', e.target.value as ChallengePlan['drawdown_type'])}
              className="flex h-9 w-full rounded-md border border-border-subtle bg-surface px-3 py-1 text-sm shadow-sm transition-colors focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
            >
              <option value="static">Static (Balance Based)</option>
              <option value="trailing">Trailing (High Water Mark)</option>
              <option value="eod_trailing">EOD Trailing (End of Day)</option>
            </select>
          </BulkField>

          <BulkField 
            label="Phases" 
            enabled={enabled.has('phases')} 
            onToggle={() => toggleField('phases', 2)}
          >
            <select
              value={draft.phases ?? 2}
              onChange={(e) => update('phases', Number(e.target.value))}
              className="flex h-9 w-full rounded-md border border-border-subtle bg-surface px-3 py-1 text-sm shadow-sm transition-colors focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
            >
              <option value={1}>1-Step Evaluation</option>
              <option value={2}>2-Step Evaluation</option>
              <option value={3}>3-Step Evaluation</option>
            </select>
          </BulkField>

          <BulkField 
            label="Refundable Fee" 
            enabled={enabled.has('refundable_fee')} 
            onToggle={() => toggleField('refundable_fee', 1)}
          >
            <div className="flex h-9 items-center px-2">
              <Toggle label="Enabled" value={draft.refundable_fee === 1} onChange={(v) => update('refundable_fee', v ? 1 : 0)} />
            </div>
          </BulkField>

          <BulkField 
            label="News Trading Allowed" 
            enabled={enabled.has('news_trading')} 
            onToggle={() => toggleField('news_trading', 1)}
          >
            <div className="flex h-9 items-center px-2">
              <Toggle label="Enabled" value={draft.news_trading === 1} onChange={(v) => update('news_trading', v ? 1 : 0)} />
            </div>
          </BulkField>
          
          <BulkField 
            label="Min Trade Holding (HFT Protection)" 
            enabled={enabled.has('min_trade_seconds')} 
            onToggle={() => toggleField('min_trade_seconds', 15)}
          >
            <div className="flex items-center gap-2 px-2">
              <Input
                type="number"
                value={draft.min_trade_seconds ?? 15}
                onChange={(e) => update('min_trade_seconds', Number(e.target.value))}
                className="h-9 w-24"
              />
              <span className="text-sm text-text-muted">seconds</span>
            </div>
          </BulkField>
          
          <BulkField 
            label="Margin Call Level" 
            enabled={enabled.has('margin_call_level')} 
            onToggle={() => toggleField('margin_call_level', 50)}
          >
            <div className="flex items-center gap-2 px-2">
              <Input
                type="number"
                value={draft.margin_call_level ?? 50}
                onChange={(e) => update('margin_call_level', Number(e.target.value))}
                className="h-9 w-24"
              />
              <span className="text-sm text-text-muted">%</span>
            </div>
          </BulkField>

          <BulkField 
            label="Scaling Enabled" 
            enabled={enabled.has('scaling_enabled')} 
            onToggle={() => toggleField('scaling_enabled', 1)}
          >
            <div className="flex h-9 items-center px-2">
              <Toggle label="Enabled" value={draft.scaling_enabled === 1} onChange={(v) => update('scaling_enabled', v ? 1 : 0)} />
            </div>
          </BulkField>
        </div>

        <DialogFooter className="p-4 border-t border-border-subtle bg-surface-muted/30">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} loading={busy} disabled={enabled.size === 0} className="shadow-lg shadow-brand/20">Apply to {selectedCount} Plans</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function BulkField({ label, enabled, onToggle, children }: { label: string; enabled: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className={cn("grid grid-cols-[1fr,2fr] gap-4 items-center p-3 rounded-lg border transition-colors", enabled ? "border-brand/30 bg-brand/5" : "border-border-subtle bg-surface")}>
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input type="checkbox" className="accent-brand" checked={enabled} onChange={onToggle} />
        <span className={cn("text-sm font-medium transition-colors", enabled ? "text-brand" : "text-text")}>{label}</span>
      </label>
      <div className={cn("transition-opacity", enabled ? "opacity-100" : "opacity-30 pointer-events-none")}>
        {children}
      </div>
    </div>
  )
}
