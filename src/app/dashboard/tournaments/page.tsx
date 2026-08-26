'use client'

/**
 * In-dashboard Tournaments — browse, join, and track tournaments without
 * leaving the trader panel. The public /tournaments page remains for marketing.
 */

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Trophy, Users, Calendar, ArrowRight, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { fmtUSD, toNum } from '@/lib/format'
import type { Competition } from '@/types/api'

export default function DashboardTournamentsPage() {
  const qc = useQueryClient()
  const [joining, setJoining] = useState<number | null>(null)

  const { data: tournaments = [], isLoading } = useQuery({
    queryKey: ['tournaments-public'],
    queryFn: () => api.tournaments.list({ status: 'active' }).then(r => (r.ok ? r.data : [])),
  })

  const { data: mine = [] } = useQuery({
    queryKey: ['tournaments-mine'],
    queryFn: () => api.tournaments.mine().then(r => (r.ok ? r.data : [])),
  })

  const joinedIds = new Set(mine.map(m => m.tournament_id))

  const join = async (t: Competition) => {
    setJoining(t.id)
    const res = await api.tournaments.join(t.id)
    setJoining(null)
    if (res.ok && res.data.success) {
      toast.success(res.data.message || 'Joined! Your tournament account is ready.')
      qc.invalidateQueries({ queryKey: ['tournaments-mine'] })
      qc.invalidateQueries({ queryKey: ['tournaments-public'] })
    } else {
      toast.error(res.ok ? (res.data.message || 'Join failed') : res.error)
    }
  }

  const statusBadge = (t: Competition) => {
    if (joinedIds.has(t.id)) return <Badge tone="success" size="sm">Joined</Badge>
    if ((t.status ?? '') === 'active') return <Badge tone="accent" size="sm" pulsing>Live now</Badge>
    return <Badge tone="neutral" size="sm">{t.status || 'Upcoming'}</Badge>
  }

  return (
    <div className="space-y-6 w-full pb-16">
      <PageHeader
        title="Tournaments"
        description="Compete on dedicated tournament accounts — top ROI wins the prize pool. Entry fees are charged from your wallet, never your challenge account."
      />

      {isLoading ? (
        <div className="py-20 flex flex-col items-center gap-3 text-text-muted">
          <Loader2 className="h-7 w-7 animate-spin text-accent" />
          <p className="text-sm">Loading tournaments…</p>
        </div>
      ) : tournaments.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <Trophy className="h-10 w-10 mx-auto text-text-faint" />
            <p className="font-semibold text-text">No live tournaments right now</p>
            <p className="text-sm text-text-muted">New tournaments appear here the moment they go live.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tournaments.map((t) => (
            <Card key={t.id} className="overflow-hidden">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                      <Trophy className="h-4.5 w-4.5" />
                    </div>
                    <h3 className="font-bold text-text truncate">{t.title || `Tournament #${t.id}`}</h3>
                  </div>
                  {statusBadge(t)}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-lg bg-bg-subtle/60 border border-border-subtle p-2.5">
                    <div className="text-2xs uppercase tracking-wider text-text-muted">Starting</div>
                    <div className="text-sm font-bold tabular text-text mt-0.5">
                      {fmtUSD(toNum(t.starting_balance), { decimals: 0 })}
                    </div>
                  </div>
                  <div className="rounded-lg bg-bg-subtle/60 border border-border-subtle p-2.5">
                    <div className="text-2xs uppercase tracking-wider text-text-muted">Prize pool</div>
                    <div className="text-sm font-bold tabular text-success mt-0.5 truncate">
                      {t.prize_pool || '—'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> {t.current_participants ?? 0}
                    {toNum(t.max_participants) > 0 ? ` / ${t.max_participants}` : ''}
                  </span>
                  {t.end_date && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> ends {new Date(String(t.end_date).replace(' ', 'T')).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {joinedIds.has(t.id) ? (
                  <Button asChild variant="outline" className="w-full">
                    <a href="/dashboard/trading">
                      Trade in terminal <ArrowRight className="h-4 w-4 ml-1" />
                    </a>
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    disabled={joining !== null || (t.status ?? '') !== 'active'}
                    loading={joining === t.id}
                    onClick={() => join(t)}
                  >
                    {toNum(t.entry_fee) > 0
                      ? `Join — $${toNum(t.entry_fee)} entry (wallet)`
                      : 'Join free'}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {mine.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-text uppercase tracking-wider">My Tournaments</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {mine.map((m) => (
              <Card key={m.tournament_id}>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-text truncate">{m.title}</div>
                    <div className="text-xs text-text-muted mt-0.5">
                      Account #{m.account_id} · start {fmtUSD(toNum(m.starting_equity), { decimals: 0 })}
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <a href={`/tournaments/${m.tournament_id}`} target="_blank" rel="noreferrer">
                      Leaderboard <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
