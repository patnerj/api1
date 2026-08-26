/**
 * fxsim API client — wraps the WordPress REST namespace `fxsim/v1`.
 *
 * Network hygiene (v1.2 — added for the trader dashboard):
 *   • GET request dedup (concurrent identical calls share a single promise)
 *   • Short-TTL in-memory cache for GETs (default 0; opt in per-call via `cache: <ms>`)
 *   • 429 / 5xx exponential backoff with jitter (transparently retries)
 *   • Optional `force: true` to bypass cache + dedup (for after-mutation refresh)
 *
 * Auth model (matches the WP bridge):
 *   • Browser session: WP cookie + X-WP-Nonce header
 *   • Cross-origin: session cookie set by /auth/login on the WP origin
 *   • Server-to-server: Bearer API key generated via /api-keys
 *
 * All errors are normalised to `ApiResult<T>` so callers never throw.
 */

import type { ApiResult, ApiErr } from '@/types/api'

// ── Configuration ──────────────────────────────────────────────────────────
/**
 * Resolves the primary API base URL with full fallback support:
 * 1. process.env.NEXT_PUBLIC_API_URL (Primary standard)
 * 2. process.env.NEXT_PUBLIC_FXSIM_API (Secondary / legacy)
 * 3. '/api/wp' (Default relative fallback)
 */
export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    // Server-side (Node.js runtime / Next.js Server Components) requires absolute URL
    const serverUrl =
      process.env.FXSIM_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_FXSIM_API
    if (serverUrl && (serverUrl.startsWith('http://') || serverUrl.startsWith('https://'))) {
      return serverUrl.trim().replace(/\/$/, '')
    }
    return 'https://api.launchapropfirm.com/wp-json/fxsim/v1'
  }

  const envUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_FXSIM_API ||
    '/api/wp'
  return envUrl.trim().replace(/\/$/, '')
}

export const FXSIM_BASE = getApiBaseUrl()

/**
 * Resolve a backend-relative path (e.g. '/admin/payments/36/proof') against
 * whichever base is actually active — the same-origin /api/wp proxy in dev
 * (so the browser's session cookie, scoped to THIS origin via the Next.js
 * rewrite, is sent) or the real cross-origin backend URL in production.
 * Endpoints that return a raw rest_url()-built absolute backend URL bypass
 * the dev proxy entirely and 401 in local dev, because the auth cookie set
 * during login was scoped to the proxy's origin, not propfirm.local.
 */
export function apiUrl(path: string): string {
  return FXSIM_BASE + (path.startsWith('/') ? path : '/' + path)
}

// ── Session ────────────────────────────────────────────────────────────────
type Session = { nonce: string | null; bearer: string | null }

const isServer = typeof window === 'undefined'

function getSessionState(): Session {
  if (isServer) return { nonce: null, bearer: null }
  if (!(globalThis as any).__fxsim_session) (globalThis as any).__fxsim_session = { nonce: null, bearer: null }
  return (globalThis as any).__fxsim_session
}

export function setSession(next: Partial<Session>) {
  const session = getSessionState()
  Object.assign(session, next)
  if (typeof window !== 'undefined') {
    try {
      if (next.nonce !== undefined) {
        if (next.nonce) {
          localStorage.setItem('fxsim:nonce', next.nonce)
        } else {
          localStorage.removeItem('fxsim:nonce')
        }
      }
      if (next.bearer !== undefined) {
        if (next.bearer) {
          localStorage.setItem('fxsim:bearer', next.bearer)
        } else {
          localStorage.removeItem('fxsim:bearer')
        }
      }
    } catch { /* private mode */ }
  }
}

export function hydrateSession() {
  if (isServer) return
  try {
    const session = getSessionState()
    session.nonce  = localStorage.getItem('fxsim:nonce')
    session.bearer = localStorage.getItem('fxsim:bearer')
    // NOTE: the middleware-gating cookie is no longer written from JS.
    // It is an HttpOnly signed cookie set by /api/auth/session after the
    // backend verifies the session — a client-settable flag was forgeable.
  } catch { /* private mode */ }
}

