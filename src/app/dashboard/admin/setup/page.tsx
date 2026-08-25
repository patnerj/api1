'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { invalidateFxsim } from '@/lib/fxsim'
import { cn } from '@/lib/cn'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { BrandingCenter } from '@/components/admin/branding-center'
import { PaymentsCenter } from '@/components/admin/payments-center'
import { EmailSettingsPanel } from '@/components/admin/email-settings-panel'
import { PriceFeedCard } from '@/components/admin/price-feed-card'
import {
  Palette, CreditCard, Mail, Activity, Trophy, Rocket,
  ArrowLeft, ArrowRight, CheckCircle2, PartyPopper, Link2, Save, AlertTriangle,
} from 'lucide-react'

const STEPS = [
  { key: 'connection', label: 'Connection',     icon: Link2,      blurb: 'Tell the platform where your trader app lives — required for verification emails and checkout.' },
  { key: 'branding', label: 'Branding',        icon: Palette,    blurb: 'Make the platform yours — name, logos, favicon.' },
  { key: 'payments', label: 'Payments',        icon: CreditCard, blurb: 'Connect Stripe and/or crypto so traders can pay you.' },
  { key: 'email',    label: 'Email',           icon: Mail,       blurb: 'Connect SMTP so verification and receipt emails reach inboxes.' },
  { key: 'feed',     label: 'Trading Feed',    icon: Activity,   blurb: 'Choose your price source — live MT5 or the built-in fallback.' },
  { key: 'plan',     label: 'First Challenge', icon: Trophy,     blurb: 'Create the first challenge traders can buy.' },
  { key: 'launch',   label: 'Launch',          icon: Rocket,     blurb: 'Final checks — then you are live.' },
] as const

export default function SetupWizardPage() {
  const [step, setStep] = useState(0)
  // BUG-008: the Frontend URL must be saved before traders can register, or
  // verification emails fall back to the backend domain. Track whether it is set
  // so we can gate the Connection step's "Next" and the final completion.
  const [frontendUrlSet, setFrontendUrlSet] = useState(false)
  const current = STEPS[step]
  const Icon = current.icon

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform setup</h1>
        <p className="text-sm text-text-muted mt-1">
          A few short steps to launch your prop firm — no documentation needed. You can leave and come back anytime; every step saves independently.
        </p>
      </div>

      {/* Stepper */}
      <div className="relative mb-8 mt-4">
        <div className="absolute top-4 left-0 w-full h-0.5 bg-border-subtle rounded-full hidden md:block" />
        <div className="absolute top-4 left-0 h-0.5 bg-accent rounded-full transition-all duration-500 hidden md:block" style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} />
        <div className="relative flex justify-between gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
          {STEPS.map((s, i) => {
            const SIcon = s.icon
            const done = i < step
            const active = i === step
            return (
              <button
                key={s.key}
                onClick={() => setStep(i)}
                className={cn(
                  'relative flex flex-col items-center gap-2 group min-w-[4rem]',
                )}
              >
                <div className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 z-10 shrink-0 shadow-sm',
                  active ? 'border-accent bg-surface text-accent ring-4 ring-accent/10'
                    : done ? 'border-accent bg-accent text-accent-foreground'
                    : 'border-border bg-surface text-text-muted group-hover:border-border-strong',
                )}>
                  {done ? <CheckCircle2 className="h-4 w-4" /> : <SIcon className="h-3.5 w-3.5" />}
                </div>
                <div className={cn(
                  'text-2xs font-medium whitespace-nowrap transition-colors hidden md:block',
                  active ? 'text-text font-semibold' : done ? 'text-text' : 'text-text-muted group-hover:text-text'
                )}>
                  {s.label}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Step header */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center"><Icon className="h-5 w-5" /></div>
        <div>
          <div className="font-semibold">{step + 1}. {current.label}</div>
          <div className="text-2xs text-text-muted">{current.blurb}</div>
        </div>
      </div>

      {/* Step content — reuses the same panels as Settings, so nothing is duplicated */}
      {current.key === 'connection' && <ConnectionStep onSetChange={setFrontendUrlSet} />}
      {current.key === 'branding' && <BrandingCenter />}
      {current.key === 'payments' && <PaymentsCenter />}
      {current.key === 'email'    && <EmailSettingsPanel />}
      {current.key === 'feed'     && <PriceFeedCard />}
      {current.key === 'plan'     && <FirstChallengeStep />}
      {current.key === 'launch'   && <LaunchStep frontendUrlSet={frontendUrlSet} />}

      {/* Nav */}
      <div className="flex items-center justify-between pt-1">
        <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            disabled={current.key === 'connection' && !frontendUrlSet}
          >
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  )
}

