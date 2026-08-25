'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { api } from '@/lib/api'
import { useAuth } from '@/store/auth'
import { useAccountQuery, useChallengeMyQuery, useChallengeMetricsQuery, useHistoryQuery, useKycQuery } from '@/hooks/useApi'
import { useQueryClient } from '@tanstack/react-query'
import { fmtUSD, fmtPct, toNum, pnlClass, statusLabel, statusTone, timeAgo } from '@/lib/format'
import type {
  Account, ChallengeAccount, Trade, NoChallengeResp,
} from '@/types/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard, StatGrid } from '@/components/ui/stat-card'
import { ChallengeProgressCard } from '@/components/dashboard/challenge-progress-card'
import { EquityChart } from '@/components/dashboard/equity-chart'
import { KycStatusCard } from '@/components/dashboard/kyc-status-card'
import { SectionErrorBoundary } from '@/components/ui/section-error-boundary'
import { PerformanceInsights } from '@/components/dashboard/performance-insights'
import { TraderBadges } from '@/components/dashboard/trader-badges'
import { QuickActions } from '@/components/dashboard/quick-actions'
import {
  TrendingUp, Wallet, Target, ShieldAlert,
  ArrowRight, Trophy, Calendar, MailWarning, LayoutDashboard,
} from 'lucide-react'

function isAccount(x: Account | NoChallengeResp): x is Account {
  return (x as Account).balance !== undefined && !(x as NoChallengeResp).no_challenge
}