export function getSession(): Readonly<Session> { return getSessionState() }

// ── Request options ────────────────────────────────────────────────────────
export interface RequestOptions {
  method?:  'GET' | 'POST' | 'PUT' | 'DELETE'
  body?:    unknown
  query?:   Record<string, string | number | boolean | undefined | null>
  headers?: Record<string, string>
  signal?:  AbortSignal
  form?:    FormData
  public?:  boolean
  /** Cache TTL in ms (GET only). Default 0 = no cache. */
  cache?:   number
  /** Bypass dedup + cache. Use after mutations. */
  force?:   boolean
  /** Max retries on 429/5xx. Default: 2 for GETs, 0 for mutations (never retry money-moving POSTs). */
  retries?: number
  /** Per-request timeout in ms. Default 10_000; uploads need more (e.g. KYC 60_000). */
  timeout?: number
}

function buildQuery(query?: RequestOptions['query']): string {
  if (!query) return ''
  const usp = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') usp.set(k, String(v))
  }
  const s = usp.toString()
  return s ? `?${s}` : ''
}

// ── Dedup + cache for idempotent GETs ──────────────────────────────────────
interface CacheEntry<T = unknown> { at: number; ttl: number; value: ApiResult<T> }

function getCache(): Map<string, CacheEntry> {
  if (isServer) return new Map()
  if (!(globalThis as any).__fxsim_cache) (globalThis as any).__fxsim_cache = new Map()
  return (globalThis as any).__fxsim_cache
}

function getInflight(): Map<string, Promise<ApiResult<unknown>>> {
  if (isServer) return new Map()
  if (!(globalThis as any).__fxsim_inflight) (globalThis as any).__fxsim_inflight = new Map()
  return (globalThis as any).__fxsim_inflight
}

function cacheKey(method: string, url: string) { return `${method}|${url}` }

/** Wipe everything (call on logout). */
export function clearFxsimCache() { getCache().clear(); getInflight().clear() }

/** Invalidate by URL prefix (e.g. clear all /account* entries after a mutation). */
export function invalidateFxsim(prefix: string) {
  const fullPrefix = `GET|${FXSIM_BASE}${prefix}`
  const cache = getCache()
  const inflight = getInflight()
  for (const k of [...cache.keys()])    if (k.startsWith(fullPrefix)) cache.delete(k)
  for (const k of [...inflight.keys()]) if (k.startsWith(fullPrefix)) inflight.delete(k)
}

// ── Sleep with jitter for backoff ──────────────────────────────────────────
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

