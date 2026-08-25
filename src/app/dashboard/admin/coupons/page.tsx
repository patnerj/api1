'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Save, Trash2, X, Ticket } from 'lucide-react'
import { cn } from '@/lib/cn'
import { api } from '@/lib/api'
import type { Coupon, ChallengePlan } from '@/types/api'
import { fmtUSD } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

type Draft = Partial<Coupon> & { plan_ids_arr?: number[] }

const BLANK: Draft = {
  code: '', type: 'percent', value: 10, currency: 'USD', expires_at: '',
  usage_limit: 0, per_user_limit: 0, active: 1, plan_ids_arr: [],
}

const toInput = (v?: string | null) => (v ? v.replace(' ', 'T').slice(0, 16) : '')
const parsePlanIds = (csv?: string | null) => (csv ? csv.split(',').map((n) => parseInt(n, 10)).filter(Boolean) : [])

function statusOf(c: Coupon): { label: string; tone: 'success' | 'neutral' | 'danger' } {
  if (!c.active) return { label: 'Inactive', tone: 'neutral' }
  if (c.expires_at && Date.now() > new Date(c.expires_at.replace(' ', 'T')).getTime()) return { label: 'Expired', tone: 'danger' }
  if (c.usage_limit > 0 && c.used_count >= c.usage_limit) return { label: 'Used up', tone: 'danger' }
  return { label: 'Active', tone: 'success' }
}

