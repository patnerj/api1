'use client'

import { useEffect, useState } from 'react'
import { MarketingHeader } from '@/components/marketing/header'
import { MarketingFooter } from '@/components/marketing/footer'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { api } from '@/lib/api'
import { Mail, LifeBuoy, BookOpen, ShieldCheck } from 'lucide-react'
import { motion } from 'framer-motion'

export default function ContactPage() {
  const [email, setEmail] = useState('')
  useEffect(() => { api.branding().then((r) => { if (r.ok && r.data.support_email) setEmail(r.data.support_email) }) }, [])
  const support = email || 'support@yourfirm.com'

  return (
    <>
      <MarketingHeader />
      <main>
        <section className="pt-32 pb-10 relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-grid-overlay opacity-30" />
          <div className="container max-w-3xl">
            <Badge tone="neutral" className="mb-4">Contact</Badge>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tightest leading-[1.05]">Get in touch</h1>
            <p className="mt-4 text-text-muted">We read every message. For the fastest help, include your account email and order reference.</p>
          </div>
        </section>

        <section className="pb-24">
          <div className="container max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="grid sm:grid-cols-2 gap-4">
              <Card className="p-6">
                <Mail className="h-5 w-5 text-accent mb-3" />
                <div className="font-semibold mb-1">Email support</div>
                <p className="text-sm text-text-muted mb-3">For account, billing, payout, and verification questions.</p>
                <a href={`mailto:${support}`} className="text-accent hover:underline text-sm font-medium">{support}</a>
              </Card>
              <Card className="p-6">
                <LifeBuoy className="h-5 w-5 text-accent mb-3" />
                <div className="font-semibold mb-1">Support Center</div>
                <p className="text-sm text-text-muted mb-3">Guides and answers to common questions, available any time.</p>
                <a href="/support" className="text-accent hover:underline text-sm font-medium">Browse the Support Center</a>
              </Card>
              <Card className="p-6">
                <BookOpen className="h-5 w-5 text-accent mb-3" />
                <div className="font-semibold mb-1">FAQ</div>
                <p className="text-sm text-text-muted mb-3">Quick answers about challenges, payouts, and rules.</p>
                <a href="/faq" className="text-accent hover:underline text-sm font-medium">Read the FAQ</a>
              </Card>
              <Card className="p-6">
                <ShieldCheck className="h-5 w-5 text-accent mb-3" />
                <div className="font-semibold mb-1">Trust &amp; safety</div>
                <p className="text-sm text-text-muted mb-3">Report a concern or a security issue.</p>
                <a href={`mailto:${support}`} className="text-accent hover:underline text-sm font-medium">Contact the team</a>
              </Card>
            </motion.div>

            <div className="mt-8 rounded-lg border border-border-subtle bg-bg-subtle/40 p-5">
              <div className="font-semibold text-sm mb-2">When you write in, please include:</div>
              <ul className="text-sm text-text-muted space-y-1 list-disc pl-5">
                <li>The email address on your account</li>
                <li>Your order or payout reference, if relevant</li>
                <li>A clear description of what happened and what you expected</li>
              </ul>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  )
}
