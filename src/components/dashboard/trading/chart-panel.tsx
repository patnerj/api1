'use client'

import { memo, useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Maximize2, Minimize2, ArrowUp, ArrowDown, PencilRuler, GripVertical, Zap } from 'lucide-react'
import { useTerminal } from '@/store/terminal'
import { usePrices } from '@/store/prices'
import { tvSymbol, tvInterval, symbolDigits, parseTvMap, pipSize } from '@/lib/symbol-meta'
import { useBranding } from '@/store/branding'
import { fmtPrice, fmtUSD, toNum, pnlClass } from '@/lib/format'
import type { Position } from '@/types/api'
import { api } from '@/lib/api'
import { invalidateFxsim } from '@/lib/fxsim'
import { toast } from 'sonner'
import { useTheme } from 'next-themes'
import { playOrderSuccessSound, playSltpUpdatedSound } from '@/lib/sound'

interface Props {
  compact?: boolean
  /** Open positions — used to overlay live execution-feed levels on the chart. */
  positions?: Position[] | null
  /** Mobile: callback to open the market watch sheet */
  onOpenWatchlist?: () => void
  /** Trading Plan rules (e.g. stop loss requirement) */
  plan?: any | null
}

// Default interval the chart opens on. Users change timeframe with TradingView's
// own built-in controls (we no longer render a duplicate row), and because the
// widget is only rebuilt on symbol change, drawings persist across tf changes.
const DEFAULT_TF = '1h'

// V10.5 — session widget cache (desktop): keep up to N recent TradingView
// widget instances alive and toggle their visibility instead of destroying
// them on every symbol switch. Drawings live inside each widget's iframe, so
// while an instance survives, its drawings survive — SESSION-based retention
// only (refresh/logout/device change still reset; that requires the Charting
// Library). Uses only documented widget construction — no iframe access.
const WIDGET_CACHE_MAX = 3
const MOBILE_DRAW_KEY  = 'fxsim:chart:mobile-draw'

declare global {
  interface Window { TradingView?: { widget: new (cfg: Record<string, unknown>) => unknown } }
}

let tvScriptPromise: Promise<void> | null = null

function loadTvScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.TradingView) return Promise.resolve()
  if (tvScriptPromise) return tvScriptPromise
  tvScriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src   = 'https://s3.tradingview.com/tv.js'
    s.async = true
    s.onload  = () => resolve()
    s.onerror = () => { tvScriptPromise = null; reject(new Error('TradingView script failed to load')) }
    document.head.appendChild(s)
  })
  return tvScriptPromise
}

