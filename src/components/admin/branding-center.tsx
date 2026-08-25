'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { invalidateFxsim } from '@/lib/fxsim'
import { useBranding } from '@/store/branding'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { UploadCloud, RotateCcw, ImageIcon, Info } from 'lucide-react'

type AssetField = 'logo' | 'login_logo' | 'sidebar_icon' | 'favicon'
const ASSETS: { field: AssetField; key: string; title: string; size: string; helper: string }[] = [
  { field: 'sidebar_icon', key: 'sidebar_icon_url', title: 'Sidebar Icon',           size: 'upload 128×128 px',  helper: 'Square mark shown in the dashboard sidebar (expanded and collapsed), rendered at 40px. Upload at 128×128 for a crisp result on high-resolution screens. Transparent PNG/WebP recommended.' },
  { field: 'login_logo',   key: 'login_logo_url',   title: 'Login Logo',              size: 'upload ≥320×80 px',  helper: 'Horizontal logo on the login screen, rendered ~36px tall. Upload at least 320×80 px (transparent PNG/SVG) so it stays sharp.' },
  { field: 'logo',         key: 'logo_url',         title: 'Brand Logo (web & email)',size: 'upload ≥400 px wide', helper: 'Horizontal logo used in the marketing site header and email headers, rendered 160–200px wide. Upload ≥400px wide for retina/email clients. Transparent background works best.' },
  { field: 'favicon',      key: 'favicon_url',      title: 'Favicon',                 size: 'upload 48×48 px',    helper: 'Square browser-tab icon, rendered at 32×32. Upload a 48×48 (or 64×64) high-contrast square mark — not the full horizontal logo — for clear visibility.' },
]

const DEFAULTS: Record<string, string> = {
  brand_name: 'LaunchAPropFirm', brand_tagline: 'The Funded Trader Platform',
  logo_url: '', login_logo_url: '', sidebar_icon_url: '', favicon_url: '',
}

