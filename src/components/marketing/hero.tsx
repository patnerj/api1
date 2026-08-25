'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Sparkles, TrendingUp, Shield } from 'lucide-react'
import { LivePriceTicker } from './live-price-ticker'

export function Hero({ puckProps }: { puckProps?: { title: string, highlight: string, subtitle: string, badge: string } }) {
  const title = puckProps?.title || "Trade";
  const highlight = puckProps?.highlight || "our capital.";
  const subtitle = puckProps?.subtitle || "Pass our two-phase evaluation, get funded with up to $200,000, and trade with zero personal financial risk. Withdraw profits in 24 hours.";
  const badge = puckProps?.badge || "Now accepting traders worldwide";

  return (
    <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
      {/* atmospheric background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-aurora" />
        <div className="absolute inset-0 beam-top" />
        <div className="absolute inset-0 bg-grid-overlay opacity-50" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="container">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 mb-8"
          >
            <Badge tone="accent" className="px-3 py-1.5 text-xs shadow-glow-sm bg-accent/10 border-accent/30">
              <Sparkles className="h-3 w-3" />
              {badge}
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tightest leading-[1.05]"
          >
            {title} <span className="bg-gradient-to-r from-accent via-success to-accent bg-[length:200%_auto] animate-gradient bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">{highlight}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 text-lg md:text-xl text-text-muted max-w-2xl mx-auto whitespace-pre-line leading-relaxed"
          >
            {subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Button asChild size="xl" className="bg-gradient-to-r from-accent to-success hover:from-accent-hover hover:to-success-hover text-white shadow-glow hover:shadow-glow-success transition-all duration-300 group btn-shine">
              <Link href="/challenges">
                Start the challenge
                <ArrowRight className="h-4 w-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button asChild size="xl" variant="outline" className="hover:bg-surface-muted/50 border-border-subtle transition-colors">
              <Link href="/#how-it-works">How it works</Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-12 flex flex-wrap justify-center items-center gap-x-8 gap-y-3 text-sm text-text-muted"
          >
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-success" />
              <span>SOC 2 compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <span>$48M+ paid out</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span>12,400+ active traders</span>
            </div>
          </motion.div>
        </div>

        {/* Live ticker below the fold edge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-14 lg:mt-20"
        >
          <div className="rounded-2xl border border-border-subtle bg-bg/50 backdrop-blur-md p-1 shadow-card overflow-hidden">
            <LivePriceTicker />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
