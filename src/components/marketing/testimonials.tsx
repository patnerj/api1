'use client'

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Quote, TrendingUp } from 'lucide-react'

const STORIES = [
  {
    name: 'Sebastian Müller',
    role: 'Forex trader · Berlin',
    quote: 'Passed the $100K challenge in 18 days. First payout hit my wallet 22 hours after request. The drawdown UI is the cleanest I have used.',
    pnl: '+$8,420',
    account: '$100K funded',
  },
  {
    name: 'Maya Patel',
    role: 'Day trader · London',
    quote: 'I have tried four prop firms. The rule transparency here, the live R:R tracker, and the certificate — this is the only one I will recommend.',
    pnl: '+$12,180',
    account: '$200K funded',
  },
  {
    name: 'Hiro Tanaka',
    role: 'Swing trader · Tokyo',
    quote: 'The hourly heatmap showed me that 78% of my losses came in the first hour of London open. I changed my routine and tripled my win rate.',
    pnl: '+$4,930',
    account: '$50K funded',
  },
]

export function Testimonials({ puckProps }: { puckProps?: any }) {
  const badge = puckProps?.badge || "Trader stories";
  const titleText1 = puckProps?.titleText1 || "From challenge to";
  const titleAccent = puckProps?.titleAccent || "first payout";
  const stories = puckProps?.stories || STORIES;

  return (
    <section className="py-20 lg:py-28 bg-bg-subtle/40">
      <div className="container">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <Badge tone="accent" className="mb-4">{badge}</Badge>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            {titleText1} <span className="text-gradient">{titleAccent}</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {stories.map((story: any, i: number) => (
            <motion.div
              key={story.name + i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <Card className="h-full p-6 lift">
                <Quote className="h-5 w-5 text-accent/40 mb-4" />
                <p className="text-text leading-relaxed">{story.quote}</p>

                <div className="mt-6 flex items-center justify-between pt-4 border-t border-border-subtle">
                  <div>
                    <div className="text-sm font-medium">{story.name}</div>
                    <div className="text-xs text-text-muted">{story.role}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-success flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5" />
                      {story.pnl}
                    </div>
                    <div className="text-xs text-text-muted">{story.account}</div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
