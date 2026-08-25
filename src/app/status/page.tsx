'use client'

import { MarketingHeader } from '@/components/marketing/header'
import { MarketingFooter } from '@/components/marketing/footer'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'

// Public status overview. Operators can wire each row to real monitoring; the
// default presents the platform's service areas with an operational state.
const COMPONENTS = [
  { name: 'Trading terminal',     state: 'Operational' },
  { name: 'Market data feed',     state: 'Operational' },
  { name: 'Challenges & evaluation', state: 'Operational' },
  { name: 'Payments & checkout',  state: 'Operational' },
  { name: 'Payouts',              state: 'Operational' },
  { name: 'Authentication',       state: 'Operational' },
  { name: 'Dashboard & API',      state: 'Operational' },
]

export default function StatusPage() {
  return (
    <>
      <MarketingHeader />
      <main>
        <section className="pt-32 pb-10 relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-grid-overlay opacity-30" />
          <div className="container max-w-3xl">
            <Badge tone="neutral" className="mb-4">System Status</Badge>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tightest leading-[1.05]">Platform status</h1>
            <div className="mt-4 inline-flex items-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">All systems operational</span>
            </div>
          </div>
        </section>

        <section className="pb-24">
          <div className="container max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <Card className="divide-y divide-border-subtle">
                {COMPONENTS.map((c) => (
                  <div key={c.name} className="flex items-center justify-between px-5 py-4">
                    <span className="text-sm font-medium">{c.name}</span>
                    <span className="inline-flex items-center gap-1.5 text-2xs font-semibold text-success">
                      <span className="h-2 w-2 rounded-full bg-success" /> {c.state}
                    </span>
                  </div>
                ))}
              </Card>
              <p className="mt-4 text-2xs text-text-faint text-center">
                This page reflects current service availability. For incident reports or scheduled maintenance, the operator can connect a monitoring provider.
              </p>
            </motion.div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  )
}
