'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { invalidateFxsim } from '@/lib/fxsim'
import { cn } from '@/lib/cn'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { BrandingCenter } from '@/components/admin/branding-center'
import { PaymentsCenter } from '@/components/admin/payments-center'
import { EmailSettingsPanel } from '@/components/admin/email-settings-panel'
import { PriceFeedCard } from '@/components/admin/price-feed-card'
import {
  Palette, CreditCard, Mail, Activity, Trophy, Rocket,
  ArrowLeft, ArrowRight, CheckCircle2, PartyPopper, Link2, Save, AlertTriangle, ChevronRight, ShieldCheck
} from 'lucide-react'

const STEPS = [
  { key: 'connection', label: 'Connection',     icon: Link2,      blurb: 'Specify where your trader app lives — required for registration, email verification, and checkout redirect.' },
  { key: 'branding',   label: 'Branding',       icon: Palette,    blurb: 'Customize company name, light/dark logos, sidebar icon, and browser favicon.' },
  { key: 'payments',   label: 'Payments',       icon: CreditCard, blurb: 'Configure Stripe, crypto deposit addresses, and Confirmo checkout gateways.' },
  { key: 'email',      label: 'Email / SMTP',   icon: Mail,       blurb: 'Set up authenticated SMTP mail delivery for login credentials, receipts, and payout notices.' },
  { key: 'feed',       label: 'Trading Feed',   icon: Activity,   blurb: 'Select real-time market data source — live MT5 gateway or synthetic institutional provider.' },
  { key: 'plan',       label: 'First Challenge',icon: Trophy,     blurb: 'Create your initial evaluation challenge product available for purchase.' },
  { key: 'launch',     label: 'Launch Ready',   icon: Rocket,     blurb: 'Audit system health, verify security rules, and launch your live proprietary trading firm.' },
] as const

