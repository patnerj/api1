'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import { fmtUSD, fmtDate, fmtPct, toNum, statusLabel, statusTone } from '@/lib/format'
import type { ChallengeAccount, PayoutsResp } from '@/types/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/ui/page-header'
import { PayoutSummary, PayoutHistory } from '@/components/dashboard/payout-history'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Banknote, ArrowUpRight, AlertCircle, Wallet, CheckCircle2, ShieldAlert } from 'lucide-react'
import Link from 'next/link'

type PayoutMethod = 'crypto' | 'wise'

export default function PayoutsPage() {
  const [requestFor, setRequestFor]   = useState<ChallengeAccount | null>(null)

  const { data, refetch: refresh, isPending } = useQuery({
    queryKey: ['payoutsData'],
    queryFn: async () => {
      const [ch, pm, po] = await Promise.all([api.challengeMy(), api.payoutMethodGet(), api.payouts()])
      return {
        funded: ch.ok ? ch.data.filter((c) => c.status === 'funded') : [],
        savedMethod: pm.ok ? pm.data : null,
        pdata: po.ok ? po.data : null,
        kycApproved: po.ok ? po.data.kyc_approved : null
      }
    },
    refetchInterval: 30_000,
  })

  const loading = isPending && !data

  const funded = data?.funded ?? []
  const savedMethod = data?.savedMethod ?? null
  const kycApproved = data?.kycApproved ?? null
  const pdata = data?.pdata ?? null

  const totalPaid = (pdata?.history ?? [])
    .filter((p) => p.status === 'paid')
    .reduce((s, p) => s + (p.trader_amount || 0), 0)

  return (
    <div className="space-y-8">
      <PageHeader
        variant="hero"
        title="Your Payouts"
        description="Request a payout from a funded account and manage your payout method."
        icon={Banknote}
        badge={{ label: 'Withdrawals', tone: 'accent' }}
      />

      {/* Summary */}
      <PayoutSummary
        available={pdata?.available ?? 0}
        nextPayoutAt={pdata?.next_payout_at ?? null}
        cycleDays={pdata?.cycle_days ?? 14}
        totalPaid={totalPaid}
        loading={loading}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* KYC gate */}
          {kycApproved === false && (
            <Card className="border-warn/40 bg-warn/5">
              <CardContent className="flex items-start gap-3 p-5">
                <ShieldAlert className="h-5 w-5 text-warn shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-text">KYC Required</span>
                    <Badge tone="warn">Verification needed</Badge>
                  </div>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    Complete identity verification before requesting your first payout.
                  </p>
                  <Button asChild size="sm" className="mt-3">
                    <Link href="/dashboard/kyc">Complete verification <ArrowUpRight className="h-3.5 w-3.5 ml-1" /></Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Funded accounts</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <Skeleton className="h-32 w-full" />
              ) : funded.length === 0 ? (
                <div className="py-8 text-center text-sm text-text-muted">
                  <Banknote className="h-8 w-8 mx-auto text-text-faint mb-2" />
                  You need to pass an evaluation before you can request a payout.
                </div>
              ) : funded.map((c) => {
                const profit = toNum(c.current_balance) - toNum(c.starting_balance)
                const splitPct = c.custom_profit_split !== null && c.custom_profit_split !== undefined ? toNum(c.custom_profit_split) : toNum(c.funded_profit_split ?? 80)
                const traderShare = profit > 0 ? (profit * splitPct) / 100 : 0
                return (
                  <div key={c.id} className="rounded-lg border border-border-subtle p-4 hover:border-accent transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="font-medium">{c.plan_name ?? `Challenge #${c.id}`}</div>
                        <div className="text-2xs text-text-muted tabular">{fmtUSD(c.account_size ?? 0, { decimals: 0 })} · Funded {c.funded_at && fmtDate(c.funded_at)}</div>
                      </div>
                      <Badge tone="success">FUNDED</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <Stat label="Profit"      value={fmtUSD(profit, { sign: true })} tone={profit >= 0 ? 'success' : 'danger'} />
                      <Stat label={`Your share (${splitPct}%)`} value={fmtUSD(traderShare)} tone="success" />
                      <Stat label="Equity"      value={fmtUSD(c.current_balance)} />
                    </div>
                    {kycApproved === false ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href="/dashboard/kyc">Complete KYC to request <ArrowUpRight className="h-3.5 w-3.5 ml-1" /></Link>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => setRequestFor(c)}
                        disabled={profit <= 0}
                      >
                        Request payout <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    )}
                    {profit <= 0 && (
                      <div className="mt-2 text-2xs text-text-muted">Your account needs to be in profit before you can request a payout.</div>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <PayoutHistory items={pdata?.history ?? null} loading={loading} />

          <PayoutOrdersList />
        </div>

        <div className="lg:col-span-1">
          <PayoutMethodCard savedMethod={savedMethod} onSaved={refresh} />
        </div>
      </div>

      {requestFor && (
        <RequestPayoutDialog
          challenge={requestFor}
          savedMethod={savedMethod}
          onClose={() => setRequestFor(null)}
          onSuccess={() => { setRequestFor(null); refresh() }}
        />
      )}
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'success' | 'danger' }) {
  return (
    <div className="p-2.5 rounded-md bg-surface-muted/50 border border-border-subtle">
      <div className="text-2xs text-text-muted truncate">{label}</div>
      <div className={`text-sm font-medium tabular ${tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-danger' : ''}`}>{value}</div>
    </div>
  )
}

function PayoutMethodCard({ savedMethod, onSaved }: { savedMethod: { method: string; address: string; details: string } | null; onSaved: () => void }) {
  const [method,  setMethod]  = useState<PayoutMethod>((savedMethod?.method as PayoutMethod) || 'crypto')
  const [address, setAddress] = useState(savedMethod?.address ?? '')
  const [details, setDetails] = useState(savedMethod?.details ?? '')
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    if (savedMethod) {
      setMethod((savedMethod.method as PayoutMethod) || 'crypto')
      setAddress(savedMethod.address || '')
      setDetails(savedMethod.details || '')
    }
  }, [savedMethod])

  const save = async () => {
    if (!address.trim()) { toast.error('Enter your payout address or account number'); return }
    setSaving(true)
    const res = await api.payoutMethodSave(method, address.trim(), details.trim())
    setSaving(false)
    if (res.ok) { toast.success('Payout method saved'); onSaved() }
    else        toast.error(res.error)
  }

  return (
    <Card>
      <CardHeader><CardTitle>Payout method</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {([
            { id: 'crypto', label: 'Crypto (USDT)', icon: Wallet },
            { id: 'wise',   label: 'Wise',          icon: Banknote },
          ] as const).map((opt) => {
            const Icon = opt.icon
            return (
              <button
                key={opt.id}
                onClick={() => setMethod(opt.id)}
                className={`flex flex-col items-center gap-1 p-3 rounded-md border text-2xs font-medium transition-colors focus-ring ${
                  method === opt.id
                    ? 'border-accent bg-accent/10 text-accent font-semibold'
                    : 'border-border bg-surface text-text-muted hover:text-text hover:border-border-strong'
                }`}
              >
                <Icon className="h-4 w-4" />
                {opt.label}
              </button>
            )
          })}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="addr">
            {method === 'crypto' ? 'USDT wallet address (TRC20 / BEP20)' : 'Wise email'}
          </Label>
          <Input id="addr" value={address} onChange={(e) => setAddress(e.target.value)} placeholder={
            method === 'crypto' ? 'T... (TRC20) or 0x... (BEP20)' : 'you@example.com'
          } />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dets">Additional details (optional)</Label>
          <Textarea id="dets" rows={2} value={details} onChange={(e) => setDetails(e.target.value)} placeholder={
            method === 'crypto' ? 'Network: TRC20 or BEP20 (and memo/tag if required)' : 'Account holder name'
          } />
        </div>

        <Button onClick={save} loading={saving} className="w-full">Save payout method</Button>
      </CardContent>
    </Card>
  )
}

function RequestPayoutDialog({
  challenge, savedMethod, onClose, onSuccess,
}: {
  challenge: ChallengeAccount
  savedMethod: { method: string; address: string; details: string } | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [method,  setMethod]  = useState(savedMethod?.method || 'crypto')
  const [address, setAddress] = useState(savedMethod?.address ?? '')
  const [busy,    setBusy]    = useState(false)
  const [success, setSuccess] = useState(false)

  const profit = toNum(challenge.current_balance) - toNum(challenge.starting_balance)
  const splitPct = challenge.custom_profit_split !== null && challenge.custom_profit_split !== undefined ? toNum(challenge.custom_profit_split) : toNum(challenge.funded_profit_split ?? 80)
  const traderShare = (profit * splitPct) / 100
  const firmShare   = profit - traderShare

  const submit = async () => {
    if (!address.trim()) { toast.error('Enter your payout address'); return }
    setBusy(true)
    const res = await api.challengePayout(challenge.id, method, address.trim())
    setBusy(false)
    if (res.ok && res.data.success) { setSuccess(true); setTimeout(onSuccess, 1500) }
    else                            toast.error(res.ok ? (res.data.message ?? 'Request failed') : res.error)
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request payout</DialogTitle>
          <DialogDescription>From {challenge.plan_name ?? `Challenge #${challenge.id}`}</DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="text-center py-6">
            <div className="h-14 w-14 rounded-full bg-success/15 text-success flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-semibold text-text">Payout requested</h3>
            <p className="text-sm text-text-muted mt-2">
              We&apos;ll review and approve your payout within 1 business day.
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-lg bg-bg-subtle border border-border-subtle p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Profit on account</span>
                <span className="tabular font-medium text-text">{fmtUSD(profit)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Your share ({splitPct}%)</span>
                <span className="tabular font-semibold text-success">{fmtUSD(traderShare)}</span>
              </div>
              <div className="flex justify-between text-2xs text-text-muted">
                <span>Firm share ({fmtPct(100 - splitPct, 0)})</span>
                <span className="tabular">{fmtUSD(firmShare)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Method</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['crypto', 'wise'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`h-9 rounded-md border text-xs font-medium transition-colors focus-ring ${
                      method === m ? 'border-accent bg-accent/10 text-accent font-semibold' : 'border-border bg-surface text-text-muted'
                    }`}
                  >
                    {m.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="payaddr">Payout address</Label>
              <Input id="payaddr" value={address} onChange={(e) => setAddress(e.target.value)} placeholder={
                method === 'crypto' ? 'USDT wallet address' : 'Wise email'
              } />
            </div>

            <div className="flex items-start gap-2 text-2xs text-text-muted">
              <AlertCircle className="h-3.5 w-3.5 text-warn shrink-0 mt-0.5" />
              <span>Payouts are reviewed within 1 business day. Once approved, funds typically arrive within 24h.</span>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button variant="success" onClick={submit} loading={busy} disabled={!address.trim()}>
                Request {fmtUSD(traderShare)}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function PayoutOrdersList() {
  const { data: orders = null, isPending } = useQuery({
    queryKey: ['paymentMyOrders'],
    queryFn: async () => {
      const res = await api.paymentMyOrders()
      if (!res.ok) throw new Error('Failed to load orders')
      return res.data
    },
    refetchInterval: 30_000,
  })

  const loading = isPending && !orders

  return (
    <Card>
      <CardHeader><CardTitle>Purchase order history</CardTitle></CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-5 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : !orders || orders.length === 0 ? (
          <div className="p-8 text-center text-sm text-text-muted">No purchase orders yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle bg-bg-subtle/40">
                  <th className="text-left  px-4 py-3 text-2xs uppercase tracking-wider text-text-muted font-semibold">Order</th>
                  <th className="text-left  px-4 py-3 text-2xs uppercase tracking-wider text-text-muted font-semibold hidden sm:table-cell">Gateway</th>
                  <th className="text-right px-4 py-3 text-2xs uppercase tracking-wider text-text-muted font-semibold">Amount</th>
                  <th className="text-left  px-4 py-3 text-2xs uppercase tracking-wider text-text-muted font-semibold">Status</th>
                  <th className="text-right px-4 py-3 text-2xs uppercase tracking-wider text-text-muted font-semibold hidden md:table-cell">Created</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-border-subtle/40 last:border-0">
                    <td className="px-4 py-3 tabular text-text-muted">#{o.id}</td>
                    <td className="px-4 py-3 capitalize hidden sm:table-cell">{o.gateway}</td>
                    <td className="px-4 py-3 text-right tabular font-medium">{fmtUSD(o.amount)}</td>
                    <td className="px-4 py-3"><Badge tone={statusTone(o.status)}>{statusLabel(o.status)}</Badge></td>
                    <td className="px-4 py-3 text-right text-2xs text-text-muted hidden md:table-cell">{fmtDate(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
