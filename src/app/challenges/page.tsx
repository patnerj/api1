'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { MarketingHeader } from '@/components/marketing/header'
import { MarketingFooter } from '@/components/marketing/footer'
import { ChallengesPreview } from '@/components/marketing/challenges-preview'

export default function ChallengesPage() {
  return (
    <Suspense fallback={<ChallengesPageSkeleton />}>
      <ChallengesPageInner />
    </Suspense>
  )
}

function ChallengesPageSkeleton() {
  return (
    <>
      <MarketingHeader />
      <main className="min-h-[80vh] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-10 w-48 bg-surface-muted rounded" />
          <div className="h-6 w-96 bg-surface-muted rounded" />
        </div>
      </main>
      <MarketingFooter />
    </>
  )
}

function ChallengesPageInner() {
  const router = useRouter()
  const params = useSearchParams()

  // Stripe cancel return → inform the trader and clean the URL.
  useEffect(() => {
    if (params.get('stripe') === 'cancelled') {
      toast.info('Checkout cancelled — no payment was taken.')
      if (typeof window !== 'undefined') window.history.replaceState({}, '', '/challenges')
    }
  }, [params])

  return (
    <>
      <MarketingHeader />
      <main className="pt-20 pb-20">
        <ChallengesPreview onSelectPlan={(id) => {
          router.push(`/checkout?plan=${id}`)
        }} />
      </main>
      <MarketingFooter />
    </>
  )
}
