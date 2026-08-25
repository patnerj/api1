'use client'

import * as React from 'react'
import { useState, useMemo } from 'react'
import { 
  Trophy, Award, Users, DollarSign, Calendar, Clock, 
  Plus, Edit, Trash2, Search, Filter, RefreshCw, Eye,
  CheckCircle2, AlertTriangle, ShieldCheck, Flame, ChevronRight,
  TrendingUp, Sparkles, X, ArrowUpRight, Zap, Swords, Radio, ExternalLink, StopCircle
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Tournament, TournamentParticipant, TournamentRules, PvpMatch, PvpAnalyticsResponse } from '@/types/api'
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter 
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Label } from '@/components/ui/input'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { toast } from 'sonner'

export default function AdminTournamentsPage() {
  const queryClient = useQueryClient()
  const [activeNavTab, setActiveNavTab] = useState<'tournaments' | 'pvp'>('tournaments')

  // Filters State
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Modals State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null)
  const [tournamentToDelete, setTournamentToDelete] = useState<Tournament | null>(null)
  
  const [isLeaderboardModalOpen, setIsLeaderboardModalOpen] = useState(false)
  const [selectedTournamentForLeaderboard, setSelectedTournamentForLeaderboard] = useState<Tournament | null>(null)

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    starting_balance: '10000',
    entry_fee: '0',
    max_participants: '500',
    prize_pool: '$25,000',
    first_prize: '$10,000 + $100K Account',
    second_prize: '$5,000 + $50K Account',
    third_prize: '$2,500 + $25K Account',
    start_date: new Date().toISOString().slice(0, 16),
    end_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 16),
    daily_dd: '5',
    max_dd: '10',
    leverage: '100',
    status: 'upcoming' as 'upcoming' | 'active' | 'completed' | 'cancelled'
  })

  // ─────────────────────────────────────────────────────────────
  // 1. FETCH TOURNAMENTS LIST
  // ─────────────────────────────────────────────────────────────
  const { data: tournaments = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-tournaments', statusFilter, searchQuery],
    queryFn: async () => {
      const res = await api.admin.tournaments.list({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchQuery ? searchQuery : undefined,
      })
      return res.ok && Array.isArray(res.data) ? res.data : []
    },
    refetchInterval: 20_000,
  })

  // ─────────────────────────────────────────────────────────────
  // 2. FETCH LIVE LEADERBOARD
  // ─────────────────────────────────────────────────────────────
  const { 
    data: leaderboardData, 
    isLoading: isLoadingLeaderboard,
    refetch: refetchLeaderboard
  } = useQuery({
    queryKey: ['admin-tournament-leaderboard', selectedTournamentForLeaderboard?.id],
    queryFn: async () => {
      if (!selectedTournamentForLeaderboard?.id) return null
      const res = await api.admin.tournaments.leaderboard(selectedTournamentForLeaderboard.id)
      return res.ok ? res.data : null
    },
    enabled: !!selectedTournamentForLeaderboard && isLeaderboardModalOpen,
    refetchInterval: 10_000,
  })

  // ─────────────────────────────────────────────────────────────
  // 2.5 FETCH PVP ARENA ANALYTICS & REVENUE
  // ─────────────────────────────────────────────────────────────
  const { data: pvpData, refetch: refetchPvp } = useQuery<PvpAnalyticsResponse>({
    queryKey: ['admin-pvp-analytics'],
    queryFn: async () => {
      const res = await api.admin.pvpAnalytics()
      if (!res.ok) throw new Error(res.error || 'Failed to fetch pvp analytics.')
      return res.data
    },
    refetchInterval: 10_000,
  })

  const settlePvpMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.pvp.settle(id)
      if (!res.ok) throw new Error(res.error || 'Failed to settle duel.')
      return res.data
    },
    onSuccess: (data) => {
      toast.success('🏆 Duel Settled! ' + data.message)
      queryClient.invalidateQueries({ queryKey: ['admin-pvp-analytics'] })
    },
    onError: (err: any) => {
      toast.error('Settlement Error: ' + err.message)
    },
  })

  // ─────────────────────────────────────────────────────────────
  // 3. MUTATIONS (SAVE, STATUS, DELETE)
  // ─────────────────────────────────────────────────────────────
  const saveTournamentMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.admin.tournaments.save(payload)
      if (!res.ok) throw new Error(res.error || 'Failed to save tournament.')
      return res.data
    },
    onSuccess: () => {
      toast.success(editingTournament ? 'Tournament updated successfully!' : 'Tournament created and launched!')
      setIsFormModalOpen(false)
      setEditingTournament(null)
      queryClient.invalidateQueries({ queryKey: ['admin-tournaments'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error saving tournament.')
    }
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await api.admin.tournaments.updateStatus(id, status)
      if (!res.ok) throw new Error(res.error || 'Failed to update status.')
      return res.data
    },
    onSuccess: () => {
      toast.success('Tournament status updated!')
      queryClient.invalidateQueries({ queryKey: ['admin-tournaments'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error updating status.')
    }
  })

  const deleteTournamentMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.admin.tournaments.delete(id)
      if (!res.ok) throw new Error(res.error || 'Failed to delete tournament.')
      return res.data
    },
    onSuccess: () => {
      toast.success('Tournament deleted.')
      queryClient.invalidateQueries({ queryKey: ['admin-tournaments'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error deleting tournament.')
    }
  })

  // Open Form Modal Handler
  const handleOpenCreateModal = () => {
    setEditingTournament(null)
    setFormData({
      title: '',
      slug: '',
      description: '',
      starting_balance: '10000',
      entry_fee: '0',
      max_participants: '500',
      prize_pool: '$25,000',
      first_prize: '$10,000 + $100K Account',
      second_prize: '$5,000 + $50K Account',
      third_prize: '$2,500 + $25K Account',
      start_date: new Date().toISOString().slice(0, 16),
      end_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 16),
      daily_dd: '5',
      max_dd: '10',
      leverage: '100',
      status: 'upcoming'
    })
    setIsFormModalOpen(true)
  }

  const handleOpenEditModal = (t: Tournament) => {
    setEditingTournament(t)
    
    let rules: any = {}
    if (typeof t.rules_json === 'string') {
      try { rules = JSON.parse(t.rules_json) } catch (e) {}
    } else if (t.rules_json) {
      rules = t.rules_json
    }

    let prizes: any = {}
    if (typeof t.prizes_breakdown === 'string') {
      try { prizes = JSON.parse(t.prizes_breakdown) } catch (e) {}
    } else if (t.prizes_breakdown) {
      prizes = t.prizes_breakdown
    }

    setFormData({
      title: t.title || t.name || '',
      slug: t.slug || '',
      description: t.description || '',
      starting_balance: String(t.starting_balance || 10000),
      entry_fee: String(t.entry_fee || 0),
      max_participants: String(t.max_participants || 500),
      prize_pool: t.prize_pool || '$25,000',
      first_prize: prizes['1st'] || '$10,000 + $100K Account',
      second_prize: prizes['2nd'] || '$5,000 + $50K Account',
      third_prize: prizes['3rd'] || '$2,500 + $25K Account',
      start_date: t.start_date ? new Date(t.start_date).toISOString().slice(0, 16) : '',
      end_date: t.end_date ? new Date(t.end_date).toISOString().slice(0, 16) : '',
      daily_dd: String(rules.daily_dd || 5),
      max_dd: String(rules.max_dd || 10),
      leverage: String(rules.leverage || 100),
      status: t.status || 'upcoming'
    })
    setIsFormModalOpen(true)
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      toast.error('Tournament title is required.')
      return
    }

    const payload = {
      id: editingTournament ? editingTournament.id : undefined,
      title: formData.title.trim(),
      slug: formData.slug.trim() || undefined,
      description: formData.description.trim(),
      starting_balance: parseFloat(formData.starting_balance) || 10000,
      entry_fee: parseFloat(formData.entry_fee) || 0,
      max_participants: parseInt(formData.max_participants) || 500,
      prize_pool: formData.prize_pool.trim() || '$10,000',
      prizes_breakdown: {
        '1st': formData.first_prize,
        '2nd': formData.second_prize,
        '3rd': formData.third_prize,
      },
      rules_json: {
        daily_dd: parseFloat(formData.daily_dd) || 5,
        max_dd: parseFloat(formData.max_dd) || 10,
        leverage: parseInt(formData.leverage) || 100,
      },
      start_date: formData.start_date ? new Date(formData.start_date).toISOString() : undefined,
      end_date: formData.end_date ? new Date(formData.end_date).toISOString() : undefined,
      status: formData.status,
    }

    saveTournamentMutation.mutate(payload)
  }

  // Summary Metrics Computation
  const metrics = useMemo(() => {
    const total = tournaments.length
    const active = tournaments.filter(t => t.status === 'active').length
    const totalEnrolled = tournaments.reduce((acc, t) => acc + (t.current_participants || t.participants_count || 0), 0)
    const prizeSum = tournaments.reduce((acc, t) => {
      const num = parseFloat(String(t.prize_pool).replace(/[^0-9.]/g, '')) || 0
      return acc + num
    }, 0)
    return {
      total,
      active,
      totalEnrolled,
      prizeSumFormatted: `$${prizeSum.toLocaleString()}`
    }
  }, [tournaments])

  return (
    <div className="w-full space-y-6 pb-16">
      
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1F2937]/70 pb-6 w-full">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Tournaments & Competitions Engine
            </h1>
            <Badge tone="accent" size="sm" pulsing className="font-mono">
              Live Contests
            </Badge>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Host global prop trading tournaments, manage automated prize pools, and track real-time leaderboards.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (activeNavTab === 'pvp') {
                refetchPvp()
                toast.info('PvP arena telemetry refreshed.')
              } else {
                refetch()
                toast.info('Tournament directory refreshed.')
              }
            }}
            className="gap-1.5 border-[#1F2937] hover:border-emerald-500"
          >
            <RefreshCw className="h-4 w-4 text-emerald-400" />
            Refresh
          </Button>

          {activeNavTab === 'tournaments' && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreateModal}
              className="gap-1.5 shadow-emerald-500/20"
            >
              <Plus className="h-4 w-4" />
              Create Tournament
            </Button>
          )}
        </div>
      </div>

      {/* ── Sub Navigation Tabs ───────────────────────────────────────────── */}
      <div className="flex items-center gap-3 border-b border-[#1F2937] pb-3">
        <button
          onClick={() => setActiveNavTab('tournaments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeNavTab === 'tournaments'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-gray-400 hover:text-white bg-[#111827] border border-[#1F2937]'
          }`}
        >
          <Trophy className="h-4 w-4" />
          Global Tournaments ({tournaments.length})
        </button>

        <button
          onClick={() => setActiveNavTab('pvp')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeNavTab === 'pvp'
              ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-md shadow-red-600/20'
              : 'text-gray-400 hover:text-white bg-[#111827] border border-[#1F2937]'
          }`}
        >
          <Swords className="h-4 w-4 text-red-400" />
          1v1 PvP Arena & Rake Revenue
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-red-500/20 text-red-300 border border-red-500/30">
            15% Rake
          </span>
        </button>
      </div>

      {activeNavTab === 'tournaments' ? (
        <>
          {/* ── Summary Metric Cards ──────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
            <Card className="bg-[#111827] border-[#1F2937]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400">Total Competitions</span>
                  <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <Trophy className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-white mt-1.5 font-mono">
                  {metrics.total}
                </div>
                <span className="text-[10px] text-gray-500 font-mono">Hosted all-time</span>
              </CardContent>
            </Card>

        <Card className="bg-[#111827] border-[#1F2937]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400">Active Contests</span>
              <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Flame className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-1.5 font-mono">
              {metrics.active}
            </div>
            <span className="text-[10px] text-gray-500 font-mono">Live trading sprints</span>
          </CardContent>
        </Card>

        <Card className="bg-[#111827] border-[#1F2937]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400">Enrolled Traders</span>
              <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Users className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-blue-400 mt-1.5 font-mono">
              {metrics.totalEnrolled.toLocaleString()}
            </div>
            <span className="text-[10px] text-gray-500 font-mono">Community participants</span>
          </CardContent>
        </Card>

        <Card className="bg-[#111827] border-[#1F2937]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400">Total Prize Pool</span>
              <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <DollarSign className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-amber-400 mt-1.5 font-mono">
              {metrics.prizeSumFormatted}
            </div>
            <span className="text-[10px] text-gray-500 font-mono">Guaranteed cash & funded</span>
          </CardContent>
        </Card>
      </div>

      {/* ── Filter & Search Toolbar ───────────────────────────────────────── */}
      <Card className="bg-[#111827] border-[#1F2937]">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="h-4 w-4 absolute left-3 top-3 text-gray-500" />
              <Input
                placeholder="Search tournaments by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 bg-[#0B0F19] p-1 rounded-lg border border-[#1F2937]">
              {['all', 'active', 'upcoming', 'completed'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all cursor-pointer ${
                    statusFilter === tab
                      ? 'bg-emerald-500 text-black font-semibold shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

          </div>
        </CardContent>
      </Card>

      {/* ── Tournament Cards Grid ─────────────────────────────────────────── */}
      {tournaments.length === 0 ? (
        <Card className="bg-[#111827] border-[#1F2937]">
          <CardContent className="py-16 text-center text-gray-400">
            <Trophy className="h-10 w-10 mx-auto text-gray-600 mb-3" />
            <h3 className="font-semibold text-white text-base">No Tournaments Found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              No tournaments match your current filter settings. Click "+ Create Tournament" to configure your first prop contest.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreateModal}
              className="mt-4 gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Create First Tournament
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tournaments.map((t) => {
            const currentCount = t.current_participants || t.participants_count || 0
            const maxCount = t.max_participants || 500
            const fillPct = Math.min(100, Math.round((currentCount / maxCount) * 100))

            return (
              <Card 
                key={t.id} 
                className="bg-[#111827] border-[#1F2937] hover:border-gray-600 transition-all flex flex-col justify-between overflow-hidden shadow-lg group"
              >
                <div>
                  {/* Card Header Top */}
                  <CardHeader className="pb-3 border-b border-[#1F2937]/50 bg-[#0B0F19]/40">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            #{t.id}
                          </span>
                          <Badge 
                            tone={
                              t.status === 'active' ? 'success' :
                              t.status === 'upcoming' ? 'warn' :
                              t.status === 'completed' ? 'neutral' : 'danger'
                            } 
                            size="sm"
                            pulsing={t.status === 'active'}
                            className="capitalize font-mono text-[10px]"
                          >
                            {t.status}
                          </Badge>
                        </div>

                        <CardTitle className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1 mt-1">
                          {t.title || t.name}
                        </CardTitle>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20 inline-block">
                          {t.prize_pool}
                        </span>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Card Body */}
                  <CardContent className="p-5 space-y-4 text-xs font-sans">
                    <p className="text-gray-400 line-clamp-2 leading-relaxed min-h-[36px]">
                      {t.description || 'Global simulated trading tournament. Compete against top prop traders for funded accounts and cash prizes.'}
                    </p>

                    {/* Specifications Grid */}
                    <div className="grid grid-cols-2 gap-2 bg-[#0B0F19] p-3 rounded-lg border border-[#1F2937]/80 font-mono text-[11px]">
                      <div>
                        <span className="text-gray-500 block text-[10px]">Starting Equity</span>
                        <span className="font-bold text-white">${Number(t.starting_balance || 10000).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px]">Entry Fee</span>
                        <span className="font-bold text-emerald-400">
                          {Number(t.entry_fee) === 0 ? 'FREE' : `$${t.entry_fee}`}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px]">Start Date</span>
                        <span className="text-gray-300">{new Date(t.start_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px]">End Date</span>
                        <span className="text-gray-300">{new Date(t.end_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>

                    {/* Participant Fill Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-gray-400 flex items-center gap-1">
                          <Users className="h-3 w-3 text-emerald-400" />
                          Enrollment
                        </span>
                        <span className="font-bold text-white">
                          {currentCount} / {maxCount} ({fillPct}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#0B0F19] overflow-hidden border border-[#1F2937]">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all rounded-full"
                          style={{ width: `${fillPct}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </div>

                {/* Card Footer Actions */}
                <CardFooter className="border-t border-[#1F2937]/70 p-3 bg-[#0B0F19]/60 flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedTournamentForLeaderboard(t)
                      setIsLeaderboardModalOpen(true)
                    }}
                    className="gap-1.5 text-xs border-emerald-500/30 hover:border-emerald-500 text-emerald-400 flex-1"
                  >
                    <Trophy className="h-3.5 w-3.5" />
                    Leaderboard
                  </Button>

                  <div className="flex items-center gap-1.5">
                    <select
                      value={t.status}
                      onChange={(e) => updateStatusMutation.mutate({ id: t.id, status: e.target.value })}
                      className="bg-[#0B0F19] border border-[#1F2937] text-gray-300 text-[11px] font-mono rounded px-2 py-1.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
                      title="Change Status"
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEditModal(t)}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-white"
                      title="Edit Tournament"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTournamentToDelete(t)}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-red-400"
                      title="Delete Tournament"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardFooter>

              </Card>
            )
          })}
        </div>
      )}
      </>
      ) : (
        /* ── 1V1 PVP E-SPORTS ARENA & RAKE REVENUE VIEW ─────────────────── */
        <div className="space-y-6">
          
          {/* PvP Telemetry 4-Pack */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
            <Card className="bg-[#111827] border-red-500/30 shadow-lg shadow-red-950/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400">Total Volume Staked</span>
                  <div className="h-7 w-7 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center">
                    <DollarSign className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-white mt-1.5 font-mono">
                  ${(pvpData?.analytics?.total_staked || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[10px] text-gray-500 font-mono">Cumulative 1v1 turnover</span>
              </CardContent>
            </Card>

            <Card className="bg-[#111827] border-amber-500/30 shadow-lg shadow-amber-950/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-400 font-bold">House Rake (15%)</span>
                  <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <Trophy className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-amber-400 mt-1.5 font-mono">
                  ${(pvpData?.analytics?.total_rake || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[10px] text-emerald-400 font-mono">100% Risk-Free Platform Profit</span>
              </CardContent>
            </Card>

            <Card className="bg-[#111827] border-[#1F2937]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400">Active Live Duels</span>
                  <div className="h-7 w-7 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center">
                    <Radio className="h-3.5 w-3.5 animate-ping" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-red-400 mt-1.5 font-mono">
                  {pvpData?.analytics?.active_matches || 0} LIVE
                </div>
                <span className="text-[10px] text-gray-500 font-mono">Real-time spectator rooms</span>
              </CardContent>
            </Card>

            <Card className="bg-[#111827] border-[#1F2937]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400">Settled Matches</span>
                  <div className="h-7 w-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-purple-400 mt-1.5 font-mono">
                  {pvpData?.analytics?.completed_matches || 0} Duels
                </div>
                <span className="text-[10px] text-gray-500 font-mono">Automated escrow payouts</span>
              </CardContent>
            </Card>
          </div>

          {/* PvP Matches Table */}
          <Card className="bg-[#111827] border-[#1F2937] overflow-hidden">
            <CardHeader className="border-b border-[#1F2937] pb-4 bg-[#0B0F19]/60 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base text-gray-100 flex items-center gap-2">
                  <Swords className="h-4 w-4 text-red-500" />
                  1v1 Arena Matches & Escrow Ledger
                </CardTitle>
                <CardDescription className="text-xs text-gray-400">
                  Monitor live gladiator trading duels, review profit splits, and force-settle arena matches.
                </CardDescription>
              </div>

              <a
                href="/arena"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 bg-red-950/30 px-3 py-1.5 rounded-lg border border-red-500/30 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open Public Arena Lobby
              </a>
            </CardHeader>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#1F2937] text-gray-400 font-mono uppercase text-[11px] bg-[#0B0F19]/40">
                    <th className="py-3 px-4">Match Code</th>
                    <th className="py-3 px-4">Gladiator A (Creator)</th>
                    <th className="py-3 px-4">Gladiator B (Challenger)</th>
                    <th className="py-3 px-4 text-center">Stake & Prize Pool</th>
                    <th className="py-3 px-4 text-center">House Rake (15%)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2937]/60">
                  {(!pvpData?.matches || pvpData.matches.length === 0) ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-500">
                        No arena matches registered yet.
                      </td>
                    </tr>
                  ) : (
                    pvpData.matches.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-white flex items-center gap-1.5">
                            <span>{m.match_code}</span>
                            <Badge tone="info" size="sm" className="font-mono text-[10px]">
                              {m.symbol}
                            </Badge>
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                            {m.duration_minutes} Mins Duration
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-gray-200">{m.creator_name || 'Gladiator A'}</div>
                          <div className="text-[10px] text-gray-500 font-mono">{m.creator_email || m.creator_login || (m.creator_user_id ? `User #${m.creator_user_id}` : '-')}</div>
                          <div className="text-[11px] font-mono mt-0.5 text-blue-400">
                            PnL: {Number(m.creator_pnl) >= 0 ? '+' : ''}${Number(m.creator_pnl).toFixed(2)}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-gray-200">
                            {m.challenger_name || (m.status === 'waiting' ? 'Waiting for Challenger...' : 'Gladiator B')}
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono">{m.challenger_email || m.challenger_login || (m.challenger_user_id ? `User #${m.challenger_user_id}` : '-')}</div>
                          <div className="text-[11px] font-mono mt-0.5 text-amber-400">
                            PnL: {Number(m.challenger_pnl) >= 0 ? '+' : ''}${Number(m.challenger_pnl).toFixed(2)}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono">
                          <div className="text-white font-bold">${Number(m.stake_amount).toFixed(2)} Stake</div>
                          <div className="text-[10px] text-amber-400 font-semibold mt-0.5">
                            Prize: ${Number(m.prize_pool).toFixed(2)}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-400">
                          +${Number(m.platform_rake).toFixed(2)}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {m.status === 'active' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse inline-flex items-center gap-1">
                              <Radio className="h-2.5 w-2.5" />
                              LIVE DUEL
                            </span>
                          )}
                          {m.status === 'waiting' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              WAITING
                            </span>
                          )}
                          {m.status === 'completed' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              SETTLED ({m.winner_name || 'Champion'})
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <a
                              href={`/arena/${m.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-slate-800 text-gray-300 hover:text-white hover:bg-slate-700 transition-colors"
                              title="Spectate Arena"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </a>

                            {m.status === 'active' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => settlePvpMutation.mutate(m.id)}
                                loading={settlePvpMutation.isPending}
                                className="h-7 text-[10px] font-mono text-red-400 border-red-500/30 hover:bg-red-500/10 px-2"
                              >
                                <StopCircle className="h-3 w-3 mr-1" />
                                Force Settle
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

        </div>
      )}

      {/* ── Modal 1: Live Leaderboard Drawer / Modal ──────────────────────── */}
      <Modal
        isOpen={isLeaderboardModalOpen}
        onClose={() => {
          setIsLeaderboardModalOpen(false)
          setSelectedTournamentForLeaderboard(null)
        }}
        title={`Live Leaderboard: ${selectedTournamentForLeaderboard?.title || selectedTournamentForLeaderboard?.name || 'Tournament'}`}
        description={`Prize Pool: ${selectedTournamentForLeaderboard?.prize_pool || '$25,000'} | Start Capital: $${Number(selectedTournamentForLeaderboard?.starting_balance || 10000).toLocaleString()}`}
        maxWidth="2xl"
        className="max-w-4xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#1F2937]">
            <div className="flex items-center gap-2">
              <Badge tone="accent" size="sm" pulsing className="font-mono">
                Real-Time Telemetry
              </Badge>
              <span className="text-xs text-gray-400">Rankings update on every MT5 trade tick</span>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchLeaderboard()}
              className="gap-1 text-xs border-[#1F2937] h-7"
            >
              <RefreshCw className="h-3 w-3 text-emerald-400" />
              Refresh Rankings
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#1F2937] max-h-[480px]">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-[#0B0F19] text-gray-400 uppercase font-mono text-[10px] tracking-wider border-b border-[#1F2937] sticky top-0">
                <tr>
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Trader</th>
                  <th className="py-3 px-4">Account</th>
                  <th className="py-3 px-4 text-right">Current Equity</th>
                  <th className="py-3 px-4 text-right">ROI %</th>
                  <th className="py-3 px-4 text-right">Max DD</th>
                  <th className="py-3 px-4">Prize Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2937]/60 bg-[#111827]">
                {isLoadingLeaderboard ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      Loading live leaderboard ranks...
                    </td>
                  </tr>
                ) : !leaderboardData?.leaderboard || leaderboardData.leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      No participants registered yet for this tournament.
                    </td>
                  </tr>
                ) : (
                  leaderboardData.leaderboard.map((p: TournamentParticipant, index: number) => {
                    const isTop3 = p.rank <= 3
                    const rankTone = p.rank === 1 ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' :
                                     p.rank === 2 ? 'text-gray-300 bg-gray-500/10 border-gray-400/30' :
                                     p.rank === 3 ? 'text-amber-600 bg-amber-700/10 border-amber-700/30' :
                                     'text-gray-400 bg-gray-800/40 border-transparent'

                    let prizes: any = {}
                    const rawBreakdown = selectedTournamentForLeaderboard?.prizes_breakdown || (leaderboardData?.tournament as any)?.prizes_breakdown
                    if (typeof rawBreakdown === 'string') {
                      try { prizes = JSON.parse(rawBreakdown) } catch (e) {}
                    } else if (rawBreakdown) {
                      prizes = rawBreakdown
                    }

                    let prizeLabel = '—'
                    if (p.rank === 1) prizeLabel = prizes['1st'] ? `🥇 1st Place: ${prizes['1st']}` : '🥇 1st Place: 50% of Prize Pool'
                    else if (p.rank === 2) prizeLabel = prizes['2nd'] ? `🥈 2nd Place: ${prizes['2nd']}` : '🥈 2nd Place: 30% of Prize Pool'
                    else if (p.rank === 3) prizeLabel = prizes['3rd'] ? `🥉 3rd Place: ${prizes['3rd']}` : '🥉 3rd Place: 20% of Prize Pool'
                    else if (p.rank <= 10 && prizes['top10']) prizeLabel = `🎖️ Top 10: ${prizes['top10']}`

                    return (
                      <tr key={p.id || index} className="hover:bg-[#1A2234] transition-colors">
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center justify-center font-mono font-bold text-xs h-6 w-6 rounded-md border ${rankTone}`}>
                            {p.rank}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <span className="font-semibold text-white block">{p.display_name || p.user_login || 'Trader'}</span>
                            <span className="text-[10px] text-gray-400 font-mono">{p.user_email || 'trader@prop.io'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-gray-300">
                          #{p.account_id || `TRD-${p.id}`}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-white">
                          ${Number(p.current_equity).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                          +{Number(p.roi_pct).toFixed(2)}%
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-gray-400">
                          {Number(p.max_dd_reached || 2.1).toFixed(1)}%
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-[11px] font-semibold ${isTop3 ? 'text-amber-400' : 'text-gray-400'}`}>
                            {prizeLabel}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLeaderboardModalOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal 2: Create / Edit Tournament Modal ───────────────────────── */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false)
          setEditingTournament(null)
        }}
        title={editingTournament ? `Edit Tournament #${editingTournament.id}` : 'Create New Tournament'}
        description="Configure competition rules, starting balances, dates, and prize breakdown."
        maxWidth="2xl"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Tournament Title</Label>
              <Input
                placeholder="e.g. Summer Global FX Cup 2026"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="text-xs"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Custom URL Slug (Optional)</Label>
              <Input
                placeholder="e.g. summer-global-fx-cup-2026"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="text-xs font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea
              placeholder="Brief summary of contest rules and target assets..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Starting Equity ($)</Label>
              <Input
                type="number"
                value={formData.starting_balance}
                onChange={(e) => setFormData({ ...formData, starting_balance: e.target.value })}
                className="text-xs font-mono"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Entry Fee ($) [0 = Free]</Label>
              <Input
                type="number"
                value={formData.entry_fee}
                onChange={(e) => setFormData({ ...formData, entry_fee: e.target.value })}
                className="text-xs font-mono"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Max Capacity</Label>
              <Input
                type="number"
                value={formData.max_participants}
                onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                className="text-xs font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Total Prize Pool ($)</Label>
              <Input
                placeholder="e.g. $25,000"
                value={formData.prize_pool}
                onChange={(e) => setFormData({ ...formData, prize_pool: e.target.value })}
                className="text-xs font-mono"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full h-10 px-3 rounded-lg bg-[#0B0F19] border border-[#1F2937] text-xs text-white focus:outline-none focus:border-emerald-500 font-mono capitalize"
              >
                <option value="upcoming">Upcoming</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Prize Breakdown */}
          <div className="p-3 bg-[#0B0F19] rounded-xl border border-[#1F2937] space-y-3">
            <span className="text-[11px] font-semibold text-gray-300 block font-mono">
              🏆 Prize Distribution Breakdown
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] text-amber-400">🥇 1st Place Prize</Label>
                <Input
                  placeholder="$10,000 + $100K Account"
                  value={formData.first_prize}
                  onChange={(e) => setFormData({ ...formData, first_prize: e.target.value })}
                  className="text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-gray-300">🥈 2nd Place Prize</Label>
                <Input
                  placeholder="$5,000 + $50K Account"
                  value={formData.second_prize}
                  onChange={(e) => setFormData({ ...formData, second_prize: e.target.value })}
                  className="text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-amber-600">🥉 3rd Place Prize</Label>
                <Input
                  placeholder="$2,500 + $25K Account"
                  value={formData.third_prize}
                  onChange={(e) => setFormData({ ...formData, third_prize: e.target.value })}
                  className="text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Start Date & Time</Label>
              <Input
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="text-xs font-mono"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">End Date & Time</Label>
              <Input
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="text-xs font-mono"
                required
              />
            </div>
          </div>

          {/* Risk Rules */}
          <div className="p-3 bg-[#0B0F19] rounded-xl border border-[#1F2937] space-y-3">
            <span className="text-[11px] font-semibold text-gray-300 block font-mono">
              ⚡ Tournament Risk Rules
            </span>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] text-gray-400">Daily DD (%)</Label>
                <Input
                  type="number"
                  value={formData.daily_dd}
                  onChange={(e) => setFormData({ ...formData, daily_dd: e.target.value })}
                  className="text-xs font-mono h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-gray-400">Max DD (%)</Label>
                <Input
                  type="number"
                  value={formData.max_dd}
                  onChange={(e) => setFormData({ ...formData, max_dd: e.target.value })}
                  className="text-xs font-mono h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-gray-400">Leverage (1:X)</Label>
                <Input
                  type="number"
                  value={formData.leverage}
                  onChange={(e) => setFormData({ ...formData, leverage: e.target.value })}
                  className="text-xs font-mono h-8"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1F2937]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsFormModalOpen(false)
                setEditingTournament(null)
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={saveTournamentMutation.isPending}
              className="gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              {editingTournament ? 'Save Changes' : 'Launch Tournament'}
            </Button>
          </div>

        </form>
      </Modal>

      {/* Delete Tournament Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!tournamentToDelete}
        onCancel={() => setTournamentToDelete(null)}
        onConfirm={() => {
          if (tournamentToDelete) {
            deleteTournamentMutation.mutate(tournamentToDelete.id)
            setTournamentToDelete(null)
          }
        }}
        title={`Delete Tournament: ${tournamentToDelete?.title || tournamentToDelete?.name || 'Tournament'}`}
        description="Are you sure you want to permanently delete this tournament and its participant leaderboard data?"
        confirmText="Delete Tournament"
        isDestructive={true}
        loading={deleteTournamentMutation.isPending}
      />

    </div>
  )
}

