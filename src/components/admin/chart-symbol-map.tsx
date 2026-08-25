'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { invalidateFxsim } from '@/lib/fxsim'
import { useBranding } from '@/store/branding'
import { tvSymbol, parseTvMap } from '@/lib/symbol-meta'
import type { Symbol as Instrument } from '@/types/api'
import { cn } from '@/lib/cn'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { CandlestickChart, ExternalLink, CheckCircle2, Search } from 'lucide-react'

/**
 * Settings → Trading Feed: per-instrument TradingView symbol overrides.
 * Resolution cascade: this override → built-in mapping → category heuristic.
 * Lets a white-label buyer fix a broken chart (e.g. a renamed provider ticker)
 * without touching source code. Stored as JSON in the existing settings store.
 */
export function ChartSymbolMap() {
  const [instruments, setInstruments] = useState<Instrument[] | null>(null)
  const [map, setMap] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [bulkBusy, setBulkBusy] = useState(false)
  const setBranding = useBranding((s) => s.set)

  useEffect(() => {
    api.admin.symbolsAll().then((r) => { if (r.ok) setInstruments(r.data) })
    api.admin.whitelabelGet().then((r) => {
      if (r.ok) setMap(parseTvMap((r.data as Record<string, string>).tv_symbol_map))
    })
  }, [])

  const sorted = useMemo(() => {
    if (!instruments) return null
    const order: Record<string, number> = { index: 0, metal: 1, crypto: 2, energy: 3, forex: 4 }
    const q = query.trim().toLowerCase()
    return [...instruments]
      .filter((i) => !q || i.symbol.toLowerCase().includes(q) || (i.display_name ?? '').toLowerCase().includes(q))
      .sort((a, b) => (order[a.category] ?? 9) - (order[b.category] ?? 9) || a.symbol.localeCompare(b.symbol))
  }, [instruments, query])

  const toggleActive = async (inst: Instrument) => {
    setBusyId(inst.id)
    const r = await api.admin.symbol(inst.id, { is_active: inst.is_active ? 0 : 1 } as unknown as Partial<Instrument>)
    setBusyId(null)
    if (r.ok) {
      setInstruments((list) => list?.map((x) => x.id === inst.id ? { ...x, is_active: inst.is_active ? 0 : 1 } : x) ?? list)
      invalidateFxsim('/symbols') // BUG-006: trader terminal must see the change without waiting for the 5-min cache
      toast.success(`${inst.symbol} ${inst.is_active ? 'disabled' : 'enabled'} — ${inst.is_active ? 'hidden from' : 'now selectable in'} the trader terminal`)
    } else toast.error(r.error)
  }

  // Bulk enable/disable opens a confirmation modal (no browser-native confirm).
  const [bulkIntent, setBulkIntent] = useState<{ active: 0 | 1; count: number } | null>(null)

  const bulkSet = (active: 0 | 1) => {
    const targets = (sorted ?? []).filter((i) => (i.is_active ? 1 : 0) !== active)
    if (!targets.length) { toast.info(active ? 'All shown symbols are already enabled' : 'All shown symbols are already disabled'); return }
    setBulkIntent({ active, count: targets.length })
  }

  const confirmBulk = async () => {
    if (!bulkIntent) return
    const { active } = bulkIntent
    const targets = (sorted ?? []).filter((i) => (i.is_active ? 1 : 0) !== active)
    setBulkBusy(true)
    let ok = 0
    for (const t of targets) {
      const r = await api.admin.symbol(t.id, { is_active: active } as unknown as Partial<Instrument>)
      if (r.ok) { ok++; setInstruments((list) => list?.map((x) => x.id === t.id ? { ...x, is_active: active } : x) ?? list) }
    }
    setBulkBusy(false)
    setBulkIntent(null)
    invalidateFxsim('/symbols') // BUG-006: reflect bulk activation in the trader terminal immediately
    toast.success(`${active ? 'Enabled' : 'Disabled'} ${ok} symbol${ok === 1 ? '' : 's'}`)
  }

  const save = async () => {
    setSaving(true)
    const clean: Record<string, string> = {}
    for (const [k, v] of Object.entries(map)) if (v.trim()) clean[k.toUpperCase()] = v.trim()
    const json = Object.keys(clean).length ? JSON.stringify(clean) : ''
    const r = await api.admin.whitelabelSave({ tv_symbol_map: json })
    setSaving(false)
    if (r.ok) {
      setBranding({ tv_symbol_map: json }) // live-update open charts
      invalidateFxsim('/branding')
      toast.success('Chart symbol overrides saved')
    } else toast.error(r.error)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><CandlestickChart className="h-4 w-4 text-accent" /> Chart symbols (TradingView)</CardTitle>
        <p className="text-2xs text-text-muted mt-1">
          The terminal chart maps each platform instrument to a TradingView symbol automatically. If a chart shows the wrong
          market or fails to load (providers occasionally rename tickers), set the exact TradingView symbol here — for example{' '}
          <span className="font-mono">CAPITALCOM:US100</span> or <span className="font-mono">OANDA:NAS100USD</span>. Leave blank to use the built-in mapping.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Search + bulk controls */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search symbol or name…"
              className="h-9 w-full rounded-md bg-surface border border-border-subtle pl-8 pr-3 text-sm focus-ring"
              spellCheck={false}
            />
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => bulkSet(1)} loading={bulkBusy} disabled={!sorted?.length}>Enable all</Button>
            <Button variant="outline" size="sm" onClick={() => bulkSet(0)} loading={bulkBusy} disabled={!sorted?.length}
              className="text-danger border-danger/40 hover:bg-danger-muted">Disable all</Button>
          </div>
        </div>

        {!sorted ? (
          <div className="space-y-2 py-2">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : sorted.length === 0 ? (
          <div className="py-10 text-center text-sm text-text-muted">
            {query ? <>No symbols match “{query}”.</> : 'No instruments found.'}
          </div>
        ) : (
          <>
            <div className="max-h-[420px] overflow-y-auto pr-1 divide-y divide-border-subtle/60">
              {sorted.map((inst) => {
                const def = tvSymbol(inst.symbol, null, inst.category)
                const cur = map[inst.symbol.toUpperCase()] ?? ''
                const effective = cur.trim() || def
                return (
                  <div key={inst.symbol} className="py-2 grid grid-cols-1 sm:grid-cols-[7.5rem_1fr_auto_auto] items-center gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium tabular flex items-center gap-1.5">
                        {inst.symbol}
                        {inst.is_active
                          ? <span className="text-[9px] uppercase tracking-wider font-semibold text-success bg-success-muted px-1 py-px rounded">Live</span>
                          : <span className="text-[9px] uppercase tracking-wider font-semibold text-text-faint bg-surface-muted px-1 py-px rounded">Off</span>}
                      </div>
                      <div className="text-2xs text-text-faint truncate">{inst.display_name}</div>
                    </div>
                    <input
                      value={cur}
                      onChange={(e) => setMap((m) => ({ ...m, [inst.symbol.toUpperCase()]: e.target.value }))}
                      placeholder={`default: ${def}`}
                      className="h-8 w-full rounded-md bg-surface border border-border-subtle px-2.5 text-2xs font-mono focus-ring"
                      spellCheck={false}
                    />
                    <button
                      onClick={() => toggleActive(inst)}
                      disabled={busyId === inst.id}
                      className={cn(
                        'h-8 px-2.5 rounded-md text-2xs font-medium shrink-0 border transition-colors disabled:opacity-50',
                        inst.is_active
                          ? 'border-border-subtle text-text-muted hover:text-danger hover:border-danger/50'
                          : 'border-success/50 text-success hover:bg-success-muted',
                      )}
                      title={inst.is_active ? 'Hide from the trader terminal' : 'Make selectable in the trader terminal'}
                    >
                      {inst.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <a
                      href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(effective)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-2xs text-accent hover:underline shrink-0"
                      title="Preview this symbol on TradingView"
                    >
                      Preview <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-end pt-1">
              <Button onClick={save} loading={saving}><CheckCircle2 className="h-4 w-4" /> Save chart symbols</Button>
            </div>
          </>
        )}
      </CardContent>
    
      {/* Bulk enable/disable confirmation — replaces the browser-native confirm() */}
      <Dialog open={!!bulkIntent} onOpenChange={(o) => { if (!o && !bulkBusy) setBulkIntent(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{bulkIntent?.active ? 'Enable Symbols' : 'Disable Symbols'}</DialogTitle>
            <DialogDescription>
              You are about to {bulkIntent?.active ? 'enable' : 'disable'} {bulkIntent?.count}{' '}
              symbol{bulkIntent?.count === 1 ? '' : 's'}{query ? ' matching your search' : ''}.
              {bulkIntent?.active
                ? ' Enabled symbols become selectable in the trader terminal.'
                : ' Disabled symbols are hidden from the trader terminal.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkIntent(null)} disabled={bulkBusy}>Cancel</Button>
            <Button
              onClick={confirmBulk}
              loading={bulkBusy}
              className={bulkIntent?.active ? '' : 'bg-danger hover:bg-danger/90'}
            >
              {bulkIntent?.active ? 'Enable Symbols' : 'Disable Symbols'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
