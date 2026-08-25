'use client'

import * as React from 'react'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { fmtUSD, pnlClass } from '@/lib/format'
import { cn } from '@/lib/cn'

export interface StatCardProps {
  title?: string
  label?: string
  value: string | number
  sub?: string
  subtitle?: string
  icon?: React.ComponentType<{ className?: string }>
  tone?: 'accent' | 'success' | 'danger' | 'warn' | 'info'
  change?: string | number
  changeType?: 'positive' | 'negative' | 'neutral'
  delta?: number
  deltaLabel?: string
  progressPct?: number
  progressTone?: 'success' | 'danger' | 'warn' | 'accent' | 'info'
  valueClass?: string
  isLoading?: boolean
  className?: string
  children?: React.ReactNode
}

export interface StatGridProps {
  children: React.ReactNode
  columns?: 2 | 3 | 4 | 5
  className?: string
}

const TONES: Record<NonNullable<StatCardProps['tone']>, { bg: string; text: string }> = {
  accent: { bg: 'bg-accent-muted', text: 'text-accent' },
  success: { bg: 'bg-success-muted', text: 'text-success' },
  danger: { bg: 'bg-danger-muted', text: 'text-danger' },
  warn: { bg: 'bg-warn-muted', text: 'text-warn' },
  info: { bg: 'bg-info-muted', text: 'text-info' },
}

export function StatCard({
  title,
  label,
  value,
  sub,
  subtitle,
  icon: Icon,
  tone = 'accent',
  change,
  changeType,
  delta,
  deltaLabel,
  progressPct,
  progressTone,
  valueClass,
  isLoading = false,
  className,
  children,
}: StatCardProps) {
  const displayTitle = title || label || ''
  const displaySub = subtitle || sub || ''
  const computedTone = changeType === 'positive' ? 'success' : changeType === 'negative' ? 'danger' : tone
  const t = TONES[computedTone] || TONES.accent

  if (isLoading) {
    return (
      <Card
        className={cn(
          'p-5 sm:p-6 relative overflow-hidden group border-border/60 transition-all duration-200',
          className
        )}
      >
        <div className="flex items-start justify-between mb-3 relative z-10">
          <div className="text-2xs uppercase tracking-wider text-text-muted font-semibold">{displayTitle}</div>
          {Icon && (
            <div
              className={cn(
                'h-8 w-8 rounded-lg flex items-center justify-center shrink-0 opacity-50',
                t.bg,
                t.text
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
        <div className={cn('text-2xl sm:text-3xl font-extrabold tracking-tight tabular truncate relative z-10 text-text/30 animate-pulse', valueClass)}>
          ...
        </div>
        {displaySub && <div className="text-2xs text-text-muted mt-1 tabular relative z-10 opacity-0">{displaySub}</div>}
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        'p-5 sm:p-6 relative overflow-hidden group border-border/60 transition-all duration-200 hover:border-border-strong hover:shadow-sm',
        className
      )}
    >
      <div className="flex items-start justify-between mb-3 relative z-10">
        <div className="text-2xs uppercase tracking-wider text-text-muted font-semibold">{displayTitle}</div>
        {Icon && (
          <div
            className={cn(
              'h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 duration-200',
              t.bg,
              t.text
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      <div className={cn('text-2xl sm:text-3xl font-extrabold tracking-tight tabular truncate relative z-10 text-text', valueClass)}>
        {value}
      </div>

      {displaySub && <div className="text-2xs text-text-muted mt-1 tabular relative z-10">{displaySub}</div>}

      {change !== undefined && (
        <div
          className={cn(
            'mt-2 text-xs tabular flex items-center gap-1 font-medium',
            changeType === 'positive' ? 'text-success' : changeType === 'negative' ? 'text-danger' : 'text-text-muted'
          )}
        >
          <span>{change}</span>
          {deltaLabel && <span className="text-text-muted">· {deltaLabel}</span>}
        </div>
      )}

      {delta !== undefined && change === undefined && (
        <div className={cn('mt-2 text-xs tabular flex items-center gap-1', pnlClass(delta))}>
          <span className="font-medium">{fmtUSD(delta, { sign: true })}</span>
          {deltaLabel && <span className="text-text-muted">· {deltaLabel}</span>}
        </div>
      )}

      {progressPct !== undefined && (
        <div className="mt-3">
          <Progress
            value={Math.max(0, Math.min(100, progressPct))}
            tone={
              progressTone ??
              (computedTone === 'success' || computedTone === 'danger' || computedTone === 'warn' || computedTone === 'accent' || computedTone === 'info'
                ? computedTone
                : 'accent')
            }
          />
        </div>
      )}

      {children}
    </Card>
  )
}

export function StatGrid({ children, columns = 4, className }: StatGridProps) {
  const colClasses = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5',
  }

  return <div className={cn('grid gap-4 md:gap-6 mb-6', colClasses[columns], className)}>{children}</div>
}
