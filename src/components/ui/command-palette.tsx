'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronRight, User, Settings, CreditCard, LayoutDashboard, Shield } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn } from '@/lib/cn'

export function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const router = useRouter()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const actions = [
    { title: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { title: 'Admin Overview', icon: LayoutDashboard, href: '/admin' },
    { title: 'Manage Traders', icon: User, href: '/admin/traders' },
    { title: 'Risk Control', icon: Shield, href: '/admin/risk' },
    { title: 'System Config', icon: Settings, href: '/admin/config' },
    { title: 'Payout Requests', icon: CreditCard, href: '/admin/payouts' },
    { title: 'Account Settings', icon: Settings, href: '/dashboard/settings' },
  ]

  const filtered = query === '' 
    ? actions 
    : actions.filter(a => a.title.toLowerCase().includes(query.toLowerCase()))

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [])

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 overflow-hidden max-w-xl bg-surface/90 backdrop-blur-xl border-border-strong shadow-glow">
          <div className="flex items-center border-b border-border-subtle px-4">
            <Search className="h-5 w-5 text-text-muted shrink-0" />
            <input
              autoFocus
              className="flex h-14 w-full rounded-md bg-transparent px-3 py-3 text-sm outline-none placeholder:text-text-muted"
              placeholder="Type a command or search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded border border-border-subtle bg-surface-muted px-2 font-mono text-[10px] font-medium text-text-muted opacity-100">
              <span className="text-xs">ESC</span>
            </kbd>
          </div>
          <div className="max-h-[300px] overflow-y-auto p-2">
            {filtered.length === 0 && (
              <p className="p-4 text-center text-sm text-text-muted">No results found.</p>
            )}
            {filtered.map((action, i) => {
              const Icon = action.icon
              return (
                <button
                  key={i}
                  onClick={() => runCommand(() => router.push(action.href))}
                  className={cn(
                    "relative flex w-full cursor-default select-none items-center rounded-sm px-3 py-2.5 text-sm outline-none",
                    "hover:bg-accent hover:text-white transition-colors"
                  )}
                >
                  <Icon className="mr-2 h-4 w-4 shrink-0" />
                  <span>{action.title}</span>
                  <ChevronRight className="ml-auto h-4 w-4 opacity-50" />
                </button>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function Trophy(props: any) {
    return <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7c0 6 3 10 6 10s6-4 6-10z" />
    </svg>
}
