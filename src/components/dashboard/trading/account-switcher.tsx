'use client'

/**
 * Account switcher — shared by the trading terminal and the dashboard.
 * Entries are built by the caller (active challenges + joined tournaments).
 * Switching swaps the entire trading context in the prices store: account,
 * positions, pending orders and NEW ORDERS all flow to the selected account.
 */
import { useState } from 'react'
import { usePrices, type TradingContext } from '@/store/prices'
import { cn } from '@/lib/cn'
import { fmtUSD, toNum } from '@/lib/format'

export interface SwitchEntry {
  key: string
  label: string
  sub?: string
  ctx: TradingContext
}

export function AccountSwitcher({ entries }: { entries: SwitchEntry[] }) {
  const ctx = usePrices((s) => s.tradingContext)
  const switching = usePrices((s) => s.contextSwitching)
  const [pendingKey, setPendingKey] = useState<string | null>(null)

  const activeKey = ctx
    ? ctx.kind === 'tournament'
      ? `t-${ctx.tournamentId}`
      : ctx.accountId
        ? `c-${ctx.accountId}`
        : 'challenge'
    : 'challenge'

  const switchTo = async (entry: SwitchEntry) => {
    if (pendingKey !== null || entry.key === activeKey) return
    setPendingKey(entry.key)
    await usePrices.getState().setTradingContext(entry.ctx)
    setPendingKey(null)
  }

  if (entries.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2 px-1">
      <span className="text-3xs text-text-muted font-mono uppercase tracking-wider shrink-0">Trading</span>
      {entries.map((e) => {
        const active = e.key === activeKey
        const busy = pendingKey === e.key
        return (
          <button
            key={e.key}
            disabled={pendingKey !== null || switching}
            onClick={() => switchTo(e)}
            className={cn(
              'px-3 h-7 rounded-md text-xs font-semibold border transition-all focus-ring disabled:opacity-50',
              active
                ? 'bg-accent/15 border-accent/50 text-accent'
                : 'bg-surface border-border text-text-muted hover:text-text hover:border-border-strong',
            )}
            title={e.sub}
          >
            {busy ? 'switching…' : e.label}
          </button>
        )
      })}
      {switching && <span className="text-3xs text-text-muted animate-pulse">loading account…</span>}
    </div>
  )
}

/** Build switcher entries from active challenges + joined tournaments. */
export function buildSwitchEntries(
  challenges: Array<{ fxsim_account_id: number; status?: string; plan_name?: string; current_balance?: number | string }>,
  tournaments: Array<{ tournament_id: number; title: string; starting_balance: number | string }>,
): SwitchEntry[] {
  const entries: SwitchEntry[] = []
  for (const ch of challenges) {
    const st = (ch.status ?? '').toLowerCase()
    // ALL challenges included — failed/passed appear as view-only entries so
    // the trader can review final stats on the dashboard + analytics.
    const sub = st === 'funded' ? 'Funded'
      : st === 'failed' ? 'Failed (view only)'
      : st === 'passed' ? 'Passed (view only)'
      : fmtUSD(toNum(ch.current_balance), { decimals: 0 })
    entries.push({
      key: `c-${ch.fxsim_account_id}`,
      label: (ch.plan_name ? ch.plan_name : `Challenge #${ch.fxsim_account_id}`) + (st === 'failed' ? ' (Failed)' : ''),
      sub,
      ctx: { kind: 'challenge', accountId: ch.fxsim_account_id, title: ch.plan_name },
    })
  }
  for (const t of tournaments) {
    entries.push({
      key: `t-${t.tournament_id}`,
      label: `🏆 ${t.title}`,
      sub: `Tournament · start ${fmtUSD(toNum(t.starting_balance), { decimals: 0 })}`,
      ctx: { kind: 'tournament', tournamentId: t.tournament_id, title: t.title },
    })
  }
  return entries
}
