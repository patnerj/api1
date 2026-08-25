import { NextRequest, NextResponse } from 'next/server'
import { getApiBaseUrl } from '@/lib/fxsim'
import { SESSION_COOKIE } from '@/lib/session'

export const runtime = 'nodejs'

/**
 * POST /api/auth/session — verify a backend auth token server-to-server and,
 * on success, set an HttpOnly HMAC-signed middleware cookie.
 *
 * Body: { token: string, remember?: boolean }
 * The `token` is the `token` field returned by /auth/login, /auth/register or
 * /auth/2fa/verify. It is validated against the backend /auth/me endpoint
 * (which resolves it via X-FXSIM-Token) so only the backend can vouch for it.
 *
 * DELETE /api/auth/session — clear the cookie.
 */

const THIRTY_DAYS = 60 * 60 * 24 * 30
const ONE_DAY     = 60 * 60 * 24

function b64url(input: ArrayBuffer | Uint8Array | string): string {
  let bytes: Uint8Array
  if (typeof input === 'string') bytes = new TextEncoder().encode(input)
  else bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function hmacSign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return b64url(sig)
}

export async function POST(req: NextRequest) {
  const secret = process.env.FXSIM_SESSION_SECRET || process.env.SESSION_SECRET
  let body: { token?: string; remember?: boolean } = {}
  try { body = await req.json() } catch { /* handled below */ }
  const token = (body.token || '').trim()
  const remember = body.remember !== false

  if (!token) {
    return NextResponse.json({ ok: false, error: 'Missing token.' }, { status: 400 })
  }
  if (!secret) {
    // Deployment not configured for signed sessions — do not silently mint a
    // forgeable cookie. The middleware falls back to legacy mode on its side.
    return NextResponse.json({ ok: false, legacy: true, error: 'FXSIM_SESSION_SECRET not configured.' }, { status: 503 })
  }

  // Verify the token against the backend (server-to-server — never trust the client).
  const base = getApiBaseUrl()
  let verified: { id?: number; is_admin?: boolean } | null = null
  try {
    const res = await fetch(`${base}/auth/me`, {
      headers: { 'X-FXSIM-Token': token, 'X-FXSIM-Session-Verify': '1' },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })
    if (res.ok) verified = await res.json()
  } catch { /* verified stays null */ }

  if (!verified || !verified.id) {
    return NextResponse.json({ ok: false, error: 'Session verification failed.' }, { status: 401 })
  }

  const payload = b64url(JSON.stringify({
    uid: verified.id,
    role: verified.is_admin ? 'admin' : 'user',
    exp: Math.floor(Date.now() / 1000) + (remember ? THIRTY_DAYS : ONE_DAY),
  }))
  const sig = await hmacSign(payload, secret)
  const value = `${payload}.${sig}`

  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: remember ? THIRTY_DAYS : ONE_DAY,
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return res
}
