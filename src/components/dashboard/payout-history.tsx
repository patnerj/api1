'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import type { PayoutItem, PayoutStatus } from '@/types/api'
import { fmtUSD, fmtDate } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { downloadPayoutCertificatePdf } from '@/lib/certificate-payout-pdf'
import {
  Wallet, CalendarClock, BadgeDollarSign, CheckCircle2, Clock, Search,
  XCircle, Banknote, ExternalLink, Download
} from 'lucide-react'

type Tone = 'success' | 'warn' | 'danger' | 'info' | 'accent' | 'neutral'

const LABEL: Record<PayoutStatus, string> = {
  pending: 'Requested', under_review: 'Under review', approved: 'Approved', paid: 'Paid', rejected: 'Rejected',
}
const TONE: Record<PayoutStatus, Tone> = {
  pending: 'warn', under_review: 'info', approved: 'accent', paid: 'success', rejected: 'danger',
}

/* ── Status timeline: Requested → Under review → Approved → Paid (Rejected = terminal) ── */
const FLOW: PayoutStatus[] = ['pending', 'under_review', 'approved', 'paid']

function PayoutTimeline({ status }: { status: PayoutStatus }) {
  if (status === 'rejected') {
    return (
      <div className="flex items-center gap-2">
        <Node label="Requested" state="done" icon={CheckCircle2} />
        <Connector done />
        <Node label="Rejected" state="error" icon={XCircle} />
      </div>
    )
  }
  const idx = FLOW.indexOf(status)
  const icons = [Clock, Search, CheckCircle2, Banknote]
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
      {FLOW.map((s, i) => (
        <div key={s} className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Node
            label={LABEL[s]}
            state={i < idx ? 'done' : i === idx ? 'current' : 'todo'}
            icon={icons[i]}
          />
          {i < FLOW.length - 1 && <Connector done={i < idx} />}
        </div>
      ))}
    </div>
  )
}

function Connector({ done }: { done?: boolean }) {
  return <div className={`h-0.5 w-5 sm:w-8 rounded -mt-4 ${done ? 'bg-success/50' : 'bg-border'}`} />
}