export default function AdminCouponsPage() {
  const [list, setList] = useState<Coupon[] | null>(null)
  const [plans, setPlans] = useState<ChallengePlan[]>([])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = async () => { const r = await api.admin.couponsList(); if (r.ok) setList(r.data) }
  useEffect(() => {
    refresh()
    api.admin.plansList().then((r) => { if (r.ok) setPlans(r.data) })
  }, [])

  const create = () => setDraft({ ...BLANK })
  const edit = (c: Coupon) => setDraft({ ...c, expires_at: toInput(c.expires_at), plan_ids_arr: parsePlanIds(c.plan_ids) })
  const set = (k: keyof Draft, v: unknown) => setDraft((d) => (d ? { ...d, [k]: v } : d))

  const togglePlan = (id: number) => setDraft((d) => {
    if (!d) return d
    const cur = d.plan_ids_arr || []
    return { ...d, plan_ids_arr: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] }
  })

  const save = async () => {
    if (!draft) return
    if (!draft.code?.trim()) { toast.error('Coupon code is required.'); return }
    setBusy(true)
    const res = await api.admin.couponSave({
      id: draft.id, code: draft.code, type: draft.type, value: draft.value, currency: draft.currency,
      expires_at: draft.expires_at, usage_limit: draft.usage_limit, per_user_limit: draft.per_user_limit,
      active: draft.active, plan_ids: draft.plan_ids_arr,
    })
    setBusy(false)
    if (res.ok && res.data.success) { toast.success('Coupon saved.'); setDraft(null); refresh() }
    else toast.error(res.ok ? (res.data.message || 'Save failed.') : (res.error || 'Save failed.'))
  }
  const toggle = async (c: Coupon) => {
    const next: 0 | 1 = c.active ? 0 : 1
    setList((l) => l ? l.map((x) => x.id === c.id ? { ...x, active: next } : x) : l) // optimistic
    const res = await api.admin.couponToggle(c.id)
    if (res.ok) {
      const val: 0 | 1 = res.data.active ? 1 : 0
      setList((l) => l ? l.map((x) => x.id === c.id ? { ...x, active: val } : x) : l)
      toast.success(val ? 'Coupon enabled' : 'Coupon disabled')
    } else {
      setList((l) => l ? l.map((x) => x.id === c.id ? { ...x, active: c.active } : x) : l) // revert
      toast.error('Could not update coupon')
    }
    // No refresh() here: the optimistic + API-confirmed value is authoritative.
  }
  const [toDelete, setToDelete] = useState<Coupon | null>(null)
  const remove = async () => { if (!toDelete) return; await api.admin.couponDelete(toDelete.id); setToDelete(null); refresh() }

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Coupons</h1>
          <p className="text-sm text-text-muted mt-1">Run promotions and discounts on challenge purchases.</p>
        </div>
        {!draft && <Button onClick={create}><Plus className="h-4 w-4" /> New coupon</Button>}
      </div>

      <Dialog open={!!draft} onOpenChange={(o) => { if (!o) setDraft(null) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{draft?.id ? 'Edit coupon' : 'New coupon'}</DialogTitle>
          </DialogHeader>
          
          {draft && (
            <div className="space-y-4 py-2">
              <div className="grid sm:grid-cols-3 gap-4">
                <div><Label>Code *</Label><Input value={draft.code ?? ''} onChange={(e) => set('code', e.target.value.toUpperCase())} className="uppercase" placeholder="WEEKEND20" /></div>
                <div>
                  <Label>Type</Label>
                  <select value={draft.type} onChange={(e) => set('type', e.target.value)} className="mt-1 w-full h-9 rounded-lg bg-surface border border-border-subtle px-3 text-sm focus:ring-1 focus:ring-accent focus:border-accent">
                    <option value="percent">Percentage %</option>
                    <option value="fixed">Fixed amount</option>
                  </select>
                </div>
                <div><Label>{draft.type === 'percent' ? 'Percent off' : 'Amount off'}</Label><Input type="number" value={draft.value ?? 0} onChange={(e) => set('value', Number(e.target.value))} /></div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div><Label>Expiry (optional)</Label><Input type="datetime-local" value={draft.expires_at ?? ''} onChange={(e) => set('expires_at', e.target.value)} /></div>
                <div><Label>Total usage limit (0 = ∞)</Label><Input type="number" value={draft.usage_limit ?? 0} onChange={(e) => set('usage_limit', Number(e.target.value))} /></div>
                <div><Label>Per-user limit (1 = one-time)</Label><Input type="number" value={draft.per_user_limit ?? 0} onChange={(e) => set('per_user_limit', Number(e.target.value))} /></div>
              </div>

              <div>
                <Label>Applies to plans (none selected = all plans)</Label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {plans.map((p) => {
                    const on = (draft.plan_ids_arr || []).includes(p.id)
                    return (
                      <button key={p.id} onClick={() => togglePlan(p.id)}
                        className={`text-xs rounded-full px-3 py-1.5 border transition-all duration-200 ${on ? 'bg-accent-muted border-accent text-accent shadow-sm' : 'border-border-subtle text-text-muted hover:bg-surface hover:border-border hover:text-text'}`}>
                        {p.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm pt-2">
                <input type="checkbox" checked={!!draft.active} onChange={(e) => set('active', e.target.checked ? 1 : 0)} className="h-4 w-4 rounded border-border text-accent focus:ring-accent" />
                <Label>Active</Label>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
            <Button onClick={save} disabled={busy}><Save className="h-4 w-4" /> {busy ? 'Saving…' : 'Save coupon'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader><CardTitle>All coupons</CardTitle></CardHeader>
        <CardContent className="p-0">
          {!list ? (
            <div className="p-5 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : list.length === 0 ? (
            <div className="p-10 text-center text-sm text-text-muted">No coupons yet. Create your first discount code to run a promotion.</div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {list.map((c) => {
                const st = statusOf(c)
                return (
                  <div key={c.id} className="flex items-center gap-3 px-4 sm:px-5 py-3">
                    <div className="h-9 w-9 rounded bg-accent-muted text-accent flex items-center justify-center shrink-0"><Ticket className="h-4 w-4" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm tabular">{c.code}</span>
                        <Badge tone={st.tone}>{st.label}</Badge>
                        <span className="text-xs text-text-muted">{c.type === 'percent' ? `${c.value}% off` : `${fmtUSD(c.value)} off`}</span>
                      </div>
                      <div className="text-2xs text-text-muted mt-0.5">
                        {c.uses ?? 0} use{(c.uses ?? 0) === 1 ? '' : 's'}
                        {c.usage_limit > 0 ? ` / ${c.usage_limit}` : ''} · revenue {fmtUSD(c.revenue ?? 0)}
                        {(c.discount_total ?? 0) > 0 ? ` · discounted ${fmtUSD(c.discount_total ?? 0)}` : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!!c.active}
                      onClick={() => toggle(c)}
                      title={c.active ? 'Enabled — click to disable' : 'Disabled — click to enable'}
                      className={cn('relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
                        c.active ? 'bg-success' : 'bg-surface-muted border border-border')}
                    >
                      <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                        c.active ? 'translate-x-6' : 'translate-x-1')} />
                    </button>
                    <Button size="sm" variant="ghost" onClick={() => edit(c)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => setToDelete(c)} title="Delete"><Trash2 className="h-4 w-4 text-danger" /></Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
      <Dialog open={!!toDelete} onOpenChange={(o) => { if (!o) setToDelete(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete coupon</DialogTitle>
            <DialogDescription>This permanently removes the coupon “{toDelete?.code}”. Existing customers who already used it are unaffected.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>Cancel</Button>
            <Button onClick={remove} className="bg-danger hover:bg-danger/90">Delete coupon</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
