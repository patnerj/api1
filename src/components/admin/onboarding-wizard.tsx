'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Rocket, Sparkles, Paintbrush, Sliders, CheckCircle2, 
  ArrowRight, ArrowLeft, UploadCloud, Copy, Check, 
  ExternalLink, Layers, ShieldCheck, DollarSign, RefreshCw
} from 'lucide-react'
import { applyThemeAccent, THEME_PRESETS } from '@/lib/theme-accent'
import { api } from '@/lib/api'
import type { ChallengePlan } from '@/types/api'
import { toast } from 'sonner'

interface OnboardingWizardProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const STANDARD_CATALOG_PLANS: Partial<ChallengePlan>[] = [
  {
    name: '$10K Starter Evaluation',
    slug: 'starter-10k-2step',
    account_size: 10000,
    price: 99,
    plan_type: '2-step',
    phases: 2,
    p1_profit_target: 8,
    p2_profit_target: 5,
    p1_daily_dd: 5,
    p1_max_dd: 10,
    funded_profit_split: 80,
    drawdown_type: 'static',
    max_leverage: 100,
    is_active: 1
  },
  {
    name: '$25K Explorer Evaluation',
    slug: 'explorer-25k-2step',
    account_size: 25000,
    price: 199,
    plan_type: '2-step',
    phases: 2,
    p1_profit_target: 8,
    p2_profit_target: 5,
    p1_daily_dd: 5,
    p1_max_dd: 10,
    funded_profit_split: 80,
    drawdown_type: 'static',
    max_leverage: 100,
    is_active: 1
  },
  {
    name: '$50K Pro Evaluation',
    slug: 'pro-50k-2step',
    account_size: 50000,
    price: 299,
    plan_type: '2-step',
    phases: 2,
    p1_profit_target: 8,
    p2_profit_target: 5,
    p1_daily_dd: 5,
    p1_max_dd: 10,
    funded_profit_split: 80,
    drawdown_type: 'static',
    max_leverage: 100,
    is_active: 1
  },
  {
    name: '$100K Elite Evaluation',
    slug: 'elite-100k-2step',
    account_size: 100000,
    price: 499,
    plan_type: '2-step',
    phases: 2,
    p1_profit_target: 8,
    p2_profit_target: 5,
    p1_daily_dd: 5,
    p1_max_dd: 10,
    funded_profit_split: 80,
    drawdown_type: 'static',
    max_leverage: 100,
    is_active: 1
  }
]