// ── Core fetch ─────────────────────────────────────────────────────────────
export async function fxsim<T = unknown>(
  path: string,
  opts: RequestOptions = {},
): Promise<ApiResult<T>> {
  if (!FXSIM_BASE) {
    return { ok: false, status: 0, error: 'FXSIM API base URL not configured.' }
  }

  const method = opts.method ?? (opts.body || opts.form ? 'POST' : 'GET')
  const url    = FXSIM_BASE + path + buildQuery(opts.query)
  const key    = cacheKey(method, url)

  // Retries are ONLY safe for idempotent GETs. Mutations (payments, payouts,
  // order placement) must never auto-retry: a network timeout after the server
  // processed the request would silently duplicate money-moving operations.
  const maxRetries = opts.retries ?? (method === 'GET' ? 2 : 0)

  // ─── GET-only: cache + dedup ───────────────────────────────────────────
  const cache = getCache()
  const inflight = getInflight()
  
  if (method === 'GET' && !opts.force) {
    const ttl = opts.cache ?? 0
    if (ttl > 0) {
      const hit = cache.get(key)
      if (hit && Date.now() - hit.at < hit.ttl) {
        return hit.value as ApiResult<T>
      }
    }
    const pending = inflight.get(key)
    if (pending) return pending as Promise<ApiResult<T>>
  }

  // ─── Execute with retries ──────────────────────────────────────────────
  const doRequest = async (): Promise<ApiResult<T>> => {
    let attempt = 0
    while (true) {
      const result = await rawFetch<T>(url, method, opts)
      // 429 is NOT retried: the server is explicitly saying "slow down" and an
      // immediate retry (counted by the rate limiter as a fresh request)
      // amplifies into a self-sustaining storm that pins the window at the
      // limit. Only transient server/network failures are retried.
      // status 0 (network error/reset) is NOT retried: when the server is
      // overloaded, connection resets + retries amplify into a storm that
      // keeps the rate-limit window pinned. Only true 5xx are retried.
      const shouldRetry =
        !result.ok &&
        attempt < maxRetries &&
        result.status >= 500 && result.status < 600
      if (!shouldRetry) return result

      // Exponential backoff with jitter: 400ms, 900ms, 1900ms (capped at 4s)
      const base = Math.min(400 * Math.pow(2, attempt), 4000)
      const jittered = base + Math.floor(Math.random() * 250)
      await sleep(jittered)
      attempt++
    }
  }

  if (method === 'GET' && !opts.force) {
    const promise = doRequest().then((value) => {
      if (value.ok && (opts.cache ?? 0) > 0) {
        cache.set(key, { at: Date.now(), ttl: opts.cache!, value })
      }
      inflight.delete(key)
      return value
    }).catch((e) => {
      inflight.delete(key)
      throw e
    })
    inflight.set(key, promise as Promise<ApiResult<unknown>>)
    return promise
  }

  // Mutations bypass cache/dedup; also invalidate related GETs on success
  const result = await doRequest()
  if (result.ok && method !== 'GET') {
    // Best-effort invalidation: clear common related GET caches
    // (Callers can also explicitly invalidate prefixes after mutations.)
    invalidateRelated(path)
  }
  return result
}

/** When a mutation succeeds, clear caches that are likely now stale. */
function invalidateRelated(path: string) {
  if (path.startsWith('/auth/'))            invalidateFxsim('/auth/me')
  if (path.startsWith('/open') || path.startsWith('/close') || path.startsWith('/sltp') || path.startsWith('/partial-close')) {
    invalidateFxsim('/positions')
    invalidateFxsim('/account')
    invalidateFxsim('/history')
    invalidateFxsim('/transactions')
    invalidateFxsim('/stats')
    invalidateFxsim('/challenge/')   // refresh challenge metrics + equity curve after a trade
  }
  if (path.startsWith('/challenge/start')) {
    invalidateFxsim('/challenge/my')
    invalidateFxsim('/account')
  }
  if (path.startsWith('/payment/'))      invalidateFxsim('/payment/my-orders')
  if (path.startsWith('/notifications')) invalidateFxsim('/notifications')
  if (path.startsWith('/pending-order')) invalidateFxsim('/pending-order/my')
  if (path.startsWith('/payout-method')) invalidateFxsim('/payout-method')

  // ── Admin mutations ─────────────────────────────────────────────────
  // After admin actions, clear the GET caches the admin pages depend on so
  // refreshes reflect the change immediately.
  if (path.startsWith('/admin/adjust-balance') || path.startsWith('/admin/set-status')) {
    invalidateFxsim('/admin/users')
    invalidateFxsim('/admin/stats')
  }
  if (path.startsWith('/admin/payments/') && (path.endsWith('/approve') || path.endsWith('/reject'))) {
    invalidateFxsim('/admin/payments')
    invalidateFxsim('/admin/stats')
  }
  if (path.startsWith('/admin/challenge/') && path.endsWith('/approve-payout')) {
    invalidateFxsim('/admin/challenges')
  }
  if (path.startsWith('/admin/plans/save')) {
    invalidateFxsim('/admin/plans')
    invalidateFxsim('/challenge/plans')   // public plan listing is now stale too
  }
  if (path.startsWith('/admin/banners')) {
    invalidateFxsim('/admin/banners')     // admin list (cached) must reflect toggle/save/delete
    invalidateFxsim('/banners')           // public banner feed (all placement/page variants)
  }
  if (path.startsWith('/admin/whitelabel/save')) {
    invalidateFxsim('/admin/whitelabel')
  }
  if (path.startsWith('/admin/pending-orders/')) {
    invalidateFxsim('/admin/pending-orders')
  }
  if (path.startsWith('/admin/kyc/')) {
    invalidateFxsim('/admin/kyc')
  }
  if (path.startsWith('/admin/payouts/')) {
    invalidateFxsim('/admin/payouts')
  }
}

