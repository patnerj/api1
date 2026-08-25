'use client'

import * as React from 'react'
import { CandlestickChart, Activity, TrendingUp, Zap, Sparkles } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface TradingLoaderProps {
  label?: string
  subtitle?: string
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'fullscreen'
}

/**
 * Lucide-powered Trading Spinner
 * Uses Lucide `CandlestickChart` with glowing breathing ring & pulse tick.
 */
export function TradingSpinner({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = {
    sm: { icon: 'h-4 w-4', box: 'h-8 w-8', pulse: 'h-1.5 w-1.5' },
    md: { icon: 'h-6 w-6', box: 'h-12 w-12', pulse: 'h-2 w-2' },
    lg: { icon: 'h-8 w-8', box: 'h-16 w-16', pulse: 'h-2.5 w-2.5' },
  }

  const s = sizeMap[size]

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      {/* Outer Pulse Glow Ring */}
      <div className={cn('rounded-2xl bg-accent/15 border border-accent/30 animate-pulse flex items-center justify-center shadow-lg shadow-accent/20', s.box)}>
        <CandlestickChart className={cn('text-accent animate-bounce transition-transform duration-700', s.icon)} />
      </div>

      {/* Floating Active Price Tick Dot */}
      <span className={cn('absolute -top-1 -right-1 rounded-full bg-accent animate-ping opacity-75', s.pulse)} />
      <span className={cn('absolute -top-1 -right-1 rounded-full bg-accent', s.pulse)} />
    </div>
  )
}

/**
 * Full-screen / Component Trading Loader
 * Displays high-tech trading Lucide icon stack with live market telemetry messages.
 */
export function TradingScreenLoader({
  label = 'Synchronizing Market Engine',
  subtitle = 'Connecting to high-frequency liquidity pools & risk engine...',
  className,
  fullscreen = true,
}: {
  label?: string
  subtitle?: string
  className?: string
  fullscreen?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-6 select-none',
        fullscreen
          ? 'fixed inset-0 z-50 bg-[#0B0F19]/90 backdrop-blur-md min-h-screen'
          : 'min-h-[360px] w-full bg-[#0B0F19]/50 rounded-2xl border border-[#1F2937]/80',
        className
      )}
    >
      <div className="relative flex flex-col items-center max-w-sm text-center space-y-5">
        {/* Central Trading Icon Stack */}
        <div className="relative flex items-center justify-center">
          {/* Animated Ambient Glow Halo */}
          <div className="absolute w-24 h-24 rounded-full bg-accent/20 blur-xl animate-pulse" />
          
          {/* Main Card Icon Box */}
          <div className="relative h-16 w-16 rounded-2xl bg-[#111827] border-2 border-accent/40 flex items-center justify-center shadow-2xl shadow-accent/20">
            <CandlestickChart className="h-8 w-8 text-accent animate-pulse" />
            
            {/* Corner Badges */}
            <div className="absolute -bottom-2 -right-2 p-1.5 rounded-lg bg-[#0B0F19] border border-accent/40 shadow-sm">
              <TrendingUp className="h-3.5 w-3.5 text-accent animate-bounce" />
            </div>
            
            <div className="absolute -top-2 -left-2 p-1.5 rounded-lg bg-[#0B0F19] border border-accent/40 shadow-sm">
              <Activity className="h-3.5 w-3.5 text-accent animate-pulse" />
            </div>
          </div>
        </div>

        {/* Text & Telemetry Badges */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-center gap-2">
            <h3 className="text-base font-bold text-white tracking-tight">{label}</h3>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
            </span>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed font-normal">
            {subtitle}
          </p>
        </div>

        {/* Animated Market Feed Sync Bar */}
        <div className="w-48 h-1.5 rounded-full bg-slate-800/80 overflow-hidden border border-slate-700/50">
          <div className="h-full bg-accent rounded-full animate-[shimmer_1.5s_infinite_linear] w-2/3 shadow-sm shadow-accent" />
        </div>
      </div>
    </div>
  )
}
