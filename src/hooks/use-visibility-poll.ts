'use client'

import { useEffect, useRef } from 'react'

/**
 * Visibility-aware interval poller.
 *
 * • Runs `fn` immediately, then every `intervalMs`.
 * • Pauses when the tab is hidden (via document.visibilitychange).
 * • Resumes (with an immediate refresh) when the tab is visible again.
 * • If `enabled` flips to false, the poller stops cleanly.
 *
 * `fn` should be idempotent and inexpensive — typically a single API GET.
 * The hook ignores returned promises and never re-enters while one is pending.
 *
 * @example
 *   useVisibilityPoll(loadAccount, 8000, true)
 */
export function useVisibilityPoll(
  fn: () => void | Promise<void>,
  intervalMs: number,
  enabled = true,
) {
  // Keep the latest fn in a ref so the effect doesn't re-tick on each render
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    let timer: ReturnType<typeof setInterval> | null = null
    let inflight = false

    const safeTick = async () => {
      if (inflight) return
      if (typeof document !== 'undefined' && document.hidden) return
      inflight = true
      try { await fnRef.current() }
      finally { inflight = false }
    }

    const start = () => {
      if (timer) return
      safeTick()
      timer = setInterval(safeTick, intervalMs)
    }

    const stop = () => {
      if (timer) { clearInterval(timer); timer = null }
    }

    const onVisibility = () => {
      if (document.hidden) stop()
      else                 start()
    }

    document.addEventListener('visibilitychange', onVisibility)
    if (!document.hidden) start()

    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [intervalMs, enabled])
}
