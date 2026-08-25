'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { SlidersHorizontal, AlertTriangle, RotateCcw } from 'lucide-react'
import { api } from '@/lib/api'
import type { TestToolChallenge } from '@/types/api'
import { fmtUSD } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

const tone = (s: string) =>
  s === 'funded' ? 'success' : s === 'passed' ? 'info' : s === 'failed' ? 'danger' : s === 'active' ? 'accent' : 'neutral'

type Action = 'phase1' | 'phase2' | 'funded' | 'payout_ready' | 'reset'

export default function ChallengeOperationsPage() {
  const [rows, setRows] = useState<TestToolChallenge[] | null>(null)
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<{ challenge: TestToolChallenge; action: Action } | null>(null)

  const refresh = async () => { const r = await api.admin.testToolsChallenges(); if (r.ok) setRows(r.data) }
  useEffect(() => { refresh() }, [])

  const executeAction = async (c: TestToolChallenge, action: Action) => {
    setBusyId(c.id)
    const r = await api.admin.testToolsSet(c.id, action)
    setBusyId(null)
    setConfirmTarget(null)
    if (r.ok && r.data.success) { toast.success(`Challenge #${c.id} → ${r.data.status}`); refresh() }
    else toast.error(r.ok ? (r.data.message || 'Action failed.') : (r.error || 'Action failed.'))
  }

  const handleActionClick = (c: TestToolChallenge, action: Action) => {
    if (action === 'reset' || action === 'funded') {
      setConfirmTarget({ challenge: c, action })
    } else {
      executeAction(c, action)
    }
  }

  const filtered = (rows ?? []).filter((c) => {
    const q = query.trim().toLowerCase()
    return !q || c.user_login.toLowerCase().includes(q) || (c.display_name || '').toLowerCase().includes(q) || String(c.id) === q
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <SlidersHorizontal className="h-6 w-6 text-accent" /> Challenge Operations
        </h1>
        <p className="text-sm text-text-muted mt-1">Manage the challenge lifecycle — advance evaluation phases, promote accounts to funded, and perform account support actions.</p>
      </div>

      <Card className="border-warn/30 bg-warn-muted/10">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warn shrink-0 mt-0.5" />
          <p className="text-sm text-text-muted">
            These controls set a challenge&apos;s status directly for operational and support purposes. They run <span className="text-text font-medium">outside the trading and challenge engines</span> and don&apos;t re-run evaluation logic, so changes take effect immediately — apply with care.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle>Challenge accounts</CardTitle>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search user or #id" className="h-9 w-48" />
        </CardHeader>
        <CardContent className="p-0">
          {!rows ? (
            <div className="p-5 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-text-muted">No challenge accounts found.</div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {filtered.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center gap-3 px-4 sm:px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{c.display_name || c.user_login}</span>
                      <Badge tone={tone(c.status)}>{c.status}</Badge>
                      <span className="text-2xs text-text-muted">Phase {c.phase}</span>
                    </div>
                    <div className="text-2xs text-text-muted mt-0.5">
                      #{c.id} · {c.plan_name || 'plan'} · bal {fmtUSD(Number(c.current_balance))} / {fmtUSD(Number(c.starting_balance))}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button size="sm" variant="outline" disabled={busyId === c.id} onClick={() => handleActionClick(c, 'phase1')}>Phase 1 ✓</Button>
                    <Button size="sm" variant="outline" disabled={busyId === c.id} onClick={() => handleActionClick(c, 'phase2')}>Phase 2 ✓</Button>
                    <Button size="sm" variant="outline" disabled={busyId === c.id} onClick={() => handleActionClick(c, 'funded')}>Funded</Button>
                    <Button size="sm" variant="outline" disabled={busyId === c.id} onClick={() => handleActionClick(c, 'payout_ready')} title="Fund + credit test profit so payouts can be tested">Payout ready</Button>
                    <Button size="sm" variant="ghost" disabled={busyId === c.id} onClick={() => handleActionClick(c, 'reset')} title="Reset to Phase 1">
                      <RotateCcw className="h-4 w-4" /> Reset
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      {confirmTarget && (
        <ConfirmDialog
          isOpen={!!confirmTarget}
          title={
            confirmTarget.action === 'reset'
              ? `Reset Challenge #${confirmTarget.challenge.id}?`
              : `Promote Challenge #${confirmTarget.challenge.id} to Funded?`
          }
          description={
            confirmTarget.action === 'reset'
              ? `This will reset account balance to starting capital ($${Number(confirmTarget.challenge.starting_balance).toLocaleString()}), clear any breach records, and return the trader to Phase 1.`
              : `This will mark this account as Funded and activate live funded trading privileges for ${confirmTarget.challenge.display_name || confirmTarget.challenge.user_login}.`
          }
          isDestructive={confirmTarget.action === 'reset'}
          confirmText={confirmTarget.action === 'reset' ? 'Confirm Reset' : 'Confirm Promotion'}
          loading={busyId === confirmTarget.challenge.id}
          onConfirm={() => executeAction(confirmTarget.challenge, confirmTarget.action)}
          onCancel={() => setConfirmTarget(null)}
        />
      )}
    </div>
  )
}
