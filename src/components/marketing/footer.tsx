'use client'

import Link from 'next/link'
import { useBranding } from '@/store/branding'
import { Logo } from '@/components/logo'

const LINKS: { title: string; items: { href: string; label: string }[] }[] = [
  {
    title: 'Platform',
    items: [
      { href: '/challenges',  label: 'Challenges' },
      { href: '/leaderboard', label: 'Leaderboard' },
      { href: '/dashboard/trading', label: 'Trading terminal' },
    ],
  },
  {
    title: 'Company',
    items: [
      { href: '/faq',         label: 'FAQ' },
      { href: '/support',     label: 'Support Center' },
      { href: '/about',       label: 'About us' },
      { href: '/contact',     label: 'Contact' },
    ],
  },
  {
    title: 'Legal',
    items: [
      { href: '/terms',       label: 'Terms of service' },
      { href: '/privacy',     label: 'Privacy policy' },
      { href: '/refund',      label: 'Refund policy' },
      { href: '/cookies',     label: 'Cookie policy' },
      { href: '/risk',        label: 'Risk disclosure' },
    ],
  },
]

export function MarketingFooter() {
  const brand = useBranding((s) => s.branding.brand_name)
  const footerText = useBranding((s) => s.branding.footer_text)
  return (
    <footer className="border-t border-border-subtle bg-bg-subtle/50 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-overlay opacity-30 pointer-events-none" />
      <div className="container relative py-16">
        <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
          <div className="space-y-4">
            <Logo />
            <p className="text-sm text-text-muted max-w-xs">
              {brand ? `${brand} is an institutional-grade prop firm. Pass our evaluation, trade our capital, keep up to 90% of your profits.` : 'An institutional-grade prop firm. Pass our evaluation, trade our capital, keep up to 90% of your profits.'}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs text-text-muted">All systems operational</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {LINKS.map((g) => (
              <div key={g.title}>
                <div className="text-xs font-medium uppercase tracking-wider text-text-faint mb-3">
                  {g.title}
                </div>
                <ul className="space-y-2">
                  {g.items.map((it) => (
                    <li key={it.href}>
                      <Link
                        href={it.href}
                        className="text-sm text-text-muted hover:text-text transition-colors"
                      >
                        {it.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-border-subtle flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <p className="text-xs text-text-faint">
            {footerText || `© ${new Date().getFullYear()} ${brand || 'LaunchAPropFirm'}. Trading involves risk. Past performance is not indicative of future results.`}
          </p>
          <p className="text-xs text-text-faint">
            Built for serious traders ·{' '}
            <Link href="/support" className="hover:text-text">Support</Link>{' '}·{' '}
            <Link href="/status" className="hover:text-text">Status</Link>
          </p>
        </div>
      </div>
    </footer>
  )
}
