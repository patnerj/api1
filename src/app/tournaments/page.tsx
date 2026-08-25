'use client'

import { useState, useEffect } from 'react'
import { Trophy, Clock, Users, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { Competition } from '@/types/api'

export default function PublicTournamentsPage() {
  const [tournaments, setTournaments] = useState<Competition[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const res = await api.tournaments.list()
        if (res.ok) setTournaments(res.data)
      } finally {
        setLoading(false)
      }
    }
    fetchTournaments()
  }, [])

  const activeTournaments = tournaments.filter(t => t.status === 'active')
  const upcomingTournaments = tournaments.filter(t => t.status === 'upcoming')
  const completedTournaments = tournaments.filter(t => t.status === 'completed')

  const renderCard = (t: Competition, isActive: boolean) => (
    <div key={t.id} className="relative group rounded-2xl border border-border bg-surface p-6 overflow-hidden hover:shadow-lg transition-all duration-300">
      {isActive && (
        <>
          <div className="absolute -top-16 -right-16 h-32 w-32 bg-accent/20 rounded-full blur-2xl group-hover:bg-accent/30 transition-all duration-500 animate-pulse" />
          <div className="absolute top-0 right-0 p-4">
            <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-accent mr-2"></span>
              LIVE NOW
            </span>
          </div>
        </>
      )}
      
      {!isActive && t.status === 'upcoming' && (
        <div className="absolute top-0 right-0 p-4">
          <span className="inline-flex items-center rounded-full bg-info/10 px-2.5 py-0.5 text-xs font-semibold text-info">
            <Clock className="h-3 w-3 mr-1" />
            Upcoming
          </span>
        </div>
      )}

      <div className="flex items-start gap-4 mb-4">
        <div className={`p-3 rounded-xl ${isActive ? 'bg-accent/10 text-accent' : 'bg-surface-muted text-text-muted'}`}>
          <Trophy className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-text group-hover:text-accent transition-colors">
            {t.name}
          </h3>
          <p className="text-sm text-text-muted mt-1">{t.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 my-6">
        <div className="bg-surface-muted/50 p-3 rounded-lg border border-border/50">
          <div className="text-xs text-text-muted mb-1">Prize Pool</div>
          <div className="text-base font-bold text-accent">{t.prize_pool}</div>
        </div>
        <div className="bg-surface-muted/50 p-3 rounded-lg border border-border/50">
          <div className="text-xs text-text-muted mb-1">Participants</div>
          <div className="text-base font-bold text-text flex items-center gap-2">
            <Users className="h-4 w-4 text-info" />
            {t.participants_count || 0}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border/50">
        <div className="text-sm text-text-muted">
          Ends: {new Date(t.end_date).toLocaleDateString()}
        </div>
        <Link 
          href={`/tournaments/${t.id}`}
          className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors shadow-sm gap-2 ${
            isActive 
              ? 'bg-accent text-accent-foreground hover:bg-accent/90' 
              : 'bg-surface border border-border text-text hover:bg-surface-muted'
          }`}
        >
          {isActive ? 'View Arena' : t.status === 'upcoming' ? 'Pre-Register' : 'View Results'}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-surface border-b border-border py-16 sm:py-24">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 left-1/4 h-[500px] w-[500px] bg-accent/20 rounded-full blur-[100px] opacity-60 mix-blend-screen animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] bg-info/20 rounded-full blur-[80px] opacity-60 mix-blend-screen" />
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-text">
            Compete in <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent to-info">Trading Tournaments</span>
          </h1>
          <p className="mt-4 text-lg text-text-muted max-w-2xl mx-auto">
            Test your skills against traders worldwide. Climb the leaderboard, prove your strategy, and win funded accounts and cash prizes.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        {loading ? (
          <div className="text-center py-20 text-text-muted animate-pulse">Loading arenas...</div>
        ) : (
          <>
            {activeTournaments.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-8 w-1 bg-accent rounded-full" />
                  <h2 className="text-2xl font-bold text-text">Live Tournaments</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeTournaments.map(t => renderCard(t, true))}
                </div>
              </section>
            )}

            {upcomingTournaments.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-8 w-1 bg-info rounded-full" />
                  <h2 className="text-2xl font-bold text-text">Upcoming Challenges</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcomingTournaments.map(t => renderCard(t, false))}
                </div>
              </section>
            )}

            {completedTournaments.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-8 w-1 bg-border rounded-full" />
                  <h2 className="text-2xl font-bold text-text">Past Tournaments</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-75 grayscale hover:grayscale-0 transition-all duration-300">
                  {completedTournaments.map(t => renderCard(t, false))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
