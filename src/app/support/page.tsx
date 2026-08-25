'use client'

import { MarketingHeader } from '@/components/marketing/header'
import { MarketingFooter } from '@/components/marketing/footer'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { Rocket, CreditCard, Wallet, ShieldCheck, BarChart3, HelpCircle } from 'lucide-react'

const TOPICS = [
  { icon: Rocket,      title: 'Getting started',     desc: 'Create an account, verify your email, and buy your first challenge.', href: '/#how-it-works' },
  { icon: BarChart3,   title: 'Challenges & rules',  desc: 'How evaluation phases, targets, and trading rules work.',             href: '/faq' },
  { icon: CreditCard,  title: 'Payments',            desc: 'Card and crypto checkout, receipts, and billing questions.',          href: '/contact' },
  { icon: Wallet,      title: 'Payouts',             desc: 'Requesting a payout, KYC, and how approvals work.',                   href: '/faq' },
  { icon: ShieldCheck, title: 'Account & security',  desc: 'Login help, 2FA, and keeping your account safe.',                     href: '/contact' },
  { icon: HelpCircle,  title: 'Everything else',     desc: 'Anything not covered above — we’re happy to help.',                   href: '/contact' },
]

export default function SupportPage() {
  return (
    <>
      <MarketingHeader />
      <main>
        <section className="pt-32 pb-10 relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-grid-overlay opacity-30" />
          <div className="container max-w-4xl">
            <Badge tone="neutral" className="mb-4">Support Center</Badge>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tightest leading-[1.05]">How can we help?</h1>
            <p className="mt-4 text-text-muted">Browse by topic, or <a className="text-accent hover:underline" href="/contact">contact us directly</a>.</p>
          </div>
        </section>

        <section className="pb-24">
          <div className="container max-w-4xl">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {TOPICS.map((t) => {
                const Icon = t.icon
                return (
                  <a key={t.title} href={t.href}>
                    <Card className="p-6 h-full transition-colors hover:border-accent/50 hover:bg-accent/5">
                      <Icon className="h-5 w-5 text-accent mb-3" />
                      <div className="font-semibold mb-1">{t.title}</div>
                      <p className="text-sm text-text-muted">{t.desc}</p>
                    </Card>
                  </a>
                )
              })}
            </motion.div>

            <div className="mt-10 text-center">
              <p className="text-sm text-text-muted">Can’t find what you need?</p>
              <a href="/contact" className="inline-block mt-2 text-accent hover:underline font-medium">Contact support →</a>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  )
}
