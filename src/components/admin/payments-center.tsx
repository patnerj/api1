'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { invalidateFxsim } from '@/lib/fxsim'
import type { CryptoNetwork, StripeStatus } from '@/types/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import { CreditCard, Bitcoin, CheckCircle2, XCircle, Copy as CopyIcon } from 'lucide-react'

const ALL_NETWORKS = ['TRC20', 'BEP20', 'ERC20', 'BTC', 'ETH'] as const

export function PaymentsCenter({ section = 'all' }: { section?: 'all' | 'stripe' | 'crypto' | 'confirmo' }) {
  return (
    <div className="space-y-5">
      {(section === 'all' || section === 'stripe') && <StripeCard />}
      {(section === 'all' || section === 'crypto') && <CryptoCard />}
      {(section === 'all' || section === 'confirmo') && <ConfirmoCard />}
    </div>
  )
}

// ── Stripe (keys write-only, status validated server-side) ───────────────────
function StripeCard() {
  const [status, setStatus] = useState<StripeStatus | null>(null)
  const [pub, setPub] = useState('')
  const [secret, setSecret] = useState('')
  const [webhook, setWebhook] = useState('')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  const loadStatus = () => { api.admin.stripeStatus().then((r) => { if (r.ok) setStatus(r.data) }) }
  useEffect(() => {
    api.admin.whitelabelGet().then((r) => { if (r.ok) setPub(r.data.stripe_public_key || '') })
    loadStatus()
  }, [])

  const save = async () => {
    setSaving(true)
    // Publishable key is non-secret. Secret + webhook are only sent when entered
    // (empty = leave unchanged), so we never blank stored secrets.
    const payload: Record<string, string> = { stripe_public_key: pub }
    if (secret.trim())  payload.stripe_secret_key = secret.trim()
    if (webhook.trim()) payload.stripe_webhook_secret = webhook.trim()
    const r = await api.admin.whitelabelSave(payload)
    setSaving(false)
    if (r.ok) {
      toast.success('Stripe settings saved')
      setSecret(''); setWebhook('')
      invalidateFxsim('/admin/whitelabel'); invalidateFxsim('/payment/config')
      loadStatus()
    } else toast.error(r.ok ? 'Save failed' : r.error)
  }

  const test = async () => { setTesting(true); const r = await api.admin.stripeStatus(); setTesting(false); if (r.ok) { setStatus(r.data); r.data.connected ? toast.success(r.data.message) : toast.error(r.data.message) } }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-info" /> Stripe</CardTitle>
        {status && <ModeBadge status={status} />}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="pk">Publishable key</Label>
          <Input id="pk" value={pub} onChange={(e) => setPub(e.target.value)} placeholder="pk_live_… or pk_test_…" />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="sk">Secret key {status?.has_secret_key && <span className="text-2xs text-success">• configured</span>}</Label>
            <Input id="sk" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder={status?.has_secret_key ? '•••••••• (leave blank to keep)' : 'sk_live_… or sk_test_…'} autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="whk">Webhook secret {status?.has_webhook_secret && <span className="text-2xs text-success">• configured</span>}</Label>
            <Input id="whk" type="password" value={webhook} onChange={(e) => setWebhook(e.target.value)} placeholder={status?.has_webhook_secret ? '•••••••• (leave blank to keep)' : 'whsec_…'} autoComplete="off" />
          </div>
        </div>
        <p className="text-2xs text-text-faint leading-relaxed">
          Secret and webhook keys are write-only — they are never sent back to the browser.
        </p>

        {/* Webhook URL manager — buyers can configure Stripe without documentation */}
        {status?.webhook_url && (
          <div className="rounded-lg border border-border-subtle bg-surface-muted/30 p-3.5 space-y-2.5">
            <div className="text-sm font-medium">Webhook setup</div>
            <div className="flex items-stretch gap-2">
              <pre className="flex-1 text-2xs text-text whitespace-pre-wrap break-all font-mono bg-surface px-3 py-2 rounded-md border border-border-subtle">{status.webhook_url}</pre>
              <button
                onClick={() => { try { navigator.clipboard.writeText(status.webhook_url!); toast.success('Webhook URL copied') } catch { /* noop */ } }}
                className="shrink-0 px-2.5 rounded-md border border-border-subtle text-text-muted hover:text-accent hover:border-accent/50 transition-colors"
                aria-label="Copy webhook URL"
              >
                <CopyIcon className="h-4 w-4" />
              </button>
            </div>
            <ol className="text-2xs text-text-muted space-y-1 list-decimal list-inside leading-relaxed">
              <li>In your Stripe dashboard open <span className="text-text">Developers → Webhooks → Add endpoint</span>.</li>
              <li>Paste the URL above and select the <span className="text-text">checkout.session.completed</span> event (or "all events").</li>
              <li>Copy the <span className="text-text">signing secret</span> Stripe shows you (starts with <span className="font-mono">whsec_</span>) and paste it into the Webhook secret field here, then Save.</li>
            </ol>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={test} loading={testing}>
            {!testing && <CheckCircle2 className="h-4 w-4" />} Test connection
          </Button>
          <Button onClick={save} loading={saving}>Save Stripe settings</Button>
        </div>
        {status?.message && (
          <div className={`flex items-center gap-2 text-2xs ${status.connected ? 'text-success' : 'text-text-muted'}`}>
            {status.connected ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
            {status.message}{status.account ? ` (${status.account})` : ''}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ModeBadge({ status }: { status: StripeStatus }) {
  if (!status.has_secret_key) return <span className="text-2xs px-2 py-0.5 rounded-full bg-surface-muted text-text-faint">Not configured</span>
  const live = status.mode === 'live'
  return (
    <span className={`text-2xs px-2 py-0.5 rounded-full ${status.connected ? (live ? 'bg-success-muted text-success' : 'bg-info-muted text-info') : 'bg-danger-muted text-danger'}`}>
      {status.connected ? (live ? 'Live · connected' : 'Test · connected') : (status.mode || 'unknown')}
    </span>
  )
}

// ── Crypto multi-network manager ─────────────────────────────────────────────
function CryptoCard() {
  const [nets, setNets] = useState<CryptoNetwork[] | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { api.admin.cryptoGet().then((r) => { if (r.ok) setNets(normalize(r.data.networks)) }) }, [])

  const normalize = (list: CryptoNetwork[]): CryptoNetwork[] =>
    ALL_NETWORKS.map((net) => {
      const found = list.find((n) => (n.network || '').toUpperCase() === net)
      return found
        ? { network: net, address: found.address || '', label: found.label || net, instructions: found.instructions || '', enabled: !!found.enabled }
        : { network: net, address: '', label: net, instructions: '', enabled: false }
    })

  const update = (net: string, patch: Partial<CryptoNetwork>) =>
    setNets((p) => (p || []).map((n) => (n.network === net ? { ...n, ...patch } : n)))

  const save = async () => {
    if (!nets) return
    setSaving(true)
    // Only persist networks that have an address; enabled implies a non-empty address.
    const payload = nets.map((n) => ({ ...n, enabled: !!n.enabled && n.address.trim() !== '' }))
    const r = await api.admin.cryptoSave(payload)
    setSaving(false)
    if (r.ok) { toast.success('Crypto networks saved'); invalidateFxsim('/payment/config') }
    else toast.error(r.ok ? 'Save failed' : r.error)
  }

  if (!nets) return <Card><CardContent className="p-6 text-sm text-text-muted">Loading crypto networks…</CardContent></Card>

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Bitcoin className="h-4 w-4 text-warn" /> Crypto payment networks</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-2xs text-text-faint">Enable the networks you accept and set a wallet address for each. Enabled networks appear to traders with a QR code and copy button.</p>
        {nets.map((n) => (
          <div key={n.network} className={`rounded-lg border p-3 space-y-2.5 ${n.enabled ? 'border-accent/40 bg-surface-muted/20' : 'border-border-subtle'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm tabular">{n.network}</span>
                {n.enabled && <span className="text-2xs text-success">• live</span>}
              </div>
              <label className="flex items-center gap-2 text-2xs text-text-muted cursor-pointer">
                <input type="checkbox" checked={!!n.enabled} onChange={(e) => update(n.network, { enabled: e.target.checked })} className="accent-accent" />
                Enabled
              </label>
            </div>
            <div className="grid sm:grid-cols-2 gap-2.5">
              <Input value={n.address} onChange={(e) => update(n.network, { address: e.target.value })} placeholder={`${n.network} wallet address`} className="text-2xs" />
              <Input value={n.label} onChange={(e) => update(n.network, { label: e.target.value })} placeholder="Display label (optional)" className="text-2xs" />
            </div>
            <Textarea rows={2} value={n.instructions} onChange={(e) => update(n.network, { instructions: e.target.value })} placeholder="Instructions shown to traders (optional) — e.g. send only USDT on this network" />
          </div>
        ))}
        <div className="flex justify-end">
          <Button onClick={save} loading={saving}>Save crypto networks</Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Confirmo ─────────────────────────────────────────────────────────────────
function ConfirmoCard() {
  const [apiKey, setApiKey] = useState('')
  const [secret, setSecret] = useState('')
  const [saving, setSaving] = useState(false)
  const [hasConfig, setHasConfig] = useState(false)

  useEffect(() => {
    api.admin.whitelabelGet().then((r: any) => {
      if (r.ok) {
        setApiKey(r.data.confirmo_api_key || '')
        setHasConfig(Boolean(r.data.confirmo_api_key_set || r.data.confirmo_callback_secret_set || r.data.confirmo_api_key || r.data.confirmo_callback_secret))
      }
    })
  }, [])

  const save = async () => {
    setSaving(true)
    const payload: Record<string, string> = { confirmo_api_key: apiKey }
    if (secret.trim()) payload.confirmo_callback_secret = secret.trim()
    const r = await api.admin.whitelabelSave(payload)
    setSaving(false)
    if (r.ok) {
      toast.success('Confirmo settings saved')
      setSecret('')
      setHasConfig(!!apiKey || !!secret)
      invalidateFxsim('/admin/whitelabel')
    } else toast.error(r.ok ? 'Save failed' : r.error)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><Bitcoin className="h-4 w-4 text-info" /> Confirmo (Automated Crypto)</CardTitle>
        {hasConfig ? <span className="text-2xs px-2 py-0.5 rounded-full bg-success-muted text-success">Configured</span> : <span className="text-2xs px-2 py-0.5 rounded-full bg-surface-muted text-text-faint">Not configured</span>}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="c_api">API Key</Label>
          <Input id="c_api" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Confirmo API key" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c_sec">Callback Secret / Webhook Secret</Label>
          <Input id="c_sec" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder={hasConfig ? '•••••••• (leave blank to keep)' : 'Enter your callback secret'} autoComplete="off" />
        </div>
        <p className="text-2xs text-text-faint leading-relaxed">
          The webhook URL to configure in your Confirmo dashboard is: <span className="font-mono text-text bg-surface px-1.5 py-0.5 rounded">https://YOUR_DOMAIN/wp-json/fxsim/v1/payment/confirmo-callback</span>
        </p>
        <div className="flex justify-end pt-2">
          <Button onClick={save} loading={saving}>Save Confirmo settings</Button>
        </div>
      </CardContent>
    </Card>
  )
}
