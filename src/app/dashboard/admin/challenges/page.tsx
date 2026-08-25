'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Trophy } from 'lucide-react'
import { api } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import { fmtUSD, fmtDate, toNum, statusLabel, statusTone, pnlClass } from '@/lib/format'
import type { ChallengeAccount } from '@/types/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/cn'
import { PayoutReviewQueue } from '@/components/admin/payout-review-queue'

interface PendingPayout {
  id:           number
  challenge_id: number
  user_id:      number
  user_login:   string
  amount:       number | string
  trader_amount: number | string
  firm_amount:  number | string
  method:       string
  address:      string
  status:       string
  requested_at: string
}

interface AdminChallengesResp {
  challenges:      ChallengeAccount[]
  pending_payouts: PendingPayout[]
}

export default function AdminChallengesPage() {
  const [tab, setTab]   = useState<'all' | 'payouts'>('all')

  const { data, refetch } = useQuery({
    queryKey: ['admin.challenges'],
    queryFn: async () => {
      const res = await api.admin.challenges()
      if (!res.ok) throw new Error(res.error || 'Failed to load challenges')
      return res.data as AdminChallengesResp
    },
    refetchInterval: 10_000,
  })

  const challenges = data?.challenges ?? null

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Challenge management</h1>
        <p className="text-sm text-text-muted mt-1">Review payout requests, monitor active evaluations, audit funded accounts.</p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 p-1 rounded-md bg-surface-muted/60 text-2xs w-fit">
        {(['payouts', 'all'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'h-7 px-4 rounded transition-colors font-medium',
              tab === t ? 'bg-bg-subtle text-text shadow-card' : 'text-text-muted hover:text-text',
            )}
          >
            {t === 'payouts'
              ? 'Payouts'
              : `All challenges${challenges ? ` (${challenges.length})` : ''}`}
          </button>
        ))}
      </div>

      {tab === 'payouts' ? (
        <PayoutReviewQueue />
      ) : (
        <ChallengesList challenges={challenges} onRefresh={refetch} />
      )}
    </div>
  )
}


import { FloatingActionBar } from '@/components/ui/floating-action-bar'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { toast } from 'sonner'

function ChallengesList({ challenges, onRefresh }: { challenges: ChallengeAccount[] | null; onRefresh?: () => void }) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [isProcessing, setIsProcessing] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'reset' | 'promote' | 'suspend' | null>(null)

  const toggleAll = () => {
    if (!challenges) return
    if (selected.size === challenges.length) setSelected(new Set())
    else setSelected(new Set(challenges.map(c => c.id)))
  }

  const toggleOne = (id: number) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const handleExecuteBulk = async () => {
    if (!confirmAction || selected.size === 0) return
    setIsProcessing(true)
    const ids = Array.from(selected)
    let succeeded = 0
    let failed = 0

    for (const id of ids) {
      try {
        if (confirmAction === 'reset') {
          const r = await api.admin.testToolsSet(id, 'reset')
          if (r.ok && r.data?.success) succeeded++
          else failed++
        } else if (confirmAction === 'promote') {
          const r = await api.admin.testToolsSet(id, 'funded')
          if (r.ok && r.data?.success) succeeded++
          else failed++
        } else if (confirmAction === 'suspend') {
          // Was calling testToolsSet(id, 'reset') — the same action as the
          // "Reset" button, which wipes trade/position history. 'suspend' is
          // a real, non-destructive backend action (added alongside this fix).
          const r = await api.admin.testToolsSet(id, 'suspend')
          if (r.ok && r.data?.success) succeeded++
          else failed++
        }
      } catch {
        failed++
      }
    }

    setIsProcessing(false)
    setConfirmAction(null)
    setSelected(new Set())

    if (failed === 0) {
      toast.success(`Successfully processed ${succeeded} challenge accounts.`)
    } else {
      toast.info(`Processed ${succeeded} accounts (${failed} failed or skipped).`)
    }
    onRefresh?.()
  }

  if (challenges === null) return <Card className="p-6"><Skeleton className="h-48 w-full" /></Card>
  if (challenges.length === 0) {
    return <Card><CardContent className="p-12 text-center text-sm text-text-muted">
      <Trophy className="h-8 w-8 mx-auto text-text-faint mb-3" />
      No challenges yet
    </CardContent></Card>
  }
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <input type="checkbox" className="accent-accent" checked={selected.size === challenges.length && challenges.length > 0} onChange={toggleAll} />
            </TableHead>
            <TableHead>User</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead align="center" hideOn="sm">Phase</TableHead>
            <TableHead align="right">P&L</TableHead>
            <TableHead>Status</TableHead>
            <TableHead hideOn="md">Started</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {challenges.map((c, i) => {
            const profit = toNum(c.current_balance) - toNum(c.starting_balance)
            const isSelected = selected.has(c.id)
            return (
              <TableRow
                key={c.id}
                className={cn(isSelected && "bg-accent/10")}
              >
                <TableCell>
                  <input type="checkbox" className="accent-accent" checked={isSelected} onChange={() => toggleOne(c.id)} />
                </TableCell>
                <TableCell>
                  <div className="font-semibold truncate">{(c as ChallengeAccount & { user_login?: string }).user_login || `User #${c.user_id}`}</div>
                </TableCell>
                <TableCell>
                  <div className="text-text font-semibold">{c.plan_name || `Plan #${c.plan_id}`}</div>
                  <div className="text-xs text-text-muted tabular">{fmtUSD(c.account_size ?? 0, { decimals: 0 })}</div>
                </TableCell>
                <TableCell align="center" hideOn="sm"><span className="tabular font-medium">{c.phase}</span></TableCell>
                <TableCell align="right"><span className={cn('tabular font-bold', pnlClass(profit))}>{fmtUSD(profit, { sign: true })}</span></TableCell>
                <TableCell><Badge tone={statusTone(c.status)} pulsing={c.status === 'active' || c.status === 'funded'} className="rounded-full px-2.5 py-0.5">{statusLabel(c.status)}</Badge></TableCell>
                <TableCell hideOn="md"><span className="text-xs text-text-muted">{fmtDate(c.created_at)}</span></TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <FloatingActionBar
        selectedCount={selected.size}
        onClear={() => setSelected(new Set())}
        actions={
          <>
            <Button size="sm" variant="outline" className="h-8" onClick={() => setConfirmAction('suspend')}>Suspend</Button>
            <Button size="sm" variant="danger" className="h-8" onClick={() => setConfirmAction('reset')}>Reset</Button>
            <Button size="sm" variant="success" className="h-8" onClick={() => setConfirmAction('promote')}>Promote</Button>
          </>
        }
      />

      {confirmAction && (
        <ConfirmDialog
          isOpen={!!confirmAction}
          title={
            confirmAction === 'reset'
              ? `Reset ${selected.size} Challenge Accounts?`
              : confirmAction === 'promote'
              ? `Promote ${selected.size} Accounts to Funded?`
              : `Suspend ${selected.size} Challenge Accounts?`
          }
          description={`Are you sure you want to perform bulk ${confirmAction} on ${selected.size} selected account(s)? This action takes effect immediately.`}
          isDestructive={confirmAction === 'reset' || confirmAction === 'suspend'}
          confirmText={isProcessing ? 'Processing...' : `Execute Bulk ${confirmAction.toUpperCase()}`}
          loading={isProcessing}
          onConfirm={handleExecuteBulk}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </>
  )
}