export function OnboardingWizard({ isOpen, onClose, onSuccess }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1)
  const [copiedLink, setCopiedLink] = useState(false)
  const [isProvisioningPlans, setIsProvisioningPlans] = useState(false)
  const [plansCreatedCount, setPlansCreatedCount] = useState<number | null>(null)

  // Step 1 State: Firm details
  const [firmName, setFirmName] = useState('Apex Horizon Proprietary')
  const [supportEmail, setSupportEmail] = useState('support@apexhorizon.com')
  const [tagline, setTagline] = useState('Trade with institutional capital.')

  // Step 2 State: Branding & Theme
  const [selectedColor, setSelectedColor] = useState('#10B981')

  // Step 4 State: Frontend URL
  const [frontendUrl, setFrontendUrl] = useState('http://localhost:3000')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setFrontendUrl(window.location.origin)
    }
  }, [])

  const handleSelectColor = (hex: string) => {
    setSelectedColor(hex)
    applyThemeAccent(hex)
  }

  const handleNextStep1 = async () => {
    if (!firmName.trim()) {
      toast.error('Firm Name is required.')
      return
    }
    // Save Step 1 data
    try {
      await api.admin.whitelabelSave({
        brand_name: firmName,
        support_email: supportEmail,
        brand_tagline: tagline,
      })
    } catch {
      // Non-blocking
    }
    setCurrentStep(2)
  }

  const handleNextStep2 = async () => {
    // Save Step 2 accent
    try {
      await api.admin.whitelabelSave({
        primary_color: selectedColor,
      })
      applyThemeAccent(selectedColor)
      toast.success('Brand theme accent applied!')
    } catch {
      // Non-blocking
    }
    setCurrentStep(3)
  }

  const handleCreateCatalog = async () => {
    setIsProvisioningPlans(true)
    let created = 0
    try {
      for (const plan of STANDARD_CATALOG_PLANS) {
        const res = await api.admin.planSave({
          ...plan,
          slug: `${plan.slug}-${Date.now().toString().slice(-4)}`
        })
        if (res.ok) created++
      }
      setPlansCreatedCount(created)
      toast.success(`Standard 4-Tier Plan Catalog deployed successfully!`)
      setTimeout(() => {
        setCurrentStep(4)
      }, 600)
    } catch (err: any) {
      toast.error(err.message || 'Failed to deploy catalog.')
    } finally {
      setIsProvisioningPlans(false)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${frontendUrl}/#pricing`)
    setCopiedLink(true)
    toast.success('Public checkout catalog link copied!')
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleComplete = () => {
    onSuccess?.()
    onClose()
    toast.success('🎉 Launchpad Setup Complete! Your Prop Firm is live and ready for traders.')
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🚀 Prop Firm Founder Launchpad"
      description="Launch your turn-key proprietary trading firm in 4 simple guided steps."
      className="max-w-3xl"
      footer={
        <div className="flex items-center justify-between w-full pt-2">
          {currentStep > 1 && currentStep < 4 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
              className="border-[#1F2937] text-gray-300 gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous Step
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {currentStep === 1 && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleNextStep1}
                className="gap-1.5 shadow-emerald-500/20"
              >
                <span>Save & Choose Theme</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}

            {currentStep === 2 && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleNextStep2}
                className="gap-1.5 shadow-emerald-500/20"
              >
                <span>Deploy Plan Catalog</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}

            {currentStep === 3 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep(4)}
                className="border-[#1F2937] text-gray-400 hover:text-white"
              >
                Skip Catalog Setup
              </Button>
            )}

            {currentStep === 4 && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleComplete}
                className="gap-1.5 shadow-emerald-500/20 font-bold"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Finish & Launch Command Center</span>
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-6 py-2">
        
        {/* Step Progress Tracker */}
        <div className="grid grid-cols-4 gap-2 border-b border-[#1F2937]/80 pb-4 text-xs font-semibold">
          <div className={`flex items-center gap-2 pb-1 transition-colors ${currentStep === 1 ? 'text-emerald-400 border-b-2 border-emerald-400 font-bold' : currentStep > 1 ? 'text-gray-300' : 'text-gray-600'}`}>
            <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-mono">1</span>
            <span className="hidden sm:inline">Firm Info</span>
          </div>

          <div className={`flex items-center gap-2 pb-1 transition-colors ${currentStep === 2 ? 'text-emerald-400 border-b-2 border-emerald-400 font-bold' : currentStep > 2 ? 'text-gray-300' : 'text-gray-600'}`}>
            <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-mono">2</span>
            <span className="hidden sm:inline">Brand Theme</span>
          </div>

          <div className={`flex items-center gap-2 pb-1 transition-colors ${currentStep === 3 ? 'text-emerald-400 border-b-2 border-emerald-400 font-bold' : currentStep > 3 ? 'text-gray-300' : 'text-gray-600'}`}>
            <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-mono">3</span>
            <span className="hidden sm:inline">Plan Catalog</span>
          </div>

          <div className={`flex items-center gap-2 pb-1 transition-colors ${currentStep === 4 ? 'text-emerald-400 border-b-2 border-emerald-400 font-bold' : 'text-gray-600'}`}>
            <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-mono">4</span>
            <span className="hidden sm:inline">Launch!</span>
          </div>
        </div>

        {/* ── STEP 1: FIRM INFO & LOGO ──────────────────────────────────── */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-gray-300 leading-relaxed">
                <strong className="text-white">Step 1: Your Brand Identity</strong>
                <p className="mt-0.5 text-gray-400">
                  Set the public name and contact details for your prop trading company. These will automatically appear across checkout pages, trader certificates, and automated emails.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="wizard-firm-name">Prop Firm Name</Label>
                <Input
                  id="wizard-firm-name"
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                  placeholder="e.g. Apex Horizon Capital"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wizard-support-email">Support Contact Email</Label>
                <Input
                  id="wizard-support-email"
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  placeholder="support@yourdomain.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wizard-tagline">Marketing Tagline</Label>
              <Input
                id="wizard-tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Trade with up to $2,000,000 in institutional capital."
              />
            </div>

            {/* Logo Upload Dropzone */}
            <div className="border-2 border-dashed border-[#1F2937] hover:border-emerald-500/50 rounded-xl p-5 text-center bg-[#0B0F19] transition-colors cursor-pointer space-y-1.5">
              <div className="h-9 w-9 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                <UploadCloud className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold text-gray-200">Upload Firm Logo & Favicon</p>
              <p className="text-[11px] text-gray-500">PNG, SVG, or WebP with transparent background (Recommended 512x512)</p>
            </div>
          </div>
        )}

        {/* ── STEP 2: THEME ACCENT PALETTE ──────────────────────────────── */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 flex items-start gap-3">
              <Paintbrush className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-gray-300 leading-relaxed">
                <strong className="text-white">Step 2: Theme & Visual Aesthetic</strong>
                <p className="mt-0.5 text-gray-400">
                  Select your primary theme accent. All dashboard buttons, glow highlights, and trader metrics will adapt in real-time.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {THEME_PRESETS.map((preset) => {
                const isSelected = (selectedColor || '').toUpperCase() === preset.primary.toUpperCase()
                return (
                  <div
                    key={preset.id}
                    onClick={() => handleSelectColor(preset.primary)}
                    className={`p-4 rounded-xl border-2 bg-[#0B0F19] space-y-2.5 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${
                      isSelected ? 'shadow-xl' : 'border-[#1F2937] hover:border-slate-700'
                    }`}
                    style={{
                      borderColor: isSelected ? preset.primary : undefined,
                      boxShadow: isSelected ? `0 0 20px ${preset.glow}` : undefined,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold" style={{ color: isSelected ? '#FFFFFF' : '#D1D5DB' }}>
                        {preset.name}
                      </span>
                      {isSelected && <Check className="h-4 w-4" style={{ color: preset.primary }} />}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-5 w-5 rounded-full shadow-sm" style={{ backgroundColor: preset.primary }} />
                      <div className="h-5 w-5 rounded-full bg-[#111827] border border-slate-700" />
                      <div className="h-5 w-5 rounded-full bg-[#0B0F19] border border-slate-700" />
                    </div>
                    <span className="text-[10px] font-mono block font-semibold" style={{ color: preset.primary }}>
                      {preset.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── STEP 3: 1-CLICK STANDARD CATALOG SETUP ─────────────────────── */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 flex items-start gap-3">
              <Sliders className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-gray-300 leading-relaxed">
                <strong className="text-white">Step 3: 1-Click Standard Challenge Catalog</strong>
                <p className="mt-0.5 text-gray-400">
                  Deploy the standard 4-tier evaluation suite ($10k, $25k, $50k, $100k) with proven industry risk parameters (8% Phase 1, 5% Phase 2, 5% Daily DD, 10% Max DD, 80% Profit Split).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {STANDARD_CATALOG_PLANS.map((plan, idx) => (
                <div 
                  key={idx}
                  className="bg-[#0B0F19] border border-[#1F2937] rounded-xl p-3.5 flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white block">{plan.name}</span>
                    <span className="text-[11px] text-emerald-400 font-mono">
                      Target: 8% / 5% • Max DD: 10%
                    </span>
                  </div>
                  <Badge tone="accent" size="sm" className="font-mono">
                    ${plan.price}
                  </Badge>
                </div>
              ))}
            </div>

            <div className="pt-2 text-center">
              <Button
                type="button"
                variant="primary"
                onClick={handleCreateCatalog}
                loading={isProvisioningPlans}
                disabled={isProvisioningPlans}
                className="w-full py-3 text-sm font-bold gap-2 shadow-emerald-500/20"
              >
                <Rocket className="h-4 w-4" />
                <span>Deploy Standard 4-Tier Plan Catalog</span>
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 4: LAUNCH SUCCESS & PUBLIC LINK ──────────────────────── */}
        {currentStep === 4 && (
          <div className="space-y-5 text-center py-4">
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white tracking-tight">
                Your Prop Trading Firm Is Ready To Launch!
              </h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                All branding tokens, challenge catalogs, and risk compliance guardrails have been configured.
              </p>
            </div>

            {/* Public Checkout Link Box */}
            <div className="bg-[#0B0F19] border border-[#1F2937] rounded-xl p-4 text-left space-y-2 max-w-lg mx-auto">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5 text-emerald-400" />
                  Public Trader Landing & Checkout URL:
                </span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="text-xs text-gray-400 hover:text-emerald-400 font-mono flex items-center gap-1 transition-colors"
                >
                  {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedLink ? 'Copied' : 'Copy Link'}
                </button>
              </div>

              <div className="bg-[#111827] border border-[#1F2937] p-2.5 rounded-lg font-mono text-xs text-emerald-400 select-all break-all">
                {frontendUrl}/#pricing
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-2">
              <div className="bg-[#0B0F19] border border-[#1F2937] p-2.5 rounded-lg">
                <span className="text-[10px] text-gray-500 font-mono block">Status</span>
                <span className="text-xs font-bold text-emerald-400">Live & Open</span>
              </div>
              <div className="bg-[#0B0F19] border border-[#1F2937] p-2.5 rounded-lg">
                <span className="text-[10px] text-gray-500 font-mono block">Checkout</span>
                <span className="text-xs font-bold text-blue-400">Integrated</span>
              </div>
              <div className="bg-[#0B0F19] border border-[#1F2937] p-2.5 rounded-lg">
                <span className="text-[10px] text-gray-500 font-mono block">Risk Engine</span>
                <span className="text-xs font-bold text-amber-400">Active</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </Modal>
  )
}
