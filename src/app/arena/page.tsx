'use client'

import * as React from 'react'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Swords, Trophy, Flame, Zap, Clock, Users, DollarSign, 
  ShieldAlert, ShieldCheck, ArrowRight, Plus, Eye, Radio,
  Sparkles, RefreshCw, Award, Scale, CheckCircle2, ChevronRight,
  TrendingUp, Activity
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { PvpMatch, PvpLobbyResponse, PvpLeaderboardEntry } from '@/types/api'
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter 
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Modal } from '@/components/ui/Modal'
import { toast } from 'sonner'
import { useAuth } from '@/store/auth'

function formatMoney(val: number | string | undefined | null) {
  const num = typeof val === 'string' ? parseFloat(val) : (val ?? 0)
  if (isNaN(num)) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

export default function PvpArenaLobbyPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  // State
  const [filterTab, setFilterTab] = useState<'all' | 'waiting' | 'active' | 'completed'>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    symbol: 'EURUSD',
    stake_amount: 50,
    duration_minutes: 15,
    title: '',
  })

  // Queries
  const { data: lobbyData, isLoading, refetch } = useQuery<PvpLobbyResponse>({
    queryKey: ['pvp-lobby-data'],
    queryFn: async () => {
      const res = await api.pvp.lobby()
      if (!res.ok) throw new Error(res.error || 'Failed to fetch arena lobby.')
      return res.data
    },
    refetchInterval: 5000,
  })

  // Mutations
  const createMatchMutation = useMutation({
    mutationFn: async (payload: typeof createForm) => {
      const res = await api.pvp.create(payload)
      if (!res.ok) throw new Error(res.error || 'Failed to create battle arena.')
      return res.data
    },
    onSuccess: (data) => {
      toast.success('⚔️ Arena Battle Created! Waiting for challenger.')
      setIsCreateModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['pvp-lobby-data'] })
      router.push(`/arena/${data.match_id}`)
    },
    onError: (err: any) => {
      toast.error('Arena Error: ' + err.message)
    },
  })

  const joinMatchMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.pvp.join(id)
      if (!res.ok) throw new Error(res.error || 'Failed to join battle arena.')
      return res.data
    },
    onSuccess: (data) => {
      toast.success('🔥 CHALLENGE ACCEPTED! Entering the 1v1 Arena...')
      queryClient.invalidateQueries({ queryKey: ['pvp-lobby-data'] })
      router.push(`/arena/${data.match_id}`)
    },
    onError: (err: any) => {
      toast.error('Join Error: ' + err.message)
    },
  })

  const user = useAuth((s) => s.user)
  const currentUserId = user?.id ? Number(user.id) : 0

  const cancelMatchMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.pvp.cancel(id)
      if (!res.ok) throw new Error(res.error || 'Failed to cancel match.')
      return res.data
    },
    onSuccess: () => {
      toast.success('🛡️ Match cancelled and stake refunded.')
      queryClient.invalidateQueries({ queryKey: ['pvp-lobby-data'] })
    },
    onError: (err: any) => {
      toast.error('Cancel Error: ' + err.message)
    },
  })

  const allMatches: PvpMatch[] = useMemo(() => {
    if (!lobbyData) return []
    const w = lobbyData.waiting || []
    const a = lobbyData.active || []
    const c = lobbyData.completed || []
    return [...a, ...w, ...c]
  }, [lobbyData])

  const filteredMatches = useMemo(() => {
    if (filterTab === 'waiting') return lobbyData?.waiting || []
    if (filterTab === 'active') return lobbyData?.active || []
    if (filterTab === 'completed') return lobbyData?.completed || []
    return allMatches
  }, [filterTab, lobbyData, allMatches])

  const stats = lobbyData?.stats || {
    total_staked: 0,
    total_rake: 0,
    total_matches: 0,
    active_count: 0,
    waiting_count: 0,
  }

  const SYMBOLS = ['EURUSD', 'XAUUSD', 'BTCUSD', 'US30', 'NAS100']
  const STAKE_OPTIONS = [10, 25, 50, 100, 250, 500]
  const DURATION_OPTIONS = [
    { label: '5 Mins', val: 5, desc: 'Hyper-Turbo' },
    { label: '15 Mins', val: 15, desc: 'Fast Sprint' },
    { label: '30 Mins', val: 30, desc: 'Standard Duel' },
    { label: '60 Mins', val: 60, desc: 'Endurance Clash' },
  ]

  return (
    <div className="min-h-screen bg-[#070A12] text-slate-100 pb-24">
      
      {/* ── STADIUM HERO SECTION ───────────────────────────────────────────── */}
      <section className="relative border-b border-red-500/20 bg-gradient-to-b from-red-950/40 via-purple-950/20 to-[#070A12] py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
        
        {/* Glow backdrop fx */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-96 w-full max-w-4xl bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative max-w-7xl mx-auto space-y-8">
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">
                  <Flame className="h-3.5 w-3.5 text-red-500" />
                  E-Sports Trading Stadium
                </span>
                <span className="text-xs text-gray-400 font-mono">
                  • 1v1 Head-to-Head Duels
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white flex items-center gap-3">
                PvP Trading Arena
                <Swords className="h-8 w-8 sm:h-10 sm:w-10 text-red-500" />
              </h1>

              <p className="text-sm sm:text-base text-gray-300 max-w-2xl leading-relaxed">
                Stake your entry, duel traders worldwide in live real-time sprints with identical simulated accounts, and take 85% of the prize pool.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Button
                size="lg"
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-extrabold gap-2 px-6 h-12 shadow-lg shadow-red-600/30 border border-red-400/30 transition-all transform hover:scale-105"
              >
                <Plus className="h-5 w-5" />
                Create 1v1 Battle
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  refetch()
                  toast.success('Arena feed refreshed')
                }}
                className="border-slate-800 text-gray-300 hover:text-white hover:bg-slate-800/80 gap-2 h-12"
              >
                <RefreshCw className="h-4 w-4 text-red-400" />
                Live Refresh
              </Button>
            </div>
          </div>

          {/* 4 Arena Telemetry Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            
            <div className="bg-[#111827]/80 backdrop-blur-sm border border-[#1F2937] p-4 rounded-xl">
              <div className="flex items-center justify-between text-xs text-gray-400 font-mono uppercase">
                <span>Active Duels</span>
                <Radio className="h-3.5 w-3.5 text-red-500 animate-ping" />
              </div>
              <div className="text-2xl font-black font-mono text-white mt-1">
                {stats.active_count} LIVE
              </div>
              <div className="text-[11px] text-gray-500 mt-1">Real-time spectator rooms</div>
            </div>

            <div className="bg-[#111827]/80 backdrop-blur-sm border border-[#1F2937] p-4 rounded-xl">
              <div className="flex items-center justify-between text-xs text-gray-400 font-mono uppercase">
                <span>Total Staked</span>
                <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
                {formatMoney(stats.total_staked)}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">Cumulative duel volume</div>
            </div>

            <div className="bg-[#111827]/80 backdrop-blur-sm border border-[#1F2937] p-4 rounded-xl">
              <div className="flex items-center justify-between text-xs text-gray-400 font-mono uppercase">
                <span>Prize Payout Ratio</span>
                <Trophy className="h-3.5 w-3.5 text-amber-400" />
              </div>
              <div className="text-2xl font-black font-mono text-amber-400 mt-1">
                85% Winner
              </div>
              <div className="text-[11px] text-gray-500 mt-1">15% platform escrow rake</div>
            </div>

            <div className="bg-[#111827]/80 backdrop-blur-sm border border-[#1F2937] p-4 rounded-xl">
              <div className="flex items-center justify-between text-xs text-gray-400 font-mono uppercase">
                <span>Matches Settled</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-purple-400" />
              </div>
              <div className="text-2xl font-black font-mono text-purple-400 mt-1">
                {stats.total_matches} Duels
              </div>
              <div className="text-[11px] text-gray-500 mt-1">100% automated payouts</div>
            </div>

          </div>

        </div>
      </section>

      {/* ── ARENA LOBBY MAIN CONTENT ───────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-12">
        
        {/* Navigation Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1F2937] pb-4">
          <div className="flex items-center bg-[#111827] p-1 rounded-xl border border-[#1F2937]">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                filterTab === 'all'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              All Matches ({allMatches.length})
            </button>
            <button
              onClick={() => setFilterTab('waiting')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                filterTab === 'waiting'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Zap className="h-3.5 w-3.5" />
              Open Challenges ({lobbyData?.waiting?.length || 0})
            </button>
            <button
              onClick={() => setFilterTab('active')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                filterTab === 'active'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Radio className="h-3.5 w-3.5 text-red-400" />
              Live Duels ({lobbyData?.active?.length || 0})
            </button>
            <button
              onClick={() => setFilterTab('completed')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                filterTab === 'completed'
                  ? 'bg-slate-800 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Recaps & History ({lobbyData?.completed?.length || 0})
            </button>
          </div>

          <div className="text-xs text-gray-400 font-mono flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Provably Fair Live Pricing Engine</span>
          </div>
        </div>

        {/* ── BATTLES GRID ───────────────────────────────────────────────────── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Swords className="h-5 w-5 text-red-500" />
              Gladiator Arena Roster
            </h2>
            <span className="text-xs text-gray-500 font-mono">
              Showing {filteredMatches.length} arenas
            </span>
          </div>

          {isLoading ? (
            <div className="py-20 text-center text-gray-500">
              <div className="h-8 w-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading arena matches...
            </div>
          ) : filteredMatches.length === 0 ? (
            <Card className="bg-[#111827] border-[#1F2937] text-center p-12">
              <Swords className="h-12 w-12 mx-auto text-gray-600 mb-3" />
              <h3 className="text-base font-bold text-gray-300">No Battles Found in This Category</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Be the first gladiator to create a 1v1 challenge and wait for an opponent to accept!
              </p>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-5 bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Create 1v1 Duel
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMatches.map((match) => {
                const isWaiting = match.status === 'waiting'
                const isActive = match.status === 'active'
                const isCompleted = match.status === 'completed'

                return (
                  <Card 
                    key={match.id}
                    className={`bg-[#111827] border transition-all duration-300 overflow-hidden relative group hover:border-red-500/50 ${
                      isActive 
                        ? 'border-red-500/40 shadow-lg shadow-red-950/20' 
                        : isWaiting 
                        ? 'border-amber-500/30' 
                        : 'border-[#1F2937]'
                    }`}
                  >
                    {/* Top Status Bar */}
                    <div className="p-4 border-b border-[#1F2937]/70 flex items-center justify-between bg-[#0B0F19]/60">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-gray-300">
                          {match.match_code}
                        </span>
                        <Badge tone="info" size="sm" className="font-mono text-[10px]">
                          {match.symbol}
                        </Badge>
                      </div>

                      {isActive && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse flex items-center gap-1">
                          <Radio className="h-2.5 w-2.5" />
                          LIVE BATTLE
                        </span>
                      )}

                      {isWaiting && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          WAITING
                        </span>
                      )}

                      {isCompleted && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <Trophy className="h-2.5 w-2.5" />
                          COMPLETED
                        </span>
                      )}
                    </div>

                    <CardContent className="p-5 space-y-4">
                      
                      {/* Title & Duration */}
                      <div>
                        <h3 className="text-base font-bold text-white group-hover:text-red-400 transition-colors">
                          {match.title}
                        </h3>
                        <div className="text-xs text-gray-400 font-mono mt-0.5 flex items-center gap-2">
                          <Clock className="h-3 w-3 text-blue-400" />
                          <span>{match.duration_minutes} Mins Duration</span>
                          <span>•</span>
                          <span>$10,000 Starting Cap</span>
                        </div>
                      </div>

                      {/* Financial Stakes Showcase */}
                      <div className="bg-[#0B0F19] p-3.5 rounded-xl border border-[#1F2937] grid grid-cols-2 gap-3 text-center">
                        <div>
                          <div className="text-[10px] uppercase font-mono text-gray-400">Entry Stake</div>
                          <div className="text-base font-bold font-mono text-white mt-0.5">
                            {formatMoney(match.stake_amount)}
                          </div>
                        </div>

                        <div className="border-l border-[#1F2937]">
                          <div className="text-[10px] uppercase font-mono text-amber-400 font-bold">Winner Takes (85%)</div>
                          <div className="text-base font-extrabold font-mono text-amber-400 mt-0.5">
                            {formatMoney(match.prize_pool)}
                          </div>
                        </div>
                      </div>

                      {/* Gladiators Face-off */}
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50 border border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="h-6 w-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-mono font-bold text-[10px]">
                              P1
                            </span>
                            <span className="font-semibold text-gray-200">{match.creator_name || 'Creator'}</span>
                          </div>
                          <span className="font-mono text-gray-400">
                            {isActive || isCompleted ? `${Number(match.creator_pnl) >= 0 ? '+' : ''}${formatMoney(match.creator_pnl)}` : 'Ready'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50 border border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="h-6 w-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-mono font-bold text-[10px]">
                              P2
                            </span>
                            <span className="font-semibold text-gray-200">
                              {match.challenger_name || (isWaiting ? 'Open for Challenger...' : 'Opponent')}
                            </span>
                          </div>
                          <span className="font-mono text-gray-400">
                            {isActive || isCompleted ? `${Number(match.challenger_pnl) >= 0 ? '+' : ''}${formatMoney(match.challenger_pnl)}` : (isWaiting ? 'Waiting' : 'Ready')}
                          </span>
                        </div>
                      </div>

                    </CardContent>

                    {/* Card Footer Actions */}
                    <CardFooter className="p-4 bg-[#0B0F19]/80 border-t border-[#1F2937]/70 flex items-center justify-between">
                      {isWaiting ? (
                        match.creator_user_id && Number(match.creator_user_id) === currentUserId ? (
                          <div className="flex items-center gap-2 w-full">
                            <span className="text-xs text-amber-400/90 font-medium flex-1 truncate">Waiting for opponent...</span>
                            <Button
                              onClick={() => cancelMatchMutation.mutate(match.id)}
                              loading={cancelMatchMutation.isPending}
                              variant="outline"
                              size="sm"
                              className="border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300 font-semibold text-xs shrink-0"
                            >
                              Withdraw & Refund
                            </Button>
                          </div>
                        ) : (
                          <Button
                            onClick={() => joinMatchMutation.mutate(match.id)}
                            loading={joinMatchMutation.isPending}
                            className="w-full bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-700 hover:to-red-700 text-white font-extrabold gap-1.5 shadow-md shadow-amber-600/20"
                          >
                            <Swords className="h-4 w-4" />
                            Accept Challenge ({formatMoney(match.stake_amount)})
                          </Button>
                        )
                      ) : isActive ? (
                        <Link href={`/arena/${match.id}`} className="w-full">
                          <Button className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold gap-1.5 shadow-lg shadow-red-600/30">
                            <Radio className="h-4 w-4 animate-ping" />
                            Spectate Live Arena
                          </Button>
                        </Link>
                      ) : (
                        <Link href={`/arena/${match.id}`} className="w-full">
                          <Button variant="outline" className="w-full border-slate-800 text-gray-300 hover:text-white">
                            View Duel Recap
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </Link>
                      )}
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          )}
        </section>

        {/* ── GLADIATOR HALL OF FAME / LEADERBOARD ───────────────────────────── */}
        <section className="bg-gradient-to-r from-[#111827] via-[#0F172A] to-[#111827] border border-[#1F2937] rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Trophy className="h-6 w-6 text-amber-400" />
                Gladiator Hall of Fame (Top Win Streaks)
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Highest ranked 1v1 duelists with proven win-rate consistency and net prize earnings.
              </p>
            </div>

            <Badge tone="accent" size="sm" className="font-mono">
              Updated Real-Time
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#1F2937] text-gray-400 font-mono uppercase text-[11px]">
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Gladiator</th>
                  <th className="py-3 px-4 text-center">Duels Won</th>
                  <th className="py-3 px-4 text-center">Win Rate</th>
                  <th className="py-3 px-4 text-center">Current Streak</th>
                  <th className="py-3 px-4 text-right">Net Prize Money</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2937]/60">
                {(lobbyData?.leaderboard || []).map((row) => (
                  <tr key={row.rank} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold">
                      {row.rank === 1 ? '🥇 #1' : row.rank === 2 ? '🥈 #2' : row.rank === 3 ? '🥉 #3' : `#${row.rank}`}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 font-semibold text-gray-200">
                        <span className="text-base">{row.avatar}</span>
                        <span>{row.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-white">
                      {row.wins} Wins
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-400">
                      {row.win_rate}%
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <Flame className="h-3 w-3 text-amber-400" />
                        {row.streak} Streak
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-extrabold text-amber-400">
                      {formatMoney(row.earnings)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </main>

      {/* ── CREATE 1V1 BATTLE MODAL ────────────────────────────────────────── */}
      <Modal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Deploy 1v1 Gladiator Arena"
      >
        <div className="space-y-6 pt-2">
          
          {/* Symbol Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-300">Choose Battle Instrument</Label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {SYMBOLS.map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => setCreateForm({ ...createForm, symbol: sym })}
                  className={`p-2.5 rounded-xl text-xs font-mono font-bold border transition-all ${
                    createForm.symbol === sym
                      ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-600/30'
                      : 'bg-[#0B0F19] text-gray-400 border-[#1F2937] hover:text-white'
                  }`}
                >
                  {sym}
                </button>
              ))}
            </div>
          </div>

          {/* Stake Selector */}
          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <Label className="text-xs font-semibold text-gray-300">Entry Stake Amount ($ USDC)</Label>
              <span className="text-xs font-mono text-amber-400 font-bold">
                Winner Takes: {formatMoney(createForm.stake_amount * 2 * 0.85)}
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {STAKE_OPTIONS.map((stake) => (
                <button
                  key={stake}
                  type="button"
                  onClick={() => setCreateForm({ ...createForm, stake_amount: stake })}
                  className={`p-2.5 rounded-xl text-xs font-mono font-bold border transition-all ${
                    createForm.stake_amount === stake
                      ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/30'
                      : 'bg-[#0B0F19] text-gray-400 border-[#1F2937] hover:text-white'
                  }`}
                >
                  ${stake}
                </button>
              ))}
            </div>

            <div className="bg-[#0B0F19] p-3 rounded-xl border border-[#1F2937] text-xs text-gray-400 font-mono flex items-center justify-between">
              <span>Prize Pool (85%): <strong className="text-amber-400">{formatMoney(createForm.stake_amount * 2 * 0.85)}</strong></span>
              <span>Platform Rake (15%): <strong className="text-gray-300">{formatMoney(createForm.stake_amount * 2 * 0.15)}</strong></span>
            </div>
          </div>

          {/* Duration Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-300">Match Duration Countdown</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DURATION_OPTIONS.map((dur) => (
                <button
                  key={dur.val}
                  type="button"
                  onClick={() => setCreateForm({ ...createForm, duration_minutes: dur.val })}
                  className={`p-2.5 rounded-xl text-xs border text-left transition-all ${
                    createForm.duration_minutes === dur.val
                      ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30'
                      : 'bg-[#0B0F19] text-gray-400 border-[#1F2937] hover:text-white'
                  }`}
                >
                  <div className="font-mono font-bold">{dur.label}</div>
                  <div className="text-[10px] opacity-80">{dur.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Title */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-300">Custom Duel Title (Optional)</Label>
            <Input
              placeholder={`e.g. ${createForm.symbol} ${createForm.duration_minutes}M Turbo Clash`}
              value={createForm.title}
              onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
              className="bg-[#0B0F19] border-[#1F2937] text-white"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1F2937]">
            <Button
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
              className="border-slate-800 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={() => createMatchMutation.mutate(createForm)}
              loading={createMatchMutation.isPending}
              className="bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-extrabold px-6"
            >
              <Swords className="h-4 w-4 mr-2" />
              Open Arena ({formatMoney(createForm.stake_amount)})
            </Button>
          </div>

        </div>
      </Modal>

    </div>
  )
}