export default function DashboardOverview() {
  const user = useAuth((s) => s.user)
  const router = useRouter()

  useEffect(() => {
    if (user?.is_admin) router.replace('/admin')
  }, [user?.is_admin, router])

  const { data: account, isPending: isPendingAccount } = useAccountQuery()
  const { data: rawChallenges, isPending: isPendingChallenges } = useChallengeMyQuery()
  const challenges = Array.isArray(rawChallenges) ? rawChallenges : (rawChallenges ? [] : null)
  
  const active = challenges?.find((c) => c.status === 'active') || challenges?.[0] || null
  
  const { data: metrics, isPending: isPendingMetrics } = useChallengeMetricsQuery(active?.id)
  const { data: recent = null, isPending: isPendingHistory } = useHistoryQuery()
  const { data: kyc, isPending: isPendingKyc } = useKycQuery()
  
  const ready = !isPendingAccount || !!account

  const queryClient = useQueryClient()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const sp = new URLSearchParams(window.location.search)
    if (sp.get('stripe') === 'success') {
      toast.success('Payment received — your challenge is being activated.')
      window.history.replaceState({}, '', '/dashboard')
      queryClient.invalidateQueries()
    }
  }, [queryClient])

  useEffect(() => {
    if (active && active.status === 'passed') {
      const key = `confetti_fired_${active.id}`
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, 'true')
        
        const duration = 3000
        const end = Date.now() + duration

        const frame = () => {
          confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#10B981', '#7c6ef5', '#ffffff'], zIndex: 9999 })
          confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#10B981', '#7c6ef5', '#ffffff'], zIndex: 9999 })
          if (Date.now() < end) requestAnimationFrame(frame)
        }
        frame()
      }
    }
  }, [active?.status, active?.id])

  const acc = account && isAccount(account) ? account : null
  const noChallenge = !isPendingChallenges && challenges !== null && challenges.length === 0
  const isError = !isPendingChallenges && rawChallenges === undefined && !challenges
  const phaseLabel = active
    ? (active.status === 'funded' ? 'Funded account'
      : active.status === 'passed' ? 'Evaluation passed'
      : active.status === 'failed' ? 'Challenge failed'
      : `Phase ${active.phase}`)
    : ''

  if (user?.is_admin) return null

  return (
    <div className="space-y-8">
      {/* Welcome Hero PageHeader */}
      <PageHeader
        variant="hero"
        title={`Welcome back, ${user?.display_name || user?.username}`}
        description="Here is what is happening with your accounts today."
        icon={LayoutDashboard}
        badge={{ label: 'Pro Trader', tone: 'accent' }}
        actions={
          !noChallenge ? (
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/challenges">View all challenges <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
            </Button>
          ) : undefined
        }
      />

      {/* Email-not-verified banner */}
      {user && !user.email_verified && (
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
              <MailWarning className="h-4 w-4 text-accent" />
            </div>
            <div className="flex-1 mt-0.5">
              <div className="font-semibold tracking-tight text-sm text-accent">Action required: Verify your email</div>
              <div className="text-xs text-text-muted mt-0.5">
                We sent a verification link to <span className="text-text font-medium">{user.email}</span>.
                Didn&apos;t get it? <ResendVerifyButton />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KYC verification status */}
      {kyc && !user?.is_admin && (
        <SectionErrorBoundary>
          <KycStatusCard kyc={kyc} />
        </SectionErrorBoundary>
      )}

      {/* API Error state */}
      {isError && (
        <Card className="border-danger/30 bg-danger-muted/10 p-8 text-center">
          <ShieldAlert className="h-10 w-10 text-danger mx-auto mb-3 opacity-80" />
          <h2 className="text-lg font-bold">Unable to load dashboard</h2>
          <p className="text-text-muted mt-1 mb-4">We encountered a network error while fetching your account data.</p>
          <Button onClick={() => queryClient.invalidateQueries()} variant="outline">Retry</Button>
        </Card>
      )}

      {/* No challenge state */}
      {!isError && noChallenge ? (
        <NoChallengeCTA />
      ) : !isError && (
        <>
          {/* Active Challenge Overview */}
          {acc && active && (
            <Card className="relative overflow-hidden border-border/60">
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-2xs uppercase tracking-wider text-text-muted font-semibold">{phaseLabel}</span>
                      <Badge tone={statusTone(active.status)}>{statusLabel(active.status)}</Badge>
                      {/* Challenge expiry — visible countdown, warn when close to the wall */}
                      {metrics && Number.isFinite(metrics.days_remaining) && active.status === 'active' && (
                        <span
                          className={
                            metrics.days_remaining <= 3
                              ? 'text-2xs px-2 py-0.5 rounded-full border font-semibold text-danger border-danger/30 bg-danger-muted'
                              : metrics.days_remaining <= 7
                                ? 'text-2xs px-2 py-0.5 rounded-full border font-semibold text-warn border-warn/30 bg-warn-muted'
                                : 'text-2xs px-2 py-0.5 rounded-full border font-medium text-text-muted border-border-subtle bg-bg-subtle'
                          }
                          title="Days remaining before this challenge phase expires"
                        >
                          {metrics.days_remaining}d left
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-3xl font-extrabold tracking-tight tabular text-text">{fmtUSD(acc.equity)}</div>
                    <div className="text-2xs text-text-muted mt-1">
                      Equity · balance {fmtUSD(acc.balance)} · {active.trading_days} trading {active.trading_days === 1 ? 'day' : 'days'}
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/dashboard/trading">Open terminal <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
                  </Button>
                </div>
                {metrics && (
                  <div className="mt-6 grid sm:grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-center justify-between text-2xs mb-1.5 font-medium">
                        <span className="text-text-muted">Profit target</span>
                        <span className="tabular text-success">{fmtPct(metrics.current_profit_pct, 1, true)} / {fmtPct(metrics.profit_target_pct)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
                        <div className="h-full rounded-full bg-success" style={{ width: `${Math.min(100, Math.max(0, metrics.profit_progress ?? 0))}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-2xs mb-1.5 font-medium">
                        <span className="text-text-muted">Max drawdown used</span>
                        <span className="tabular text-danger">{fmtPct(metrics.current_dd_pct, 1)} / {fmtPct(metrics.max_dd_pct)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
                        <div className="h-full rounded-full bg-danger" style={{ width: `${Math.min(100, Math.max(0, metrics.max_dd_progress ?? 0))}%` }} />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Top Stat Cards using StatCard & StatGrid */}
          <StatGrid columns={4}>
            <StatCard
              label="Balance"
              value={acc ? fmtUSD(acc.balance) : '—'}
              icon={Wallet}
              tone="accent"
              isLoading={isPendingAccount && !acc}
            />
            <StatCard
              label="Equity"
              value={acc ? fmtUSD(acc.equity) : '—'}
              icon={TrendingUp}
              tone={acc && toNum(acc.equity) >= toNum(acc.balance) ? 'success' : 'warn'}
              delta={acc ? toNum(acc.equity) - toNum(acc.balance) : undefined}
              deltaLabel="Open P&L"
              isLoading={isPendingAccount && !acc}
            />
            <StatCard
              label="Profit target"
              value={metrics ? fmtPct(metrics.current_profit_pct, 1, true) : '—'}
              sub={metrics ? `of ${fmtPct(metrics.profit_target_pct)}` : ''}
              icon={Target}
              tone="success"
              progressPct={metrics?.profit_progress}
              isLoading={isPendingMetrics && !metrics}
            />
            <StatCard
              label="Max drawdown"
              value={metrics ? fmtPct(metrics.current_dd_pct, 1) : '—'}
              sub={metrics ? `limit ${fmtPct(metrics.max_dd_pct)}` : ''}
              icon={ShieldAlert}
              tone={metrics && metrics.max_dd_progress > 75 ? 'danger' : 'warn'}
              progressPct={metrics?.max_dd_progress}
              progressTone="danger"
              isLoading={isPendingMetrics && !metrics}
            />
          </StatGrid>

          {/* Main row: challenge progress + equity chart */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              {metrics ? (
                <SectionErrorBoundary>
                  <ChallengeProgressCard metrics={metrics} />
                </SectionErrorBoundary>
              ) : isPendingMetrics && !metrics ? (
                <Card className="p-6 h-full"><Skeleton className="h-72 w-full" /></Card>
              ) : (
                <Card className="p-6 h-full flex items-center justify-center text-center text-sm text-text-muted">
                  No active challenge metrics yet.
                </Card>
              )}
            </div>
            <div className="lg:col-span-2">
              <Card className="h-full">
                <CardHeader className="flex flex-row items-center justify-between p-5 md:p-6">
                  <div>
                    <CardTitle>Equity curve</CardTitle>
                    <p className="text-xs text-text-muted mt-0.5">Account balance over time</p>
                  </div>
                  {acc && (
                    <Badge tone={pnlClass(toNum(acc.equity) - toNum(acc.balance)).includes('success') ? 'success' : 'neutral'}>
                      {toNum(acc.equity) >= toNum(acc.balance) ? '↑' : '↓'}{' '}
                      {fmtPct(((toNum(acc.equity) - toNum(acc.balance)) / Math.max(1, toNum(acc.balance))) * 100, 2)}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  {metrics ? (
                    <SectionErrorBoundary>
                      <EquityChart data={metrics.equity_chart} height={280} />
                    </SectionErrorBoundary>
                  ) : isPendingMetrics && !metrics ? (
                    <div className="h-72 flex items-center justify-center"><Skeleton className="h-48 w-full mx-6" /></div>
                  ) : (
                    <div className="h-72 flex items-center justify-center text-sm text-text-muted">No equity data to display yet.</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Insights row */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <SectionErrorBoundary>
                <PerformanceInsights trades={recent} />
              </SectionErrorBoundary>
            </div>
            <div className="lg:col-span-1">
              <SectionErrorBoundary>
                <TraderBadges trades={recent} />
              </SectionErrorBoundary>
            </div>
          </div>

          {/* Recent trades + Quick Actions */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="h-full">
                <CardHeader className="flex flex-row items-center justify-between border-b border-border-subtle p-5 md:p-6">
                  <CardTitle className="text-sm">Recent trades</CardTitle>
                  <Link href="/dashboard/history" className="text-2xs text-accent hover:underline font-semibold">View all →</Link>
                </CardHeader>
                <CardContent className="p-0">
                  <SectionErrorBoundary>
                    <RecentTradesTable trades={recent} isLoading={isPendingHistory && !recent} />
                  </SectionErrorBoundary>
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-1 flex flex-col gap-6">
              <QuickActions />
              <OtherChallengesCard challenges={challenges} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ResendVerifyButton() {
  const [sending, setSending] = useState(false)
  const [sent, setSent]       = useState(false)
  return (
    <button
      type="button"
      disabled={sending || sent}
      onClick={async () => {
        setSending(true)
        const res = await api.auth.resendVerification()
        setSending(false)
        if (res.ok && (res.data as any)?.success !== false) {
          setSent(true)
          toast.success((res.data as any)?.message || 'Verification email sent! Check your inbox.')
        } else {
          toast.error(res.ok ? ((res.data as any)?.message || 'Failed to send verification email.') : (res.error || 'Failed to send verification email.'))
        }
      }}
      className="text-accent hover:underline disabled:opacity-60 disabled:no-underline ml-0.5 font-medium"
    >
      {sent ? 'Sent! Check your inbox.' : sending ? 'Sending…' : 'Resend verification'}
    </button>
  )
}

function NoChallengeCTA() {
  const perks = [
    { icon: Wallet,     title: 'Capital up to $200K', body: 'Trade with our funds, scale up to $2M based on your performance.' },
    { icon: Target,     title: 'Keep up to 90%',      body: 'Industry-leading profit split on funded accounts.' },
    { icon: TrendingUp, title: 'Flexible funding options',  body: 'Choose from 1-step, 2-step, or instant funding evaluations.' },
  ]
  return (
    <Card className="relative overflow-hidden border-border/60 shadow-sm">
      <CardContent className="relative p-8 sm:p-12 text-center">
        <div className="inline-flex h-16 w-16 rounded-2xl bg-accent/10 text-accent items-center justify-center mb-6">
          <Trophy className="h-8 w-8" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-text">Start your first challenge</h2>
        <p className="text-base text-text-muted mt-3 max-w-md mx-auto leading-relaxed">
          You don&apos;t have an active challenge yet. Pick an account size, prove your edge, and trade our capital.
        </p>
        <div className="mt-8 grid sm:grid-cols-3 gap-5 max-w-3xl mx-auto text-left">
          {perks.map((p) => {
            const Icon = p.icon
            return (
              <div key={p.title} className="rounded-xl border border-border-subtle bg-surface-muted/30 p-5 shadow-sm">
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
                  <Icon className="h-5 w-5 text-accent" />
                </div>
                <div className="font-semibold text-sm text-text">{p.title}</div>
                <div className="text-xs text-text-muted mt-1.5 leading-relaxed">{p.body}</div>
              </div>
            )
          })}
        </div>
        <div className="mt-10">
          <Button asChild size="lg" className="group">
            <Link href="/challenges">
              Browse challenges 
              <ArrowRight className="h-4 w-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function RecentTradesTable({ trades, isLoading = false }: { trades: Trade[] | null; isLoading?: boolean }) {
  if (isLoading || trades === null) {
    return (
      <div className="p-5 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    )
  }
  if (trades.length === 0) {
    return (
      <div className="p-8 text-center">
        <Calendar className="h-8 w-8 mx-auto text-text-faint mb-3" />
        <div className="text-sm text-text-muted">No closed trades yet</div>
        <div className="text-2xs text-text-faint mt-1">Your trade history will appear here once you start trading.</div>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Symbol</TableHead>
          <TableHead>Side</TableHead>
          <TableHead align="right" hideOn="sm">Lots</TableHead>
          <TableHead align="right">P&L</TableHead>
          <TableHead align="right" hideOn="md">Closed</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {trades.slice(0, 6).map((t) => (
          <TableRow key={t.id}>
            <TableCell><span className="font-medium tabular">{t.symbol}</span></TableCell>
            <TableCell>
              <Badge tone={t.type === 'buy' ? 'success' : 'danger'}>{t.type.toUpperCase()}</Badge>
            </TableCell>
            <TableCell align="right" hideOn="sm"><span className="tabular text-text-muted">{toNum(t.lot_size).toFixed(2)}</span></TableCell>
            <TableCell align="right"><span className={`tabular font-semibold ${pnlClass(t.pnl)}`}>{fmtUSD(t.pnl, { sign: true })}</span></TableCell>
            <TableCell align="right" hideOn="md"><span className="text-2xs text-text-muted">{timeAgo(t.closed_at_iso || t.closed_at)}</span></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function OtherChallengesCard({ challenges }: { challenges: ChallengeAccount[] | null }) {
  if (challenges === null) {
    return <Card className="p-6 h-full"><Skeleton className="h-64 w-full" /></Card>
  }
  const list = challenges.slice(0, 5)
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between p-5 md:p-6">
        <CardTitle>Your challenges</CardTitle>
        <span className="text-2xs text-text-muted tabular font-medium">{challenges.length} total</span>
      </CardHeader>
      <CardContent className="p-5 md:p-6 pt-0 space-y-2.5">
        {list.length === 0
          ? <div className="text-center py-6 text-sm text-text-muted">No challenges yet</div>
          : list.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/challenges`}
              className="block rounded-lg border border-border-subtle p-3 hover:border-accent hover:bg-surface-muted/40 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm font-medium">{c.plan_name || `Challenge #${c.id}`}</div>
                  <div className="text-2xs text-text-muted tabular">{fmtUSD(c.account_size ?? 0, { decimals: 0 })}</div>
                </div>
                <Badge tone={statusTone(c.status)}>{statusLabel(c.status)}</Badge>
              </div>
              <div className="flex items-center justify-between text-2xs text-text-muted">
                <span>Phase {c.phase}</span>
                <span className="tabular font-medium">{fmtUSD(toNum(c.current_balance) - toNum(c.starting_balance), { sign: true })}</span>
              </div>
            </Link>
          ))}
        <Button asChild variant="ghost" size="sm" className="w-full mt-2">
          <Link href="/dashboard/challenges">View all <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
        </Button>
      </CardContent>
    </Card>
  )
}
