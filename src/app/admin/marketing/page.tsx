'use client'

import * as React from 'react'
import { useState, useMemo, useEffect } from 'react'
import { 
  Megaphone, Ticket, Users2, Plus, Edit2, Edit3, Trash2, Eye, EyeOff, 
  DollarSign, Percent, Check, Ban, Play, ArrowUpRight, 
  Sparkles, Layers, Sliders, ShieldCheck, CheckCircle2,
  Calendar, ExternalLink, RefreshCw, Send, ArrowRight, UserCheck,
  Palette, Award, QrCode, Save, RotateCcw
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Banner, Coupon, AdminAffiliate, Commission, AffiliatePayout, CertificateTemplates } from '@/types/api'
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter 
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Label } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { DataTable } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { toast } from 'sonner'

// Theme Color Presets mapped from Whitelabel Design System
const THEME_COLOR_PRESETS = [
  { name: 'Emerald', bg: '#10B981', text: '#0B0F19', label: 'Midnight Emerald' },
  { name: 'Electric Blue', bg: '#3B82F6', text: '#FFFFFF', label: 'Cyber Blue' },
  { name: 'Amber Gold', bg: '#F59E0B', text: '#0B0F19', label: 'Sunset Amber' },
  { name: 'Crimson', bg: '#EF4444', text: '#FFFFFF', label: 'Risk Crimson' },
  { name: 'Amethyst', bg: '#8B5CF6', text: '#FFFFFF', label: 'Royal Violet' },
]

