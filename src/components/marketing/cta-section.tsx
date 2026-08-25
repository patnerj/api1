'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

export function CTASection({ puckProps }: { puckProps?: { title: string, highlight: string, description: string } }) {
  const title = puckProps?.title || "Ready to trade";
  const highlight = puckProps?.highlight || "our capital?";
  const description = puckProps?.description || "Free account in 30 seconds. Start the challenge today. Get funded within weeks, not months.";

  return (
    <section className="py-20 lg:py-28 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid-overlay opacity-30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/15 blur-3xl" />
      </div>

      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative max-w-4xl mx-auto rounded-3xl border border-border-subtle bg-surface/40 backdrop-blur-md px-6 py-16 lg:py-20 text-center overflow-hidden shadow-card-lg"
        >
          {/* panel atmosphere */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 beam-top" />
            <div className="absolute inset-0 bg-grid-overlay opacity-30" />
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full bg-accent/15 blur-3xl" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-2/3 bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
          </div>

          <div className="relative max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tightest leading-[1.05]">
              {title}
              <br />
              <span className="text-gradient">{highlight}</span>
            </h2>
            <p className="mt-6 text-lg text-text-muted max-w-xl mx-auto whitespace-pre-line">
              {description}
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="xl" variant="primary" className="btn-shine shadow-glow hover:shadow-glow-success transition-shadow duration-300">
                <Link href="/register">
                  Create free account
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="xl" variant="outline" className="hover:bg-surface-muted/50 border-border-subtle transition-colors">
                <Link href="/challenges">View challenges</Link>
              </Button>
            </div>

            <p className="mt-6 text-xs text-text-faint">
              No credit card required · Free demo account included
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
