'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, ChevronDown, ChevronUp, Server } from 'lucide-react'
import { api } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'

type UnassignedTrader = {
  challenge_id: number
  user_id: number
  name: string
  email: string
  funded_at: string | null
  days_waiting: number | null
}

// Funded challenge accounts wait for an admin to manually create and bind a
// live MT5 account (see class-rest-api.php admin_mt5_unassigned() — MT5
// account creation is a broker-side manual step, not automated). This
// surfaces the backlog so it doesn't silently sit unnoticed.
export function Mt5UnassignedBanner() {
  const [traders, setTraders] = useState<UnassignedTrader[] | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [assignFor, setAssignFor] = useState<UnassignedTrader | null>(null)

  const refresh = useCallback(async () => {
    const res = await api.admin.mt5Unassigned()
    if (res.ok) setTraders(res.data.traders)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  if (traders === null || traders.length === 0) return null

  return (
    <>
      <Card className="border-warn/30 bg-warn-muted/20 overflow-hidden">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-full flex items-center justify-between gap-3 p-4 text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-warn/15 flex items-center justify-center shrink-0">
              <Server className="h-4.5 w-4.5 text-warn" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold flex items-center gap-2">
                {traders.length} funded {traders.length === 1 ? 'trader' : 'traders'} waiting for MT5 assignment
                <Badge tone="warn">{traders.length}</Badge>
              </div>
              <div className="text-2xs text-text-muted mt-0.5">
                These accounts passed evaluation but have no live MT5 login bound yet.
              </div>
            </div>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-text-muted shrink-0" /> : <ChevronDown className="h-4 w-4 text-text-muted shrink-0" />}
        </button>

        {expanded && (
          <div className="border-t border-warn/20 divide-y divide-border-subtle/60">
            {traders.map((t) => (
              <div key={t.challenge_id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{t.name}</div>
                  <div className="text-2xs text-text-muted truncate">
                    {t.email}
                    {t.days_waiting !== null && (
                      <span className={t.days_waiting >= 2 ? 'text-warn font-medium' : ''}>
                        {' '}· waiting {t.days_waiting}d
                      </span>
                    )}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => setAssignFor(t)}>
                  Assign MT5
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {assignFor && (
        <AssignMt5Dialog
          trader={assignFor}
          onClose={() => setAssignFor(null)}
          onSaved={() => {
            setAssignFor(null)
            refresh()
          }}
        />
      )}
    </>
  )
}

function AssignMt5Dialog({ trader, onClose, onSaved }: {
  trader: UnassignedTrader; onClose: () => void; onSaved: () => void
}) {
  const [login, setLogin]     = useState('')
  const [password, setPassword] = useState('')
  const [server, setServer]   = useState('')
  const [busy, setBusy]       = useState(false)

  const submit = async () => {
    if (!login.trim()) { toast.error('MT5 login is required'); return }
    if (!server.trim()) { toast.error('MT5 server is required'); return }
    setBusy(true)
    const res = await api.admin.saveUserMt5(trader.user_id, {
      mt5_login: login.trim(),
      mt5_password: password.trim() || undefined,
      mt5_server: server.trim(),
      mt5_account_type: 'live',
    })
    setBusy(false)
    if (res.ok && res.data.success) {
      toast.success(`MT5 account bound for ${trader.name}`)
      onSaved()
    } else {
      toast.error(res.ok ? (res.data.message || 'Failed to save') : res.error)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warn" />
            Assign MT5 — {trader.name}
          </DialogTitle>
          <DialogDescription>
            Create the live MT5 account on your broker/dealing desk first, then bind its credentials here so the trader can see them on their dashboard.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="mt5_login">MT5 Login</Label>
            <Input id="mt5_login" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="e.g. 5012345" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mt5_password">MT5 Password</Label>
            <Input id="mt5_password" type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Investor or master password" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mt5_server">MT5 Server</Label>
            <Input id="mt5_server" value={server} onChange={(e) => setServer(e.target.value)} placeholder="e.g. YourBroker-Live" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={busy} disabled={!login.trim() || !server.trim()}>Bind account</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
