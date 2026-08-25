'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { KycInfo, KycStatus } from '@/types/api'
import { fmtDate } from '@/lib/format'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ShieldCheck, ShieldAlert, ShieldQuestion, Clock, ArrowRight, CheckCircle2, X,
} from 'lucide-react'

type Tone = 'success' | 'warn' | 'danger' | 'info' | 'neutral'

const META: Record<KycStatus, {
  tone: Tone; label: string; title: string; icon: React.ComponentType<{ className?: string }>
}> = {
  approved:    { tone: 'success', label: 'Verified',        title: 'KYC Verified',                 icon: ShieldCheck },
  pending:     { tone: 'warn',    label: 'Pending review',  title: 'Verification under review',     icon: Clock },
  rejected:    { tone: 'danger',  label: 'Action required', title: 'Verification needs attention',  icon: ShieldAlert },
  not_started: { tone: 'neutral', label: 'Not started',     title: 'Identity verification required', icon: ShieldQuestion },
}

const RING: Record<Tone, string> = {
  success: 'border-success/30 bg-success-muted/10 shadow-glow-sm',
  warn:    'border-warn/30 bg-warn-muted/10 shadow-glow-sm',
  danger:  'border-danger/30 bg-danger-muted/10 shadow-glow-sm',
  info:    'border-info/30 bg-info-muted/10 shadow-glow-sm',
  neutral: 'border-border-subtle bg-surface-muted/20 shadow-sm',
}
const ICON_BG: Record<Tone, string> = {
  success: 'bg-success/10 text-success',
  warn:    'bg-warn/10 text-warn',
  danger:  'bg-danger/10 text-danger',
  info:    'bg-info/10 text-info',
  neutral: 'bg-text-faint/10 text-text-muted',
}

const ACK_KEY = 'fxsim:kyc-verified-ack'

export function KycStatusCard({ kyc, loading }: { kyc: KycInfo | null; loading?: boolean }) {
  // Once the trader acknowledges the "verified" confirmation, collapse it to a
  // compact badge so it doesn't permanently occupy the dashboard.
  const [acked, setAcked] = useState(false)
  useEffect(() => {
    try { setAcked(localStorage.getItem(ACK_KEY) === '1') } catch { /* private mode */ }
  }, [])
  const acknowledge = () => {
    setAcked(true)
    try { localStorage.setItem(ACK_KEY, '1') } catch { /* private mode */ }
  }

  if (loading || !kyc) {
    return <Card><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
  }

  const status = kyc.status || 'not_started'
  const m = META[status] || META.not_started
  const Icon = m.icon

  // Verified + acknowledged → compact inline badge only.
  if (status === 'approved' && acked) {
    return (
      <div className="flex items-center gap-2 text-2xs text-text-muted">
        <ShieldCheck className="h-3.5 w-3.5 text-success" />
        <span>Identity verified</span>
      </div>
    )
  }

  const body =
    status === 'approved'
      ? 'Your identity is verified — payouts are unlocked on your funded accounts.'
      : status === 'pending'
        ? 'Your documents are being reviewed. We\u2019ll email you as soon as a decision is made.'
        : status === 'rejected'
          ? (kyc.admin_note || 'Your documents couldn\u2019t be verified. Please re-submit clear, valid documents.')
          : 'Complete verification before requesting your first payout.'

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className={RING[m.tone]}>
        <CardContent className="flex items-start gap-3 p-4">
          <div className={`shrink-0 h-10 w-10 rounded-lg inline-flex items-center justify-center ${ICON_BG[m.tone]}`}>
            <Icon className="h-5 w-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{m.title}</span>
              <Badge tone={m.tone}>
                {status === 'approved' && <CheckCircle2 className="h-3 w-3" />}
                {m.label}
              </Badge>
            </div>

            <p className="text-xs text-text-muted mt-1">{body}</p>

            {status === 'rejected' && kyc.admin_note && (
              <p className="text-xs mt-2 rounded-md bg-danger-muted/40 border border-danger/20 px-2.5 py-1.5 text-danger">
                <span className="font-medium">Reviewer note:</span> {kyc.admin_note}
              </p>
            )}

            {status === 'pending' && kyc.submitted_at && (
              <p className="text-2xs text-text-faint mt-1.5">Submitted {fmtDate(kyc.submitted_at, true)}</p>
            )}

            {status === 'approved' && (
              <Button size="sm" variant="outline" className="mt-3" onClick={acknowledge}>Got it</Button>
            )}
            {(status === 'not_started' || status === 'rejected') && (
              <Button asChild size="sm" className="mt-3">
                <Link href="/dashboard/kyc">
                  {status === 'rejected' ? 'Re-submit documents' : 'Start verification'}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
            {status === 'pending' && (
              <Button asChild size="sm" variant="outline" className="mt-3">
                <Link href="/dashboard/kyc">View submission <ArrowRight className="h-3.5 w-3.5" /></Link>
              </Button>
            )}
          </div>

          {status === 'approved' && (
            <button onClick={acknowledge} aria-label="Dismiss" className="shrink-0 p-1 rounded hover:bg-black/10 text-text-muted">
              <X className="h-4 w-4" />
            </button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
