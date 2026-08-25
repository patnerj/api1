'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Save, Palette, CreditCard, Mail, Activity, ShieldCheck, SlidersHorizontal, ExternalLink } from 'lucide-react'
import { api } from '@/lib/api'
import { invalidateFxsim } from '@/lib/fxsim'
import { cn } from '@/lib/cn'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PriceFeedCard } from '@/components/admin/price-feed-card'
import { BrandingCenter } from '@/components/admin/branding-center'
import { PaymentsCenter } from '@/components/admin/payments-center'
import { EmailSettingsPanel } from '@/components/admin/email-settings-panel'
import { DemoModeCard } from '@/components/admin/demo-mode'
import { ChartSymbolMap } from '@/components/admin/chart-symbol-map'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

interface Whitelabel {
  brand_name?:        string
  brand_tagline?:     string
  primary_color?:     string
  secondary_color?:   string
  logo_url?:          string
  favicon_url?:       string
  support_email?:     string
  footer_text?:       string
  challenge_label?:   string
  funded_label?:      string
  manual_payment_instructions?: string
  manual_crypto_address?: string
  frontend_url?:      string
}

type TabKey = 'branding' | 'payments' | 'email' | 'feed' | 'security' | 'advanced'
const TABS: { key: TabKey; label: string; icon: typeof Palette }[] = [
  { key: 'branding', label: 'Branding',     icon: Palette },
  { key: 'payments', label: 'Payments',     icon: CreditCard },
  { key: 'email',    label: 'Email',        icon: Mail },
  { key: 'feed',     label: 'Trading Feed', icon: Activity },
  { key: 'security', label: 'Security',     icon: ShieldCheck },
  { key: 'advanced', label: 'Advanced',     icon: SlidersHorizontal },
]