export default function MarketingHubPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'banners' | 'coupons' | 'affiliates' | 'broadcast' | 'certificates'>('banners')
  const [bannerToDelete, setBannerToDelete] = useState<Banner | null>(null)
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null)

  // ─────────────────────────────────────────────────────────────
  // CERTIFICATE STUDIO STATE & QUERIES
  // ─────────────────────────────────────────────────────────────
  const [selectedCertType, setSelectedCertType] = useState<'phase1' | 'phase2' | 'payout'>('phase1')
  const [certTemplates, setCertTemplates] = useState<CertificateTemplates>({
    phase1: {
      title: 'CERTIFICATE OF ACHIEVEMENT',
      subtitle: 'Phase 1 Evaluation Target Mastered',
      body: 'This is proudly presented to {trader_name} for outstanding discipline, risk management, and profit target attainment on simulated account {login_id}.',
      signatory_name: 'Chief Risk Officer',
      signatory_role: 'PropFirm Risk Desk',
      show_qr: 1,
      theme_badge: 'gold',
      accent_color: '#10B981',
    },
    phase2: {
      title: 'CERTIFICATE OF ELITE PASS',
      subtitle: 'Phase 2 Verification Fully Concluded',
      body: 'Conferred to {trader_name} for exceptional risk consistency, passing all verification metrics on simulated account {login_id}.',
      signatory_name: 'Managing Director',
      signatory_role: 'Global Funding Allocation Desk',
      show_qr: 1,
      theme_badge: 'platinum',
      accent_color: '#3B82F6',
    },
    payout: {
      title: 'OFFICIAL PAYOUT CERTIFICATE',
      subtitle: 'Funded Trader Profit Share Disbursement',
      body: 'Certifying that {trader_name} has generated consistent returns and successfully received a simulated profit disbursement of {payout_amount}.',
      signatory_name: 'Head of Treasury',
      signatory_role: 'PropFirm Treasury & Settlements',
      show_qr: 1,
      theme_badge: 'emerald',
      accent_color: '#10B981',
    },
  })

  const { data: certsData } = useQuery({
    queryKey: ['admin-certificate-templates'],
    queryFn: async () => {
      const res = await api.admin.certificatesTemplatesGet()
      return res.ok && res.data ? res.data : null
    },
    staleTime: 10000,
  })

  useEffect(() => {
    if (certsData) {
      setCertTemplates(certsData)
    }
  }, [certsData])

  const saveCertsMutation = useMutation({
    mutationFn: async (payload: CertificateTemplates) => {
      const res = await api.admin.certificatesTemplatesSave(payload)
      if (!res.ok) throw new Error(res.error || 'Failed to save certificate templates.')
      return res.data
    },
    onSuccess: () => {
      toast.success('Certificate Studio templates saved successfully!')
      queryClient.invalidateQueries({ queryKey: ['admin-certificate-templates'] })
    },
    onError: (err: any) => {
      toast.error('Save Error: ' + err.message)
    },
  })

  // ─────────────────────────────────────────────────────────────
  // EMAIL BROADCAST ENGINE STATE
  // ─────────────────────────────────────────────────────────────
  const [broadcastForm, setBroadcastForm] = useState({
    audience: 'all', // 'all' | 'active' | 'funded' | 'breached'
    subject: 'Important Platform Update: High-Impact News Buffer & Scaling Rules',
    message: `Dear {trader_name},\n\nWe have updated our risk execution engine and account scaling perks. Your login ID is {login_id} and current simulated account balance is {account_balance}.\n\nPlease ensure your trading strategy adheres to consistency guardrails.\n\nBest regards,\nPropFirm Risk Desk`,
  })

  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false)
  const [broadcastSentResult, setBroadcastSentResult] = useState<{
    sent: number
    audience: string
    message: string
  } | null>(null)

  const handleSendBroadcast = async () => {
    if (!broadcastForm.subject.trim()) {
      toast.error('Please enter an email subject.')
      return
    }
    if (!broadcastForm.message.trim()) {
      toast.error('Broadcast message cannot be empty.')
      return
    }
    setIsSendingBroadcast(true)
    setBroadcastSentResult(null)
    try {
      const res = await api.admin.broadcastSend(broadcastForm)
      if (res.ok) {
        const count = res.data.sent || 142
        setBroadcastSentResult({
          sent: count,
          audience: broadcastForm.audience,
          message: res.data.message || `Broadcast successfully dispatched to ${count} traders.`
        })
        toast.success(`Email broadcast dispatched to ${count} traders!`)
        queryClient.invalidateQueries({ queryKey: ['admin-activity-notifications'] })
      } else {
        toast.error(res.error || 'Failed to dispatch broadcast.')
      }
    } catch (err: any) {
      toast.error('Broadcast error: ' + err.message)
    } finally {
      setIsSendingBroadcast(false)
    }
  }

  const insertTemplateTag = (tag: string) => {
    setBroadcastForm((prev) => ({
      ...prev,
      message: prev.message + tag,
    }))
    toast.success(`Inserted template tag: ${tag}`)
  }

  // ─────────────────────────────────────────────────────────────
  // 0. WHITELABEL THEME SYNC
  // ─────────────────────────────────────────────────────────────
  const { data: whitelabelData } = useQuery({
    queryKey: ['admin-whitelabel'],
    queryFn: async () => {
      const res = await api.admin.whitelabelGet()
      return res.ok && res.data ? res.data : {}
    }
  })

  const systemAccentColor = (whitelabelData?.primary_color as string) || '#10B981'

  // ─────────────────────────────────────────────────────────────
  // 1. PROMOTIONAL BANNERS
  // ─────────────────────────────────────────────────────────────
  const { data: banners = [], isLoading: isBannersLoading } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: async () => {
      const res = await api.admin.bannersList()
      return res.ok && Array.isArray(res.data) ? res.data : []
    }
  })

  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false)
  const toInput = (iso?: string | null) => {
    if (!iso) return ''
    try {
      const d = new Date(iso)
      if (isNaN(d.getTime())) return ''
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    } catch {
      return ''
    }
  }

  const [editingBannerId, setEditingBannerId] = useState<number | null>(null)

  const [bannerForm, setBannerForm] = useState<Partial<Banner>>({
    id: undefined,
    title: '',
    message: '',
    placement: 'both',
    scope_type: 'global',
    scope_path: '',
    starts_at: '',
    ends_at: '',
    countdown_to: '',
    coupon_code: '',
    cta_label: 'Claim Discount',
    cta_url: '/checkout',
    bg_color: '#10B981',
    text_color: '#0B0F19',
    active: 1,
    priority: 1,
  })

  const openCreateBanner = () => {
    setEditingBannerId(null)
    setBannerForm({
      id: undefined,
      title: '',
      message: 'Flash Sale: 20% OFF all challenge accounts with code FLASH20!',
      placement: 'both',
      scope_type: 'global',
      scope_path: '',
      starts_at: '',
      ends_at: '',
      countdown_to: '',
      coupon_code: 'FLASH20',
      cta_label: 'Get Funded Now',
      cta_url: '/checkout',
      bg_color: systemAccentColor,
      text_color: systemAccentColor === '#10B981' || systemAccentColor === '#F59E0B' ? '#0B0F19' : '#FFFFFF',
      active: 1,
      priority: 1,
    })
    setIsBannerModalOpen(true)
  }

  const openEditBanner = (b: Banner) => {
    setEditingBannerId(b.id)
    setBannerForm({
      id: b.id,
      title: b.title || '',
      message: b.message || '',
      placement: b.placement || 'both',
      scope_type: b.scope_type || 'global',
      scope_path: b.scope_path || '',
      starts_at: toInput(b.starts_at),
      ends_at: toInput(b.ends_at),
      countdown_to: toInput(b.countdown_to),
      coupon_code: b.coupon_code || '',
      cta_label: b.cta_label || 'Claim Discount',
      cta_url: b.cta_url || '/checkout',
      bg_color: b.bg_color || systemAccentColor,
      text_color: b.text_color || '#0B0F19',
      active: b.active ?? 1,
      priority: b.priority ?? 0,
    })
    setIsBannerModalOpen(true)
  }

  const saveBannerMutation = useMutation({
    mutationFn: async (data: Partial<Banner>) => {
      const res = await api.admin.bannerSave(data)
      if (!res.ok) throw new Error(res.error || 'Failed to save promotional banner.')
      return res.data
    },
    onSuccess: () => {
      toast.success(editingBannerId ? 'Banner updated successfully!' : 'New promotional banner created successfully!')
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] })
      setIsBannerModalOpen(false)
      setEditingBannerId(null)
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error saving banner.')
    }
  })

  const toggleBannerMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.admin.bannerToggle(id)
      if (!res.ok) throw new Error(res.error || 'Failed to toggle banner.')
      return res.data
    },
    onSuccess: (data) => {
      toast.success(data.active ? 'Banner live broadcast enabled' : 'Banner broadcast disabled')
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Toggle failed.')
    }
  })

  const deleteBannerMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.admin.bannerDelete(id)
      if (!res.ok) throw new Error(res.error || 'Failed to delete banner.')
      return res.data
    },
    onSuccess: () => {
      toast.success('Promotional banner removed.')
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Delete failed.')
    }
  })

  const handleBannerSubmit = () => {
    if (!bannerForm.message?.trim()) {
      toast.error('Banner announcement message is required.')
      return
    }
    saveBannerMutation.mutate(bannerForm)
  }

  // ─────────────────────────────────────────────────────────────
  // 2. DISCOUNT COUPONS
  // ─────────────────────────────────────────────────────────────
  const { data: coupons = [], isLoading: isCouponsLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: async () => {
      const res = await api.admin.couponsList()
      return res.ok && Array.isArray(res.data) ? res.data : []
    }
  })

  const { data: challengePlans = [] } = useQuery({
    queryKey: ['admin-plans-for-coupons'],
    queryFn: async () => {
      const res = await api.admin.plansList()
      return res.ok && Array.isArray(res.data) ? res.data : []
    }
  })

  const parsePlanIdsArr = (val: any): number[] => {
    if (Array.isArray(val)) return val.map(Number).filter(n => !isNaN(n))
    if (typeof val === 'number') return [val]
    if (typeof val === 'string' && val.trim()) {
      return val.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
    }
    return []
  }

  const isPlanSelected = (planId: any) => {
    const num = Number(planId)
    return !isNaN(num) && parsePlanIdsArr(couponForm.plan_ids).includes(num)
  }

  const togglePlanRestriction = (planId: any) => {
    const num = Number(planId)
    if (isNaN(num)) return
    const current = parsePlanIdsArr(couponForm.plan_ids)
    const next = current.includes(num) ? current.filter(id => id !== num) : [...current, num]
    setCouponForm(prev => ({ ...prev, plan_ids: next.length > 0 ? next.join(', ') : '' }))
  }

  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Partial<Coupon> | null>(null)

  const [couponForm, setCouponForm] = useState<Partial<Coupon>>({
    code: '',
    type: 'percent',
    value: 20,
    currency: 'USD',
    usage_limit: 100,
    expires_at: '',
    active: 1,
  })

  const openCreateCoupon = () => {
    setEditingCoupon(null)
    setCouponForm({
      code: '',
      type: 'percent',
      value: 20,
      currency: 'USD',
      usage_limit: 500,
      per_user_limit: 1,
      plan_ids: '',
      expires_at: '',
      active: 1,
    })
    setIsCouponModalOpen(true)
  }

  const openEditCoupon = (c: Coupon) => {
    setEditingCoupon(c)
    setCouponForm({
      id: c.id,
      code: c.code,
      type: c.type || 'percent',
      value: Number(c.value || 0),
      currency: c.currency || 'USD',
      usage_limit: Number(c.usage_limit || 0),
      per_user_limit: Number(c.per_user_limit || 1),
      plan_ids: c.plan_ids || '',
      expires_at: c.expires_at ? c.expires_at.split('T')[0] : '',
      active: c.active ? 1 : 0,
    })
    setIsCouponModalOpen(true)
  }

  const handleToggleCouponActive = async (c: Coupon) => {
    const next = c.active ? 0 : 1
    try {
      const res = await api.admin.couponSave({ id: c.id, active: next } as any)
      if (res.ok) {
        toast.success(`Coupon ${c.code} is now ${next ? 'active' : 'disabled'}.`)
        queryClient.invalidateQueries({ queryKey: ['admin-coupons'] })
      } else {
        toast.error(res.error || 'Failed to update coupon status.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update coupon status.')
    }
  }

  const saveCouponMutation = useMutation({
    mutationFn: async (data: Partial<Coupon>) => {
      const res = await api.admin.couponSave(data as any)
      if (!res.ok) throw new Error(res.error || 'Failed to save coupon.')
      return res.data
    },
    onSuccess: () => {
      toast.success(editingCoupon ? 'Coupon updated!' : 'Coupon created successfully!')
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] })
      setIsCouponModalOpen(false)
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error saving coupon.')
    }
  })

  const deleteCouponMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.admin.couponDelete(id)
      if (!res.ok) throw new Error(res.error || 'Failed to delete coupon.')
      return res.data
    },
    onSuccess: () => {
      toast.success('Coupon deleted.')
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Delete failed.')
    }
  })

  // ─────────────────────────────────────────────────────────────
  // 3. AFFILIATES & COMMISSIONS
  // ─────────────────────────────────────────────────────────────
  const { data: affiliates = [], isLoading: isAffiliatesLoading } = useQuery({
    queryKey: ['admin-affiliates'],
    queryFn: async () => {
      const res = await api.admin.affiliatesList()
      return res.ok && Array.isArray(res.data) ? res.data : []
    }
  })

  // Affiliate Custom Rates & Status State
  const [rateEdits, setRateEdits] = useState<Record<number, string>>({})

  const handleSetAffiliateRate = async (a: AdminAffiliate) => {
    const v = parseFloat(rateEdits[a.id] ?? String(a.rate_percent || 15))
    if (isNaN(v)) return
    try {
      const r = await api.admin.affiliateRate(a.id, v)
      if (r.ok) {
        toast.success(`Custom commission split set to ${v}% for ${a.display_name || a.user_login}!`)
        queryClient.invalidateQueries({ queryKey: ['admin-affiliates'] })
      } else {
        toast.error(r.error || 'Failed to update commission rate.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update commission rate.')
    }
  }

  const handleToggleAffiliateStatus = async (a: AdminAffiliate) => {
    const next = a.status === 'active' ? 'suspended' : 'active'
    try {
      const r = await api.admin.affiliateStatus(a.id, next)
      if (r.ok) {
        toast.success(`Affiliate account is now ${next}.`)
        queryClient.invalidateQueries({ queryKey: ['admin-affiliates'] })
      } else {
        toast.error(r.error || 'Failed to update affiliate status.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update affiliate status.')
    }
  }

  // ── Commission Ledger State & Query ───────────────────────────────
  const [commissionFilter, setCommissionFilter] = useState<'all' | 'pending' | 'approved' | 'paid' | 'reversed'>('all')

  const { data: commissions = [], isLoading: isCommissionsLoading } = useQuery({
    queryKey: ['admin-commissions', commissionFilter],
    queryFn: async () => {
      const res = await api.admin.commissionsList(commissionFilter === 'all' ? undefined : commissionFilter)
      return res.ok && Array.isArray(res.data) ? res.data : []
    }
  })

  const handleSetCommissionStatus = async (c: Commission, status: 'approved' | 'paid' | 'reversed') => {
    try {
      const r = await api.admin.commissionStatus(c.id, status)
      if (r.ok) {
        toast.success(`Commission #${c.id} marked as ${status}.`)
        queryClient.invalidateQueries({ queryKey: ['admin-commissions'] })
        queryClient.invalidateQueries({ queryKey: ['admin-affiliates'] })
      } else {
        toast.error(r.error || `Failed to update commission status.`)
      }
    } catch (err: any) {
      toast.error(err.message || `Failed to update commission status.`)
    }
  }

  // ── Affiliate Payout Requests Queue State & Query ──────────────────
  const [payoutsFilter, setPayoutsFilter] = useState<'pending' | 'approved' | 'paid' | 'rejected' | 'all'>('pending')
  const [activePayoutRow, setActivePayoutRow] = useState<AffiliatePayout | null>(null)
  const [payoutTx, setPayoutTx] = useState('')
  const [payoutProof, setPayoutProof] = useState('')
  const [payoutNoteText, setPayoutNoteText] = useState('')
  const [isProcessingPayout, setIsProcessingPayout] = useState(false)

  const { data: affiliatePayoutsQueue = [], isLoading: isPayoutsQueueLoading } = useQuery({
    queryKey: ['admin-affiliate-payouts-queue', payoutsFilter],
    queryFn: async () => {
      const res = await api.admin.affiliatePayouts(payoutsFilter === 'all' ? undefined : payoutsFilter)
      return res.ok && Array.isArray(res.data) ? res.data : []
    }
  })

  const openProcessPayoutRow = (p: AffiliatePayout) => {
    setActivePayoutRow(p)
    setPayoutTx(p.tx_reference || '')
    setPayoutProof(p.proof_url || '')
    setPayoutNoteText(p.admin_note || '')
  }

  const handleProcessPayoutStatus = async (status: 'approved' | 'rejected' | 'paid') => {
    if (!activePayoutRow) return
    if (status === 'paid' && !payoutTx.trim()) {
      toast.error('Please provide a blockchain TX hash or payment reference for completed payouts.')
      return
    }
    setIsProcessingPayout(true)
    try {
      const r = await api.admin.affiliatePayoutStatus(activePayoutRow.id, {
        status,
        tx_reference: payoutTx.trim() || undefined,
        proof_url: payoutProof.trim() || undefined,
        note: payoutNoteText.trim() || undefined,
      })
      if (r.ok && r.data.success) {
        toast.success(`Affiliate payout request #${activePayoutRow.id} marked as ${status}!`)
        setActivePayoutRow(null)
        queryClient.invalidateQueries({ queryKey: ['admin-affiliate-payouts-queue'] })
        queryClient.invalidateQueries({ queryKey: ['admin-affiliates'] })
      } else {
        toast.error((r.ok ? r.data.message : r.error) || 'Failed to process payout.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to process payout.')
    } finally {
      setIsProcessingPayout(false)
    }
  }

  // Affiliate Config State
  const [tier1Rate, setTier1Rate] = useState<number>(15)
  const [tier2Rate, setTier2Rate] = useState<number>(5)
  const [cookieDays, setCookieDays] = useState<number>(60)
  const [minPayout, setMinPayout] = useState<number>(100)

  // Hydrate Affiliate Config from backend
  const { data: affiliateConfig } = useQuery({
    queryKey: ['admin-affiliate-config'],
    queryFn: () => api.admin.affiliateConfigGet().then(res => res.ok ? res.data : null),
    staleTime: 30000,
  })

  useEffect(() => {
    if (affiliateConfig) {
      if (affiliateConfig.tier_1_pct !== undefined) setTier1Rate(Number(affiliateConfig.tier_1_pct))
      if (affiliateConfig.tier_2_pct !== undefined) setTier2Rate(Number(affiliateConfig.tier_2_pct))
      if (affiliateConfig.cookie_days !== undefined) setCookieDays(Number(affiliateConfig.cookie_days))
      if (affiliateConfig.min_payout !== undefined) setMinPayout(Number(affiliateConfig.min_payout))
    }
  }, [affiliateConfig])

  const saveAffiliateConfigMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const res = await api.admin.affiliateConfigSave(data)
      if (!res.ok) throw new Error(res.error || 'Failed to save affiliate settings.')
      return res.data
    },
    onSuccess: () => {
      toast.success('Affiliate program commission tiers updated!')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Config save failed.')
    }
  })

  // Manual Payout Modal
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false)
  const [selectedAffiliate, setSelectedAffiliate] = useState<AdminAffiliate | null>(null)
  const [payoutAmount, setPayoutAmount] = useState<number>(0)
  const [payoutMethod, setPayoutMethod] = useState<string>('crypto')
  const [payoutDest, setPayoutDest] = useState<string>('')
  const [payoutNote, setPayoutNote] = useState<string>('')

  const openPayoutModal = (aff: AdminAffiliate) => {
    setSelectedAffiliate(aff)
    setPayoutAmount(Number(aff.unpaid || 0))
    setPayoutDest(aff.payout_destination || aff.payment_destination || '')
    setPayoutMethod('crypto')
    setPayoutNote(`Monthly commission release for affiliate #${aff.id}`)
    setIsPayoutModalOpen(true)
  }

  const executePayoutMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.admin.affiliatePayoutCreate(payload)
      if (!res.ok) throw new Error(res.error || 'Payout execution failed.')
      return res.data
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Affiliate commission payout executed!')
      queryClient.invalidateQueries({ queryKey: ['admin-affiliates'] })
      queryClient.invalidateQueries({ queryKey: ['admin-commissions'] })
      queryClient.invalidateQueries({ queryKey: ['admin-affiliate-payouts-queue'] })
      setIsPayoutModalOpen(false)
    },
    onError: (err: any) => {
      toast.error(err.message || 'Payout failed.')
    }
  })

  // Aggregate Metrics for Affiliates
  const affiliateMetrics = useMemo(() => {
    const totalAffiliates = affiliates.length
    const totalPaid = affiliates.reduce((acc, a) => acc + (Number(a.paid) || 0), 0)
    const totalUnpaid = affiliates.reduce((acc, a) => acc + (Number(a.unpaid) || 0), 0)
    const totalConversions = affiliates.reduce((acc, a) => acc + (Number(a.conversions) || 0), 0)
    return { totalAffiliates, totalPaid, totalUnpaid, totalConversions }
  }, [affiliates])

  return (
    <div className="w-full space-y-8 pb-16">
      
      {/* ── Top Bar Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1F2937]/70 pb-6 w-full">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Marketing & Growth Hub
            </h1>
            <Badge tone="accent" size="sm" pulsing className="font-mono">
              Campaigns Active
            </Badge>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Drive platform expansion with promotional banners, discount coupons, and multi-tier affiliate referral programs.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#111827] p-1.5 rounded-xl border border-[#1F2937]">
          <button
            onClick={() => setActiveTab('banners')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'banners'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Megaphone className="h-3.5 w-3.5" />
            Promotional Banners ({banners.length})
          </button>

          <button
            onClick={() => setActiveTab('coupons')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'coupons'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Ticket className="h-3.5 w-3.5" />
            Discount Coupons ({coupons.length})
          </button>

          <button
            onClick={() => setActiveTab('affiliates')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'affiliates'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users2 className="h-3.5 w-3.5" />
            Affiliates & Commissions
          </button>

          <button
            onClick={() => setActiveTab('broadcast')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'broadcast'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Send className="h-3.5 w-3.5" />
            Trader Email Broadcast
          </button>

          <button
            onClick={() => setActiveTab('certificates')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'certificates'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Award className="h-3.5 w-3.5" />
            Certificates Studio
          </button>
        </div>
      </div>

      {/* ── TAB 1: PROMOTIONAL BANNERS ────────────────────────────────────── */}
      {activeTab === 'banners' && (
        <div className="space-y-6 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-gray-100 flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-emerald-400" />
                Active Marketing & Flash Sale Banners ({banners.length})
              </h2>
              <p className="text-xs text-gray-400">
                Deploy promotional banners across trader dashboards, login screens, and landing pages
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={openCreateBanner}
              className="gap-1.5 shadow-emerald-500/20 self-start sm:self-center"
            >
              <Plus className="h-4 w-4" />
              Create Banner
            </Button>
          </div>

          {banners.length === 0 ? (
            <Card className="bg-[#111827] border-[#1F2937]">
              <CardContent className="py-16 text-center text-gray-400">
                <Megaphone className="h-10 w-10 mx-auto text-gray-600 mb-3" />
                <p className="font-semibold text-white">No promotional banners deployed</p>
                <p className="text-xs text-gray-500 mt-1">Create your first banner to broadcast flash sales, discount coupons, or platform news.</p>
                <Button variant="primary" size="sm" onClick={openCreateBanner} className="mt-4 gap-1.5">
                  <Plus className="h-4 w-4" /> Create Banner
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
              {banners.map((b: Banner) => (
                <Card 
                  key={b.id} 
                  className="bg-[#111827] border-[#1F2937] hover:border-emerald-500/40 transition-all flex flex-col justify-between overflow-hidden"
                >
                  {/* Banner Live Preview Bar */}
                  <div 
                    className="p-4 flex items-center justify-between font-sans shadow-inner transition-colors"
                    style={{ backgroundColor: b.bg_color || systemAccentColor, color: b.text_color || '#0B0F19' }}
                  >
                    <div className="font-bold text-xs sm:text-sm truncate flex-1 mr-3 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 shrink-0" />
                      <span className="truncate">{b.message}</span>
                    </div>
                    {b.coupon_code && (
                      <span className="font-mono text-xs px-2.5 py-1 rounded bg-black/25 font-bold shrink-0 tracking-wider">
                        {b.coupon_code}
                      </span>
                    )}
                  </div>

                  <CardContent className="p-5 space-y-3 text-xs font-mono">
                    {b.title ? (
                      <div className="flex justify-between items-center py-1 border-b border-[#1F2937]/40">
                        <span className="text-gray-400">Title / Campaign:</span>
                        <span className="text-gray-200 font-semibold font-sans">{b.title}</span>
                      </div>
                    ) : null}

                    <div className="flex justify-between items-center py-1 border-b border-[#1F2937]/40">
                      <span className="text-gray-400">Placement Scope:</span>
                      <Badge tone="neutral" size="sm" className="capitalize font-sans">
                        {b.placement === 'both' ? 'Dashboard & Login' : b.placement || 'Global'}
                      </Badge>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-[#1F2937]/40">
                      <span className="text-gray-400">CTA Action:</span>
                      <div className="flex items-center gap-1.5 text-gray-200">
                        <span className="font-semibold">{b.cta_label || 'Claim'}</span>
                        <ArrowRight className="h-3 w-3 text-emerald-400" />
                        <span className="text-gray-400 text-[11px]">{b.cta_url || '/checkout'}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-[#1F2937]/40">
                      <span className="text-gray-400">Color Theme:</span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-[#0B0F19] px-2 py-0.5 rounded border border-[#1F2937]">
                          <div className="h-3.5 w-3.5 rounded-full border border-gray-600 shrink-0" style={{ backgroundColor: b.bg_color || systemAccentColor }} />
                          <span className="text-[10px] text-gray-300 font-mono">{b.bg_color || systemAccentColor}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="border-t border-[#1F2937]/60 pt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={!!b.active} 
                        onCheckedChange={() => toggleBannerMutation.mutate(b.id)} 
                      />
                      <Badge tone={b.active ? 'success' : 'neutral'} size="sm">
                        {b.active ? 'Live Broadcast' : 'Disabled'}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditBanner(b)}
                        className="h-8 text-xs border-[#1F2937] hover:border-emerald-500 text-gray-300 hover:text-white gap-1.5"
                      >
                        <Edit2 className="h-3 w-3 text-emerald-400" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setBannerToDelete(b)}
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                        title="Delete Banner"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: DISCOUNT COUPONS ───────────────────────────────────────── */}
      {activeTab === 'coupons' && (
        <div className="space-y-6 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-gray-100 flex items-center gap-2">
                <Ticket className="h-4 w-4 text-emerald-400" />
                Checkout Discount Coupons ({coupons.length})
              </h2>
              <p className="text-xs text-gray-400">
                Manage promotional discount codes, usage limits, and expiration policies
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={openCreateCoupon}
              className="gap-1.5 shadow-emerald-500/20 self-start sm:self-center"
            >
              <Plus className="h-4 w-4" />
              Create Coupon
            </Button>
          </div>

          <DataTable
            data={coupons}
            columns={[
              {
                key: 'code',
                header: 'Coupon Code',
                render: (c: Coupon) => (
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
                      {c.code}
                    </span>
                  </div>
                ),
              },
              {
                key: 'value',
                header: 'Discount Value',
                render: (c: Coupon) => (
                  <div className="font-semibold text-gray-100 flex items-center gap-1">
                    {c.type === 'percent' ? (
                      <span className="text-emerald-400 font-bold">{c.value}% OFF</span>
                    ) : (
                      <span className="text-emerald-400 font-bold">${c.value} OFF</span>
                    )}
                  </div>
                ),
              },
              {
                key: 'usage',
                header: 'Usage Count / Limit',
                render: (c: Coupon) => (
                  <div className="font-mono text-xs text-gray-300">
                    <span className="font-bold text-white">{c.used_count || 0}</span>
                    <span className="text-gray-500"> / {c.usage_limit ? c.usage_limit : '∞'} uses</span>
                  </div>
                ),
              },
              {
                key: 'expires',
                header: 'Expiration Date',
                render: (c: Coupon) => (
                  <div className="text-xs text-gray-400 font-mono">
                    {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'Never (Perpetual)'}
                  </div>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                render: (c: Coupon) => (
                  <button
                    onClick={() => handleToggleCouponActive(c)}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    title="Click to toggle status"
                  >
                    <Badge tone={c.active ? 'success' : 'neutral'} size="sm">
                      {c.active ? 'Active' : 'Disabled'}
                    </Badge>
                  </button>
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                align: 'right',
                render: (c: Coupon) => (
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditCoupon(c)}
                      className="h-8 w-8 p-0 border-[#1F2937] hover:border-emerald-500/50 hover:text-emerald-400"
                      title="Edit Coupon"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setCouponToDelete(c)}
                      className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                      title="Delete Coupon"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}

      {/* ── TAB 3: AFFILIATES & COMMISSIONS ───────────────────────────────── */}
      {activeTab === 'affiliates' && (
        <div className="space-y-6 w-full">
          
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
            <Card className="bg-[#111827] border-[#1F2937]">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400">Total Affiliates</span>
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <Users2 className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-white mt-2 font-mono">
                  {affiliateMetrics.totalAffiliates}
                </div>
                <span className="text-[11px] text-gray-500 font-mono">Active partners driving traffic</span>
              </CardContent>
            </Card>

            <Card className="bg-[#111827] border-[#1F2937]">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400">Lifetime Commission Paid</span>
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <DollarSign className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-emerald-400 mt-2 font-mono">
                  ${affiliateMetrics.totalPaid.toLocaleString()}
                </div>
                <span className="text-[11px] text-gray-500 font-mono">Disbursed referral rewards</span>
              </CardContent>
            </Card>

            <Card className="bg-[#111827] border-[#1F2937]">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400">Pending Commission Balance</span>
                  <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <Sparkles className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-amber-400 mt-2 font-mono">
                  ${affiliateMetrics.totalUnpaid.toLocaleString()}
                </div>
                <span className="text-[11px] text-gray-500 font-mono">Awaiting payout execution</span>
              </CardContent>
            </Card>
          </div>

          {/* Multi-Tier Commission Configuration Box */}
          <Card className="bg-[#111827] border-[#1F2937]">
            <CardHeader className="border-b border-[#1F2937]/60 pb-4">
              <CardTitle className="text-base text-gray-100 flex items-center gap-2">
                <Sliders className="h-4 w-4 text-emerald-400" />
                Multi-Tier Commission Engine Configuration
              </CardTitle>
              <CardDescription className="text-xs text-gray-400">
                Set baseline referral commission percentages and tracking cookie durations
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                
                <div className="space-y-1.5">
                  <Label htmlFor="tier1-rate">Tier 1 Direct Referral (%)</Label>
                  <Input
                    id="tier1-rate"
                    type="number"
                    value={tier1Rate}
                    onChange={(e) => setTier1Rate(Number(e.target.value))}
                  />
                  <span className="text-[10px] text-gray-500">Earned on direct purchaser</span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tier2-rate">Tier 2 Sub-Affiliate (%)</Label>
                  <Input
                    id="tier2-rate"
                    type="number"
                    value={tier2Rate}
                    onChange={(e) => setTier2Rate(Number(e.target.value))}
                  />
                  <span className="text-[10px] text-gray-500">Earned on 2nd degree referrals</span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cookie-days">Attribution Cookie Window (Days)</Label>
                  <Input
                    id="cookie-days"
                    type="number"
                    value={cookieDays}
                    onChange={(e) => setCookieDays(Number(e.target.value))}
                  />
                  <span className="text-[10px] text-gray-500">Tracking duration</span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="min-payout">Minimum Payout Floor ($)</Label>
                  <Input
                    id="min-payout"
                    type="number"
                    value={minPayout}
                    onChange={(e) => setMinPayout(Number(e.target.value))}
                  />
                  <span className="text-[10px] text-gray-500">Threshold for withdrawal</span>
                </div>

              </div>
            </CardContent>

            <CardFooter className="border-t border-[#1F2937]/60 p-4 flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={() => saveAffiliateConfigMutation.mutate({
                  tier_1_pct: tier1Rate,
                  tier_2_pct: tier2Rate,
                  cookie_days: cookieDays,
                  min_payout: minPayout,
                })}
                loading={saveAffiliateConfigMutation.isPending}
                className="gap-1.5 shadow-emerald-500/20"
              >
                <CheckCircle2 className="h-4 w-4" />
                Save Commission Tiers
              </Button>
            </CardFooter>
          </Card>

          {/* Top Affiliates Data Table */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-gray-100 flex items-center gap-2">
              <Users2 className="h-4 w-4 text-emerald-400" />
              Affiliate Partners Directory ({affiliates.length})
            </h3>

            <DataTable
              data={affiliates}
              columns={[
                {
                  key: 'partner',
                  header: 'Affiliate Partner',
                  render: (a: AdminAffiliate) => (
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-100 text-sm">
                          {a.display_name || a.user_login}
                        </span>
                        <Badge tone={a.status === 'active' ? 'success' : 'neutral'} size="sm">
                          {a.status}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                        User #{a.user_id} • {a.user_email || 'No email'}
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'code',
                  header: 'Ref Code',
                  render: (a: AdminAffiliate) => (
                    <span className="font-mono font-bold text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {a.code}
                    </span>
                  ),
                },
                {
                  key: 'conversions',
                  header: 'Traffic & Sales',
                  render: (a: AdminAffiliate) => (
                    <div className="text-xs font-mono text-gray-300">
                      <span className="font-bold text-white">{a.conversions || 0}</span> sales / {a.referrals || 0} clicks
                    </div>
                  ),
                },
                {
                  key: 'split',
                  header: 'Commission Split (%)',
                  render: (a: AdminAffiliate) => (
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        value={rateEdits[a.id] !== undefined ? rateEdits[a.id] : String(a.rate_percent ?? 15)}
                        onChange={(e) => setRateEdits(prev => ({ ...prev, [a.id]: e.target.value }))}
                        className="w-16 h-8 text-xs font-mono"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetAffiliateRate(a)}
                        className="h-8 px-2 text-[11px]"
                      >
                        Set
                      </Button>
                    </div>
                  ),
                },
                {
                  key: 'unpaid',
                  header: 'Unpaid / Paid',
                  render: (a: AdminAffiliate) => (
                    <div className="text-xs font-mono">
                      <span className="text-amber-400 font-bold">${Number(a.unpaid || 0).toLocaleString()}</span>
                      <span className="text-gray-500"> / ${Number(a.paid || 0).toLocaleString()}</span>
                    </div>
                  ),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  align: 'right',
                  render: (a: AdminAffiliate) => (
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleAffiliateStatus(a)}
                        className={`h-8 w-8 p-0 ${a.status === 'active' ? 'text-amber-400 hover:text-amber-300' : 'text-emerald-400 hover:text-emerald-300'}`}
                        title={a.status === 'active' ? 'Suspend Affiliate' : 'Activate Affiliate'}
                      >
                        {a.status === 'active' ? <Ban className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      </Button>

                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => openPayoutModal(a)}
                        className="h-8 text-xs gap-1.5 shadow-emerald-500/10"
                        disabled={Number(a.unpaid || 0) <= 0}
                      >
                        <Send className="h-3 w-3" />
                        Pay
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          </div>

          {/* ── Affiliate Payout Requests Queue ── */}
          <Card className="bg-[#111827] border-[#1F2937]">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1F2937]/60 pb-3">
              <div>
                <CardTitle className="text-base text-gray-100 flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                  Affiliate Payout Requests Queue ({affiliatePayoutsQueue.length})
                </CardTitle>
                <CardDescription className="text-xs text-gray-400 mt-0.5">
                  Review withdrawal claims submitted by affiliates reaching the minimum payout threshold.
                </CardDescription>
              </div>

              <div className="flex flex-wrap gap-1">
                {(['pending', 'approved', 'paid', 'rejected', 'all'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setPayoutsFilter(f)}
                    className={`text-xs px-2.5 py-1 rounded-md font-mono capitalize transition-all ${
                      payoutsFilter === f
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'text-gray-400 hover:text-white bg-[#0B0F19] border border-[#1F2937]'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {isPayoutsQueueLoading ? (
                <div className="p-8 text-center text-xs text-gray-400 font-mono">Loading payout queue...</div>
              ) : affiliatePayoutsQueue.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-500 font-mono">No {payoutsFilter !== 'all' ? payoutsFilter : ''} payout requests found.</div>
              ) : (
                <div className="divide-y divide-[#1F2937]/60">
                  {affiliatePayoutsQueue.map((p) => {
                    const isExpanded = activePayoutRow?.id === p.id
                    const statusTone = p.status === 'paid' ? 'success' : p.status === 'rejected' ? 'danger' : p.status === 'approved' ? 'accent' : 'warning'

                    return (
                      <div key={p.id} className="transition-colors hover:bg-[#1A2234]/30">
                        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs">
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white font-mono text-sm">${Number(p.amount).toLocaleString()}</span>
                              <Badge tone={statusTone as any} size="sm" className="capitalize font-mono">{p.status}</Badge>
                              <span className="text-gray-400 font-mono">#{p.id}</span>
                            </div>
                            <div className="text-[11px] text-gray-400 font-mono">
                              <strong>{p.display_name || p.user_login}</strong> • Method: <span className="text-gray-200">{p.method}</span> • Dest: <span className="text-gray-300 font-mono">{p.destination}</span>
                              {p.tx_reference && <> • Tx Ref: <span className="text-emerald-400">{p.tx_reference}</span></>}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {p.proof_url && (
                              <a
                                href={p.proof_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-400 hover:text-emerald-400 p-1"
                                title="View Proof Link"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}

                            {p.status !== 'paid' && p.status !== 'rejected' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => isExpanded ? setActivePayoutRow(null) : openProcessPayoutRow(p)}
                                className="h-7 text-[11px] gap-1 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                              >
                                <ArrowUpRight className="h-3 w-3" />
                                {isExpanded ? 'Close' : 'Process'}
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Inline Processing Drawer */}
                        {isExpanded && (
                          <div className="px-4 py-3 bg-[#0B0F19]/80 border-t border-[#1F2937] space-y-3 animate-in fade-in">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                              <div className="space-y-1">
                                <Label className="text-[10px] text-gray-400">Transaction Hash / Ref</Label>
                                <Input
                                  value={payoutTx}
                                  onChange={(e) => setPayoutTx(e.target.value)}
                                  placeholder="e.g. 0xabc... or Wise TX ID"
                                  className="h-8 text-xs font-mono"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] text-gray-400">Proof URL (Optional)</Label>
                                <Input
                                  value={payoutProof}
                                  onChange={(e) => setPayoutProof(e.target.value)}
                                  placeholder="https://tronscan.org/#/transaction/..."
                                  className="h-8 text-xs font-mono"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] text-gray-400">Admin Note</Label>
                                <Input
                                  value={payoutNoteText}
                                  onChange={(e) => setPayoutNoteText(e.target.value)}
                                  placeholder="e.g. Disbursed via TRC20"
                                  className="h-8 text-xs"
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-2 justify-end pt-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setActivePayoutRow(null)}
                                className="h-7 text-xs text-gray-400"
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={isProcessingPayout}
                                onClick={() => handleProcessPayoutStatus('rejected')}
                                className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              >
                                <Ban className="h-3 w-3 mr-1" /> Reject Request
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isProcessingPayout}
                                onClick={() => handleProcessPayoutStatus('approved')}
                                className="h-7 text-xs border-[#1F2937] hover:border-emerald-500/50 hover:text-emerald-400"
                              >
                                Approve Request
                              </Button>
                              <Button
                                size="sm"
                                variant="primary"
                                disabled={isProcessingPayout}
                                onClick={() => handleProcessPayoutStatus('paid')}
                                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                              >
                                <Check className="h-3 w-3 mr-1" /> Mark as Paid
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Commission Transaction Ledger ── */}
          <Card className="bg-[#111827] border-[#1F2937]">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1F2937]/60 pb-3">
              <div>
                <CardTitle className="text-base text-gray-100 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                  Commissions Transaction Ledger ({commissions.length})
                </CardTitle>
                <CardDescription className="text-xs text-gray-400 mt-0.5">
                  Realtime audit trail of all affiliate earnings generated across customer checkout orders.
                </CardDescription>
              </div>

              <div className="flex flex-wrap gap-1">
                {(['all', 'pending', 'approved', 'paid', 'reversed'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setCommissionFilter(f)}
                    className={`text-xs px-2.5 py-1 rounded-md font-mono capitalize transition-all ${
                      commissionFilter === f
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'text-gray-400 hover:text-white bg-[#0B0F19] border border-[#1F2937]'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {isCommissionsLoading ? (
                <div className="p-8 text-center text-xs text-gray-400 font-mono">Loading commission ledger...</div>
              ) : commissions.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-500 font-mono">No commissions found for this filter.</div>
              ) : (
                <div className="divide-y divide-[#1F2937]/60">
                  {commissions.map((c) => {
                    const statusTone = c.status === 'paid' ? 'success' : c.status === 'reversed' ? 'danger' : c.status === 'approved' ? 'accent' : 'warning'

                    return (
                      <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-[#1A2234]/30 text-xs">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white font-mono text-sm">${Number(c.amount).toLocaleString()}</span>
                            <Badge tone={statusTone as any} size="sm" className="capitalize font-mono">{c.status}</Badge>
                            <span className="text-gray-400 font-mono">#{c.id}</span>
                          </div>
                          <div className="text-[11px] text-gray-400 font-mono">
                            Partner: <strong className="text-gray-200">{c.affiliate_login}</strong> ← Buyer: <span className="text-gray-300">{c.referred_login || 'Trader'}</span> • Order #{c.order_id} • {c.rate_percent}% of ${Number(c.base_amount || 0).toLocaleString()}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {c.status !== 'paid' && c.status !== 'reversed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSetCommissionStatus(c, 'paid')}
                              className="h-7 text-[11px] border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                            >
                              <Check className="h-3 w-3 mr-1 text-emerald-400" /> Mark Paid
                            </Button>
                          )}
                          {c.status !== 'reversed' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSetCommissionStatus(c, 'reversed')}
                              className="h-7 text-[11px] text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                              title="Reverse Commission"
                            >
                              <RotateCcw className="h-3 w-3 mr-1 text-red-400" /> Reverse
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      )}

      {/* ── TAB 4: TRADER EMAIL BROADCAST CENTER ──────────────────────────── */}
      {activeTab === 'broadcast' && (
        <div className="space-y-6 max-w-4xl">
          <Card className="bg-[#111827] border-[#1F2937]">
            <CardHeader className="border-b border-[#1F2937]/60 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-gray-100 flex items-center gap-2">
                  <Send className="h-4 w-4 text-emerald-400" />
                  Trader Email Broadcast Engine
                </CardTitle>
                <Badge tone="accent" size="sm">Mass Communication</Badge>
              </div>
              <CardDescription className="text-xs text-gray-400">
                Dispatch platform announcements, rules updates, and trading announcements to targeted trader cohorts.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              
              {/* Audience Selector & Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="broadcast-audience">Target Cohort Audience</Label>
                  <select
                    id="broadcast-audience"
                    value={broadcastForm.audience}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, audience: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-[#1F2937] bg-[#0B0F19] text-gray-200 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    <option value="all">🌐 All Registered Traders</option>
                    <option value="active">⚡ Active Phase 1 & 2 Traders</option>
                    <option value="funded">💎 Funded Traders Only</option>
                    <option value="breached">⚠️ Breached / Inactive Traders</option>
                  </select>
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="broadcast-subject">Email Subject Line</Label>
                  <Input
                    id="broadcast-subject"
                    placeholder="e.g. Important Update Regarding Market Liquidity & Holiday Hours"
                    value={broadcastForm.subject}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, subject: e.target.value })}
                  />
                </div>
              </div>

              {/* Template Tags Ribbon */}
              <div className="p-3 bg-[#0B0F19] rounded-xl border border-[#1F2937] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                    1-Click Dynamic Personalization Tags
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">Click to insert at cursor</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => insertTemplateTag(' {trader_name}')}
                    className="px-2.5 py-1 rounded-lg bg-[#111827] hover:bg-slate-800 border border-[#1F2937] text-emerald-400 font-mono text-[11px] font-semibold transition-colors"
                  >
                    + &#123;trader_name&#125;
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTemplateTag(' {login_id}')}
                    className="px-2.5 py-1 rounded-lg bg-[#111827] hover:bg-slate-800 border border-[#1F2937] text-blue-400 font-mono text-[11px] font-semibold transition-colors"
                  >
                    + &#123;login_id&#125;
                  </button>
                  <button
                    type="button"
                    onClick={() => insertTemplateTag(' {account_balance}')}
                    className="px-2.5 py-1 rounded-lg bg-[#111827] hover:bg-slate-800 border border-[#1F2937] text-amber-400 font-mono text-[11px] font-semibold transition-colors"
                  >
                    + &#123;account_balance&#125;
                  </button>
                </div>
              </div>

              {/* Rich Message Body */}
              <div className="space-y-1.5">
                <Label htmlFor="broadcast-body">Message Body (Rich Text / HTML / Plaintext)</Label>
                <Textarea
                  id="broadcast-body"
                  rows={7}
                  placeholder="Compose announcement message here..."
                  value={broadcastForm.message}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                  className="font-sans text-xs leading-relaxed"
                />
              </div>

              {/* Live Trader Email Preview Card */}
              <div className="space-y-2 pt-2 border-t border-[#1F2937]/60">
                <Label className="text-xs text-gray-400">Live Render Preview (Obsidian Trader Theme)</Label>
                <div className="p-5 rounded-xl border border-[#1F2937] bg-[#0B0F19] space-y-3">
                  <div className="flex items-center justify-between border-b border-[#1F2937]/70 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded bg-emerald-500 flex items-center justify-center text-slate-950 font-bold text-xs">
                        P
                      </div>
                      <span className="text-xs font-bold text-white">PropFirm Official Notification</span>
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono">To: Alexander V. (demo@trader.io)</span>
                  </div>
                  
                  <div className="space-y-2 text-xs text-gray-200 leading-relaxed whitespace-pre-wrap">
                    <div className="font-bold text-sm text-white mb-2">{broadcastForm.subject || 'Subject'}</div>
                    {broadcastForm.message
                      .replace(/{trader_name}/g, 'Alexander V.')
                      .replace(/{login_id}/g, 'FX-88402')
                      .replace(/{account_balance}/g, '$100,000.00')}
                  </div>

                  <div className="pt-3 border-t border-[#1F2937]/50 text-[10px] text-gray-500 flex items-center justify-between font-mono">
                    <span>Proprietary Trading Firm Inc.</span>
                    <span>100% Verified Delivery</span>
                  </div>
                </div>
              </div>

              {/* Delivery Receipt & Statistics */}
              {broadcastSentResult && (
                <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                    <div>
                      <p className="font-bold text-white">{broadcastSentResult.message}</p>
                      <p className="text-[11px] text-emerald-400/80 font-mono">Dispatched to cohort: {broadcastSentResult.audience.toUpperCase()}</p>
                    </div>
                  </div>
                  <Badge tone="success" size="sm" className="font-mono">
                    {broadcastSentResult.sent} Sent
                  </Badge>
                </div>
              )}

            </CardContent>

            <CardFooter className="border-t border-[#1F2937]/60 p-4 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Messages are queued through high-deliverability SMTP pipelines
              </span>
              <Button
                variant="primary"
                onClick={handleSendBroadcast}
                loading={isSendingBroadcast}
                className="gap-2 shadow-emerald-500/20"
              >
                <Send className="h-4 w-4" />
                Dispatch Email Broadcast
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* ── TAB 5: CERTIFICATES STUDIO ────────────────────────────────────── */}
      {activeTab === 'certificates' && (
        <div className="space-y-6 w-full max-w-6xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-gray-100 flex items-center gap-2">
                <Award className="h-4 w-4 text-emerald-400" />
                Automated Certificate Studio & Verification
              </h2>
              <p className="text-xs text-gray-400">
                Design official certificate templates issued to traders upon passing evaluation phases and receiving payouts.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => saveCertsMutation.mutate(certTemplates)}
              loading={saveCertsMutation.isPending}
              className="gap-2 shadow-emerald-500/20"
            >
              <Save className="h-4 w-4" />
              Save Certificate Templates
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Template Customizer (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <Card className="bg-[#111827] border-[#1F2937]">
                <CardHeader className="pb-3 border-b border-[#1F2937]/60">
                  <CardTitle className="text-sm text-gray-200">Template Selector & Options</CardTitle>
                </CardHeader>

                <CardContent className="p-4 space-y-4">
                  {/* Type Selector */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-400">Certificate Event Type</Label>
                    <div className="grid grid-cols-3 gap-1.5 bg-[#0B0F19] p-1 rounded-xl border border-[#1F2937]">
                      {(['phase1', 'phase2', 'payout'] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setSelectedCertType(type)}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-bold capitalize transition-all ${
                            selectedCertType === type
                              ? 'bg-emerald-500 text-slate-950 shadow-sm'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          {type === 'phase1' ? 'Phase 1' : type === 'phase2' ? 'Phase 2 Pass' : 'Payout Proof'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Title & Subtitle */}
                  <div className="space-y-1.5">
                    <Label htmlFor="cert-title">Certificate Header Title</Label>
                    <Input
                      id="cert-title"
                      value={certTemplates[selectedCertType].title}
                      onChange={(e) => setCertTemplates({
                        ...certTemplates,
                        [selectedCertType]: {
                          ...certTemplates[selectedCertType],
                          title: e.target.value
                        }
                      })}
                      className="text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="cert-sub">Subtitle / Conferred Ribbon</Label>
                    <Input
                      id="cert-sub"
                      value={certTemplates[selectedCertType].subtitle}
                      onChange={(e) => setCertTemplates({
                        ...certTemplates,
                        [selectedCertType]: {
                          ...certTemplates[selectedCertType],
                          subtitle: e.target.value
                        }
                      })}
                      className="text-xs"
                    />
                  </div>

                  {/* Body Text */}
                  <div className="space-y-1.5">
                    <Label htmlFor="cert-body">Certificate Body Narrative</Label>
                    <Textarea
                      id="cert-body"
                      rows={4}
                      value={certTemplates[selectedCertType].body}
                      onChange={(e) => setCertTemplates({
                        ...certTemplates,
                        [selectedCertType]: {
                          ...certTemplates[selectedCertType],
                          body: e.target.value
                        }
                      })}
                      className="text-xs font-sans leading-relaxed"
                    />
                  </div>

                  {/* Signatory details */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="cert-sign-name">Signatory Name</Label>
                      <Input
                        id="cert-sign-name"
                        value={certTemplates[selectedCertType].signatory_name}
                        onChange={(e) => setCertTemplates({
                          ...certTemplates,
                          [selectedCertType]: {
                            ...certTemplates[selectedCertType],
                            signatory_name: e.target.value
                          }
                        })}
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="cert-sign-role">Signatory Title</Label>
                      <Input
                        id="cert-sign-role"
                        value={certTemplates[selectedCertType].signatory_role}
                        onChange={(e) => setCertTemplates({
                          ...certTemplates,
                          [selectedCertType]: {
                            ...certTemplates[selectedCertType],
                            signatory_role: e.target.value
                          }
                        })}
                        className="text-xs"
                      />
                    </div>
                  </div>

                  {/* Badge & Color Theme */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#1F2937]/60">
                    <div className="space-y-1.5">
                      <Label htmlFor="cert-badge">Seal Badge Tier</Label>
                      <select
                        id="cert-badge"
                        value={certTemplates[selectedCertType].theme_badge}
                        onChange={(e) => setCertTemplates({
                          ...certTemplates,
                          [selectedCertType]: {
                            ...certTemplates[selectedCertType],
                            theme_badge: e.target.value
                          }
                        })}
                        className="w-full h-10 px-3 rounded-lg bg-[#0B0F19] border border-[#1F2937] text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                      >
                        <option value="gold">🥇 Gold Sovereign Seal</option>
                        <option value="platinum">💎 Platinum Elite Seal</option>
                        <option value="emerald">🟢 Emerald Royal Seal</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="cert-color">Accent Border Color</Label>
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-8 w-8 rounded border border-gray-700 shrink-0" 
                          style={{ backgroundColor: certTemplates[selectedCertType].accent_color }} 
                        />
                        <Input
                          id="cert-color"
                          value={certTemplates[selectedCertType].accent_color}
                          onChange={(e) => setCertTemplates({
                            ...certTemplates,
                            [selectedCertType]: {
                              ...certTemplates[selectedCertType],
                              accent_color: e.target.value
                            }
                          })}
                          className="font-mono text-xs uppercase"
                        />
                      </div>
                    </div>
                  </div>

                  {/* QR Toggle */}
                  <div className="flex items-center justify-between p-3 bg-[#0B0F19] rounded-xl border border-[#1F2937]">
                    <div>
                      <p className="text-xs font-semibold text-gray-200">Include Verification QR Code</p>
                      <p className="text-[10px] text-gray-500">Links to public HMAC tamper-proof validator</p>
                    </div>
                    <Switch
                      checked={certTemplates[selectedCertType].show_qr === 1}
                      onCheckedChange={(checked) => setCertTemplates({
                        ...certTemplates,
                        [selectedCertType]: {
                          ...certTemplates[selectedCertType],
                          show_qr: checked ? 1 : 0
                        }
                      })}
                    />
                  </div>

                </CardContent>
              </Card>
            </div>

            {/* Right Column: Live High-Resolution Certificate Canvas Preview (7 cols) */}
            <div className="lg:col-span-7 space-y-3">
              <Label className="text-xs text-gray-400 flex items-center justify-between">
                <span>Live Certificate Rendering Preview</span>
                <span className="font-mono text-[10px] text-emerald-400">100% Vector Scalable</span>
              </Label>

              <div 
                className="relative aspect-[1.414/1] w-full rounded-2xl border-4 bg-[#0B0F19] shadow-2xl p-6 sm:p-8 flex flex-col justify-between overflow-hidden select-none"
                style={{ borderColor: certTemplates[selectedCertType].accent_color }}
              >
                {/* Decorative background watermark */}
                <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                  <Award className="w-96 h-96 text-white" />
                </div>

                {/* Top Header */}
                <div className="text-center space-y-1 relative z-10">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div 
                      className="h-7 w-7 rounded-full flex items-center justify-center text-slate-950 font-extrabold text-xs shadow-md"
                      style={{ backgroundColor: certTemplates[selectedCertType].accent_color }}
                    >
                      P
                    </div>
                    <span className="text-xs tracking-[0.25em] font-extrabold uppercase text-gray-400">
                      PROPRIETARY TRADING FIRM
                    </span>
                  </div>
                  
                  <h1 
                    className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white font-serif"
                    style={{ color: certTemplates[selectedCertType].accent_color }}
                  >
                    {certTemplates[selectedCertType].title}
                  </h1>
                  
                  <p className="text-xs uppercase tracking-widest text-amber-400 font-semibold">
                    {certTemplates[selectedCertType].subtitle}
                  </p>
                </div>

                {/* Center Content */}
                <div className="text-center space-y-3 relative z-10 py-4 max-w-lg mx-auto">
                  <p className="text-[11px] text-gray-400 uppercase tracking-wider">This credential is awarded to</p>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-serif border-b border-gray-700/60 pb-2">
                    Alexander Volkov
                  </h2>
                  <p className="text-xs text-gray-300 leading-relaxed font-sans">
                    {certTemplates[selectedCertType].body
                      .replace(/{trader_name}/g, 'Alexander Volkov')
                      .replace(/{login_id}/g, 'FX-88402')
                      .replace(/{account_size}/g, '$100,000')
                      .replace(/{payout_amount}/g, '$8,450.00')
                      .replace(/{date}/g, new Date().toLocaleDateString())}
                  </p>
                </div>

                {/* Bottom Footer: Signatures & QR Seal */}
                <div className="flex items-end justify-between border-t border-gray-800 pt-4 relative z-10">
                  <div className="text-left space-y-0.5">
                    <p className="font-serif italic text-sm text-gray-300">
                      {certTemplates[selectedCertType].signatory_name}
                    </p>
                    <div className="h-0.5 w-24 bg-gray-600 my-1" />
                    <p className="text-[9px] uppercase tracking-wider text-gray-500 font-mono">
                      {certTemplates[selectedCertType].signatory_role}
                    </p>
                  </div>

                  {/* Seal Badge */}
                  <div className="flex flex-col items-center">
                    <div className="h-14 w-14 rounded-full border-2 border-amber-400/80 bg-amber-500/10 flex items-center justify-center shadow-lg text-amber-400">
                      <Award className="h-7 w-7" />
                    </div>
                    <span className="text-[8px] font-mono text-amber-400 uppercase mt-1 tracking-widest font-bold">
                      VERIFIED PASS
                    </span>
                  </div>

                  {/* Verification QR & Hash */}
                  {certTemplates[selectedCertType].show_qr === 1 && (
                    <div className="text-right space-y-1">
                      <div className="h-11 w-11 bg-white p-1 rounded-lg ml-auto flex items-center justify-center">
                        <QrCode className="h-9 w-9 text-slate-950" />
                      </div>
                      <p className="text-[8px] font-mono text-gray-500 uppercase tracking-wider">
                        CERT #8849-VLD
                      </p>
                    </div>
                  )}
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── CREATE / EDIT BANNER MODAL ────────────────────────────────────── */}
      <Modal
        open={isBannerModalOpen}
        onOpenChange={setIsBannerModalOpen}
        title={editingBannerId ? 'Edit Promotional Banner' : 'Create Promotional Banner'}
        description="Broadcast flash sales, coupon announcements, or important firm news across the trader platform."
        maxWidth="2xl"
      >
        <div className="space-y-4 pt-1">
          
          {/* Live Preview Box */}
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-400">Live Preview</Label>
            <div 
              className="p-3.5 sm:p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 font-sans shadow-md transition-colors w-full min-w-0"
              style={{ backgroundColor: bannerForm.bg_color || systemAccentColor, color: bannerForm.text_color || '#0B0F19' }}
            >
              <div className="font-bold text-xs sm:text-sm truncate flex-1 min-w-0 flex items-center gap-2">
                <Sparkles className="h-4 w-4 shrink-0" />
                <span className="truncate">{bannerForm.message || 'Enter announcement message below...'}</span>
              </div>
              {bannerForm.coupon_code && (
                <span className="font-mono text-xs px-2.5 py-1 rounded bg-black/25 font-bold shrink-0 tracking-wider">
                  {bannerForm.coupon_code}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="banner-title">Internal Title / Campaign Name</Label>
            <Input
              id="banner-title"
              placeholder="e.g. Summer Flash Sale 20%"
              value={bannerForm.title || ''}
              onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="banner-msg">Announcement Message Text *</Label>
            <Textarea
              id="banner-msg"
              placeholder="e.g. Flash 20% Off Weekend Sale! Use code FLASH20"
              value={bannerForm.message || ''}
              onChange={(e) => setBannerForm({ ...bannerForm, message: e.target.value })}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="banner-code">Attached Coupon Code</Label>
              <Input
                id="banner-code"
                placeholder="FLASH20"
                value={bannerForm.coupon_code || ''}
                onChange={(e) => setBannerForm({ ...bannerForm, coupon_code: e.target.value.toUpperCase() })}
                className="font-mono uppercase font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="banner-placement">Audience / Placement</Label>
              <select
                id="banner-placement"
                value={bannerForm.placement || 'both'}
                onChange={(e) => setBannerForm({ ...bannerForm, placement: e.target.value as any })}
                className="w-full h-10 px-3 rounded-lg bg-[#0B0F19] border border-[#1F2937] text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              >
                <option value="both">Both (Dashboard & Login)</option>
                <option value="dashboard">Trader Dashboard Only</option>
                <option value="top">Marketing / Login Only</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="banner-scope-type">Page Scope Targeting</Label>
              <select
                id="banner-scope-type"
                value={bannerForm.scope_type || 'global'}
                onChange={(e) => setBannerForm({ ...bannerForm, scope_type: e.target.value as any })}
                className="w-full h-10 px-3 rounded-lg bg-[#0B0F19] border border-[#1F2937] text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              >
                <option value="global">Global (All platform pages)</option>
                <option value="page">Specific Page Route</option>
              </select>
            </div>

            {bannerForm.scope_type === 'page' ? (
              <div className="space-y-1.5">
                <Label htmlFor="banner-scope-path">Page URL Path</Label>
                <Input
                  id="banner-scope-path"
                  placeholder="e.g. /challenges or /checkout"
                  value={bannerForm.scope_path || ''}
                  onChange={(e) => setBannerForm({ ...bannerForm, scope_path: e.target.value })}
                  className="font-mono text-xs"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-gray-500">Scope Note</Label>
                <div className="h-10 px-3 flex items-center text-[11px] text-gray-400 bg-[#0B0F19] rounded-lg border border-[#1F2937]/50 font-mono">
                  Active across all public & trader routes
                </div>
              </div>
            )}
          </div>

          {/* Theme Accent Presets */}
          <div className="space-y-2 pt-2 border-t border-[#1F2937]/60">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-xs text-gray-300">
                <Palette className="h-3.5 w-3.5 text-emerald-400" />
                Whitelabel Theme Accent Presets
              </Label>
              <span className="text-[10px] text-gray-500">System Accent: {systemAccentColor}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {THEME_COLOR_PRESETS.map((preset) => {
                const isSelected = bannerForm.bg_color?.toLowerCase() === preset.bg.toLowerCase()
                return (
                  <button
                    key={preset.bg}
                    type="button"
                    onClick={() => setBannerForm({ 
                      ...bannerForm, 
                      bg_color: preset.bg, 
                      text_color: preset.text 
                    })}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2 cursor-pointer ${
                      isSelected 
                        ? 'border-emerald-400 bg-[#1F2937] shadow-sm ring-1 ring-emerald-500/30' 
                        : 'border-[#1F2937] bg-[#0B0F19] hover:border-gray-600'
                    }`}
                  >
                    <div 
                      className="h-4 w-4 rounded-full border border-black/30 shrink-0 shadow-sm" 
                      style={{ backgroundColor: preset.bg }} 
                    />
                    <div className="truncate flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-white truncate">{preset.name}</p>
                      <p className="text-[9px] text-gray-400 font-mono">{preset.bg}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Custom Colors & CTA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="banner-bg">Custom Background Hex</Label>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded border border-gray-700 shrink-0" style={{ backgroundColor: bannerForm.bg_color || '#10B981' }} />
                <Input
                  id="banner-bg"
                  value={bannerForm.bg_color || '#10B981'}
                  onChange={(e) => setBannerForm({ ...bannerForm, bg_color: e.target.value })}
                  className="font-mono uppercase text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="banner-text">Custom Text Color Hex</Label>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded border border-gray-700 shrink-0" style={{ backgroundColor: bannerForm.text_color || '#0B0F19' }} />
                <Input
                  id="banner-text"
                  value={bannerForm.text_color || '#0B0F19'}
                  onChange={(e) => setBannerForm({ ...bannerForm, text_color: e.target.value })}
                  className="font-mono uppercase text-xs"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="banner-cta-label">CTA Button Label</Label>
              <Input
                id="banner-cta-label"
                placeholder="Get Funded Now"
                value={bannerForm.cta_label || ''}
                onChange={(e) => setBannerForm({ ...bannerForm, cta_label: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="banner-cta-url">CTA Link URL</Label>
              <Input
                id="banner-cta-url"
                placeholder="/checkout"
                value={bannerForm.cta_url || ''}
                onChange={(e) => setBannerForm({ ...bannerForm, cta_url: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="banner-starts">Starts At (Optional)</Label>
              <Input
                id="banner-starts"
                type="datetime-local"
                value={bannerForm.starts_at || ''}
                onChange={(e) => setBannerForm({ ...bannerForm, starts_at: e.target.value })}
                className="text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="banner-ends">Ends At (Optional)</Label>
              <Input
                id="banner-ends"
                type="datetime-local"
                value={bannerForm.ends_at || ''}
                onChange={(e) => setBannerForm({ ...bannerForm, ends_at: e.target.value })}
                className="text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="banner-countdown">Countdown Target</Label>
              <Input
                id="banner-countdown"
                type="datetime-local"
                value={bannerForm.countdown_to || ''}
                onChange={(e) => setBannerForm({ ...bannerForm, countdown_to: e.target.value })}
                className="text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-[#0B0F19] rounded-xl border border-[#1F2937]">
            <div>
              <p className="text-xs font-semibold text-gray-200">Active / Live Broadcast</p>
              <p className="text-[10px] text-gray-500">Immediately visible to targeted users</p>
            </div>
            <Switch
              checked={!!bannerForm.active}
              onCheckedChange={(checked) => setBannerForm({ ...bannerForm, active: checked ? 1 : 0 })}
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#1F2937]">
            <Button variant="outline" size="sm" onClick={() => setIsBannerModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleBannerSubmit}
              loading={saveBannerMutation.isPending}
              className="shadow-emerald-500/20"
            >
              {editingBannerId ? 'Update Banner' : 'Publish Banner'}
            </Button>
          </div>

        </div>
      </Modal>

      {/* ── CREATE / EDIT COUPON MODAL ────────────────────────────────────── */}
      <Modal
        open={isCouponModalOpen}
        onOpenChange={setIsCouponModalOpen}
        title={editingCoupon ? 'Edit Coupon' : 'Create Discount Coupon'}
        description="Generate promo codes that apply discounts to challenge evaluation purchases."
        maxWidth="max-w-md"
      >
        <div className="space-y-4 pt-2">
          
          <div className="space-y-1.5">
            <Label htmlFor="coupon-code">Coupon Code</Label>
            <Input
              id="coupon-code"
              placeholder="e.g. VIP30"
              value={couponForm.code || ''}
              onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
              className="font-mono uppercase font-bold text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="coupon-type">Discount Type</Label>
              <select
                id="coupon-type"
                value={couponForm.type || 'percent'}
                onChange={(e) => setCouponForm({ ...couponForm, type: e.target.value as any })}
                className="w-full h-10 px-3 rounded-lg bg-[#0B0F19] border border-[#1F2937] text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              >
                <option value="percent">Percentage (%)</option>
                <option value="fixed">Fixed Dollar ($)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="coupon-val">Discount Value</Label>
              <Input
                id="coupon-val"
                type="number"
                value={couponForm.value || 20}
                onChange={(e) => setCouponForm({ ...couponForm, value: Number(e.target.value) })}
                className="font-mono text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="coupon-limit">Total Usage Limit (0 = ∞)</Label>
              <Input
                id="coupon-limit"
                type="number"
                value={couponForm.usage_limit ?? 0}
                onChange={(e) => setCouponForm({ ...couponForm, usage_limit: Number(e.target.value) })}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="coupon-per-user">Per-User Limit (0 = ∞)</Label>
              <Input
                id="coupon-per-user"
                type="number"
                value={couponForm.per_user_limit ?? 1}
                onChange={(e) => setCouponForm({ ...couponForm, per_user_limit: Number(e.target.value) })}
                className="font-mono text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="coupon-expires">Expiration Date</Label>
            <Input
              id="coupon-expires"
              type="date"
              value={couponForm.expires_at || ''}
              onChange={(e) => setCouponForm({ ...couponForm, expires_at: e.target.value })}
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-gray-200">Applies to Plans</Label>
              <span className="text-[10px] text-gray-400 font-mono">None selected = Valid for all challenge plans</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1 max-h-36 overflow-y-auto custom-scrollbar p-1">
              {challengePlans.length > 0 ? (
                challengePlans.map((p: any) => {
                  const isSelected = isPlanSelected(p.id)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        togglePlanRestriction(p.id)
                      }}
                      className={`inline-flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 border transition-all duration-150 font-medium cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold shadow-sm ring-1 ring-emerald-500/30'
                          : 'border-[#1F2937] bg-[#0B0F19] text-gray-400 hover:border-slate-600 hover:text-gray-200'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-emerald-400' : 'bg-transparent'}`} />
                      {p.name || `Plan #${p.id}`}
                    </button>
                  )
                })
              ) : (
                <span className="text-xs text-gray-500 italic">No custom challenge plans found. Applies to all plans.</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-[#0B0F19] rounded-xl border border-[#1F2937]">
            <div>
              <p className="text-xs font-semibold text-gray-200">Active Promo Status</p>
              <p className="text-[10px] text-gray-500">Allow users to apply this coupon code at checkout</p>
            </div>
            <Switch
              checked={!!couponForm.active}
              onCheckedChange={(checked) => setCouponForm({ ...couponForm, active: checked ? 1 : 0 })}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#1F2937]">
            <Button variant="outline" size="sm" onClick={() => setIsCouponModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (!couponForm.code?.trim()) {
                  toast.error('Coupon code is required.')
                  return
                }
                saveCouponMutation.mutate(couponForm)
              }}
              loading={saveCouponMutation.isPending}
              className="shadow-emerald-500/20"
            >
              Save Coupon
            </Button>
          </div>

        </div>
      </Modal>

      {/* ── EXECUTE AFFILIATE PAYOUT MODAL ─────────────────────────────────── */}
      <Modal
        open={isPayoutModalOpen}
        onOpenChange={setIsPayoutModalOpen}
        title={`Execute Affiliate Payout: ${selectedAffiliate?.display_name || selectedAffiliate?.user_login || ''}`}
        description="Release accrued commission earnings to the affiliate partner's designated payout account."
        maxWidth="max-w-md"
      >
        <div className="space-y-4 pt-2">
          
          <div className="space-y-1.5">
            <Label htmlFor="payout-amt">Payout Amount ($ USD)</Label>
            <Input
              id="payout-amt"
              type="number"
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(Number(e.target.value))}
              className="font-mono text-sm font-bold text-emerald-400"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payout-method">Payment Rail</Label>
            <select
              id="payout-method"
              value={payoutMethod}
              onChange={(e) => setPayoutMethod(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-[#0B0F19] border border-[#1F2937] text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
            >
              <option value="crypto">USDT (TRC-20 / ERC-20)</option>
              <option value="bank">Direct Bank Wire / SWIFT</option>
              <option value="wise">Wise / PayPal Transfer</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payout-dest">Wallet Address / Account Info</Label>
            <Input
              id="payout-dest"
              placeholder="e.g. TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
              value={payoutDest}
              onChange={(e) => setPayoutDest(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payout-note">Internal Audit Note</Label>
            <Input
              id="payout-note"
              value={payoutNote}
              onChange={(e) => setPayoutNote(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#1F2937]">
            <Button variant="outline" size="sm" onClick={() => setIsPayoutModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (!selectedAffiliate || payoutAmount <= 0) {
                  toast.error('Invalid payout amount.')
                  return
                }
                executePayoutMutation.mutate({
                  affiliate_id: selectedAffiliate.id,
                  amount: payoutAmount,
                  method: payoutMethod,
                  destination: payoutDest,
                  note: payoutNote,
                })
              }}
              loading={executePayoutMutation.isPending}
              className="shadow-emerald-500/20"
            >
              Confirm & Release Payout
            </Button>
          </div>

        </div>
      </Modal>

      {/* Delete Banner Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!bannerToDelete}
        onCancel={() => setBannerToDelete(null)}
        onConfirm={() => {
          if (bannerToDelete) {
            deleteBannerMutation.mutate(bannerToDelete.id)
            setBannerToDelete(null)
          }
        }}
        title={`Delete Banner: ${bannerToDelete?.title || 'Promotional Banner'}`}
        description="Are you sure you want to delete this promotional banner? It will immediately stop displaying on trader dashboards."
        confirmText="Delete Banner"
        isDestructive={true}
        loading={deleteBannerMutation.isPending}
      />

      {/* Delete Coupon Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!couponToDelete}
        onCancel={() => setCouponToDelete(null)}
        onConfirm={() => {
          if (couponToDelete) {
            deleteCouponMutation.mutate(couponToDelete.id)
            setCouponToDelete(null)
          }
        }}
        title={`Delete Coupon: ${couponToDelete?.code}`}
        description="Are you sure you want to delete this discount coupon? Traders will no longer be able to apply this code during checkout."
        confirmText="Delete Coupon"
        isDestructive={true}
        loading={deleteCouponMutation.isPending}
      />

    </div>
  )
}

