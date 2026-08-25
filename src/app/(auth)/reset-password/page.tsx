'use client'

import Link from 'next/link'
import { useState, useEffect, FormEvent } from 'react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react'

export default function ResetPasswordPage() {
  // Request mode (enter email) vs. complete mode (key+login from the email link).
  const [resetKey, setResetKey] = useState('')
  const [keyLogin, setKeyLogin] = useState('')
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const sp = new URLSearchParams(window.location.search)
    const k = sp.get('key') || ''
    const l = sp.get('login') || ''
    if (k && l) { setResetKey(k); setKeyLogin(l) }
  }, [])

  async function submitRequest(e: FormEvent) {
    e.preventDefault()
    if (!login) return
    setLoading(true)
    await api.auth.requestReset(login)
    setLoading(false)
    setSent(true)
  }

  async function submitComplete(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    const res = await api.auth.doReset(resetKey, keyLogin, password)
    setLoading(false)
    if (res.ok) {
      // Scrub the one-time reset key + login from the address bar so it does
      // not linger in browser history / screen shares after success.
      try { window.history.replaceState(null, '', window.location.pathname) } catch { /* ignore */ }
      setDone(true)
    } else {
      setError(res.error || 'Reset link is invalid or expired. Request a new one.')
    }
  }

  const completeMode = !!resetKey && !!keyLogin

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card className="p-8 glass-strong border-border-strong">
        {done ? (
          <div className="text-center">
            <div className="h-12 w-12 rounded-full bg-success-muted text-success flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Password updated</h1>
            <p className="text-sm text-text-muted mt-2 leading-relaxed">Your password has been changed. You can now sign in with your new password.</p>
            <Button asChild className="w-full mt-6"><Link href="/login"><ArrowLeft className="h-4 w-4" /> Back to sign in</Link></Button>
          </div>
        ) : completeMode ? (
          <>
            <div className="text-center mb-6">
              <div className="h-12 w-12 rounded-full bg-accent-muted text-accent flex items-center justify-center mx-auto mb-4">
                <KeyRound className="h-6 w-6" />
              </div>
              <h1 className="text-xl font-bold tracking-tight">Choose a new password</h1>
              <p className="text-sm text-text-muted mt-1">For <span className="text-text">{keyLogin}</span></p>
            </div>
            <form onSubmit={submitComplete} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="pw">New password</Label>
                <Input id="pw" type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cpw">Confirm password</Label>
                <Input id="cpw" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button type="submit" className="w-full" loading={loading} size="lg">Update password</Button>
            </form>
            <div className="mt-6 pt-6 border-t border-border-subtle text-center text-sm text-text-muted">
              <Link href="/login" className="text-accent hover:text-accent-hover inline-flex items-center gap-1">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
              </Link>
            </div>
          </>
        ) : sent ? (
          <div className="text-center">
            <div className="h-12 w-12 rounded-full bg-success-muted text-success flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Check your email</h1>
            <p className="text-sm text-text-muted mt-2 leading-relaxed">
              If an account exists for <span className="text-text">{login}</span>, we&apos;ve sent a reset link. The link expires in 24 hours.
            </p>
            <Button asChild className="w-full mt-6" variant="secondary"><Link href="/login"><ArrowLeft className="h-4 w-4" /> Back to sign in</Link></Button>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="brand-emblem">
                <span className="text-lg font-black text-slate-950">P</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight">Reset your password</h1>
              <p className="text-sm text-text-muted mt-1">We&apos;ll email you a reset link</p>
            </div>
            <form onSubmit={submitRequest} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="user">Username or email</Label>
                <Input id="user" autoFocus value={login} onChange={(e) => setLogin(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" loading={loading} size="lg">Send reset link</Button>
            </form>
            <div className="mt-6 pt-6 border-t border-border-subtle text-center text-sm text-text-muted">
              <Link href="/login" className="text-accent hover:text-accent-hover inline-flex items-center gap-1">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
              </Link>
            </div>
          </>
        )}
      </Card>
    </motion.div>
  )
}