function Node({ label, state, icon: Icon }: {
  label: string; state: 'done' | 'current' | 'todo' | 'error'
  icon: React.ComponentType<{ className?: string }>
}) {
  const ring =
    state === 'done'    ? 'bg-success-muted text-success border-success/40'
    : state === 'current' ? 'bg-accent-muted text-accent border-accent/40'
    : state === 'error'   ? 'bg-danger-muted text-danger border-danger/40'
    : 'bg-surface-muted text-text-faint border-border'
  return (
    <div className="flex flex-col items-center gap-1 w-[4.5rem] shrink-0">
      <div className={`h-7 w-7 rounded-full border inline-flex items-center justify-center ${ring}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span className={`text-2xs text-center leading-tight ${state === 'todo' ? 'text-text-faint' : 'text-text-muted'}`}>{label}</span>
    </div>
  )
}

/* ── Summary cards: available · next payout · paid to date ── */
export function PayoutSummary({
  available, nextPayoutAt, cycleDays, totalPaid, loading,
}: {
  available: number; nextPayoutAt: string | null; cycleDays: number; totalPaid: number; loading?: boolean
}) {
  if (loading) {
    return <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
      {Array.from({ length: 3 }).map((_, i) => <Card key={i} className="p-5"><Skeleton className="h-14 w-full" /></Card>)}
    </div>
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
      <SummaryCard
        tone="success" icon={Wallet} label="Available to withdraw"
        value={fmtUSD(available)} hint="Across funded accounts in profit"
      />
      <SummaryCard
        tone="accent" icon={CalendarClock} label="Next payout date"
        value={nextPayoutAt ? fmtDate(nextPayoutAt) : '—'}
        hint={nextPayoutAt ? `Every ${cycleDays} days` : 'Pass an evaluation to start a cycle'}
      />
      <SummaryCard
        tone="info" icon={BadgeDollarSign} label="Paid to date"
        value={fmtUSD(totalPaid)} hint="Lifetime payouts received"
      />
    </div>
  )
}

function SummaryCard({ tone, icon: Icon, label, value, hint }: {
  tone: Tone; icon: React.ComponentType<{ className?: string }>; label: string; value: string; hint: string
}) {
  const bg = tone === 'success' ? 'bg-success-muted text-success'
    : tone === 'accent' ? 'bg-accent-muted text-accent'
    : 'bg-info-muted text-info'
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="p-5 h-full">
        <div className="flex items-center gap-2.5 mb-3">
          <div className={`h-9 w-9 rounded-lg inline-flex items-center justify-center ${bg}`}><Icon className="h-4 w-4" /></div>
          <span className="text-2xs uppercase tracking-wider text-text-muted">{label}</span>
        </div>
        <div className="text-2xl font-bold tabular tracking-tight">{value}</div>
        <div className="text-2xs text-text-faint mt-1">{hint}</div>
      </Card>
    </motion.div>
  )
}

/* ── Payout history ── */
export function PayoutHistory({ items, loading }: { items: PayoutItem[] | null; loading?: boolean }) {
  return (
    <Card>
      <CardHeader><CardTitle>Payout history</CardTitle></CardHeader>
      <CardContent className={items && items.length ? 'space-y-3 max-h-[28rem] overflow-y-auto' : 'p-0'}>
        {loading || items === null ? (
          <div className="p-5 space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-text-muted">
            <Banknote className="h-8 w-8 mx-auto text-text-faint mb-2" />
            No payouts yet. Once you request one, you can track it here.
          </div>
        ) : (
          items.map((p) => <PayoutCard key={p.id} p={p} />)
        )}
      </CardContent>
    </Card>
  )
}

function PayoutCard({ p }: { p: PayoutItem }) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await downloadPayoutCertificatePdf(p)
    } catch (e) {
      toast.error('Could not generate the PDF. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="rounded-lg border border-border-subtle p-4 hover:border-border transition-colors">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg font-bold tabular">{fmtUSD(p.trader_amount)}</span>
            <Badge tone={TONE[p.status]}>{LABEL[p.status]}</Badge>
          </div>
          <div className="text-2xs text-text-muted mt-0.5">
            Payout PO-{p.id}
            {p.payment_method ? ` · ${p.payment_method}` : ''}
            {' · '}{p.profit_split_pct}% split
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xs text-text-faint">Requested</div>
          <div className="text-xs text-text-muted tabular">{p.requested_at ? fmtDate(p.requested_at) : '—'}</div>
          {p.processed_at && (
            <>
              <div className="text-2xs text-text-faint mt-1">{p.status === 'rejected' ? 'Reviewed' : 'Processed'}</div>
              <div className="text-xs text-text-muted tabular">{fmtDate(p.processed_at)}</div>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border-subtle/60">
        <PayoutTimeline status={p.status} />
      </div>

      {p.status === 'rejected' && p.admin_note && (
        <p className="mt-3 text-xs rounded-md bg-danger-muted/40 border border-danger/20 px-2.5 py-1.5 text-danger">
          <span className="font-medium">Reason:</span> {p.admin_note}
        </p>
      )}

      {p.status === 'paid' && (
        <div className="mt-3 pt-3 border-t border-border-subtle/60 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-2xs">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {p.tx_reference && (
              <span className="text-text-muted">
                <span className="text-text-faint">Transaction ref:</span> <span className="font-mono text-text">{p.tx_reference}</span>
              </span>
            )}
            {p.proof_url && (
              <a href={p.proof_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-hover inline-flex items-center gap-1">
                <ExternalLink className="h-3 w-3" /> Payment proof
              </a>
            )}
          </div>
          
          <Button variant="ghost" size="sm" onClick={handleDownload} loading={downloading} className="h-7 text-xs px-2.5 bg-success/10 text-success hover:bg-success/20 hover:text-success border border-success/20">
            <Download className="h-3.5 w-3.5 mr-1" /> Certificate
          </Button>
        </div>
      )}
    </div>
  )
}