export default function AdminSettingsPage() {
  const [draft, setDraft] = useState<Whitelabel | null>(null)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<TabKey>('branding')
  const [payTab, setPayTab] = useState<'stripe' | 'crypto' | 'confirmo'>('stripe')

  useEffect(() => {
    api.admin.whitelabelGet().then((res) => setDraft(res.ok ? (res.data as Whitelabel) : {}))
  }, [])

  const update = (k: keyof Whitelabel, v: string) => setDraft((p) => ({ ...(p || {}), [k]: v }))

  const save = async () => {
    if (!draft) return
    setSaving(true)
    // Branding identity/assets + payment secrets are owned by their dedicated panels.
    const owned = ['brand_name', 'logo_url', 'login_logo_url', 'sidebar_icon_url', 'favicon_url', 'support_email',
                   'stripe_public_key', 'stripe_secret_key', 'stripe_webhook_secret',
                   'manual_crypto_address', 'crypto_networks', 'coinpayments_priv_key',
                   'confirmo_api_key', 'confirmo_callback_secret']
    const payload = Object.fromEntries(
      Object.entries(draft as Record<string, string>).filter(([k]) => !owned.includes(k))
    )
    const res = await api.admin.whitelabelSave(payload)
    setSaving(false)
    if (res.ok && res.data.success) { toast.success('Settings saved'); invalidateFxsim('/admin/whitelabel') }
    else toast.error(res.ok ? 'Save failed' : res.error)
  }

  if (!draft) {
    return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => (
      <Card key={i} className="p-6"><Skeleton className="h-32 w-full" /></Card>
    ))}</div>
  }

  // Tabs that contain draft-backed text fields show the Save button.
  const showSave = tab === 'branding' || tab === 'advanced' || tab === 'payments'

  return (
    <div className="max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform settings</h1>
          <p className="text-sm text-text-muted mt-1">
            Configure your white-label platform — no WordPress admin required.{' '}
            <Link href="/dashboard/admin/setup" className="text-accent hover:underline">Re-run setup wizard</Link>
          </p>
        </div>
        {showSave && (
          <Button onClick={save} loading={saving}><Save className="h-4 w-4" /> Save changes</Button>
        )}
      </div>

      {/* Tab bar — horizontally scrollable on mobile */}
      <div className="border-b border-border-subtle mb-5 -mx-1 px-1 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map((t) => {
            const Icon = t.icon
            const active = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                  active ? 'border-accent text-text' : 'border-transparent text-text-muted hover:text-text',
                )}
              >
                <Icon className="h-4 w-4" /> {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Branding ── */}
      {tab === 'branding' && (
        <div className="space-y-5">
          <BrandingCenter />
          <Card>
            <CardHeader><CardTitle>Brand voice</CardTitle></CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field id="brand_tagline"    label="Tagline"            value={draft.brand_tagline}    onChange={(v) => update('brand_tagline', v)} />
              </div>
              {/* Theme colour fields removed in V10.6: they were stored but not
                  consumed anywhere in the SPA. A visible setting must do
                  something — runtime theme colours can return as a real
                  feature when CSS-variable wiring is implemented. */}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Payments (Stripe / Crypto / Confirmo sub-tabs) ── */}
      {tab === 'payments' && (
        <div className="space-y-5">
          <div className="inline-flex rounded-lg border border-border-subtle p-1 bg-surface-muted/30">
            {(['stripe', 'crypto', 'confirmo'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setPayTab(s as any)}
                className={cn(
                  'px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors',
                  payTab === s ? 'bg-surface text-text shadow-sm' : 'text-text-muted hover:text-text',
                )}
              >
                {s}
              </button>
            ))}
          </div>

          <PaymentsCenter section={payTab} />

          <Card>
            <CardHeader>
              <CardTitle>Manual payment instructions</CardTitle>
              <p className="text-2xs text-text-muted mt-1">Shown to users who pick the manual / crypto payment option on checkout.</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                <Label htmlFor="instr">General instructions</Label>
                <Textarea id="instr" rows={3} value={draft.manual_payment_instructions || ''} onChange={(e) => update('manual_payment_instructions', e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Email ── */}
      {tab === 'email' && (
        <div className="space-y-5">
          <EmailSettingsPanel />
          <Card>
            <CardContent className="py-4 text-2xs text-text-muted">
              Sender branding (name, logo, support email) comes from the <button onClick={() => setTab('branding')} className="text-accent hover:underline">Branding tab</button> automatically.
              For email broadcasts to traders, use{' '}
              <Link href="/dashboard/admin/email" className="text-accent hover:underline inline-flex items-center gap-1">Broadcast <ExternalLink className="h-3 w-3" /></Link>.
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Trading Feed ── */}
      {tab === 'feed' && (
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Frontend URL</CardTitle>
              <p className="text-2xs text-text-muted mt-1">
                The public address of your trader application (the Next.js frontend). Verification emails and Stripe
                checkout redirects point here. Example: <span className="font-mono">https://app.yourfirm.com</span>.
                Leave blank to use this WordPress install&apos;s own URL.
              </p>
            </CardHeader>
            <CardContent>
              <Field id="frontend_url" label="Frontend application URL" value={draft.frontend_url || ''} onChange={(v) => update('frontend_url', v)} placeholder="https://app.yourfirm.com" />
            </CardContent>
          </Card>
          <PriceFeedCard />
          <ChartSymbolMap />
        </div>
      )}

      {/* ── Security ── */}
      {tab === 'security' && (
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <p className="text-2xs text-text-muted mt-1">Account protection and access controls.</p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-text-muted">
            <p>Two-factor authentication is managed per account from the user profile. Manage administrator and trader access from the Users area.</p>
            <Link href="/dashboard/admin/users" className="inline-flex items-center gap-1.5 text-accent hover:underline">
              Manage users & roles <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <p className="text-2xs text-text-faint pt-1">Payment secret keys are stored write-only and never exposed to the browser.</p>
          </CardContent>
        </Card>
      )}

      {/* ── Advanced (white-label text overrides) ── */}
      {tab === 'advanced' && <div className="mb-5"><DemoModeCard /></div>}
      {tab === 'advanced' && (
        <Card>
          <CardHeader>
            <CardTitle>Advanced</CardTitle>
            <p className="text-2xs text-text-muted mt-1">Footer text shown on your marketing site.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Challenge/Funded label overrides removed in V10.6 — stored but
                never consumed (placebo settings erode buyer trust). */}
            <div className="space-y-1.5">
              <Label htmlFor="footer_text">Footer text</Label>
              <Textarea id="footer_text" rows={2} value={draft.footer_text || ''} onChange={(e) => update('footer_text', e.target.value)} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Field({ id, label, value, onChange, placeholder }: {
  id: string; label: string; value: string | undefined; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}
