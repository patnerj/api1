'use client'

import * as React from 'react'
import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Swords, Trophy, Flame, Zap, Clock, Users, DollarSign, 
  ShieldAlert, ShieldCheck, ArrowRight, ArrowLeft, Radio,
  Sparkles, RefreshCw, Award, Scale, CheckCircle2, ChevronRight,
  TrendingUp, TrendingDown, Send, MessageSquare, AlertTriangle,
  Play, StopCircle
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/store/auth'
import type { PvpLiveStateResponse } from '@/types/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { toast } from 'sonner'

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

function formatTimer(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function PvpLiveBattleArenaPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const matchId = Number(params?.id)

  // Fast order execution deck state
  const [selectedLot, setSelectedLot] = useState<number>(1.0)
  const [chatMessage, setChatMessage] = useState('')
  const [localEvents, setLocalEvents] = useState<string[]>([])

  // Live query polling every 1.5 seconds
  const { data: liveState, isLoading, refetch } = useQuery<PvpLiveStateResponse>({
    queryKey: ['pvp-live-match', matchId],
    queryFn: async () => {
      const res = await api.pvp.live(matchId)
      if (!res.ok) throw new Error(res.error || 'Failed to fetch match live state.')
      return res.data
    },
    refetchInterval: 1500,
    enabled: !isNaN(matchId) && matchId > 0,
  })

  // Order Execution Mutation
  const executeOrderMutation = useMutation({
    mutationFn: async (action: 'BUY' | 'SELL') => {
      const res = await api.pvp.order(matchId, { action, lot_size: selectedLot })
      if (!res.ok) throw new Error(res.error || 'Order failed.')
      return res.data
    },
    onSuccess: (data) => {
      toast.success(`⚔️ ${data.action} ${data.lot_size} Lots executed! (${data.tick_pnl > 0 ? '+' : ''}$${data.tick_pnl})`)
      refetch()
    },
    onError: (err: any) => {
      toast.error('Order Error: ' + err.message)
    },
  })

  // Manual Settlement Mutation
  const settleMatchMutation = useMutation({
    mutationFn: async () => {
      const res = await api.pvp.settle(matchId)
      if (!res.ok) throw new Error(res.error || 'Settlement failed.')
      return res.data
    },
    onSuccess: (data) => {
      toast.success('🏆 Match Settled! ' + data.message)
      refetch()
    },
  })

  // Cancel / Withdraw Mutation
  const cancelMatchMutation = useMutation({
    mutationFn: async () => {
      const res = await api.pvp.cancel(matchId)
      if (!res.ok) throw new Error(res.error || 'Cancel failed.')
      return res.data
    },
    onSuccess: (data) => {
      toast.success('🛡️ Match Cancelled! Stake refunded.')
      router.push('/arena')
    },
    onError: (err: any) => {
      toast.error('Cancel Error: ' + err.message)
    },
  })

  const match = liveState?.match
  const isCompleted = match?.status === 'completed'
  const isActive = match?.status === 'active'
  const isWaiting = match?.status === 'waiting'

  const user = useAuth((s) => s.user)
  const currentUserId = user?.id ? Number(user.id) : 0
  const isParticipant = currentUserId > 0 && (
    currentUserId === Number(match?.creator_user_id) || 
    currentUserId === Number(match?.challenger_user_id)
  )

  const creator = liveState?.creator || { name: 'Player 1', equity: 10000, pnl: 0, trades_count: 0, user_id: 1 }
  const challenger = liveState?.challenger || { name: 'Waiting for Challenger...', equity: 10000, pnl: 0, trades_count: 0, user_id: 0 }
  const secondsLeft = liveState?.seconds_remaining ?? 0
  const leadDelta = liveState?.lead_delta ?? 0

  const [sendingChat, setSendingChat] = useState(false)

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault()
    const msg = chatMessage.trim()
    if (!msg || !matchId) return
    setChatMessage('')
    try {
      setSendingChat(true)
      const res = await api.pvp.chat(matchId, msg)
      if (res.ok && res.data.success) {
        refetch()
      } else {
        toast.error((!res.ok ? res.error : res.data.message) || 'Failed to broadcast stadium chat.')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to broadcast stadium chat.')
    } finally {
      setSendingChat(false)
    }
  }

  const LOT_BUTTONS = [0.5, 1.0, 2.0, 5.0]

  return (
    <div className="min-h-screen bg-[#06080F] text-slate-100 pb-20">
      
      {/* ── TOP NAV BAR ────────────────────────────────────────────────────── */}
      <header className="border-b border-[#1F2937]/70 bg-[#0B0F19]/80 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link 
            href="/arena"
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Arena Lobby
          </Link>
          <div className="h-4 w-[1px] bg-slate-800" />
          <span className="font-mono text-xs font-bold text-gray-300">
            {match?.match_code || 'PVP-MATCH'}
          </span>
          <Badge tone="accent" size="sm" className="font-mono text-[10px]">
            {match?.symbol || 'EURUSD'}
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-gray-300 bg-red-950/40 border border-red-500/30 px-2.5 py-1 rounded-md">
            <Radio className="h-3 w-3 text-red-500 animate-pulse" />
            <span className="font-semibold tracking-wider text-red-300">LIVE BROADCAST</span>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            className="border-slate-800 text-gray-300 h-8 gap-1"
          >
            <RefreshCw className="h-3.5 w-3.5 text-red-400" />
            Refresh
          </Button>
        </div>
      </header>

      {/* ── GLADIATOR FACE-OFF STADIUM HUD ─────────────────────────────────── */}
      <section className="relative bg-gradient-to-b from-red-950/30 via-slate-950/60 to-[#06080F] border-b border-[#1F2937] py-8 px-4 sm:px-8 overflow-hidden">
        
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          
          {/* 1. FIGHTER A (CREATOR) */}
          <div className="bg-[#111827]/90 border border-blue-500/30 p-5 rounded-2xl relative overflow-hidden shadow-lg shadow-blue-950/20">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
            
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono text-[10px] font-bold uppercase tracking-wider">
                  Gladiator A (Blue Corner)
                </span>
                <h2 className="text-lg font-bold text-white flex items-center gap-1.5">
                  {creator.name}
                </h2>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold font-mono">
                P1
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[#1F2937] grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] font-mono text-gray-400 uppercase">Live Equity</div>
                <div className="text-xl font-bold font-mono text-white mt-0.5">
                  {formatMoney(creator.equity)}
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] font-mono text-gray-400 uppercase">Floating PnL</div>
                <div className={`text-xl font-extrabold font-mono mt-0.5 ${
                  creator.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {creator.pnl >= 0 ? '+' : ''}{formatMoney(creator.pnl)}
                </div>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-gray-500">
              <span>{creator.trades_count} Orders Executed</span>
              <span className="text-blue-400 font-semibold">{((creator.pnl / 10000) * 100).toFixed(2)}% ROI</span>
            </div>
          </div>

          {/* 2. CENTER STADIUM HUD (COUNTDOWN & LEAD INDICATOR) */}
          <div className="text-center space-y-3">
            
            {/* Status Badge */}
            <div>
              {isActive && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">
                  <Flame className="h-3.5 w-3.5 text-red-500" />
                  1v1 Battle In Progress
                </span>
              )}

              {isWaiting && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  Waiting For Challenger
                </span>
              )}

              {isCompleted && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  <Trophy className="h-3.5 w-3.5 text-emerald-400" />
                  Match Concluded
                </span>
              )}
            </div>

            {/* Countdown Clock */}
            <div className="bg-[#0B0F19] border border-[#1F2937] p-4 rounded-2xl inline-block shadow-2xl">
              <div className="text-[10px] uppercase font-mono text-gray-400 tracking-wider">
                Time Remaining
              </div>
              <div className={`text-4xl sm:text-5xl font-black font-mono tracking-tight mt-1 ${
                secondsLeft <= 60 && isActive ? 'text-red-500 animate-ping' : 'text-cyan-400'
              }`}>
                {isActive ? formatTimer(secondsLeft) : isWaiting ? `${match?.duration_minutes}:00` : '00:00'}
              </div>
            </div>

            {/* Lead Delta Bar */}
            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 max-w-sm mx-auto">
              <div className="text-xs font-mono font-bold">
                {leadDelta > 0 ? (
                  <span className="text-blue-400 flex items-center justify-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5" />
                    {creator.name} Leading by +{formatMoney(leadDelta)}
                  </span>
                ) : leadDelta < 0 ? (
                  <span className="text-amber-400 flex items-center justify-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5" />
                    {challenger.name} Leading by +{formatMoney(Math.abs(leadDelta))}
                  </span>
                ) : (
                  <span className="text-gray-400">Battle Tied • Even PnL</span>
                )}
              </div>

              <div className="text-[10px] text-gray-400 font-mono mt-1">
                Prize Pool: <strong className="text-amber-400">{formatMoney(match?.prize_pool)} USDC</strong> (15% Rake)
              </div>
            </div>

          </div>

          {/* 3. FIGHTER B (CHALLENGER) */}
          <div className="bg-[#111827]/90 border border-amber-500/30 p-5 rounded-2xl relative overflow-hidden shadow-lg shadow-amber-950/20">
            <div className="absolute top-0 right-0 w-1.5 h-full bg-amber-500" />
            
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono text-[10px] font-bold uppercase tracking-wider">
                  Gladiator B (Red Corner)
                </span>
                <h2 className="text-lg font-bold text-white flex items-center gap-1.5">
                  {challenger.name}
                </h2>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold font-mono">
                P2
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[#1F2937] grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] font-mono text-gray-400 uppercase">Live Equity</div>
                <div className="text-xl font-bold font-mono text-white mt-0.5">
                  {formatMoney(challenger.equity)}
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] font-mono text-gray-400 uppercase">Floating PnL</div>
                <div className={`text-xl font-extrabold font-mono mt-0.5 ${
                  challenger.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {challenger.pnl >= 0 ? '+' : ''}{formatMoney(challenger.pnl)}
                </div>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-gray-500">
              <span>{challenger.trades_count} Orders Executed</span>
              <span className="text-amber-400 font-semibold">{((challenger.pnl / 10000) * 100).toFixed(2)}% ROI</span>
            </div>
          </div>

        </div>
      </section>

      {/* ── BATTLE ARENA DECK & LIVE ACTION STREAM ──────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: In-Arena Execution Deck & Simulated Price Ticker */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Order Execution Deck */}
          <Card className="bg-[#111827] border-[#1F2937] overflow-hidden">
            <CardHeader className="border-b border-[#1F2937] pb-4 bg-[#0B0F19]/60">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base text-gray-100 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-400" />
                    Gladiator Order Execution Deck
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-400">
                    Execute high-frequency market orders on {match?.symbol || 'EURUSD'} with sub-millisecond fill latency.
                  </CardDescription>
                </div>

                <div className="text-right font-mono">
                  <div className="text-[10px] uppercase text-gray-400">Market Price</div>
                  <div className="text-sm font-extrabold text-white">
                    {liveState?.prices?.ask?.toFixed(4) || '1.0845'}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              
              {/* Lot Selector */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-300">Select Lot Sizing Leg</Label>
                <div className="grid grid-cols-4 gap-3">
                  {LOT_BUTTONS.map((lot) => (
                    <button
                      key={lot}
                      type="button"
                      onClick={() => setSelectedLot(lot)}
                      className={`py-3 rounded-xl font-mono text-sm font-bold border transition-all ${
                        selectedLot === lot
                          ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30'
                          : 'bg-[#0B0F19] text-gray-400 border-[#1F2937] hover:text-white'
                      }`}
                    >
                      {lot.toFixed(1)} Lots
                    </button>
                  ))}
                </div>
              </div>

              {/* Participant Controls vs Spectator View */}
              {!isParticipant ? (
                <div className="rounded-xl border border-border-subtle bg-[#0B0F19]/80 p-5 text-center space-y-2">
                  <div className="flex items-center justify-center gap-2 text-sm font-bold text-amber-400">
                    <Radio className="h-4 w-4 animate-pulse" />
                    <span>Spectator Mode Active</span>
                  </div>
                  <p className="text-xs text-gray-400 max-w-md mx-auto">
                    You are viewing this battle live in the spectator arena. Live order execution and settlement calls are restricted to the matched gladiators.
                  </p>
                </div>
              ) : (
                <>
                  {/* Instant Execution Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <Button
                      size="lg"
                      disabled={!isActive || executeOrderMutation.isPending}
                      loading={executeOrderMutation.isPending}
                      onClick={() => executeOrderMutation.mutate('BUY')}
                      className="h-16 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-extrabold text-base gap-2 shadow-lg shadow-emerald-500/20 border border-emerald-400/40"
                    >
                      <TrendingUp className="h-5 w-5" />
                      MARKET BUY ({selectedLot}L)
                    </Button>

                    <Button
                      size="lg"
                      disabled={!isActive || executeOrderMutation.isPending}
                      loading={executeOrderMutation.isPending}
                      onClick={() => executeOrderMutation.mutate('SELL')}
                      className="h-16 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-extrabold text-base gap-2 shadow-lg shadow-red-500/20 border border-red-400/40"
                    >
                      <TrendingDown className="h-5 w-5" />
                      MARKET SELL ({selectedLot}L)
                    </Button>
                  </div>

                  {/* Match Controller for Admin / Manual Finish */}
                  {isActive && (
                    <div className="pt-4 border-t border-[#1F2937] flex items-center justify-between">
                      <div className="text-xs text-gray-500 font-mono">
                        Duel auto-settles when clock strikes 00:00
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => settleMatchMutation.mutate()}
                        loading={settleMatchMutation.isPending}
                        className="border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs h-8"
                      >
                        <StopCircle className="h-3.5 w-3.5 mr-1" />
                        Call Match Conclusion
                      </Button>
                    </div>
                  )}
                  {isWaiting && currentUserId === Number(match?.creator_user_id) && (
                    <div className="pt-4 border-t border-[#1F2937] flex flex-col sm:flex-row items-center justify-between gap-3 bg-amber-500/5 p-4 rounded-xl border border-amber-500/20">
                      <div className="text-xs text-amber-300">
                        You created this challenge. It is currently waiting for an opponent. You may withdraw and receive a 100% stake refund.
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => cancelMatchMutation.mutate()}
                        loading={cancelMatchMutation.isPending}
                        className="font-bold text-xs h-9 shrink-0 shadow-md shadow-red-900/30"
                      >
                        Withdraw Challenge & Refund
                      </Button>
                    </div>
                  )}
                </>
              )}

            </CardContent>
          </Card>

          {/* Victory Modal Overlay if Completed */}
          {isCompleted && (
            <Card className="bg-gradient-to-r from-amber-950/40 via-yellow-950/20 to-slate-900/60 border border-amber-500/40 p-6 text-center space-y-4">
              <Trophy className="h-14 w-14 text-amber-400 mx-auto animate-bounce" />
              <div className="space-y-1">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  DUEL COMPLETED & PRIZE AWARDED
                </span>
                <h2 className="text-2xl font-black text-white mt-2">
                  Champion: {match?.winner_name || 'Gladiator Champion'} 🏆
                </h2>
                <p className="text-xs text-gray-300">
                  Payout of <strong>{formatMoney(match?.prize_pool)} USDC</strong> credited to winner wallet.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                <Link href="/arena">
                  <Button className="bg-gradient-to-r from-amber-600 to-red-600 text-white font-extrabold px-6">
                    Back to Arena Lobby
                  </Button>
                </Link>
              </div>
            </Card>
          )}

        </div>

        {/* Right Col: Live Spectator Ticker & Stadium Chat Feed */}
        <div className="space-y-6">
          
          <Card className="bg-[#111827] border-[#1F2937] flex flex-col h-[520px]">
            <CardHeader className="border-b border-[#1F2937] pb-3 bg-[#0B0F19]/80">
              <CardTitle className="text-sm text-gray-100 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-cyan-400" />
                Live Arena Action Feed
              </CardTitle>
              <CardDescription className="text-[11px] text-gray-400">
                Real-time trade telemetry and stadium commentary
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 flex-1 overflow-y-auto space-y-3 text-xs font-mono">
              {/* Local & Server Events */}
              {localEvents.map((msg, i) => (
                <div key={`local-${i}`} className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/20 text-cyan-300">
                  <span className="font-bold text-white">You: </span>
                  {msg}
                </div>
              ))}

              {(liveState?.events || []).map((ev) => {
                let author = (ev as any).author_name;
                if (!author && (ev as any).payload) {
                  try { author = JSON.parse((ev as any).payload)?.author_name; } catch {}
                }
                const isChat = ev.event_type === 'chat';
                const isSettled = ev.event_type === 'match_settled';
                const isStarted = ev.event_type === 'battle_started';

                return (
                  <div 
                    key={ev.id}
                    className={`p-2.5 rounded-lg border ${
                      isSettled 
                        ? 'bg-amber-950/30 border-amber-500/30 text-amber-300 font-bold'
                        : isStarted
                        ? 'bg-red-950/30 border-red-500/30 text-red-300 font-bold'
                        : isChat
                        ? 'bg-cyan-950/20 border-cyan-500/30 text-cyan-200'
                        : 'bg-slate-900/60 border-slate-800 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                      <span className="font-semibold text-gray-400">{isChat ? (author || 'Spectator') : ev.event_type}</span>
                      <span>{ev.created_at}</span>
                    </div>
                    <div>{ev.message}</div>
                  </div>
                )
              })}
            </CardContent>

            <CardFooter className="p-3 bg-[#0B0F19] border-t border-[#1F2937]">
              <form onSubmit={handleSendChat} className="flex gap-2 w-full">
                <Input
                  placeholder="Send cheer in stadium..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  className="bg-slate-900 border-slate-800 text-xs h-9 font-mono"
                />
                <Button type="submit" size="sm" loading={sendingChat} className="bg-red-600 hover:bg-red-700 h-9 px-3">
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </form>
            </CardFooter>
          </Card>

        </div>

      </main>

    </div>
  )
}
