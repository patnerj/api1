'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight, Terminal, DollarSign, LifeBuoy } from 'lucide-react'
import Link from 'next/link'

export function QuickActions() {
  return (
    <Card className="border-border-subtle h-full">
      <div className="p-4 border-b border-border-subtle">
        <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
           Quick Actions
        </div>
      </div>
      <CardContent className="p-4 grid gap-3 h-[calc(100%-53px)]">
        <Button asChild variant="outline" className="w-full justify-between group hover:border-accent/40 hover:bg-accent/5">
          <Link href="/dashboard/trading">
            <span className="flex items-center gap-2"><Terminal className="h-4 w-4 text-text-muted group-hover:text-accent transition-colors" /> Web Terminal</span>
            <ArrowRight className="h-4 w-4 text-text-muted group-hover:text-accent group-hover:translate-x-1 transition-all" />
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full justify-between group hover:border-success/40 hover:bg-success/5">
          <Link href="/dashboard/payouts">
            <span className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-text-muted group-hover:text-success transition-colors" /> Request Payout</span>
            <ArrowRight className="h-4 w-4 text-text-muted group-hover:text-success group-hover:translate-x-1 transition-all" />
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full justify-between group hover:border-info/40 hover:bg-info/5">
          <Link href="/dashboard/support">
            <span className="flex items-center gap-2"><LifeBuoy className="h-4 w-4 text-text-muted group-hover:text-info transition-colors" /> Support Center</span>
            <ArrowRight className="h-4 w-4 text-text-muted group-hover:text-info group-hover:translate-x-1 transition-all" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
