'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, CreditCard, FileText } from 'lucide-react'
import { api } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import { invalidateFxsim, getSession, apiUrl } from '@/lib/fxsim'
import { fmtUSD, fmtDate, statusLabel, statusTone } from '@/lib/format'
import type { PaymentOrder } from '@/types/api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label, Textarea } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/cn'
import { PayoutReviewQueue } from '@/components/admin/payout-review-queue'

// Proof files are served through an authenticated proxy, not a public URL
// (see admin_payment_proof() in class-rest-api.php) — same pattern as the
// KYC document viewer's openDoc().
async function viewProof(relativePath: string) {
  try {
    const res = await fetch(apiUrl(relativePath), { credentials: 'include', headers: { 'X-WP-Nonce': getSession().nonce || '' } })
    if (!res.ok) throw new Error(String(res.status))
    const blob = await res.blob()
    const obj = URL.createObjectURL(blob)
    window.open(obj, '_blank', 'noopener')
    setTimeout(() => URL.revokeObjectURL(obj), 60_000)
  } catch {
    toast.error('Could not open payment proof')
  }
}

export default function AdminPaymentsPage() {
  const [tab, setTab]       = useState<'payments' | 'payouts'>('payments')
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [actOn,  setActOn]  = useState<{ o: PaymentOrder; action: 'approve' | 'reject' } | null>(null)

  const { data: orders = null, refetch: refresh } = useQuery({
    queryKey: ['admin.paymentsList'],
    queryFn: async () => {
      const res = await api.admin.paymentsList()
      if (!res.ok) throw new Error('Failed to fetch payments')
      return res.data
    },
    refetchInterval: 10_000,
  })

  const filtered = useMemo(() => {
    if (!orders) return []
    return filter === 'all' ? orders : orders.filter((o) => o.status === filter)
  }, [orders, filter])

  const counts = useMemo(() => ({
    pending:  orders?.filter((o) => o.status === 'pending').length  ?? 0,
    approved: orders?.filter((o) => o.status === 'approved').length ?? 0,
    rejected: orders?.filter((o) => o.status === 'rejected').length ?? 0,
    all:      orders?.length ?? 0,
  }), [orders])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
        <p className="text-sm text-text-muted mt-1">Review manual payment orders. Stripe transactions auto-approve on webhook.</p>
      </div>

      {/* Sub-tabs: Payment orders · Payout review (payouts live under Payments; no new sidebar item) */}
      <div className="flex items-center gap-1 border-b border-border-subtle">
        {([['payments', 'Payment orders'], ['payouts', 'Payout review']] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cn(
              'px-3.5 h-9 text-sm font-medium border-b-2 -mb-px transition-colors focus-ring',
              tab === k ? 'border-accent text-text' : 'border-transparent text-text-muted hover:text-text',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'payouts' ? <PayoutReviewQueue /> : (<>
      {/* Filter tabs */}
      <div className="flex gap-1 p-1 rounded-md bg-surface-muted/60 text-2xs w-fit overflow-x-auto no-scrollbar">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'shrink-0 h-7 px-3 rounded transition-colors font-medium capitalize',
              filter === f ? 'bg-bg-subtle text-text shadow-card' : 'text-text-muted hover:text-text',
            )}
          >
            {f} {counts[f] > 0 && <span className="ml-1 text-accent">({counts[f]})</span>}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-bg-subtle/40">
                <Th>Order</Th>
                <Th>User</Th>
                <Th align="right">Amount</Th>
                <Th hideOn="md">Gateway</Th>
                <Th>Status</Th>
                <Th hideOn="lg">Created</Th>
                <Th align="right">{''}</Th>
              </tr>
            </thead>
            <tbody>
              {orders === null && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border-subtle/40"><td colSpan={7} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td></tr>
              ))}
              {orders !== null && filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12">
                  <CreditCard className="h-8 w-8 mx-auto text-text-faint mb-3" />
                  <div className="text-sm text-text-muted">
                    {filter === 'pending' ? 'No pending payments' : `No ${filter} orders`}
                  </div>
                </td></tr>
              )}
              {filtered.map((o, i) => {
                type Extended = PaymentOrder & { user_login?: string; user_email?: string; plan_name?: string }
                const oe = o as Extended
                return (
                  <motion.tr
                    key={o.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.18, delay: Math.min(i * 0.012, 0.2) }}
                    className="border-b border-border-subtle/40 last:border-0 hover:bg-surface-muted/30"
                  >
                    <Td>
                      <div className="font-medium tabular">#{o.id}</div>
                      <div className="text-2xs text-text-muted truncate">{oe.plan_name || `Plan #${o.plan_id}`}</div>
                    </Td>
                    <Td>
                      <div className="font-medium truncate">{oe.user_login || `User #${o.user_id}`}</div>
                      <div className="text-2xs text-text-muted truncate hidden md:block">{oe.user_email}</div>
                    </Td>
                    <Td align="right"><span className="tabular font-medium">{fmtUSD(o.amount)}</span></Td>
                    <Td hideOn="md"><span className="text-text-muted capitalize">{o.gateway}</span></Td>
                    <Td><Badge tone={statusTone(o.status)}>{statusLabel(o.status)}</Badge></Td>
                    <Td hideOn="lg"><span className="text-2xs text-text-muted">{fmtDate(o.created_at)}</span></Td>
                    <Td align="right">
                      {o.status === 'pending' ? (
                        <div className="flex justify-end gap-1">
                          {o.proof_view_url && (
                            <Button variant="outline" size="sm" onClick={() => viewProof(o.proof_view_url!)}>
                              <FileText className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Proof</span>
                            </Button>
                          )}
                          <Button variant="success" size="sm" onClick={() => setActOn({ o, action: 'approve' })}>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Approve</span>
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setActOn({ o, action: 'reject' })}>
                            <XCircle className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Reject</span>
                          </Button>
                        </div>
                      ) : (
                        <span className="text-2xs text-text-faint">—</span>
                      )}
                    </Td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
      </>)}

      {actOn && (
        <PaymentActionDialog
          order={actOn.o}
          action={actOn.action}
          onClose={() => setActOn(null)}
          onSaved={() => { setActOn(null); invalidateFxsim('/admin/payments'); refresh() }}
        />
      )}
    </div>
  )
}