export const ChartPanel = memo(function ChartPanel({ compact, positions, onOpenWatchlist, plan }: Props) {
  const active  = useTerminal((s) => s.active)
  const meta    = useTerminal((s) => s.getMeta(active))
  const metaRef = useRef(meta)
  useEffect(() => { metaRef.current = meta }, [meta])
  const tick    = usePrices((s) => s.prices[active])

  // Open positions on the *active* symbol — drawn as execution-feed overlays.
  const symPositions = (positions ?? []).filter((p) => p.symbol === active)

  const containerRef = useRef<HTMLDivElement>(null)
  const widgetRef    = useRef<unknown>(null)
  const wrapRef      = useRef<HTMLDivElement>(null)
  const [ready, setReady]   = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [fullscreen, setFs] = useState(false)

  // Admin chart-symbol overrides (Settings → Trading Feed), via the branding store.
  const rawTvMap = useBranding((s) => s.branding.tv_symbol_map)
  const tvMap    = useMemo(() => parseTvMap(rawTvMap), [rawTvMap])

  // Mobile drawing toolbar — user-controlled, persisted per device.
  const [mobileDraw, setMobileDraw] = useState(false)
  const mobileDrawRef = useRef(false)
  useEffect(() => {
    try {
      const v = localStorage.getItem(MOBILE_DRAW_KEY) === '1'
      mobileDrawRef.current = v
      setMobileDraw(v)
    } catch { /* private mode */ }
  }, [])
  const toggleMobileDraw = useCallback(() => {
    setMobileDraw((v) => {
      const next = !v
      mobileDrawRef.current = next
      try { localStorage.setItem(MOBILE_DRAW_KEY, next ? '1' : '0') } catch { /* ignore */ }
      return next
    })
  }, [])

  // Session widget cache (desktop only): resolved TV symbol → host element.
  const cacheRef = useRef<Map<string, HTMLDivElement>>(new Map())
  const orderRef = useRef<string[]>([])

  // Stable ref for compact — avoids re-creating buildWidget on every render
  const compactRef = useRef(compact)
  useEffect(() => { compactRef.current = compact }, [compact])

  // 1-Click Trade state
  const isSlRequired = Boolean(plan?.stop_loss_required || plan?.require_stop_loss)
  const [oneClickLot, setOneClickLot] = useState('0.10')
  const [oneClickSlPips, setOneClickSlPips] = useState('30')
  const [busy, setBusy] = useState<'buy' | 'sell' | null>(null)
  const [showOneClick, setShowOneClick] = useState(true)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('fxsim:term:oneclick')
      if (saved === '0') setShowOneClick(false)
    } catch {}
  }, [])

  const toggleOneClick = () => {
    setShowOneClick((prev) => {
      const next = !prev
      try { localStorage.setItem('fxsim:term:oneclick', next ? '1' : '0') } catch {}
      return next
    })
  }
  
  const handleOneClick = async (type: 'buy' | 'sell') => {
    const lotSize = toNum(oneClickLot)
    if (lotSize <= 0) {
      toast.error('Invalid lot size')
      return
    }

    const slPipsNum = toNum(oneClickSlPips)
    if (isSlRequired && (!slPipsNum || slPipsNum <= 0)) {
      toast.error('Stop Loss is required by this plan (enter SL distance in pips)')
      return
    }

    const pSize = pipSize(active)
    const bid = toNum(tick?.bid)
    const ask = toNum(tick?.ask)
    const digits = meta?.digits || symbolDigits(active)

    let calculatedSl: number | null = null
    if (isSlRequired || slPipsNum > 0) {
      if (type === 'buy') {
        const currentAsk = ask || bid || 0
        calculatedSl = currentAsk > 0 ? Number((currentAsk - slPipsNum * pSize).toFixed(digits)) : null
      } else {
        const currentBid = bid || ask || 0
        calculatedSl = currentBid > 0 ? Number((currentBid + slPipsNum * pSize).toFixed(digits)) : null
      }
    }

    setBusy(type)

    const optId = -Math.floor(Math.random() * 1000000)
    const optPos: any = {
      id: optId,
      symbol: active,
      type,
      lot_size: lotSize,
      open_price: type === 'buy' ? (ask || bid || 0) : (bid || ask || 0),
      open_time: new Date().toISOString(),
      sl: calculatedSl,
      tp: null,
      status: 'simulated'
    }
    usePrices.getState().injectOptimisticPosition(optPos)

    const res = await api.open({
      symbol: active,
      type,
      lot_size: lotSize,
      sl: calculatedSl,
      tp: null,
    })
    setBusy(null)
    if (res.ok && res.data.success) {
      playOrderSuccessSound()
      toast.success(`${type.toUpperCase()} ${lotSize} ${active} opened${calculatedSl ? ` (SL: ${calculatedSl})` : ''}`)
      invalidateFxsim('/positions')
      invalidateFxsim('/account')
      usePrices.getState().refresh()
    } else {
      usePrices.getState().removeOptimisticPosition(optId)
      toast.error(res.ok ? (res.data.message || 'Order rejected') : res.error)
    }
  }

  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme !== 'light'

  /** Build a TradingView widget into the given host element. */
  const buildWidget = useCallback((host: HTMLElement, resolved: string, sideToolbarHidden: boolean) => {
    const isCompact = compactRef.current
    const id = `tv-chart-${Math.random().toString(36).slice(2, 9)}`
    const inner = document.createElement('div')
    inner.id = id
    inner.style.height = '100%'
    inner.style.width  = '100%'
    host.appendChild(inner)
    return new window.TradingView!.widget({
      container_id:        id,
      autosize:            true,
      symbol:              resolved,
      interval:            tvInterval(DEFAULT_TF),
      timezone:            'Etc/UTC',
      theme:               isDark ? 'dark' : 'light',
      style:               '1',
      locale:              'en',
      toolbar_bg:          isDark ? '#0F172A' : '#ffffff',
      enable_publishing:   false,
      hide_side_toolbar:   sideToolbarHidden,
      hide_top_toolbar:    false,
      hide_legend:         !!isCompact,
      allow_symbol_change: false,
      save_image:          false,
      withdateranges:      true,
      backgroundColor:     isDark ? '#0F172A' : '#ffffff',
      gridColor:           isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
      disabled_features:   ['volume_force_overlay', 'create_volume_indicator_by_default'],
      enabled_features:    ['show_symbol_logos'],
    })
  }, [isDark])

  // Clear cache if theme changes so the widget rebuilds with new colors
  const prevIsDarkRef = useRef(isDark)
  if (prevIsDarkRef.current !== isDark) {
    prevIsDarkRef.current = isDark
    cacheRef.current.clear()
    orderRef.current = []
    if (containerRef.current) containerRef.current.innerHTML = ''
  }

  // Widget lifecycle.
  //  • Mobile (compact): single instance, rebuilt on symbol or toolbar-toggle
  //    change — caching multiple heavyweight iframes isn't worth it on phones.
  //  • Desktop: LRU cache of up to WIDGET_CACHE_MAX instances keyed by the
  //    RESOLVED TradingView symbol. Switching to a cached symbol reuses its
  //    live iframe (drawings intact); only cache-evicted, terminal-exit, or
  //    session-end destroys a widget. Timeframe changes use TradingView's own
  //    toolbar and never touch the widget at all.
  useEffect(() => {
    let cancelled = false
    setError(null)
    const category = (metaRef.current as { category?: string } | null | undefined)?.category
    const resolved = tvSymbol(active, tvMap, category)

    loadTvScript().then(() => {
      if (cancelled || !containerRef.current || !window.TradingView) return

      // ── Mobile: simple single-instance path ──
      if (compactRef.current) {
        setReady(false)
        containerRef.current.innerHTML = ''
        try {
          widgetRef.current = buildWidget(containerRef.current, resolved, !mobileDrawRef.current)
          setReady(true)
        } catch (e) { setError((e as Error).message || 'Chart failed to load') }
        return
      }

      // ── Desktop: session cache ──
      const cache = cacheRef.current
      const order = orderRef.current

      // Hide every cached host, then show (or create) the active one.
      for (const el of cache.values()) el.style.display = 'none'

      let host = cache.get(resolved)
      if (host) {
        host.style.display = 'block'
        // LRU touch
        orderRef.current = [...order.filter((k) => k !== resolved), resolved]
        // Hidden iframes can mis-measure; nudge TradingView's autosize.
        requestAnimationFrame(() => window.dispatchEvent(new Event('resize')))
        setReady(true)
        return
      }

      setReady(false)
      host = document.createElement('div')
      host.style.position = 'absolute'
      host.style.inset = '0'
      containerRef.current.appendChild(host)
      try {
        buildWidget(host, resolved, false)
        cache.set(resolved, host)
        orderRef.current = [...order, resolved]
        // Evict least-recently-used beyond the cap — true destruction.
        while (orderRef.current.length > WIDGET_CACHE_MAX) {
          const evict = orderRef.current.shift()!
          const el = cache.get(evict)
          if (el) { el.remove(); cache.delete(evict) }
        }
        setReady(true)
      } catch (e) { setError((e as Error).message || 'Chart failed to load') }
    }).catch((e: Error) => {
      if (!cancelled) setError(e.message || 'Chart unavailable')
    })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, tvMap, isDark])

  // Destroy everything only when the trader actually leaves the terminal
  // (component unmount) — never on symbol switches.
  useEffect(() => {
    const container = containerRef.current
    const cache = cacheRef.current
    return () => {
      cache.clear()
      orderRef.current = []
      if (container) container.innerHTML = ''
      widgetRef.current = null
    }
  }, [])

  // Fullscreen toggle (desktop convenience)
  const toggleFs = useCallback(async () => {
    const el = wrapRef.current
    if (!el) return
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen?.()
        setFs(true)
      } else {
        await document.exitFullscreen?.()
        setFs(false)
      }
    } catch { /* user-denied or unsupported */ }
  }, [])

  useEffect(() => {
    const onFsChange = () => setFs(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const digits = meta?.digits || symbolDigits(active)
  const bid = toNum(tick?.bid)
  const ask = toNum(tick?.ask)
  const mid = bid && ask ? (bid + ask) / 2 : 0

  return (
    <div ref={wrapRef} className="flex flex-col h-full min-h-0 bg-surface relative">
      {/* Header — symbol info + timeframe selector */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-border-subtle bg-bg-subtle/40">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={compact && onOpenWatchlist ? onOpenWatchlist : undefined}
            className={compact && onOpenWatchlist ? 'min-w-0 text-left hover:opacity-80 transition-opacity' : 'min-w-0 text-left cursor-default'}
          >
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-semibold tabular truncate">{active}</span>
              {meta && (
                <span className="text-2xs text-text-muted truncate hidden sm:inline">
                  · {meta.display_name}
                </span>
              )}
              {compact && onOpenWatchlist && (
                <span className="text-2xs text-accent truncate sm:hidden">· tap to change</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-2xs tabular">
              <span className="text-text-faint uppercase tracking-wider mr-0.5">Exec</span>
              <span className="text-success">{bid ? fmtPrice(bid, digits) : '—'}</span>
              <span className="text-text-faint">/</span>
              <span className="text-danger">{ask ? fmtPrice(ask, digits) : '—'}</span>
            </div>
          </button>
        </div>

        {/* Timeframe + drawing tools are provided by TradingView's own toolbars
            (no duplicate row here). */}

        {/* Mobile drawing toolbar toggle — the user decides (persisted per device) */}
        {compact && (
          <button
            onClick={toggleMobileDraw}
            className={`shrink-0 ml-auto h-7 px-2 inline-flex items-center gap-1 rounded text-2xs focus-ring ${mobileDraw ? 'text-accent bg-accent/10' : 'text-text-muted hover:text-text hover:bg-surface-muted/50'}`}
            aria-pressed={mobileDraw}
            aria-label="Toggle drawing tools"
          >
            <PencilRuler className="h-3.5 w-3.5" /> Draw
          </button>
        )}

        {/* Toggle 1-Click Floating Panel */}
        {!compact && (
          <button
            onClick={toggleOneClick}
            className={`shrink-0 ml-auto h-7 px-2.5 inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold focus-ring transition-all ${
              showOneClick
                ? 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 shadow-sm'
                : 'text-text-muted hover:text-text hover:bg-surface-muted/50 border border-border-subtle'
            }`}
            title="Toggle Floating 1-Click Trading Panel"
            aria-pressed={showOneClick}
          >
            <Zap className={`h-3.5 w-3.5 ${showOneClick ? 'text-emerald-400 fill-emerald-400' : ''}`} />
            <span>1-Click</span>
          </button>
        )}

        {/* Fullscreen */}
        {!compact && (
          <button
            onClick={toggleFs}
            className="shrink-0 h-7 w-7 inline-flex items-center justify-center rounded-lg text-text-muted hover:text-text hover:bg-surface-muted/50 border border-border-subtle focus-ring transition-colors"
            aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {/* Chart host */}
      <div className="relative flex-1 min-h-0" style={{ touchAction: 'pan-y' }}>
        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface z-[1]">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-3 text-xs text-text-muted"
            >
              <div className="h-6 w-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              Loading chart…
            </motion.div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-center px-6">
            <div>
              <div className="text-sm text-text-muted">Chart temporarily unavailable</div>
              <div className="text-2xs text-text-faint mt-1">{error}</div>
            </div>
          </div>
        )}
        <div ref={containerRef} className="absolute inset-0" />

        {/* 1-Click Trade Box (Draggable, default bottom-center) */}
        {!compact && ready && showOneClick && (
          <motion.div 
            drag
            dragConstraints={wrapRef}
            dragElastic={0.05}
            dragMomentum={false}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[25] flex items-center gap-1.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-1.5 shadow-2xl cursor-grab active:cursor-grabbing select-none"
          >
            <div className="flex items-center px-1 text-slate-500 hover:text-slate-300 cursor-grab active:cursor-grabbing" title="Drag to reposition panel">
              <GripVertical className="h-4 w-4" />
            </div>

            <div className="flex flex-col gap-0.5 items-center justify-center">
              <button 
                type="button"
                onClick={() => handleOneClick('sell')}
                disabled={busy !== null || !bid}
                className="w-16 h-8 rounded-lg bg-danger hover:bg-danger-hover text-white text-xs font-semibold tabular flex items-center justify-center disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
              >
                {busy === 'sell' ? <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : (bid ? fmtPrice(bid, digits) : 'SELL')}
              </button>
              <div className="text-[9px] font-bold text-danger tracking-wider uppercase">Sell</div>
            </div>
            
            <div className="flex flex-col justify-center px-1">
              <input 
                type="text"
                value={oneClickLot}
                onChange={(e) => setOneClickLot(e.target.value.replace(/[^\d.]/g, ''))}
                className="w-12 h-7 text-center bg-surface border border-border rounded-md text-xs tabular font-bold text-white focus-ring focus:border-accent"
              />
              <span className="text-[8px] text-text-muted text-center uppercase tracking-tighter mt-0.5">Lots</span>
            </div>

            {isSlRequired && (
              <div className="flex flex-col justify-center px-1 border-l border-border-subtle pl-1.5">
                <input 
                  type="text"
                  value={oneClickSlPips}
                  onChange={(e) => setOneClickSlPips(e.target.value.replace(/[^\d.]/g, ''))}
                  className="w-12 h-7 text-center bg-surface border border-rose-500/50 rounded-md text-xs tabular font-bold text-rose-300 focus-ring focus:border-rose-400"
                  placeholder="30"
                  title="Stop loss distance in pips (Required by plan)"
                />
                <span className="text-[8px] text-rose-400 text-center uppercase tracking-tighter mt-0.5 font-bold">SL (Pips)</span>
              </div>
            )}

            <div className="flex flex-col gap-0.5 items-center justify-center">
              <button 
                type="button"
                onClick={() => handleOneClick('buy')}
                disabled={busy !== null || !ask}
                className="w-16 h-8 rounded-lg bg-success hover:bg-success-hover text-white text-xs font-semibold tabular flex items-center justify-center disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
              >
                {busy === 'buy' ? <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : (ask ? fmtPrice(ask, digits) : 'BUY')}
              </button>
              <div className="text-[9px] font-bold text-success tracking-wider uppercase">Buy</div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Chart data disclosure + session-retention note */}
      <div className="shrink-0 px-3 py-1 border-t border-border-subtle bg-bg-subtle/30 text-[10px] leading-tight text-text-faint flex flex-wrap gap-x-3 gap-y-0.5">
        <span>Chart data is provided by TradingView reference feeds. Trade execution and challenge evaluation use platform pricing.</span>
        {!compact && (
          <span>Recent chart drawings remain available while working between your recent charts during the current session.</span>
        )}
      </div>
    </div>
  )
})
