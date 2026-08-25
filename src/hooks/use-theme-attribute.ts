'use client'

import { useState, useEffect } from 'react'

/**
 * Tracks the app's active theme, which this app expresses as a `data-theme`
 * attribute on <html> (e.g. "midnight-obsidian", "clean-light") — NOT via
 * next-themes' class. Returns the current value and updates on change so
 * consumers (charts) can react to theme switches instantly.
 */
export function useThemeAttribute(): string {
  const [theme, setTheme] = useState<string>(() =>
    typeof document !== 'undefined'
      ? document.documentElement.getAttribute('data-theme') || ''
      : '',
  )

  useEffect(() => {
    const el = document.documentElement
    const update = () => setTheme(el.getAttribute('data-theme') || '')
    update()
    const obs = new MutationObserver(update)
    obs.observe(el, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

  return theme
}
