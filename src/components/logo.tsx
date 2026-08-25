'use client'

import { useEffect } from 'react'
import { cn } from '@/lib/cn'
import { useBranding } from '@/store/branding'

/**
 * Dynamic Brand Initial Mark — Modern avatar lockup with active accent
 * color and bold initial letter, matching the Whitelabel Live Preview.
 */
export function BrandInitialMark({ name, className }: { name: string; className?: string }) {
  const initial = (name || 'P').trim().charAt(0).toUpperCase() || 'P'
  return (
    <div 
      className={cn(
        'h-8 w-8 rounded-lg bg-accent text-slate-950 font-extrabold flex items-center justify-center text-sm shrink-0 shadow-sm select-none transition-colors',
        className
      )}
    >
      {initial}
    </div>
  )
}

/**
 * General brand lockup. Used on the login page (login_logo_url) and anywhere a
 * horizontal logo is appropriate. Falls back to mark + brand name.
 *
 * @param variant 'login' prefers login_logo_url; 'dashboard' uses logo_url.
 */
export function Logo({
  className,
  wordmark = true,
  variant = 'dashboard',
}: {
  className?: string
  wordmark?: boolean
  variant?: 'dashboard' | 'login'
}) {
  const branding = useBranding((s) => s.branding)
  const loaded = useBranding((s) => s.loaded)
  const load = useBranding((s) => s.load)
  useEffect(() => { load() }, [load])

  const imageUrl = variant === 'login'
    ? (branding.login_logo_url || branding.logo_url)
    : branding.logo_url
  const name = branding.brand_name || 'Apex Horizon Proprietary'

  if (!loaded) {
    return (
      <div className={cn('flex items-center gap-2.5', className)}>
        <div className="h-8 w-8 rounded-lg skel shrink-0" aria-hidden />
        {wordmark && <span className="h-4 w-28 rounded skel" aria-hidden />}
      </div>
    )
  }

  if (imageUrl) {
    return (
      <div className={cn('flex items-center', className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={name} className="h-10 w-auto max-w-[240px] object-contain" />
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <BrandInitialMark name={name} className="h-8 w-8" />
      {wordmark && (
        <span className={cn('font-extrabold tracking-tight text-white transition-opacity duration-200 text-base', loaded ? 'opacity-100' : 'opacity-0')}>
          {loaded ? name : '\u00A0'}
        </span>
      )}
    </div>
  )
}

/**
 * Sidebar brand lockup — purpose-built for a narrow sidebar.
 *   Expanded:  [Brand Initial Avatar] Company Name
 *   Collapsed: [Brand Initial Avatar]
 * Uses a dedicated square Sidebar Icon (sidebar_icon_url) or Primary Logo (logo_url).
 * If none is set it falls back to the dynamic Brand Initial Mark + brand name.
 */
export function SidebarBrand({ collapsed = false, className }: { collapsed?: boolean; className?: string }) {
  const branding = useBranding((s) => s.branding)
  const loaded = useBranding((s) => s.loaded)
  const load = useBranding((s) => s.load)
  useEffect(() => { load() }, [load])

  const icon = branding.sidebar_icon_url || branding.logo_url
  const name = branding.brand_name || 'Apex Horizon Proprietary'

  return (
    <div className={cn('flex items-center gap-2.5 min-w-0', className)}>
      {icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={icon} alt={name} className="h-8 w-8 rounded-lg object-contain shrink-0 bg-surface-muted/40" />
      ) : loaded ? (
        <BrandInitialMark name={name} className="h-8 w-8" />
      ) : (
        <div className="h-8 w-8 rounded-lg skel shrink-0" aria-hidden />
      )}
      {!collapsed && (
        <span className={cn('font-bold tracking-tight text-white truncate text-sm transition-opacity duration-200', loaded ? 'opacity-100' : 'opacity-0')}>
          {loaded ? name : '\u00A0'}
        </span>
      )}
    </div>
  )
}
