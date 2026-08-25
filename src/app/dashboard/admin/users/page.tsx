'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  Search, Users as UsersIcon, MoreVertical, AlertCircle,
} from 'lucide-react'
import { api } from '@/lib/api'
import { invalidateFxsim, setSession, clearFxsimCache } from '@/lib/fxsim'
import { useImpersonation } from '@/store/impersonation'
import { useAuth } from '@/store/auth'
import { fmtUSD, fmtDate, toNum } from '@/lib/format'
import type { AdminUserRow } from '@/types/api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/cn'
import { KycReviewQueue } from '@/components/admin/kyc-review-queue'

export default function AdminUsersPage() {
  const adminUser = useAuth((s) => s.user)
  const startImpersonation = useImpersonation((s) => s.start)

  const [rows, setRows]     = useState<AdminUserRow[] | null>(null)
  const [tab, setTab]       = useState<'users' | 'kyc'>('users')
  const [query, setQuery]   = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')

  // Debounce search input (cheap UI; no need to hammer the search query on every keystroke)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  const refresh = useCallback(async () => {
    const res = await api.admin.users(debouncedQ || undefined)
    if (res.ok) {
      const data = Array.isArray(res.data) ? res.data : (res.data as any)?.data || []
      setRows(data)
    }
  }, [debouncedQ])

  useEffect(() => { refresh() }, [refresh])

  const [adjustFor,     setAdjustFor]     = useState<AdminUserRow | null>(null)
  const [statusFor,     setStatusFor]     = useState<AdminUserRow | null>(null)
  const [impersonateFor, setImpersonateFor] = useState<AdminUserRow | null>(null)

  const confirmImpersonate = useCallback(async () => {
    if (!impersonateFor || !adminUser) return
    const target = impersonateFor
    const res = await api.admin.impersonate(target.user_id)
    if (!res.ok || !res.data.success) {
      toast.error(res.ok ? (res.data.message || 'Impersonation failed') : res.error)
      return
    }
    // Save admin context, clear stale nonce + caches, redirect to trader dashboard
    startImpersonation({
      admin_username:     adminUser.username,
      admin_display_name: adminUser.display_name,
      target_user_id:     target.user_id,
      target_username:    target.user_login,
      started_at:         Date.now(),
    })
    setSession({ nonce: null, bearer: null })   // admin's nonce and bearer are cleared for target user
    clearFxsimCache()              // wipe any admin-scoped responses
    setImpersonateFor(null)
    toast.success(`Viewing as ${target.user_login}`)
    // Hard navigate so /auth/me re-runs against the new cookie
    window.location.href = '/dashboard'
  }, [impersonateFor, adminUser, startImpersonation])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">User management</h1>
        <p className="text-sm text-text-muted mt-1">Search, view balances, adjust accounts, or view the dashboard as a user.</p>
      </div>

      {/* Sub-tabs: Users · KYC review (KYC lives under Users; no new sidebar item) */}
      <div className="flex items-center gap-1 border-b border-border-subtle">
        {([['users', 'Users'], ['kyc', 'KYC review']] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cn(
              'px-3.5 h-9 text-sm font-medium border-b-2 -mb-px transition-colors focus-ring',
              tab === k ? 'border-accent text-text' : 'border-transparent text-text-muted hover:text-text',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'kyc' ? <KycReviewQueue /> : (<>
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username or email"
          className="pl-9"
        />
      </div>

      {/* Users table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-bg-subtle/40">
                <Th>User</Th>
                <Th hideOn="md">Email</Th>
                <Th align="right">Balance</Th>
                <Th align="right" hideOn="sm">Equity</Th>
                <Th align="center" hideOn="md">Challenges</Th>
                <Th hideOn="lg">Joined</Th>
                <Th align="right">{''}</Th>
              </tr>
            </thead>
            <tbody>
              {rows === null && (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border-subtle/40">
                    <td colSpan={7} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                  </tr>
                ))
              )}
              {rows !== null && rows.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12">
                  <UsersIcon className="h-8 w-8 mx-auto text-text-faint mb-3" />
                  <div className="text-sm text-text-muted">
                    {query ? `No users match "${query}"` : 'No users yet'}
                  </div>
                </td></tr>
              )}
              {rows !== null && rows.map((u, i) => (
                <motion.tr
                  key={u.user_id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.18, delay: Math.min(i * 0.012, 0.25) }}
                  className="border-b border-border-subtle/40 last:border-0 hover:bg-surface-muted/30"
                >
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-accent to-success flex items-center justify-center text-2xs font-semibold text-white shrink-0">
                        {u.user_login.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{u.user_login}</div>
                        <div className="text-2xs text-text-muted truncate md:hidden">{u.user_email}</div>
                      </div>
                    </div>
                  </Td>
                  <Td hideOn="md">
                    <span className="text-text-muted truncate block max-w-[220px]">{u.user_email}</span>
                  </Td>
                  <Td align="right"><span className="tabular">{fmtUSD(u.balance)}</span></Td>
                  <Td align="right" hideOn="sm"><span className="tabular text-text-muted">{fmtUSD(u.equity)}</span></Td>
                  <Td align="center" hideOn="md">
                    <div className="inline-flex items-center gap-1.5 text-2xs">
                      {u.active_challenges > 0 && <Badge tone="info">{u.active_challenges} active</Badge>}
                      {u.funded_challenges > 0 && <Badge tone="success">{u.funded_challenges} funded</Badge>}
                      {u.active_challenges === 0 && u.funded_challenges === 0 && <span className="text-text-faint">—</span>}
                    </div>
                  </Td>
                  <Td hideOn="lg"><span className="text-2xs text-text-muted">{fmtDate(u.user_registered)}</span></Td>
                  <Td align="right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-text-muted hover:text-text hover:bg-surface-muted focus-ring"
                          aria-label="User actions"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-[200px]">
                        <DropdownMenuLabel>{u.user_login}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={() => setImpersonateFor(u)}
                          disabled={u.user_id === adminUser?.id}
                        >
                          View as user
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/admin/users/${u.user_id}`}>View details</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => setAdjustFor(u)}
                          disabled={!u.account_id}
                        >
                          Adjust balance
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setStatusFor(u)}>
                          Set account status
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </Td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      </>)}

      {/* Adjust balance */}
      {adjustFor && (
        <AdjustBalanceDialog
          user={adjustFor}
          onClose={() => setAdjustFor(null)}
          onSaved={() => {
            invalidateFxsim('/admin/users')
            refresh()
          }}
        />
      )}

      {/* Set status */}
      {statusFor && (
        <SetStatusDialog
          user={statusFor}
          onClose={() => setStatusFor(null)}
          onSaved={() => {
            invalidateFxsim('/admin/users')
            refresh()
          }}
        />
      )}

      {/* Impersonate confirmation */}
      {impersonateFor && (
        <Dialog open onOpenChange={(o) => !o && setImpersonateFor(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>View as {impersonateFor.user_login}?</DialogTitle>
              <DialogDescription>
                You&apos;ll see the trader dashboard exactly as they do.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-md bg-warn-muted/40 border border-warn/30 p-3 text-2xs space-y-1.5">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-3.5 w-3.5 text-warn shrink-0 mt-0.5" />
                <div className="text-text">
                  <div className="font-medium">Read-only by design</div>
                  <div className="text-text-muted mt-0.5">
                    During impersonation, write actions (placing trades, requesting payouts) will fail with a session-expired error. This is intentional — exit impersonation and sign back in as admin to make changes for the user.
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-md bg-info-muted/40 border border-info/30 p-3 text-2xs">
              <span className="text-text-muted">Action audited: </span>
              <span className="text-text">admin <b>{adminUser?.username}</b> → <b>{impersonateFor.user_login}</b></span>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setImpersonateFor(null)}>Cancel</Button>
              <Button onClick={confirmImpersonate}>Start session</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// ── Dialogs ────────────────────────────────────────────────────────────

function AdjustBalanceDialog({ user, onClose, onSaved }: {
  user: AdminUserRow; onClose: () => void; onSaved: () => void
}) {
  const [amount, setAmount] = useState('')
  const [note,   setNote]   = useState('Admin adjustment')
  const [busy,   setBusy]   = useState(false)

  const amountN = toNum(amount)
  const isAdd = amountN > 0
  const newBalance = toNum(user.balance) + amountN

  const submit = async () => {
    if (!Number.isFinite(amountN) || amountN === 0) { toast.error('Enter a non-zero amount'); return }
    if (!user.account_id) { toast.error('User has no trading account'); return }
    setBusy(true)
    const res = await api.admin.adjustBalance(user.user_id, user.account_id, amountN, note.trim() || 'Admin adjustment')
    setBusy(false)
    if (res.ok && res.data.success) {
      toast.success(`Balance updated to ${fmtUSD(res.data.new_balance)}`)
      onSaved(); onClose()
    } else {
      toast.error(res.ok ? 'Adjustment failed' : res.error)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust {user.user_login}&apos;s balance</DialogTitle>
          <DialogDescription>Use a negative amount to deduct.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md bg-bg-subtle/60 border border-border-subtle p-3 text-2xs space-y-1">
            <div className="flex justify-between"><span className="text-text-muted">Current balance</span><span className="tabular">{fmtUSD(user.balance)}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Adjustment</span>
              <span className={cn('tabular font-medium',
                amountN > 0 ? 'text-success' : amountN < 0 ? 'text-danger' : 'text-text-muted',
              )}>{amountN === 0 ? '—' : (isAdd ? '+' : '') + fmtUSD(amountN)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-border-subtle">
              <span className="font-medium">New balance</span><span className="tabular font-medium">{fmtUSD(newBalance)}</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="amt">Amount (USD)</Label>
            <Input id="amt" type="text" inputMode="decimal" value={amount}
                   onChange={(e) => setAmount(e.target.value.replace(/[^\d.\-]/g, ''))}
                   placeholder="e.g. -500 to deduct $500" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note">Note (audit log)</Label>
            <Textarea id="note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={busy} disabled={!amountN}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SetStatusDialog({ user, onClose, onSaved }: {
  user: AdminUserRow; onClose: () => void; onSaved: () => void
}) {
  // Must match the backend ENUM exactly (fxsim_accounts.status / set_account_status):
  // active | frozen | banned. Earlier the UI sent suspended/breached, which the
  // backend rejected — so suspension silently did nothing.
  const STATUSES: { id: string; label: string; tone: 'success' | 'danger' | 'warn' | 'info'; desc: string }[] = [
    { id: 'active', label: 'Active', tone: 'success', desc: 'Trading and payouts allowed' },
    { id: 'frozen', label: 'Frozen', tone: 'warn',    desc: 'Trading & payouts blocked; can be reactivated' },
    { id: 'banned', label: 'Banned', tone: 'danger',  desc: 'Trading & payouts blocked; account disabled' },
  ]
  const norm = (s: string) => (['active', 'frozen', 'banned'].includes(s) ? s : 'active')
  const [status, setStatus] = useState(norm(user.status))
  const [busy,   setBusy]   = useState(false)

  const submit = async () => {
    setBusy(true)
    const res = await api.admin.setStatus(user.user_id, status)
    setBusy(false)
    if (res.ok && res.data.success) {
      toast.success(`Status set to ${status}`); onSaved(); onClose()
    } else {
      toast.error(res.ok ? 'Update failed' : res.error)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set account status — {user.user_login}</DialogTitle>
          <DialogDescription>Changes apply to the user&apos;s primary trading account.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2">
          {STATUSES.map((s) => (
            <button
              key={s.id}
              onClick={() => setStatus(s.id)}
              className={cn(
                'h-10 rounded-md border text-xs font-medium transition-colors capitalize focus-ring',
                status === s.id
                  ? s.tone === 'success' ? 'border-success bg-success-muted text-success'
                    : s.tone === 'danger' ? 'border-danger bg-danger-muted text-danger'
                    : 'border-warn bg-warn-muted text-warn'
                  : 'border-border bg-surface text-text-muted hover:text-text hover:border-border-strong',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={busy}>Save status</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Utility cells ─────────────────────────────────────────────────────

function Th({ children, align, hideOn }: { children: React.ReactNode; align?: 'right' | 'center'; hideOn?: 'sm' | 'md' | 'lg' }) {
  return (
    <th className={cn(
      'px-3 py-2.5 text-2xs uppercase tracking-wider text-text-faint font-medium',
      align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
      hideOn === 'sm' && 'hidden sm:table-cell',
      hideOn === 'md' && 'hidden md:table-cell',
      hideOn === 'lg' && 'hidden lg:table-cell',
    )}>{children}</th>
  )
}
function Td({ children, align, hideOn }: { children: React.ReactNode; align?: 'right' | 'center'; hideOn?: 'sm' | 'md' | 'lg' }) {
  return (
    <td className={cn(
      'px-3 py-3',
      align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
      hideOn === 'sm' && 'hidden sm:table-cell',
      hideOn === 'md' && 'hidden md:table-cell',
      hideOn === 'lg' && 'hidden lg:table-cell',
    )}>{children}</td>
  )
}
