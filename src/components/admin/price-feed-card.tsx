'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Activity } from 'lucide-react'

interface Health {
  mode: 'auto' | 'mt5' | 'yahoo'; active_source: string; status: string
  mt5_last_push_ts: number | null; mt5_age_sec: number | null; mt5_fresh: boolean
  stale_threshold: number; yahoo_last_ts: number | null; feed_failed: boolean
  symbol_count: number; secret_set: boolean; market_open: boolean
}

const STATUS_TONE: Record<string, 'success' | 'warn' | 'danger' | 'neutral'> = {
  fresh: 'success', yahoo: 'neutral', market_closed: 'neutral', stale: 'warn', offline: 'danger',
}
const STATUS_LABEL: Record<string, string> = {
  fresh: 'MT5 live', yahoo: 'Yahoo (fallback)', market_closed: 'Market closed', stale: 'MT5 stale', offline: 'MT5 offline',
}

export function PriceFeedCard() {
  const [health, setHealth] = useState<Health | null>(null)
  const [mode, setMode]     = useState<'auto' | 'mt5' | 'yahoo'>('auto')
  const [stale, setStale]   = useState('12')
  const [secret, setSecret] = useState('')
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    const res = await api.admin.priceFeedHealth()
    if (res.ok) {
      setHealth(res.data)
      setMode(res.data.mode)
      setStale(String(res.data.stale_threshold))
    }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 10_000)
    return () => clearInterval(t)
  }, [load])

  const save = async () => {
    setSaving(true)
    const payload: Record<string, string> = { source_mode: mode, mt5_stale_secs: stale }
    if (secret.trim()) payload.mt5_ingest_secret = secret.trim()
    const res = await api.admin.priceFeedSave(payload)
    setSaving(false)
    if (res.ok) { toast.success('Price feed settings saved'); setSecret(''); load() }
    else toast.error(res.ok ? 'Save failed' : res.error)
  }

  const forceRefresh = async () => {
    setRefreshing(true)
    const res = await api.admin.forcePrices()
    setRefreshing(false)
    if (res.ok) { toast.success(res.data.message || 'Prices refreshed'); load() }
    else toast.error(res.ok ? 'Refresh failed' : res.error)
  }

  const status = health?.status ?? 'yahoo'

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><Activity className="h-4 w-4 text-accent" /> Live price feed (MT5)</CardTitle>
        <Badge tone={STATUS_TONE[status] ?? 'neutral'}>{STATUS_LABEL[status] ?? status}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Health snapshot */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <Stat label="Active source" value={health?.active_source ?? '—'} />
          <Stat label="MT5 last push" value={health?.mt5_age_sec != null ? `${health.mt5_age_sec}s ago` : 'never'} />
          <Stat label="Symbols" value={health ? String(health.symbol_count) : '—'} />
          <Stat label="Secret" value={health?.secret_set ? 'configured' : 'not set'} />
        </div>

        {!health?.secret_set && (
          <p className="text-2xs text-text-faint">
            The MT5 feed is inert until an ingestion secret is set. With no secret and mode <strong>auto</strong>, the
            platform behaves exactly as before (Yahoo). Set a secret below, then point your MT5 price service at
            <code className="mx-1">/wp-json/fxsim/v1/price-feed/ingest</code> using the <code>X-FXSIM-Feed-Key</code> header.
          </p>
        )}

        {/* Settings */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Source mode</Label>
            <select value={mode} onChange={(e) => setMode(e.target.value as 'auto'|'mt5'|'yahoo')}
              className="w-full h-10 rounded-md bg-bg-subtle border border-border-subtle px-3 text-sm">
              <option value="auto">Auto — MT5 when fresh, Yahoo fallback</option>
              <option value="mt5">MT5 only — strict (pause new trades if stale)</option>
              <option value="yahoo">Yahoo only — ignore MT5</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-stale">Staleness threshold (seconds)</Label>
            <Input id="pf-stale" inputMode="numeric" value={stale}
              onChange={(e) => setStale(e.target.value.replace(/\D/g, '') || '')} placeholder="12" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pf-secret">Ingestion secret {health?.secret_set && <span className="text-text-faint font-normal">(leave blank to keep current)</span>}</Label>
          <Input id="pf-secret" type="password" value={secret} onChange={(e) => setSecret(e.target.value)}
            placeholder={health?.secret_set ? '•••••••• (unchanged)' : 'Set a strong shared secret'} autoComplete="off" />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={save} loading={saving}>Save feed settings</Button>
          <Button variant="outline" onClick={forceRefresh} loading={refreshing}>
            <RefreshCw className="h-4 w-4" /> Force Yahoo refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-muted/30 p-3">
      <div className="text-2xs text-text-muted">{label}</div>
      <div className="text-sm font-medium mt-0.5 truncate">{value}</div>
    </div>
  )
}
