/**
 * Central, SSR-safe localStorage wrapper + key registry.
 *
 * Every persisted key used by the app lives in STORAGE_KEYS so there is a
 * single source of truth (no more scattered string literals), and every
 * access is wrapped in try/catch so private-mode / disabled-storage never
 * throws.
 */

export const STORAGE_KEYS = {
  termActive: 'fxsim:term:active',
  termWatch:  'fxsim:term:watchlist',
  termPos:    'fxsim:term:pos',
  termMw:     'fxsim:term:mw',
  termLayout: 'fxsim:term:layout',
  mobileDraw: 'fxsim:chart:mobile-draw',
  nonce:      'fxsim:nonce',
  sidebar:    'fxsim:sidebar-collapsed',
  referral:   'fxsim:ref',
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]

/** Read a string value; returns null when missing, on the server, or on error. */
export function storageGet(key: StorageKey | string): string | null {
  if (typeof window === 'undefined') return null
  try { return window.localStorage.getItem(key) } catch { return null }
}

/** Write a string value; silently no-ops on the server or on error. */
export function storageSet(key: StorageKey | string, value: string): void {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(key, value) } catch { /* private mode */ }
}

/** Remove a key; silently no-ops on the server or on error. */
export function storageRemove(key: StorageKey | string): void {
  if (typeof window === 'undefined') return
  try { window.localStorage.removeItem(key) } catch { /* private mode */ }
}
