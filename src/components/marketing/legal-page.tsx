'use client'

import { MarketingHeader } from '@/components/marketing/header'
import { MarketingFooter } from '@/components/marketing/footer'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'

interface Section { title: string; body: React.ReactNode }
interface Props {
  title:    string
  intro:    string
  sections: Section[]
  updated:  string
}

export function LegalPage({ title, intro, sections, updated }: Props) {
  return (
    <>
      <MarketingHeader />
      <main>
        <section className="pt-32 pb-10 relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-grid-overlay opacity-30" />
          <div className="container max-w-3xl">
            <Badge tone="neutral" className="mb-4">Legal</Badge>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tightest leading-[1.05]">{title}</h1>
            <p className="mt-4 text-text-muted">{intro}</p>
            <p className="mt-2 text-2xs text-text-faint">Last updated {updated}</p>
          </div>
        </section>

        <section className="pb-24">
          <div className="container max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-10"
            >
              {sections.map((s, i) => (
                <div key={i}>
                  <h2 className="text-lg font-semibold tracking-tight mb-3">{s.title}</h2>
                  <div className="text-sm text-text-muted leading-relaxed space-y-3">{s.body}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  )
}
