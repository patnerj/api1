'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { SidebarBrand } from '@/components/logo'
import { api } from '@/lib/api'
import { useAuth } from '@/store/auth'
import { useImpersonation } from '@/store/impersonation'
import { cn } from '@/lib/cn'
import { useQueryClient } from '@tanstack/react-query'
import {
  LayoutDashboard, Trophy, History, Banknote,
  Award, Bell, Settings, X, LifeBuoy, CandlestickChart,
  Users, CreditCard, Layers, BarChart3, SlidersHorizontal, PanelLeftClose, PanelLeftOpen, Mail, Megaphone, Ticket, Users2, HeartPulse, Rocket, Gauge, Palette, ShieldAlert, Swords, Shield, Wallet, UserCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface NavItem {
  href:  string
  label: string
  icon:  React.ComponentType<{ className?: string }>
  badge?: string
  queryKey?: string[]
  queryFn?: () => Promise<any>
}

const NAV: NavItem[] = [
  { href: '/dashboard',                label: 'Overview',     icon: LayoutDashboard, queryKey: ['overview'] },
  { href: '/dashboard/trading',        label: 'Trade',         icon: CandlestickChart, badge: 'LIVE', queryKey: ['account'] },
  { href: '/dashboard/challenges',     label: 'Challenges',   icon: Trophy, queryKey: ['challenges'] },
  { href: '/tournaments',              label: 'Tournaments',  icon: Trophy, badge: 'WIN', queryKey: ['tournaments'] },
  { href: '/dashboard/history',        label: 'Trade history', icon: History, queryKey: ['history', 'latest'] },
  { href: '/dashboard/analytics',      label: 'Analytics',     icon: BarChart3, badge: 'NEW', queryKey: ['analytics'] },
  { href: '/dashboard/payouts',        label: 'Payouts',      icon: Banknote, queryKey: ['payouts'] },
  { href: '/dashboard/affiliate',      label: 'Affiliate',    icon: Users2, queryKey: ['affiliate'] },
  { href: '/dashboard/certificates',   label: 'Certificates', icon: Award, queryKey: ['certificates'] },
  { href: '/dashboard/notifications',  label: 'Notifications', icon: Bell, queryKey: ['notifications'] },
  { href: '/dashboard/support',        label: 'Help & Support', icon: LifeBuoy, queryKey: ['support'] },
  { href: '/dashboard/settings',       label: 'Settings',     icon: Settings, queryKey: ['settings'] },
]

const ADMIN_NAV: NavItem[] = [
  { href: '/admin',            label: 'Overview',   icon: LayoutDashboard, queryKey: ['admin', 'overview'] },
  { href: '/admin/traders',    label: 'Traders',    icon: Users, queryKey: ['admin', 'traders'] },
  { href: '/admin/payments',   label: 'Payments',   icon: CreditCard, queryKey: ['admin', 'payments'] },
  { href: '/admin/kyc',        label: 'KYC Hub',    icon: UserCheck, queryKey: ['admin', 'kyc'] },
  { href: '/admin/marketing',  label: 'Marketing',  icon: Megaphone, queryKey: ['admin', 'marketing'] },
  { href: '/admin/tournaments',label: 'Tournaments',icon: Trophy, queryKey: ['admin', 'tournaments'] },
  { href: '/admin/operations', label: 'Operations', icon: Gauge, queryKey: ['admin', 'operations'] },
  { href: '/admin/risk',       label: 'Risk',       icon: Shield, queryKey: ['admin', 'risk'] },
  { href: '/admin/payouts',    label: 'Payouts',    icon: Wallet, queryKey: ['admin', 'payouts'] },
  { href: '/admin/analytics',  label: 'Analytics',  icon: BarChart3, queryKey: ['admin', 'analytics'] },
  { href: '/admin/helpdesk',   label: 'Helpdesk',   icon: LifeBuoy, queryKey: ['admin', 'support'] },
  { href: '/admin/config',     label: 'Config',     icon: Settings, queryKey: ['admin', 'config'] },
  { href: '/admin/activity',   label: 'Activity',   icon: Bell, queryKey: ['admin', 'notifications'] },
]

export interface SidebarProps {
  open?: boolean
  onClose?: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
  role?: 'trader' | 'admin'
  currentPath?: string
}

export function Sidebar({ open = false, onClose = () => {}, collapsed = false, onToggleCollapse, role, currentPath }: SidebarProps) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  return (
    <>
      <aside className={cn(
        'hidden lg:flex fixed inset-y-0 left-0 flex-col border-r border-border bg-surface z-30 transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-64',
      )}>
        <SidebarBody collapsed={collapsed} onToggleCollapse={onToggleCollapse} role={role} currentPath={currentPath} />
      </aside>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden fixed inset-0 bg-black/70 z-[60]"
              onClick={onClose}
              aria-hidden
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="lg:hidden fixed inset-y-0 left-0 w-[17rem] max-w-[85vw] flex-col bg-bg-subtle border-r border-border z-[70] flex shadow-2xl"
            >
              <div className="flex items-center justify-end h-14 px-3 border-b border-border-subtle shrink-0">
                <button
                  onClick={onClose}
                  className="h-10 w-10 inline-flex items-center justify-center rounded-md hover:bg-surface-muted text-text-muted focus-ring"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <SidebarBody role={role} currentPath={currentPath} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export function DashboardSidebar(props: SidebarProps) {
  return <Sidebar {...props} />
}

function SidebarBody({ collapsed = false, onToggleCollapse, role, currentPath }: { collapsed?: boolean; onToggleCollapse?: () => void; role?: 'trader' | 'admin'; currentPath?: string }) {
  const activePathname = usePathname()
  const pathname = currentPath || activePathname
  const queryClient = useQueryClient()
  const isAdmin = useAuth((s) => s.user?.is_admin === true)
  const impersonating = useImpersonation((s) => s.record !== null)
  
  const adminMode = role === 'admin' || (role === undefined && isAdmin && !impersonating)
  const [setupDone, setSetupDone] = useState(false)
  
  useEffect(() => {
    if (!adminMode) return
    let cancel = false
    api.admin.whitelabelGet().then((r) => {
      if (!cancel && r.ok && (r.data as Record<string, string>)?.setup_completed === '1') setSetupDone(true)
    })
    return () => { cancel = true }
  }, [adminMode, pathname])

  const items = adminMode
    ? ADMIN_NAV.filter((i) => !(setupDone && i.href === '/admin/setup'))
    : NAV
  const homeHref = adminMode ? '/admin' : '/dashboard'

  const handleMouseEnter = (item: NavItem) => {
    if (item.href === '/dashboard/history') {
      queryClient.prefetchQuery({
        queryKey: ['history', 'latest'],
        queryFn: async () => {
          const res = await api.history()
          return res.ok ? res.data : []
        },
      })
    } else if (item.href === '/dashboard/trading') {
      queryClient.prefetchQuery({
        queryKey: ['account'],
        queryFn: async () => {
          const res = await api.account()
          return res.ok ? res.data : null
        },
      })
    } else if (item.href === '/dashboard/payouts') {
      queryClient.prefetchQuery({
        queryKey: ['payouts'],
        queryFn: async () => {
          const res = await api.payouts()
          return res.ok ? res.data : []
        },
      })
    } else if (item.href === '/dashboard/challenges') {
      queryClient.prefetchQuery({
        queryKey: ['challengeMy'],
        queryFn: async () => {
          const res = await api.challengeMy()
          return res.ok ? res.data : []
        },
      })
    } else if (item.href === '/admin/traders') {
      queryClient.prefetchQuery({
        queryKey: ['admin', 'users'],
        queryFn: async () => {
          const res = await api.admin.users()
          return res.ok ? res.data : []
        },
      })
    } else if (item.href === '/admin/payouts') {
      queryClient.prefetchQuery({
        queryKey: ['admin', 'payouts'],
        queryFn: async () => {
          const res = await api.admin.payoutsList()
          return res.ok ? res.data : []
        },
      })
    } else if (item.queryKey) {
      queryClient.prefetchQuery({
        queryKey: item.queryKey,
        queryFn: () => Promise.resolve(null),
        staleTime: 5 * 60 * 1000,
      }).catch(() => {})
    }
  }

  return (
    <>
      <div className={cn('border-b border-border flex items-center gap-2', collapsed ? 'px-2 py-4 justify-center' : 'px-4 py-4 justify-between')}>
        <Link href={homeHref} className="focus-ring rounded-md flex items-center gap-2 min-w-0 flex-1">
          <SidebarBrand collapsed={collapsed} />
        </Link>
        {onToggleCollapse && !collapsed && (
          <button onClick={onToggleCollapse} aria-label="Collapse sidebar"
            className="hidden lg:inline-flex shrink-0 p-1 rounded-md text-text-muted hover:text-text hover:bg-surface-muted focus-ring">
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {onToggleCollapse && collapsed && (
        <button onClick={onToggleCollapse} aria-label="Expand sidebar"
          className="hidden lg:flex mx-auto mt-2 p-1.5 rounded-md text-text-muted hover:text-text hover:bg-surface-muted focus-ring">
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      )}

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {items.map((it) => {
          const isRoot = it.href === '/dashboard' || it.href === '/admin'
          const active = isRoot
            ? pathname === it.href
            : pathname?.startsWith(it.href)
          const Icon = it.icon
          return (
            <Link
              key={it.href}
              href={it.href}
              onMouseEnter={() => handleMouseEnter(it)}
              title={collapsed ? it.label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-200',
                'focus-ring relative group overflow-hidden',
                collapsed && 'justify-center px-0',
                active
                  ? 'bg-accent/10 text-accent font-semibold shadow-[inset_2px_0_0_0_hsl(var(--accent))]'
                  : 'text-text-muted hover:text-text hover:bg-surface-muted/60',
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0 transition-transform duration-200", active ? "scale-110" : "group-hover:scale-110")} />
              {!collapsed && <span className="flex-1">{it.label}</span>}
              {it.badge && !collapsed && (
                <span className="text-[0.6rem] tracking-wider font-semibold px-1.5 py-0.5 rounded bg-success/15 text-success inline-flex items-center gap-1">
                  <span className="h-1 w-1 rounded-full bg-success animate-pulse" />
                  {it.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className={cn('border-t border-border-subtle space-y-2', collapsed ? 'px-2 py-4' : 'px-3 py-4')}>
        {collapsed ? (
          <Link href="/faq" title="Help & docs"
            className="flex items-center justify-center p-2 rounded-md text-text-muted hover:text-text hover:bg-surface-muted transition-colors">
            <LifeBuoy className="h-4 w-4" />
          </Link>
        ) : adminMode ? (
          <Link
            href="/faq"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
          >
            <LifeBuoy className="h-4 w-4" />
            Help &amp; docs
          </Link>
        ) : (
          <>
            <Link
              href="/faq"
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
            >
              <LifeBuoy className="h-4 w-4" />
              Help &amp; FAQ
            </Link>
            <Button asChild size="sm" variant="outline" className="w-full">
              <Link href="/challenges">+ Start new challenge</Link>
            </Button>
          </>
        )}
      </div>
    </>
  )
}
