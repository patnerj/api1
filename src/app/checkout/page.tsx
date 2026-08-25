'use client'

import { Suspense, useEffect, useMemo, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { clearFxsimCache } from '@/lib/fxsim'
import { fmtUSD, toNum } from '@/lib/format'
import { useAuth } from '@/store/auth'
import type { ChallengePlan, PaymentConfig } from '@/types/api'
import { cn } from '@/lib/cn'
import {
  ArrowRight, ArrowLeft, Check, CreditCard, Bitcoin,
  Upload, AlertCircle, ShieldCheck, FileText, Loader2, Copy, ShieldAlert,
} from 'lucide-react'
import { QrCode } from '@/components/qr-code'
import { MarketingHeader } from '@/components/marketing/header'
import { MarketingFooter } from '@/components/marketing/footer'

type Step = 'review' | 'gateway' | 'manual' | 'success'
type Gateway = 'stripe' | 'manual_crypto' | 'coinpayments' | 'confirmo' | null

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col bg-bg text-text">
        <MarketingHeader />
        <main className="flex-1 flex items-center justify-center p-4">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </main>
      </div>
    }>
      <CheckoutInner />
    </Suspense>
  )
}

function CheckoutInner() {
  const router = useRouter()
  const params = useSearchParams()
  const planId = Number(params.get('plan') ?? 0)
  
  const { user, ready } = useAuth()
  
  const [plan, setPlan] = useState<ChallengePlan | null>(null)
  const [fetchingPlan, setFetchingPlan] = useState(true)
  const [planErr, setPlanErr] = useState<string | null>(null)

  const [step, setStep]         = useState<Step>('review')
  const [config, setConfig]     = useState<PaymentConfig | null>(null)
  const [gateway, setGateway]   = useState<Gateway>(null)
  const [orderId, setOrderId]   = useState<number | null>(null)
  const [proofFile, setProof]   = useState<File | null>(null)
  const [txnRef, setTxnRef]     = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [coupon, setCoupon]     = useState('')
  const [couponInfo, setCouponInfo] = useState<{ code: string; original: number; discount: number; final: number } | null>(null)
  const [couponErr, setCouponErr]   = useState<string | null>(null)
  const [couponBusy, setCouponBusy] = useState(false)
  // URL coupon auto-apply runs ONCE — without this ref the effect re-fires when
  // couponInfo flips to null (clearCoupon) and resurrects the removed coupon.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const urlCouponAttempted = useRef(false)

  // 1. Fetch Plan
  useEffect(() => {
    if (!planId) {
      setPlanErr("No plan selected.")
      setFetchingPlan(false)
      return
    }
    
    api.challengePlans().then((res) => {
      setFetchingPlan(false)
      if (res.ok) {
        const p = res.data.find((pl) => Number(pl.id) === planId)
        if (p) {
          setPlan(p)
        } else {
          setPlanErr("Selected plan could not be found.")
        }
      } else {
        setPlanErr(res.error || "Failed to load plans.")
      }
    })
  }, [planId])

  // 2. Coupon from URL
  useEffect(() => {
    if (plan && !couponInfo && !urlCouponAttempted.current) {
    urlCouponAttempted.current = true
      const urlCoupon = params.get('coupon')
      if (urlCoupon) {
        setCoupon(urlCoupon)
        setCouponBusy(true)
        setCouponErr(null)
        api.couponValidate(urlCoupon.trim(), plan.id).then(res => {
          setCouponBusy(false)
          if (res.ok && res.data.valid) {
            setCouponInfo({ code: res.data.code || urlCoupon.trim().toUpperCase(), original: res.data.original ?? toNum(plan.price), discount: res.data.discount ?? 0, final: res.data.final ?? toNum(plan.price) })
          } else {
            setCouponInfo(null)
            setCouponErr(res.ok ? res.data.message : (res.error || 'Could not validate coupon'))
          }
        })
      }
    }
  }, [plan, params, couponInfo])

  const price = plan ? toNum(plan.price) : 0
  const finalPrice = couponInfo ? toNum(couponInfo.final) : price
  const isFree = finalPrice <= 0

  // 3. Fetch Config on Gateway Step
  useEffect(() => {
    if (step !== 'gateway' || config || isFree) return
    api.paymentConfig().then((res) => {
      if (res.ok) setConfig(res.data)
      else        setError(res.error)
    })
  }, [step, config, isFree])

  const gateways = useMemo(() => {
    if (!config) return []
    const list: { id: Gateway; label: string; sub: string; icon: typeof CreditCard; tone: string }[] = []
    if (config.has_stripe) {
      list.push({ id: 'stripe',        label: 'Credit / debit card', sub: 'Instant via Stripe',           icon: CreditCard, tone: 'text-info' })
    }
    if (config.has_confirmo) {
      list.push({ id: 'confirmo',      label: 'Pay with Crypto',     sub: 'Instant via Confirmo',         icon: Bitcoin,    tone: 'text-warn' })
    }
    if (config.has_coinpayments) {
      list.push({ id: 'coinpayments',  label: 'Pay with Crypto',     sub: 'Instant via Coinpayments',     icon: Bitcoin,    tone: 'text-warn' })
    }
    if (config.has_manual_crypto) {
      list.push({ id: 'manual_crypto', label: 'Crypto transfer',     sub: 'BTC, USDT, USDC',              icon: Bitcoin,    tone: 'text-warn' })
    }
    return list
  }, [config])

  const applyCoupon = async () => {
    if (!coupon.trim() || !plan) return
    setCouponBusy(true); setCouponErr(null)
    const res = await api.couponValidate(coupon.trim(), plan.id)
    setCouponBusy(false)
    if (res.ok && res.data.valid) {
      setCouponInfo({ code: res.data.code || coupon.trim().toUpperCase(), original: res.data.original ?? price, discount: res.data.discount ?? 0, final: res.data.final ?? price })
    } else {
      setCouponInfo(null)
      setCouponErr(res.ok ? res.data.message : (res.error || 'Could not validate coupon'))
    }
  }
  const clearCoupon = () => { setCoupon(''); setCouponInfo(null); setCouponErr(null) }

  // ── Actions ────────────────────────────────────────────────────────
  async function startFree() {
    if (!plan) return
    setLoading(true)
    setError(null)
    const couponToSend = couponInfo ? couponInfo.code : undefined
    const res = await api.challengeStart(plan.id, couponToSend)
    setLoading(false)
    if (res.ok && !res.data.requires_payment) {
      toast.success('Challenge started!')
      // FIX: full reload instead of router.push — kills SPA/RSC staleness so the
      // new challenge shows up INSTANTLY on the dashboard (was lagging ~30s).
      clearFxsimCache()
      window.location.href = '/dashboard?started=' + plan.id
    } else {
      setError(res.ok ? (res.data.message || 'Unable to start challenge') : res.error)
    }
  }

  async function chooseGateway(g: Gateway) {
    if (!g || !plan) return
    setGateway(g)
    setError(null)

    const couponToSend = couponInfo ? couponInfo.code : ''

    if (g === 'stripe') {
      setLoading(true)
      const res = await api.stripeCheckout(plan.id, couponToSend)
      setLoading(false)
      if (res.ok && res.data.checkout_url) {
        window.location.href = res.data.checkout_url
      } else {
        setError(res.ok ? (res.data.message || 'Stripe checkout unavailable') : res.error)
      }
      return
    }

    if (g === 'confirmo') {
      setLoading(true)
      const res = await api.paymentCreate(plan.id, 'confirmo', couponToSend)
      setLoading(false)
      if (res.ok && res.data.payment_url) {
        window.location.href = res.data.payment_url
      } else {
        setError(res.ok ? 'Confirmo checkout unavailable' : res.error)
      }
      return
    }

    if (g === 'coinpayments') {
      setLoading(true)
      const res = await api.paymentCreate(plan.id, 'coinpayments', couponToSend)
      setLoading(false)
      if (res.ok && res.data.payment_url) {
        window.location.href = res.data.payment_url
      } else {
        setError(res.ok ? 'Coinpayments checkout unavailable' : res.error)
      }
      return
    }

    // Manual gateways — create the order, move to manual step.
    // Reuse an already-created order when the user goes Back (manual → gateway)
    // and re-picks a manual method: paymentCreate again would mint a second
    // pending order for the same plan/coupon.
    if (orderId) {
      setStep('manual')
      return
    }
    setLoading(true)
    const res = await api.paymentCreate(plan.id, g === 'manual_crypto' ? 'crypto' : g, couponToSend)
    setLoading(false)
    if (res.ok && res.data.order_id) {
      setOrderId(res.data.order_id)
      setStep('manual')
    } else {
      setError(res.ok ? 'Order creation failed' : res.error)
    }
  }

  async function submitProof() {
    if (!orderId || !proofFile) return
    setLoading(true)
    setError(null)
    const form = new FormData()
    form.append('order_id', String(orderId))
    form.append('txn_reference', txnRef)
    form.append('proof', proofFile)
    const res = await api.paymentSubmitProof(form)
    setLoading(false)
    if (res.ok) {
      setStep('success')
    } else {
      setError(res.error)
    }
  }

  // Loading state
  if (fetchingPlan) {
    return (
      <div className="min-h-screen flex flex-col bg-bg text-text">
        <MarketingHeader />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-text-muted">Loading checkout...</p>
          </div>
        </main>
        <MarketingFooter />
      </div>
    )
  }

  // Error State
  if (planErr || !plan) {
    return (
      <div className="min-h-screen flex flex-col bg-bg text-text">
        <MarketingHeader />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="text-center space-y-4 max-w-md w-full">
            <div className="h-16 w-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-semibold">Checkout Error</h1>
            <p className="text-text-muted">{planErr || 'Plan not found.'}</p>
            <Button asChild className="w-full mt-4">
              <Link href="/challenges">Back to Challenges</Link>
            </Button>
          </div>
        </main>
        <MarketingFooter />
      </div>
    )
  }

  // Not signed in: redirect to login with return
  if (ready && !user) {
    return (
      <div className="min-h-screen flex flex-col bg-bg text-text">
        <MarketingHeader />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-surface border border-border rounded-xl p-8 text-center space-y-6 shadow-sm">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Sign in to continue</h1>
              <p className="text-text-muted">You need an account to purchase a challenge. It only takes 30 seconds.</p>
            </div>
            <div className="flex flex-col gap-3">
              <Button asChild size="lg" className="w-full">
                <Link href={`/register?next=${encodeURIComponent('/checkout?plan=' + plan.id)}`}>Create account</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href={`/login?next=${encodeURIComponent('/checkout?plan=' + plan.id)}`}>Sign in</Link>
              </Button>
            </div>
          </div>
        </main>
        <MarketingFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text selection:bg-accent/20">
      <MarketingHeader />
      
      <main className="flex-1 flex items-center justify-center py-20 px-4">
        <div className="w-full max-w-lg bg-surface border border-border shadow-2xl shadow-accent/5 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
          {/* Subtle glow effect behind checkout container */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-accent/0 via-accent/50 to-accent/0" />
          
          <AnimatePresence mode="wait">
            {step === 'review'  && <ReviewStep    key="review"  plan={plan} onNext={() => isFree ? startFree() : setStep('gateway')} loading={loading} isFree={isFree} error={error} coupon={coupon} setCoupon={setCoupon} applyCoupon={applyCoupon} clearCoupon={clearCoupon} couponInfo={couponInfo} couponErr={couponErr} couponBusy={couponBusy} />}
            {step === 'gateway' && <GatewayStep   key="gateway" plan={plan} gateways={gateways} configLoaded={!!config} chooseGateway={chooseGateway} onBack={() => setStep('review')} loading={loading} error={error} amountDue={finalPrice} couponApplied={!!couponInfo} />}
            {step === 'manual'  && <ManualStep    key="manual"  plan={plan} gateway={gateway} config={config} orderId={orderId} proofFile={proofFile} setProof={setProof} txnRef={txnRef} setTxnRef={setTxnRef} onBack={() => setStep('gateway')} onSubmit={submitProof} loading={loading} error={error} amountDue={finalPrice} />}
            {step === 'success' && <SuccessStep   key="success" />}
          </AnimatePresence>
        </div>
      </main>

      <MarketingFooter />
    </div>
  )
}


// ── Step 1: Review plan ─────────────────────────────────────────────────────
function ReviewStep({
  plan, onNext, loading, isFree, error,
  coupon, setCoupon, applyCoupon, clearCoupon, couponInfo, couponErr, couponBusy,
}: {
  plan: ChallengePlan; onNext: () => void; loading: boolean; isFree: boolean; error: string | null
  coupon: string; setCoupon: (v: string) => void; applyCoupon: () => void; clearCoupon: () => void
  couponInfo: { code: string; original: number; discount: number; final: number } | null
  couponErr: string | null; couponBusy: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{plan.name}</h2>
        <p className="text-text-muted mt-1">Review your challenge details before checkout.</p>
      </div>

      <div className="p-5 rounded-xl bg-bg-subtle border border-border-subtle shadow-sm">
        <div className="flex items-baseline justify-between mb-4">
          <span className="text-sm text-text-muted font-medium">Account size</span>
          <span className="text-2xl font-bold tabular tracking-tight">{fmtUSD(plan.account_size, { decimals: 0 })}</span>
        </div>
        <div className="space-y-2 pt-4 border-t border-border-subtle">
          <Row label="Profit target P1"     value={`${toNum(plan.p1_profit_target)}%`} />
          <Row label="Profit target P2"     value={`${toNum(plan.p2_profit_target)}%`} />
          <Row label="Max drawdown"         value={`${toNum(plan.p1_max_dd)}%`} />
          <Row label="Daily drawdown"       value={`${toNum(plan.p1_daily_dd)}%`} />
          <Row label="Max leverage"         value={`1:${plan.max_leverage}`} />
          <Row label="Profit split"         value={`${toNum(plan.funded_profit_split)}%`} highlight />
        </div>
      </div>

      {(toNum(plan.price) > 0 || couponInfo) && (
        <div className="space-y-3">
          {!couponInfo ? (
            <div>
              <Label className="sr-only">Coupon Code</Label>
              <div className="flex gap-2">
                <input
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === 'Enter') applyCoupon() }}
                  placeholder="Have a coupon code?"
                  className="flex-1 h-11 rounded-lg bg-bg border border-border px-4 text-sm uppercase tracking-wide focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all"
                />
                <Button variant="secondary" onClick={applyCoupon} disabled={couponBusy || !coupon.trim()} className="h-11 px-6">
                  {couponBusy ? 'Checking…' : 'Apply'}
                </Button>
              </div>
              {couponErr && <p className="text-xs text-danger mt-2 font-medium">{couponErr}</p>}
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-lg bg-success/10 border border-success/20 text-sm">
              <div className="flex items-center gap-2 text-success font-medium">
                <Check className="h-4 w-4" />
                <span>Coupon <span className="font-bold">{couponInfo.code}</span> applied (−{fmtUSD(couponInfo.discount)})</span>
              </div>
              <button onClick={clearCoupon} className="text-xs text-text-muted hover:text-text transition-colors underline-offset-2 hover:underline">Remove</button>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between p-5 rounded-xl bg-accent/5 border border-accent/20">
        <span className="font-semibold">{isFree ? (couponInfo ? 'Total (100% Free)' : 'Free trial') : 'Total due today'}</span>
        <div className="text-3xl font-bold tabular tracking-tight text-accent flex items-baseline gap-2">
          {couponInfo && (
            <span className="text-base font-normal text-text-muted line-through">{fmtUSD(couponInfo.original)}</span>
          )}
          {isFree ? '$0.00' : fmtUSD(couponInfo ? couponInfo.final : plan.price)}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      <Button onClick={onNext} className="w-full h-12 text-base font-medium shadow-accent/20 hover:shadow-accent/40 shadow-lg transition-all" loading={loading}>
        {isFree ? 'Start challenge' : 'Continue to payment'}
        <ArrowRight className="h-5 w-5 ml-2" />
      </Button>

      <p className="mt-2 text-xs text-text-muted text-center flex items-center justify-center gap-1.5">
        <ShieldCheck className="h-4 w-4" />
        Secure 256-bit SSL encrypted checkout
      </p>
    </motion.div>
  )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1.5 text-sm">
      <span className="text-text-muted">{label}</span>
      <span className={cn('tabular font-semibold tracking-tight', highlight ? 'text-success' : 'text-text')}>{value}</span>
    </div>
  )
}

// ── Step 2: Pick gateway ───────────────────────────────────────────────────
function GatewayStep({
  plan, gateways, configLoaded, chooseGateway, onBack, loading, error, amountDue, couponApplied,
}: {
  plan:     ChallengePlan
  gateways: { id: Gateway; label: string; sub: string; icon: React.ComponentType<{ className?: string }>; tone: string }[]
  configLoaded: boolean
  chooseGateway: (g: Gateway) => void
  onBack:   () => void
  loading:  boolean
  error:    string | null
  amountDue: number
  couponApplied: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Payment Method</h2>
        <p className="text-text-muted mt-1">
          Select how you would like to pay{' '}
          {couponApplied && (
            <span className="line-through text-text-muted/70 mr-1">{fmtUSD(plan.price)}</span>
          )}
          <span className={couponApplied ? 'text-success font-semibold' : ''}>{fmtUSD(amountDue)}</span>.
        </p>
      </div>

      <div className="space-y-3">
        {!configLoaded
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
          : gateways.length === 0
            ? (
              <div className="p-5 rounded-xl bg-warn/10 border border-warn/20 text-sm">
                <div className="font-semibold text-warn flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" /> No payment methods available
                </div>
                <p className="mt-2 text-text-muted">
                  Please contact support to complete this purchase.
                </p>
              </div>
            )
            : gateways.map((g) => {
                const Icon = g.icon
                return (
                  <button
                    key={String(g.id)}
                    onClick={() => chooseGateway(g.id)}
                    disabled={loading}
                    className={cn(
                      'w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-bg hover:bg-bg-subtle',
                      'hover:border-accent/50 hover:shadow-md transition-all',
                      'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface',
                      'text-left disabled:opacity-50 disabled:pointer-events-none group'
                    )}
                  >
                    <div className={cn('h-12 w-12 rounded-lg flex items-center justify-center bg-surface border border-border shadow-sm', g.tone)}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{g.label}</div>
                      <div className="text-sm text-text-muted mt-0.5">{g.sub}</div>
                    </div>
                    {loading ? <Loader2 className="h-5 w-5 animate-spin text-text-muted" /> : <ArrowRight className="h-5 w-5 text-text-muted group-hover:text-accent group-hover:translate-x-1 transition-all" />}
                  </button>
                )
              })}
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      <Button onClick={onBack} variant="ghost" className="w-full text-text-muted hover:text-text">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to review
      </Button>
    </motion.div>
  )
}

// ── Step 3: Manual — show instructions, upload proof ───────────────────────
function ManualStep({
  plan, gateway, config, orderId, proofFile, setProof, txnRef, setTxnRef, onBack, onSubmit, loading, error, amountDue,
}: {
  plan:     ChallengePlan
  gateway:  Gateway
  config:   PaymentConfig | null
  orderId:  number | null
  proofFile: File | null
  setProof: (f: File | null) => void
  txnRef:   string
  setTxnRef: (s: string) => void
  onBack:   () => void
  onSubmit: () => void
  loading:  boolean
  error:    string | null
  amountDue: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Manual Crypto Payment</h2>
        <p className="text-text-muted mt-1">
          Order <code className="text-text font-mono bg-bg-subtle px-1.5 py-0.5 rounded">#{orderId}</code> ·{' '}
          <span className="text-text font-semibold">{fmtUSD(amountDue)}</span> due
        </p>
      </div>

      <CryptoPayBlock config={config} />

      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="txn" className="text-sm font-semibold">Transaction Hash / ID</Label>
          <Input
            id="txn"
            value={txnRef}
            onChange={(e) => setTxnRef(e.target.value)}
            placeholder={'e.g. 0x...'}
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="proof" className="text-sm font-semibold">Payment Proof <span className="text-text-muted font-normal">(Screenshot/receipt)</span></Label>
          <label
            htmlFor="proof"
            className={cn(
              'flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all',
              proofFile ? 'border-success bg-success/5' : 'border-border hover:border-accent/50 hover:bg-bg-subtle',
            )}
          >
            {proofFile ? (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center text-success">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-text truncate max-w-[200px]">{proofFile.name}</div>
                  <div className="text-xs text-text-muted">{(proofFile.size / 1024).toFixed(0)} KB</div>
                </div>
              </div>
            ) : (
              <div className="text-center flex flex-col items-center">
                <div className="h-10 w-10 rounded-full bg-surface border border-border shadow-sm flex items-center justify-center text-text-muted mb-2">
                  <Upload className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-text">Click to upload image or PDF</span>
                <span className="text-xs text-text-muted mt-1">Max file size 5MB</span>
              </div>
            )}
            <input
              id="proof"
              type="file"
              accept="image/png,image/jpeg,image/jpg,application/pdf"
              className="hidden"
              onChange={(e) => setProof(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button onClick={onBack} variant="outline" className="flex-1 h-12">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={onSubmit}
          loading={loading}
          disabled={!proofFile || !txnRef}
          className="flex-[2] h-12 shadow-accent/20 hover:shadow-accent/40 shadow-lg"
        >
          Submit for review
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </motion.div>
  )
}

// ── Success ────────────────────────────────────────────────────────────────
function SuccessStep() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="text-center py-8 space-y-6"
    >
      <div className="h-20 w-20 rounded-full bg-success/10 text-success flex items-center justify-center mx-auto ring-8 ring-success/5">
        <Check className="h-10 w-10" strokeWidth={3} />
      </div>
      
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Order Submitted!</h2>
        <p className="text-text-muted mt-3 max-w-sm mx-auto leading-relaxed">
          We&apos;ve received your payment proof. You&apos;ll be notified via email within 24 hours once it&apos;s approved and your challenge account is provisioned.
        </p>
      </div>
      
      <div className="pt-4">
        <Button asChild size="lg" className="w-full">
          <Link href="/dashboard">
            Go to dashboard
            <ArrowRight className="h-5 w-5 ml-2" />
          </Link>
        </Button>
      </div>
    </motion.div>
  )
}

// ── Crypto payment block: multi-network selector + QR + copy ─────────────────
function CryptoPayBlock({ config }: { config: PaymentConfig | null }) {
  const networks = config?.crypto_networks ?? []
  const [sel, setSel] = useState(0)

  if (!networks.length) {
    return (
      <div className="p-5 rounded-xl bg-bg-subtle border border-border-subtle space-y-3">
        <div className="text-xs uppercase font-bold tracking-wider text-text-muted">Send to Address</div>
        <AddressRow address={config?.crypto_address ?? 'Loading…'} />
        {config?.instructions && (
          <div className="text-sm text-text-muted whitespace-pre-wrap pt-3 border-t border-border-subtle">{config.instructions}</div>
        )}
      </div>
    )
  }

  const active = networks[Math.min(sel, networks.length - 1)]

  return (
    <div className="p-5 rounded-xl bg-bg-subtle border border-border-subtle space-y-4">
      <div>
        <div className="text-xs uppercase font-bold tracking-wider text-text-muted mb-2">Select Network</div>
        <div className="flex flex-wrap gap-2">
          {networks.map((n, i) => (
            <button
              key={n.network}
              onClick={() => setSel(i)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-semibold border transition-all',
                i === sel 
                  ? 'border-accent bg-accent/10 text-accent shadow-sm' 
                  : 'border-border text-text-muted hover:border-accent/50 hover:bg-bg hover:text-text',
              )}
            >
              {n.label && n.label !== n.network ? `${n.network} · ${n.label}` : n.network}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start pt-3 border-t border-border-subtle">
        <div className="shrink-0 p-2 bg-white rounded-xl shadow-sm border border-border/50">
          <QrCode value={active.address} size={130} />
        </div>
        <div className="flex-1 min-w-0 space-y-3 w-full">
          <div>
            <div className="text-xs uppercase font-bold tracking-wider text-text-muted mb-1.5">{active.network} Address</div>
            <AddressRow address={active.address} />
          </div>
          {active.instructions && (
            <div className="text-xs text-warn bg-warn/10 border border-warn/20 p-2.5 rounded-lg whitespace-pre-wrap">{active.instructions}</div>
          )}
          {config?.instructions && (
            <div className="text-xs text-text-muted whitespace-pre-wrap">{config.instructions}</div>
          )}
        </div>
      </div>
    </div>
  )
}

function AddressRow({ address }: { address: string }) {
  const copy = () => {
    try { navigator.clipboard.writeText(address); toast.success('Address copied!') } catch { /* no clipboard */ }
  }
  return (
    <div className="flex items-stretch gap-2">
      <div className="flex-1 text-sm text-text whitespace-pre-wrap break-all font-mono bg-bg p-2.5 rounded-lg border border-border shadow-inner max-h-32 overflow-y-auto">{address}</div>
      <button onClick={copy} className="shrink-0 px-3 rounded-lg border border-border bg-surface text-text-muted hover:text-accent hover:border-accent/50 hover:bg-accent/5 transition-all focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-bg-subtle flex items-center justify-center" aria-label="Copy address">
        <Copy className="h-4 w-4" />
      </button>
    </div>
  )
}
