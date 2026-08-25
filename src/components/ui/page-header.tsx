'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/cn'

export interface PageHeaderProps {
  title: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  action?: React.ReactNode
  actions?: React.ReactNode
  breadcrumbs?: Array<{ label: string; href?: string }>
  tabs?: { key: string; label: string; count?: number }[]
  activeTab?: string
  onTabChange?: (key: string) => void
  variant?: 'standard' | 'hero'
  badge?: { label: string; tone?: 'accent' | 'success' | 'warn' | 'info' | 'danger' }
  className?: string
  children?: React.ReactNode
}

const BADGE_TONES: Record<string, string> = {
  accent: 'bg-accent/15 text-accent border-accent/30',
  success: 'bg-success/15 text-success border-success/30',
  warn: 'bg-warn/15 text-warn border-warn/30',
  info: 'bg-info/15 text-info border-info/30',
  danger: 'bg-danger/15 text-danger border-danger/30',
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  action,
  actions: actionsProp,
  breadcrumbs,
  tabs,
  activeTab,
  onTabChange,
  variant = 'standard',
  badge,
  className,
  children,
}: PageHeaderProps) {
  const actions = action || actionsProp

  if (variant === 'hero') {
    return (
      <PageHero
        title={title}
        description={description}
        icon={Icon}
        actions={actions}
        breadcrumbs={breadcrumbs}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={onTabChange}
        badge={badge}
        className={className}
      >
        {children}
      </PageHero>
    )
  }

  return (
    <div className={cn('space-y-4 mb-6', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-text-muted">
          {breadcrumbs.map((b, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="text-text-faint">/</span>}
              {b.href ? (
                <Link href={b.href} className="hover:text-text transition-colors">
                  {b.label}
                </Link>
              ) : (
                <span className="text-text font-medium">{b.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <div className="h-9 w-9 rounded-lg bg-surface-muted border border-border-subtle flex items-center justify-center text-accent shrink-0">
                <Icon className="h-5 w-5" />
              </div>
            )}
            <h1 className="text-2xl font-bold tracking-tight text-text flex items-center gap-2">
              {title}
              {badge && (
                <span
                  className={cn(
                    'text-2xs font-semibold px-2 py-0.5 rounded-full border',
                    BADGE_TONES[badge.tone || 'accent']
                  )}
                >
                  {badge.label}
                </span>
              )}
            </h1>
          </div>
          {description && (
            <p className="text-sm text-text-muted leading-relaxed max-w-3xl">
              {description}
            </p>
          )}
        </div>

        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>

      {children && <div>{children}</div>}

      {tabs && tabs.length > 0 && (
        <div className="border-b border-border-subtle flex items-center gap-1 overflow-x-auto pt-2 scrollbar-none">
          {tabs.map((tab) => {
            const active = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => onTabChange?.(tab.key)}
                className={cn(
                  'px-3.5 py-2 text-xs font-semibold rounded-t-md transition-all duration-150 border-b-2 -mb-px flex items-center gap-2 whitespace-nowrap',
                  active
                    ? 'border-accent text-accent bg-accent/5'
                    : 'border-transparent text-text-muted hover:text-text hover:bg-surface-muted/50'
                )}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded-full text-[10px] font-medium',
                      active ? 'bg-accent/20 text-accent' : 'bg-surface-muted text-text-subtle'
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function PageHero({
  title,
  description,
  icon: Icon,
  actions,
  breadcrumbs,
  tabs,
  activeTab,
  onTabChange,
  badge,
  className,
  children,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'relative isolate overflow-hidden bg-surface rounded-2xl border border-border/60 p-6 sm:p-8 mb-6 shadow-sm',
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-success/5 pointer-events-none" />
      
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="relative z-10 flex items-center gap-1.5 text-xs text-text-muted mb-3">
          {breadcrumbs.map((b, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="text-text-faint">/</span>}
              {b.href ? (
                <Link href={b.href} className="hover:text-text transition-colors">
                  {b.label}
                </Link>
              ) : (
                <span className="text-text font-medium">{b.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="h-10 w-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                <Icon className="h-5 w-5" />
              </div>
            )}
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text flex items-center gap-2.5">
                {title}
                {badge && (
                  <span
                    className={cn(
                      'text-xs font-semibold px-2.5 py-0.5 rounded-full border',
                      BADGE_TONES[badge.tone || 'accent']
                    )}
                  >
                    {badge.label}
                  </span>
                )}
              </h1>
            </div>
          </div>
          {description && (
            <p className="text-sm text-text-muted leading-relaxed max-w-3xl">
              {description}
            </p>
          )}
        </div>

        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>

      {children && <div className="relative z-10 mt-4">{children}</div>}

      {tabs && tabs.length > 0 && (
        <div className="relative z-10 mt-6 pt-4 border-t border-border-subtle flex items-center gap-1 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const active = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => onTabChange?.(tab.key)}
                className={cn(
                  'px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-150 flex items-center gap-2 whitespace-nowrap',
                  active
                    ? 'bg-accent text-white shadow-sm'
                    : 'bg-surface-muted/60 text-text-muted hover:text-text hover:bg-surface-muted'
                )}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded-full text-[10px] font-medium',
                      active ? 'bg-white/20 text-white' : 'bg-surface text-text-subtle'
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
