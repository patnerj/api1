'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MarketingHeader } from '@/components/marketing/header'
import { MarketingFooter } from '@/components/marketing/footer'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

interface QA { q: string; a: string }
interface Section { title: string; items: QA[] }

const SECTIONS: Section[] = [
  {
    title: 'Getting started',
    items: [
      { q: 'How does the evaluation work?',
        a: 'You buy a challenge for the account size you want (from $10K up to $200K). You then complete two phases: Phase 1 requires an 8% profit target without breaching daily or max drawdown; Phase 2 requires 5%. Once both phases are passed, you receive a funded account and start trading our capital.' },
      { q: 'What instruments can I trade?',
        a: 'We support 19 instruments including the seven major forex pairs (EURUSD, GBPUSD, USDJPY, etc.), gold (XAUUSD), silver (XAGUSD), major indices (US30, NAS100, SPX500, GER40), and the largest cryptos (BTCUSD, ETHUSD).' },
      { q: 'Is there a time limit?',
        a: 'Phase 1 and Phase 2 each have a 30-day window, with a 5-day minimum so accounts cannot pass in a single big trade. Funded accounts have no time limit.' },
    ],
  },
  {
    title: 'Rules & risk',
    items: [
      { q: 'What is the daily drawdown?',
        a: 'Your equity can fall a maximum of 5% from the daily starting balance. The daily counter resets at midnight server time (UTC). Hitting this limit fails the challenge.' },
      { q: 'What is the max total drawdown?',
        a: 'Your balance cannot fall more than 10% below the starting balance at any point. This is a fixed threshold — it does not trail.' },
      { q: 'Can I trade during news?',
        a: 'Yes, news trading is allowed on most plans. Some high-impact events (NFP, FOMC, CPI) may trigger a brief news lock — you will see this in your dashboard before the event.' },
      { q: 'Can I hold positions over the weekend?',
        a: 'Yes on most plans. The plan page lists whether weekend holding is allowed before you buy.' },
    ],
  },
  {
    title: 'Payouts',
    items: [
      { q: 'How much do I keep?',
        a: 'Your profit split starts at 80% and scales up to 90% after consistent performance. The exact split is shown on each plan before you buy.' },
      { q: 'When do I get paid?',
        a: 'The first payout happens 14 days after funding. After that, payouts cycle bi-weekly. Once approved, funds typically arrive within 24 hours.' },
      { q: 'How do I withdraw?',
        a: 'We support crypto (BTC, USDT-TRC20/ERC20), bank wire, and Wise. You set your preferred method in your dashboard.' },
    ],
  },
  {
    title: 'Account & security',
    items: [
      { q: 'Do you offer 2FA?',
        a: 'Yes. You can enable time-based one-time-password (TOTP) 2FA from your account settings. Use any authenticator app (Google Authenticator, Authy, 1Password).' },
      { q: 'Can I have multiple accounts?',
        a: 'Yes, you can run multiple challenges or funded accounts simultaneously — up to a combined $400K in funded capital per person.' },
      { q: 'What about API access?',
        a: 'Funded traders can generate scoped API keys from the dashboard for algorithmic trading. Keys support read-only or trade-enabled scopes and can be revoked at any time.' },
    ],
  },
]

export default function FAQPage() {
  return (
    <>
      <MarketingHeader />
      <main>
        <section className="pt-32 pb-12 relative overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-aurora opacity-50" />
            <div className="absolute inset-0 bg-grid-overlay opacity-30" />
          </div>
          <div className="container">
            <div className="max-w-2xl mx-auto text-center">
              <Badge tone="info" className="mb-4">
                <HelpCircle className="h-3 w-3" />
                Knowledge base
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tightest leading-[1.05]">
                Common <span className="text-info">questions</span>
              </h1>
              <p className="mt-4 text-lg text-text-muted">
                Can&apos;t find what you&apos;re looking for? Email <a className="text-accent hover:underline" href="mailto:support@propfirmlauncher.com">support@propfirmlauncher.com</a>.
              </p>
            </div>
          </div>
        </section>

        <section className="pb-24">
          <div className="container max-w-3xl space-y-12">
            {SECTIONS.map((sec) => (
              <div key={sec.title}>
                <h2 className="text-xs font-medium uppercase tracking-wider text-text-faint mb-3">{sec.title}</h2>
                <div className="rounded-xl border border-border bg-surface overflow-hidden divide-y divide-border-subtle">
                  {sec.items.map((qa) => <QARow key={qa.q} qa={qa} />)}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  )
}

function QARow({ qa }: { qa: QA }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left focus-ring hover:bg-surface-muted/40 transition-colors"
        aria-expanded={open}
      >
        <span className="font-medium text-text">{qa.q}</span>
        <ChevronDown className={cn('h-4 w-4 text-text-muted shrink-0 transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-5 text-sm text-text-muted leading-relaxed">{qa.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
