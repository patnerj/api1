'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/lib/api'
import { toNum, fmtPrice } from '@/lib/format'
import { TrendingUp, TrendingDown } from 'lucide-react'

const FEATURED = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD', 'US30', 'NAS100', 'EURJPY']

interface Row {
  symbol: string
  bid:    number
  ask:    number
  dir:    'up' | 'down' | 'flat'
  flash:  number
}

export function LivePriceTicker() {
  const [rows, setRows]       = useState<Record<string, Row>>({})
  const [loaded, setLoaded]   = useState(false)
  const [errored, setErrored] = useState(false)

  useEffect(() => {
    let mounted = true

    const refresh = async () => {
      const res = await api.prices()
      if (!mounted) return
      if (!res.ok) {
        // Surface error state only if we never managed an initial fetch.
        if (!loaded) setErrored(true)
        return
      }
      setErrored(false)
      // ★ Use the functional updater so we compare against the LATEST prev rows,
      //   not the stale closure value from when the effect ran.
      setRows((prev) => {
        const next: Record<string, Row> = {}
        for (const sym of FEATURED) {
          const tick = res.data[sym]
          if (!tick) continue
          const last = prev[sym]
          const bid  = toNum(tick.bid)
          const ask  = toNum(tick.ask)
          const dir: Row['dir'] =
            !last || bid === last.bid ? 'flat'
              : bid > last.bid ? 'up' : 'down'
          next[sym] = {
            symbol: sym, bid, ask, dir,
            flash: dir === 'flat' ? last?.flash ?? 0 : Date.now(),
          }
        }
        return next
      })
      setLoaded(true)
    }

    refresh()
    const id = setInterval(refresh, 4000)
    return () => { mounted = false; clearInterval(id) }
  }, []) // ← intentionally empty; functional updater avoids stale closure

  const symbols = FEATURED.filter((s) => rows[s])

  return (
    <div className="relative mx-auto max-w-6xl">
      <div className="absolute -top-px inset-x-12 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent shadow-glow" />
      <div className="rounded-xl border border-border-subtle bg-surface/60 backdrop-blur-xl overflow-hidden shadow-2xl">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border-subtle bg-bg-subtle/80">
          <span className={`h-2 w-2 rounded-full ${
            errored ? 'bg-warn' : loaded ? 'bg-success animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-text-faint'
          }`} />
          <span className="text-xs font-semibold uppercase tracking-widest text-text-muted">
            {errored ? 'Market data unavailable' : 'Live market data'}
          </span>
          <div className="ml-auto text-xs text-text-faint hidden sm:block font-medium">
            {errored ? 'Retrying…' : `Updates every 4s · ${symbols.length} of ${FEATURED.length} feeds`}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 divide-x divide-y sm:divide-y-0 lg:divide-y-0 divide-border-subtle/50">
          {!loaded && !errored
            ? FEATURED.slice(0, 8).map((s) => (
                <div key={s} className="p-5">
                  <div className="text-xs text-text-muted font-medium">{s}</div>
                  <div className="skel h-5 w-16 mt-2 rounded-md" />
                </div>
              ))
            : symbols.length === 0
              ? FEATURED.slice(0, 8).map((s) => (
                  <div key={s} className="p-5">
                    <div className="text-xs text-text-muted font-medium">{s}</div>
                    <div className="text-sm text-text-faint mt-2 tabular">—</div>
                  </div>
                ))
              : symbols.map((sym) => <TickerCell key={sym} row={rows[sym]} />)}
        </div>
      </div>
    </div>
  )
}

function TickerCell({ row }: { row: Row }) {
  return (
    <div className="p-5 relative group hover:bg-surface-muted/80 transition-colors cursor-default">
      <AnimatePresence>
        {row.dir !== 'flat' && (
          <motion.div
            key={row.flash}
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className={`absolute inset-0 ${row.dir === 'up' ? 'bg-success/10' : 'bg-danger/10'} pointer-events-none`}
          />
        )}
      </AnimatePresence>
      <div className="relative">
        <div className="text-xs font-medium text-text-muted">{row.symbol}</div>
        <div className="mt-1 flex items-center gap-2">
          <span className={`tabular text-sm font-bold tracking-tight transition-colors ${
            row.dir === 'up' ? 'text-success drop-shadow-[0_0_4px_rgba(16,185,129,0.3)]' : row.dir === 'down' ? 'text-danger drop-shadow-[0_0_4px_rgba(239,68,68,0.3)]' : 'text-text'
          }`}>
            {fmtPrice(row.bid, digitsFor(row.symbol))}
          </span>
          {row.dir === 'up'   && <TrendingUp   className="h-3.5 w-3.5 text-success" />}
          {row.dir === 'down' && <TrendingDown className="h-3.5 w-3.5 text-danger" />}
        </div>
      </div>
    </div>
  )
}

function digitsFor(symbol: string) {
  if (symbol.includes('JPY')) return 3
  if (symbol === 'XAUUSD' || symbol === 'XAGUSD') return 2
  if (symbol === 'BTCUSD' || symbol === 'ETHUSD') return 2
  if (symbol.startsWith('US') || symbol.startsWith('NAS') || symbol.startsWith('GER') || symbol.startsWith('UK')) return 1
  return 5
}
