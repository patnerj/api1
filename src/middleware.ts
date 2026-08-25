import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Route protection via a server-minted, HMAC-signed HttpOnly session cookie
 * (`fxsim_sess`, set by /api/auth/session after backend token verification).
 *
 * The old scheme trusted `fxsim_authed=1` — a cookie any user could set from
 * devtools — letting anyone render the admin/dashboard shells. Now the cookie
 * value is `base64url(payload).base64url(hmac)` and the signature is verified
 * here with Web Crypto; forging it requires FXSIM_SESSION_SECRET.
 *
 * Legacy fallback: if FXSIM_SESSION_SECRET is not configured the old
 * presence-flag behaviour is preserved so deployments don't break — set the
 * shared secret on both sides to enable signed mode.
 */

const SESSION_COOKIE = 'fxsim_sess'

type SessionPayload = { uid: number; role: 'admin' | 'user'; exp: number }

function b64urlToBytes(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
  const buf = new ArrayBuffer(bin.length)
  const bytes = new Uint8Array(buf)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function verifySession(value: string | undefined, secret: string): Promise<SessionPayload | null> {
  if (!value || !secret) return null
  const dot = value.lastIndexOf('.')
  if (dot <= 0) return null
  const payload = value.slice(0, dot)
  const sig = value.slice(dot + 1)
  try {
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'],
    )
    const ok = await crypto.subtle.verify(
      'HMAC', key, b64urlToBytes(sig), new TextEncoder().encode(payload),
    )
    if (!ok) return null
    const parsed = JSON.parse(new TextDecoder().decode(b64urlToBytes(payload))) as SessionPayload
    if (!parsed?.uid || !parsed?.exp || parsed.exp < Math.floor(Date.now() / 1000)) return null
    return parsed
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const secret = process.env.FXSIM_SESSION_SECRET || process.env.SESSION_SECRET

  // Signed mode: verify the HMAC cookie. Legacy mode (no secret configured):
  // /dashboard keeps the old presence-flag behaviour so deployments without the
  // secret don't break — but /admin is ALWAYS fail-closed: a client-settable
  // cookie must never grant the admin shell, secret or no secret.
  let session: SessionPayload | null = null
  if (secret) {
    session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value, secret)
  }
  const hasAuthCookie = secret
    ? session !== null
    : request.cookies.get('fxsim_authed')?.value === '1' ||
      request.cookies.getAll().some(c => c.name.startsWith('wordpress_logged_in_'))
  // Admin access requires a cryptographically verified admin-role session in
  // every mode. No legacy fallback — forgeable cookies never open /admin.
  const isAdmin = session?.role === 'admin'

  // Canonical redirect: strictly map any /dashboard/admin* URL to /admin*
  if (path === '/dashboard/admin' || path === '/dashboard/admin/') {
    const url = new URL('/admin', request.url)
    return NextResponse.redirect(url, 308)
  }
  if (path.startsWith('/dashboard/admin/')) {
    const sub = path.replace('/dashboard/admin/', '')
    const targetMap: Record<string, string> = {
      'users': 'traders',
      'challenges': 'traders',
      'payments': 'payouts',
      'settings': 'config',
      'setup': 'config',
      'support': 'helpdesk',
      'notifications': 'activity',
      'health': 'operations',
    }
    const mapped = targetMap[sub] || sub
    const url = new URL(`/admin/${mapped}`, request.url)
    return NextResponse.redirect(url, 308)
  }

  const loginRedirect = () => {
    const url = new URL('/login', request.url)
    url.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search)
    return NextResponse.redirect(url)
  }

  // Protect /admin routes — a verified admin-role session is mandatory, always.
  if (path === '/admin' || path.startsWith('/admin/')) {
    if (!isAdmin) return loginRedirect()
  }

  // Protect /dashboard routes
  if (path.startsWith('/dashboard')) {
    if (!hasAuthCookie) return loginRedirect()
  }

  // Let client-side code handle redirecting away from auth pages if actually logged in.
  // We can't trust the cookie presence alone because it might be expired on the server,
  // which causes an infinite redirect loop between client-side dashboard (unauthorized) and middleware (cookie present).

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register', '/admin', '/admin/:path*'],
}
