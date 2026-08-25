'use client'

import { memo, useMemo, useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Star, X } from 'lucide-react'
import { useTerminal } from '@/store/terminal'
import { usePrices } from '@/store/prices'
import { fmtPrice, toNum } from '@/lib/format'
import {
  symbolCategory, CATEGORY_LABEL, CATEGORY_ORDER, symbolDigits, pipSize,
} from '@/lib/symbol-meta'
import { cn } from '@/lib/cn'

interface Props {
  /** Compact mode for narrow rails (omits some columns). */
  compact?: boolean
  /** When given, clicking a symbol also calls this — for closing mobile sheets. */
  onPick?: (sym: string) => void
}

export const MarketWatch = memo(function MarketWatch({ compact, onPick }: Props) {
  const symbols   = useTerminal((s) => s.symbols)
  const active    = useTerminal((s) => s.active)
  const setActive = useTerminal((s) => s.setActive)
  const watchlist = useTerminal((s) => s.watchlist)
  const toggle    = useTerminal((s) => s.toggleWatch)

  const [query, setQuery]     = useState('')
  const [tab,   setTab]       = useState<'all' | 'watch'>('all')

  // Filter + group
  const grouped = useMemo(() => {
    const q  = query.trim().toLowerCase()
    const filtered = symbols.filter((s) => {
      if (tab === 'watch' && !watchlist.includes(s.symbol)) return false
      if (!q) return true
      return s.symbol.toLowerCase().includes(q) || (s.display_name || '').toLowerCase().includes(q)
    })
    const map: Record<string, typeof symbols> = {}
    for (const s of filtered) {
      const cat = symbolCategory(s.symbol)
      ;(map[cat] ||= []).push(s)
    }
    return map
  }, [symbols, query, tab, watchlist])

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Search bar */}
      <div className="p-3 pb-2 space-y-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symbol…"
            className="w-full h-8 pl-8 pr-7 rounded-md bg-surface-muted/60 border border-border text-xs focus:outline-none focus:ring-2 focus:ring-accent/40 placeholder:text-text-faint"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {/* Tabs */}
        <div className="flex gap-1 p-0.5 rounded-md bg-surface-muted/60 text-2xs">
          {(['all', 'watch'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 h-6 rounded transition-colors font-medium',
                tab === t ? 'bg-bg-subtle text-text shadow-card' : 'text-text-muted hover:text-text'
              )}
            >
              {t === 'all' ? 'All' : `Watchlist${watchlist.length ? ` (${watchlist.length})` : ''}`}
            </button>
          ))}
        </div>
      </div>

      {/* Symbol list */}
      <div className="flex-1 overflow-y-auto px-1 pb-2 min-h-0">
        {Object.entries(grouped).length === 0 ? (
          <div className="text-center py-8 text-xs text-text-muted">No symbols found</div>
        ) : (
          CATEGORY_ORDER.filter((c) => grouped[c]?.length).map((cat) => (
            <div key={cat} className="mb-1.5">
              <div className="px-2 py-1 text-2xs uppercase tracking-wider text-text-faint font-medium sticky top-0 bg-bg/95 backdrop-blur-sm z-[1]">
                {CATEGORY_LABEL[cat]}
              </div>
              <div>
                {grouped[cat].map((s) => (
                  <WatchRow
                    key={s.symbol}
                    sym={s.symbol}
                    digits={s.digits || symbolDigits(s.symbol)}
                    isActive={active === s.symbol}
                    isWatched={watchlist.includes(s.symbol)}
                    compact={compact}
                    onPick={() => { setActive(s.symbol); onPick?.(s.symbol) }}
                    onStar={() => toggle(s.symbol)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
})

/** A single watchlist row. Subscribes only to its own symbol's price to avoid
 *  re-rendering on every other symbol's tick. */
const WatchRow = memo(function WatchRow({
  sym, digits, isActive, isWatched, compact, onPick, onStar,
}: {
  sym: string
  digits: number
  isActive: boolean
  isWatched: boolean
  compact?: boolean
  onPick: () => void
  onStar: () => void
}) {
  // Subscribe ONLY to this symbol's price slice (Zustand selector)
  const tick = usePrices((s) => s.prices[sym])
  const bid  = toNum(tick?.bid)
  const ask  = toNum(tick?.ask)
  const spread = ask - bid

  // Flash on price change
  const lastBid = useRef<number>(bid)
  const [flash, setFlash] = useState<'up' | 'down' | null>(null)
  useEffect(() => {
    if (!bid || !lastBid.current) { lastBid.current = bid; return }
    if (bid > lastBid.current) setFlash('up')
    else if (bid < lastBid.current) setFlash('down')
    lastBid.current = bid
    if (flash) {
      const t = setTimeout(() => setFlash(null), 700)
      return () => clearTimeout(t)
    }
  }, [bid]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    // Container is a plain div (no nested interactive elements). A full-row
    // select button sits behind the content; the star is a separate real
    // button. Both are keyboard-focusable.
    <div
      className={cn(
        'w-full grid items-center px-2 py-1.5 rounded-md transition-colors relative',
        compact ? 'grid-cols-[1fr_auto]' : 'grid-cols-[1fr_auto_auto]',
        'gap-2',
        isActive ? 'bg-accent-muted text-text' : 'hover:bg-surface-muted/50 text-text',
      )}
    >
      {/* Full-row select button (behind content). */}
      <button
        type="button"
        onClick={onPick}
        aria-label={`Select ${sym}`}
        aria-pressed={isActive}
        className="absolute inset-0 rounded-md focus-ring z-0"
      />

      {/* Flash overlay */}
      <AnimatePresence>
        {flash && (
          <motion.span
            initial={{ opacity: 0.35 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className={cn('absolute inset-0 rounded-md pointer-events-none z-0',
              flash === 'up' ? 'bg-success/30' : 'bg-danger/30')}
          />
        )}
      </AnimatePresence>

      {/* Star + symbol */}
      <div className="relative z-10 flex items-center gap-1.5 min-w-0 pointer-events-none">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onStar() }}
          className={cn(
            'pointer-events-auto p-0.5 -ml-0.5 transition-colors cursor-pointer focus-ring rounded',
            isWatched ? 'text-warn' : 'text-text-faint hover:text-warn',
          )}
          aria-pressed={isWatched}
          aria-label={isWatched ? `Remove ${sym} from watchlist` : `Add ${sym} to watchlist`}
        >
          <Star className={cn('h-3 w-3', isWatched && 'fill-current')} />
        </button>
        <span className="text-xs font-medium truncate tabular">{sym}</span>
      </div>

      {/* Bid + direction glyph (non-color cue) */}
      <span className={cn(
        'relative z-10 pointer-events-none text-xs tabular whitespace-nowrap inline-flex items-center gap-0.5 justify-end',
        flash === 'up' ? 'text-success' : flash === 'down' ? 'text-danger' : 'text-text',
      )}>
        {flash && <span aria-hidden className="text-2xs">{flash === 'up' ? '▲' : '▼'}</span>}
        {bid ? fmtPrice(bid, digits) : <span className="text-text-faint">—</span>}
      </span>

      {/* Spread (only in non-compact) */}
      {!compact && (
        <span className="relative z-10 pointer-events-none text-2xs tabular text-text-muted whitespace-nowrap min-w-[42px] text-right">
          {bid && ask ? `${Math.round(spread / pipSize(sym) * 10) / 10}p` : ''}
        </span>
      )}
    </div>
  )
})
