'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAdminPayoutsListQuery } from '@/hooks/useApi'
import { fmtUSD, fmtDate } from '@/lib/format'
import type { AdminPayoutRow, PayoutStatus } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Search, Banknote, Loader2, Search as Magnify, CheckCircle2, XCircle, Wallet } from 'lucide-react'

type Filter = 'all' | PayoutStatus
const FILTERS: Filter[] = ['pending', 'under_review', 'approved', 'paid', 'rejected', 'all']
const TONE: Record<PayoutStatus, 'warn' | 'info' | 'accent' | 'success' | 'danger'> = {
  pending: 'warn', under_review: 'info', approved: 'accent', paid: 'success', rejected: 'danger',
}
const LABEL: Record<PayoutStatus, string> = {
  pending: 'Requested', under_review: 'Under review', approved: 'Approved', paid: 'Paid', rejected: 'Rejected',
}
const NEXT: Record<PayoutStatus, { status: Exclude<PayoutStatus, 'pending'>; label: string; variant: string }[]> = {
  pending:      [{ status: 'under_review', label: 'Move to Under Review', variant: 'outline' }, { status: 'approved', label: 'Approve', variant: 'primary' }, { status: 'rejected', label: 'Reject', variant: 'ghost' }],
  under_review: [{ status: 'approved', label: 'Approve', variant: 'primary' }, { status: 'paid', label: 'Mark Paid', variant: 'success' }, { status: 'rejected', label: 'Reject', variant: 'ghost' }],
  approved:     [{ status: 'paid', label: 'Mark Paid', variant: 'success' }, { status: 'rejected', label: 'Reject', variant: 'ghost' }],
  paid:         [],
  rejected:     [],
}

