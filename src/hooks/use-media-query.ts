'use client'

import { useEffect, useState } from 'react'

/**
 * Returns true when the given media query matches. SSR-safe: returns `false`
 * on the server and during the first render, then updates after mount to
 * avoid hydration mismatches.
 *
 * @example
 *   const isDesktop = useMediaQuery('(min-width: 1024px)')
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia(query)
    const update = () => setMatches(mq.matches)
    update()
    // matchMedia events: prefer addEventListener over the deprecated addListener
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [query])
  return matches
}
