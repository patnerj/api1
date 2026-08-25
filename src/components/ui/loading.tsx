'use client'

import * as React from 'react'
import { CandlestickChart, Activity } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/cn'
import { TradingSpinner, TradingScreenLoader } from '@/components/ui/trading-loader'

export { TradingSpinner, TradingScreenLoader }

export interface SpinnerProps extends React.SVGProps<SVGSVGElement> {
  className?: string
}

export function Spinner({ className }: SpinnerProps) {
  return <TradingSpinner size="sm" className={className} />
}

export interface LoaderProps {
  label?: string
  subtitle?: string
  className?: string
}

export function PageLoader({ label = 'Syncing Trading Data...', subtitle = 'Connecting to market feeds...', className }: LoaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-10 space-y-3 min-h-[260px] bg-[#0B0F19]/60 rounded-2xl border border-[#1F2937]/80 select-none',
        className,
      )}
    >
      <div className="relative flex items-center justify-center">
        <div className="h-12 w-12 rounded-xl bg-[#111827] border border-accent/40 flex items-center justify-center shadow-lg shadow-accent/10">
          <CandlestickChart className="h-6 w-6 text-accent animate-pulse" />
        </div>
        <div className="absolute -top-1.5 -right-1.5 p-1 rounded-md bg-[#0B0F19] border border-accent/40">
          <Activity className="h-3 w-3 text-accent animate-pulse" />
        </div>
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-bold text-gray-100 tracking-tight">{label}</p>
        <p className="text-xs text-gray-400 font-normal">{subtitle}</p>
      </div>
    </div>
  )
}

export function CardLoader({ label = 'Loading trading metrics...', className }: LoaderProps) {
  return (
    <Card className={cn('bg-[#111827] border-[#1F2937]', className)}>
      <CardContent className="p-8 flex flex-col items-center justify-center space-y-3">
        <TradingSpinner size="md" />
        <span className="text-xs font-semibold text-gray-300 tracking-wide animate-pulse">{label}</span>
      </CardContent>
    </Card>
  )
}
