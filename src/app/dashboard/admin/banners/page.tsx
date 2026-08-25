'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Save, Trash2, X } from 'lucide-react'
import { api } from '@/lib/api'
import type { Banner } from '@/types/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/cn'

type Draft = Partial<Banner>

const BLANK: Draft = {
  title: '', message: '', placement: 'both', scope_type: 'global', scope_path: '',
  bg_color: '#7c6ef5', text_color: '#ffffff', cta_label: '', cta_url: '',
  coupon_code: '', starts_at: '', ends_at: '', countdown_to: '', active: 1, priority: 0,
}

const toInput = (v?: string | null) => (v ? v.replace(' ', 'T').slice(0, 16) : '')

/** Human "in 3 hours" / "2 days ago" from a ms delta (always positive input). */
function relTime(ms: number): string {
  const s = Math.round(ms / 1000)
  const m = Math.round(s / 60), h = Math.round(m / 60), d = Math.round(h / 24)
  if (s < 60) return 'less than a minute'
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'}`
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'}`
  return `${d} day${d === 1 ? '' : 's'}`
}

function statusOf(b: Banner): { label: string; tone: 'success' | 'neutral' | 'warn' | 'danger'; detail?: string } {
  if (!b.active) return { label: 'Disabled', tone: 'neutral', detail: 'Turned off — not shown to anyone.' }
  const now = Date.now()
  // Use the timezone-correct ISO fields the API provides; fall back to raw strings.
  const startsAt = b.starts_at_iso || (b.starts_at ? b.starts_at.replace(' ', 'T') : null)
  const endsAt   = b.ends_at_iso   || (b.ends_at   ? b.ends_at.replace(' ', 'T')   : null)
  const cdTo     = b.countdown_to_iso || (b.countdown_to ? b.countdown_to.replace(' ', 'T') : null)
  const startMs = startsAt ? new Date(startsAt).getTime() : null
  const endMs   = endsAt   ? new Date(endsAt).getTime()   : null
  const cdMs    = cdTo     ? new Date(cdTo).getTime()     : null

  if (startMs && now < startMs) return { label: 'Scheduled', tone: 'warn', detail: `Starts in ${relTime(startMs - now)}` }
  if (endMs && now > endMs)     return { label: 'Expired', tone: 'danger', detail: `Ended ${relTime(now - endMs)} ago` }
  if (cdMs && now > cdMs)       return { label: 'Hidden', tone: 'danger', detail: `Countdown ended ${relTime(now - cdMs)} ago` }
  // Active.
  if (endMs)  return { label: 'Active', tone: 'success', detail: `Ends in ${relTime(endMs - now)}` }
  if (cdMs && now < cdMs) return { label: 'Active', tone: 'success', detail: `Countdown ends in ${relTime(cdMs - now)}` }
  return { label: 'Active', tone: 'success', detail: 'Live now — shown to traders.' }
}

