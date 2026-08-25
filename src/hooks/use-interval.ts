'use client'

import { useEffect, useRef } from 'react'

interface Options {
  /** Fire immediately on mount before the first interval elapses. */
  immediate?: boolean
  /** Skip ticks while the tab is hidden (default true). */
  pauseWhenHidden?: boolean
}

/**
 * Declarative setInterval (Dan Abramov pattern) with a document-visibility
 * guard. Passing `delay = null` pauses the interval. The callback ref keeps the
 * latest closure without resetting the timer.
 */
export function useInterval(
  callback: () => void,
  delay: number | null,
  { immediate = false, pauseWhenHidden = true }: Options = {},
) {
  const savedCallback = useRef(callback)
  useEffect(() => { savedCallback.current = callback }, [callback])

  useEffect(() => {
    if (delay === null) return
    const tick = () => {
      if (pauseWhenHidden && typeof document !== 'undefined' && document.hidden) return
      savedCallback.current()
    }
    if (immediate) tick()
    const id = setInterval(tick, delay)
    return () => clearInterval(id)
  }, [delay, immediate, pauseWhenHidden])
}
