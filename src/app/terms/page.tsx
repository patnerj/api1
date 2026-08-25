import type { Metadata } from 'next'
import { LegalPage } from '@/components/marketing/legal-page'

export const metadata: Metadata = { title: 'Terms of Service' }

export default function Page() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="By using LaunchAPropFirm you agree to the following terms. These are placeholder terms — the operator should replace this content with terms drafted by qualified legal counsel before going live."
      updated="May 2026"
      sections={[
        { title: '1. The service',
          body: <p>LaunchAPropFirm provides a simulated trading evaluation programme. Funded accounts are demonstration accounts that mirror real-market prices; payouts represent the operator&apos;s share of allocated capital and are not the result of executions on a live broker account.</p> },
        { title: '2. Eligibility',
          body: <p>You must be at least 18 years old and reside in a jurisdiction where simulated trading evaluations are permitted by local law. You may not use the service if you are subject to sanctions or live in a sanctioned territory.</p> },
        { title: '3. Account and security',
          body: <p>You are responsible for keeping your credentials secure and for all activity on your account. Enable two-factor authentication. Do not share your account.</p> },
        { title: '4. Trading rules',
          body: <p>Active accounts are subject to the daily-drawdown and max-drawdown limits stated on each plan page. Breach of either rule fails the account. We may also disqualify accounts found to be using prohibited strategies such as latency arbitrage or copy-trading across accounts.</p> },
        { title: '5. Refunds',
          body: <p>Challenge fees are refunded with your first payout when you pass the evaluation. We do not otherwise refund challenge fees.</p> },
        { title: '6. Limitation of liability',
          body: <p>The service is provided &quot;as is&quot; without warranty. We are not liable for indirect, incidental, or consequential damages arising from your use of the service. Trading involves risk and past performance does not indicate future results.</p> },
      ]}
    />
  )
}