async function rawFetch<T>(
  url: string, method: string, opts: RequestOptions,
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {
    ...(opts.headers || {}),
  }
  if (!opts.form && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }
  const currentSession = getSessionState()
  if (currentSession.bearer) {
    if (!headers['Authorization']) headers['Authorization'] = `Bearer ${currentSession.bearer}`
    if (!headers['X-FXSIM-Token'])  headers['X-FXSIM-Token'] = currentSession.bearer
  }
  if (currentSession.nonce && !headers['X-WP-Nonce']) {
    headers['X-WP-Nonce'] = currentSession.nonce
  }

  const init: RequestInit = {
    method,
    credentials: 'include',
    mode: 'cors',
    headers,
    signal: opts.signal,
    cache:  'no-store',
  }
  if (opts.form)      init.body = opts.form
  else if (opts.body) init.body = JSON.stringify(opts.body)

  let res: Response
  try {
    const controller = new AbortController()
    const timeoutMs = opts.timeout ?? 10_000
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    // Compose the caller's signal WITH the timeout — previously a caller-passed
    // signal silently disabled the timeout entirely (opts.signal || controller).
    const fetchSignal = opts.signal
      ? (AbortSignal.any ? AbortSignal.any([opts.signal, controller.signal]) : opts.signal)
      : controller.signal
    init.signal = fetchSignal

    res = await fetch(url, init)
    clearTimeout(timeoutId)
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      return { ok: false, status: 0, error: 'Request timed out. Please check your connection.' }
    }    return { ok: false, status: 0, error: (e as Error).message || 'Network error' }
  }

  let parsed: unknown = null
  const ct = res.headers.get('content-type') || ''
  try {
    if (ct.includes('application/json')) parsed = await res.json()
    else                                 parsed = await res.text()
  } catch { /* empty body */ }

  if (!res.ok) {
    let message = `Request failed (${res.status})`

    if (parsed && typeof parsed === 'object' && parsed !== null) {
      const err = parsed as Record<string, unknown>
      message = (err.message as string) || (err.error as string) || message
    } else if (typeof parsed === 'string' && parsed.trim().length > 0) {
      if (parsed.includes('<html') || parsed.includes('<!DOCTYPE')) {
        message = res.status === 404
          ? 'API endpoint not found (404)'
          : `Server error (${res.status}). Please try again later.`
      } else {
        message = parsed.slice(0, 150)
      }
    }

    if (/cookie/i.test(message) && /check failed/i.test(message)) {
      message = 'Your session has expired. Please sign in again.'
    }
    const out: ApiErr = { ok: false, status: res.status, error: message, raw: parsed }
    return out
  }

  return { ok: true, status: res.status, data: parsed as T }
}

// ── WebSocket helper ─────────────────────────────────────────────────────────
export function getWsUrl(): string {
  if (process.env.NEXT_PUBLIC_FXSIM_WS_URL) {
    return process.env.NEXT_PUBLIC_FXSIM_WS_URL
  }
  if (typeof window !== 'undefined') {
    const isHttps = window.location.protocol === 'https:'
    const protocol = isHttps ? 'wss:' : 'ws:'
    const host = window.location.hostname
    return `${protocol}//${host}:8080/`
  }
  return 'ws://127.0.0.1:8080/'
}

export function fxsimStream(): WebSocket | null {
  if (typeof window === 'undefined') return null
  try {
    const url = getWsUrl()
    return new WebSocket(url)
  } catch (err) {
    console.warn('[fxsimStream] WebSocket creation failed:', err)
    return null
  }
}
