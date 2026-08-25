'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, Users, Gauge, Shield, Wallet, 
  Settings, Megaphone, Trophy, BarChart3, LifeBuoy, 
  Bell, ChevronLeft, ChevronRight, UserCircle, LogOut,
  Sparkles, UserCheck, CreditCard
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { SidebarBrand } from '@/components/logo'
import { useAuth } from '@/store/auth'

export interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { href: '/admin',             label: 'Overview',     icon: LayoutDashboard },
  { href: '/admin/traders',     label: 'Traders',      icon: Users },
  { href: '/admin/payments',    label: 'Payments',     icon: CreditCard },
  { href: '/admin/kyc',         label: 'KYC Hub',      icon: UserCheck },
  { href: '/admin/operations',  label: 'Operations',   icon: Gauge },
  { href: '/admin/risk',        label: 'Risk Control', icon: Shield },
  { href: '/admin/payouts',     label: 'Payouts Hub',  icon: Wallet },
  { href: '/admin/marketing',   label: 'Marketing',    icon: Megaphone },
  { href: '/admin/builder',     label: 'Page Builder', icon: Sparkles },
  { href: '/admin/tournaments', label: 'Tournaments',  icon: Trophy },
  { href: '/admin/analytics',   label: 'Analytics',    icon: BarChart3 },
  { href: '/admin/helpdesk',    label: 'Helpdesk',     icon: LifeBuoy },
  { href: '/admin/config',      label: 'Config',       icon: Settings },
  { href: '/admin/activity',    label: 'Activity',     icon: Bell },
]

interface SidebarProps {
  collapsed?: boolean
  onToggleCollapse?: () => void
  onMobileClose?: () => void
  className?: string
}

export function Sidebar({ 
  collapsed = false, 
  onToggleCollapse, 
  onMobileClose,
  className 
}: SidebarProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <aside
      className={cn(
        "h-screen bg-[#0B0F19] border-r border-[#1F2937] flex flex-col transition-all duration-300 select-none z-30",
        collapsed ? "w-20" : "w-64",
        className
      )}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[#1F2937] bg-[#0E1322]">
        <div className={cn("flex items-center gap-2 overflow-hidden", collapsed && "justify-center w-full")}>
          <SidebarBrand />
        </div>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className={cn(
              "p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/60 transition-colors hidden lg:flex items-center justify-center",
              collapsed && "hidden"
            )}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        {ADMIN_NAV_ITEMS.map((item) => {
          const isActive = item.href === '/admin' 
            ? pathname === '/admin' 
            : pathname?.startsWith(item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative",
                isActive
                  ? "bg-[#10B981]/15 text-[#10B981] font-semibold shadow-sm"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50",
                collapsed && "justify-center px-0"
              )}
              title={collapsed ? item.label : undefined}
            >
              {/* Active Indicator Bar */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#10B981] rounded-r-full" />
              )}

              <Icon 
                className={cn(
                  "h-5 w-5 shrink-0 transition-transform duration-150",
                  isActive ? "text-[#10B981] scale-105" : "text-gray-400 group-hover:text-gray-200 group-hover:scale-105"
                )} 
              />
              
              {!collapsed && (
                <span className="truncate">{item.label}</span>
              )}

              {!collapsed && item.badge && (
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer Profile Box */}
      <div className="p-3 border-t border-[#1F2937] bg-[#0E1322]/60 mt-auto">
        <div className={cn("flex items-center gap-3", collapsed ? "justify-center" : "px-2")}>
          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-md shadow-emerald-900/30">
            {user?.email ? user.email.charAt(0).toUpperCase() : 'A'}
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold text-gray-200 truncate">
                {user?.email || 'admin@firm.com'}
              </span>
              <span className="text-[11px] text-emerald-400 font-medium">Enterprise Admin</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
