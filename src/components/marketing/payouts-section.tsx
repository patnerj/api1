'use client'

import { motion } from 'framer-motion'
import { ArrowUpRight, Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function PayoutsSection({ puckProps }: { puckProps?: any }) {
  const badge = puckProps?.badge || "Payouts";
  const titleText1 = puckProps?.titleText1 || "Get paid in";
  const titleAccent = puckProps?.titleAccent || "24 hours";
  const description = puckProps?.description || "First payout 14 days after funding. Then bi-weekly. No minimums, no fees, and a scaling profit split that rewards consistency.";
  const items = puckProps?.items || [
    { itemText: 'Bi-weekly payout cycle — withdraw on your schedule' },
    { itemText: 'Crypto (USDT) or Wise — your choice' },
    { itemText: 'Profit split scales 80% → 85% → 90% with milestones' },
    { itemText: 'Account scaling: hit 10% profit, get a bigger account' },
    { itemText: 'No hidden fees, no surprises, fully transparent' },
  ];

  return (
    <section className="py-20 lg:py-28 relative overflow-hidden" id="payouts">
      <div className="absolute inset-0 -z-10 bg-aurora opacity-50" />
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <Badge tone="accent" className="mb-4">{badge}</Badge>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              {titleText1} <span className="text-gradient">{titleAccent}</span>
            </h2>
            <p className="mt-4 text-text-muted text-lg">
              {description}
            </p>

            <ul className="mt-8 space-y-3">
              {items.map((it: any, idx: number) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="h-3 w-3" />
                  </div>
                  <span className="text-sm text-text">{it.itemText || it}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <PayoutVisual />
          </motion.div>
        </div>
      </div>
    </section>
  )
}

function PayoutVisual() {
  // Decorative — illustrates the payout cycle
  const payouts = [
    { date: 'Jan 15', amount: '$2,340',  account: '$100K' },
    { date: 'Feb 01', amount: '$3,180',  account: '$100K' },
    { date: 'Feb 15', amount: '$4,720',  account: '$150K', scaled: true },
    { date: 'Mar 01', amount: '$5,890',  account: '$150K' },
  ]

  return (
    <div className="relative rounded-xl border border-border bg-surface overflow-hidden shadow-card-lg">
      <div className="absolute inset-0 bg-grid-overlay opacity-50 pointer-events-none" />
      <div className="relative p-6">
        <div className="flex items-center justify-between mb-1">
          <div>
            <div className="text-xs text-text-muted">Total earnings</div>
            <div className="text-3xl font-bold tracking-tight">$16,130<span className="text-text-muted text-base">.00</span></div>
          </div>
          <Badge tone="success" className="font-medium">
            <ArrowUpRight className="h-3 w-3" />
            +12.4% MoM
          </Badge>
        </div>

        <div className="mt-6 space-y-2">
          {payouts.map((p, i) => (
            <motion.div
              key={p.date}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 + i * 0.08 }}
              className="flex items-center justify-between py-3 px-4 rounded-lg bg-bg-subtle border border-border-subtle hover:border-border transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-md bg-accent/10 text-accent flex items-center justify-center">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-medium">{p.amount}</div>
                  <div className="text-xs text-text-muted">{p.date} · {p.account} account</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {p.scaled && <Badge tone="accent">Scaled</Badge>}
                <Badge tone="success">Paid</Badge>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
