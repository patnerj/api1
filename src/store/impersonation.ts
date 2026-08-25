'use client'

import { create } from 'zustand'

const STORAGE_KEY = 'fxsim:impersonating'

/**
 * Admin impersonation session state.
 *
 * Persisted to sessionStorage so it dies when the tab closes — the safe default
 * for any "viewing as another user" workflow.
 *
 * IMPORTANT: Impersonation is read-only by design. After `start()`, the WP
 * cookie now belongs to the target user but the admin's REST nonce is stale.
 * GET endpoints work (cookie auth); POST endpoints with `verify_nonce` will
 * reject. This is intentional — admins impersonate to observe the trader's
 * experience, not to act for them.
 */
interface ImpersonationRecord {
  admin_username:     string
  admin_display_name: string
  target_user_id:     number
  target_username:    string
  started_at:         number
}

interface ImpersonationState {
  record:  ImpersonationRecord | null
  /** Read from sessionStorage on app boot. Idempotent. */
  hydrate: () => void
  /** Begin a session. The caller is responsible for the /admin/impersonate POST. */
  start:   (rec: ImpersonationRecord) => void
  /** End a session — clear state. The caller decides where to navigate. */
  end:     () => void
}

function load(): ImpersonationRecord | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}
function save(rec: ImpersonationRecord | null) {
  if (typeof window === 'undefined') return
  try {
    if (rec) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(rec))
    else     sessionStorage.removeItem(STORAGE_KEY)
  } catch { /* private mode */ }
}

export const useImpersonation = create<ImpersonationState>((set) => ({
  record: null,
  hydrate: () => set({ record: load() }),
  start:   (rec) => { save(rec); set({ record: rec }) },
  end:     ()    => { save(null); set({ record: null }) },
}))
