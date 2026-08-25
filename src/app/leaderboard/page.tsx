'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { MarketingHeader } from '@/components/marketing/header'
import { MarketingFooter } from '@/components/marketing/footer'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { fmtPct, fmtUSD, toNum, statusLabel, statusTone } from '@/lib/format'
import type { LeaderboardRow } from '@/types/api'
import { Trophy, TrendingUp, Calendar, Crown, Medal, Award } from 'lucide-react'

export default function LeaderboardPage() {
  const [rows, setRows]     = useState<LeaderboardRow[] | null>(null)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    api.leaderboard().then((res) => {
      if (res.ok) setRows(res.data)
      else        setError(res.error)
    })
  }, [])

  return (
    <>
      <MarketingHeader />
      <main>
        <section className="pt-32 pb-12 relative overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-aurora opacity-50" />
            <div className="absolute inset-0 bg-grid-overlay opacity-30" />
          </div>
          <div className="container">
            <div className="max-w-2xl mx-auto text-center">
              <Badge tone="warn" className="mb-4">
                <Trophy className="h-3 w-3" />
                Top traders
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tightest leading-[1.05]">
                The <span className="text-warn">leaderboard</span>
              </h1>
              <p className="mt-4 text-lg text-text-muted">
                Funded traders ranked by realised profit. Updated live.
              </p>
            </div>
          </div>
        </section>

        <section className="pb-24">
          <div className="container max-w-5xl">
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-subtle bg-bg-subtle/40">
                      <th className="text-left  px-4 py-3 text-xs uppercase tracking-wider text-text-faint font-medium w-16">Rank</th>
                      <th className="text-left  px-4 py-3 text-xs uppercase tracking-wider text-text-faint font-medium">Trader</th>
                      <th className="text-left  px-4 py-3 text-xs uppercase tracking-wider text-text-faint font-medium hidden md:table-cell">Plan</th>
                      <th className="text-right px-4 py-3 text-xs uppercase tracking-wider text-text-faint font-medium">Profit</th>
                      <th className="text-right px-4 py-3 text-xs uppercase tracking-wider text-text-faint font-medium hidden sm:table-cell">Trades</th>
                      <th className="text-right px-4 py-3 text-xs uppercase tracking-wider text-text-faint font-medium hidden lg:table-cell">Days</th>
                      <th className="text-right px-4 py-3 text-xs uppercase tracking-wider text-text-faint font-medium hidden md:table-cell">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows === null && !error && Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-b border-border-subtle/30 last:border-b-0 bg-surface/30">
                        <td className="px-4 py-4"><Skeleton className="h-5 w-8 rounded-md" /></td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <Skeleton className="h-4 w-28 rounded-md" />
                          </div>
                        </td>
                        <td className="px-4 py-4 hidden md:table-cell"><Skeleton className="h-4 w-24 rounded-md" /></td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex flex-col items-end gap-1">
                            <Skeleton className="h-4 w-16 rounded-md" />
                            <Skeleton className="h-3 w-12 rounded-md" />
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right hidden sm:table-cell"><Skeleton className="h-4 w-10 ml-auto rounded-md" /></td>
                        <td className="px-4 py-4 text-right hidden lg:table-cell"><Skeleton className="h-4 w-10 ml-auto rounded-md" /></td>
                        <td className="px-4 py-4 text-right hidden md:table-cell"><Skeleton className="h-6 w-20 ml-auto rounded-full" /></td>
                      </tr>
                    ))}
                    {rows?.map((row, i) => (
                      <motion.tr
                        key={i}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: Math.min(i * 0.02, 0.4) }}
                        className="group border-b border-border-subtle/30 last:border-b-0 hover:bg-surface-muted/60 transition-all duration-200 cursor-default"
                      >
                        <td className="px-4 py-4">
                          <RankCell rank={i + 1} />
                        </td>
                        <td className="px-4 py-4">
                          <Link href={`/profile/${row.user_id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                            <div className="h-8 w-8 rounded-full bg-accent-muted flex items-center justify-center text-accent text-xs font-bold border border-accent/20 group-hover:scale-110 transition-transform">
                              {(row.trader_name || 'A').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold tracking-tight text-text group-hover:text-accent transition-colors">
                                {row.trader_name || 'Anonymous'}
                              </div>
                              <div className="text-2xs text-text-muted md:hidden mt-0.5">{row.plan_name}</div>
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-4 text-text-muted hidden md:table-cell font-medium">{row.plan_name}</td>
                        <td className="px-4 py-4 text-right">
                          <div className="font-bold tabular tracking-tight text-success flex items-center justify-end gap-1.5 drop-shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                            <TrendingUp className="h-3.5 w-3.5" />
                            {fmtPct(row.profit_pct, 2, true)}
                          </div>
                          <div className="text-xs text-text-muted tabular font-medium mt-0.5">
                            {fmtUSD(toNum(row.current_balance) - toNum(row.starting_balance))}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right tabular text-text-muted hidden sm:table-cell font-medium">{row.total_trades}</td>
                        <td className="px-4 py-4 text-right tabular text-text-muted hidden lg:table-cell font-medium">{row.trading_days}</td>
                        <td className="px-4 py-4 text-right hidden md:table-cell">
                          <Badge tone={statusTone(row.status)} className="shadow-sm group-hover:shadow-glow transition-shadow">{statusLabel(row.status)}</Badge>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {rows?.length === 0 && (
                <div className="text-center py-16">
                  <Calendar className="h-8 w-8 text-text-faint mx-auto mb-3" />
                  <p className="text-sm text-text-muted">No funded traders yet — be the first to top this board.</p>
                </div>
              )}
              {error && (
                <div className="text-center py-16 text-sm text-text-muted">
                  Couldn&apos;t load the leaderboard right now. Please try again later.
                </div>
              )}
            </Card>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  )
}

function RankCell({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="h-5 w-5 text-warn" aria-label="Rank 1" />
  if (rank === 2) return <Medal className="h-5 w-5 text-text-muted" aria-label="Rank 2" />
  if (rank === 3) return <Award className="h-5 w-5 text-warn/70" aria-label="Rank 3" />
  return <span className="text-text-muted tabular font-medium">#{rank}</span>
}
