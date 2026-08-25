'use client'

import { motion } from 'framer-motion'
import { Users, DollarSign, Award, Clock } from 'lucide-react'
import { NumberTicker } from '@/components/ui/number-ticker'

const STATS = [
  { icon: DollarSign, value: 48,    decimals: 0, suffix: 'M+', label: 'Profits paid out',       tone: 'text-success' },
  { icon: Users,      value: 12.4,  decimals: 1, suffix: 'K+', label: 'Funded traders',          tone: 'text-accent'  },
  { icon: Award,      value: 94,    decimals: 0, suffix: '%',  label: 'On-time payout rate',     tone: 'text-info'    },
  { icon: Clock,      value: 24,    decimals: 0, suffix: 'h',  label: 'Avg. payout processing',  tone: 'text-warn'    },
]

export function LiveStatsStrip() {
  return (
    <section className="relative py-12 border-y border-border-subtle bg-bg-subtle/40">
      <div className="container">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-border-subtle">
          {STATS.map((stat, i) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="group px-6 py-4 lift rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-surface-muted flex items-center justify-center transition-colors group-hover:bg-accent/10">
                    <Icon className={`h-4 w-4 ${stat.tone}`} />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold tracking-tight tabular">
                      <NumberTicker value={stat.value} decimals={stat.decimals} />
                      <span className={stat.tone}>{stat.suffix}</span>
                    </div>
                    <div className="text-xs text-text-muted">{stat.label}</div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
