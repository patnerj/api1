import Link from 'next/link'
import { Logo } from '@/components/logo'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid-overlay opacity-30" />
      </div>

      <header className="container py-6">
        <Link href="/" className="inline-flex"><Logo variant="login" /></Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {children}
        </div>
      </main>

      <footer className="container py-6 text-center text-xs text-text-faint">
        Protected by 2FA, rate limiting, and account lockout policies.
      </footer>
    </div>
  )
}
