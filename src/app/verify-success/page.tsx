'use client'

import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CheckCircle2, AlertCircle, ArrowRight, RotateCcw, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/store/auth'

type State = 'loading' | 'success' | 'expired' | 'invalid'

export default function VerifySuccessPage() {
  return (
    <Suspense fallback={null}>
      <VerifyResult />
    </Suspense>
  )
}

function VerifyResult() {
  const params = useSearchParams()
  const token = params.get('token')
  const legacyStatus = params.get('status')
  const legacyMsg = params.get('msg')

  // Legacy backend-redirect path still supported; token path is verified in-SPA.
  const initial: State = legacyStatus === 'success' ? 'success'
    : legacyStatus === 'error' ? 'invalid'
    : token ? 'loading' : 'invalid'

  const [state, setState] = useState<State>(initial)
  const [msg, setMsg] = useState<string | null>(legacyMsg)

  useEffect(() => {
    if (state !== 'loading' || !token) return
    let cancel = false
    api.auth.verifyEmail(token).then((res) => {
      if (cancel) return
      if (res.ok) {
        setState(res.data.status); setMsg(res.data.message)
        // Refresh the logged-in user so email_verified flips and the dashboard
        // verify banner disappears with no manual reload.
        if (res.data.status === 'success') { void useAuth.getState().refresh(true) }
      }
      else { setState('invalid'); setMsg('We could not verify this link. Please try again.') }
    })
    return () => { cancel = true }
  }, [state, token])

  const ok = state === 'success'
  const loading = state === 'loading'

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-4 bg-bg">
      <div className="mb-8"><Logo /></div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="w-full max-w-md">
        <Card className="p-8 text-center">
          {loading ? (
            <>
              <div className="h-16 w-16 rounded-full bg-accent-muted text-accent inline-flex items-center justify-center mx-auto mb-5">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
              <h1 className="text-xl font-bold">Verifying your email…</h1>
              <p className="text-sm text-text-muted mt-2">This will only take a moment.</p>
            </>
          ) : ok ? (
            <>
              <div className="h-16 w-16 rounded-full bg-success-muted text-success inline-flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h1 className="text-xl font-bold">Email verified successfully</h1>
              <p className="text-sm text-text-muted mt-2">
                Your email is confirmed and your account is active. You can head straight to your dashboard.
              </p>
              <Button asChild className="mt-6 w-full">
                <Link href="/dashboard">Go to Dashboard <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </>
          ) : (
            <>
              <div className="h-16 w-16 rounded-full bg-danger-muted text-danger inline-flex items-center justify-center mx-auto mb-5">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h1 className="text-xl font-bold">{state === 'expired' ? 'Link expired' : 'Verification failed'}</h1>
              <p className="text-sm text-text-muted mt-2">
                {msg || (state === 'expired'
                  ? 'This verification link has expired or was already used. Please request a new one from your dashboard.'
                  : 'This verification link is invalid.')}
              </p>
              <div className="flex flex-col sm:flex-row gap-2 mt-6">
                <Button asChild variant="outline" className="flex-1">
                  <Link href="/dashboard"><RotateCcw className="h-4 w-4" /> Resend from dashboard</Link>
                </Button>
                <Button asChild className="flex-1">
                  <Link href="/login">Go to login <ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </div>
            </>
          )}
        </Card>
      </motion.div>
    </main>
  )
}
