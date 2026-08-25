'use client'

import { motion } from 'framer-motion'
import { CheckCircle2, Rocket, Trophy } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const STEPS = [
  {
    n: '01',
    icon: Rocket,
    title: 'Take the challenge',
    body: 'Pick an account size from $10K to $200K. Hit the profit target while respecting drawdown limits across two phases.',
    items: ['Phase 1: 8% profit target', 'Phase 2: 5% profit target', 'Max 10% total drawdown'],
  },
  {
    n: '02',
    icon: CheckCircle2,
    title: 'Get funded',
    body: 'Pass both phases and receive a funded account. Trade real markets with our capital — no personal risk.',
    items: ['Real-time MT5 access', 'Same risk parameters', 'Trade what you want'],
  },
  {
    n: '03',
    icon: Trophy,
    title: 'Get paid',
    body: 'Withdraw your share of profits every 14 days. Up to 90% profit split on consistent performance.',
    items: ['80% baseline split', 'Up to 90% scaling', 'Paid in 24 hours'],
  },
]

export function HowItWorks({ puckProps }: { puckProps?: any }) {
  const badge = puckProps?.badge || "The process";
  const titleText1 = puckProps?.titleText1 || "Three steps to";
  const titleAccent = puckProps?.titleAccent || "funded";
  const description = puckProps?.description || "A clear, transparent evaluation. No hidden rules, no surprise breaches. Just real trading on real terms.";
  const steps = puckProps?.steps || STEPS;

  return (
    <section className="relative py-20 lg:py-28" id="how-it-works">
      <div className="container">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <Badge tone="accent" className="mb-4">{badge}</Badge>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            {titleText1} <span className="text-gradient">{titleAccent}</span>
          </h2>
          <p className="mt-4 text-text-muted text-lg">
            {description}
          </p>
        </div>

        <div className="relative">
          {/* gradient connector across step cards (desktop) */}
          <div className="hidden lg:block absolute top-[52px] left-[16%] right-[16%] h-px step-line pointer-events-none" />
          <div className="grid lg:grid-cols-3 gap-6">
            {steps.map((step: any, i: number) => {
              // Support both standard lucide icons if passed directly (fallback), or default if missing
              const Icon = step.icon || Rocket;
              return (
                <motion.div
                  key={step.n}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className="relative group"
                >
                  <div className="relative h-full p-6 rounded-xl bg-surface border border-border lift card-glow overflow-hidden">
                    {/* big background number */}
                    <div className="absolute -top-2 -right-2 text-7xl font-bold tracking-tighter select-none opacity-[0.08] text-gradient">
                      {step.n}
                    </div>

                    <div className="relative">
                      <div className="relative h-11 w-11 rounded-lg bg-accent-muted text-accent flex items-center justify-center mb-5 ring-1 ring-accent/20 z-10">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-xl font-semibold tracking-tight">{step.title}</h3>
                      <p className="mt-2 text-sm text-text-muted leading-relaxed">{step.body}</p>

                      <ul className="mt-5 space-y-2">
                        {step.items && step.items.map((it: any, idx: number) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                            <span className="text-text-muted">{it.itemText || it}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
