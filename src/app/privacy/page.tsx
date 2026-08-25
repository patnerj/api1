import type { Metadata } from 'next'
import { LegalPage } from '@/components/marketing/legal-page'

export const metadata: Metadata = { title: 'Privacy Policy' }

export default function Page() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="How LaunchAPropFirm collects, uses, and protects your personal data. This is placeholder content — the operator should replace it with a policy reviewed by qualified counsel before launch."
      updated="May 2026"
      sections={[
        { title: '1. Data we collect',
          body: <p>Account details (username, email, hashed password), authentication metadata (session timestamps, IP for security), trading activity on your account, payment information collected via our processor (we never see your card details), and analytics data about how you use the platform.</p> },
        { title: '2. How we use your data',
          body: <p>To provide and operate the service, to process payments, to verify identity where required by law, to communicate operational and security notices, and to improve the product. We do not sell your data.</p> },
        { title: '3. Cookies and similar technologies',
          body: <p>We use strictly necessary cookies for authentication and session management. We do not use third-party advertising trackers. See our <a className="text-accent hover:underline" href="/cookies">Cookie Policy</a> for details.</p> },
        { title: '4. Data retention',
          body: <p>Account data is retained while your account is active and for a period afterwards as required by financial-services record-keeping rules. You may request deletion at any time, subject to those legal retention requirements.</p> },
        { title: '5. Your rights',
          body: <p>Depending on your jurisdiction you may have rights to access, correct, port, or delete your data, and to object to or restrict processing. Email <a className="text-accent hover:underline" href="mailto:privacy@propfirmlauncher.com">privacy@propfirmlauncher.com</a> to exercise these rights.</p> },
        { title: '6. Security',
          body: <p>We use industry-standard encryption in transit and at rest, two-factor authentication, scoped API keys, rate limiting, and full audit logging. No system is perfectly secure, so we encourage you to use a strong unique password and enable 2FA.</p> },
      ]}
    />
  )
}
