'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { api } from '@/lib/api'
import type { Banner } from '@/types/api'
import { X } from 'lucide-react'

function useCountdown(targetIso?: string | null) {
  const [left, setLeft] = useState<number | null>(null)
  useEffect(() => {
    if (!targetIso) { setLeft(null); return }
    const tick = () => setLeft(Math.max(0, new Date(targetIso).getTime() - Date.now()))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [targetIso])
  return left
}

function fmtCountdown(ms: number): string {
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (d > 0) return `${d}d ${h}h ${m}m`
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

/** Dismissal key versioned by the banner's updated_at (`ver`): any admin edit or
 *  re-enable changes `ver`, which automatically un-dismisses for everyone. */
function dismissKey(b: Banner): string {
  return `fxsim:banner-dismissed:${b.id}:${b.ver ?? '0'}`
}

export function BannerBar({ placement }: { placement: 'top' | 'dashboard' }) {
  const pathname = usePathname()
  const [banner, setBanner] = useState<Banner | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    let cancel = false
    // Skip banner loading entirely on admin command center routes.
    if ((pathname || '').startsWith('/admin') || (pathname || '').startsWith('/dashboard/admin')) {
      setBanner(null)
      return
    }
    const load = () => {
      api.banners(placement, pathname || '/').then((res) => {
        if (cancel || !res.ok) return
        // Pick the FIRST banner the user can actually see: skip ones they have
        // dismissed (keys are versioned by updated_at, so an admin edit or
        // re-enable resets dismissals) and ones whose countdown already elapsed —
        // a hidden first banner must never blank out the ones behind it.
        const now = Date.now()
        let chosen: Banner | null = null
        let chosenDismissed = false
        for (const b of res.data) {
          const t = b.countdown_to_iso || b.countdown_to
          if (t && new Date(t).getTime() <= now) continue // countdown elapsed → not a candidate
          let isDismissed = false
          try { isDismissed = localStorage.getItem(dismissKey(b)) === '1' } catch { /* private mode */ }
          if (isDismissed) continue
          chosen = b
          break
        }
        // Nothing visible? Keep the first candidate (if any) so state stays coherent.
        if (!chosen && res.data.length > 0) { chosen = res.data[0]; chosenDismissed = true }
        setBanner(chosen)
        setDismissed(chosenDismissed)
      })
    }
    load()
    // Refresh so newly enabled/disabled banners reach an open trader session
    // without a manual reload (the per-call 15s cache expires between ticks).
    const interval = setInterval(load, 30_000)
    const onVis = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', onVis)
    return () => {
      cancel = true
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', onVis)
    }
  }, [placement, pathname])

  const target = banner?.countdown_to_iso || banner?.countdown_to || null
  const left = useCountdown(target)

  if (!banner || dismissed) return null
  // Countdown elapsed → the offer is over, hide it.
  if (target && left !== null && left <= 0) return null

  const dismiss = () => {
    setDismissed(true)
    try { localStorage.setItem(dismissKey(banner), '1') } catch { /* private mode */ }
  }

  const style: React.CSSProperties = {
    backgroundColor: banner.bg_color || undefined,
    color: banner.text_color || undefined,
  }
  // Falls back to the brand accent when no custom colour is set.
  const fallback = !banner.bg_color ? 'bg-accent text-white' : ''

  return (
    <div className={`relative z-30 w-full text-sm ${fallback}`} style={style} role="region" aria-label="Announcement">
      <div className="mx-auto max-w-7xl px-10 py-2.5 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-center">
        <span className="font-medium">{banner.message}</span>
        {target && left !== null && (
          <span className="tabular font-semibold rounded bg-black/15 px-2 py-0.5 whitespace-nowrap">{fmtCountdown(left)}</span>
        )}
        {banner.cta_label && banner.cta_url && (
          <a
            href={banner.cta_url}
            className="inline-flex items-center rounded-md bg-black/20 hover:bg-black/30 px-3 py-1 font-semibold transition-colors focus-ring"
          >
            {banner.cta_label}
          </a>
        )}
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-black/15 focus-ring"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