export default function AdminSetupWizardPage() {
  const [step, setStep] = useState(0)
  const [frontendUrlSet, setFrontendUrlSet] = useState(false)
  const current = STEPS[step]
  const Icon = current.icon

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      
      {/* Breadcrumbs & Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-gray-400 font-mono mb-2">
          <Link href="/admin" className="hover:text-emerald-400 transition-colors">Admin</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-200">Onboarding Wizard</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              Platform Setup &amp; Onboarding
              <Badge tone="accent" size="sm" className="font-mono">Step {step + 1} of {STEPS.length}</Badge>
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Complete these foundational steps to launch your whitelabel proprietary trading firm. Every step saves independently.
            </p>
          </div>

          <Link href="/admin">
            <Button variant="outline" size="sm" className="text-xs border-[#1F2937] hover:border-slate-700">
              Exit to Command Center
            </Button>
          </Link>
        </div>
      </div>

      {/* Stepper Progress Indicator */}
      <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="relative">
          <div className="absolute top-4 left-0 w-full h-1 bg-[#1F2937] rounded-full hidden md:block" />
          <div
            className="absolute top-4 left-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500 hidden md:block"
            style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
          />

          <div className="relative flex justify-between gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-none">
            {STEPS.map((s, i) => {
              const SIcon = s.icon
              const done = i < step
              const active = i === step

              return (
                <button
                  key={s.key}
                  onClick={() => setStep(i)}
                  className="relative flex flex-col items-center gap-2 group min-w-[4.5rem] focus:outline-none"
                >
                  <div
                    className={cn(
                      'h-9 w-9 rounded-xl flex items-center justify-center border-2 transition-all duration-300 z-10 shrink-0 shadow-md',
                      active
                        ? 'border-emerald-500 bg-[#0B0F19] text-emerald-400 ring-4 ring-emerald-500/20 shadow-emerald-500/10 scale-105'
                        : done
                        ? 'border-emerald-500/60 bg-emerald-500 text-slate-950 font-bold'
                        : 'border-[#1F2937] bg-[#0B0F19] text-gray-500 group-hover:border-slate-700 group-hover:text-gray-300'
                    )}
                  >
                    {done ? <CheckCircle2 className="h-4 w-4" /> : <SIcon className="h-4 w-4" />}
                  </div>
                  <div
                    className={cn(
                      'text-[11px] font-mono whitespace-nowrap transition-colors hidden md:block',
                      active ? 'text-white font-bold' : done ? 'text-emerald-400' : 'text-gray-500 group-hover:text-gray-300'
                    )}
                  >
                    {s.label}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Step Header Title Box */}
      <div className="flex items-center gap-3 p-4 rounded-xl border border-[#1F2937] bg-[#111827]/80">
        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="font-bold text-base text-gray-100">{step + 1}. {current.label}</div>
          <div className="text-xs text-gray-400">{current.blurb}</div>
        </div>
      </div>

      {/* Step Content */}
      <div className="space-y-6">
        {current.key === 'connection' && <ConnectionStep onSetChange={setFrontendUrlSet} />}
        {current.key === 'branding' && <BrandingCenter />}
        {current.key === 'payments' && <PaymentsCenter />}
        {current.key === 'email'    && <EmailSettingsPanel />}
        {current.key === 'feed'     && <PriceFeedCard />}
        {current.key === 'plan'     && <FirstChallengeStep />}
        {current.key === 'launch'   && <LaunchStep frontendUrlSet={frontendUrlSet} />}
      </div>

      {/* Wizard Footer Navigation Controls */}
      <div className="flex items-center justify-between pt-4 border-t border-[#1F2937]/70">
        <Button
          variant="outline"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="gap-2 text-xs border-[#1F2937] hover:border-slate-700"
        >
          <ArrowLeft className="h-4 w-4" /> Previous Step
        </Button>

        {step < STEPS.length - 1 ? (
          <Button
            variant="primary"
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            disabled={current.key === 'connection' && !frontendUrlSet}
            className="gap-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-emerald-500/20 shadow-lg"
          >
            Continue Next <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Link href="/admin">
            <Button
              variant="primary"
              className="gap-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-emerald-500/20 shadow-lg"
            >
              <CheckCircle2 className="h-4 w-4" /> Go to Admin Command Center
            </Button>
          </Link>
        )}
      </div>

    </div>
  )
}

// ── Step 1: Connection — Frontend App URL ────────────────────────────────────
function ConnectionStep({ onSetChange }: { onSetChange: (set: boolean) => void }) {
  const [url, setUrl] = useState('')
  const [saved, setSaved] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.admin.whitelabelGet().then((r) => {
      if (r.ok) {
        const v = (r.data as Record<string, string>).frontend_url || ''
        setUrl(v)
        setSaved(v)
        onSetChange(!!v)
      }
      setLoading(false)
    })
  }, [onSetChange])

  const valid = /^https?:\/\/.+\..+/.test(url.trim())

  const save = async () => {
    if (!valid) {
      toast.error('Please enter a valid full URL, e.g. https://app.yourfirm.com')
      return
    }
    setSaving(true)
    const clean = url.trim().replace(/\/+$/, '')
    const r = await api.admin.whitelabelSave({ frontend_url: clean })
    setSaving(false)
    if (r.ok && r.data.success) {
      setSaved(clean)
      setUrl(clean)
      onSetChange(true)
      invalidateFxsim('/admin/whitelabel')
      toast.success('Frontend Application URL saved successfully!')
    } else {
      toast.error(r.ok ? 'Save failed' : r.error)
    }
  }

  return (
    <Card className="bg-[#111827] border-[#1F2937]">
      <CardHeader className="border-b border-[#1F2937]/60 pb-4">
        <CardTitle className="text-base text-gray-100 flex items-center gap-2">
          <Link2 className="h-4 w-4 text-emerald-400" />
          Frontend Trader Application URL
        </CardTitle>
        <CardDescription className="text-xs text-gray-400">
          The public HTTPS domain where your traders log in and trade. All email verification links, password resets, and Stripe checkout return URLs dynamically redirect here.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        {loading ? (
          <div className="h-10 w-full rounded-md bg-[#0B0F19] animate-pulse" />
        ) : (
          <>
            <div className="space-y-1.5 max-w-xl">
              <Label htmlFor="frontend_url">Trader Portal Domain / URL</Label>
              <Input
                id="frontend_url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://app.yourfirm.com"
                className="font-mono text-xs"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={save}
                loading={saving}
                disabled={!valid || url.trim().replace(/\/+$/, '') === saved}
                className="text-xs gap-1.5 shadow-emerald-500/20"
              >
                {!saving && <Save className="h-3.5 w-3.5" />}
                Save Application URL
              </Button>

              {saved ? (
                <span className="text-xs text-emerald-400 inline-flex items-center gap-1.5 font-mono">
                  <CheckCircle2 className="h-4 w-4" /> Active: {saved}
                </span>
              ) : (
                <span className="text-xs text-amber-400 inline-flex items-center gap-1.5 font-mono">
                  <AlertTriangle className="h-4 w-4" /> Required to unlock next step
                </span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ── Step 6: First Challenge Plan Creator ─────────────────────────────────────
function FirstChallengeStep() {
  const [existing, setExisting] = useState<number | null>(null)
  const [name, setName] = useState('100K Starter Evaluation')
  const [size, setSize] = useState('100000')
  const [price, setPrice] = useState('499')
  const [target, setTarget] = useState('8')
  const [maxDd, setMaxDd] = useState('10')
  const [dailyDd, setDailyDd] = useState('5')
  const [split, setSplit] = useState('80')
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState(false)

  useEffect(() => {
    api.admin.plansList().then((r) => {
      if (r.ok && Array.isArray(r.data)) setExisting(r.data.length)
    })
  }, [])

  const create = async () => {
    setSaving(true)
    const res = await api.admin.planSave({
      name,
      account_size: Number(size),
      price: Number(price),
      phases: 2,
      p1_profit_target: Number(target),
      p1_daily_dd: Number(dailyDd),
      p1_max_dd: Number(maxDd),
      p2_profit_target: 5,
      p2_daily_dd: Number(dailyDd),
      p2_max_dd: Number(maxDd),
      funded_profit_split: Number(split),
      is_active: 1,
    } as Record<string, unknown>)
    setSaving(false)
    if (res.ok) {
      setCreated(true)
      invalidateFxsim('/admin/plans')
      invalidateFxsim('/challenge/plans')
      toast.success('Initial challenge product created and ready for checkout!')
    } else {
      toast.error(res.ok ? 'Failed to create challenge' : res.error)
    }
  }

  return (
    <Card className="bg-[#111827] border-[#1F2937]">
      <CardHeader className="border-b border-[#1F2937]/60 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-gray-100 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-emerald-400" />
            Create Your First Challenge Product
          </CardTitle>
          {existing !== null && existing > 0 && (
            <Badge tone="success" size="sm" className="font-mono">{existing} Plans Already Active</Badge>
          )}
        </div>
        <CardDescription className="text-xs text-gray-400">
          Provision a flagship challenge product that traders can purchase and trade immediately upon launch.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Challenge Plan Title</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Price (USD)</Label>
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label>Starting Balance ($)</Label>
            <Input type="number" value={size} onChange={(e) => setSize(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Phase 1 Profit Target (%)</Label>
            <Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Max Drawdown (%)</Label>
            <Input type="number" value={maxDd} onChange={(e) => setMaxDd(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Daily Drawdown (%)</Label>
            <Input type="number" value={dailyDd} onChange={(e) => setDailyDd(e.target.value)} />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Funded Profit Split (%)</Label>
            <Input type="number" value={split} onChange={(e) => setSplit(e.target.value)} />
          </div>
        </div>

        <p className="text-xs text-gray-500 font-mono pt-2">
          You can configure multi-phase rules, scaling parameters, and IP matching guardrails later in the <Link href="/admin/config" className="text-emerald-400 hover:underline">Plan Builder</Link>.
        </p>

        <div className="flex justify-end pt-2">
          {created ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
              <CheckCircle2 className="h-4 w-4" /> Challenge Created &amp; Available
            </span>
          ) : (
            <Button variant="primary" size="sm" onClick={create} loading={saving} className="text-xs gap-1.5 shadow-emerald-500/20">
              <Trophy className="h-3.5 w-3.5" /> Create Initial Challenge
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Step 7: Launch & Health Diagnostics ──────────────────────────────────────
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
    api.admin.whitelabelGet().then((r) => {
      if (r.ok && (r.data as Record<string, string>).setup_completed === '1') setDone(true)
    })
  }, [])

  const finish = async () => {
    if (!frontendUrlSet) {
      toast.error('Set your Frontend URL in the Connection step before finishing.')
      return
    }
    const r = await api.admin.whitelabelSave({ setup_completed: '1' })
    if (r.ok) {
      setDone(true)
      invalidateFxsim('/admin/whitelabel')
      toast.success('Platform setup completed! Welcome aboard your new prop firm! 🎉')
    }
  }

  return (
    <Card className="bg-[#111827] border-[#1F2937]">
      <CardContent className="py-12 text-center space-y-6">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10">
          <PartyPopper className="h-8 w-8" />
        </div>

        <div className="space-y-2 max-w-md mx-auto">
          <div className="text-xl font-bold text-white">
            {done ? 'Your Prop Firm Platform is Live-Ready!' : 'Almost Ready for Live Launch'}
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            {score !== null && (
              <>Current platform telemetry score: <strong className={cn('font-bold', score >= 90 ? 'text-emerald-400' : score >= 70 ? 'text-amber-400' : 'text-red-400')}>{score}/100</strong>. </>
            )}
            {warnings.length > 0 ? (
              <>Recommended items to check before launching traffic: {warnings.join(', ')}. Inspect the <Link href="/admin/operations" className="text-emerald-400 hover:underline">Operations Hub</Link> for detailed metrics.</>
            ) : (
              'All core infrastructure services are verified and operational.'
            )}
          </p>

          {!frontendUrlSet && !done && (
            <p className="text-xs text-amber-400 inline-flex items-center gap-1.5 font-mono pt-2">
              <AlertTriangle className="h-4 w-4" /> Frontend URL is not configured — please revisit Step 1.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link href="/admin/operations">
            <Button variant="outline" size="sm" className="text-xs border-[#1F2937] hover:border-slate-700">
              <Activity className="h-3.5 w-3.5 mr-1 text-emerald-400" /> Open System Telemetry
            </Button>
          </Link>

          {!done ? (
            <Button
              variant="primary"
              size="sm"
              onClick={finish}
              disabled={!frontendUrlSet}
              className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5 shadow-emerald-500/20"
            >
              <Rocket className="h-3.5 w-3.5" /> Mark Setup as Completed
            </Button>
          ) : (
            <Link href="/admin">
              <Button
                variant="primary"
                size="sm"
                className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5 shadow-emerald-500/20"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Enter Admin Command Center
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
