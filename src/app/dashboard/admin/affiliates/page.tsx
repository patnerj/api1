'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Users2, Check, RotateCcw, Ban, Play, ArrowUpRight, ExternalLink } from 'lucide-react'
import { api } from '@/lib/api'
import type { AdminAffiliate, Commission, AffiliatePayout } from '@/types/api'
import { fmtUSD, timeAgo } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

const cTone = (s: Commission['status']) =>
  s === 'paid' ? 'success' : s === 'reversed' ? 'danger' : s === 'approved' ? 'info' : 'warn'

const FILTERS = ['all', 'pending', 'approved', 'paid', 'reversed'] as const

export default function AdminAffiliatesPage() {
  const [affs, setAffs] = useState<AdminAffiliate[] | null>(null)
  const [commissions, setCommissions] = useState<Commission[] | null>(null)
  const [filter, setFilter] = useState<typeof FILTERS[number]>('all')
  const [rateEdits, setRateEdits] = useState<Record<number, string>>({})

  const loadAffs = async () => { const r = await api.admin.affiliatesList(); if (r.ok) setAffs(r.data) }
  const loadCommissions = async (f = filter) => {
    const r = await api.admin.commissionsList(f === 'all' ? undefined : f)
    if (r.ok) setCommissions(r.data)
  }
  useEffect(() => { loadAffs(); loadCommissions('all') }, [])

  const setRate = async (a: AdminAffiliate) => {
    const v = parseFloat(rateEdits[a.id] ?? String(a.rate_percent))
    if (isNaN(v)) return
    const r = await api.admin.affiliateRate(a.id, v)
    if (r.ok) { toast.success(`Rate set to ${v}%`); loadAffs() }
  }
  const toggleStatus = async (a: AdminAffiliate) => {
    const next = a.status === 'active' ? 'suspended' : 'active'
    const r = await api.admin.affiliateStatus(a.id, next)
    if (r.ok) { toast.success(`Affiliate ${next}`); loadAffs() }
  }
  const setCommission = async (c: Commission, status: 'approved' | 'paid' | 'reversed') => {
    const r = await api.admin.commissionStatus(c.id, status)
    if (r.ok) { toast.success(`Marked ${status}`); loadCommissions(); loadAffs() }
  }
  const applyFilter = (f: typeof FILTERS[number]) => { setFilter(f); setCommissions(null); loadCommissions(f) }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Affiliates</h1>
        <p className="text-sm text-text-muted mt-1">Manage referral partners and pay out commissions. Payouts are manual in this version.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Affiliates</CardTitle></CardHeader>
        <CardContent className="p-0">
          {!affs ? (
            <div className="p-5 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : affs.length === 0 ? (
            <div className="p-10 text-center text-sm text-text-muted">No affiliates yet. Affiliate accounts will appear here once traders join your referral programme.</div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {affs.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center gap-3 px-4 sm:px-5 py-3">
                  <div className="h-9 w-9 rounded bg-accent-muted text-accent flex items-center justify-center shrink-0"><Users2 className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{a.display_name || a.user_login}</span>
                      <Badge tone={a.status === 'active' ? 'success' : 'neutral'}>{a.status}</Badge>
                      <span className="text-2xs text-text-muted font-mono">{a.code}</span>
                    </div>
                    <div className="text-2xs text-text-muted mt-0.5">
                      {a.referrals} referrals · {a.conversions} conversions · {fmtUSD(a.unpaid)} unpaid · {fmtUSD(a.paid)} paid
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input type="number" defaultValue={a.rate_percent}
                      onChange={(e) => setRateEdits((m) => ({ ...m, [a.id]: e.target.value }))}
                      className="w-20 h-9" />
                    <span className="text-xs text-text-muted">%</span>
                    <Button size="sm" variant="outline" onClick={() => setRate(a)}>Set</Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleStatus(a)} title={a.status === 'active' ? 'Suspend' : 'Activate'}>
                      {a.status === 'active' ? <Ban className="h-4 w-4 text-danger" /> : <Play className="h-4 w-4 text-success" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AffiliatePayoutsCard />

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle>Commission ledger</CardTitle>
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <button key={f} onClick={() => applyFilter(f)}
                className={`text-2xs rounded-full px-2.5 py-1 border capitalize ${filter === f ? 'bg-accent-muted border-accent text-accent' : 'border-border-subtle text-text-muted hover:bg-surface-muted'}`}>
                {f}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!commissions ? (
            <div className="p-5 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : commissions.length === 0 ? (
            <div className="p-10 text-center text-sm text-text-muted">No commissions yet. Earnings will appear here as referred traders purchase challenges.</div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {commissions.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center gap-3 px-4 sm:px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm tabular">{fmtUSD(c.amount)}</span>
                      <Badge tone={cTone(c.status)}>{c.status}</Badge>
                    </div>
                    <div className="text-2xs text-text-muted mt-0.5">
                      {c.affiliate_login} ← {c.referred_login || 'user'} · order #{c.order_id} · {c.rate_percent}% of {fmtUSD(c.base_amount)} · {timeAgo(c.created_at_iso || c.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {c.status !== 'paid' && c.status !== 'reversed' && (
                      <Button size="sm" variant="outline" onClick={() => setCommission(c, 'paid')}><Check className="h-4 w-4 text-success" /> Mark paid</Button>
                    )}
                    {c.status !== 'reversed' && (
                      <Button size="sm" variant="ghost" onClick={() => setCommission(c, 'reversed')} title="Reverse"><RotateCcw className="h-4 w-4 text-danger" /></Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

const PFILTERS = ['pending', 'approved', 'paid', 'rejected', 'all'] as const
const pTone = (s: AffiliatePayout['status']) =>
  s === 'paid' ? 'success' : s === 'rejected' ? 'danger' : s === 'approved' ? 'info' : 'warn'
const PMETHOD: Record<string, string> = { usdt_trc20: 'USDT (TRC20)', usdt_bep20: 'USDT (BEP20)', wise: 'Wise' }

function AffiliatePayoutsCard() {
  const [rows, setRows] = useState<AffiliatePayout[] | null>(null)
  const [filter, setFilter] = useState<typeof PFILTERS[number]>('pending')
  const [active, setActive] = useState<AffiliatePayout | null>(null)
  const [tx, setTx] = useState('')
  const [proof, setProof] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async (f = filter) => {
    const r = await api.admin.affiliatePayouts(f === 'all' ? undefined : f)
    if (r.ok) {
      setRows(r.data)
    } else {
      setRows([])
      toast.error(r.error || 'Failed to load affiliate payouts')
    }
  }
  useEffect(() => { load('pending') }, [])

  const openRow = (p: AffiliatePayout) => { setActive(p); setTx(p.tx_reference || ''); setProof(p.proof_url || ''); setNote(p.admin_note || '') }

  const act = async (status: 'approved' | 'rejected' | 'paid') => {
    if (!active) return
    if (status === 'paid' && !tx.trim()) { toast.error('Add a transaction reference for paid payouts.'); return }
    setBusy(true)
    const r = await api.admin.affiliatePayoutStatus(active.id, { status, tx_reference: tx.trim(), proof_url: proof.trim(), note: note.trim() })
    setBusy(false)
    if (r.ok && r.data.success) { toast.success(`Payout ${status}.`); setActive(null); load() }
    else toast.error(r.ok ? (r.data.message || 'Action failed.') : r.error)
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle>Affiliate payouts</CardTitle>
        <div className="flex flex-wrap gap-1">
          {PFILTERS.map((f) => (
            <button key={f} onClick={() => { setFilter(f); load(f) }}
              className={`px-2.5 py-1 text-2xs font-medium rounded-md capitalize ${filter === f ? 'bg-accent text-white' : 'text-text-muted hover:text-text'}`}>{f}</button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {!rows ? (
          <div className="p-5 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-text-muted">No affiliate payouts yet. Requests will appear here once affiliates reach the payout threshold.</div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {rows.map((p) => (
              <div key={p.id}>
                <div className="flex flex-wrap items-center gap-3 px-4 sm:px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm tabular">{fmtUSD(Number(p.amount))}</span>
                      <Badge tone={pTone(p.status)}>{p.status}</Badge>
                    </div>
                    <div className="text-2xs text-text-muted mt-0.5 break-all">
                      {p.display_name || p.user_login} · {PMETHOD[p.method] || p.method} · <span className="font-mono">{p.destination}</span> · {timeAgo(p.created_at_iso || p.created_at)}
                      {p.tx_reference ? <> · ref <span className="font-mono">{p.tx_reference}</span></> : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {p.proof_url && <a href={p.proof_url} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-text" title="Proof"><ExternalLink className="h-4 w-4" /></a>}
                    {p.status !== 'paid' && p.status !== 'rejected' && (
                      <Button size="sm" variant="outline" onClick={() => openRow(p)}><ArrowUpRight className="h-4 w-4" /> Process</Button>
                    )}
                  </div>
                </div>
                {active?.id === p.id && (
                  <div className="px-4 sm:px-5 pb-4 space-y-2.5 bg-bg-subtle/40">
                    <div className="grid sm:grid-cols-3 gap-2 pt-3">
                      <Input value={tx} onChange={(e) => setTx(e.target.value)} placeholder="Transaction hash / reference" className="h-9" />
                      <Input value={proof} onChange={(e) => setProof(e.target.value)} placeholder="Proof URL (optional)" className="h-9" />
                      <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="h-9" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" disabled={busy} onClick={() => act('paid')}><Check className="h-4 w-4 text-success" /> Mark paid</Button>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => act('approved')}>Approve</Button>
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => act('rejected')}><Ban className="h-4 w-4 text-danger" /> Reject</Button>
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => setActive(null)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