function PaymentActionDialog({ order, action, onClose, onSaved }: {
  order: PaymentOrder
  action: 'approve' | 'reject'
  onClose: () => void
  onSaved: () => void
}) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const isApprove = action === 'approve'

  const submit = async () => {
    if (!isApprove && !note.trim()) { toast.error('Please provide a reason'); return }
    setBusy(true)
    const res = isApprove
      ? await api.admin.paymentApprove(order.id, note.trim())
      : await api.admin.paymentReject(order.id, note.trim())
    setBusy(false)
    if (res.ok && res.data.success) {
      toast.success(`Payment ${isApprove ? 'approved' : 'rejected'}`)
      onSaved()
    } else {
      toast.error(res.ok ? (res.data.message || 'Action failed') : res.error)
    }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isApprove ? 'Approve' : 'Reject'} order #{order.id}</DialogTitle>
          <DialogDescription>{fmtUSD(order.amount)} via {order.gateway}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="note">{isApprove ? 'Internal note (optional)' : 'Reason'}</Label>
          <Textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)}
                    placeholder={isApprove ? 'Visible in audit log' : 'Shared with the customer'} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant={isApprove ? 'success' : 'outline'} onClick={submit} loading={busy}
                  disabled={!isApprove && !note.trim()}>
            {isApprove ? 'Approve' : 'Reject'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Th({ children, align, hideOn }: { children: React.ReactNode; align?: 'right'; hideOn?: 'sm' | 'md' | 'lg' }) {
  return <th className={cn(
    'px-3 py-2.5 text-2xs uppercase tracking-wider text-text-faint font-medium',
    align === 'right' ? 'text-right' : 'text-left',
    hideOn === 'sm' && 'hidden sm:table-cell',
    hideOn === 'md' && 'hidden md:table-cell',
    hideOn === 'lg' && 'hidden lg:table-cell',
  )}>{children}</th>
}
function Td({ children, align, hideOn }: { children: React.ReactNode; align?: 'right'; hideOn?: 'sm' | 'md' | 'lg' }) {
  return <td className={cn(
    'px-3 py-3',
    align === 'right' ? 'text-right' : 'text-left',
    hideOn === 'sm' && 'hidden sm:table-cell',
    hideOn === 'md' && 'hidden md:table-cell',
    hideOn === 'lg' && 'hidden lg:table-cell',
  )}>{children}</td>
}
