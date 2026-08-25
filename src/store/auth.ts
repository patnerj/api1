'use client'

import { create } from 'zustand'
import { api } from '@/lib/api'
import { invalidateFxsim, setSession, hydrateSession, clearFxsimCache } from '@/lib/fxsim'
import { sessionEstablish, sessionDestroy } from '@/lib/session'
import { toast } from 'sonner'
import type { AuthUser } from '@/types/api'

/**
 * Establish the signed middleware cookie AFTER a successful backend login.
 * Awaited (never fire-and-forget): the caller navigates immediately after we
 * resolve, and navigation hits the middleware which requires this cookie —
 * a fire-and-forget here caused a login→login bounce race. One retry absorbs
 * transient network blips; 'legacy' (server has no session secret) proceeds
 * with a warning since the middleware tolerates it for /dashboard.
 */
async function establishSessionSafe(token: string, remember = true): Promise<void> {
  let result = await sessionEstablish(token, remember)
  if (result === 'failed') {
    await new Promise((r) => setTimeout(r, 600))
    result = await sessionEstablish(token, remember)
  }
  if (result === 'failed') {
    toast.error('Session cookie could not be established — if pages bounce to login, sign in again.')
  } else if (result === 'legacy') {
    console.warn('[auth] FXSIM_SESSION_SECRET not configured — signed sessions inactive.')
  }
}

interface AuthState {
  user:        AuthUser | null
  loading:     boolean
  ready:       boolean
  error:       string | null
  /** Timestamp of last successful /auth/me — used to avoid re-querying frequently. */
  lastChecked: number

  bootstrap: () => Promise<void>
  signin:    (username: string, password: string, remember?: boolean) => Promise<{ ok: boolean; error?: string; twoFactor?: boolean; uid?: number }>
  verifyTwoFactor: (uid: number, code: string, remember?: boolean) => Promise<{ ok: boolean; error?: string }>
  signup:    (username: string, email: string, password: string, ref?: string) => Promise<{ ok: boolean; error?: string }>
  signout:   () => Promise<void>
  logout:    () => Promise<void>
  refresh:   (force?: boolean) => Promise<void>
}

// Dedupe concurrent bootstrap() calls
let bootstrapPromise: Promise<void> | null = null
// Only re-check /auth/me at most once every 60s on focus etc.
const RECHECK_INTERVAL_MS = 60_000

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  ready: false,
  error: null,
  lastChecked: 0,

  bootstrap: async () => {
    if (get().ready && get().user) return
    if (bootstrapPromise) return bootstrapPromise
    bootstrapPromise = (async () => {
      hydrateSession()
      set({ loading: true })
      const res = await api.auth.me(true)
      if (res.ok) set({ user: res.data, ready: true, loading: false, error: null, lastChecked: Date.now() })
      else        set({ user: null, ready: true, loading: false, lastChecked: Date.now() })
    })().finally(() => { bootstrapPromise = null })
    return bootstrapPromise
  },

  signin: async (username, password, remember) => {
    set({ loading: true, error: null })
    const res = await api.auth.login({ username, password, remember })
    if (res.ok && ((res.data as any).requires_2fa || (res.data as any).two_factor_required)) {
      // Credentials are valid but a one-time code was emailed. Do not establish
      // a session yet — the login page collects the code and calls verifyTwoFactor.
      set({ loading: false, error: null })
      return { ok: false, twoFactor: true, uid: (res.data as any).user_id || (res.data as any).uid }
    }
    if (res.ok && res.data.user) {
      const token = (res.data as any).token || res.data.nonce
      setSession({ nonce: res.data.nonce, bearer: token })
      // Server-verified signed cookie for middleware route protection.
      if ((res.data as any).token) await establishSessionSafe((res.data as any).token, remember)
      // Clear any cached anonymous responses
      clearFxsimCache()
      // Defensive: clear any leftover impersonation record from a prior session.
      // The dynamic import avoids a circular dependency with the impersonation store.
      try {
        if (typeof window !== 'undefined') sessionStorage.removeItem('fxsim:impersonating')
        const { useImpersonation } = await import('@/store/impersonation')
        useImpersonation.getState().end()
      } catch { /* private mode or already unmounted */ }
      set({ user: res.data.user, loading: false, ready: true, lastChecked: Date.now(), error: null })
      return { ok: true }
    }
    set({ loading: false, error: res.ok ? 'Login failed' : res.error })
    return { ok: false, error: res.ok ? 'Login failed' : res.error }
  },

  verifyTwoFactor: async (uid: number, code: string, remember?: boolean) => {
    set({ loading: true, error: null })
    const res = await api.auth.verify2fa(uid, code, remember)
    if (res.ok) {
      const token = (res.data as any)?.token || res.data?.nonce
      setSession({ nonce: res.data.nonce, bearer: token })
      if ((res.data as any)?.token) await establishSessionSafe((res.data as any).token, remember ?? true)
      clearFxsimCache()
      try {
        if (typeof window !== 'undefined') sessionStorage.removeItem('fxsim:impersonating')
        const { useImpersonation } = await import('@/store/impersonation')
        useImpersonation.getState().end()
      } catch { /* private mode or already unmounted */ }
      set({ user: res.data.user, loading: false, ready: true, lastChecked: Date.now(), error: null })
      return { ok: true }
    }
    set({ loading: false, error: res.error })
    return { ok: false, error: res.error }
  },

  signup: async (username, email, password, ref) => {
    set({ loading: true, error: null })
    const res = await api.auth.register({ username, email, password, ref })
    if (res.ok) {
      const token = (res.data as any)?.token || res.data?.nonce
      setSession({ nonce: res.data.nonce, bearer: token })
      if ((res.data as any)?.token) await establishSessionSafe((res.data as any).token, true)
      clearFxsimCache()
      set({ user: res.data.user, loading: false, ready: true, lastChecked: Date.now(), error: null })
      return { ok: true }
    }
    set({ loading: false, error: res.error })
    return { ok: false, error: res.error }
  },

  signout: async () => {
    await api.auth.logout().catch(() => null)
    setSession({ nonce: null, bearer: null })
    void sessionDestroy()
    clearFxsimCache()
    try {
      if (typeof window !== 'undefined') sessionStorage.removeItem('fxsim:impersonating')
      const { useImpersonation } = await import('@/store/impersonation')
      useImpersonation.getState().end()
    } catch { /* private mode or already unmounted */ }
    set({ user: null, ready: true, error: null, lastChecked: Date.now() })
  },

  logout: async () => {
    return get().signout()
  },

  refresh: async (force = false) => {
    if (!force && Date.now() - get().lastChecked < RECHECK_INTERVAL_MS) return
    if (force) invalidateFxsim('/auth/me')          // drop any cached /auth/me so verification + impersonation-exit reflect instantly
    const res = await api.auth.me(force)
    if (res.ok) set({ user: res.data, lastChecked: Date.now() })
    else if (res.status === 401 || res.status === 403) {
      // Session expired — clear without calling /logout (likely will 401 too)
      setSession({ nonce: null, bearer: null })
      void sessionDestroy()
      clearFxsimCache()
      set({ user: null, lastChecked: Date.now() })
    }
  },
}))
