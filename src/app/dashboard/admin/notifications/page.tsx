'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import { timeAgo } from '@/lib/format'
import type { AdminNotification, AdminNotificationsResp } from '@/types/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Bell, Check, CheckCheck, Info, AlertCircle, AlertTriangle, CheckCircle2, User } from 'lucide-react'
import { cn } from '@/lib/cn'

export default function AdminNotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const { data, refetch } = useQuery({
    queryKey: ['admin.notifications'],
    queryFn: async () => {
      const res = await api.admin.notifications()
      if (!res.ok) throw new Error('Failed to fetch notifications')
      return res.data
    },
    refetchInterval: 20_000,
  })

  const list = useMemo(() => {
    if (!data) return []
    return filter === 'unread' ? data.notifications.filter((n) => !n.is_read) : data.notifications
  }, [data, filter])

  const markAllRead = async () => { await api.admin.notificationsRead([]); refetch() }
  const markOneRead = async (id: number) => { await api.admin.notificationsRead([id]); refetch() }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Activity</h1>
          <p className="text-sm text-text-muted mt-1">
            Registrations, purchases, payments, payouts, KYC, and challenge outcomes across the platform.
          </p>
        </div>
        {data && data.unread_count > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read ({data.unread_count})
          </Button>
        )}
      </div>

      <div className="flex gap-1 bg-surface-muted p-1 rounded-md text-2xs w-fit">
        {(['all', 'unread'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 h-8 rounded-md transition-colors focus-ring ${
              filter === f ? 'bg-bg-subtle text-text font-medium' : 'text-text-muted hover:text-text'
            }`}
          >
            {f.toUpperCase()}
            {f === 'unread' && data && data.unread_count > 0 && (
              <span className="ml-1.5 text-accent">{data.unread_count}</span>
            )}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {!data ? (
            <div className="p-5 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : list.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="h-10 w-10 mx-auto text-text-faint mb-3" />
              <div className="font-medium">{filter === 'unread' ? 'No unread activity' : 'No activity yet'}</div>
              <div className="text-xs text-text-muted mt-1">Platform events will appear here as they happen.</div>
            </div>
          ) : (
            <div>
              {list.map((n, i) => <Row key={n.id} n={n} index={i} onRead={() => markOneRead(n.id)} />)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Row({ n, index, onRead }: { n: AdminNotification; index: number; onRead: () => void }) {
  const Icon = n.type === 'success' ? CheckCircle2
    : n.type === 'error'   ? AlertCircle
    : n.type === 'warning' ? AlertTriangle
    : Info
  const iconColor = n.type === 'success' ? 'text-success'
    : n.type === 'error'   ? 'text-danger'
    : n.type === 'warning' ? 'text-warn'
    : 'text-info'
  const tone = n.type === 'error' ? 'danger' : n.type === 'warning' ? 'warn' : n.type === 'success' ? 'success' : 'info'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.3) }}
      className={cn(
        'border-b border-border-subtle last:border-0 px-4 sm:px-5 py-4 flex items-start gap-3',
        !n.is_read && 'bg-accent-muted/15',
      )}
    >
      <div className={cn('h-9 w-9 rounded-md flex items-center justify-center shrink-0', `bg-${tone}-muted`)}>
        <Icon className={cn('h-4 w-4', iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="font-medium text-sm">{n.title}</div>
          <span className="text-2xs text-text-muted shrink-0 tabular">{timeAgo(n.created_at_iso || n.created_at)}</span>
        </div>
        <div className="text-sm text-text-muted mt-0.5">{n.message}</div>
        {n.ref_user_label && (
          <span className="mt-1.5 inline-flex items-center gap-1 text-2xs text-text-muted bg-surface-muted rounded px-1.5 py-0.5">
            <User className="h-3 w-3" /> {n.ref_user_label}
          </span>
        )}
      </div>
      {!n.is_read && (
        <button
          onClick={onRead}
          className="p-1.5 rounded-md hover:bg-surface-muted text-text-muted focus-ring shrink-0"
          aria-label="Mark as read"
        >
          <Check className="h-4 w-4" />
        </button>
      )}
    </motion.div>
  )
}
