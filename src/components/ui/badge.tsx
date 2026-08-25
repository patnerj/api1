'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

export const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tabular tracking-tight transition-colors',
  {
    variants: {
      tone: {
        success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        warn:    'bg-amber-500/10 text-amber-400 border-amber-500/20',
        danger:  'bg-red-500/10 text-red-400 border-red-500/20',
        info:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
        accent:  'bg-accent/15 text-accent border-accent/30',
        neutral: 'bg-slate-800 text-slate-300 border-slate-700',
      },
      size: {
        sm: 'text-[10px] px-2 py-0.5',
        md: 'text-xs px-2.5 py-0.5',
        lg: 'text-sm px-3 py-1',
      }
    },
    defaultVariants: { tone: 'neutral', size: 'md' },
  },
)

export interface BadgeProps 
  extends React.HTMLAttributes<HTMLSpanElement>, 
    VariantProps<typeof badgeVariants> {
  variant?: VariantProps<typeof badgeVariants>['tone']
  pulsing?: boolean
}

const PULSE_TONES: Record<string, string> = {
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  warn:    'bg-amber-400',
  danger:  'bg-red-400',
  info:    'bg-blue-400',
  accent:  'bg-accent',
  neutral: 'bg-slate-400',
}

export function Badge({ className, tone, variant, size, pulsing, children, ...props }: BadgeProps) {
  const selectedTone = tone || variant || 'neutral'

  return (
    <span className={cn(badgeVariants({ tone: selectedTone, size }), className)} {...props}>
      {pulsing && (
        <span className="relative flex h-1.5 w-1.5 shrink-0 mr-0.5">
          <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", PULSE_TONES[selectedTone] || 'bg-slate-400')}></span>
          <span className={cn("relative inline-flex rounded-full h-1.5 w-1.5", PULSE_TONES[selectedTone] || 'bg-slate-400')}></span>
        </span>
      )}
      {children}
    </span>
  )
}
