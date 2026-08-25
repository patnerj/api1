'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from '@/store/auth'
import { useImpersonation } from '@/store/impersonation'
import { cn } from '@/lib/cn'
import {
  LayoutDashboard, Users as UsersIcon, Trophy, CreditCard,
  Layers, BarChart3, Settings as SettingsIcon, Shield, Wallet
} from 'lucide-react'

const ADMIN_NAV: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { href: '/dashboard/admin',           label: 'Overview',   icon: LayoutDashboard },
  { href: '/dashboard/admin/users',     label: 'Users',      icon: UsersIcon },
  { href: '/dashboard/admin/challenges', label: 'Challenges', icon: Trophy },
  { href: '/dashboard/admin/payments',  label: 'Payments',   icon: CreditCard },
  { href: '/dashboard/admin/plans',     label: 'Plans',      icon: Layers },
  { href: '/dashboard/admin/risk',      label: 'Risk',       icon: Shield },
  { href: '/dashboard/admin/payouts',   label: 'Payouts',    icon: Wallet },
  { href: '/dashboard/admin/analytics', label: 'Analytics',  icon: BarChart3 },
  { href: '/dashboard/admin/settings',  label: 'Settings',   icon: SettingsIcon },
]

/**
 * Admin route guard + secondary tab nav.
 *
 * Mounted INSIDE the existing dashboard layout (which already enforces auth).
 * This layer adds the admin-role check on top, redirecting non-admins to the
 * trader dashboard with no flash of admin content.
 *
 * Impersonation guard: while impersonating, the cookie belongs to the target
 * user (who is probably not an admin) so admins lose admin access until they
 * sign back out. The banner explains this and offers the exit action.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const user     = useAuth((s) => s.user)
  const ready    = useAuth((s) => s.ready)
  const impersonating = useImpersonation((s) => s.record)

  // Redirect to canonical /admin route
  useEffect(() => {
    if (!ready) return
    if (!user) return
    if (impersonating || !user.is_admin) {
      router.replace('/dashboard')
      return
    }
    router.replace('/admin')
  }, [ready, user, impersonating, router])

  if (!ready || !user) {
    return null
  }
  if (!user.is_admin || impersonating) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Admin tab strip — mobile only; on desktop the sidebar shows the admin nav */}
      <nav className="lg:hidden flex items-center gap-1 overflow-x-auto -mx-4 px-4 no-scrollbar border-b border-border-subtle">
        {ADMIN_NAV.map((it) => {
          const active = it.href === '/dashboard/admin'
            ? pathname === '/dashboard/admin'
            : pathname?.startsWith(it.href)
          const Icon = it.icon
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                'shrink-0 inline-flex items-center gap-2 px-3 h-10 text-sm font-medium transition-colors focus-ring relative',
                active ? 'text-text' : 'text-text-muted hover:text-text',
              )}
            >
              <Icon className="h-4 w-4" />
              {it.label}
              {active && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-accent rounded-full" />
              )}
            </Link>
          )
        })}
      </nav>

      <div>{children}</div>
    </div>
  )
}
