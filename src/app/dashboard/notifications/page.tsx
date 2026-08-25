'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import { timeAgo } from '@/lib/format'
import type { Notification } from '@/types/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/ui/page-header'
import { Bell, Check, CheckCheck, Info, AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/cn'

export default function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<Notification[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)

  const { data, isPending, refetch } = useQuery({
    queryKey: ['notifications', page],
    queryFn: async () => {
      const res = await api.notifications(page, 20)
      if (!res.ok) throw new Error('Failed to fetch')
      return res.data
    },
    refetchInterval: 20_000,
  })

  useEffect(() => {
    if (data) {
      if (page === 1) {
        setItems(data.notifications)
      } else {
        setItems(prev => {
          const ids = new Set(prev.map(p => p.id))
          const fresh = data.notifications.filter(n => !ids.has(n.id))
          return [...prev, ...fresh]
        })
      }
      setHasMore(!!data.has_more)
      setTotalCount(data.total ?? data.notifications.length)
      setUnreadCount(data.unread_count ?? 0)
    }
  }, [data, page])

  const loading = isPending && items.length === 0

  const list = useMemo(() => {
    return filter === 'unread' ? items.filter((n) => !n.is_read) : items
  }, [items, filter])

  const markAllRead = async () => {
    await api.notificationsRead([])
    setPage(1)
    refetch()
  }

  const markOneRead = async (id: number) => {
    await api.notificationsRead([id])
    setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n))
    setUnreadCount(u => Math.max(0, u - 1))
    refetch()
  }

  const handleLoadMore = () => {
    if (!hasMore || isPending) return
    setPage(p => p + 1)
  }

  return (
    <div className="space-y-8">
      <PageHeader
        variant="hero"
        title="Notifications"
        description="All account, challenge, and payout activity in one place."
        icon={Bell}
        badge={{ label: 'Inbox', tone: 'accent' }}
        actions={
          unreadCount > 0 ? (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              <CheckCheck className="h-3.5 w-3.5 mr-1" /> Mark all read ({unreadCount})
            </Button>
          ) : undefined
        }
      />

      <div className="flex gap-1 bg-surface-muted p-1 rounded-md text-2xs w-fit">
        {(['all', 'unread'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 h-8 rounded-md transition-colors focus-ring ${
              filter === f ? 'bg-surface text-text font-semibold shadow-xs' : 'text-text-muted hover:text-text'
            }`}
          >
            {f.toUpperCase()}
            {f === 'unread' && unreadCount > 0 && (
              <span className="ml-1.5 text-accent font-bold">{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-5 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : list.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <div className="inline-flex h-12 w-12 rounded-xl bg-accent/10 text-accent items-center justify-center mb-4">
                <Bell className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-semibold tracking-tight text-text">{filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}</h2>
              <p className="text-sm text-text-muted mt-2 max-w-md mx-auto leading-relaxed">
                You&apos;ll see account activity here as it happens.
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-border-subtle">
                {list.map((n, i) => <NotificationRow key={n.id} n={n} index={i} onRead={() => markOneRead(n.id)} />)}
              </div>
              {hasMore && (
                <div className="p-4 border-t border-border-subtle flex justify-center bg-surface-muted/30">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleLoadMore} 
                    loading={isPending}
                    className="text-xs"
                  >
                    Load More Notifications ({items.length} of {totalCount})
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function NotificationRow({ n, index, onRead }: { n: Notification; index: number; onRead: () => void }) {
  const Icon = n.type === 'success' ? CheckCircle2
    : n.type === 'error'   ? AlertCircle
    : n.type === 'warning' ? AlertTriangle
    : Info
  const iconColor = n.type === 'success' ? 'text-success'
    : n.type === 'error'   ? 'text-danger'
    : n.type === 'warning' ? 'text-warn'
    : 'text-info'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.3) }}
      className={cn(
        'px-4 sm:px-5 py-4 flex items-start gap-3 transition-colors',
        !n.is_read && 'bg-accent/5',
      )}
    >
      <div className="h-9 w-9 rounded-md bg-surface-muted flex items-center justify-center shrink-0">
        <Icon className={cn('h-4 w-4', iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="font-semibold text-sm text-text">{n.title}</div>
          <span className="text-2xs text-text-muted shrink-0 tabular">{timeAgo(n.created_at_iso || n.created_at)}</span>
        </div>
        <div className="text-sm text-text-muted mt-0.5 leading-relaxed">{n.message}</div>
        {n.link && (
          <a href={n.link} className="text-2xs text-accent hover:underline mt-1 inline-block font-medium">View details →</a>
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
