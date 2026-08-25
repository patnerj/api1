'use client'

import { PageHeader } from '@/components/ui/page-header'
import { LifeBuoy } from 'lucide-react'
import { TraderSupport } from '@/components/dashboard/trader-support'

export default function SupportPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        variant="hero"
        title="Help & Support"
        description="Contact our support team if you need assistance with your account, billing, or trades."
        icon={LifeBuoy}
        badge={{ label: 'Help Center', tone: 'accent' }}
      />

      <TraderSupport />
    </div>
  )
}
