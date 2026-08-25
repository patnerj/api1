'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { fmtUSD, timeAgo, fmtDate } from '@/lib/format'
import type { AdminUserDetail } from '@/types/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Save, Shield, Clock, CreditCard, Trophy, Wallet, FileCheck } from 'lucide-react'
import { cn } from '@/lib/cn'

const STATUS_TONE: Record<string, string> = {
  pending: 'text-warn bg-warn/10', approved: 'text-success bg-success/10', paid: 'text-success bg-success/10',
  rejected: 'text-danger bg-danger/10', active: 'text-accent bg-accent/10', funded: 'text-success bg-success/10',
  failed: 'text-danger bg-danger/10', frozen: 'text-warn bg-warn/10', banned: 'text-danger bg-danger/10',
}
function Pill({ status }: { status: string }) {
  return <span className={cn('text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded', STATUS_TONE[status] || 'text-text-muted bg-surface-muted')}>{status}</span>
}

const TIMELINE_ICON: Record<string, typeof Clock> = {
  registration: Shield, verification: FileCheck, payment: CreditCard,
  challenge: Trophy, payout: Wallet, kyc: FileCheck, admin: Shield,
}

export default function TraderDetailPage() {
  const params = useParams()
  const id = Number(params?.id)
  const [data, setData] = useState<AdminUserDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  const load = useCallback(async () => {
    const r = await api.admin.userDetail(id)
    if (r.ok) { setData(r.data); setNote(r.data.note || '') }
    else setError(r.error)
  }, [id])

  useEffect(() => { if (id) load() }, [id, load])

  const saveNote = async () => {
    setSavingNote(true)
    const r = await api.admin.saveUserNote(id, note)
    setSavingNote(false)
    if (r.ok && r.data.success) toast.success('Note saved')
    else toast.error(r.ok ? 'Save failed' : r.error)
  }

  if (error) return <div className="p-8 text-center text-sm text-danger">{error}</div>
  if (!data) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid lg:grid-cols-2 2xl:grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <Card key={i} className="p-6"><Skeleton className="h-32 w-full" /></Card>)}</div>
    </div>
  )

  const u = data.user
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm"><Link href="/dashboard/admin/users"><ArrowLeft className="h-4 w-4" /> Users</Link></Button>
      </div>

      {/* Profile header */}
      <Card>
        <CardContent className="py-5 flex flex-wrap items-center gap-4 justify-between">
          <div>
            <div className="text-xl font-semibold flex items-center gap-2">{u.display_name || u.username}
              {data.account && <Pill status={data.account.status} />}</div>
            <div className="text-sm text-text-muted">{u.email} · joined {fmtDate(u.registered)}</div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm"><Link href={`/dashboard/admin/users?impersonate=${u.id}`}>View as user</Link></Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 2xl:grid-cols-3 gap-4">
        {/* Left: account + KYC + note */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Account</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              {data.account ? (
                <>
                  <div className="flex justify-between"><span className="text-text-muted">Status</span><Pill status={data.account.status} /></div>
                  <div className="flex justify-between"><span className="text-text-muted">Balance</span><span>{fmtUSD(data.account.balance)}</span></div>
                  <div className="flex justify-between"><span className="text-text-muted">Equity</span><span>{fmtUSD(data.account.equity)}</span></div>
                </>
              ) : <p className="text-text-muted">No trading account.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>KYC</CardTitle></CardHeader>
            <CardContent className="text-sm">
              {data.kyc ? (
                <div className="space-y-1">
                  <div className="flex justify-between"><span className="text-text-muted">Status</span><Pill status={data.kyc.status} /></div>
                  {data.kyc.admin_note && <p className="text-2xs text-text-muted">Note: {data.kyc.admin_note}</p>}
                </div>
              ) : <p className="text-text-muted">No KYC submission.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Internal note</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                placeholder="Private admin note — warnings, refund history, special handling. Only admins see this."
                className="w-full rounded-md bg-surface-muted border border-border-subtle px-3 py-2 text-sm resize-y focus-ring"
              />
              <Button onClick={saveNote} loading={savingNote} size="sm">{!savingNote && <Save className="h-4 w-4" />} Save note</Button>
            </CardContent>
          </Card>
        </div>

        {/* Middle: challenges + payments + payouts */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Challenges ({data.challenges.length})</CardTitle></CardHeader>
            <CardContent>
              {data.challenges.length === 0 ? <p className="text-sm text-text-muted">None.</p> : (
                <div className="divide-y divide-border-subtle -my-1">
                  {data.challenges.slice(0, 6).map((c) => (
                    <div key={c.id} className="flex items-center justify-between py-2 text-sm">
                      <div><div className="font-medium">{fmtUSD(c.current_balance)}</div>
                        <div className="text-2xs text-text-muted">Phase {c.phase} · {c.trading_days}d</div></div>
                      <Pill status={c.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Payments ({data.payments.length})</CardTitle></CardHeader>
            <CardContent>
              {data.payments.length === 0 ? <p className="text-sm text-text-muted">None.</p> : (
                <div className="divide-y divide-border-subtle -my-1">
                  {data.payments.slice(0, 6).map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-2 text-sm">
                      <div><div className="font-medium">{fmtUSD(p.amount)}</div>
                        <div className="text-2xs text-text-muted">{p.gateway} · {timeAgo(p.created_at)}</div></div>
                      <Pill status={p.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Payouts ({data.payouts.length})</CardTitle></CardHeader>
            <CardContent>
              {data.payouts.length === 0 ? <p className="text-sm text-text-muted">None.</p> : (
                <div className="divide-y divide-border-subtle -my-1">
                  {data.payouts.slice(0, 6).map((po) => (
                    <div key={po.id} className="flex items-center justify-between py-2 text-sm">
                      <div><div className="font-medium">{fmtUSD(po.trader_amount)}</div>
                        <div className="text-2xs text-text-muted">{timeAgo(po.requested_at)}</div></div>
                      <Pill status={po.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: activity timeline */}
        <Card className="2xl:row-span-2">
          <CardHeader><CardTitle>Activity timeline</CardTitle></CardHeader>
          <CardContent>
            {data.timeline.length === 0 ? <p className="text-sm text-text-muted">No activity.</p> : (
              <ol className="space-y-3">
                {data.timeline.map((t, i) => {
                  const Icon = TIMELINE_ICON[t.type] || Clock
                  return (
                    <li key={i} className="flex gap-3 text-sm">
                      <div className="mt-0.5 h-6 w-6 rounded-full bg-surface-muted flex items-center justify-center shrink-0">
                        <Icon className="h-3.5 w-3.5 text-text-muted" />
                      </div>
                      <div className="min-w-0">
                        <div className="leading-snug">{t.label}</div>
                        <div className="text-2xs text-text-muted">{t.at ? fmtDate(t.at, true) : '—'}</div>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
