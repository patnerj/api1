'use client'

import { memo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Pencil, X, Check, ChevronDown, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { invalidateFxsim } from '@/lib/fxsim'
import { fmtPrice, fmtUSD, fmtLots, toNum, timeAgo, pnlClass } from '@/lib/format'
import { symbolDigits } from '@/lib/symbol-meta'
import { useTerminal } from '@/store/terminal'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/cn'
import type { Position } from '@/types/api'
import { playOrderCloseSound } from '@/lib/sound'

interface Props {
  positions: Position[] | null
  /** Called after a successful close/partial/sltp so parent can refresh. */
  onChanged?: () => void
  /** Hide some columns on tiny viewports. */
  compact?: boolean
}

export const PositionsTable = memo(function PositionsTable({ positions, onChanged, compact }: Props) {
  if (positions === null) {
    return <SkeletonRows />
  }
  if (positions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-sm text-text-muted">No open positions</div>
        <div className="text-2xs text-text-faint mt-1">
          Use the order ticket to open a trade.
        </div>
      </div>
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-subtle bg-bg-subtle/40">
            <Th>Symbol</Th>
            <Th>Side</Th>
            <Th align="right" hideOn={compact ? 'sm' : undefined}>Volume</Th>
            <Th align="right" hideOn="md">Open</Th>
            <Th align="right" hideOn="sm">Current</Th>
            <Th align="right" hideOn="md">SL / TP</Th>
            <Th align="right">P&L</Th>
            <Th align="right" hideOn="lg">Opened</Th>
            <Th align="right">{''}</Th>
          </tr>
        </thead>
        <tbody>
          {positions.map((p, i) => (
            <PositionRow key={p.id} pos={p} index={i} onChanged={onChanged} compact={compact} />
          ))}
        </tbody>
      </table>
    </div>
  )
})

function PositionRow({ pos, index, onChanged, compact }: {
  pos: Position; index: number; onChanged?: () => void; compact?: boolean
}) {
  const getMeta = useTerminal((s) => s.getMeta)
  const meta    = getMeta(pos.symbol)
  const digits  = meta?.digits || symbolDigits(pos.symbol)

  const [editSltp, setEditSltp] = useState(false)
  const [slDraft, setSlDraft]   = useState(pos.sl ? String(toNum(pos.sl)) : '')
  const [tpDraft, setTpDraft]   = useState(pos.tp ? String(toNum(pos.tp)) : '')
  const [busy, setBusy]         = useState(false)

  const [showPartial, setShowPartial] = useState(false)
  const [partialLots, setPartialLots] = useState(() => (toNum(pos.lot_size) / 2).toFixed(2))

  const saveSltp = useCallback(async () => {
    setBusy(true)
    const sl = slDraft.trim() ? toNum(slDraft) : null
    const tp = tpDraft.trim() ? toNum(tpDraft) : null
    const res = await api.sltp(pos.id, sl, tp)
    setBusy(false)
    if (res.ok && res.data.success) {
      toast.success('SL/TP updated')
      setEditSltp(false)
      invalidateFxsim('/positions')
      onChanged?.()
    } else {
      toast.error(res.ok ? (res.data.message || 'Update failed') : res.error)
    }
  }, [pos.id, slDraft, tpDraft, onChanged])

  const closePos = useCallback(async () => {
    setBusy(true)
    const res = await api.close(pos.id)
    setBusy(false)
    if (res.ok && res.data.success) {
      playOrderCloseSound()
      const pnl = toNum(res.data.pnl)
      toast.success(`Closed ${pos.symbol} · ${fmtUSD(pnl, { sign: true })}`)
      invalidateFxsim('/positions'); invalidateFxsim('/account'); invalidateFxsim('/history')
      onChanged?.()
    } else {
      toast.error(res.ok ? (res.data.message || 'Close failed') : res.error)
    }
  }, [pos.id, pos.symbol, onChanged])

  const submitPartial = useCallback(async () => {
    const n = toNum(partialLots)
    if (!n || n >= toNum(pos.lot_size)) {
      toast.error('Enter a smaller lot size'); return
    }
    setBusy(true)
    const res = await api.partialClose(pos.id, n)
    setBusy(false)
    if (res.ok && res.data.success) {
      playOrderCloseSound()
      toast.success(`Closed ${n} of ${pos.symbol}`)
      setShowPartial(false)
      invalidateFxsim('/positions'); invalidateFxsim('/account'); invalidateFxsim('/history')
      onChanged?.()
    } else {
      toast.error(res.ok ? (res.data.message || 'Partial close failed') : res.error)
    }
  }, [pos.id, pos.lot_size, pos.symbol, partialLots, onChanged])

  const pnl = toNum(pos.pnl) + toNum(pos.swap) - toNum(pos.commission)

  return (
    <>
      <motion.tr
        initial={{ opacity: 0 }}
        animate={{ opacity: pos.isOptimistic ? 0.6 : 1 }}
        transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.2) }}
        className={cn(
          "border-b border-border-subtle/40 last:border-0 hover:bg-surface-muted/30 transition-colors",
          pos.isOptimistic && "animate-pulse pointer-events-none"
        )}
      >
        <Td>
          <span className="font-medium tabular">{pos.symbol}</span>
        </Td>
        <Td>
          <Badge tone={pos.type === 'buy' ? 'success' : 'danger'}>{pos.type.toUpperCase()}</Badge>
        </Td>
        <Td align="right" hideOn={compact ? 'sm' : undefined}>
          <span className="tabular text-text-muted">{fmtLots(pos.lot_size)}</span>
        </Td>
        <Td align="right" hideOn="md">
          <span className="tabular text-text-muted">{fmtPrice(pos.open_price, digits)}</span>
        </Td>
        <Td align="right" hideOn="sm">
          <span className="tabular">{fmtPrice(pos.current_price, digits)}</span>
        </Td>
        <Td align="right" hideOn="md">
          {editSltp ? (
            <div className="flex items-center gap-1 justify-end">
              <input
                value={slDraft}
                onChange={(e) => setSlDraft(e.target.value.replace(/[^\d.]/g, ''))}
                placeholder="SL"
                inputMode="decimal"
                className="w-16 h-7 px-1.5 text-2xs tabular bg-surface border border-border rounded focus-ring text-right"
              />
              <input
                value={tpDraft}
                onChange={(e) => setTpDraft(e.target.value.replace(/[^\d.]/g, ''))}
                placeholder="TP"
                inputMode="decimal"
                className="w-16 h-7 px-1.5 text-2xs tabular bg-surface border border-border rounded focus-ring text-right"
              />
              <button onClick={saveSltp} disabled={busy} className="p-1 rounded text-success hover:bg-success-muted focus-ring">
                <Check className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setEditSltp(false)} disabled={busy} className="p-1 rounded text-text-muted hover:bg-surface-muted focus-ring">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditSltp(true)}
              className="text-2xs tabular text-text-muted hover:text-text inline-flex items-center gap-1.5 group"
            >
              <span>{pos.sl ? fmtPrice(pos.sl, digits) : '—'}</span>
              <span className="text-text-faint">/</span>
              <span>{pos.tp ? fmtPrice(pos.tp, digits) : '—'}</span>
              <Pencil className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </Td>
        <Td align="right">
          <PnLCell value={pnl} />
        </Td>
        <Td align="right" hideOn="lg">
          <span className="text-2xs text-text-muted whitespace-nowrap">{timeAgo(pos.opened_at_iso || pos.opened_at)}</span>
        </Td>
        <Td align="right">
          <div className="flex justify-end gap-0.5">
            <button
              onClick={() => setShowPartial((v) => !v)}
              disabled={busy}
              className="h-7 px-2 rounded text-2xs font-medium text-text-muted hover:text-text hover:bg-surface-muted focus-ring"
            >
              ½
            </button>
            <button
              onClick={closePos}
              disabled={busy}
              className="h-7 w-7 inline-flex items-center justify-center rounded text-danger hover:bg-danger-muted focus-ring disabled:opacity-50"
              aria-label={`Close position ${pos.symbol}`}
            >
              {busy ? (
                <span className="h-3 w-3 rounded-full border-2 border-danger/40 border-t-danger animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </Td>
      </motion.tr>

      {/* Partial close drawer */}
      <AnimatePresence>
        {showPartial && (
          <motion.tr
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="border-b border-border-subtle/40"
          >
            <td colSpan={9} className="bg-bg-subtle/40 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2 text-2xs">
                <span className="text-text-muted">Close how many lots? (max {fmtLots(pos.lot_size)})</span>
                <input
                  value={partialLots}
                  onChange={(e) => setPartialLots(e.target.value.replace(/[^\d.]/g, ''))}
                  inputMode="decimal"
                  className="w-20 h-7 px-2 rounded border border-border bg-surface text-2xs tabular text-center focus-ring"
                />
                <button
                  onClick={submitPartial}
                  disabled={busy}
                  className="h-7 px-3 rounded bg-danger text-white text-2xs font-medium hover:bg-danger-hover disabled:opacity-50"
                >
                  {busy ? 'Closing…' : 'Close partial'}
                </button>
                <button onClick={() => setShowPartial(false)} className="h-7 px-2 text-2xs text-text-muted hover:text-text">
                  Cancel
                </button>
              </div>
            </td>
          </motion.tr>
        )}
      </AnimatePresence>
    </>
  )
}

