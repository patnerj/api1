'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Users2, Copy, Check, DollarSign, TrendingUp, Wallet, ArrowUpRight, ExternalLink } from 'lucide-react'
import { api } from '@/lib/api'
import type { Commission, AffiliatePayout } from '@/types/api'
import { fmtUSD, timeAgo } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard, StatGrid } from '@/components/ui/stat-card'
import { AffiliateLeaderboard } from '@/components/affiliate-leaderboard'
import { useQuery } from '@tanstack/react-query'

const tone = (s: Commission['status']) =>
  s === 'paid' ? 'success' : s === 'reversed' ? 'danger' : s === 'approved' ? 'info' : 'warn'
const payoutTone = (s: AffiliatePayout['status']) =>
  s === 'paid' ? 'success' : s === 'rejected' ? 'danger' : s === 'approved' ? 'info' : 'warn'
const METHOD_LABEL: Record<string, string> = { usdt_trc20: 'USDT (TRC20)', usdt_bep20: 'USDT (BEP20)', wise: 'Wise' }

function downloadBanner(type: '16:9' | '1:1', code: string, refLink: string) {
  if (typeof window === 'undefined') return
  const canvas = document.createElement('canvas')
  const width = type === '16:9' ? 1920 : 1080
  const height = 1080
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Dark background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height)
  bgGrad.addColorStop(0, '#06080F')
  bgGrad.addColorStop(0.5, '#0B0F19')
  bgGrad.addColorStop(1, '#0F172A')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, width, height)

  // Glow
  const glowGrad = ctx.createRadialGradient(width / 2, height / 3, 50, width / 2, height / 3, 500)
  glowGrad.addColorStop(0, 'rgba(59, 130, 246, 0.25)')
  glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = glowGrad
  ctx.fillRect(0, 0, width, height)

  // Border frame
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
  ctx.lineWidth = 4
  ctx.strokeRect(40, 40, width - 80, height - 80)

  // Brand Name
  ctx.textAlign = 'center'
  ctx.fillStyle = '#3B82F6'
  ctx.font = 'bold 36px monospace'
  ctx.fillText('NEXT-GEN PROPFIRM', width / 2, type === '16:9' ? 240 : 280)

  // Heading
  ctx.fillStyle = '#FFFFFF'
  ctx.font = '900 64px system-ui, -apple-system, sans-serif'
  ctx.fillText('TRADE CAPITAL UP TO $200,000', width / 2, type === '16:9' ? 360 : 420)

  // Subtitle
  ctx.fillStyle = '#94A3B8'
  ctx.font = '500 32px system-ui, -apple-system, sans-serif'
  ctx.fillText('Keep up to 90% profit split • Instant Payouts • Low Spreads', width / 2, type === '16:9' ? 450 : 520)

  // Pill
  const pillW = 560
  const pillH = 120
  const pillX = (width - pillW) / 2
  const pillY = type === '16:9' ? 560 : 660

  ctx.fillStyle = 'rgba(59, 130, 246, 0.15)'
  ctx.strokeStyle = '#3B82F6'
  ctx.lineWidth = 3
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath()
    ctx.roundRect(pillX, pillY, pillW, pillH, 20)
    ctx.fill()
    ctx.stroke()
  } else {
    ctx.fillRect(pillX, pillY, pillW, pillH)
    ctx.strokeRect(pillX, pillY, pillW, pillH)
  }

  ctx.fillStyle = '#93C5FD'
  ctx.font = 'bold 22px monospace'
  ctx.fillText('USE REFERRAL CODE', width / 2, pillY + 45)

  ctx.fillStyle = '#FFFFFF'
  ctx.font = '900 40px monospace'
  ctx.fillText((code || 'PROPFIRM').toUpperCase(), width / 2, pillY + 95)

  // Footer Link
  ctx.fillStyle = '#64748B'
  ctx.font = '500 24px system-ui, -apple-system, sans-serif'
  ctx.fillText(refLink || 'yourbrand.com', width / 2, type === '16:9' ? 950 : 980)

  // Trigger download
  const dataUrl = canvas.toDataURL('image/png')
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = `propfirm-banner-${type === '16:9' ? '16x9' : '1x1'}-${code || 'partner'}.png`
  a.click()
  toast.success('Marketing asset PNG downloaded!')
}

