/**
 * Signed HttpOnly session cookie helpers.
 *
 * The middleware-gating cookie is NO LONGER a client-settable flag. After the
 * backend verifies credentials, the client posts the returned auth token to
 * /api/auth/session, which verifies it server-to-server and sets an
 * HttpOnly HMAC-signed cookie (`fxsim_sess`) that the middleware can verify
 * in the edge runtime. Forging the cookie requires the server-side secret.
 */

export const SESSION_COOKIE = 'fxsim_sess'

/**
 * Ask the Next.js server to verify our backend token and set the signed cookie.
 * Returns:
 *   'ok'     — signed cookie set
 *   'legacy' — server has no FXSIM_SESSION_SECRET configured (503 legacy mode)
 *   'failed' — verification or network failed (cookie NOT set)
 */
export async function sessionEstablish(token: string, remember = true): Promise<'ok' | 'legacy' | 'failed'> {
  if (typeof window === 'undefined' || !token) return 'failed'
  try {
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, remember }),
      credentials: 'same-origin',
    })
    if (res.ok) return 'ok'
    if (res.status === 503) {
      try {
        const body = await res.json()
        if (body?.legacy) return 'legacy'
      } catch { /* fall through */ }
    }
    return 'failed'
  } catch {
    return 'failed'
  }
}

/** Clear the signed session cookie (logout / session expiry). */
export async function sessionDestroy(): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    await fetch('/api/auth/session', { method: 'DELETE', credentials: 'same-origin' })
  } catch { /* best-effort */ }
  notifySessionCleared()
}

// ── Session-cleared listeners ────────────────────────────────────────────────
// On logout, every in-memory cache must be wiped or the NEXT login on a shared
// computer can see the previous user's data (react-query keeps responses in
// memory across route changes). Modules register cleanup callbacks here —
// Providers registers queryClient.clear().
type SessionClearedCb = () => void
const sessionClearedCbs: SessionClearedCb[] = []

export function onSessionCleared(cb: SessionClearedCb): () => void {
  sessionClearedCbs.push(cb)
  return () => {
    const i = sessionClearedCbs.indexOf(cb)
    if (i >= 0) sessionClearedCbs.splice(i, 1)
  }
}

function notifySessionCleared() {
  for (const cb of sessionClearedCbs) {
    try { cb() } catch { /* listener errors must not break logout */ }
  }
}
