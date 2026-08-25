import type { Metadata } from 'next'
import { LegalPage } from '@/components/marketing/legal-page'

export const metadata: Metadata = { title: 'About Us' }

export default function Page() {
  return (
    <LegalPage
      title="About Us"
      intro="The team and mission behind this prop-firm platform. Operators should replace this with their own company story before launch."
      updated="June 2026"
      sections={[
        { title: 'Who we are',
          body: <p>We operate a funded-trader evaluation platform that lets disciplined traders prove their skill on live market conditions and earn access to a funded account. This page is operator-editable — replace it with your firm’s real story, team, and credentials.</p> },
        { title: 'What we do',
          body: <p>We provide multi-phase trading challenges evaluated against live market pricing, automatic progression to funded status, a transparent payout workflow, and verifiable certificates for traders who pass.</p> },
        { title: 'Our approach',
          body: <p>Transparency first: traders are told plainly how evaluation works, how pricing is sourced, and what the rules are. Clear rules and a fair payout process are the foundation of a credible firm.</p> },
        { title: 'Contact',
          body: <p>Reach us any time via the <a className="text-accent hover:underline" href="/contact">Contact</a> page or the <a className="text-accent hover:underline" href="/support">Support Center</a>.</p> },
      ]}
    />
  )
}
