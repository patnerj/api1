'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'
import { invalidateFxsim } from '@/lib/fxsim'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, AlertCircle, ArrowRight, Clock, Loader2 } from 'lucide-react'
import type { PaymentOrder } from '@/types/api'

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<Shell><Loader2 className="h-6 w-6 animate-spin text-accent" /></Shell>}>
      <CheckoutSuccessInner />
    </Suspense>
  )
}

type Phase = 'loading' | 'success' | 'processing' | 'cancel' | 'error'

const RECENT_WINDOW_MS = 15 * 60 * 1000   // pending/submitted orders: only "recent" ones count
const POLL_ATTEMPTS    = 5                 // webhook can lag a few seconds behind redirect
const POLL_DELAY_MS    = 2_500

/** Defensive parse: handles naive-UTC ("2026-01-02 03:04:05"), ISO-Z and
 *  offset-aware strings. Returns NaN for garbage instead of throwing. */
function parseOrderTime(raw: string): number {
  if (!raw) return NaN
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)) return new Date(raw).getTime()
  return new Date(raw.replace(' ', 'T') + 'Z').getTime()
}

function CheckoutSuccessInner() {
  const params = useSearchParams()
  const status = params.get('status') // 'success' | 'cancel' | null
  const [phase, setPhase] = useState<Phase>('loading')

  useEffect(() => {
    // Invalidate all the caches so the dashboard reflects the new challenge immediately
    invalidateFxsim('/challenge/my')
    invalidateFxsim('/payment/my-orders')
    invalidateFxsim('/account')

    if (status === 'cancel') { setPhase('cancel'); return }

    // Verify the payment against REAL order state — never trust the redirect.
    // Gateway webhooks (Stripe/Confirmo/CoinPayments) mark orders 'approved';
    // manual-crypto orders stay 'submitted' until an admin reviews the proof.
    // An 'approved' order is conclusive REGARDLESS of age (bookmark/refresh of
    // this URL must not turn a paid order into a scary error); the recency
    // window only qualifies pending/submitted orders as "ours".
    let cancelled = false
    ;(async () => {
      for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
        if (cancelled) return
        const res = await api.paymentMyOrders(true) // force — bypass the 10s cache or polling is illusory
        if (!res.ok) {
          if (attempt === POLL_ATTEMPTS - 1) { setPhase('error'); return }
        } else {
          const orders: PaymentOrder[] = Array.isArray(res.data) ? res.data : []
          if (orders.some((o) => o.status === 'approved')) { setPhase('success'); return }
          const cutoff = Date.now() - RECENT_WINDOW_MS
          const recentAwaiting = orders.some((o) => {
            if (o.status !== 'pending' && o.status !== 'submitted') return false
            const created = parseOrderTime(o.created_at)
            return Number.isFinite(created) && created >= cutoff
          })
          if (recentAwaiting && attempt === POLL_ATTEMPTS - 1) { setPhase('processing'); return }
        }
        await new Promise((r) => setTimeout(r, POLL_DELAY_MS))
      }
      if (!cancelled) setPhase('error')
    })()

    return () => { cancelled = true }
  }, [status])

  if (phase === 'loading') {
    return <Shell><Loader2 className="h-6 w-6 animate-spin text-accent" /><p className="mt-3 text-sm text-text-muted">Confirming your payment…</p></Shell>
  }

  if (phase === 'cancel') {
    return (
      <Shell>
        <div className="h-12 w-12 rounded-full bg-warn-muted text-warn flex items-center justify-center">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Checkout cancelled</h1>
        <p className="mt-2 text-sm text-text-muted">No charge was made. You can try again whenever you&apos;re ready.</p>
        <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
          <Button asChild><Link href="/challenges">Back to challenges <ArrowRight className="h-4 w-4" /></Link></Button>
          <Button asChild variant="ghost"><Link href="/dashboard">Go to dashboard</Link></Button>
        </div>
      </Shell>
    )
  }

  if (phase === 'processing') {
    return (
      <Shell>
        <div className="h-12 w-12 rounded-full bg-warn-muted text-warn flex items-center justify-center">
          <Clock className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Payment received — pending confirmation</h1>
        <p className="mt-2 text-sm text-text-muted max-w-md mx-auto">
          Your order is in our queue. Crypto/manual payments are confirmed after verification — you&apos;ll get an email as soon as your challenge is activated. You can track the status from your dashboard.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
          <Button asChild><Link href="/dashboard">Go to dashboard <ArrowRight className="h-4 w-4" /></Link></Button>
          <Button asChild variant="ghost"><Link href="/dashboard/payouts">View order status</Link></Button>
        </div>
      </Shell>
    )
  }

  if (phase === 'error') {
    return (
      <Shell>
        <div className="h-12 w-12 rounded-full bg-danger-muted text-danger flex items-center justify-center">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">We couldn&apos;t confirm your payment</h1>
        <p className="mt-2 text-sm text-text-muted">If you completed checkout, your challenge may take up to a minute to appear in your dashboard.</p>
        <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
          <Button asChild><Link href="/dashboard">Go to dashboard <ArrowRight className="h-4 w-4" /></Link></Button>
          <Button asChild variant="ghost"><Link href="/dashboard/payouts">View order status</Link></Button>
        </div>
      </Shell>
    )
  }

  // success — verified against an 'approved' order via the API
  return (
    <Shell>
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="h-14 w-14 rounded-full bg-success-muted text-success flex items-center justify-center"
      >
        <CheckCircle2 className="h-7 w-7" />
      </motion.div>
      <h1 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight">Payment confirmed</h1>
      <p className="mt-2 text-sm text-text-muted max-w-md mx-auto">
        Your challenge is being activated. You&apos;ll receive an email when it&apos;s ready — usually within a few seconds.
      </p>
      <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
        <Button asChild size="lg">
          <Link href="/dashboard">Open dashboard <ArrowRight className="h-4 w-4" /></Link>
        </Button>
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-bg relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-aurora opacity-50" />
      <div className="absolute inset-0 -z-10 bg-grid-overlay opacity-30" />
      <Card className="w-full max-w-md text-center">
        <CardContent className="p-8 flex flex-col items-center">{children}</CardContent>
      </Card>
    </main>
  )
}