export default function AdminBannersPage() {
  const [list, setList] = useState<Banner[] | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = async () => {
    const res = await api.admin.bannersList()
    if (res.ok) setList(res.data)
  }
  useEffect(() => { refresh() }, [])

  const edit = (b: Banner) => setDraft({
    ...b,
    starts_at: toInput(b.starts_at), ends_at: toInput(b.ends_at), countdown_to: toInput(b.countdown_to),
  })
  const create = () => setDraft({ ...BLANK })

  const set = (k: keyof Draft, v: unknown) => setDraft((d) => (d ? { ...d, [k]: v } : d))

  const save = async () => {
    if (!draft) return
    if (!draft.message?.trim()) { toast.error('Message is required.'); return }
    setBusy(true)
    const res = await api.admin.bannerSave(draft)
    setBusy(false)
    if (res.ok && res.data.success) { toast.success('Banner saved.'); setDraft(null); refresh() }
    else toast.error(res.ok ? 'Save failed.' : (res.error || 'Save failed.'))
  }
  const toggle = async (b: Banner) => {
    const next: 0 | 1 = b.active ? 0 : 1
    setList((l) => l ? l.map((x) => x.id === b.id ? { ...x, active: next } : x) : l) // optimistic
    const res = await api.admin.bannerToggle(b.id)
    if (res.ok) {
      const val: 0 | 1 = res.data.active ? 1 : 0
      setList((l) => l ? l.map((x) => x.id === b.id ? { ...x, active: val } : x) : l)
      toast.success(val ? 'Banner enabled' : 'Banner disabled')
    } else {
      setList((l) => l ? l.map((x) => x.id === b.id ? { ...x, active: b.active } : x) : l) // revert
      toast.error('Could not update banner')
    }
    // No refresh() here: the optimistic + API-confirmed value is authoritative.
    // Re-fetching could return a stale cached list and visually roll the toggle
    // back. The mutation already invalidated the public banner feed cache.
  }
  const [toDelete, setToDelete] = useState<Banner | null>(null)
  const remove = async () => {
    if (!toDelete) return
    await api.admin.bannerDelete(toDelete.id); setToDelete(null); refresh()
  }

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Banners</h1>
          <p className="text-sm text-text-muted mt-1">Run promotions and announcements without touching code.</p>
        </div>
        {!draft && <Button onClick={create}><Plus className="h-4 w-4" /> New banner</Button>}
      </div>

      <Dialog open={!!draft} onOpenChange={(o) => { if (!o) setDraft(null) }}>
        {draft && <BannerEditor draft={draft} set={set} onSave={save} onCancel={() => setDraft(null)} busy={busy} />}
      </Dialog>

      <Card>
        <CardHeader><CardTitle>All banners</CardTitle></CardHeader>
        <CardContent className="p-0">
          {!list ? (
            <div className="p-5 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : list.length === 0 ? (
            <div className="p-10 text-center text-sm text-text-muted">No banners yet. Create one to run a promotion.</div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {list.map((b) => {
                const st = statusOf(b)
                return (
                  <div key={b.id} className="flex items-center gap-3 px-4 sm:px-5 py-3">
                    <div className="h-8 w-8 rounded shrink-0 border border-border-subtle" style={{ background: b.bg_color || '#7c6ef5' }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{b.title || b.message}</span>
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </div>
                      <div className="text-2xs text-text-muted mt-0.5">
                        {st.detail && <span className="text-text">{st.detail}</span>}
                        {st.detail && ' · '}{b.placement} · {b.scope_type === 'page' ? b.scope_path : 'global'}{b.priority ? ` · priority ${b.priority}` : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!!b.active}
                      onClick={() => toggle(b)}
                      title={b.active ? 'Enabled — click to disable' : 'Disabled — click to enable'}
                      className={cn('relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
                        b.active ? 'bg-success' : 'bg-surface-muted border border-border')}
                    >
                      <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                        b.active ? 'translate-x-6' : 'translate-x-1')} />
                    </button>
                    <Button size="sm" variant="ghost" onClick={() => edit(b)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => setToDelete(b)} title="Delete"><Trash2 className="h-4 w-4 text-danger" /></Button>
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
            <DialogTitle>Delete banner</DialogTitle>
            <DialogDescription>This permanently removes the banner “{toDelete?.title || toDelete?.message?.slice(0, 40)}”. This can’t be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>Cancel</Button>
            <Button onClick={remove} className="bg-danger hover:bg-danger/90">Delete banner</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function BannerEditor({ draft, set, onSave, onCancel, busy }:
  { draft: Draft; set: (k: keyof Draft, v: unknown) => void; onSave: () => void; onCancel: () => void; busy: boolean }) {
  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{draft.id ? 'Edit banner' : 'New banner'}</DialogTitle>
      </DialogHeader>
      
      <div className="space-y-4 py-2">
        {/* Live preview */}
        <div className="rounded-lg overflow-hidden border border-border-subtle">
          <div className="text-2xs uppercase tracking-wider text-text-faint px-3 py-1.5 bg-bg-subtle">Live preview</div>
          <div className="px-4 py-2.5 flex flex-col sm:flex-row items-center justify-center gap-3 text-center text-sm"
               style={{ background: draft.bg_color || '#7c6ef5', color: draft.text_color || '#ffffff' }}>
            <span className="font-medium">{draft.message || 'Your banner message'}</span>
            {draft.cta_label && draft.cta_url && <span className="rounded-md bg-black/20 px-3 py-1 font-semibold">{draft.cta_label}</span>}
          </div>
          {draft.cta_label && !draft.cta_url && (
            <div className="px-4 pb-2 text-2xs text-warn text-center">Add a CTA link for the button to appear on the live banner.</div>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label>Title (internal)</Label><Input value={draft.title ?? ''} onChange={(e) => set('title', e.target.value)} placeholder="Black Friday" /></div>
          <div><Label>Priority</Label><Input type="number" value={draft.priority ?? 0} onChange={(e) => set('priority', Number(e.target.value))} /></div>
        </div>
        <div><Label>Message *</Label><Textarea value={draft.message ?? ''} onChange={(e) => set('message', e.target.value)} rows={2} placeholder="20% OFF — Weekend Sale!" /></div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Placement</Label>
            <select value={draft.placement} onChange={(e) => set('placement', e.target.value)} className="mt-1 w-full h-9 rounded-lg bg-surface border border-border-subtle px-3 text-sm focus:ring-1 focus:ring-accent focus:border-accent">
              <option value="both">Everywhere — marketing site + trader dashboard</option>
              <option value="dashboard">Trader dashboard only (logged-in)</option>
              <option value="top">Marketing site only (logged-out visitors)</option>
            </select>
          </div>
          <div>
            <Label>Scope</Label>
            <select value={draft.scope_type} onChange={(e) => set('scope_type', e.target.value)} className="mt-1 w-full h-9 rounded-lg bg-surface border border-border-subtle px-3 text-sm focus:ring-1 focus:ring-accent focus:border-accent">
              <option value="global">Global (all pages)</option>
              <option value="page">Specific page</option>
            </select>
          </div>
        </div>
        {draft.scope_type === 'page' && (
          <div><Label>Page path</Label><Input value={draft.scope_path ?? ''} onChange={(e) => set('scope_path', e.target.value)} placeholder="/challenges" /></div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label>CTA label</Label><Input value={draft.cta_label ?? ''} onChange={(e) => set('cta_label', e.target.value)} placeholder="Claim offer" /></div>
          <div><Label>CTA link</Label><Input value={draft.cta_url ?? ''} onChange={(e) => set('cta_url', e.target.value)} placeholder="/challenges" /></div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div><Label>Background</Label><input type="color" value={draft.bg_color || '#7c6ef5'} onChange={(e) => set('bg_color', e.target.value)} className="mt-1 h-9 w-16 rounded bg-transparent border border-border-subtle cursor-pointer" /></div>
            <div><Label>Text</Label><input type="color" value={draft.text_color || '#ffffff'} onChange={(e) => set('text_color', e.target.value)} className="mt-1 h-9 w-16 rounded bg-transparent border border-border-subtle cursor-pointer" /></div>
          </div>
          <div><Label>Coupon code (optional)</Label><Input value={draft.coupon_code ?? ''} onChange={(e) => set('coupon_code', e.target.value)} placeholder="reserved for promotions" /></div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div><Label>Starts</Label><Input type="datetime-local" value={draft.starts_at ?? ''} onChange={(e) => set('starts_at', e.target.value)} /></div>
          <div><Label>Ends</Label><Input type="datetime-local" value={draft.ends_at ?? ''} onChange={(e) => set('ends_at', e.target.value)} /></div>
          <div><Label>Countdown to</Label><Input type="datetime-local" value={draft.countdown_to ?? ''} onChange={(e) => set('countdown_to', e.target.value)} /></div>
        </div>

        <div className="flex items-center gap-2 text-sm pt-2">
          <input type="checkbox" checked={!!draft.active} onChange={(e) => set('active', e.target.checked ? 1 : 0)} className="h-4 w-4 rounded border-border text-accent focus:ring-accent" />
          <Label>Active</Label>
        </div>
      </div>
      
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={onSave} disabled={busy}><Save className="h-4 w-4" /> {busy ? 'Saving…' : 'Save banner'}</Button>
      </DialogFooter>
    </DialogContent>
  )
}