// ── Step 1: Connection — capture the Frontend (trader app) URL ───────────────
// BUG-008: this MUST be saved before any trader can register, otherwise
// verification emails and Stripe redirects fall back to the WordPress/backend
// domain. The step reports its set-state up so the wizard can gate progression.
function ConnectionStep({ onSetChange }: { onSetChange: (set: boolean) => void }) {
  const [url, setUrl] = useState('')
  const [saved, setSaved] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.admin.whitelabelGet().then((r) => {
      if (r.ok) {
        const v = (r.data as Record<string, string>).frontend_url || ''
        setUrl(v); setSaved(v); onSetChange(!!v)
      }
      setLoading(false)
    })
  }, [onSetChange])

  const valid = /^https?:\/\/.+\..+/.test(url.trim())

  const save = async () => {
    if (!valid) { toast.error('Enter a full URL, e.g. https://app.yourfirm.com'); return }
    setSaving(true)
    const clean = url.trim().replace(/\/+$/, '')
    const r = await api.admin.whitelabelSave({ frontend_url: clean })
    setSaving(false)
    if (r.ok && r.data.success) {
      setSaved(clean); setUrl(clean); onSetChange(true)
      invalidateFxsim('/admin/whitelabel')
      toast.success('Frontend URL saved')
    } else toast.error(r.ok ? 'Save failed' : r.error)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Frontend application URL</CardTitle>
        <p className="text-2xs text-text-muted mt-1">
          The public address where your traders access the platform (your Next.js app). Verification emails,
          password-reset links, and Stripe checkout redirects all point here. This is <strong>required</strong> — until
          it is set, the platform cannot send correct verification links. Example:{' '}
          <span className="font-mono">https://app.yourfirm.com</span>.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? <div className="h-10 w-full rounded-md bg-surface-muted animate-pulse" /> : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="frontend_url">Frontend URL</Label>
              <Input id="frontend_url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://app.yourfirm.com" />
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={save} loading={saving} disabled={!valid || url.trim().replace(/\/+$/, '') === saved}>
                {!saving && <Save className="h-4 w-4" />} Save
              </Button>
              {saved
                ? <span className="text-2xs text-success inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Set to {saved}</span>
                : <span className="text-2xs text-warn inline-flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Not set — required to continue</span>}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ── Step: minimal first-challenge form (full editor lives in Challenges) ───
function FirstChallengeStep() {
  const [existing, setExisting] = useState<number | null>(null)
  const [name, setName] = useState('Starter Challenge')
  const [size, setSize] = useState('10000')
  const [price, setPrice] = useState('99')
  const [target, setTarget] = useState('8')
  const [maxDd, setMaxDd] = useState('10')
  const [dailyDd, setDailyDd] = useState('5')
  const [split, setSplit] = useState('80')
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState(false)

  useEffect(() => { api.admin.plansList().then((r) => { if (r.ok) setExisting(r.data.length) }) }, [])

  const create = async () => {
    setSaving(true)
    const res = await api.admin.planSave({
      name, account_size: Number(size), price: Number(price), phases: 1,
      p1_profit_target: Number(target), p1_daily_dd: Number(dailyDd), p1_max_dd: Number(maxDd),
      funded_profit_split: Number(split), is_active: 1,
    } as Record<string, unknown>)
    setSaving(false)
    if (res.ok) { setCreated(true); invalidateFxsim('/admin/plans'); invalidateFxsim('/challenge/plans'); toast.success('Challenge created — traders can now purchase it') }
    else toast.error(res.ok ? 'Could not create the challenge' : res.error)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your first challenge</CardTitle>
        {existing !== null && existing > 0 && (
          <p className="text-2xs text-success mt-1">You already have {existing} challenge plan{existing === 1 ? '' : 's'} — you can skip this step or add another.</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 space-y-1.5"><Label>Challenge name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Price (USD)</Label><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1.5"><Label>Account size ($)</Label><Input type="number" value={size} onChange={(e) => setSize(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Profit target %</Label><Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Max drawdown %</Label><Input type="number" value={maxDd} onChange={(e) => setMaxDd(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Daily drawdown %</Label><Input type="number" value={dailyDd} onChange={(e) => setDailyDd(e.target.value)} /></div>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="space-y-1.5"><Label>Funded profit split %</Label><Input type="number" value={split} onChange={(e) => setSplit(e.target.value)} /></div>
        </div>
        <p className="text-2xs text-text-faint">This creates a simple one-phase evaluation. Fine-tune rules, phases, and limits anytime in <Link href="/dashboard/admin/challenges" className="text-accent hover:underline">Challenges</Link>.</p>
        <div className="flex justify-end">
          {created
            ? <span className="inline-flex items-center gap-1.5 text-sm text-success"><CheckCircle2 className="h-4 w-4" /> Challenge created</span>
            : <Button onClick={create} loading={saving}>Create challenge</Button>}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Step 6: launch — quick health summary + completion ───────────────────────
function LaunchStep({ frontendUrlSet }: { frontendUrlSet: boolean }) {
  const [score, setScore] = useState<number | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [done, setDone] = useState(false)

  useEffect(() => {
    api.admin.health(false).then((r) => {
      if (!r.ok) return
      setScore(r.data.score)
      setWarnings(Object.values(r.data.items).filter((i) => i.state !== 'ok').map((i) => i.label))
    })
    api.admin.whitelabelGet().then((r) => { if (r.ok && (r.data as Record<string, string>).setup_completed === '1') setDone(true) })
  }, [])

  const finish = async () => {
    // BUG-008: never complete setup without a Frontend URL — otherwise the first
    // registration sends a verification link on the backend domain.
    if (!frontendUrlSet) { toast.error('Set your Frontend URL in the Connection step before finishing.'); return }
    const r = await api.admin.whitelabelSave({ setup_completed: '1' })
    if (r.ok) { setDone(true); invalidateFxsim('/admin/whitelabel'); toast.success('Setup complete — welcome aboard! 🎉') }
  }

  return (
    <Card>
      <CardContent className="py-8 text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-full bg-accent/10 text-accent flex items-center justify-center">
          <PartyPopper className="h-6 w-6" />
        </div>
        <div>
          <div className="text-lg font-semibold">{done ? 'Your platform is live-ready' : 'Almost there'}</div>
          <p className="text-sm text-text-muted mt-1 max-w-md mx-auto">
            {score !== null && <>Current system health: <span className={cn('font-semibold', score >= 90 ? 'text-success' : score >= 70 ? 'text-warn' : 'text-danger')}>{score}/100</span>. </>}
            {warnings.length > 0
              ? <>Worth reviewing before launch: {warnings.join(', ')} — see the <Link href="/dashboard/admin/health" className="text-accent hover:underline">Health panel</Link> for guidance.</>
              : 'All checks look good.'}
          </p>
          {!frontendUrlSet && !done && (
            <p className="text-2xs text-warn mt-2 inline-flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> Frontend URL is not set — go back to the Connection step to finish.
            </p>
          )}
        </div>
        <div className="flex items-center justify-center gap-2">
          <Link href="/dashboard/admin/health"><Button variant="outline">Open Health panel</Button></Link>
          {!done && <Button onClick={finish} disabled={!frontendUrlSet}>Finish setup</Button>}
          {done && <Link href="/dashboard/admin"><Button>Go to admin dashboard</Button></Link>}
        </div>
      </CardContent>
    </Card>
  )
}
