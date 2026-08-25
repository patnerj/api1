import type { Metadata } from 'next'
import { LegalPage } from '@/components/marketing/legal-page'

export const metadata: Metadata = { title: 'Risk Disclosure' }

export default function Page() {
  return (
    <LegalPage
      title="Risk Disclosure"
      intro="Trading involves substantial risk. This disclosure explains the nature of the evaluation product and the risks involved. It is placeholder content — the operator should have it reviewed by qualified counsel for their jurisdiction before launch."
      updated="June 2026"
      sections={[
        { title: '1. Nature of the evaluation product',
          body: <p>This platform offers a simulated trading evaluation. Challenge accounts are assessed against live market pricing, but orders are not executed with a third-party broker or liquidity provider. No real capital is traded in the evaluation, and challenge fees are paid for access to the evaluation, not as an investment.</p> },
        { title: '2. Risk of loss of fees',
          body: <p>Challenge and evaluation fees are at risk. If evaluation objectives are not met, the fee is generally not refundable except as stated in the Refund Policy. You should never pay a fee you cannot afford to lose.</p> },
        { title: '3. No investment advice',
          body: <p>Nothing on this platform constitutes investment, financial, legal, or tax advice. Past performance, simulated or real, is not indicative of future results. You are solely responsible for your trading decisions.</p> },
        { title: '4. Market data',
          body: <p>Pricing is derived from third-party market data feeds and may differ from prices at any specific broker. Data may be delayed, interrupted, or contain errors. The operator is not liable for losses arising from data inaccuracies or outages.</p> },
        { title: '5. Funded-account terms',
          body: <p>Any funded-account arrangement, profit split, or payout is governed by the operator’s separate funded-account agreement and is subject to the rules stated there, including conduct and risk rules. Breach of those rules may result in suspension or termination without payout.</p> },
        { title: '6. Jurisdiction and eligibility',
          body: <p>Availability may be restricted in some jurisdictions. You are responsible for ensuring that your use of the platform is lawful where you live. The operator may decline service where prohibited.</p> },
        { title: '7. No guarantee of profit',
          body: <p>There is no guarantee that any participant will pass an evaluation, reach a funded stage, or receive any payout. Marketing examples and sample data are illustrative only.</p> },
      ]}
    />
  )
}
