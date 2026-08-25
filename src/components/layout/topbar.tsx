'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/store/auth'
import { useImpersonation } from '@/store/impersonation'
import { api } from '@/lib/api'
import type { NotificationsResp, AuthUser } from '@/types/api'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Menu, Bell, User as UserIcon, LogOut, Settings, Trophy, Sun, Moon } from 'lucide-react'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'

export interface TopbarProps {
  onMenuClick?: () => void
  role?: 'trader' | 'admin'
  user?: AuthUser | null
}

function toAppPath(link: string): string {
  if (!link) return '/dashboard'
  try {
    if (/^https?:\/\//i.test(link)) { const u = new URL(link); return (u.pathname || '/dashboard') + u.search }
    return link.startsWith('/') ? link : `/${link}`
  } catch { return '/dashboard' }
}

export function Topbar({ onMenuClick = () => {}, role, user: userProp }: TopbarProps) {
  const router = useRouter()
  const authUser = useAuth((s) => s.user)
  const user = userProp !== undefined ? userProp : authUser
  const signout = useAuth((s) => s.signout)
  const impersonating = useImpersonation((s) => !!s.record)
  const adminMode = role === 'admin' || (role === undefined && user?.is_admin === true && !impersonating)
  const [mounted, setMounted] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const queryClient = useQueryClient()

  useEffect(() => { 
    setMounted(true)
    setIsOnline(navigator.onLine)
    
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const { data: notifs = null, refetch: loadNotifs } = useQuery({
    queryKey: ['topbar.notifs', adminMode],
    queryFn: async () => {
      if (!user) return null
      const res = adminMode ? await api.admin.notifications() : await api.notifications()
      if (!res.ok) throw new Error('Failed to fetch notifications')
      return res.data
    },
    enabled: !!user,
    refetchInterval: 30_000,
  })

  const handleSignout = async () => {
    await signout()
  }

  const initials = (user?.display_name || user?.username || '?').slice(0, 2).toUpperCase()
  const unread   = notifs?.unread_count ?? 0

  const handleLinkHover = (href: string) => {
    if (href === '/dashboard/notifications' || href === '/admin/activity') {
      queryClient.prefetchQuery({
        queryKey: ['topbar.notifs', adminMode],
        queryFn: async () => {
          const res = adminMode ? await api.admin.notifications() : await api.notifications()
          return res.ok ? res.data : null
        },
      }).catch(() => {})
    }
  }

  return (
    <header className="sticky top-0 z-20 h-14 flex items-center gap-2 px-4 md:px-6 border-b border-border bg-surface">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 -ml-2 rounded-md hover:bg-surface-muted focus-ring"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-1.5">
        {mounted && (
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-surface-muted/50 border border-border-subtle mr-1">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOnline ? 'bg-success' : 'bg-danger'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isOnline ? 'bg-success' : 'bg-danger'}`}></span>
            </span>
            <span className={isOnline ? 'text-success' : 'text-danger'}>
              {isOnline ? 'Connected' : 'Offline'}
            </span>
          </div>
        )}

        <NotificationsButton 
          unread={unread} 
          notifs={notifs} 
          adminMode={adminMode} 
          onReadAll={async () => {
            await (adminMode ? api.admin.notificationsRead([]) : api.notificationsRead([]))
            loadNotifs()
          }}
          onRead={(id: number) => {
            if (adminMode) api.admin.notificationsRead([id])
            else api.notificationsRead([id])
            
            queryClient.setQueryData(['topbar.notifs', adminMode], (old: NotificationsResp | null | undefined) => {
              if (!old) return old
              let countChanged = false
              const newNotifs = old.notifications.map(n => {
                if (n.id === id && !n.is_read) {
                  countChanged = true
                  return { ...n, is_read: 1 }
                }
                return n
              })
              return {
                ...old,
                notifications: newNotifs,
                unread_count: countChanged ? Math.max(0, old.unread_count - 1) : old.unread_count
              }
            })
          }}
        />

        <ThemeSwitcher />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 h-9 pl-2 pr-3 rounded-md hover:bg-surface-muted focus-ring transition-colors"
              aria-label="Profile menu"
            >
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-accent to-success flex items-center justify-center text-2xs font-semibold text-white">
                {initials}
              </div>
              <span className="hidden md:block text-sm font-medium text-text">{user?.display_name || user?.username}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[220px]">
            <DropdownMenuLabel>Signed in as</DropdownMenuLabel>
            <div className="px-2.5 pb-2 text-sm">
              <div className="font-medium truncate">{user?.display_name || user?.username}</div>
              <div className="text-text-muted text-xs truncate">{user?.email}</div>
            </div>
            <DropdownMenuSeparator />
            {!adminMode && (
              <>
                <DropdownMenuItem asChild onMouseEnter={() => handleLinkHover('/dashboard')}>
                  <Link href="/dashboard"><UserIcon className="h-4 w-4" /> Dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild onMouseEnter={() => handleLinkHover('/dashboard/challenges')}>
                  <Link href="/dashboard/challenges"><Trophy className="h-4 w-4" /> My challenges</Link>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem asChild onMouseEnter={() => handleLinkHover('/dashboard/settings')}>
              <Link href="/dashboard/settings"><Settings className="h-4 w-4" /> Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem danger onSelect={handleSignout}>
              <LogOut className="h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

export function DashboardTopbar(props: TopbarProps) {
  return <Topbar {...props} />
}

function NotificationsButton({
  unread, notifs, onReadAll, onRead, adminMode,
}: {
  unread: number
  notifs: NotificationsResp | null
  onReadAll: () => void | Promise<void>
  onRead: (id: number) => void
  adminMode?: boolean
}) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const on = (e: MouseEvent) => {
      if (!(e.target as Element).closest('[data-notif-pop]')) setOpen(false)
    }
    document.addEventListener('mousedown', on)
    return () => document.removeEventListener('mousedown', on)
  }, [open])

  return (
    <div className="relative" data-notif-pop>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-md hover:bg-surface-muted focus-ring"
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
      >
        <Bell className="h-5 w-5 text-text-muted" />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 inline-flex h-4 min-w-4 px-1 items-center justify-center text-2xs font-semibold text-white bg-danger rounded-full">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 w-[340px] max-w-[calc(100vw-2rem)] rounded-lg glass-strong shadow-card-lg overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
              <div className="font-semibold text-sm">Notifications</div>
              {unread > 0 && (
                <button
                  onClick={() => { onReadAll(); setOpen(false) }}
                  className="text-2xs text-accent hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[340px] overflow-y-auto">
              {!notifs ? (
                <div className="p-4 text-center text-sm text-text-muted">Loading…</div>
              ) : notifs.notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="h-8 w-8 mx-auto text-text-faint mb-2" />
                  <div className="text-sm text-text-muted">No notifications yet</div>
                </div>
              ) : (
                notifs.notifications.slice(0, 8).map((n) => {
                  const inner = (
                    <div className="flex items-start gap-2">
                      <div className={`h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 ${
                        n.type === 'success' ? 'bg-success' :
                        n.type === 'error'   ? 'bg-danger' :
                        n.type === 'warning' ? 'bg-warn' : 'bg-info'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{n.title}</div>
                        <div className="text-xs text-text-muted line-clamp-2">{n.message}</div>
                      </div>
                    </div>
                  )
                  const cls = `block px-4 py-3 border-b border-border-subtle last:border-0 hover:bg-surface-muted/40 transition-colors ${!n.is_read ? 'bg-accent-muted/20' : ''}`
                  return n.link
                    ? <Link key={n.id} href={toAppPath(n.link)} onClick={() => { if (!n.is_read) onRead(n.id); setOpen(false) }} className={cls}>{inner}</Link>
                    : <div key={n.id} onClick={() => { if (!n.is_read) onRead(n.id) }} className={`${cls} cursor-pointer`}>{inner}</div>
                })
              )}
            </div>

            <div className="px-4 py-2 border-t border-border-subtle">
              <Link
                href={adminMode ? '/admin/activity' : '/dashboard/notifications'}
                onClick={() => setOpen(false)}
                className="block text-center text-2xs text-accent hover:underline"
              >
                View all notifications →
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
