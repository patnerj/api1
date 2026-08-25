'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BannerBar } from '@/components/banner-bar'
import { Logo } from '@/components/logo'
import { useBranding } from '@/store/branding'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/store/auth'
import { cn } from '@/lib/cn'
import { Menu, X } from 'lucide-react'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'

const NAV = [
  { href: '/challenges',  label: 'Challenges' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/faq',         label: 'FAQ' },
]

export function MarketingHeader() {
  const user    = useAuth((s) => s.user)
  const ready   = useAuth((s) => s.ready)
  const [scrolled, setScrolled] = useState(false)
  const [open,     setOpen]     = useState(false)
  const brand = useBranding((s) => s.branding.brand_name)
  const loadBranding = useBranding((s) => s.load)
  useEffect(() => { loadBranding() }, [loadBranding])

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  // Lock body scroll while mobile menu is open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  // Close mobile menu on route change is handled by Next link navigation — but
  // make absolutely sure by closing on Escape too.
  useEffect(() => {
    if (!open) return
    const on = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [open])

  return (
    <motion.header
      initial={{ y: -8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'fixed top-0 inset-x-0 z-40 transition-all duration-300',
        scrolled
          ? 'glass-strong border-b border-border-subtle'
          : 'bg-transparent border-b border-transparent',
      )}
    >
      <BannerBar placement="top" />
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="focus-ring rounded-md" aria-label={`${brand} home`}>
          <Logo />
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className="px-3 py-2 text-sm text-text-muted hover:text-text transition-colors focus-ring rounded-md"
            >
              {it.label}
            </Link>
          ))}
        </nav>

        {/* Auth-aware CTAs — reserve space silently while not ready, so the
            "Sign in / Get funded" doesn't flash for signed-in users. */}
        <div className="hidden md:flex items-center gap-2 min-w-[180px] justify-end">
          {!ready ? (
            <div className="h-8 w-32 rounded-md skel" aria-hidden />
          ) : user ? (
            <Button asChild size="sm" variant="primary">
              <Link href="/dashboard">Dashboard →</Link>
            </Button>
          ) : (
            <>
              <Button asChild size="sm" variant="ghost">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm" variant="primary">
                <Link href="/register">Get funded →</Link>
              </Button>
            </>
          )}
          <ThemeSwitcher />
        </div>

        <button
          className="md:hidden p-2 rounded-md hover:bg-surface-muted focus-ring"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="mobile-menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-border-subtle glass-strong"
          >
            <div className="container py-4 flex flex-col gap-1 max-h-[calc(100vh-4rem)] overflow-y-auto">
              {NAV.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={() => setOpen(false)}
                  className="px-3 py-2.5 text-sm text-text-muted hover:text-text hover:bg-surface-muted rounded-md transition-colors"
                >
                  {it.label}
                </Link>
              ))}
              <div className="h-px bg-border-subtle my-2" />
              {!ready ? (
                <div className="h-10 w-full skel rounded-md" />
              ) : user ? (
                <Button asChild variant="primary" className="w-full" onClick={() => setOpen(false)}>
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="ghost" className="w-full" onClick={() => setOpen(false)}>
                    <Link href="/login">Sign in</Link>
                  </Button>
                  <Button asChild variant="primary" className="w-full" onClick={() => setOpen(false)}>
                    <Link href="/register">Get funded</Link>
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
