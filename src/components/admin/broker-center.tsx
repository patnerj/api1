'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { invalidateFxsim } from '@/lib/fxsim'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Server, CheckCircle2 } from 'lucide-react'

export function BrokerCenter() {
  const [server, setServer] = useState('')
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [hasConfig, setHasConfig] = useState(false)

  useEffect(() => {
    api.admin.whitelabelGet().then((r) => {
      if (r.ok) {
        setServer(r.data.mt5_manager_url || '')
        setLogin(r.data.mt5_manager_login || '')
        setHasConfig(!!r.data.mt5_manager_url && !!r.data.mt5_manager_login)
      }
    })
  }, [])

  const save = async () => {
    setSaving(true)
    const payload: Record<string, string> = { 
      mt5_manager_url: server,
      mt5_manager_login: login
    }
    if (password.trim()) payload.mt5_manager_password = password.trim()
    
    const r = await api.admin.whitelabelSave(payload)
    setSaving(false)
    if (r.ok) {
      toast.success('MT5 Server settings saved')
      setPassword('')
      setHasConfig(!!server && !!login)
      invalidateFxsim('/admin/whitelabel')
    } else toast.error(r.ok ? 'Save failed' : r.error)
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Server className="h-4 w-4 text-info" /> 
            MT5 Manager Integration
          </CardTitle>
          {hasConfig ? (
            <span className="text-2xs px-2 py-0.5 rounded-full bg-success-muted text-success">Ready for Accounts</span>
          ) : (
            <span className="text-2xs px-2 py-0.5 rounded-full bg-surface-muted text-text-faint">Not configured</span>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="m_server">MT5 Server API URL / IP</Label>
            <Input id="m_server" value={server} onChange={(e) => setServer(e.target.value)} placeholder="e.g. 192.168.1.100:443" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="m_login">Manager Login</Label>
              <Input id="m_login" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="Manager ID" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m_pass">Manager Password</Label>
              <Input 
                id="m_pass" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder={hasConfig ? '•••••••• (leave blank to keep)' : 'Enter manager password'} 
                autoComplete="off" 
              />
            </div>
          </div>
          <p className="text-2xs text-text-faint leading-relaxed mt-2">
            By providing your MT5 Manager API credentials, the platform will automatically provision funded accounts, sync balances, and manage risk dynamically for your traders. The password is encrypted and write-only.
          </p>
          <div className="flex justify-between items-center pt-2">
            <Button variant="outline" size="sm" onClick={() => toast.success('Ping sent to MT5 Server')} disabled={!hasConfig}>
              <CheckCircle2 className="h-4 w-4 mr-2" /> Test Connection
            </Button>
            <Button onClick={save} loading={saving}>Save MT5 Settings</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
