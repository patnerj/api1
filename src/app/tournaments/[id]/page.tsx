'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Trophy, Users, ArrowLeft, ArrowRight, TrendingUp, Activity } from 'lucide-react'
import { api } from '@/lib/api'
import type { Competition, LeaderboardRow } from '@/types/api'
import { toast } from 'sonner'

export default function PublicTournamentArena() {
  const params = useParams()
  const router = useRouter()
  const id = Number(params.id)

  const [tournament, setTournament] = useState<Competition | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [registered, setRegistered] = useState(false)

  useEffect(() => {
    if (id) fetchDetails()
  }, [id])

  const fetchDetails = async () => {
    try {
      setLoading(true)
      const [tRes, lRes] = await Promise.all([
        api.tournaments.get(id),
        api.tournaments.leaderboard(id)
      ])
      
      if (tRes.ok) {
        setTournament(tRes.data)
        if ((tRes.data as any)?.is_registered || (tRes.data as any)?.is_joined) {
          setRegistered(true)
        }
      }
      if (lRes.ok) {
        const lbData = lRes.data
        if (Array.isArray(lbData)) {
          setLeaderboard(lbData as any)
        } else if (lbData && Array.isArray((lbData as any).leaderboard)) {
          setLeaderboard((lbData as any).leaderboard)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    setRegistering(true)
    try {
      const res = await api.tournaments.join(id)
      if (res.ok && res.data.success) {
        setRegistered(true)
        toast.success(res.data.message || 'Successfully registered for tournament!')
        fetchDetails()
      } else {
        toast.error((!res.ok ? res.error : res.data.message) || 'Registration failed. Are you logged in?')
      }
    } finally {
      setRegistering(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <div className="h-16 w-16 border-4 border-accent/20 border-t-accent rounded-full animate-spin"></div>
      <p className="mt-4 text-text-muted animate-pulse">Entering the Arena...</p>
    </div>
  )

  if (!tournament) return (
    <div className="min-h-screen bg-background p-8 text-center flex flex-col items-center justify-center">
      <Trophy className="h-16 w-16 text-border mb-4" />
      <h2 className="text-2xl font-bold text-text">Tournament Not Found</h2>
      <button onClick={() => router.push('/tournaments')} className="mt-4 text-accent hover:underline">Back to Tournaments</button>
    </div>
  )

  const isActive = tournament.status === 'active'
  const isCancelled = tournament.status === 'cancelled'
  const isCompleted = tournament.status === 'completed'
  const entryFee = Number(tournament.entry_fee) || 0

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Immersive Arena Header */}
      <div className="relative isolate overflow-hidden bg-surface border-b border-border">
        {/* Arena Lighting Effects */}
        <div className="absolute inset-0 z-0">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[600px] w-[800px] bg-accent/10 rounded-full blur-[120px] opacity-70 mix-blend-screen animate-pulse" />
          <div className="absolute top-0 right-0 h-96 w-96 bg-info/10 rounded-full blur-[100px] opacity-50 mix-blend-screen" />
          <div className="absolute top-0 left-0 h-96 w-96 bg-success/10 rounded-full blur-[100px] opacity-50 mix-blend-screen" />
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <button 
            onClick={() => router.push('/tournaments')}
            className="inline-flex items-center text-sm font-medium text-text-muted hover:text-text transition-colors mb-8 bg-surface-muted/50 px-3 py-1.5 rounded-full border border-border/50 backdrop-blur-sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tournaments
          </button>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-4">
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                  isActive ? 'bg-accent/20 text-accent border border-accent/30' : 
                  tournament.status === 'upcoming' ? 'bg-info/20 text-info border border-info/30' : 
                  isCancelled ? 'bg-destructive/20 text-destructive border border-destructive/30' :
                  'bg-surface-muted text-text-muted border border-border'
                }`}>
                  {isActive && <span className="h-2 w-2 rounded-full bg-accent mr-2 animate-pulse"></span>}
                  {tournament.status}
                </span>
                <span className="text-sm font-medium text-text-muted bg-surface-muted/50 px-3 py-1 rounded-full border border-border/50">
                  Ends: {new Date(tournament.end_date).toLocaleDateString()}
                </span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-text tracking-tight mb-4">
                {tournament.name}
              </h1>
              <p className="text-lg text-text-muted leading-relaxed">
                {tournament.description}
              </p>
            </div>

            <div className="shrink-0 flex flex-col gap-4 min-w-[280px]">
              <div className="bg-surface-muted/80 backdrop-blur-md border border-border/50 rounded-2xl p-6 shadow-xl space-y-3">
                <div>
                  <div className="text-xs font-medium text-text-muted mb-0.5 text-center uppercase tracking-wider">Total Prize Pool</div>
                  <div className="text-3xl font-black text-accent text-center drop-shadow-sm">{tournament.prize_pool}</div>
                </div>
                <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-text-muted px-1">
                  <span>Entry Requirement:</span>
                  <span className="font-bold text-text font-mono">{entryFee > 0 ? `$${entryFee.toFixed(2)}` : 'Free Entry'}</span>
                </div>
              </div>

              {!registered && !isCancelled && !isCompleted && (
                <button 
                  onClick={handleRegister}
                  disabled={registering}
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold py-4 rounded-xl shadow-lg shadow-accent/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2 text-base"
                >
                  {registering ? 'Registering...' : `Enter Tournament (${entryFee > 0 ? `$${entryFee.toFixed(2)}` : 'Free'})`}
                  <ArrowRight className="h-5 w-5" />
                </button>
              )}
              {registered && (
                <div className="w-full bg-success/20 border border-success/30 text-success font-bold py-4 rounded-xl text-center flex items-center justify-center gap-2">
                  <span className="h-2 w-2 bg-success rounded-full animate-pulse"></span>
                  You are registered
                </div>
              )}
              {isCancelled && (
                <div className="w-full bg-destructive/20 border border-destructive/30 text-destructive font-bold py-4 rounded-xl text-center flex items-center justify-center gap-2">
                  Tournament Cancelled
                </div>
              )}
              {isCompleted && !registered && (
                <div className="w-full bg-surface-muted border border-border text-text-muted font-bold py-4 rounded-xl text-center flex items-center justify-center gap-2">
                  Tournament Concluded
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard Section */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Leaderboard Table */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-surface border border-border rounded-2xl shadow-xl overflow-hidden">
              <div className="px-6 py-5 border-b border-border/50 bg-surface-muted/30 flex items-center justify-between">
                <h3 className="text-xl font-bold text-text flex items-center gap-2">
                  <Activity className="h-5 w-5 text-accent" />
                  Live Standings
                </h3>
                <div className="flex items-center gap-2 text-sm font-medium text-text-muted bg-surface px-3 py-1.5 rounded-full border border-border/50 shadow-sm">
                  <Users className="h-4 w-4 text-info" />
                  {tournament.participants_count ?? leaderboard.length} Participants
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-surface-muted/20 text-xs uppercase tracking-wider text-text-muted">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Rank</th>
                      <th className="px-6 py-4 font-semibold">Trader</th>
                      <th className="px-6 py-4 font-semibold text-right">Return</th>
                      <th className="px-6 py-4 font-semibold text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {leaderboard.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-text-muted">
                          No standings available yet. The arena is waiting.
                        </td>
                      </tr>
                    ) : (
                      leaderboard.map((row, index) => {
                        const isTop3 = index < 3
                        const returnPct = Number((row as any).roi_pct ?? (row as any).profit_pct ?? (row as any).return_pct ?? 0)
                        const isPositive = returnPct > 0
                        const traderName = (row as any).display_name || (row as any).user_login || (row as any).trader_name || `Trader #${(row as any).user_id || index + 1}`
                        const currentVal = Number((row as any).current_equity ?? (row as any).current_balance ?? (row as any).equity ?? 0)
                        const rankNum = (row as any).rank || index + 1
                        
                        return (
                          <tr key={index} className={`transition-colors hover:bg-surface-muted/20 ${isTop3 ? 'bg-accent/5' : ''}`}>
                            <td className="px-6 py-4">
                              <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                                index === 0 ? 'bg-warn/20 text-warn border border-warn/30 shadow-[0_0_10px_var(--warn)]' :
                                index === 1 ? 'bg-surface-hover text-text-muted border border-border' :
                                index === 2 ? 'bg-warn/10 text-warn/80 border border-warn/20' :
                                'bg-surface-muted text-text-muted font-medium'
                              }`}>
                                {rankNum}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-bold text-text flex items-center gap-2">
                                {traderName}
                                {index === 0 && <Trophy className="h-3 w-3 text-warn" />}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold ${
                                isPositive ? 'bg-success/10 text-success' : 
                                returnPct < 0 ? 'bg-danger/10 text-danger' : 
                                'bg-surface-muted text-text-muted'
                              }`}>
                                {isPositive && '+'}{returnPct.toFixed(2)}%
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right font-mono font-medium text-text">
                              ${currentVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <div className="bg-surface border border-border rounded-2xl shadow-xl p-6">
              <h3 className="font-bold text-lg text-text mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-info" />
                Tournament Rules
              </h3>
              <ul className="space-y-4 text-sm text-text-muted">
                <li className="flex gap-3">
                  <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                  <p>Highest <strong className="text-text">Return %</strong> at the end of the tournament wins.</p>
                </li>
                <li className="flex gap-3">
                  <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                  <p>Starting Balance: <strong className="text-text font-mono">${Number(tournament.starting_balance ?? tournament.initial_balance ?? 100000).toLocaleString()}</strong></p>
                </li>
                <li className="flex gap-3">
                  <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                  <p>Standard drawdown rules apply (Daily: 5%, Max: 10%). Hitting limits disqualifies the account.</p>
                </li>
                <li className="flex gap-3">
                  <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                  <p>EA and News Trading are permitted.</p>
                </li>
              </ul>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
