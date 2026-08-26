'use client'

/**
 * In-dashboard Tournaments — browse, join, and track tournaments without
 * leaving the trader panel. The public /tournaments page remains for marketing.
 * Entry fees are charged from the WALLET (never challenge accounts).
 */

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Trophy, Users, Calendar, ArrowRight, Loader2, Wallet, CheckCircle2 } from 'lucide-react'
import { api } from '@/lib/api'
import { invalidateFxsim } from '@/lib/fxsim'
import { usePrices } from '@/store/prices'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { fmtUSD, toNum } from '@/lib/format'
import { cn } from '@/lib/cn'
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

  const { data: wallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => api.wallet.get().then(r => (r.ok ? r.data.balance : 0)),
    refetchInterval: 30_000,
  })

  const joinedIds = new Set(mine.map(m => m.tournament_id))

  const join = async (t: Competition) => {
    setJoining(t.id)
    const res = await api.tournaments.join(t.id)
    setJoining(null)
    if (res.ok && res.data.success) {
      // Invalidate BOTH cache layers — react-query AND the fxsim request cache
      // (mine is cached 30s; without this the Joined state appears only after
      // a manual refresh).
      invalidateFxsim('/tournaments/mine')
      invalidateFxsim('/tournaments')
      qc.invalidateQueries({ queryKey: ['tournaments-mine'] })
      qc.invalidateQueries({ queryKey: ['tournaments-public'] })
      invalidateFxsim('/tournaments/mine')
      // AUTO-SWITCH: the terminal opens straight on the tournament account —
      // no manual switcher click needed after joining.
      if (res.data.tournament_id) {
        await usePrices.getState().setTradingContext({ kind: 'tournament', tournamentId: res.data.tournament_id, title: t.title || `Tournament #${t.id}` })
      }
      toast.success('Joined! Terminal switched to your tournament account.')
    } else {
      toast.error(res.ok ? (res.data.message || 'Join failed') : res.error)
    }
  }

  const live = tournaments.filter(t => (t.status ?? '') === 'active')
  const upcoming = tournaments.filter(t => (t.status ?? '') !== 'active')

  const statusBadge = (t: Competition) => {
    if (joinedIds.has(t.id)) return <Badge tone="success" size="sm"><CheckCircle2 className="h-3 w-3 mr-1 inline" />Joined</Badge>
    if ((t.status ?? '') === 'active') return <Badge tone="accent" size="sm" pulsing>Live now</Badge>
    return <Badge tone="neutral" size="sm">{t.status || 'Upcoming'}</Badge>
  }

  const TournamentCard = ({ t }: { t: Competition }) => {
    const joined = joinedIds.has(t.id)
    const participants = toNum(t.current_participants)
    const maxP = toNum(t.max_participants)
    return (
      <Card className={cn('overflow-hidden transition-all', joined ? 'border-success/30' : 'hover:border-accent/40')}>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                <Trophy className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-text truncate text-lg">{t.title || `Tournament #${t.id}`}</h3>
            </div>
            {statusBadge(t)}
          </div>

          <div className="grid grid-cols-3 gap-2.5">
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
            <div className="rounded-lg bg-bg-subtle/60 border border-border-subtle p-2.5">
              <div className="text-2xs uppercase tracking-wider text-text-muted flex items-center gap-1">
                <Users className="h-3 w-3" /> Traders
              </div>
              <div className="text-sm font-bold tabular text-text mt-0.5">
                {participants}{maxP > 0 ? `/${maxP}` : ''}
              </div>
            </div>
          </div>

          {t.end_date && (
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <Calendar className="h-3.5 w-3.5" /> Ends {new Date(String(t.end_date).replace(' ', 'T')).toLocaleDateString()}
            </div>
          )}

          {joined ? (
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
    )
  }

  return (
    <div className="space-y-6 w-full pb-16">
      {/* Hero stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xs uppercase tracking-wider text-text-muted">Entry wallet</div>
              <div className="text-lg font-bold tabular text-text">{fmtUSD(wallet ?? 0)}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xs uppercase tracking-wider text-text-muted">Live tournaments</div>
              <div className="text-lg font-bold tabular text-text">{live.length}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xs uppercase tracking-wider text-text-muted">My entries</div>
              <div className="text-lg font-bold tabular text-text">{mine.length}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center gap-3 text-text-muted">
          <Loader2 className="h-7 w-7 animate-spin text-accent" />
          <p className="text-sm">Loading tournaments…</p>
        </div>
      ) : (
        <>
          {live.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-text uppercase tracking-wider flex items-center gap-2">
                <span className="h-4 w-1 bg-accent rounded-full inline-block" /> Live now
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {live.map(t => <TournamentCard key={t.id} t={t} />)}
              </div>
            </div>
          )}

          {upcoming.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-text uppercase tracking-wider flex items-center gap-2">
                <span className="h-4 w-1 bg-warn rounded-full inline-block" /> Upcoming
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {upcoming.map(t => <TournamentCard key={t.id} t={t} />)}
              </div>
            </div>
          )}

          {tournaments.length === 0 && (
            <Card>
              <CardContent className="py-16 text-center space-y-3">
                <Trophy className="h-10 w-10 mx-auto text-text-faint" />
                <p className="font-semibold text-text">No tournaments right now</p>
                <p className="text-sm text-text-muted">New tournaments appear here the moment they go live.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {mine.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-text uppercase tracking-wider flex items-center gap-2">
            <span className="h-4 w-1 bg-success rounded-full inline-block" /> My Tournaments
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {mine.map((m) => (
              <Card key={m.tournament_id}>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-text truncate flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-accent shrink-0" /> {m.title}
                    </div>
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