export default function AffiliatePage() {
  const { data, refetch: load, isPending } = useQuery({
    queryKey: ['affiliateData'],
    queryFn: async () => {
      const r = await api.affiliateMe()
      if (!r.ok) return null
      
      let comms = null
      let payoutsList = null

      if (r.data.enrolled) {
        const [c, p] = await Promise.all([api.affiliateCommissions(), api.affiliatePayouts()])
        if (c.ok) comms = c.data
        if (p.ok) payoutsList = p.data
      }

      return { me: r.data, comms, payoutsList }
    }
  })

  const loading = isPending && !data

  const me = data?.me ?? null
  const commissions = data?.comms ?? null
  const payouts = data?.payoutsList ?? null

  const [enrolling, setEnrolling] = useState(false)
  const [copied, setCopied] = useState(false)
  const [method, setMethod] = useState<'usdt_trc20' | 'usdt_bep20' | 'wise'>('usdt_trc20')
  const [destination, setDestination] = useState('')
  const [savingMethod, setSavingMethod] = useState(false)
  const [requesting, setRequesting] = useState(false)

  useEffect(() => {
    if (me) {
      if (me.payout_method) setMethod(me.payout_method as 'usdt_trc20' | 'usdt_bep20' | 'wise')
      if (me.payout_destination) setDestination(me.payout_destination)
    }
  }, [me?.payout_method, me?.payout_destination])

  const saveMethod = async () => {
    const dest = destination.trim()
    if (!dest) { toast.error('Enter your payout destination.'); return }
    if (method === 'usdt_trc20' && !/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(dest)) {
      toast.error('Invalid TRC20 address. Must start with T and be 34 characters.')
      return
    }
    if (method === 'usdt_bep20' && !/^0x[a-fA-F0-9]{40}$/.test(dest)) {
      toast.error('Invalid BEP20 address. Must be a valid 42-character 0x hex address.')
      return
    }
    if (method === 'wise' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dest)) {
      toast.error('Invalid Wise email address.')
      return
    }
    setSavingMethod(true)
    const r = await api.affiliateSetPayout(method, dest)
    setSavingMethod(false)
    if (r.ok && r.data.success) { toast.success('Payout method saved.'); load() }
    else toast.error(r.ok ? (r.data.message || 'Could not save.') : r.error)
  }

  const requestPayout = async () => {
    setRequesting(true)
    const r = await api.affiliateRequestPayout()
    setRequesting(false)
    if (r.ok && r.data.success) { toast.success(`Withdrawal requested${r.data.amount ? ` · ${fmtUSD(r.data.amount)}` : ''}.`); load() }
    else toast.error(r.ok ? (r.data.message || 'Could not request withdrawal.') : r.error)
  }

  const enroll = async () => {
    setEnrolling(true)
    const r = await api.affiliateEnroll()
    setEnrolling(false)
    if (r.ok && r.data.enrolled) { toast.success('You’re in! Here’s your referral link.'); load() }
    else toast.error('Could not enroll right now.')
  }

  const link = me?.code ? `${typeof window !== 'undefined' ? window.location.origin : ''}/register?ref=${me.code}` : ''
  const copy = () => {
    navigator.clipboard?.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
  }

  if (loading || !me) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-40 w-full" /></div>
  }

  if (!me.enrolled) {
    return (
      <div className="space-y-8 pb-12">
        <PageHeader
          variant="hero"
          title="Affiliate Program"
          description="Earn by referring traders to our prop firm."
          icon={Users2}
          badge={{ label: 'Partner Program', tone: 'accent' }}
        />

        <Card>
          <CardContent className="p-10 text-center">
            <div className="inline-flex h-12 w-12 rounded-xl bg-accent/10 text-accent items-center justify-center mb-4">
              <Users2 className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-text">Become an Affiliate</h2>
            <p className="text-sm text-text-muted mt-2 max-w-md mx-auto leading-relaxed">
              Get a unique link, share it, and earn a commission on every challenge your referrals purchase.
            </p>
            <Button className="mt-6" onClick={enroll} disabled={enrolling}>
              {enrolling ? 'Setting up…' : 'Join the affiliate program'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const s = me.stats!

  return (
    <div className="space-y-8">
      <PageHeader
        variant="hero"
        title="Affiliate Dashboard"
        description={`Your current commission rate is ${me.rate_percent}% of each referred purchase.`}
        icon={Users2}
        badge={{ label: 'Partner Program', tone: 'accent' }}
      />

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-accent/20">
          <CardContent className="p-6">
            {(() => {
              const c = s.conversions;
              let currentTier = 'Bronze (10%)', nextTier = 'Silver (12%)', nextGoal = 10, progress = 0;
              let color = 'text-[#cd7f32]';
              
              if (c >= 100) {
                currentTier = 'Platinum (20%)'; nextTier = 'MAX Level Reached'; nextGoal = 100; progress = 100;
                color = 'text-text font-bold';
              } else if (c >= 50) {
                currentTier = 'Gold (15%)'; nextTier = 'Platinum (20%)'; nextGoal = 100; progress = 50 + ((c - 50) / 50) * 50;
                color = 'text-warn font-bold';
              } else if (c >= 10) {
                currentTier = 'Silver (12%)'; nextTier = 'Gold (15%)'; nextGoal = 50; progress = 20 + ((c - 10) / 40) * 80;
                color = 'text-text-muted font-bold';
              } else {
                progress = (c / 10) * 100;
              }

              return (
                <>
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <div className="text-2xs uppercase tracking-wider text-text-muted font-semibold">Current Tier</div>
                      <div className={`text-xl font-bold ${color}`}>
                        {currentTier}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xs text-text-muted">Next Tier</div>
                      <div className="text-sm font-medium text-text">
                        {nextTier}
                      </div>
                    </div>
                  </div>
                  
                  <div className="h-3 w-full bg-surface-muted rounded-full overflow-hidden border border-border-subtle relative">
                    <div 
                      className="h-full bg-accent transition-all duration-1000 ease-out relative rounded-full" 
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  
                  <div className="mt-3 text-xs text-text-muted text-center">
                    {c >= 100 ? (
                      <span className="text-success font-semibold">You have reached the maximum commission tier! Incredible work. 🏆</span>
                    ) : (
                      <><strong>{nextGoal - c}</strong> more sales to unlock {nextTier}!</>
                    )}
                  </div>
                </>
              )
            })()}
          </CardContent>
        </Card>

        <AffiliateLeaderboard />
      </div>

      <Card>
        <CardHeader><CardTitle>Your referral link</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <input readOnly value={link} className="flex-1 h-10 rounded-md bg-bg-subtle border border-border-subtle px-3 text-sm font-mono" />
            <Button variant="outline" onClick={copy}>{copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied' : 'Copy'}</Button>
          </div>
          <p className="text-2xs text-text-muted mt-1.5">Code: <span className="font-mono">{me.code}</span></p>
        </CardContent>
      </Card>

      <StatGrid columns={4}>
        <StatCard label="Referrals" value={String(s.referrals)} icon={Users2} tone="accent" />
        <StatCard label="Conversions" value={String(s.conversions)} icon={TrendingUp} tone="info" />
        <StatCard label="Unpaid earnings" value={fmtUSD(s.unpaid)} icon={Wallet} tone="warn" />
        <StatCard label="Paid out" value={fmtUSD(s.paid)} icon={DollarSign} tone="success" />
      </StatGrid>

      <Card>
        <CardHeader>
          <CardTitle>Marketing Assets</CardTitle>
          <p className="text-xs text-text-muted mt-0.5">Use these official banners and graphics on your social media, blog, or videos to boost your conversions.</p>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-lg border border-border-subtle p-3 flex flex-col gap-3">
              <div className="aspect-video bg-surface-muted rounded border border-border flex items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-bg flex flex-col items-center justify-center p-4 text-center">
                  <span className="font-mono text-xs uppercase tracking-widest text-accent mb-1 font-bold">16:9 Promo Banner</span>
                  <span className="font-black text-lg tracking-tight text-text">TRADE UP TO $200K</span>
                  <span className="text-2xs text-text-muted font-mono mt-1">Code: {me?.code}</span>
                </div>
                <div className="absolute inset-0 bg-bg/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button variant="outline" size="sm" onClick={() => downloadBanner('16:9', me?.code || '', link || '')}>Download PNG</Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-text">16:9 Youtube / Twitter Banner</div>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-accent" onClick={() => downloadBanner('16:9', me?.code || '', link || '')}>Download</Button>
              </div>
            </div>
            
            <div className="rounded-lg border border-border-subtle p-3 flex flex-col gap-3">
              <div className="aspect-square bg-surface-muted rounded border border-border flex items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-tr from-info/20 to-bg flex flex-col items-center justify-center p-4 text-center">
                  <span className="font-mono text-xs uppercase tracking-widest text-info mb-1 font-bold">1:1 Square Post</span>
                  <span className="font-black text-base tracking-tight text-text">KEEP 90% PROFITS</span>
                  <span className="text-2xs text-text-muted font-mono mt-1">Code: {me?.code}</span>
                </div>
                <div className="absolute inset-0 bg-bg/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button variant="outline" size="sm" onClick={() => downloadBanner('1:1', me?.code || '', link || '')}>Download PNG</Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-text">1:1 Instagram / Feed Post</div>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-info" onClick={() => downloadBanner('1:1', me?.code || '', link || '')}>Download</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Withdrawals</CardTitle>
          <p className="text-2xs text-text-muted mt-1">Paid via crypto (USDT) or Wise. Set your destination, then request a withdrawal of your available balance.</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-2xs text-text-muted uppercase tracking-wider font-semibold">Payout method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as 'usdt_trc20' | 'usdt_bep20' | 'wise')}
                className="w-full h-10 rounded-md bg-bg-subtle border border-border-subtle px-3 text-sm text-text"
              >
                <option value="usdt_trc20">USDT — TRC20</option>
                <option value="usdt_bep20">USDT — BEP20</option>
                <option value="wise">Wise</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-2xs text-text-muted uppercase tracking-wider font-semibold">{method === 'wise' ? 'Wise email' : 'Wallet address'}</label>
              <input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder={method === 'wise' ? 'you@example.com' : method === 'usdt_trc20' ? 'T…' : '0x…'}
                className="w-full h-10 rounded-md bg-bg-subtle border border-border-subtle px-3 text-sm font-mono text-text"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <span className="text-text-muted">Available to withdraw: </span>
              <span className="font-bold tabular text-success">{fmtUSD(me.available_balance ?? 0)}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={saveMethod} disabled={savingMethod}>Save method</Button>
              <Button onClick={requestPayout} disabled={requesting || (me.available_balance ?? 0) <= 0}>
                <ArrowUpRight className="h-4 w-4 mr-1" /> Request withdrawal
              </Button>
            </div>
          </div>

          {payouts && payouts.length > 0 && (
            <div className="rounded-lg border border-border-subtle divide-y divide-border-subtle">
              {payouts.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm tabular text-text">{fmtUSD(Number(p.amount))}</span>
                      <Badge tone={payoutTone(p.status)}>{p.status}</Badge>
                    </div>
                    <div className="text-2xs text-text-muted mt-0.5">
                      {METHOD_LABEL[p.method] || p.method} · {timeAgo(p.created_at_iso || p.created_at)}
                      {p.tx_reference ? <> · ref <span className="font-mono">{p.tx_reference}</span></> : null}
                      {p.admin_note ? <> · {p.admin_note}</> : null}
                    </div>
                  </div>
                  {p.proof_url && (
                    <a href={p.proof_url} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-text shrink-0" title="Payment proof">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Commission history</CardTitle></CardHeader>
        <CardContent className="p-0">
          {!commissions ? (
            <div className="p-5 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : commissions.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <div className="inline-flex h-12 w-12 rounded-xl bg-accent/10 text-accent items-center justify-center mb-4">
                <DollarSign className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-semibold tracking-tight text-text">No commissions yet</h2>
              <p className="text-sm text-text-muted mt-2 max-w-md mx-auto leading-relaxed">
                Share your link to start earning.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {commissions.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm tabular text-text">{fmtUSD(c.amount)}</div>
                    <div className="text-2xs text-text-muted">{c.rate_percent}% of {fmtUSD(c.base_amount)} · {timeAgo(c.created_at_iso || c.created_at)}</div>
                  </div>
                  <Badge tone={tone(c.status)}>{c.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
