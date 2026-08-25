import type { Metadata } from 'next'
import { LegalPage } from '@/components/marketing/legal-page'

export const metadata: Metadata = { title: 'Refund Policy' }

export default function Page() {
  return (
    <LegalPage
      title="Refund Policy"
      intro="When refunds apply to challenge fees and platform purchases. Placeholder content — set your own terms and have them reviewed by counsel before launch."
      updated="June 2026"
      sections={[
        { title: '1. Challenge / evaluation fees',
          body: <p>Evaluation fees grant immediate access to a digital service and are generally non-refundable once an account has been activated and trading has begun, except where required by law or stated below.</p> },
        { title: '2. Cooling-off / unused purchases',
          body: <p>If you purchased a challenge but have not yet started trading on it, you may request a refund within the operator’s stated cooling-off window. Contact support with your order reference.</p> },
        { title: '3. Duplicate or failed payments',
          body: <p>Duplicate charges, or charges where access was never delivered, are refunded in full. Crypto payments are refunded to the originating wallet net of network fees.</p> },
        { title: '4. Chargebacks',
          body: <p>If you have a billing concern, please contact support first — most issues are resolved quickly. Initiating a chargeback without contacting support may result in account suspension pending review.</p> },
        { title: '5. Funded-account payouts',
          body: <p>Payouts under a funded-account agreement are governed by that agreement, not this Refund Policy.</p> },
        { title: '6. How to request a refund',
          body: <p>Open a request through the <a className="text-accent hover:underline" href="/support">Support Center</a> or the <a className="text-accent hover:underline" href="/contact">Contact</a> page with your order reference. We aim to respond within the operator’s stated support window.</p> },
      ]}
    />
  )
}