// ── Utility cells ─────────────────────────────────────────────────────

function Th({ children, align, hideOn }: { children: React.ReactNode; align?: 'right'; hideOn?: 'sm' | 'md' | 'lg' }) {
  return (
    <th className={cn(
      'px-3 py-2 text-2xs uppercase tracking-wider text-text-faint font-medium',
      align === 'right' ? 'text-right' : 'text-left',
      hideOn === 'sm' && 'hidden sm:table-cell',
      hideOn === 'md' && 'hidden md:table-cell',
      hideOn === 'lg' && 'hidden lg:table-cell',
    )}>
      {children}
    </th>
  )
}
function Td({ children, align, hideOn }: { children: React.ReactNode; align?: 'right'; hideOn?: 'sm' | 'md' | 'lg' }) {
  return (
    <td className={cn(
      'px-3 py-2.5',
      align === 'right' ? 'text-right' : 'text-left',
      hideOn === 'sm' && 'hidden sm:table-cell',
      hideOn === 'md' && 'hidden md:table-cell',
      hideOn === 'lg' && 'hidden lg:table-cell',
    )}>
      {children}
    </td>
  )
}

function PnLCell({ value }: { value: number }) {
  return (
    <span className={cn('tabular font-medium', pnlClass(value))}>
      {fmtUSD(value, { sign: true })}
    </span>
  )
}

function SkeletonRows() {
  return (
    <div className="p-3 space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="skel h-9 w-full" />
      ))}
    </div>
  )
}