export function PayoutReviewQueue() {
  const [filter, setFilter] = useState<Filter>('pending')
  const [query, setQuery] = useState('')
  const [manageFor, setManageFor] = useState<AdminPayoutRow | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [bulkAction, setBulkAction] = useState<'approved' | 'rejected' | null>(null)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkNote, setBulkNote] = useState('')

  const { data: rawRows, isPending, refetch } = useAdminPayoutsListQuery(filter)

  const rows = (rawRows as AdminPayoutRow[]) || null
  const loading = isPending && !rows

  const bulkEligible = filter === 'pending' || filter === 'under_review'

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || !rows) return rows
    return rows.filter((r) =>
      r.username.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || (r.name || '').toLowerCase().includes(q))
  }, [rows, query])

  const toggleOne = (id: number) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSelected((s) => {
    if (!filtered) return s
    if (s.size === filtered.length) return new Set()
    return new Set(filtered.map((r) => r.id))
  })

  const runBulk = async () => {
    if (!bulkAction || selected.size === 0) return
    setBulkBusy(true)
    const res = await api.admin.bulkPayouts(Array.from(selected), bulkAction, bulkNote.trim() || undefined)
    setBulkBusy(false)
    if (res.ok && res.data.success) {
      toast.success(`${res.data.processed} payout${res.data.processed === 1 ? '' : 's'} ${bulkAction}${res.data.failed ? `, ${res.data.failed} skipped` : ''}`)
      setSelected(new Set()); setBulkAction(null); setBulkNote(''); refetch()
    } else toast.error(res.ok ? 'Bulk action failed' : res.error)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex flex-wrap gap-1 p-1 rounded-lg bg-surface border border-border">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setSelected(new Set()); }}
              className={`px-3 h-8 rounded-md text-xs font-medium transition-colors focus-ring ${
                filter === f ? 'bg-background shadow-xs font-semibold text-text' : 'text-text-muted hover:text-text'
              }`}
            >
              {LABEL[f as PayoutStatus] ?? 'All'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 max-w-xs w-full">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search user or email" className="pl-9" />
          </div>
        </div>
      </div>

      {bulkEligible && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-accent/40 bg-accent/5 px-3 py-2">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="flex items-center gap-2 ml-auto">
            <Button size="sm" variant="primary" onClick={() => setBulkAction('approved')}>Approve selected</Button>
            <Button size="sm" variant="ghost" onClick={() => setBulkAction('rejected')}>Reject selected</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
          </div>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            {bulkEligible && <TableHead className="w-10"><input type="checkbox" aria-label="Select all" checked={!!filtered && filtered.length > 0 && selected.size === filtered.length} onChange={toggleAll} className="rounded border-border" /></TableHead>}
            <TableHead>User</TableHead>
            <TableHead align="right">Trader amount</TableHead>
            <TableHead hideOn="md">Method</TableHead>
            <TableHead>Status</TableHead>
            <TableHead hideOn="lg">Requested</TableHead>
            <TableHead align="right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && Array.from({ length: 4 }).map((_, i) => (
            <TableRow key={i}><TableCell colSpan={bulkEligible ? 7 : 6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
          ))}
          {!loading && filtered && filtered.length === 0 && (
            <TableRow><TableCell colSpan={bulkEligible ? 7 : 6} className="text-center py-12">
              <Banknote className="h-8 w-8 mx-auto text-text-faint mb-3" />
              <div className="text-sm text-text-muted">No payouts{filter !== 'all' ? ` (${LABEL[filter as PayoutStatus] ?? filter})` : ''}</div>
            </TableCell></TableRow>
          )}
          {!loading && filtered && filtered.map((r) => (
            <TableRow key={r.id}>
              {bulkEligible && <TableCell><input type="checkbox" aria-label={`Select payout ${r.id}`} checked={selected.has(r.id)} onChange={() => toggleOne(r.id)} className="rounded border-border" /></TableCell>}
              <TableCell>
                <div className="font-semibold truncate">
                  {r.name || r.username}
                </div>
                <div className="text-xs text-text-muted truncate">{r.email}</div>
              </TableCell>
              <TableCell align="right"><span className="tabular font-semibold">{fmtUSD(r.trader_amount)}</span></TableCell>
              <TableCell hideOn="md"><span className="capitalize text-text-muted">{r.payment_method || '—'}</span></TableCell>
              <TableCell><Badge tone={TONE[r.status]} className="rounded-full px-2.5 py-0.5">{LABEL[r.status]}</Badge></TableCell>
              <TableCell hideOn="lg"><span className="text-xs text-text-muted">{r.requested_at ? fmtDate(r.requested_at) : '—'}</span></TableCell>
              <TableCell align="right">
                <Button size="sm" variant="outline" onClick={() => setManageFor(r)}>Manage</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {bulkAction && (
        <Dialog open onOpenChange={(o) => !o && setBulkAction(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{bulkAction === 'approved' ? 'Approve' : 'Reject'} {selected.size} payout{selected.size === 1 ? '' : 's'}?</DialogTitle>
              <DialogDescription>
                This applies to all selected payouts. {bulkAction === 'rejected' ? 'A note is recommended so traders understand why.' : 'Already-finalised items are skipped automatically.'}
              </DialogDescription>
            </DialogHeader>
            <textarea
              value={bulkNote}
              onChange={(e) => setBulkNote(e.target.value)}
              rows={3}
              placeholder={bulkAction === 'rejected' ? 'Reason (sent with each rejection)…' : 'Optional note…'}
              className="w-full rounded-md bg-surface-muted border border-border-subtle px-3 py-2 text-sm resize-y focus-ring"
            />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setBulkAction(null)}>Cancel</Button>
              <Button variant={bulkAction === 'approved' ? 'primary' : 'danger'} loading={bulkBusy} onClick={runBulk}>
                {bulkAction === 'approved' ? 'Approve all' : 'Reject all'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {manageFor && (
        <ManageDialog row={manageFor} onClose={() => setManageFor(null)} onDone={() => { setManageFor(null); refetch() }} />
      )}
    </div>
  )
}

function ManageDialog({ row, onClose, onDone }: { row: AdminPayoutRow; onClose: () => void; onDone: () => void }) {
  const [note, setNote] = useState(row.admin_note ?? '')
  const [txRef, setTxRef] = useState(row.tx_reference ?? '')
  const [proof, setProof] = useState(row.proof_url ?? '')
  const [busy, setBusy] = useState<string | null>(null)
  const transitions = NEXT[row.status]

  const move = async (status: string) => {
    if (status === 'rejected' && !note.trim()) { toast.error('Add a note explaining the rejection.'); return }
    if (status === 'paid' && !txRef.trim()) { toast.error('Add a transaction ID / reference before marking paid.'); return }
    setBusy(status)
    const res = await api.admin.payoutStatus(row.id, status, note.trim(), { tx_reference: txRef.trim(), proof_url: proof.trim() })
    setBusy(null)
    if (res.ok && res.data.success) { toast.success(`Payout marked ${LABEL[status as PayoutStatus] ?? status}`); onDone() }
    else toast.error(res.ok ? (res.data.message || 'Action failed') : res.error)
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage payout · PO-{row.id}</DialogTitle>
          <DialogDescription>{row.name || row.username} · {row.email}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge tone={TONE[row.status]}>{LABEL[row.status]}</Badge>
            {row.requested_at && <span className="text-2xs text-text-muted">Requested {fmtDate(row.requested_at)}</span>}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Stat label="Trader amount" value={fmtUSD(row.trader_amount)} />
            <Stat label="Firm amount" value={fmtUSD(row.firm_amount)} />
            <Stat label="Split" value={`${row.profit_split_pct}%`} />
          </div>

          <div className="rounded-lg border border-border-subtle px-3 py-2.5 text-sm">
            <div className="text-2xs text-text-faint">Payout destination</div>
            <div className="capitalize">{row.payment_method || '—'}</div>
            {row.payment_address && <div className="text-2xs text-text-muted break-all mt-0.5">{row.payment_address}</div>}
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="po-tx">Transaction ID / reference</Label>
              <Input id="po-tx" value={txRef} onChange={(e) => setTxRef(e.target.value)}
                placeholder="e.g. TX hash or bank reference" className="font-mono" />
              <p className="text-2xs text-text-faint">Required to mark a payout as paid.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="po-proof">Proof URL <span className="text-text-faint font-normal">(optional)</span></Label>
              <Input id="po-proof" value={proof} onChange={(e) => setProof(e.target.value)}
                placeholder="https://… receipt or explorer link" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="po-note">Admin note <span className="text-text-faint font-normal">(required to reject)</span></Label>
              <Textarea id="po-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2}
                placeholder="Internal or trader-visible note." />
            </div>
          </div>

          {transitions.length === 0 && (
            <p className="text-2xs text-text-faint">This payout is in a terminal state — no further actions.</p>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2">
          {transitions.map((t) => (
            <Button key={t.status} variant={t.variant as 'primary' | 'success' | 'outline' | 'ghost'} disabled={!!busy} onClick={() => move(t.status)}>
              {busy === t.status
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : t.status === 'paid' ? <Wallet className="h-4 w-4" />
                : t.status === 'approved' ? <CheckCircle2 className="h-4 w-4" />
                : t.status === 'rejected' ? <XCircle className="h-4 w-4" />
                : <Magnify className="h-4 w-4" />}
              {t.label}
            </Button>
          ))}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2.5 rounded-md bg-surface-muted/50 border border-border-subtle">
      <div className="text-2xs text-text-muted truncate">{label}</div>
      <div className="text-sm font-medium tabular">{value}</div>
    </div>
  )
}
