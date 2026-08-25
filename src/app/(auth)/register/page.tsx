'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect, FormEvent } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/store/auth'
import { AlertCircle, ArrowRight, Check } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const { signup, user, ready } = useAuth()
  const [username, setU] = useState('')
  const [email, setE]    = useState('')
  const [password, setP] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [ref, setRef]         = useState('')

  // Capture an affiliate referral code from ?ref= and persist it so it survives
  // navigation between login/register before the user completes signup.
  useEffect(() => {
    try {
      const url = new URL(window.location.href)
      const code = url.searchParams.get('ref')
      if (code) { localStorage.setItem('fxsim:ref', code); setRef(code) }
      else { const saved = localStorage.getItem('fxsim:ref'); if (saved) setRef(saved) }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (ready && user) router.replace('/dashboard')
  }, [ready, user, router])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    setError(null)
    const res = await signup(username, email, password, ref || undefined)
    setLoading(false)
    if (res.ok) {
      try { localStorage.removeItem('fxsim:ref') } catch { /* ignore */ }
      toast.success('Account created — welcome!')
      router.replace('/dashboard?welcome=1')
    } else {
      setError(res.error ?? 'Sign-up failed')
    }
  }

  const pwOk = password.length >= 8

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="p-8 glass-strong border-border-strong card-glow">
        <div className="text-center mb-6">
          <div className="brand-emblem">
            <span className="text-lg font-black text-slate-950">P</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Create free account</h1>
          <p className="text-sm text-text-muted mt-1">
            Pass the challenge. Get funded. Keep up to 90%.
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2.5 p-3 rounded-md bg-danger-muted border border-danger/30 text-sm">
            <AlertCircle className="h-4 w-4 text-danger shrink-0 mt-0.5" />
            <span className="text-danger">{error}</span>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="user">Username</Label>
            <Input
              id="user"
              autoFocus
              autoComplete="username"
              minLength={3}
              value={username}
              onChange={(e) => setU(e.target.value.replace(/[^a-zA-Z0-9_.\-]/g, ''))}
              required
              placeholder="trader_handle"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setE(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pwd">Password</Label>
            <Input
              id="pwd"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setP(e.target.value)}
              required
              placeholder="Min. 8 characters"
            />
            <div className="text-2xs flex items-center gap-1.5 text-text-muted">
              <Check className={`h-3 w-3 ${pwOk ? 'text-success' : 'text-text-faint'}`} />
              At least 8 characters
            </div>
          </div>

          <Button type="submit" className="w-full btn-shine" loading={loading} size="lg">
            Create account
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <p className="mt-4 text-xs text-text-faint text-center leading-relaxed">
          By creating an account you agree to our{' '}
          <Link href="/terms" className="hover:text-text">Terms</Link> and{' '}
          <Link href="/privacy" className="hover:text-text">Privacy Policy</Link>.
        </p>

        <div className="mt-6 pt-6 border-t border-border-subtle text-center text-sm text-text-muted">
          Already have an account?{' '}
          <Link href="/login" className="text-accent hover:text-accent-hover font-medium">
            Sign in
          </Link>
        </div>
      </Card>
    </motion.div>
  )
}
