import type { Metadata } from 'next'
import { LegalPage } from '@/components/marketing/legal-page'

export const metadata: Metadata = { title: 'Cookie Policy' }

export default function Page() {
  return (
    <LegalPage
      title="Cookie Policy"
      intro="How this platform uses cookies and similar technologies. Placeholder content — have it reviewed for your jurisdiction before launch."
      updated="June 2026"
      sections={[
        { title: '1. What cookies we use',
          body: <p>We use strictly necessary cookies for authentication and session management, and a small number of preference cookies (for example, your sidebar and theme choices). These are required for the platform to function.</p> },
        { title: '2. What we do not use',
          body: <p>We do not use third-party advertising or cross-site tracking cookies. The platform is a workspace, not an ad network.</p> },
        { title: '3. Analytics',
          body: <p>If the operator enables analytics, aggregate, privacy-respecting usage data may be collected to improve the product. No personal trading data is sold or shared with advertisers.</p> },
        { title: '4. Managing cookies',
          body: <p>You can clear or block cookies in your browser settings, but strictly necessary cookies are required to log in and use the platform. Disabling them will prevent authentication.</p> },
        { title: '5. Contact',
          body: <p>Questions about this policy can be sent via the <a className="text-accent hover:underline" href="/contact">Contact</a> page.</p> },
      ]}
    />
  )
}
