'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { ChallengeAccount, Certificate as Cert, PayoutItem } from '@/types/api'
import { CertificateDocument, PayoutCertificateDocument } from '@/components/certificate-document'
import { downloadCertificatePdf } from '@/lib/certificate-pdf'
import { downloadPayoutCertificatePdf } from '@/lib/certificate-payout-pdf'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/ui/page-header'
import { Award, Download, ExternalLink } from 'lucide-react'

export default function CertificatesPage() {
  const { data, isPending } = useQuery({
    queryKey: ['certificatesData'],
    queryFn: async () => {
      const res = await api.challengeMy()
      const poRes = await api.payouts()
      
      let eligible: ChallengeAccount[] = []
      let certsData: Record<number, Cert | null> = {}
      let payoutsData: PayoutItem[] = []

      if (res.ok) {
        eligible = res.data.filter((c) => c.status === 'passed' || c.status === 'funded')
        
        const results = await Promise.all(eligible.map(async (c) => {
          const r = await api.certificate(c.id)
          return [c.id, r.ok ? r.data : null] as const
        }))
        certsData = Object.fromEntries(results)
      }

      if (poRes.ok && poRes.data?.history) {
        payoutsData = poRes.data.history.filter(p => p.status === 'paid')
      }

      return { eligible, certsData, payoutsData }
    }
  })

  const loading = isPending && !data

  const list = data?.eligible ?? null
  const certs = data?.certsData ?? {}
  const payoutList = data?.payoutsData ?? null

  return (
    <div className="space-y-8">
      <PageHeader
        variant="hero"
        title="Your Certificates"
        description="Earn a certificate for every passed or funded challenge. Share them publicly with confidence."
        icon={Award}
        badge={{ label: 'Achievements', tone: 'accent' }}
      />

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => <Card key={i} className="p-6"><Skeleton className="h-64 w-full" /></Card>)}
        </div>
      ) : !list || list.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <div className="inline-flex h-12 w-12 rounded-xl bg-accent/10 text-accent items-center justify-center mb-4">
              <Award className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-text">No certificates yet</h2>
            <p className="text-sm text-text-muted mt-2 max-w-md mx-auto leading-relaxed">
              Pass an evaluation to earn your first certificate.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className={list.length === 1 ? "flex justify-center" : "grid md:grid-cols-2 gap-6"}>
          {list.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className={list.length === 1 ? "w-full max-w-lg" : ""}
            >
              <CertificateCard cert={certs[c.id]} challenge={c} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Payout Certificates */}
      {payoutList && payoutList.length > 0 && (
        <div className="pt-8 mt-8 border-t border-border-subtle">
          <h2 className="text-xl font-bold tracking-tight text-text mb-4">Payout Certificates</h2>
          <div className={payoutList.length === 1 ? "flex justify-center" : "grid md:grid-cols-2 gap-6"}>
            {payoutList.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className={payoutList.length === 1 ? "w-full max-w-lg" : ""}
              >
                <PayoutCertCard 
                  payout={p} 
                  planName={list?.find(c => c.id === p.challenge_id)?.plan_name || (p as any).plan_name || 'Funded Trader Program'} 
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CertificateCard({ cert, challenge }: { cert: Cert | null | undefined; challenge: ChallengeAccount }) {
  const c = cert
  const [downloading, setDownloading] = useState(false)

  if (c === undefined) return <Card className="p-6"><Skeleton className="h-72 w-full" /></Card>
  if (c === null) return (
    <Card><CardContent className="py-12 text-center text-sm text-text-muted">Certificate unavailable yet</CardContent></Card>
  )

  const doc: Cert = { ...c, status: c.status ?? challenge.status }
  const shareHref = c.share_code ? `/certificate/${c.share_code}` : undefined
  const download = async () => {
    setDownloading(true)
    try { await downloadCertificatePdf(doc) }
    catch { toast.error('Could not generate the PDF. Please try again.') }
    finally { setDownloading(false) }
  }

  return (
    <Card className="overflow-hidden relative">
      <CertificateDocument cert={doc} />
      <div className="px-6 pb-4 -mt-1 flex items-center justify-end gap-1.5">
        {shareHref && (
          <a href={shareHref} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm"><ExternalLink className="h-4 w-4" /> View / Share</Button>
          </a>
        )}
        <Button variant="ghost" size="sm" onClick={download} loading={downloading}>
          <Download className="h-4 w-4" /> Download
        </Button>
      </div>
    </Card>
  )
}

function PayoutCertCard({ payout, planName }: { payout: PayoutItem; planName?: string }) {
  const [downloading, setDownloading] = useState(false)

  const download = async () => {
    setDownloading(true)
    try { await downloadPayoutCertificatePdf(payout, { planName }) }
    catch { toast.error('Could not generate the PDF. Please try again.') }
    finally { setDownloading(false) }
  }

  return (
    <Card className="overflow-hidden relative border-success/20">
      <PayoutCertificateDocument payout={payout} planName={planName} />
      <div className="px-6 pb-4 -mt-1 flex items-center justify-end gap-1.5">
        <Button variant="ghost" size="sm" onClick={download} loading={downloading} className="text-success hover:text-success hover:bg-success/10">
          <Download className="h-4 w-4" /> Download Payout Certificate
        </Button>
      </div>
    </Card>
  )
}