export function BrandingCenter() {
  const setLive = useBranding((s) => s.set)
  const reloadBranding = useBranding((s) => s.reload)
  const [vals, setVals] = useState<Record<string, string>>({})
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<AssetField | null>(null)

  useEffect(() => {
    api.admin.whitelabelGet().then((res) => {
      if (res.ok) setVals(res.data as Record<string, string>)
      setLoaded(true)
    })
  }, [])

  const set = (k: string, v: string) => {
    setVals((p) => ({ ...p, [k]: v }))
    // Reflect immediately in the live preview store (sidebar/login update instantly).
    setLive({ [k]: v } as Partial<import('@/store/branding').Branding>)
  }

  const save = async () => {
    setSaving(true)
    const payload: Record<string, string> = {
      brand_name: vals.brand_name ?? '', brand_tagline: vals.brand_tagline ?? '',
      support_email: vals.support_email ?? '',
      logo_url: vals.logo_url ?? '', login_logo_url: vals.login_logo_url ?? '',
      sidebar_icon_url: vals.sidebar_icon_url ?? '', favicon_url: vals.favicon_url ?? '',
    }
    const res = await api.admin.whitelabelSave(payload)
    setSaving(false)
    if (res.ok) { invalidateFxsim('/admin/whitelabel'); await reloadBranding(); toast.success('Branding saved') }
    else toast.error(res.ok ? 'Save failed' : res.error)
  }

  const reset = async () => {
    setVals((p) => ({ ...p, ...DEFAULTS }))
    setLive(DEFAULTS as Partial<import('@/store/branding').Branding>)
    const res = await api.admin.whitelabelSave(DEFAULTS)
    if (res.ok) { invalidateFxsim('/admin/whitelabel'); await reloadBranding(); toast.success('Branding reset to default') }
    else toast.error(res.ok ? 'Reset failed' : res.error)
  }

  const brand = vals.brand_name || 'LaunchAPropFirm'

  if (!loaded) return <Card><CardContent className="p-6 text-sm text-text-muted">Loading branding…</CardContent></Card>

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><ImageIcon className="h-4 w-4 text-accent" /> Branding Center</CardTitle>
        <Button variant="outline" size="sm" onClick={reset}><RotateCcw className="h-4 w-4" /> Reset to default</Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Identity */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="bc-name">Company name</Label>
            <Input id="bc-name" value={vals.brand_name ?? ''} onChange={(e) => set('brand_name', e.target.value)} placeholder="Your Prop Firm" />
            <p className="text-2xs text-text-faint">Short names display better in the sidebar.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bc-support">Support email</Label>
            <Input id="bc-support" type="email" value={vals.support_email ?? ''} onChange={(e) => set('support_email', e.target.value)} placeholder="support@yourfirm.com" />
            <p className="text-2xs text-text-faint">Used in emails and support links across the platform.</p>
          </div>
        </div>

        {/* Asset uploads */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ASSETS.map((a) => (
            <AssetTile key={a.field} asset={a} url={vals[a.key] ?? ''}
              uploading={uploading === a.field}
              onUpload={async (file) => {
                setUploading(a.field)
                const res = await api.admin.brandingUpload(a.field, file)
                setUploading(null)
                if (res.ok) { set(a.key, res.data.url); toast.success(`${a.title} uploaded`); invalidateFxsim('/branding') }
                else toast.error(res.ok ? 'Upload failed' : res.error)
              }}
              onUrl={(v) => set(a.key, v)}
              onClear={() => set(a.key, '')}
            />
          ))}
        </div>

        {/* Live previews */}
        <div>
          <div className="text-2xs uppercase tracking-wider text-text-faint mb-2.5">Live preview</div>
          <div className="grid md:grid-cols-3 gap-3">
            {/* Sidebar */}
            <div className="rounded-lg border border-border-subtle overflow-hidden">
              <div className="px-3 py-2 text-2xs text-text-faint border-b border-border-subtle">Sidebar</div>
              <div className="bg-surface p-3 flex items-center gap-2.5 h-16">
                {vals.sidebar_icon_url
                  ? <img src={vals.sidebar_icon_url} alt={brand} className="h-8 w-8 rounded-lg object-contain bg-surface-muted/40 shrink-0" />
                  : <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent to-success/70 shrink-0" />}
                <span className="font-semibold text-sm truncate">{brand}</span>
              </div>
            </div>
            {/* Login */}
            <div className="rounded-lg border border-border-subtle overflow-hidden">
              <div className="px-3 py-2 text-2xs text-text-faint border-b border-border-subtle">Login</div>
              <div className="bg-surface p-4 flex flex-col items-center gap-2 h-16 justify-center">
                {(vals.login_logo_url || vals.logo_url)
                  ? <img src={vals.login_logo_url || vals.logo_url} alt={brand} className="h-7 w-auto max-w-[150px] object-contain" />
                  : <span className="font-semibold text-sm">{brand}</span>}
              </div>
            </div>
            {/* Email header */}
            <div className="rounded-lg border border-border-subtle overflow-hidden">
              <div className="px-3 py-2 text-2xs text-text-faint border-b border-border-subtle">Email header</div>
              <div className="bg-white p-3 flex items-center gap-2 h-16">
                {vals.logo_url ? <img src={vals.logo_url} alt={brand} className="h-7 w-auto max-w-[150px] object-contain" />
                  : <span className="font-semibold text-sm text-text-strong">{brand}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Buyer guidance */}
        <div className="rounded-lg border border-border-subtle bg-surface-muted/30 p-4">
          <div className="flex items-center gap-2 text-sm font-medium mb-2"><Info className="h-4 w-4 text-accent" /> Tips for best results</div>
          <ul className="space-y-1 text-2xs text-text-muted">
            <li>• Short company names display better in the sidebar.</li>
            <li>• Transparent PNG logos are recommended.</li>
            <li>• Logos should remain readable on dark backgrounds.</li>
          </ul>
        </div>

        <div className="flex justify-end">
          <Button onClick={save} loading={saving}>Save branding</Button>
        </div>
      </CardContent>
    </Card>
  )
}

function AssetTile({ asset, url, uploading, onUpload, onUrl, onClear }: {
  asset: { field: AssetField; title: string; size: string; helper: string }
  url: string; uploading: boolean
  onUpload: (f: File) => void; onUrl: (v: string) => void; onClear: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className="rounded-lg border border-border-subtle p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{asset.title}</div>
        <span className="text-2xs text-text-faint">{asset.size}</span>
      </div>
      <div className="h-16 rounded-md bg-surface-muted/40 border border-border-subtle flex items-center justify-center overflow-hidden">
        {url ? <img src={url} alt={asset.title} className="max-h-14 max-w-full object-contain" />
          : <span className="text-2xs text-text-faint">No image</span>}
      </div>
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp,image/x-icon" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); if (ref.current) ref.current.value = '' }} />
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" loading={uploading} onClick={() => ref.current?.click()}>
          <UploadCloud className="h-3.5 w-3.5" /> Upload
        </Button>
        {url && <Button variant="ghost" size="sm" onClick={onClear}>Clear</Button>}
      </div>
      <Input value={url} onChange={(e) => onUrl(e.target.value)} placeholder="…or paste an image URL" className="text-2xs" />
      <p className="text-2xs text-text-faint leading-relaxed">{asset.helper}</p>
    </div>
  )
}
