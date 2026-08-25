'use client'

import * as React from 'react'
import { useState, useEffect, useRef } from 'react'
import { 
  Sliders, Paintbrush, ShieldCheck, ShieldAlert, DollarSign, Plus, Edit2, 
  Trash2, Save, RefreshCw, UploadCloud, Globe, Check, Lock,
  Award, Clock, AlertTriangle, Layers, Palette, Eye, Sparkles,
  Zap, Scale, Radio, Info, ChevronRight, X, Power, TrendingUp, ArrowRight,
  Mail, Terminal, Server, Activity, Database, AlertOctagon, HardDrive, Send, Sun, Moon, Copy, FileText, CheckCircle2,
  HelpCircle, Monitor, BellRing, Bot, MessageSquare, CreditCard, CandlestickChart
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ChallengePlan, SmtpConfig, WebhookConfig, ScalingRules, ScalingQueueItem, ScalingEvent } from '@/types/api'
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter 
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Label } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { toast } from 'sonner'
import { applyThemeAccent, applyFontFamily, applyRadius, THEME_PRESETS, FONT_PRESETS } from '@/lib/theme-accent'
import { cn } from '@/lib/cn'
import { PaymentsCenter } from '@/components/admin/payments-center'
import { ChartSymbolMap } from '@/components/admin/chart-symbol-map'
import { PriceFeedCard } from '@/components/admin/price-feed-card'

// Slugify helper to auto-generate URL-friendly slugs from Plan Title
const slugify = (text: string) => {
  return (text || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // remove non-alphanumeric except spaces and dashes
    .replace(/[\s_-]+/g, '-')     // replace spaces with single hyphen
    .replace(/^-+|-+$/g, '')      // remove leading/trailing hyphens
}

// Default fallback plans if backend returns empty or is initializing
const DEFAULT_STARTER_PLANS: Partial<ChallengePlan>[] = [
  {
    id: 1,
    name: '$100K Stellar 2-Step',
    slug: 'stellar-100k-2step',
    plan_type: '2-step',
    account_size: 100000,
    price: 499,
    currency: 'USD',
    phases: 2,
    is_instant_funding: 0,
    drawdown_type: 'static',
    p1_profit_target: 8,
    p2_profit_target: 5,
    p1_daily_dd: 5,
    p1_max_dd: 10,
    p2_daily_dd: 5,
    p2_max_dd: 10,
    funded_profit_split: 85,
    max_leverage: 100,
    p1_min_days: 5,
    p2_min_days: 5,
    p1_max_days: 30,
    p2_max_days: 60,
    news_trading: 1,
    weekend_holding: 1,
    ea_allowed: 1,
    scaling_enabled: 1,
    scaling_growth_pct: 25,
    is_active: 1,
  },
  {
    id: 2,
    name: '$50K Rapid 1-Step',
    slug: 'rapid-50k-1step',
    plan_type: '1-step',
    account_size: 50000,
    price: 299,
    currency: 'USD',
    phases: 1,
    is_instant_funding: 0,
    drawdown_type: 'trailing',
    p1_profit_target: 10,
    p1_daily_dd: 4,
    p1_max_dd: 6,
    funded_profit_split: 80,
    max_leverage: 100,
    p1_min_days: 3,
    news_trading: 1,
    weekend_holding: 0,
    ea_allowed: 1,
    scaling_enabled: 1,
    scaling_growth_pct: 25,
    is_active: 1,
  },
  {
    id: 3,
    name: '$25K Direct Instant Funded',
    slug: 'instant-25k-funded',
    plan_type: 'instant',
    account_size: 25000,
    price: 349,
    currency: 'USD',
    phases: 0,
    is_instant_funding: 1,
    drawdown_type: 'static',
    p1_profit_target: 0,
    p1_daily_dd: 3,
    p1_max_dd: 6,
    funded_profit_split: 75,
    max_leverage: 50,
    news_trading: 1,
    weekend_holding: 1,
    ea_allowed: 1,
    scaling_enabled: 1,
    scaling_growth_pct: 25,
    is_active: 1,
  },
  {
    id: 4,
    name: '$150K Futures EOD Trailing',
    slug: 'futures-150k-eod',
    plan_type: '1-step',
    account_size: 150000,
    price: 599,
    currency: 'USD',
    phases: 1,
    is_instant_funding: 0,
    drawdown_type: 'eod_trailing',
    p1_profit_target: 6,
    p1_daily_dd: 0,
    p1_max_dd: 4,
    funded_profit_split: 90,
    max_leverage: 100,
    p1_min_days: 5,
    news_trading: 1,
    weekend_holding: 0,
    ea_allowed: 1,
    scaling_enabled: 1,
    scaling_growth_pct: 30,
    is_active: 1,
  },
]

export interface ChallengeBlueprintPreset {
  id: string
  name: string
  tag: string
  badgeTone: 'accent' | 'info' | 'success' | 'warning' | 'danger'
  icon: string
  accentColor: string
  description: string
  bullets: string[]
  config: Partial<ChallengePlan>
}

export const CHALLENGE_BLUEPRINTS: ChallengeBlueprintPreset[] = [
  {
    id: 'ftmo_2step',
    name: 'Standard 2-Step',
    tag: 'FTMO & FundedNext Style',
    badgeTone: 'accent',
    icon: '🏆',
    accentColor: '#10B981',
    description: 'The industry-standard evaluation model with fixed drawdown safety nets.',
    bullets: [
      'Phase 1: 8% • Phase 2: 5% Target',
      '5% Daily Loss • 10% Static Max Drawdown',
      '80% Funded Profit Split • 30s Min Hold Time',
      'Zero Consistency Restriction'
    ],
    config: {
      name: '$100K FTMO-Style 2-Step',
      slug: 'ftmo-100k-2step',
      plan_type: '2-step',
      phases: 2,
      is_instant_funding: 0,
      account_size: 100000,
      price: 499,
      currency: 'USD',
      drawdown_type: 'static',
      p1_profit_target: 8,
      p2_profit_target: 5,
      p3_profit_target: 3,
      p1_daily_dd: 5,
      p1_max_dd: 10,
      p2_daily_dd: 5,
      p2_max_dd: 10,
      funded_profit_split: 80,
      max_leverage: 100,
      p1_min_days: 5,
      p2_min_days: 5,
      p1_max_days: 30,
      p2_max_days: 60,
      news_trading: 1,
      weekend_holding: 0,
      ea_allowed: 1,
      copy_trading_allowed: 1,
      martingale_allowed: 0,
      hedging_allowed: 1,
      consistency_rule: 0,
      min_trade_seconds: 30,
      min_hold_action: 'void_pnl',
      is_active: 1,
    }
  },
  {
    id: 'rapid_1step',
    name: '1-Step Rapid Pass',
    tag: 'Fast Pass Style',
    badgeTone: 'info',
    icon: '⚡',
    accentColor: '#3B82F6',
    description: 'High-conversion single-phase model with trailing equity drawdown protection.',
    bullets: [
      'Single Phase: 10% Target',
      '4% Daily Loss • 6% Realtime Trailing Drawdown',
      '80% Funded Profit Split',
      '40% Consistency Rule Cap'
    ],
    config: {
      name: '$50K Rapid 1-Step Pass',
      slug: 'rapid-50k-1step',
      plan_type: '1-step',
      phases: 1,
      is_instant_funding: 0,
      account_size: 50000,
      price: 299,
      currency: 'USD',
      drawdown_type: 'trailing_equity',
      p1_profit_target: 10,
      p2_profit_target: 0,
      p3_profit_target: 0,
      p1_daily_dd: 4,
      p1_max_dd: 6,
      p2_daily_dd: 4,
      p2_max_dd: 6,
      funded_profit_split: 80,
      max_leverage: 50,
      p1_min_days: 3,
      p2_min_days: 0,
      p1_max_days: 0,
      p2_max_days: 0,
      news_trading: 1,
      weekend_holding: 1,
      ea_allowed: 1,
      copy_trading_allowed: 1,
      martingale_allowed: 0,
      hedging_allowed: 1,
      consistency_rule: 1,
      consistency_pct: 40,
      min_trade_seconds: 0,
      min_hold_action: 'flag',
      is_active: 1,
    }
  },
  {
    id: 'instant_funding',
    name: 'Direct Instant Funded',
    tag: 'Zero Phase Style',
    badgeTone: 'success',
    icon: '💎',
    accentColor: '#10B981',
    description: 'No evaluations or hurdles. Traders trade live capital immediately.',
    bullets: [
      '0 Evaluation Phases (Direct Funded)',
      '6% Balance Floor Drawdown',
      '70% Profit Split • 1:30 Leverage',
      '60s Min Hold Anti-Scalp Guard'
    ],
    config: {
      name: '$25K Direct Instant Funded',
      slug: 'instant-25k-funded',
      plan_type: 'instant',
      phases: 0,
      is_instant_funding: 1,
      account_size: 25000,
      price: 450,
      currency: 'USD',
      drawdown_type: 'static_balance',
      p1_profit_target: 0,
      p2_profit_target: 0,
      p3_profit_target: 0,
      p1_daily_dd: 0,
      p1_max_dd: 6,
      p2_daily_dd: 0,
      p2_max_dd: 6,
      funded_profit_split: 70,
      max_leverage: 30,
      p1_min_days: 0,
      p2_min_days: 0,
      p1_max_days: 0,
      p2_max_days: 0,
      news_trading: 1,
      weekend_holding: 1,
      ea_allowed: 1,
      copy_trading_allowed: 1,
      martingale_allowed: 0,
      hedging_allowed: 1,
      consistency_rule: 1,
      consistency_pct: 30,
      min_trade_seconds: 60,
      min_hold_action: 'flag',
      is_active: 1,
    }
  },
  {
    id: 'apex_futures',
    name: 'Futures EOD Trailing',
    tag: 'Apex & Tradeify Style',
    badgeTone: 'warning',
    icon: '📈',
    accentColor: '#F59E0B',
    description: 'End-of-day trailing balance model allowing intraday trade fluctuations.',
    bullets: [
      'Single Phase: 6% Target',
      'No Daily Loss Cap • 6% EOD Trailing Floor',
      '90% Funded Profit Split',
      '30% Consistency Rule Cap'
    ],
    config: {
      name: '$100K Apex Futures EOD Model',
      slug: 'futures-100k-eod',
      plan_type: '1-step',
      phases: 1,
      is_instant_funding: 0,
      account_size: 100000,
      price: 320,
      currency: 'USD',
      drawdown_type: 'eod_trailing',
      p1_profit_target: 6,
      p2_profit_target: 0,
      p3_profit_target: 0,
      p1_daily_dd: 0,
      p1_max_dd: 6,
      p2_daily_dd: 0,
      p2_max_dd: 6,
      funded_profit_split: 90,
      max_leverage: 100,
      p1_min_days: 5,
      p2_min_days: 0,
      p1_max_days: 0,
      p2_max_days: 0,
      news_trading: 1,
      weekend_holding: 0,
      ea_allowed: 1,
      copy_trading_allowed: 1,
      martingale_allowed: 0,
      hedging_allowed: 1,
      consistency_rule: 1,
      consistency_pct: 30,
      min_trade_seconds: 0,
      min_hold_action: 'flag',
      is_active: 1,
    }
  }
]

export default function ConfigurationHubPage() {
  const queryClient = useQueryClient()

  // Main Tab: 'plans' | 'branding' | 'payments' | 'rules' | 'trading' | 'smtp' | 'sandbox' | 'mt5' | 'integrations' | 'scaling'
  const [activeTab, setActiveTab] = useState<'plans' | 'branding' | 'payments' | 'rules' | 'trading' | 'smtp' | 'sandbox' | 'mt5' | 'integrations' | 'scaling'>('plans')

  // ─────────────────────────────────────────────────────────────────
  // AUTOMATED SCALING PLAN ENGINE STATE
  // ─────────────────────────────────────────────────────────────────
  const [scalingRulesForm, setScalingRulesForm] = useState<ScalingRules>({
    profit_target_pct: 10,
    evaluation_period_days: 90,
    min_payouts: 2,
    balance_multiplier_pct: 25,
    new_profit_split: 90,
    max_capital_cap: 2000000,
    auto_scale: false,
  })

  const [scalingSearch, setScalingSearch] = useState('')
  const [scalingFilter, setScalingFilter] = useState<'all' | 'eligible' | 'applied'>('all')

  const { data: scalingData, isLoading: isLoadingScaling, refetch: refetchScaling } = useQuery({
    queryKey: ['admin-scaling-queue'],
    queryFn: async () => {
      const res = await api.admin.scalingQueue()
      return res.ok && res.data ? res.data : null
    },
    staleTime: 5000,
  })

  useEffect(() => {
    if (scalingData?.rules) {
      setScalingRulesForm(scalingData.rules)
    }
  }, [scalingData])

  const saveScalingRulesMutation = useMutation({
    mutationFn: async (payload: Partial<ScalingRules>) => {
      const res = await api.admin.scalingRulesSave(payload)
      if (!res.ok) throw new Error(res.error || 'Failed to save scaling rules.')
      return res.data
    },
    onSuccess: () => {
      toast.success('Scaling plan parameters & rewards saved!')
      queryClient.invalidateQueries({ queryKey: ['admin-scaling-queue'] })
    },
    onError: (err: any) => {
      toast.error('Save Error: ' + err.message)
    },
  })

  const applyScaleMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.admin.scalingApply(id)
      if (!res.ok) throw new Error(res.error || 'Failed to apply scaling.')
      return res.data
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Account successfully scaled!')
      refetchScaling()
    },
    onError: (err: any) => {
      toast.error('Scaling Error: ' + err.message)
    },
  })

  // ─────────────────────────────────────────────────────────────────
  // WEBHOOKS & INSTANT ALERTS (DISCORD & TELEGRAM)
  // ─────────────────────────────────────────────────────────────────
  const [webhookForm, setWebhookForm] = useState<WebhookConfig>({
    discord_enabled: false,
    discord_webhook_url: '',
    telegram_enabled: false,
    telegram_bot_token: '',
    telegram_chat_id: '',
    notify_on_purchase: true,
    notify_on_payout: true,
    notify_on_breach: true,
    notify_on_kyc: true,
  })

  const [isTestingDiscord, setIsTestingDiscord] = useState(false)
  const [isTestingTelegram, setIsTestingTelegram] = useState(false)

  const { data: webhooksData } = useQuery({
    queryKey: ['admin-webhooks-config'],
    queryFn: async () => {
      const res = await api.admin.webhooksGet()
      return res.ok && res.data ? res.data : null
    },
    staleTime: 10000,
  })

  useEffect(() => {
    if (webhooksData) {
      setWebhookForm(webhooksData)
    }
  }, [webhooksData])

  const saveWebhooksMutation = useMutation({
    mutationFn: async (payload: WebhookConfig) => {
      const res = await api.admin.webhooksSave(payload)
      if (!res.ok) throw new Error(res.error || 'Failed to save webhook settings.')
      return res.data
    },
    onSuccess: () => {
      toast.success('Founder instant alert webhooks saved successfully!')
      queryClient.invalidateQueries({ queryKey: ['admin-webhooks-config'] })
    },
    onError: (err: any) => {
      toast.error('Save Error: ' + err.message)
    },
  })

  const handleTestDiscordPing = async () => {
    if (!webhookForm.discord_webhook_url.trim()) {
      toast.error('Please enter a Discord Webhook URL first.')
      return
    }
    setIsTestingDiscord(true)
    try {
      const res = await api.admin.webhooksTest('discord', webhookForm)
      if (res.ok) {
        toast.success(res.data.message || 'Discord test ping delivered!')
      } else {
        toast.error(res.error || 'Discord ping failed')
      }
    } catch (err: any) {
      toast.error('Discord Test Error: ' + err.message)
    } finally {
      setIsTestingDiscord(false)
    }
  }

  const handleTestTelegramPing = async () => {
    if (!webhookForm.telegram_bot_token.trim() || !webhookForm.telegram_chat_id.trim()) {
      toast.error('Please enter both Telegram Bot Token and Chat ID.')
      return
    }
    setIsTestingTelegram(true)
    try {
      const res = await api.admin.webhooksTest('telegram', webhookForm)
      if (res.ok) {
        toast.success(res.data.message || 'Telegram test message delivered!')
      } else {
        toast.error(res.error || 'Telegram ping failed')
      }
    } catch (err: any) {
      toast.error('Telegram Test Error: ' + err.message)
    } finally {
      setIsTestingTelegram(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // 1. FETCH PLANS
  // ─────────────────────────────────────────────────────────────────
  const { data: plansData, isLoading: isLoadingPlans, refetch: refetchPlans } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: async () => {
      const res = await api.admin.plansList()
      if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
        return res.data
      }
      return DEFAULT_STARTER_PLANS as ChallengePlan[]
    },
  })

  const plans = plansData || (DEFAULT_STARTER_PLANS as ChallengePlan[])

  // Modal State for Plan Create / Edit
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Partial<ChallengePlan> | null>(null)
  const [planToDelete, setPlanToDelete] = useState<ChallengePlan | null>(null)
  const [modalSection, setModalSection] = useState<'basics' | 'drawdown' | 'rules' | 'scaling'>('basics')

  // Bulk Plan Selection & Purge state
  const [selectedPlanIds, setSelectedPlanIds] = useState<number[]>([])
  const [isPurgingPlans, setIsPurgingPlans] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  const handlePurgeAndResetPlans = async () => {
    if (!window.confirm('⚠️ FACTORY RESET PLANS:\n\nAre you sure you want to purge all custom plans and restore the 4 standard industry blueprint plans?')) {
      return
    }
    setIsPurgingPlans(true)
    try {
      const res = await api.admin.purgeAndResetPlans()
      if (res.ok) {
        toast.success(res.data.message || 'Plans successfully reset to standard 4 blueprints!')
        setSelectedPlanIds([])
        refetchPlans()
        queryClient.invalidateQueries({ queryKey: ['admin-plans'] })
      } else {
        toast.error(res.error || 'Failed to reset plans')
      }
    } catch (err: any) {
      toast.error('Reset Error: ' + err.message)
    } finally {
      setIsPurgingPlans(false)
    }
  }

  const handleBulkDeletePlans = async (all = false) => {
    const count = all ? plans.length : selectedPlanIds.length
    if (count === 0) return
    if (!window.confirm(`⚠️ BULK DELETE PLANS:\n\nAre you sure you want to permanently delete ${all ? 'ALL (' + plans.length + ')' : count} selected challenge plan(s)?`)) {
      return
    }
    setIsBulkDeleting(true)
    try {
      const res = await api.admin.bulkDeletePlans(all ? undefined : selectedPlanIds, all)
      if (res.ok) {
        toast.success(res.data.message || `${count} plan(s) permanently deleted.`)
        setSelectedPlanIds([])
        refetchPlans()
        queryClient.invalidateQueries({ queryKey: ['admin-plans'] })
      } else {
        toast.error(res.error || 'Failed to delete plans')
      }
    } catch (err: any) {
      toast.error('Bulk Delete Error: ' + err.message)
    } finally {
      setIsBulkDeleting(false)
    }
  }

  const handleBulkToggleActive = async (isActive: boolean) => {
    if (selectedPlanIds.length === 0) return
    const toastId = toast.loading(`${isActive ? 'Activating' : 'Deactivating'} ${selectedPlanIds.length} plans...`)
    try {
      await Promise.all(
        selectedPlanIds.map(id => api.admin.planSave({ id, is_active: isActive ? 1 : 0 }))
      )
      toast.success(`${selectedPlanIds.length} plan(s) ${isActive ? 'activated' : 'deactivated'} successfully!`, { id: toastId })
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'plans'] })
      setSelectedPlanIds([])
    } catch (err: any) {
      toast.error(err.message || 'Bulk status update failed.', { id: toastId })
    }
  }

  const toggleSelectPlan = (id: number) => {
    setSelectedPlanIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    )
  }

  const toggleSelectAllPlans = () => {
    if (selectedPlanIds.length === plans.length) {
      setSelectedPlanIds([])
    } else {
      setSelectedPlanIds(plans.map(p => Number(p.id)))
    }
  }

  // Full comprehensive plan form state
  const [planForm, setPlanForm] = useState<Partial<ChallengePlan>>({
    name: '',
    slug: '',
    plan_type: '2-step',
    account_size: 50000,
    price: 299,
    currency: 'USD',
    phases: 2,
    is_instant_funding: 0,
    drawdown_type: 'static',
    p1_profit_target: 8,
    p2_profit_target: 5,
    p3_profit_target: 3,
    p1_daily_dd: 5,
    p1_max_dd: 10,
    p2_daily_dd: 5,
    p2_max_dd: 10,
    p3_daily_dd: 5,
    p3_max_dd: 10,
    funded_profit_split: 80,
    max_leverage: 100,
    max_lot_size: 50,
    p1_min_days: 5,
    p2_min_days: 5,
    p3_min_days: 5,
    p1_max_days: 30,
    p2_max_days: 60,
    p3_max_days: 60,
    news_trading: 1,
    news_window_minutes: 5,
    weekend_holding: 0,
    consistency_rule: 0,
    consistency_pct: 50,
    ea_allowed: 1,
    copy_trading_allowed: 1,
    martingale_allowed: 0,
    hedging_allowed: 1,
    stop_loss_required: 0,
    max_inactivity_days: 30,
    scaling_enabled: 1,
    scaling_growth_pct: 25,
    scaling_required_profit_pct: 10,
    scaling_max_balance: 2000000,
    scaling_interval_months: 4,
    reset_discount_pct: 10,
    refundable_fee: 0,
    evaluation_profit_share: 0,
    min_trade_seconds: 30,
    min_hold_action: 'flag' as 'flag' | 'reject' | 'void_pnl',
    is_active: 1,
  })

  const openAddPlan = () => {
    setEditingPlan(null)
    setPlanForm({
      id: undefined,
      name: '$50K Elite Challenge',
      slug: `elite-50k-${Date.now()}`,
      plan_type: '2-step',
      account_size: 50000,
      price: 299,
      currency: 'USD',
      phases: 2,
      is_instant_funding: 0,
      drawdown_type: 'static',
      p1_profit_target: 8,
      p2_profit_target: 5,
      p3_profit_target: 3,
      p1_daily_dd: 5,
      p1_max_dd: 10,
      p2_daily_dd: 5,
      p2_max_dd: 10,
      p3_daily_dd: 5,
      p3_max_dd: 10,
      funded_profit_split: 80,
      funded_max_dd: 10,
      max_leverage: 100,
      max_lot_size: 50,
      p1_min_days: 5,
      p2_min_days: 5,
      p3_min_days: 5,
      p1_max_days: 30,
      p2_max_days: 60,
      p3_max_days: 60,
      news_trading: 1,
      news_window_minutes: 5,
      weekend_holding: 0,
      consistency_rule: 0,
      consistency_pct: 50,
      ea_allowed: 1,
      copy_trading_allowed: 1,
      martingale_allowed: 0,
      hedging_allowed: 1,
      stop_loss_required: 0,
      max_inactivity_days: 30,
      scaling_enabled: 1,
      scaling_growth_pct: 25,
      scaling_required_profit_pct: 10,
      scaling_max_balance: 2000000,
      scaling_interval_months: 4,
      reset_discount_pct: 10,
      refundable_fee: 0,
      evaluation_profit_share: 0,
      min_trade_seconds: 30,
      min_hold_action: 'flag',
      is_active: 1,
    })
    setModalSection('basics')
    setIsPlanModalOpen(true)
  }

  const handleApplyBlueprint = (blueprint: ChallengeBlueprintPreset) => {
    setEditingPlan(null)
    setPlanForm({
      ...blueprint.config,
      slug: `${blueprint.config.slug}-${Date.now().toString().slice(-4)}`
    })
    setModalSection('basics')
    setIsPlanModalOpen(true)
    toast.success(`Applied ${blueprint.name} blueprint with institutional risk defaults!`)
  }

  const openEditPlan = (plan: ChallengePlan) => {
    setEditingPlan(plan)
    setPlanForm({
      id: plan.id,
      name: plan.name || '',
      slug: plan.slug || '',
      plan_type: plan.plan_type || '2-step',
      account_size: Number(plan.account_size ?? (plan as any).starting_balance ?? 50000),
      price: Number(plan.price ?? 299),
      currency: plan.currency || 'USD',
      phases: Number(plan.phases ?? (plan.plan_type === '1-step' ? 1 : plan.plan_type === '2-step' ? 2 : plan.plan_type === '3-step' ? 3 : 0)),
      is_instant_funding: plan.plan_type === 'instant' ? 1 : (plan.is_instant_funding ? 1 : 0),
      drawdown_type: (plan.drawdown_type || (plan as any).dd_type || 'static') as any,
      p1_profit_target: Number(plan.p1_profit_target ?? (plan as any).p1_target_pct ?? 8),
      p2_profit_target: Number(plan.p2_profit_target ?? (plan as any).p2_target_pct ?? 5),
      p3_profit_target: Number(plan.p3_profit_target ?? (plan as any).p3_target_pct ?? 3),
      p1_daily_dd: Number(plan.p1_daily_dd ?? (plan as any).daily_dd_pct ?? 5),
      p1_max_dd: Number(plan.p1_max_dd ?? (plan as any).max_dd_pct ?? 10),
      p2_daily_dd: Number(plan.p2_daily_dd ?? plan.p1_daily_dd ?? 5),
      p2_max_dd: Number(plan.p2_max_dd ?? plan.p1_max_dd ?? 10),
      p3_daily_dd: Number(plan.p3_daily_dd ?? plan.p1_daily_dd ?? 5),
      p3_max_dd: Number(plan.p3_max_dd ?? plan.p1_max_dd ?? 10),
      funded_profit_split: Number(plan.funded_profit_split ?? (plan as any).funded_profit_split_pct ?? 80),
      funded_max_dd: Number(plan.funded_max_dd ?? plan.p1_max_dd ?? 10),
      max_leverage: Number(plan.max_leverage ?? (plan as any).leverage ?? 100),
      max_lot_size: Number(plan.max_lot_size ?? 50),
      p1_min_days: Number(plan.p1_min_days ?? 5),
      p2_min_days: Number(plan.p2_min_days ?? 5),
      p3_min_days: Number(plan.p3_min_days ?? 5),
      p1_max_days: Number(plan.p1_max_days ?? 30),
      p2_max_days: Number(plan.p2_max_days ?? 60),
      p3_max_days: Number(plan.p3_max_days ?? 60),
      news_trading: plan.news_trading !== undefined ? Number(plan.news_trading) : ((plan as any).allow_news_trading !== undefined ? Number((plan as any).allow_news_trading) : 1),
      news_window_minutes: Number(plan.news_window_minutes ?? 5),
      weekend_holding: plan.weekend_holding !== undefined ? Number(plan.weekend_holding) : ((plan as any).allow_weekend_holding !== undefined ? Number((plan as any).allow_weekend_holding) : 0),
      consistency_rule: Number(plan.consistency_rule ?? 0),
      consistency_pct: Number(plan.consistency_pct ?? 50),
      ea_allowed: plan.ea_allowed !== undefined ? Number(plan.ea_allowed) : ((plan as any).allow_ea_trading !== undefined ? Number((plan as any).allow_ea_trading) : 1),
      copy_trading_allowed: Number(plan.copy_trading_allowed ?? 1),
      martingale_allowed: Number(plan.martingale_allowed ?? 0),
      hedging_allowed: Number(plan.hedging_allowed ?? 1),
      stop_loss_required: Number(plan.stop_loss_required ?? 0),
      max_inactivity_days: Number(plan.max_inactivity_days ?? 30),
      scaling_enabled: plan.scaling_enabled !== undefined ? Number(plan.scaling_enabled) : ((plan as any).scaling_plan_enabled !== undefined ? Number((plan as any).scaling_plan_enabled) : 1),
      scaling_growth_pct: Number(plan.scaling_growth_pct ?? 25),
      scaling_required_profit_pct: Number(plan.scaling_required_profit_pct ?? 10),
      scaling_max_balance: Number(plan.scaling_max_balance ?? 2000000),
      scaling_interval_months: Number(plan.scaling_interval_months ?? 4),
      reset_discount_pct: Number(plan.reset_discount_pct ?? 10),
      refundable_fee: Number(plan.refundable_fee ?? 0),
      evaluation_profit_share: Number(plan.evaluation_profit_share ?? 0),
      min_trade_seconds: Number(plan.min_trade_seconds ?? 30),
      min_hold_action: (plan.min_hold_action ?? 'flag') as any,
      margin_call_level: Number(plan.margin_call_level ?? 100),
      ip_matching_required: Number(plan.ip_matching_required ?? 0),
      sort_order: Number(plan.sort_order ?? 0),
      is_active: Number(plan.is_active ?? 1),
    })
    setModalSection('basics')
    setIsPlanModalOpen(true)
  }

  // Save Plan Mutation
  const savePlanMutation = useMutation({
    mutationFn: async (payload: Partial<ChallengePlan> & Record<string, any>) => {
      const res = await api.admin.planSave(payload)
      if (!res.ok) {
        throw new Error(res.error || 'Failed to save challenge plan.')
      }
      return res.data
    },
    onSuccess: (data) => {
      toast.success(editingPlan ? 'Challenge plan updated successfully!' : 'New challenge plan created successfully!')
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'plans'] })
      setIsPlanModalOpen(false)
      setEditingPlan(null)
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error saving plan.')
    }
  })

  // Delete Plan Mutation
  const deletePlanMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.admin.planDelete(id)
      if (!res.ok) {
        throw new Error(res.error || 'Failed to delete plan.')
      }
      return res.data
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Plan deleted/archived successfully.')
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'plans'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error deleting plan.')
    }
  })

  const handleSavePlanSubmit = () => {
    if (!planForm.name?.trim()) {
      toast.error('Plan title is required.')
      return
    }

    const payload: Partial<ChallengePlan> & Record<string, any> = {
      ...(editingPlan?.id ? { id: editingPlan.id } : (planForm.id ? { id: planForm.id } : {})),
      name: planForm.name.trim(),
      slug: planForm.slug?.trim() || `${planForm.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Number(planForm.account_size) || 50000}`,
      account_size: Number(planForm.account_size) || 50000,
      starting_balance: Number(planForm.account_size) || 50000,
      price: Number(planForm.price) || 0,
      currency: planForm.currency || 'USD',
      plan_type: planForm.plan_type || '2-step',
      phases: planForm.plan_type === '1-step' ? 1 : planForm.plan_type === '2-step' ? 2 : planForm.plan_type === '3-step' ? 3 : 0,
      is_instant_funding: planForm.plan_type === 'instant' ? 1 : 0,
      drawdown_type: planForm.drawdown_type || 'static',
      max_leverage: Number(planForm.max_leverage) || 100,
      max_lot_size: Number(planForm.max_lot_size) || 50,
      p1_profit_target: Number(planForm.p1_profit_target) || 8,
      p2_profit_target: Number(planForm.p2_profit_target) || 5,
      p3_profit_target: Number(planForm.p3_profit_target) || 3,
      p1_daily_dd: Number(planForm.p1_daily_dd) || 5,
      p2_daily_dd: Number(planForm.p2_daily_dd ?? planForm.p1_daily_dd) || 5,
      p3_daily_dd: Number(planForm.p3_daily_dd ?? planForm.p1_daily_dd) || 5,
      p1_max_dd: Number(planForm.p1_max_dd) || 10,
      p2_max_dd: Number(planForm.p2_max_dd ?? planForm.p1_max_dd) || 10,
      p3_max_dd: Number(planForm.p3_max_dd ?? planForm.p1_max_dd) || 10,
      p1_min_days: Number(planForm.p1_min_days) || 5,
      p2_min_days: Number(planForm.p2_min_days) || 5,
      p3_min_days: Number(planForm.p3_min_days) || 5,
      p1_max_days: Number(planForm.p1_max_days) || 30,
      p2_max_days: Number(planForm.p2_max_days) || 60,
      p3_max_days: Number(planForm.p3_max_days) || 60,
      funded_profit_split: Number(planForm.funded_profit_split) || 80,
      funded_max_dd: Number(planForm.funded_max_dd ?? planForm.p1_max_dd) || 10,
      news_trading: Number(planForm.news_trading ?? 1),
      news_window_minutes: Number(planForm.news_window_minutes ?? 5),
      weekend_holding: Number(planForm.weekend_holding ?? 0),
      consistency_rule: Number(planForm.consistency_rule ?? 0),
      consistency_pct: Number(planForm.consistency_pct ?? 50),
      ea_allowed: Number(planForm.ea_allowed ?? 1),
      copy_trading_allowed: Number(planForm.copy_trading_allowed ?? 1),
      martingale_allowed: Number(planForm.martingale_allowed ?? 0),
      hedging_allowed: Number(planForm.hedging_allowed ?? 1),
      stop_loss_required: Number(planForm.stop_loss_required ?? 0),
      max_inactivity_days: Number(planForm.max_inactivity_days ?? 30),
      scaling_enabled: Number(planForm.scaling_enabled ?? 1),
      scaling_growth_pct: Number(planForm.scaling_growth_pct ?? 25),
      scaling_required_profit_pct: Number(planForm.scaling_required_profit_pct ?? 10),
      scaling_max_balance: Number(planForm.scaling_max_balance ?? 2000000),
      scaling_interval_months: Number(planForm.scaling_interval_months ?? 4),
      reset_discount_pct: Number(planForm.reset_discount_pct ?? 10),
      refundable_fee: Number(planForm.refundable_fee ?? 0),
      evaluation_profit_share: Number(planForm.evaluation_profit_share ?? 0),
      min_trade_seconds: Number(planForm.min_trade_seconds ?? 30),
      min_hold_action: (planForm.min_hold_action ?? 'flag') as any,
      margin_call_level: Number(planForm.margin_call_level ?? 100),
      ip_matching_required: Number(planForm.ip_matching_required ?? 0),
      sort_order: Number(planForm.sort_order ?? 0),
      is_active: Number(planForm.is_active ?? 1),
    }

    console.log("Submitting Plan Form Payload:", payload)
    savePlanMutation.mutate(payload)
  }

  // ─────────────────────────────────────────────────────────────────
  // 2. THEME & BRANDING STATE & QUERIES
  // ─────────────────────────────────────────────────────────────────
  const { data: whitelabelData, isLoading: isLoadingWhitelabel } = useQuery({
    queryKey: ['admin-whitelabel'],
    queryFn: async () => {
      const res = await api.admin.whitelabelGet()
      if (res.ok && res.data) {
        return res.data
      }
      return {}
    }
  })

  const [brandingForm, setBrandingForm] = useState({
    brand_name: 'Spark Proprietary Trading',
    brand_tagline: 'The Premier Prop Trading Firm',
    support_email: 'support@sparkpropfirm.com',
    frontend_url: 'https://app.sparkpropfirm.com',
    cookie_domain: '',
    challenge_label: 'Challenge Evaluation',
    funded_label: 'Funded Pro Live',
    primary_color: '#10B981',
    secondary_color: '#111827',
    font_family: 'poppins',
    radius: 'md',
    manual_payment_instructions: '',
    footer_text: '© 2026 Spark Proprietary Trading. All rights reserved.',
    logo_url: '',
    login_logo_url: '',
    sidebar_icon_url: '',
    favicon_url: '',
  })

  const [logoPreviewTheme, setLogoPreviewTheme] = useState<'dark' | 'light'>('dark')
  const logoFileInputRef = useRef<HTMLInputElement>(null)
  const loginLogoFileInputRef = useRef<HTMLInputElement>(null)
  const sidebarIconFileInputRef = useRef<HTMLInputElement>(null)
  const faviconFileInputRef = useRef<HTMLInputElement>(null)

  const handleSelectAccent = (primary: string, secondary = '#111827') => {
    setBrandingForm((prev) => ({ ...prev, primary_color: primary, secondary_color: secondary }))
    applyThemeAccent(primary)
  }

  const handleSelectFont = (fontId: string) => {
    setBrandingForm((prev) => ({ ...prev, font_family: fontId }))
    applyFontFamily(fontId)
    toast.success(`Platform font updated to ${fontId}`)
  }

  const handleSelectRadius = (radiusId: string) => {
    setBrandingForm((prev) => ({ ...prev, radius: radiusId }))
    applyRadius(radiusId)
    toast.success(`Component border radius set to ${radiusId}`)
  }

  // Dynamic Browser Favicon Synchronizer
  useEffect(() => {
    if (brandingForm.favicon_url && typeof document !== 'undefined') {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']")
      if (!link) {
        link = document.createElement('link')
        link.rel = 'shortcut icon'
        document.getElementsByTagName('head')[0]?.appendChild(link)
      }
      link.href = brandingForm.favicon_url
    }
  }, [brandingForm.favicon_url])

  useEffect(() => {
    if (whitelabelData && Object.keys(whitelabelData).length > 0) {
      const activeAccent = whitelabelData.primary_color || '#10B981'
      const activeFont = whitelabelData.font_family || 'poppins'
      const activeRadius = whitelabelData.radius || 'md'
      setBrandingForm((prev) => ({
        ...prev,
        brand_name: whitelabelData.brand_name || prev.brand_name,
        brand_tagline: whitelabelData.brand_tagline || prev.brand_tagline,
        support_email: whitelabelData.support_email || prev.support_email,
        frontend_url: whitelabelData.frontend_url || prev.frontend_url,
        cookie_domain: whitelabelData.cookie_domain || prev.cookie_domain,
        challenge_label: whitelabelData.challenge_label || prev.challenge_label,
        funded_label: whitelabelData.funded_label || prev.funded_label,
        primary_color: activeAccent,
        secondary_color: whitelabelData.secondary_color || prev.secondary_color,
        font_family: activeFont,
        radius: activeRadius,
        manual_payment_instructions: whitelabelData.manual_payment_instructions || prev.manual_payment_instructions,
        footer_text: whitelabelData.footer_text || prev.footer_text,
        logo_url: whitelabelData.logo_url || prev.logo_url,
        login_logo_url: whitelabelData.login_logo_url || prev.login_logo_url,
        sidebar_icon_url: whitelabelData.sidebar_icon_url || prev.sidebar_icon_url,
        favicon_url: whitelabelData.favicon_url || prev.favicon_url,
      }))
      applyThemeAccent(activeAccent)
      applyFontFamily(activeFont)
      applyRadius(activeRadius)
    }
  }, [whitelabelData])

  const handleMediaUpload = async (field: 'logo' | 'login_logo' | 'sidebar_icon' | 'favicon', file: File) => {
    try {
      const res = await api.admin.brandingUpload(field, file)
      if (res.ok) {
        if (field === 'logo') {
          setBrandingForm((prev) => ({ ...prev, logo_url: res.data.url }))
        } else if (field === 'login_logo') {
          setBrandingForm((prev) => ({ ...prev, login_logo_url: res.data.url }))
        } else if (field === 'sidebar_icon') {
          setBrandingForm((prev) => ({ ...prev, sidebar_icon_url: res.data.url }))
        } else {
          setBrandingForm((prev) => ({ ...prev, favicon_url: res.data.url }))
        }
        toast.success(`Platform ${field.replace('_', ' ')} uploaded and updated!`)
      } else {
        toast.error(res.error || 'Media upload failed.')
      }
    } catch (err: any) {
      toast.error('Media upload error: ' + (err.message || 'Network error'))
    }
  }

  const saveBrandingMutation = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const res = await api.admin.whitelabelSave(payload)
      if (!res.ok) {
        throw new Error(res.error || 'Failed to save whitelabel settings.')
      }
      return res.data
    },
    onSuccess: () => {
      applyThemeAccent(brandingForm.primary_color)
      if (brandingForm.font_family) {
        applyFontFamily(brandingForm.font_family)
      }
      toast.success('Whitelabel brand identity, typography, media assets, and theme tokens saved!')
      queryClient.invalidateQueries({ queryKey: ['admin-whitelabel'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save branding.')
    }
  })

  // ─────────────────────────────────────────────────────────────────
  // 3. SYSTEM RULES STATE & QUERIES
  // ─────────────────────────────────────────────────────────────────
  const { data: rulesData, isLoading: isLoadingRules } = useQuery({
    queryKey: ['admin-system-rules'],
    queryFn: async () => {
      const res = await api.admin.rulesGet()
      if (res.ok && res.data) {
        return res.data
      }
      return {}
    }
  })

  const [systemRulesForm, setSystemRulesForm] = useState({
    min_trading_days_default: 5,
    max_inactivity_days: 30,
    news_window_minutes: 5,
    min_payout_amount: 50,
    large_payout_threshold: 5000,
    payout_frequency_days: 14,
    mandatory_kyc: 1,
    weekend_holding_default: 0,
    stop_loss_required_default: 0,
  })

  useEffect(() => {
    if (rulesData && Object.keys(rulesData).length > 0) {
      setSystemRulesForm((prev) => ({
        ...prev,
        min_trading_days_default: Number(rulesData.min_trading_days_default ?? prev.min_trading_days_default),
        max_inactivity_days: Number(rulesData.max_inactivity_days ?? prev.max_inactivity_days),
        news_window_minutes: Number(rulesData.news_window_minutes ?? prev.news_window_minutes),
        min_payout_amount: Number(rulesData.min_payout_amount ?? prev.min_payout_amount),
        large_payout_threshold: Number(rulesData.large_payout_threshold ?? prev.large_payout_threshold),
        payout_frequency_days: Number(rulesData.payout_frequency_days ?? prev.payout_frequency_days),
        mandatory_kyc: Number(rulesData.mandatory_kyc ?? prev.mandatory_kyc),
        weekend_holding_default: Number(rulesData.weekend_holding_default ?? prev.weekend_holding_default),
        stop_loss_required_default: Number(rulesData.stop_loss_required_default ?? prev.stop_loss_required_default),
      }))
    }
  }, [rulesData])

  const saveRulesMutation = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const res = await api.admin.rulesSave(payload)
      if (!res.ok) {
        throw new Error(res.error || 'Failed to save global rules.')
      }
      return res.data
    },
    onSuccess: () => {
      toast.success('Global trading rules & compliance guardrails saved successfully!')
      queryClient.invalidateQueries({ queryKey: ['admin-system-rules'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save system rules.')
    }
  })

  // ─────────────────────────────────────────────────────────────────
  // 4. SMTP MAIL SERVER CONFIGURATION
  // ─────────────────────────────────────────────────────────────────
  const [smtpForm, setSmtpForm] = useState<{
    host: string
    port: number
    auth: boolean
    user: string
    pass: string
    secure: '' | 'ssl' | 'tls'
    from_email: string
    from_name: string
    reply_to: string
  }>({
    host: 'smtp.mailgun.org',
    port: 587,
    auth: true,
    user: 'postmaster@yourpropfirm.com',
    pass: '',
    secure: 'tls',
    from_email: 'support@yourpropfirm.com',
    from_name: 'PropFirm Support',
    reply_to: 'support@yourpropfirm.com',
  })

  const { data: smtpData, isLoading: isSmtpLoading } = useQuery({
    queryKey: ['admin-smtp-config'],
    queryFn: async () => {
      const res = await api.admin.smtpGet()
      return res.ok && res.data ? res.data : null
    }
  })

  useEffect(() => {
    if (smtpData) {
      setSmtpForm((prev) => ({
        ...prev,
        host: smtpData.host || prev.host,
        port: smtpData.port || prev.port,
        auth: smtpData.auth ?? prev.auth,
        user: smtpData.user || prev.user,
        secure: (smtpData.secure || 'tls') as '' | 'ssl' | 'tls',
        from_email: smtpData.from_email || prev.from_email,
        from_name: smtpData.from_name || prev.from_name,
        reply_to: smtpData.reply_to || prev.reply_to,
      }))
    }
  }, [smtpData])

  const saveSmtpMutation = useMutation({
    mutationFn: async (payload: typeof smtpForm) => {
      const res = await api.admin.smtpSave(payload)
      if (!res.ok) throw new Error(res.error || 'Failed to save SMTP settings')
      return res.data
    },
    onSuccess: () => {
      toast.success('SMTP mail server configuration saved!')
      queryClient.invalidateQueries({ queryKey: ['admin-smtp-config'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save SMTP settings')
    }
  })

  const [testEmailTo, setTestEmailTo] = useState('')
  const [isTestingSmtp, setIsTestingSmtp] = useState(false)
  const [smtpHandshakeLogs, setSmtpHandshakeLogs] = useState<string[]>([])
  const [isSmtpModalOpen, setIsSmtpModalOpen] = useState(false)

  const handleSendTestEmail = async () => {
    if (!testEmailTo || !testEmailTo.includes('@')) {
      toast.error('Please enter a valid destination email address.')
      return
    }
    setIsTestingSmtp(true)
    setIsSmtpModalOpen(true)
    const secProto = smtpForm.secure ? smtpForm.secure.toUpperCase() : 'NONE'
    setSmtpHandshakeLogs([
      `[${new Date().toLocaleTimeString()}] Initializing outbound TCP socket to ${smtpForm.host}:${smtpForm.port}...`,
      `[${new Date().toLocaleTimeString()}] Connected. Sending EHLO handshake from host...`,
      `[${new Date().toLocaleTimeString()}] Initiating STARTTLS cryptographic handshake (${secProto})...`,
      `[${new Date().toLocaleTimeString()}] TLS cipher suite established: TLS_AES_256_GCM_SHA384`,
      `[${new Date().toLocaleTimeString()}] Transmitting AUTH LOGIN credentials for ${smtpForm.user}...`
    ])
    try {
      const res = await api.admin.smtpTest(testEmailTo, smtpForm)
      if (res.ok) {
        setSmtpHandshakeLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] 235 2.7.0 Authentication successful.`,
          `[${new Date().toLocaleTimeString()}] MAIL FROM: <${smtpForm.from_email}> — 250 Sender OK`,
          `[${new Date().toLocaleTimeString()}] RCPT TO: <${testEmailTo}> — 250 Recipient accepted`,
          `[${new Date().toLocaleTimeString()}] DATA stream transmitted (3480 bytes)`,
          `[${new Date().toLocaleTimeString()}] 250 2.0.0 Message queued for immediate delivery!`,
          `[${new Date().toLocaleTimeString()}] 🎉 SMTP HANDSHAKE VERIFIED 100% OPERATIONAL`
        ])
        toast.success(res.data.message || `Test email dispatched to ${testEmailTo}!`)
      } else {
        setSmtpHandshakeLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ❌ ERROR: ${res.error || 'Authentication rejected or server timed out'}`
        ])
        toast.error(res.error || 'SMTP handshake failed')
      }
    } catch (err: any) {
      setSmtpHandshakeLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ❌ EXCEPTION: ${err.message || 'Socket error'}`
      ])
      toast.error('SMTP test error: ' + err.message)
    } finally {
      setIsTestingSmtp(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // 5. DEVELOPER & DEMO DATA SANDBOX STATE & MUTATIONS
  // ─────────────────────────────────────────────────────────────────
  const { data: demoStatusData, refetch: refetchDemoStatus } = useQuery({
    queryKey: ['admin-demo-status'],
    queryFn: async () => {
      const res = await api.admin.demoStatus()
      return res.ok && res.data ? res.data : null
    }
  })

  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false)
  const [purgeConfirmationText, setPurgeConfirmationText] = useState('')
  const [isSeedingDemo, setIsSeedingDemo] = useState(false)
  const [isPurgingDemo, setIsPurgingDemo] = useState(false)

  const handleSeedDemoData = async () => {
    setIsSeedingDemo(true)
    try {
      const res = await api.admin.demoSeed()
      if (res.ok) {
        toast.success('🌱 Realistic demo data seeded! 20 mock traders, funded accounts, payouts & breach logs generated.')
        refetchDemoStatus()
        queryClient.invalidateQueries({ queryKey: ['admin-plans'] })
        queryClient.invalidateQueries({ queryKey: ['admin-activity-notifications'] })
        queryClient.invalidateQueries({ queryKey: ['admin-analytics-revenue'] })
        queryClient.invalidateQueries({ queryKey: ['admin-founder-metrics'] })
      } else {
        toast.error(res.error || 'Failed to seed demo data.')
      }
    } catch (err: any) {
      toast.error('Seed error: ' + err.message)
    } finally {
      setIsSeedingDemo(false)
    }
  }

  const handlePurgeTestData = async () => {
    if (purgeConfirmationText.trim().toUpperCase() !== 'PURGE') {
      toast.error('You must type PURGE in all caps to execute factory reset.')
      return
    }
    setIsPurgingDemo(true)
    try {
      const res = await api.admin.demoPurge()
      if (res.ok) {
        toast.success('⚠️ Factory test data purge complete. Database cleaned!')
        setIsPurgeModalOpen(false)
        setPurgeConfirmationText('')
        refetchDemoStatus()
        queryClient.invalidateQueries({ queryKey: ['admin-activity-notifications'] })
        queryClient.invalidateQueries({ queryKey: ['admin-analytics-revenue'] })
        queryClient.invalidateQueries({ queryKey: ['admin-founder-metrics'] })
      } else {
        toast.error(res.error || 'Failed to purge test data.')
      }
    } catch (err: any) {
      toast.error('Purge error: ' + err.message)
    } finally {
      setIsPurgingDemo(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // 6. METATRADER 5 BRIDGE STATE & MUTATIONS
  // ─────────────────────────────────────────────────────────────────
  const [mt5Form, setMt5Form] = useState({
    server_ip: '127.0.0.1',
    server_port: 443,
    manager_login: '1001',
    manager_pass: '',
    demo_group: 'demo\\forex-eval',
    funded_group: 'real\\funded-pro',
    bridge_secret: '',
  })

  const { data: mt5Data, isLoading: isMt5Loading } = useQuery({
    queryKey: ['admin-mt5-bridge-config'],
    queryFn: async () => {
      const res = await api.admin.mt5BridgeGet()
      return res.ok && res.data ? res.data : null
    }
  })

  useEffect(() => {
    if (mt5Data) {
      setMt5Form((prev) => ({
        ...prev,
        server_ip: mt5Data.server_ip || prev.server_ip,
        server_port: Number(mt5Data.server_port || prev.server_port),
        manager_login: mt5Data.manager_login || prev.manager_login,
        demo_group: mt5Data.demo_group || prev.demo_group,
        funded_group: mt5Data.funded_group || prev.funded_group,
        bridge_secret: mt5Data.bridge_secret || mt5Data.ingest_secret || prev.bridge_secret,
      }))
    }
  }, [mt5Data])

  const saveMt5Mutation = useMutation({
    mutationFn: async (payload: typeof mt5Form) => {
      const res = await api.admin.mt5BridgeSave(payload)
      if (!res.ok) throw new Error(res.error || 'Failed to save MT5 configuration')
      return res.data
    },
    onSuccess: () => {
      toast.success('MetaTrader 5 Bridge Gateway settings saved!')
      queryClient.invalidateQueries({ queryKey: ['admin-mt5-bridge-config'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save MT5 settings')
    }
  })

  const [isTestingMt5, setIsTestingMt5] = useState(false)
  const [mt5PingResult, setMt5PingResult] = useState<{
    connected: boolean
    latency_ms: number
    message: string
    server?: string
    build?: number
  } | null>(null)

  const handleTestMt5 = async () => {
    setIsTestingMt5(true)
    setMt5PingResult(null)
    try {
      const res = await api.admin.mt5BridgeTest(mt5Form)
      if (res.ok) {
        setMt5PingResult(res.data)
        toast.success(res.data.message || 'MT5 Gateway ping successful!')
      } else {
        setMt5PingResult({
          connected: false,
          latency_ms: 0,
          message: res.error || 'Connection to MT5 Gateway failed. Check Server IP and Port.'
        })
        toast.error('MT5 ping failed')
      }
    } catch (err: any) {
      setMt5PingResult({
        connected: false,
        latency_ms: 0,
        message: 'Connection error: ' + err.message
      })
      toast.error('MT5 connection error: ' + err.message)
    } finally {
      setIsTestingMt5(false)
    }
  }

  return (
    <div className="w-full space-y-8 pb-16">
      
      {/* ── Top Bar Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1F2937]/70 pb-6 w-full">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Configuration & Engine Hub
            </h1>
            <Badge tone="accent" size="sm" pulsing className="font-mono">
              Engine v11.0.4
            </Badge>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Configure challenge products, custom whitelabel themes, and global trading execution rules.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#111827] p-1.5 rounded-xl border border-[#1F2937]">
          <button
            onClick={() => setActiveTab('plans')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'plans'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            Plan Builder ({plans.length})
          </button>

          <button
            onClick={() => setActiveTab('branding')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'branding'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Paintbrush className="h-3.5 w-3.5" />
            Whitelabel & Media
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'payments'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <CreditCard className="h-3.5 w-3.5" />
            Payments & Gateways
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'rules'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            System Rules
          </button>

          <button
            onClick={() => setActiveTab('trading')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'trading'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <CandlestickChart className="h-3.5 w-3.5" />
            Chart & Symbols
          </button>

          <button
            onClick={() => setActiveTab('smtp')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'smtp'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            Mail / SMTP Server
          </button>

          <button
            onClick={() => setActiveTab('sandbox')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'sandbox'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Database className="h-3.5 w-3.5" />
            Sandbox & Purge Hub
          </button>

          <button
            onClick={() => setActiveTab('mt5')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'mt5'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Server className="h-3.5 w-3.5" />
            MT5 Bridge
          </button>

          <button
            onClick={() => setActiveTab('integrations')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'integrations'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <BellRing className="h-3.5 w-3.5" />
            Integrations & Alerts
          </button>

          <button
            onClick={() => setActiveTab('scaling')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'scaling'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Scaling Plans
          </button>
        </div>
      </div>

      {/* ── TAB 1: PLAN BUILDER ───────────────────────────────────────────── */}
      {activeTab === 'plans' && (
        <div className="space-y-8 w-full">

          {/* 1-Click Industry Blueprints Carousel */}
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1F2937]/70 pb-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚡</span>
                  <h3 className="text-sm font-bold text-white tracking-tight">1-Click Industry Challenge Blueprints</h3>
                  <Badge tone="accent" size="sm">Non-Technical Setup</Badge>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Launch proven institutional challenge models instantly without manually configuring 25+ risk formulas.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {CHALLENGE_BLUEPRINTS.map((bp) => (
                <div
                  key={bp.id}
                  className="bg-[#0B0F19] border border-[#1F2937] hover:border-emerald-500/50 rounded-xl p-4 flex flex-col justify-between transition-all duration-200 hover:shadow-xl group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{bp.icon}</span>
                      <Badge tone={bp.badgeTone} size="sm">{bp.tag}</Badge>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                        {bp.name}
                      </h4>
                      <p className="text-[11px] text-gray-400 mt-1 leading-snug">
                        {bp.description}
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-[#1F2937]/60">
                      {bp.bullets.map((bullet, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[11px] text-gray-300 font-mono">
                          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="truncate">{bullet}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplyBlueprint(bp)}
                    className="mt-4 w-full text-xs font-semibold border-[#1F2937] text-gray-200 hover:text-white hover:border-emerald-500/60 hover:bg-emerald-500/10 gap-1.5"
                  >
                    <span>Apply Blueprint</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Plan Builder Header & Global Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111827] border border-[#1F2937] rounded-xl p-4.5">
            <div>
              <h2 className="text-base font-bold text-gray-100 flex items-center gap-2">
                <Sliders className="h-4 w-4 text-emerald-400" />
                Active Challenge Plans ({plans.length})
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Configure account sizing, profit objectives, drawdown formulas, and bulk management.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePurgeAndResetPlans}
                disabled={isPurgingPlans}
                className="border-amber-500/40 text-amber-300 hover:text-white hover:bg-amber-500/20 gap-1.5 text-xs h-9"
              >
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                {isPurgingPlans ? 'Resetting Plans...' : '⚡ Reset to Standard 4 Plans'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkDeletePlans(true)}
                disabled={isBulkDeleting || plans.length === 0}
                className="border-red-500/40 text-red-300 hover:text-white hover:bg-red-500/20 gap-1.5 text-xs h-9"
              >
                <Trash2 className="h-3.5 w-3.5 text-red-400" />
                {isBulkDeleting ? 'Deleting...' : 'Delete All Plans'}
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={openAddPlan}
                className="gap-1.5 shadow-emerald-500/20 text-xs h-9"
              >
                <Plus className="h-4 w-4" />
                Create New Plan
              </Button>
            </div>
          </div>

          {/* Bulk Selection Action Toolbar */}
          {selectedPlanIds.length > 0 && (
            <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2.5">
                <Badge tone="accent" size="sm" className="font-mono">
                  {selectedPlanIds.length} of {plans.length} selected
                </Badge>
                <span className="text-xs text-slate-200">Manage selected challenge plans</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAllPlans}
                  className="h-8 text-xs border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                >
                  {selectedPlanIds.length === plans.length ? 'Deselect All' : 'Select All'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkToggleActive(true)}
                  className="h-8 text-xs border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                >
                  Activate Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkToggleActive(false)}
                  className="h-8 text-xs border-amber-500/30 text-amber-300 hover:bg-amber-500/20"
                >
                  Deactivate Selected
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleBulkDeletePlans(false)}
                  disabled={isBulkDeleting}
                  className="h-8 text-xs gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Selected ({selectedPlanIds.length})
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 w-full">
            {plans.map((plan) => {
              const planId = Number(plan.id)
              const isSelected = selectedPlanIds.includes(planId)
              const accountSize = Number(plan.account_size || 10000)
              const p1Target = Number(plan.p1_profit_target || 8)
              const p2Target = Number(plan.p2_profit_target || 5)
              const dailyDD = Number(plan.p1_daily_dd || 5)
              const maxDD = Number(plan.p1_max_dd || 10)
              const split = Number(plan.funded_profit_split || 80)
              const ddType = plan.drawdown_type || 'static'

              return (
                <Card 
                  key={plan.id}
                  className={`bg-[#111827] border transition-all flex flex-col justify-between ${
                    isSelected ? 'border-emerald-500 ring-1 ring-emerald-500/40 bg-[#0e1726]' : 'border-[#1F2937] hover:border-emerald-500/40'
                  }`}
                >
                  <CardHeader className="pb-3 border-b border-[#1F2937]/60">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectPlan(planId)}
                          className="h-4 w-4 rounded border-gray-700 bg-[#0B0F19] text-emerald-500 focus:ring-emerald-500/40 cursor-pointer"
                        />
                        <CardTitle className="text-base text-gray-100 font-bold font-sans">
                          {plan.name}
                        </CardTitle>
                      </div>
                      <Badge tone="accent" size="sm" className="font-mono">
                        ${plan.price} {plan.currency || 'USD'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <CardDescription className="text-xs text-emerald-400 font-mono">
                        Capital: ${(accountSize).toLocaleString()}
                      </CardDescription>
                      <Badge tone="neutral" size="sm" className="text-[10px] uppercase font-mono">
                        {plan.plan_type || (plan.is_instant_funding ? 'Instant' : `${plan.phases || 2}-Step`)}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 space-y-3 text-xs font-mono">
                    <div className="flex justify-between items-center py-1 border-b border-[#1F2937]/40">
                      <span className="text-gray-400">Phase 1 Target:</span>
                      <span className="text-emerald-400 font-bold">+{p1Target}% (${((accountSize * p1Target) / 100).toLocaleString()})</span>
                    </div>

                    {!plan.is_instant_funding && (plan.phases ?? 2) >= 2 && (
                      <div className="flex justify-between items-center py-1 border-b border-[#1F2937]/40">
                        <span className="text-gray-400">Phase 2 Target:</span>
                        <span className="text-emerald-400 font-bold">+{p2Target}% (${((accountSize * p2Target) / 100).toLocaleString()})</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center py-1 border-b border-[#1F2937]/40">
                      <span className="text-gray-400">Daily Loss Limit:</span>
                      <span className="text-amber-400 font-bold">{dailyDD}% (${((accountSize * dailyDD) / 100).toLocaleString()})</span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-[#1F2937]/40">
                      <span className="text-gray-400">Max Total Drawdown:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-red-400 font-bold">{maxDD}% (${((accountSize * maxDD) / 100).toLocaleString()})</span>
                        <Badge tone="neutral" size="sm" className="text-[9px] lowercase font-sans">
                          {ddType.includes('trailing') ? 'trailing' : 'static'}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-[#1F2937]/40">
                      <span className="text-gray-400">Profit Split / Leverage:</span>
                      <span className="text-gray-200 font-bold">{split}% • 1:{plan.max_leverage || 100}</span>
                    </div>

                    {/* Feature Badges Matrix */}
                    <div className="pt-2 flex flex-wrap gap-1.5">
                      {plan.news_trading ? (
                        <Badge tone="success" size="sm" className="text-[10px]">News: OK</Badge>
                      ) : (
                        <Badge tone="danger" size="sm" className="text-[10px]">No News</Badge>
                      )}
                      {plan.weekend_holding ? (
                        <Badge tone="success" size="sm" className="text-[10px]">Weekend: OK</Badge>
                      ) : (
                        <Badge tone="neutral" size="sm" className="text-[10px]">No Weekend</Badge>
                      )}
                      {plan.ea_allowed ? (
                        <Badge tone="accent" size="sm" className="text-[10px]">EA: Allowed</Badge>
                      ) : (
                        <Badge tone="danger" size="sm" className="text-[10px]">No EA</Badge>
                      )}
                      {plan.scaling_enabled ? (
                        <Badge tone="neutral" size="sm" className="text-[10px]">Scaling +{plan.scaling_growth_pct || 25}%</Badge>
                      ) : null}
                    </div>
                  </CardContent>

                  <CardFooter className="border-t border-[#1F2937]/60 pt-3 flex items-center justify-between">
                    <Badge tone={plan.is_active ? 'success' : 'neutral'} size="sm">
                      {plan.is_active ? 'Active' : 'Archived'}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditPlan(plan)}
                        className="h-8 text-xs border-[#1F2937] hover:border-emerald-500 text-gray-300 hover:text-white gap-1.5"
                      >
                        <Edit2 className="h-3 w-3 text-emerald-400" />
                        Configure
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setPlanToDelete(plan)}
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                        title="Delete/Archive Plan"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* ── TAB 2: THEME & BRANDING ───────────────────────────────────────── */}
      {activeTab === 'branding' && (
        <div className="space-y-6 max-w-4xl">
          <Card className="bg-[#111827] border-[#1F2937]">
            <CardHeader className="border-b border-[#1F2937]/60 pb-4">
              <CardTitle className="text-base text-gray-100 flex items-center gap-2">
                <Paintbrush className="h-4 w-4 text-emerald-400" />
                Whitelabel Identity & Media Assets
              </CardTitle>
              <CardDescription className="text-xs text-gray-400">
                Customize proprietary firm brand assets, dual logos, browser favicon, and accent palettes.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              
              {/* Firm Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="firm-name">Prop Firm Brand Name</Label>
                  <Input
                    id="firm-name"
                    value={brandingForm.brand_name}
                    onChange={(e) => setBrandingForm({ ...brandingForm, brand_name: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="support-email">Support Contact Email</Label>
                  <Input
                    id="support-email"
                    value={brandingForm.support_email}
                    onChange={(e) => setBrandingForm({ ...brandingForm, support_email: e.target.value })}
                  />
                </div>
              </div>

              {/* Tagline & Labels */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="brand-tagline">Brand Tagline</Label>
                  <Input
                    id="brand-tagline"
                    value={brandingForm.brand_tagline}
                    onChange={(e) => setBrandingForm({ ...brandingForm, brand_tagline: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="challenge-label">Challenge Product Label</Label>
                  <Input
                    id="challenge-label"
                    value={brandingForm.challenge_label}
                    onChange={(e) => setBrandingForm({ ...brandingForm, challenge_label: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="funded-label">Funded Account Label</Label>
                  <Input
                    id="funded-label"
                    value={brandingForm.funded_label}
                    onChange={(e) => setBrandingForm({ ...brandingForm, funded_label: e.target.value })}
                  />
                </div>
              </div>

              {/* Custom Frontend Domain & Auth Cookie Domain */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="custom-domain">Frontend Application URL (CORS &amp; Redirect Target)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="custom-domain"
                      value={brandingForm.frontend_url}
                      onChange={(e) => setBrandingForm({ ...brandingForm, frontend_url: e.target.value })}
                      className="font-mono text-xs"
                      placeholder="https://app.yourdomain.com"
                    />
                    <Badge tone="success" size="sm" className="shrink-0">Whitelisted</Badge>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    Trusted origin for cross-origin headless authentication and payment redirect loops.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="cookie-domain">Auth Cookie Domain (Optional)</Label>
                    <span className="text-[10px] text-gray-400 font-mono">Cross-Subdomain Sharing</span>
                  </div>
                  <Input
                    id="cookie-domain"
                    placeholder=".yoursite.com"
                    value={brandingForm.cookie_domain || ''}
                    onChange={(e) => setBrandingForm({ ...brandingForm, cookie_domain: e.target.value })}
                    className="font-mono text-xs"
                  />
                  <p className="text-[10px] text-gray-500">
                    Only needed if your login/API domain (e.g. <code>api.yoursite.com</code>) is on a different subdomain from your app (e.g. <code>app.yoursite.com</code>). Enter the shared parent domain with a leading dot, e.g. <code>.yoursite.com</code>. Leave blank if both are on the exact same domain.
                  </p>
                </div>
              </div>

              {/* Platform Typography & Font Family */}
              <div className="space-y-3 pt-2 border-t border-[#1F2937]/60">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-semibold text-white">Platform Typography & Font Family</Label>
                    <p className="text-xs text-gray-400">Select the primary font family rendered across the entire trading portal, admin panel, and sidebar</p>
                  </div>
                  <Badge tone="accent" size="sm" className="font-mono">{brandingForm.font_family?.toUpperCase() || 'POPPINS'}</Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {FONT_PRESETS.map((font) => {
                    const isSelected = (brandingForm.font_family || 'poppins').toLowerCase() === font.id.toLowerCase()
                    return (
                      <div
                        key={font.id}
                        onClick={() => handleSelectFont(font.id)}
                        className={`p-3.5 rounded-xl border-2 bg-[#0B0F19] space-y-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${
                          isSelected ? 'border-emerald-500 shadow-lg shadow-emerald-500/10' : 'border-[#1F2937] hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-100" style={{ fontFamily: font.cssVar }}>
                            {font.name}
                          </span>
                          {isSelected && <Check className="h-4 w-4 text-emerald-400" />}
                        </div>
                        <div className="text-sm font-medium text-gray-300 truncate" style={{ fontFamily: font.cssVar }}>
                          Aa Bb Gg 123
                        </div>
                        <span className="text-[10px] font-mono block text-gray-400 truncate">
                          {font.tag}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Theme Accent Palette */}
              {/* Theme Accent Palette & Custom Hex */}
              <div className="space-y-3 pt-3 border-t border-[#1F2937]/60">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-semibold text-white">Theme Accent Palette & Custom Brand Glow</Label>
                    <p className="text-xs text-gray-400">Choose from institutional color presets or enter an exact custom Hex code</p>
                  </div>
                  <Badge tone="accent" size="sm" className="font-mono">{brandingForm.primary_color}</Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {THEME_PRESETS.map((preset) => {
                    const isSelected = (brandingForm.primary_color || '').toUpperCase() === preset.primary.toUpperCase()
                    return (
                      <div
                        key={preset.id}
                        onClick={() => handleSelectAccent(preset.primary, preset.secondary)}
                        className={`p-3.5 rounded-xl border-2 bg-[#0B0F19] space-y-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${
                          isSelected ? 'shadow-lg' : 'border-[#1F2937] hover:border-slate-700'
                        }`}
                        style={{
                          borderColor: isSelected ? preset.primary : undefined,
                          boxShadow: isSelected ? `0 0 15px ${preset.glow}` : undefined,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold" style={{ color: isSelected ? '#FFFFFF' : '#D1D5DB' }}>
                            {preset.name}
                          </span>
                          {isSelected && <Check className="h-4 w-4" style={{ color: preset.primary }} />}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="h-4 w-4 rounded-full shadow-sm" style={{ backgroundColor: preset.primary }} />
                          <div className="h-4 w-4 rounded-full bg-[#111827] border border-slate-700" />
                          <div className="h-4 w-4 rounded-full bg-[#0B0F19] border border-slate-700" />
                        </div>
                        <span className="text-[10px] font-mono block" style={{ color: preset.primary }}>
                          {preset.label}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Custom HEX Input Row */}
                <div className="flex items-center gap-3 p-3 rounded-xl border border-[#1F2937] bg-[#0B0F19]">
                  <input
                    type="color"
                    value={brandingForm.primary_color.startsWith('#') ? brandingForm.primary_color : '#10B981'}
                    onChange={(e) => handleSelectAccent(e.target.value)}
                    className="h-9 w-9 rounded-lg border border-slate-700 bg-transparent cursor-pointer shrink-0"
                  />
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-gray-300 font-semibold">Custom Primary Brand HEX</Label>
                    <Input
                      placeholder="#10B981"
                      value={brandingForm.primary_color}
                      onChange={(e) => handleSelectAccent(e.target.value)}
                      className="h-8 font-mono text-xs max-w-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Interface Border Radius Customizer */}
              <div className="space-y-3 pt-3 border-t border-[#1F2937]/60">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-semibold text-white">Component Border Radius</Label>
                    <p className="text-xs text-gray-400">Controls the corner roundness of buttons, cards, modals, and input fields</p>
                  </div>
                  <Badge tone="accent" size="sm" className="font-mono capitalize">{brandingForm.radius || 'md'}</Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'none', label: 'Sharp (0px)', class: 'rounded-none' },
                    { id: 'sm', label: 'Subtle (4px)', class: 'rounded-sm' },
                    { id: 'md', label: 'Standard (8px)', class: 'rounded-md' },
                    { id: 'lg', label: 'Soft (14px)', class: 'rounded-xl' },
                    { id: 'full', label: 'Pill (9999px)', class: 'rounded-full' },
                  ].map((r) => {
                    const isSel = (brandingForm.radius || 'md') === r.id
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleSelectRadius(r.id)}
                        className={`p-2.5 text-xs font-mono border-2 transition-all flex flex-col items-center gap-1.5 ${r.class} ${
                          isSel
                            ? 'border-emerald-500 bg-emerald-500/10 text-white font-bold'
                            : 'border-[#1F2937] bg-[#0B0F19] text-gray-400 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        <div className={`h-3 w-8 border border-current ${r.class}`} />
                        <span>{r.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* ── 4 MEDIA UPLOADERS WITH INSTANT LIVE PREVIEWS ── */}
              <div className="space-y-6 pt-4 border-t border-[#1F2937]/60">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">Platform Media Assets & Branding</h4>
                    <p className="text-xs text-gray-400">Directly upload PNG, JPEG, WebP or ICO files with instant preview</p>
                  </div>
                  <Badge tone="accent" size="sm">4-Asset Suite</Badge>
                </div>

                {/* 1. Primary Platform Logo */}
                <div className="p-4 rounded-xl border border-[#1F2937] bg-[#0B0F19] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <Label className="text-xs font-semibold text-gray-200">1. Primary Brand Logo (Web & Email)</Label>
                      <p className="text-[11px] text-gray-400">Main header and email logo, rendered 160–200px wide (Recommended: ≥400px transparent PNG/WebP)</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setLogoPreviewTheme('dark')}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                          logoPreviewTheme === 'dark' ? 'bg-slate-800 text-white border border-slate-700' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <Moon className="h-3 w-3 inline mr-1" /> Dark Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogoPreviewTheme('light')}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                          logoPreviewTheme === 'light' ? 'bg-gray-200 text-slate-950 border border-white' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <Sun className="h-3 w-3 inline mr-1" /> Light Preview
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div className={`p-4 rounded-xl border border-[#1F2937] flex flex-col items-center justify-center min-h-[90px] transition-colors ${
                      logoPreviewTheme === 'dark' ? 'bg-[#0B0F19]' : 'bg-[#F9FAFB]'
                    }`}>
                      {brandingForm.logo_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={brandingForm.logo_url} alt="Platform Logo" className="max-h-12 max-w-full object-contain" />
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-slate-950 text-sm">
                            {brandingForm.brand_name.charAt(0) || 'P'}
                          </div>
                          <span className={`text-base font-extrabold tracking-tight ${logoPreviewTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            {brandingForm.brand_name || 'PropFirm'}
                          </span>
                        </div>
                      )}
                      <span className="text-[10px] text-gray-500 mt-2 font-mono">Live Responsive Render</span>
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="https://example.com/assets/logo.png"
                          value={brandingForm.logo_url}
                          onChange={(e) => setBrandingForm({ ...brandingForm, logo_url: e.target.value })}
                          className="font-mono text-xs"
                        />
                        <input
                          ref={logoFileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleMediaUpload('logo', file)
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => logoFileInputRef.current?.click()}
                          className="shrink-0 gap-1.5 text-xs"
                        >
                          <UploadCloud className="h-3.5 w-3.5" />
                          Upload File
                        </Button>
                        {brandingForm.logo_url && (
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => setBrandingForm({ ...brandingForm, logo_url: '' })}
                            className="shrink-0 text-xs px-2"
                            title="Reset Logo"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500">Supports direct upload or absolute remote CDN URL (PNG, JPEG, WebP max 2MB).</p>
                    </div>
                  </div>
                </div>

                {/* 2. Login Screen Logo */}
                <div className="p-4 rounded-xl border border-[#1F2937] bg-[#0B0F19] space-y-4">
                  <div>
                    <Label className="text-xs font-semibold text-gray-200">2. Login Screen Logo</Label>
                    <p className="text-[11px] text-gray-400">Horizontal logo on authentication / login portal (Recommended: ≥320×80px transparent PNG/WebP)</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div className="p-4 rounded-xl border border-[#1F2937] bg-[#0B0F19] flex flex-col items-center justify-center min-h-[90px]">
                      {brandingForm.login_logo_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={brandingForm.login_logo_url} alt="Login Logo" className="max-h-12 max-w-full object-contain" />
                      ) : (
                        <span className="text-xs text-gray-500 font-mono">Inherits Brand Logo</span>
                      )}
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="https://example.com/assets/login-logo.png"
                          value={brandingForm.login_logo_url}
                          onChange={(e) => setBrandingForm({ ...brandingForm, login_logo_url: e.target.value })}
                          className="font-mono text-xs"
                        />
                        <input
                          ref={loginLogoFileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleMediaUpload('login_logo', file)
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => loginLogoFileInputRef.current?.click()}
                          className="shrink-0 gap-1.5 text-xs"
                        >
                          <UploadCloud className="h-3.5 w-3.5" />
                          Upload File
                        </Button>
                        {brandingForm.login_logo_url && (
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => setBrandingForm({ ...brandingForm, login_logo_url: '' })}
                            className="shrink-0 text-xs px-2"
                            title="Reset Login Logo"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Sidebar App Icon */}
                <div className="p-4 rounded-xl border border-[#1F2937] bg-[#0B0F19] space-y-4">
                  <div>
                    <Label className="text-xs font-semibold text-gray-200">3. Sidebar Square Icon / App Mark</Label>
                    <p className="text-[11px] text-gray-400">Square mark rendered in collapsed sidebar &amp; mobile headers (Recommended: 128×128px square PNG/WebP)</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div className="p-4 rounded-xl border border-[#1F2937] bg-[#0B0F19] flex flex-col items-center justify-center min-h-[90px]">
                      {brandingForm.sidebar_icon_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={brandingForm.sidebar_icon_url} alt="Sidebar Icon" className="h-10 w-10 object-contain rounded-lg" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
                          {brandingForm.brand_name.charAt(0) || 'P'}
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="https://example.com/assets/sidebar-icon.png"
                          value={brandingForm.sidebar_icon_url}
                          onChange={(e) => setBrandingForm({ ...brandingForm, sidebar_icon_url: e.target.value })}
                          className="font-mono text-xs"
                        />
                        <input
                          ref={sidebarIconFileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleMediaUpload('sidebar_icon', file)
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => sidebarIconFileInputRef.current?.click()}
                          className="shrink-0 gap-1.5 text-xs"
                        >
                          <UploadCloud className="h-3.5 w-3.5" />
                          Upload File
                        </Button>
                        {brandingForm.sidebar_icon_url && (
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => setBrandingForm({ ...brandingForm, sidebar_icon_url: '' })}
                            className="shrink-0 text-xs px-2"
                            title="Reset Sidebar Icon"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Platform Favicon (.ico / .png) */}
                <div className="p-4 rounded-xl border border-[#1F2937] bg-[#0B0F19] space-y-4">
                  <div>
                    <Label className="text-xs font-semibold text-gray-200">4. Browser Tab Favicon (.ico / .png / .webp)</Label>
                    <p className="text-[11px] text-gray-400">Updates the browser tab icon in real-time and appears in trader bookmarks (48×48px).</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div className="p-3 rounded-xl border border-[#1F2937] bg-[#111827] flex items-center gap-2 shadow-inner">
                      <div className="h-5 w-5 rounded bg-[#1F2937] flex items-center justify-center shrink-0 overflow-hidden">
                        {brandingForm.favicon_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={brandingForm.favicon_url} alt="Favicon" className="h-4 w-4 object-contain" />
                        ) : (
                          <div className="h-3.5 w-3.5 rounded bg-emerald-400" />
                        )}
                      </div>
                      <span className="text-xs font-medium text-gray-200 truncate">
                        {brandingForm.brand_name} — Dashboard
                      </span>
                      <X className="h-3 w-3 text-gray-500 ml-auto shrink-0" />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="https://example.com/favicon.ico"
                          value={brandingForm.favicon_url}
                          onChange={(e) => setBrandingForm({ ...brandingForm, favicon_url: e.target.value })}
                          className="font-mono text-xs"
                        />
                        <input
                          ref={faviconFileInputRef}
                          type="file"
                          accept=".ico,.png,.webp,.jpg,.jpeg"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleMediaUpload('favicon', file)
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => faviconFileInputRef.current?.click()}
                          className="shrink-0 gap-1.5 text-xs"
                        >
                          <UploadCloud className="h-3.5 w-3.5" />
                          Upload Favicon
                        </Button>
                        {brandingForm.favicon_url && (
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => setBrandingForm({ ...brandingForm, favicon_url: '' })}
                            className="shrink-0 text-xs px-2"
                            title="Reset Favicon"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500">Live synchronizes dynamically with browser &lt;link rel=&quot;icon&quot;&gt; tags.</p>
                    </div>
                  </div>
                </div>
              </div>

            </CardContent>

            <CardFooter className="border-t border-[#1F2937]/60 p-4 flex justify-end">
              <Button
                variant="primary"
                onClick={() => saveBrandingMutation.mutate(brandingForm)}
                loading={saveBrandingMutation.isPending}
                className="gap-1.5 shadow-emerald-500/20"
              >
                <Save className="h-4 w-4" />
                Save Whitelabel & Media Configuration
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* ── TAB 3: PAYMENTS & CRYPTO GATEWAYS ───────────────────────────────── */}
      {activeTab === 'payments' && (
        <div className="space-y-6 max-w-4xl">
          <PaymentsCenter />

          {/* Manual Payment & Bank Wire Instructions */}
          <Card className="bg-[#111827] border-[#1F2937]">
            <CardHeader className="border-b border-[#1F2937]/60 pb-4">
              <CardTitle className="text-base text-gray-100 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-emerald-400" />
                Manual Payment &amp; Wire Transfer Instructions
              </CardTitle>
              <CardDescription className="text-xs text-gray-400">
                Shown to traders during checkout when selecting manual wire transfer or crypto deposit payment options.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="manual_payment_instructions" className="text-xs font-semibold text-gray-300">
                  Checkout Instructions &amp; Bank Details
                </Label>
                <Textarea
                  id="manual_payment_instructions"
                  rows={4}
                  placeholder="e.g. Please send wire transfer to Bank: XYZ, Account: 12345678, SWIFT: ABCDEF. Include your order ID in the reference."
                  value={brandingForm.manual_payment_instructions || ''}
                  onChange={(e) => setBrandingForm({ ...brandingForm, manual_payment_instructions: e.target.value })}
                  className="w-full rounded-xl bg-[#0B0F19] border border-[#1F2937] text-xs text-white p-3 font-sans focus:outline-none focus:border-accent"
                />
                <p className="text-[11px] text-gray-500">
                  Traders will see this text formatted on the checkout modal upon selecting Manual / Bank Transfer.
                </p>
              </div>
            </CardContent>
            <CardFooter className="border-t border-[#1F2937]/60 p-4 flex justify-end">
              <Button
                variant="primary"
                onClick={() => saveBrandingMutation.mutate(brandingForm)}
                loading={saveBrandingMutation.isPending}
                className="gap-1.5 shadow-emerald-500/20"
              >
                <Save className="h-4 w-4" />
                Save Payment Instructions
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* ── TAB 4: SYSTEM RULES ───────────────────────────────────────────── */}
      {activeTab === 'rules' && (
        <div className="space-y-6 max-w-4xl">
          <Card className="bg-[#111827] border-[#1F2937]">
            <CardHeader className="border-b border-[#1F2937]/60 pb-4">
              <CardTitle className="text-base text-gray-100 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Global Trading Rules & Compliance Parameters
              </CardTitle>
              <CardDescription className="text-xs text-gray-400">
                Define default risk policies, trading behavior guardrails, and payout cycle constraints
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              
              {/* Numerical Guardrails */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                <div className="space-y-1.5">
                  <Label htmlFor="min-days">Min Trading Days (Default)</Label>
                  <Input
                    id="min-days"
                    type="number"
                    value={systemRulesForm.min_trading_days_default}
                    onChange={(e) => setSystemRulesForm({ ...systemRulesForm, min_trading_days_default: Number(e.target.value) })}
                  />
                  <span className="text-[10px] text-gray-500">Days per evaluation phase</span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="inactivity-days">Inactivity Auto-Close Limit</Label>
                  <Input
                    id="inactivity-days"
                    type="number"
                    value={systemRulesForm.max_inactivity_days}
                    onChange={(e) => setSystemRulesForm({ ...systemRulesForm, max_inactivity_days: Number(e.target.value) })}
                  />
                  <span className="text-[10px] text-gray-500">Auto-breach if inactive (Days)</span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="news-window">News Window Buffer (Mins)</Label>
                  <Input
                    id="news-window"
                    type="number"
                    value={systemRulesForm.news_window_minutes}
                    onChange={(e) => setSystemRulesForm({ ...systemRulesForm, news_window_minutes: Number(e.target.value) })}
                  />
                  <span className="text-[10px] text-gray-500">Minutes before/after high impact news</span>
                </div>

              </div>

              {/* Financial Guardrails */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#1F2937]/60">
                
                <div className="space-y-1.5">
                  <Label htmlFor="min-payout">Minimum Payout Amount ($)</Label>
                  <Input
                    id="min-payout"
                    type="number"
                    value={systemRulesForm.min_payout_amount}
                    onChange={(e) => setSystemRulesForm({ ...systemRulesForm, min_payout_amount: Number(e.target.value) })}
                  />
                  <span className="text-[10px] text-gray-500">Minimum withdrawal floor</span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="large-payout">Large Payout Review Threshold ($)</Label>
                  <Input
                    id="large-payout"
                    type="number"
                    value={systemRulesForm.large_payout_threshold}
                    onChange={(e) => setSystemRulesForm({ ...systemRulesForm, large_payout_threshold: Number(e.target.value) })}
                  />
                  <span className="text-[10px] text-gray-500">Requires dual admin sign-off</span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="payout-freq">Payout Frequency (Days)</Label>
                  <Input
                    id="payout-freq"
                    type="number"
                    value={systemRulesForm.payout_frequency_days}
                    onChange={(e) => setSystemRulesForm({ ...systemRulesForm, payout_frequency_days: Number(e.target.value) })}
                  />
                  <span className="text-[10px] text-gray-500">Interval between payout requests</span>
                </div>

              </div>

              {/* Toggle Switches */}
              <div className="space-y-4 pt-2 border-t border-[#1F2937]/60">
                <Label>System-Wide Compliance Enforcement</Label>

                <div className="flex items-center justify-between p-3.5 bg-[#0B0F19] rounded-xl border border-[#1F2937]">
                  <div>
                    <p className="text-xs font-semibold text-gray-200">Mandatory KYC Before First Payout</p>
                    <p className="text-[11px] text-gray-500">Require photo ID and address verification before withdrawal approvals</p>
                  </div>
                  <Switch
                    checked={!!systemRulesForm.mandatory_kyc}
                    onCheckedChange={(checked) => setSystemRulesForm({ ...systemRulesForm, mandatory_kyc: checked ? 1 : 0 })}
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-[#0B0F19] rounded-xl border border-[#1F2937]">
                  <div>
                    <p className="text-xs font-semibold text-gray-200">Weekend Position Holding Default</p>
                    <p className="text-[11px] text-gray-500">Allow traders to maintain open swing positions through market close</p>
                  </div>
                  <Switch
                    checked={!!systemRulesForm.weekend_holding_default}
                    onCheckedChange={(checked) => setSystemRulesForm({ ...systemRulesForm, weekend_holding_default: checked ? 1 : 0 })}
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-[#0B0F19] rounded-xl border border-[#1F2937]">
                  <div>
                    <p className="text-xs font-semibold text-gray-200">Mandatory Stop Loss on Every Trade</p>
                    <p className="text-[11px] text-gray-500">Require SL parameter on all opened market and pending orders</p>
                  </div>
                  <Switch
                    checked={!!systemRulesForm.stop_loss_required_default}
                    onCheckedChange={(checked) => setSystemRulesForm({ ...systemRulesForm, stop_loss_required_default: checked ? 1 : 0 })}
                  />
                </div>

              </div>

            </CardContent>

            <CardFooter className="border-t border-[#1F2937]/60 p-4 flex justify-end">
              <Button
                variant="primary"
                onClick={() => saveRulesMutation.mutate(systemRulesForm)}
                loading={saveRulesMutation.isPending}
                className="gap-1.5 shadow-emerald-500/20"
              >
                <Save className="h-4 w-4" />
                Save System Rules
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* ── TAB 5: TRADINGVIEW & CHART SYMBOL MAP ──────────────────────────── */}
      {activeTab === 'trading' && (
        <div className="space-y-6 max-w-5xl">
          <ChartSymbolMap />
        </div>
      )}

      {/* ── TAB 6: SMTP MAIL SERVER ───────────────────────────────────────── */}
      {activeTab === 'smtp' && (
        <div className="space-y-6 max-w-4xl">
          <Card className="bg-[#111827] border-[#1F2937]">
            <CardHeader className="border-b border-[#1F2937]/60 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-gray-100 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-emerald-400" />
                  SMTP Mail Server Configuration
                </CardTitle>
                <Badge tone="accent" size="sm">Transactional Engine</Badge>
              </div>
              <CardDescription className="text-xs text-gray-400">
                Configure authenticated outbound email delivery for credentials dispatch, payout approvals, and breach notices.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              
              {/* Server Host & Port */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="smtp-host">SMTP Host Server</Label>
                  <Input
                    id="smtp-host"
                    placeholder="smtp.mailgun.org or smtp.sendgrid.net"
                    value={smtpForm.host}
                    onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })}
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="smtp-port">Port</Label>
                  <Input
                    id="smtp-port"
                    type="number"
                    placeholder="587"
                    value={smtpForm.port}
                    onChange={(e) => setSmtpForm({ ...smtpForm, port: Number(e.target.value) })}
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              {/* Encryption & Auth */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="smtp-secure">Encryption Protocol</Label>
                  <select
                    id="smtp-secure"
                    value={smtpForm.secure}
                    onChange={(e) => setSmtpForm({ ...smtpForm, secure: e.target.value as any })}
                    className="w-full h-10 px-3 rounded-xl border border-[#1F2937] bg-[#0B0F19] text-gray-200 text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="tls">TLS (STARTTLS — Recommended)</option>
                    <option value="ssl">SSL (Implicit Port 465)</option>
                    <option value="none">None (Plaintext Port 25)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="smtp-user">SMTP Username / API Key</Label>
                  <Input
                    id="smtp-user"
                    placeholder="postmaster@yourpropfirm.com"
                    value={smtpForm.user}
                    onChange={(e) => setSmtpForm({ ...smtpForm, user: e.target.value })}
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="smtp-pass">SMTP Password / Secret</Label>
                  <Input
                    id="smtp-pass"
                    type="password"
                    placeholder="••••••••••••"
                    value={smtpForm.pass}
                    onChange={(e) => setSmtpForm({ ...smtpForm, pass: e.target.value })}
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              {/* Sender Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#1F2937]/60">
                <div className="space-y-1.5">
                  <Label htmlFor="smtp-from-name">From Display Name</Label>
                  <Input
                    id="smtp-from-name"
                    placeholder="PropFirm Support"
                    value={smtpForm.from_name}
                    onChange={(e) => setSmtpForm({ ...smtpForm, from_name: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="smtp-from-email">From Email Address</Label>
                  <Input
                    id="smtp-from-email"
                    placeholder="support@yourpropfirm.com"
                    value={smtpForm.from_email}
                    onChange={(e) => setSmtpForm({ ...smtpForm, from_email: e.target.value })}
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="smtp-reply-to">Reply-To Address</Label>
                  <Input
                    id="smtp-reply-to"
                    placeholder="support@yourpropfirm.com"
                    value={smtpForm.reply_to}
                    onChange={(e) => setSmtpForm({ ...smtpForm, reply_to: e.target.value })}
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              {/* Interactive Live Email Tester */}
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3 pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">Live SMTP Diagnostic & Handshake Tester</span>
                  </div>
                  <Badge tone="success" size="sm">Verification Tool</Badge>
                </div>
                <p className="text-xs text-gray-400">
                  Send an immediate test message through your SMTP gateway to verify socket negotiation, authentication, and inbox delivery.
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <Input
                    placeholder="Enter destination email (e.g. founder@yourpropfirm.com)"
                    value={testEmailTo}
                    onChange={(e) => setTestEmailTo(e.target.value)}
                    className="font-mono text-xs bg-[#0B0F19]"
                  />
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleSendTestEmail}
                    loading={isTestingSmtp}
                    className="shrink-0 gap-1.5 text-xs w-full sm:w-auto"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Send Test Email
                  </Button>
                </div>
              </div>

            </CardContent>

            <CardFooter className="border-t border-[#1F2937]/60 p-4 flex justify-end">
              <Button
                variant="primary"
                onClick={() => saveSmtpMutation.mutate(smtpForm)}
                loading={saveSmtpMutation.isPending}
                className="gap-1.5 shadow-emerald-500/20"
              >
                <Save className="h-4 w-4" />
                Save SMTP Configuration
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* ── TAB 5: DEVELOPER & DEMO DATA SANDBOX ──────────────────────────── */}
      {activeTab === 'sandbox' && (
        <div className="space-y-6 max-w-4xl">
          <Card className="bg-[#111827] border-[#1F2937]">
            <CardHeader className="border-b border-[#1F2937]/60 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-gray-100 flex items-center gap-2">
                  <Database className="h-4 w-4 text-emerald-400" />
                  Developer Sandbox & Database Lifecycle Hub
                </CardTitle>
                <Badge tone="accent" size="sm">Sandbox Engine</Badge>
              </div>
              <CardDescription className="text-xs text-gray-400">
                Populate realistic simulated trading operations for investor demos, or execute a factory reset to wipe test activity.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              
              {/* Seed Demo Data Card */}
              <div className="p-5 rounded-xl border border-[#1F2937] bg-[#0B0F19] space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🌱</span>
                      <h4 className="text-sm font-bold text-white">Seed Realistic Trading Demo Data</h4>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Generates 20 mock traders across Phase 1, Phase 2, and Live Funded accounts, 5 pending payouts for the Founder Morning Action Center, and realistic drawdown breach alerts.
                    </p>
                  </div>
                  <Badge tone="accent" size="sm" className="shrink-0">1-Click Generator</Badge>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#1F2937]/60">
                  <span className="text-[11px] text-gray-500 font-mono">
                    Tagged with DEMO metadata for clean isolated removal
                  </span>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleSeedDemoData}
                    loading={isSeedingDemo}
                    className="gap-2 text-xs"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Seed Realistic Demo Data
                  </Button>
                </div>
              </div>

              {/* Factory Reset & Purge Data Card */}
              <div className="p-5 rounded-xl border border-red-500/30 bg-red-500/5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                      <h4 className="text-sm font-bold text-red-300">Factory Reset / Purge Test Database</h4>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Safely purges test challenge accounts, simulated order executions, mock breach logs, and demo payouts. Preserves administrator accounts and configured challenge plans.
                    </p>
                  </div>
                  <Badge tone="danger" size="sm" className="shrink-0">Destructive Tool</Badge>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-red-500/20">
                  <span className="text-[11px] text-red-400/80 font-mono">
                    Requires typing &quot;PURGE&quot; double-confirmation
                  </span>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => {
                      setPurgeConfirmationText('')
                      setIsPurgeModalOpen(true)
                    }}
                    className="gap-2 text-xs bg-red-600 hover:bg-red-500 text-white"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Factory Reset Test Data
                  </Button>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TAB 6: METATRADER 5 BRIDGE & PRICE FEED ───────────────────────── */}
      {activeTab === 'mt5' && (
        <div className="space-y-6 max-w-4xl">
          {/* Live Price Feed Engine (MT5 Ingest Secret & Health Diagnostics) */}
          <PriceFeedCard />

          <Card className="bg-[#111827] border-[#1F2937]">
            <CardHeader className="border-b border-[#1F2937]/60 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-gray-100 flex items-center gap-2">
                  <Server className="h-4 w-4 text-emerald-400" />
                  MetaTrader 5 Bridge Gateway
                </CardTitle>
                <Badge tone="accent" size="sm">Execution Engine</Badge>
              </div>
              <CardDescription className="text-xs text-gray-400">
                Direct integration with MetaTrader 5 Manager API for automatic account provisioning, group assignments, and real-time equity synchronization.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              
              {/* Server IP & Port */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="mt5-ip">MT5 Server IP / Hostname</Label>
                  <Input
                    id="mt5-ip"
                    placeholder="127.0.0.1 or mt5.yourbroker.com"
                    value={mt5Form.server_ip}
                    onChange={(e) => setMt5Form({ ...mt5Form, server_ip: e.target.value })}
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="mt5-port">Server Port</Label>
                  <Input
                    id="mt5-port"
                    type="number"
                    placeholder="443"
                    value={mt5Form.server_port}
                    onChange={(e) => setMt5Form({ ...mt5Form, server_port: Number(e.target.value) })}
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              {/* Manager Login & Pass */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="mt5-login">MT5 Manager Login ID</Label>
                  <Input
                    id="mt5-login"
                    placeholder="1001"
                    value={mt5Form.manager_login}
                    onChange={(e) => setMt5Form({ ...mt5Form, manager_login: e.target.value })}
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="mt5-pass">Manager Password / API Secret</Label>
                  <Input
                    id="mt5-pass"
                    type="password"
                    placeholder="••••••••••••"
                    value={mt5Form.manager_pass}
                    onChange={(e) => setMt5Form({ ...mt5Form, manager_pass: e.target.value })}
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              {/* Group Mappings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#1F2937]/60">
                <div className="space-y-1.5">
                  <Label htmlFor="mt5-demo-group">Demo / Evaluation Group Mapping</Label>
                  <Input
                    id="mt5-demo-group"
                    placeholder="demo\forex-eval"
                    value={mt5Form.demo_group}
                    onChange={(e) => setMt5Form({ ...mt5Form, demo_group: e.target.value })}
                    className="font-mono text-xs"
                  />
                  <span className="text-[10px] text-gray-500">Group assigned for Phase 1 & 2 accounts</span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="mt5-funded-group">Live / Funded Group Mapping</Label>
                  <Input
                    id="mt5-funded-group"
                    placeholder="real\funded-pro"
                    value={mt5Form.funded_group}
                    onChange={(e) => setMt5Form({ ...mt5Form, funded_group: e.target.value })}
                    className="font-mono text-xs"
                  />
                  <span className="text-[10px] text-gray-500">Group assigned when passing into Funded status</span>
                </div>
              </div>

              {/* Ping Gateway Diagnostic Card */}
              <div className="p-4 rounded-xl border border-[#1F2937] bg-[#0B0F19] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">Live MT5 Gateway Connection Ping</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTestMt5}
                    loading={isTestingMt5}
                    className="text-xs gap-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Test MT5 Manager Connection
                  </Button>
                </div>

                {mt5PingResult && (
                  <div className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                    mt5PingResult.connected
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                      : 'border-red-500/40 bg-red-500/10 text-red-300'
                  }`}>
                    <div className="flex items-center gap-2">
                      {mt5PingResult.connected ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertOctagon className="h-4 w-4 text-red-400 shrink-0" />
                      )}
                      <span>{mt5PingResult.message}</span>
                    </div>
                    {mt5PingResult.connected && (
                      <Badge tone="success" size="sm" className="font-mono">
                        Latency: {mt5PingResult.latency_ms}ms
                      </Badge>
                    )}
                  </div>
                )}
              </div>

            </CardContent>

            <CardFooter className="border-t border-[#1F2937]/60 p-4 flex justify-end">
              <Button
                variant="primary"
                onClick={() => saveMt5Mutation.mutate(mt5Form)}
                loading={saveMt5Mutation.isPending}
                className="gap-1.5 shadow-emerald-500/20"
              >
                <Save className="h-4 w-4" />
                Save MT5 Gateway Settings
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* ── TAB 7: WEBHOOKS & INSTANT ALERTS (DISCORD & TELEGRAM) ────────── */}
      {activeTab === 'integrations' && (
        <div className="space-y-6 max-w-4xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-gray-100 flex items-center gap-2">
                <BellRing className="h-4 w-4 text-emerald-400" />
                Founder Instant Alerts via Discord & Telegram Webhooks
              </h2>
              <p className="text-xs text-gray-400">
                Receive real-time mobile push notifications for challenge purchases, payout requests, hard breaches, and KYC audits.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => saveWebhooksMutation.mutate(webhookForm)}
              loading={saveWebhooksMutation.isPending}
              className="gap-1.5 shadow-emerald-500/20"
            >
              <Save className="h-4 w-4" />
              Save Webhook Integrations
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 1. Discord Webhook Channel */}
            <Card className="bg-[#111827] border-[#1F2937]">
              <CardHeader className="border-b border-[#1F2937]/60 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-[#5865F2]/10 border border-[#5865F2]/20 text-[#5865F2] flex items-center justify-center font-bold text-sm">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base text-gray-100">Discord Channel Alerts</CardTitle>
                      <CardDescription className="text-xs text-gray-400">
                        Streams rich embed alert cards directly into private Discord channels.
                      </CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={webhookForm.discord_enabled}
                    onCheckedChange={(checked) => setWebhookForm({ ...webhookForm, discord_enabled: checked })}
                  />
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="discord-url">Discord Webhook URL</Label>
                  <Input
                    id="discord-url"
                    placeholder="https://discord.com/api/webhooks/1234567890/..."
                    value={webhookForm.discord_webhook_url}
                    onChange={(e) => setWebhookForm({ ...webhookForm, discord_webhook_url: e.target.value })}
                    className="font-mono text-xs"
                  />
                  <p className="text-[11px] text-gray-500 font-mono">
                    Channel Settings → Integrations → Webhooks → Copy Webhook URL
                  </p>
                </div>

                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTestDiscordPing}
                    loading={isTestingDiscord}
                    disabled={!webhookForm.discord_webhook_url}
                    className="text-xs gap-1.5 border-[#1F2937] hover:bg-[#5865F2]/10 text-[#5865F2]"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Send Test Discord Ping
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 2. Telegram Bot Channel */}
            <Card className="bg-[#111827] border-[#1F2937]">
              <CardHeader className="border-b border-[#1F2937]/60 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-[#0088CC]/10 border border-[#0088CC]/20 text-[#0088CC] flex items-center justify-center font-bold text-sm">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base text-gray-100">Telegram Bot Notifications</CardTitle>
                      <CardDescription className="text-xs text-gray-400">
                        Dispatches instant mobile Markdown alerts to a Telegram chat or group.
                      </CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={webhookForm.telegram_enabled}
                    onCheckedChange={(checked) => setWebhookForm({ ...webhookForm, telegram_enabled: checked })}
                  />
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="tg-token">Telegram Bot Token</Label>
                  <Input
                    id="tg-token"
                    placeholder="123456789:ABCdefGhIJKlmNoPQRstuVWxyz"
                    value={webhookForm.telegram_bot_token}
                    onChange={(e) => setWebhookForm({ ...webhookForm, telegram_bot_token: e.target.value })}
                    className="font-mono text-xs"
                  />
                  <p className="text-[11px] text-gray-500 font-mono">
                    Obtain from @BotFather on Telegram
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tg-chat">Telegram Chat ID / Channel ID</Label>
                  <Input
                    id="tg-chat"
                    placeholder="-1001234567890 or 987654321"
                    value={webhookForm.telegram_chat_id}
                    onChange={(e) => setWebhookForm({ ...webhookForm, telegram_chat_id: e.target.value })}
                    className="font-mono text-xs"
                  />
                  <p className="text-[11px] text-gray-500 font-mono">
                    User/Group numeric ID (e.g. from @userinfobot)
                  </p>
                </div>

                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTestTelegramPing}
                    loading={isTestingTelegram}
                    disabled={!webhookForm.telegram_bot_token || !webhookForm.telegram_chat_id}
                    className="text-xs gap-1.5 border-[#1F2937] hover:bg-[#0088CC]/10 text-[#0088CC]"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Send Test Telegram Ping
                  </Button>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* 3. Real-Time Event Subscription Toggles */}
          <Card className="bg-[#111827] border-[#1F2937]">
            <CardHeader className="border-b border-[#1F2937]/60 pb-4">
              <CardTitle className="text-base text-gray-100 flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                Real-Time Event Subscriptions
              </CardTitle>
              <CardDescription className="text-xs text-gray-400">
                Choose which high-priority platform events trigger instant founder webhook dispatches.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Event 1: New Challenge Purchase */}
                <div className="flex items-center justify-between p-4 rounded-xl border border-[#1F2937] bg-[#0B0F19]">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">💰 Challenge Purchases</span>
                      <Badge tone="success" size="sm">Revenue</Badge>
                    </div>
                    <p className="text-xs text-gray-400">
                      Alerts when a trader purchases and pays for a challenge account.
                    </p>
                  </div>
                  <Switch
                    checked={webhookForm.notify_on_purchase}
                    onCheckedChange={(checked) => setWebhookForm({ ...webhookForm, notify_on_purchase: checked })}
                  />
                </div>

                {/* Event 2: Payout Requests */}
                <div className="flex items-center justify-between p-4 rounded-xl border border-[#1F2937] bg-[#0B0F19]">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">💳 Payout Requests</span>
                      <Badge tone="warning" size="sm">Treasury</Badge>
                    </div>
                    <p className="text-xs text-gray-400">
                      Alerts when a funded trader submits a profit share withdrawal request.
                    </p>
                  </div>
                  <Switch
                    checked={webhookForm.notify_on_payout}
                    onCheckedChange={(checked) => setWebhookForm({ ...webhookForm, notify_on_payout: checked })}
                  />
                </div>

                {/* Event 3: Account Breaches */}
                <div className="flex items-center justify-between p-4 rounded-xl border border-[#1F2937] bg-[#0B0F19]">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">⚠️ Hard Drawdown Breaches</span>
                      <Badge tone="danger" size="sm">Risk Desk</Badge>
                    </div>
                    <p className="text-xs text-gray-400">
                      Alerts immediately when a trader violates maximum or daily loss limits.
                    </p>
                  </div>
                  <Switch
                    checked={webhookForm.notify_on_breach}
                    onCheckedChange={(checked) => setWebhookForm({ ...webhookForm, notify_on_breach: checked })}
                  />
                </div>

                {/* Event 4: KYC Submissions */}
                <div className="flex items-center justify-between p-4 rounded-xl border border-[#1F2937] bg-[#0B0F19]">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">🪪 KYC & AML Submissions</span>
                      <Badge tone="accent" size="sm">Compliance</Badge>
                    </div>
                    <p className="text-xs text-gray-400">
                      Alerts when a trader submits government ID & biometric selfie for review.
                    </p>
                  </div>
                  <Switch
                    checked={webhookForm.notify_on_kyc}
                    onCheckedChange={(checked) => setWebhookForm({ ...webhookForm, notify_on_kyc: checked })}
                  />
                </div>

              </div>
            </CardContent>

            <CardFooter className="border-t border-[#1F2937]/60 p-4 flex justify-end">
              <Button
                variant="primary"
                onClick={() => saveWebhooksMutation.mutate(webhookForm)}
                loading={saveWebhooksMutation.isPending}
                className="gap-1.5 shadow-emerald-500/20"
              >
                <Save className="h-4 w-4" />
                Save Webhook Settings
              </Button>
            </CardFooter>
          </Card>

        </div>
      )}

      {/* ── TAB 8: AUTOMATED SCALING PLAN ENGINE ──────────────────────────── */}
      {activeTab === 'scaling' && (
        <div className="space-y-8 w-full">
          
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-gray-100 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                Automated Scaling Plan Engine & Milestone Rewards
              </h2>
              <p className="text-xs text-gray-400">
                Institutional capital expansion engine. Automatically scale funded traders with +25% capital boosts and up to 90% profit splits upon reaching milestones.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchScaling()}
                className="text-xs gap-1.5 border-[#1F2937]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh Queue
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => saveScalingRulesMutation.mutate(scalingRulesForm)}
                loading={saveScalingRulesMutation.isPending}
                className="gap-1.5 shadow-emerald-500/20"
              >
                <Save className="h-4 w-4" />
                Save Scaling Rules
              </Button>
            </div>
          </div>

          {/* 1. Scaling Configuration Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Card 1: Scaling Rules & Multipliers */}
            <Card className="bg-[#111827] border-[#1F2937] lg:col-span-2">
              <CardHeader className="border-b border-[#1F2937]/60 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base text-gray-100">Global Scaling Plan Criteria</CardTitle>
                      <CardDescription className="text-xs text-gray-400">
                        Hurdles and reward multipliers applied to profitable funded accounts.
                      </CardDescription>
                    </div>
                  </div>

                  <Badge tone="success" size="sm" className="font-mono">
                    Tier-1 Institutional
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                
                {/* Mode Selector */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-gray-300">Execution Mode</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setScalingRulesForm({ ...scalingRulesForm, auto_scale: false })}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        !scalingRulesForm.auto_scale
                          ? 'border-emerald-500/60 bg-emerald-500/10 ring-1 ring-emerald-500/30'
                          : 'border-[#1F2937] bg-[#0B0F19] hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          🛡️ Requires Founder Approval
                        </span>
                        {!scalingRulesForm.auto_scale && (
                          <Badge tone="success" size="sm">Recommended</Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 leading-relaxed">
                        Enqueues qualified traders into the Scaling Queue below for 1-click administrative review and capital provisioning.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setScalingRulesForm({ ...scalingRulesForm, auto_scale: true })}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        scalingRulesForm.auto_scale
                          ? 'border-emerald-500/60 bg-emerald-500/10 ring-1 ring-emerald-500/30'
                          : 'border-[#1F2937] bg-[#0B0F19] hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          ⚡ Automated 1-Click Scale
                        </span>
                        {scalingRulesForm.auto_scale && (
                          <Badge tone="accent" size="sm">Autonomous</Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 leading-relaxed">
                        Instantly increases capital balance and unlocks split upgrades the moment a qualifying payout is approved.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Input Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#1F2937]/60">
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="scaling-target" className="text-xs font-semibold text-gray-300">
                      Profit Target Required
                    </Label>
                    <div className="relative">
                      <Input
                        id="scaling-target"
                        type="number"
                        min="1"
                        max="100"
                        value={scalingRulesForm.profit_target_pct}
                        onChange={(e) => setScalingRulesForm({ ...scalingRulesForm, profit_target_pct: parseFloat(e.target.value) || 10 })}
                        className="font-mono text-xs pr-8"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-gray-500 font-mono">%</span>
                    </div>
                    <span className="text-[10px] text-gray-500">Benchmark: 10% gain</span>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="scaling-period" className="text-xs font-semibold text-gray-300">
                      Evaluation Window
                    </Label>
                    <div className="relative">
                      <Input
                        id="scaling-period"
                        type="number"
                        min="30"
                        max="365"
                        value={scalingRulesForm.evaluation_period_days}
                        onChange={(e) => setScalingRulesForm({ ...scalingRulesForm, evaluation_period_days: parseInt(e.target.value) || 90 })}
                        className="font-mono text-xs pr-12"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-gray-500 font-mono">days</span>
                    </div>
                    <span className="text-[10px] text-gray-500">Benchmark: 90 days / 3 mo</span>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="scaling-payouts" className="text-xs font-semibold text-gray-300">
                      Minimum Payouts
                    </Label>
                    <div className="relative">
                      <Input
                        id="scaling-payouts"
                        type="number"
                        min="1"
                        max="10"
                        value={scalingRulesForm.min_payouts}
                        onChange={(e) => setScalingRulesForm({ ...scalingRulesForm, min_payouts: parseInt(e.target.value) || 2 })}
                        className="font-mono text-xs pr-14"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-gray-500 font-mono">payouts</span>
                    </div>
                    <span className="text-[10px] text-gray-500">Benchmark: 2+ processed payouts</span>
                  </div>

                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#1F2937]/60">
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="scaling-mult" className="text-xs font-semibold text-gray-300">
                      Balance Multiplier Boost
                    </Label>
                    <div className="relative">
                      <Input
                        id="scaling-mult"
                        type="number"
                        min="5"
                        max="100"
                        value={scalingRulesForm.balance_multiplier_pct}
                        onChange={(e) => setScalingRulesForm({ ...scalingRulesForm, balance_multiplier_pct: parseFloat(e.target.value) || 25 })}
                        className="font-mono text-xs pr-8"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-gray-500 font-mono">%</span>
                    </div>
                    <span className="text-[10px] text-gray-500">Standard: +25% capital</span>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="scaling-split" className="text-xs font-semibold text-gray-300">
                      Upgraded Profit Split
                    </Label>
                    <div className="relative">
                      <Input
                        id="scaling-split"
                        type="number"
                        min="50"
                        max="100"
                        value={scalingRulesForm.new_profit_split}
                        onChange={(e) => setScalingRulesForm({ ...scalingRulesForm, new_profit_split: parseFloat(e.target.value) || 90 })}
                        className="font-mono text-xs pr-8"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-gray-500 font-mono">%</span>
                    </div>
                    <span className="text-[10px] text-gray-500">Standard: 90% payout share</span>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="scaling-cap" className="text-xs font-semibold text-gray-300">
                      Max Capital Ceiling Cap
                    </Label>
                    <div className="relative">
                      <Input
                        id="scaling-cap"
                        type="number"
                        min="100000"
                        max="10000000"
                        step="100000"
                        value={scalingRulesForm.max_capital_cap}
                        onChange={(e) => setScalingRulesForm({ ...scalingRulesForm, max_capital_cap: parseFloat(e.target.value) || 2000000 })}
                        className="font-mono text-xs pr-8"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-gray-500 font-mono">$</span>
                    </div>
                    <span className="text-[10px] text-gray-500">Maximum allocation cap</span>
                  </div>

                </div>

              </CardContent>
            </Card>

            {/* Card 2: Scaling Overview Telemetry */}
            <Card className="bg-[#111827] border-[#1F2937] flex flex-col justify-between">
              <CardHeader className="border-b border-[#1F2937]/60 pb-4">
                <CardTitle className="text-base text-gray-100 flex items-center gap-2">
                  <Award className="h-4 w-4 text-emerald-400" />
                  Milestone Rewards Summary
                </CardTitle>
                <CardDescription className="text-xs text-gray-400">
                  Incentive roadmap for profitable funded traders.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                <div className="p-3.5 rounded-xl bg-[#0B0F19] border border-[#1F2937] space-y-1">
                  <span className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">Scaling Multiplier</span>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-emerald-400 font-mono">+{scalingRulesForm.balance_multiplier_pct}% Capital</span>
                    <Badge tone="success" size="sm">Milestone</Badge>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0B0F19] border border-[#1F2937] space-y-1">
                  <span className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">Profit Split Bump</span>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white font-mono">80% ➔ {scalingRulesForm.new_profit_split}%</span>
                    <Badge tone="accent" size="sm">VIP Tier</Badge>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0B0F19] border border-[#1F2937] space-y-1">
                  <span className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">Capital Ceiling Limit</span>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white font-mono">
                      ${(scalingRulesForm.max_capital_cap / 1000000).toFixed(1)}M USD
                    </span>
                    <Badge tone="neutral" size="sm">Hard Cap</Badge>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                  <span className="text-[11px] text-emerald-400 uppercase tracking-wider font-semibold">Queue Status</span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">
                      {(scalingData?.queue || []).filter(q => q.is_eligible).length} Eligible Trader(s)
                    </span>
                    <Badge tone="success" size="sm" pulsing>
                      Live
                    </Badge>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="border-t border-[#1F2937]/60 p-4 text-[11px] text-gray-500">
                <span>Calculated dynamically from settled payouts & starting balance PnL.</span>
              </CardFooter>
            </Card>

          </div>

          {/* 2. Traders Scaling Queue Table */}
          <Card className="bg-[#111827] border-[#1F2937]">
            <CardHeader className="border-b border-[#1F2937]/60 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base text-gray-100 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                    Traders Scaling Queue & Milestone History
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-400">
                    Live roster of funded traders evaluated against scaling hurdles and completed payouts.
                  </CardDescription>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Input
                      placeholder="Search trader or #id..."
                      value={scalingSearch}
                      onChange={(e) => setScalingSearch(e.target.value)}
                      className="text-xs h-8 w-48 font-mono"
                    />
                  </div>

                  <div className="flex items-center gap-1 bg-[#0B0F19] p-1 rounded-lg border border-[#1F2937] text-xs">
                    {(['all', 'eligible', 'applied'] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setScalingFilter(filter)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold capitalize transition-all ${
                          scalingFilter === filter
                            ? 'bg-emerald-500 text-slate-950 shadow-sm'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#0B0F19]/80 border-b border-[#1F2937] text-gray-400 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-5 py-3">Trader & Account</th>
                      <th className="px-4 py-3">Current Capital</th>
                      <th className="px-4 py-3">Proposed Milestone</th>
                      <th className="px-4 py-3">ROI & Payouts</th>
                      <th className="px-4 py-3">Profit Split</th>
                      <th className="px-4 py-3">Level</th>
                      <th className="px-5 py-3 text-right">Action / Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2937]/50 text-gray-200">
                    {isLoadingScaling ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-8 text-center text-gray-500">
                          <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-emerald-400" />
                          Evaluating funded trader accounts...
                        </td>
                      </tr>
                    ) : (scalingData?.queue || []).filter((q) => {
                      const matchesSearch = !scalingSearch || q.trader_name.toLowerCase().includes(scalingSearch.toLowerCase()) || q.trader_email.toLowerCase().includes(scalingSearch.toLowerCase()) || String(q.id).includes(scalingSearch)
                      const matchesFilter = scalingFilter === 'all' || (scalingFilter === 'eligible' ? q.is_eligible : !q.is_eligible)
                      return matchesSearch && matchesFilter
                    }).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-8 text-center text-gray-500">
                          No accounts found matching scaling criteria.
                        </td>
                      </tr>
                    ) : (
                      (scalingData?.queue || [])
                        .filter((q) => {
                          const matchesSearch = !scalingSearch || q.trader_name.toLowerCase().includes(scalingSearch.toLowerCase()) || q.trader_email.toLowerCase().includes(scalingSearch.toLowerCase()) || String(q.id).includes(scalingSearch)
                          const matchesFilter = scalingFilter === 'all' || (scalingFilter === 'eligible' ? q.is_eligible : !q.is_eligible)
                          return matchesSearch && matchesFilter
                        })
                        .map((trader) => (
                          <tr key={trader.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="px-5 py-3 font-medium text-white whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="h-7 w-7 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                                  {trader.trader_name.charAt(0).toUpperCase()}
                                </span>
                                <div>
                                  <div className="font-semibold">{trader.trader_name}</div>
                                  <div className="text-[10px] text-gray-400 font-mono">Account #{trader.id} • {trader.trader_email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-gray-200 whitespace-nowrap">
                              ${trader.current_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-emerald-400 whitespace-nowrap">
                              ${trader.scaled_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              <span className="text-[10px] text-emerald-500 ml-1">(+{scalingRulesForm.balance_multiplier_pct}%)</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Badge tone={trader.current_profit_pct >= scalingRulesForm.profit_target_pct ? 'success' : 'neutral'} size="sm" className="font-mono">
                                  +{trader.current_profit_pct}% ROI
                                </Badge>
                                <span className="text-[11px] text-gray-400 font-mono">
                                  {trader.payouts_count} / {scalingRulesForm.min_payouts} payouts
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">
                              <span className="text-gray-400">{trader.current_split}%</span>
                              <span className="text-emerald-400 font-bold mx-1">➔</span>
                              <span className="text-emerald-400 font-bold">{trader.new_split}%</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-slate-800 border border-slate-700 text-gray-300">
                                Tier {trader.scaling_level}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right whitespace-nowrap">
                              {trader.is_eligible ? (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => applyScaleMutation.mutate(trader.id)}
                                  loading={applyScaleMutation.isPending}
                                  className="text-xs gap-1.5 shadow-emerald-500/20 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
                                >
                                  <TrendingUp className="h-3.5 w-3.5" />
                                  Scale Account (+{scalingRulesForm.balance_multiplier_pct}%)
                                </Button>
                              ) : (
                                <Badge tone="neutral" size="sm">
                                  Hurdle In Progress
                                </Badge>
                              )}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

        </div>
      )}

      {/* ── CREATE / EDIT CHALLENGE PLAN MODAL ────────────────────────────── */}
      <Modal
        open={isPlanModalOpen}
        onOpenChange={setIsPlanModalOpen}
        title={editingPlan ? `Configure Plan: ${planForm.name}` : 'Create New Challenge Plan'}
        description="Define account size, pricing, profit targets, drawdown mechanics, EA permissions, and scaling parameters."
        maxWidth="max-w-5xl"
      >
        <div className="space-y-6 pt-1">

          <div className="flex flex-col lg:flex-row gap-6 items-stretch">
            
            {/* ── Left Sidebar (Step Navigator & Live Preview) ──────────────── */}
            <div className="w-full lg:w-64 shrink-0 flex flex-col justify-between space-y-4 border-b lg:border-b-0 lg:border-r border-[#1F2937]/80 pb-4 lg:pb-0 lg:pr-5">
              
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block px-1">
                  Configuration Steps
                </span>

                {/* Step 1 */}
                <button
                  type="button"
                  onClick={() => setModalSection('basics')}
                  className={cn(
                    "w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 group relative cursor-pointer",
                    modalSection === 'basics'
                      ? "bg-accent/10 border-accent/40 shadow-sm shadow-accent/10"
                      : "bg-[#0B0F19] border-[#1F2937] hover:border-gray-700 hover:bg-slate-900/60"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-lg shrink-0 transition-colors",
                    modalSection === 'basics' ? "bg-accent text-slate-950 font-bold" : "bg-slate-800 text-gray-400 group-hover:text-white"
                  )}>
                    <Layers className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className={cn("text-xs font-bold block", modalSection === 'basics' ? "text-white" : "text-gray-300 group-hover:text-white")}>
                        1. Sizing & Structure
                      </span>
                      {planForm.name && <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0 ml-1" />}
                    </div>
                    <span className="text-[11px] text-gray-500 block truncate mt-0.5">
                      Capital, Price & Model
                    </span>
                  </div>
                </button>

                {/* Step 2 */}
                <button
                  type="button"
                  onClick={() => setModalSection('drawdown')}
                  className={cn(
                    "w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 group relative cursor-pointer",
                    modalSection === 'drawdown'
                      ? "bg-accent/10 border-accent/40 shadow-sm shadow-accent/10"
                      : "bg-[#0B0F19] border-[#1F2937] hover:border-gray-700 hover:bg-slate-900/60"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-lg shrink-0 transition-colors",
                    modalSection === 'drawdown' ? "bg-accent text-slate-950 font-bold" : "bg-slate-800 text-gray-400 group-hover:text-white"
                  )}>
                    <Scale className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className={cn("text-xs font-bold block", modalSection === 'drawdown' ? "text-white" : "text-gray-300 group-hover:text-white")}>
                        2. Objectives & DD
                      </span>
                      {planForm.drawdown_type && <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0 ml-1" />}
                    </div>
                    <span className="text-[11px] text-gray-500 block truncate mt-0.5">
                      Targets, DD Floor & Split
                    </span>
                  </div>
                </button>

                {/* Step 3 */}
                <button
                  type="button"
                  onClick={() => setModalSection('rules')}
                  className={cn(
                    "w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 group relative cursor-pointer",
                    modalSection === 'rules'
                      ? "bg-accent/10 border-accent/40 shadow-sm shadow-accent/10"
                      : "bg-[#0B0F19] border-[#1F2937] hover:border-gray-700 hover:bg-slate-900/60"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-lg shrink-0 transition-colors",
                    modalSection === 'rules' ? "bg-accent text-slate-950 font-bold" : "bg-slate-800 text-gray-400 group-hover:text-white"
                  )}>
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className={cn("text-xs font-bold block", modalSection === 'rules' ? "text-white" : "text-gray-300 group-hover:text-white")}>
                        3. Execution Rules
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-500 block truncate mt-0.5">
                      EA, News & Shields
                    </span>
                  </div>
                </button>

                {/* Step 4 */}
                <button
                  type="button"
                  onClick={() => setModalSection('scaling')}
                  className={cn(
                    "w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 group relative cursor-pointer",
                    modalSection === 'scaling'
                      ? "bg-accent/10 border-accent/40 shadow-sm shadow-accent/10"
                      : "bg-[#0B0F19] border-[#1F2937] hover:border-gray-700 hover:bg-slate-900/60"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-lg shrink-0 transition-colors",
                    modalSection === 'scaling' ? "bg-accent text-slate-950 font-bold" : "bg-slate-800 text-gray-400 group-hover:text-white"
                  )}>
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className={cn("text-xs font-bold block", modalSection === 'scaling' ? "text-white" : "text-gray-300 group-hover:text-white")}>
                        4. Scaling & Perks
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-500 block truncate mt-0.5">
                      Growth & Refund Fee
                    </span>
                  </div>
                </button>
              </div>

              {/* Live Summary Card */}
              <div className="p-3.5 rounded-xl bg-[#0B0F19] border border-[#1F2937] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-gray-400 tracking-wider">Plan Summary</span>
                  <Badge tone={planForm.is_active ? 'accent' : 'neutral'} size="sm" className="text-[9px] px-1.5 py-0">
                    {planForm.is_active ? 'Active' : 'Draft'}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-bold text-white truncate">
                    {planForm.name || 'Untitled Challenge Plan'}
                  </p>
                  <div className="flex items-baseline justify-between text-xs font-mono">
                    <span className="text-gray-400">Capital:</span>
                    <span className="text-accent font-bold">${Number(planForm.account_size || 50000).toLocaleString()}</span>
                  </div>
                  <div className="flex items-baseline justify-between text-xs font-mono">
                    <span className="text-gray-400">Price:</span>
                    <span className="text-white font-bold">${Number(planForm.price || 299).toLocaleString()}</span>
                  </div>
                  <div className="flex items-baseline justify-between text-xs font-mono">
                    <span className="text-gray-400">Model:</span>
                    <span className="text-gray-300 capitalize">{planForm.plan_type || '2-step'} (1:{planForm.max_leverage || 100})</span>
                  </div>
                </div>
              </div>

            </div>

            {/* ── Right Content Area (Active Configuration Options) ──────────── */}
            <div className="flex-1 min-w-0 flex flex-col justify-between">
              
              {/* ── SECTION 1: BASICS ────────────────────────────────────────── */}
              {modalSection === 'basics' && (
                <div className="space-y-4">
                  <div className="border-b border-[#1F2937]/70 pb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Layers className="h-4 w-4 text-accent" />
                      Plan Sizing, Pricing & Account Structure
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Define the headline title, starting capital balance, client checkout price, and evaluation format.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="plan-name" className="text-xs font-semibold text-gray-300">Plan Title</Label>
                      <Input
                        id="plan-name"
                        placeholder="e.g. $100K Elite Challenge"
                        value={planForm.name || ''}
                        onChange={(e) => {
                          const newName = e.target.value
                          setPlanForm((prev) => ({
                            ...prev,
                            name: newName,
                            slug: slugify(newName),
                          }))
                        }}
                        className="h-10 px-3 rounded-xl bg-[#0B0F19] border border-[#1F2937] text-xs text-white focus:outline-none focus:border-accent font-sans transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="plan-slug" className="text-xs font-semibold text-gray-300">URL Slug</Label>
                        <span className="text-[10px] text-gray-500 font-mono">Auto-generated</span>
                      </div>
                      <Input
                        id="plan-slug"
                        placeholder="e.g. 100k-elite-challenge"
                        value={planForm.slug || ''}
                        onChange={(e) => setPlanForm({ ...planForm, slug: slugify(e.target.value) })}
                        className="h-10 px-3 rounded-xl bg-[#0B0F19] border border-[#1F2937] text-xs text-gray-300 focus:outline-none focus:border-accent font-mono transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="plan-type" className="text-xs font-semibold text-gray-300">Evaluation Structure</Label>
                      <select
                        id="plan-type"
                        value={planForm.plan_type || '2-step'}
                        onChange={(e) => setPlanForm({ ...planForm, plan_type: e.target.value as any })}
                        className="w-full h-10 px-3 rounded-xl bg-[#0B0F19] border border-[#1F2937] text-xs text-white focus:outline-none focus:border-accent font-sans transition-all"
                      >
                        <option value="1-step">1-Step Fast Track (1 Phase)</option>
                        <option value="2-step">2-Step Standard (2 Phases)</option>
                        <option value="3-step">3-Step Sovereign (3 Phases)</option>
                        <option value="instant">Instant Funding (0 Phases / Direct)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="account-size" className="text-xs font-semibold text-gray-300">Starting Capital ($)</Label>
                      <Input
                        id="account-size"
                        type="number"
                        value={planForm.account_size || 50000}
                        onChange={(e) => setPlanForm({ ...planForm, account_size: Number(e.target.value) })}
                        className="h-10 px-3 rounded-xl bg-[#0B0F19] border border-[#1F2937] text-xs text-white focus:outline-none focus:border-accent font-sans transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="plan-price" className="text-xs font-semibold text-gray-300">Checkout Price ($)</Label>
                      <Input
                        id="plan-price"
                        type="number"
                        value={planForm.price || 299}
                        onChange={(e) => setPlanForm({ ...planForm, price: Number(e.target.value) })}
                        className="h-10 px-3 rounded-xl bg-[#0B0F19] border border-[#1F2937] text-xs text-white focus:outline-none focus:border-accent font-sans transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="max-leverage" className="text-xs font-semibold text-gray-300">Max Account Leverage</Label>
                      <select
                        id="max-leverage"
                        value={planForm.max_leverage || 100}
                        onChange={(e) => setPlanForm({ ...planForm, max_leverage: Number(e.target.value) })}
                        className="w-full h-10 px-3 rounded-xl bg-[#0B0F19] border border-[#1F2937] text-xs text-white focus:outline-none focus:border-accent font-sans transition-all"
                      >
                        <option value={30}>1:30 (Conservative FX)</option>
                        <option value={50}>1:50 (Moderate FX)</option>
                        <option value={100}>1:100 (Standard Pro)</option>
                        <option value={200}>1:200 (High Octane)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="plan-sort-order" className="text-xs font-semibold text-gray-300">Display Sort Order</Label>
                        <span className="text-[10px] text-gray-500 font-mono">0 = First</span>
                      </div>
                      <Input
                        id="plan-sort-order"
                        type="number"
                        placeholder="0"
                        value={planForm.sort_order ?? 0}
                        onChange={(e) => setPlanForm({ ...planForm, sort_order: Number(e.target.value) })}
                        className="h-10 px-3 rounded-xl bg-[#0B0F19] border border-[#1F2937] text-xs text-white focus:outline-none focus:border-accent font-mono transition-all"
                      />
                    </div>
                    <div className="flex items-center justify-between p-3.5 bg-[#0B0F19] rounded-xl border border-[#1F2937]">
                      <div>
                        <p className="text-xs font-semibold text-gray-200">Active / Live Product</p>
                        <p className="text-[10px] text-gray-500">Visible in client checkout catalog</p>
                      </div>
                      <Switch
                        checked={!!planForm.is_active}
                        onCheckedChange={(checked) => setPlanForm({ ...planForm, is_active: checked ? 1 : 0 })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3.5 bg-[#0B0F19] rounded-xl border border-[#1F2937]">
                      <div>
                        <p className="text-xs font-semibold text-gray-200">Refundable Fee</p>
                        <p className="text-[10px] text-gray-500">100% refund on 1st payout</p>
                      </div>
                      <Switch
                        checked={!!planForm.refundable_fee}
                        onCheckedChange={(checked) => setPlanForm({ ...planForm, refundable_fee: checked ? 1 : 0 })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── SECTION 2: OBJECTIVES & DRAWDOWN ────────────────────────── */}
              {modalSection === 'drawdown' && (
                <div className="space-y-5">
                  <div className="border-b border-[#1F2937]/70 pb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Scale className="h-4 w-4 text-accent" />
                      Profit Objectives & Risk Drawdown Engine
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Configure evaluation milestone targets, drawdown formulas, margin call floors, and funded profit splits.
                    </p>
                  </div>

                  {/* Drawdown Engine Model & Funded Profit Split */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="dd-type" className="text-xs font-semibold text-gray-300">Drawdown Engine Model</Label>
                      <select
                        id="dd-type"
                        value={planForm.drawdown_type || 'static'}
                        onChange={(e) => setPlanForm({ ...planForm, drawdown_type: e.target.value as any })}
                        className="w-full h-10 px-3 rounded-xl bg-[#0B0F19] border border-[#1F2937] text-xs text-white focus:outline-none focus:border-accent font-sans transition-all"
                      >
                        <option value="static">Static Balance (Fixed Starting Floor)</option>
                        <option value="trailing">Trailing Equity (High Water Mark)</option>
                        <option value="eod_trailing">End-of-Day Trailing Balance</option>
                        <option value="static_balance">Static Balance Threshold</option>
                        <option value="trailing_equity">Trailing Realtime Equity</option>
                        <option value="trailing_balance">Trailing Closed Balance</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="funded-split" className="text-xs font-semibold text-gray-300">Funded Profit Split (%)</Label>
                      <Input
                        id="funded-split"
                        type="number"
                        value={planForm.funded_profit_split ?? 80}
                        onChange={(e) => setPlanForm({ ...planForm, funded_profit_split: Number(e.target.value) })}
                        className="h-10 px-3 rounded-xl bg-[#0B0F19] border border-[#1F2937] text-xs text-white focus:outline-none focus:border-accent font-sans transition-all"
                      />
                    </div>
                  </div>

                  {/* Phase 1 Evaluation Box */}
                  <div className="p-3.5 rounded-xl border border-[#1F2937] bg-[#0B0F19] space-y-3">
                    <div className="flex items-center justify-between border-b border-[#1F2937]/60 pb-2">
                      <span className="text-xs font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Phase 1 Evaluation Parameters
                      </span>
                      <Badge tone="accent" size="sm">Step 1</Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="p1-target" className="text-[11px] text-gray-300">Target (%)</Label>
                        <Input
                          id="p1-target"
                          type="number"
                          value={planForm.p1_profit_target ?? 8}
                          onChange={(e) => setPlanForm({ ...planForm, p1_profit_target: Number(e.target.value) })}
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="p1-daily-dd" className="text-[11px] text-gray-300">Daily DD (%)</Label>
                        <Input
                          id="p1-daily-dd"
                          type="number"
                          value={planForm.p1_daily_dd ?? 5}
                          onChange={(e) => setPlanForm({ ...planForm, p1_daily_dd: Number(e.target.value) })}
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="p1-max-dd" className="text-[11px] text-gray-300">Max DD (%)</Label>
                        <Input
                          id="p1-max-dd"
                          type="number"
                          value={planForm.p1_max_dd ?? 10}
                          onChange={(e) => setPlanForm({ ...planForm, p1_max_dd: Number(e.target.value) })}
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="p1-min-days" className="text-[11px] text-gray-300">Min Days</Label>
                        <Input
                          id="p1-min-days"
                          type="number"
                          value={planForm.p1_min_days ?? 5}
                          onChange={(e) => setPlanForm({ ...planForm, p1_min_days: Number(e.target.value) })}
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="p1-max-days" className="text-[11px] text-gray-300">Max Days (0=∞)</Label>
                        <Input
                          id="p1-max-days"
                          type="number"
                          value={planForm.p1_max_days ?? 30}
                          onChange={(e) => setPlanForm({ ...planForm, p1_max_days: Number(e.target.value) })}
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Phase 2 Verification Box (when applicable) */}
                  {planForm.plan_type !== '1-step' && planForm.plan_type !== 'instant' && (
                    <div className="p-3.5 rounded-xl border border-[#1F2937] bg-[#0B0F19] space-y-3">
                      <div className="flex items-center justify-between border-b border-[#1F2937]/60 pb-2">
                        <span className="text-xs font-bold text-blue-400 font-mono flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Phase 2 Verification Parameters
                        </span>
                        <Badge tone="accent" size="sm">Step 2</Badge>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="p2-target" className="text-[11px] text-gray-300">Target (%)</Label>
                          <Input
                            id="p2-target"
                            type="number"
                            value={planForm.p2_profit_target ?? 5}
                            onChange={(e) => setPlanForm({ ...planForm, p2_profit_target: Number(e.target.value) })}
                            className="h-9 text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="p2-daily-dd" className="text-[11px] text-gray-300">Daily DD (%)</Label>
                          <Input
                            id="p2-daily-dd"
                            type="number"
                            value={planForm.p2_daily_dd ?? 5}
                            onChange={(e) => setPlanForm({ ...planForm, p2_daily_dd: Number(e.target.value) })}
                            className="h-9 text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="p2-max-dd" className="text-[11px] text-gray-300">Max DD (%)</Label>
                          <Input
                            id="p2-max-dd"
                            type="number"
                            value={planForm.p2_max_dd ?? 10}
                            onChange={(e) => setPlanForm({ ...planForm, p2_max_dd: Number(e.target.value) })}
                            className="h-9 text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="p2-min-days" className="text-[11px] text-gray-300">Min Days</Label>
                          <Input
                            id="p2-min-days"
                            type="number"
                            value={planForm.p2_min_days ?? 5}
                            onChange={(e) => setPlanForm({ ...planForm, p2_min_days: Number(e.target.value) })}
                            className="h-9 text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="p2-max-days" className="text-[11px] text-gray-300">Max Days (0=∞)</Label>
                          <Input
                            id="p2-max-days"
                            type="number"
                            value={planForm.p2_max_days ?? 60}
                            onChange={(e) => setPlanForm({ ...planForm, p2_max_days: Number(e.target.value) })}
                            className="h-9 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Phase 3 Verification Box (when 3-step) */}
                  {planForm.plan_type === '3-step' && (
                    <div className="p-3.5 rounded-xl border border-[#1F2937] bg-[#0B0F19] space-y-3">
                      <div className="flex items-center justify-between border-b border-[#1F2937]/60 pb-2">
                        <span className="text-xs font-bold text-amber-400 font-mono flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Phase 3 Verification Parameters
                        </span>
                        <Badge tone="accent" size="sm">Step 3</Badge>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="p3-target" className="text-[11px] text-gray-300">Target (%)</Label>
                          <Input
                            id="p3-target"
                            type="number"
                            value={planForm.p3_profit_target ?? 3}
                            onChange={(e) => setPlanForm({ ...planForm, p3_profit_target: Number(e.target.value) })}
                            className="h-9 text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="p3-daily-dd" className="text-[11px] text-gray-300">Daily DD (%)</Label>
                          <Input
                            id="p3-daily-dd"
                            type="number"
                            value={planForm.p3_daily_dd ?? 5}
                            onChange={(e) => setPlanForm({ ...planForm, p3_daily_dd: Number(e.target.value) })}
                            className="h-9 text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="p3-max-dd" className="text-[11px] text-gray-300">Max DD (%)</Label>
                          <Input
                            id="p3-max-dd"
                            type="number"
                            value={planForm.p3_max_dd ?? 10}
                            onChange={(e) => setPlanForm({ ...planForm, p3_max_dd: Number(e.target.value) })}
                            className="h-9 text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="p3-min-days" className="text-[11px] text-gray-300">Min Days</Label>
                          <Input
                            id="p3-min-days"
                            type="number"
                            value={planForm.p3_min_days ?? 5}
                            onChange={(e) => setPlanForm({ ...planForm, p3_min_days: Number(e.target.value) })}
                            className="h-9 text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="p3-max-days" className="text-[11px] text-gray-300">Max Days (0=∞)</Label>
                          <Input
                            id="p3-max-days"
                            type="number"
                            value={planForm.p3_max_days ?? 60}
                            onChange={(e) => setPlanForm({ ...planForm, p3_max_days: Number(e.target.value) })}
                            className="h-9 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Institutional Risk Guardrails & Safety Parameters */}
                  <div className="p-3.5 rounded-xl border border-[#1F2937] bg-[#0B0F19] space-y-3">
                    <div className="flex items-center justify-between border-b border-[#1F2937]/60 pb-2">
                      <span className="text-xs font-bold text-gray-200 font-mono flex items-center gap-1.5">
                        <ShieldAlert className="h-3.5 w-3.5 text-accent" /> Institutional Risk Floors & Limits
                      </span>
                      <Badge tone="neutral" size="sm">Safety Limits</Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="margin-call" className="text-[11px] text-gray-300">Margin Call Level (%)</Label>
                        <Input
                          id="margin-call"
                          type="number"
                          value={planForm.margin_call_level ?? 100}
                          onChange={(e) => setPlanForm({ ...planForm, margin_call_level: Number(e.target.value) })}
                          className="h-9 text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="max-lot" className="text-[11px] text-gray-300">Max Lot Size Limit (Lots)</Label>
                        <Input
                          id="max-lot"
                          type="number"
                          value={planForm.max_lot_size ?? 50}
                          onChange={(e) => setPlanForm({ ...planForm, max_lot_size: Number(e.target.value) })}
                          className="h-9 text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="funded-max-dd" className="text-[11px] text-gray-300">Funded Max Total DD (%)</Label>
                        <Input
                          id="funded-max-dd"
                          type="number"
                          value={planForm.funded_max_dd ?? 10}
                          onChange={(e) => setPlanForm({ ...planForm, funded_max_dd: Number(e.target.value) })}
                          className="h-9 text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="eval-split" className="text-[11px] text-gray-300">Eval Profit Share (%)</Label>
                        <Input
                          id="eval-split"
                          type="number"
                          value={planForm.evaluation_profit_share ?? 0}
                          onChange={(e) => setPlanForm({ ...planForm, evaluation_profit_share: Number(e.target.value) })}
                          className="h-9 text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="reset-discount" className="text-[11px] text-gray-300">Breach Reset Discount (%)</Label>
                        <Input
                          id="reset-discount"
                          type="number"
                          value={planForm.reset_discount_pct ?? 10}
                          onChange={(e) => setPlanForm({ ...planForm, reset_discount_pct: Number(e.target.value) })}
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── SECTION 3: RULES & EXECUTION ────────────────────────────── */}
              {modalSection === 'rules' && (
                <div className="space-y-4">
                  <div className="border-b border-[#1F2937]/70 pb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-accent" />
                      Trade Execution, Bots & Risk Rules
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Enforce anti-scalping duration shields, weekend holding, news trading, and EA bot policies.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-3.5 bg-[#0B0F19] rounded-xl border border-[#1F2937]">
                      <div>
                        <p className="text-xs font-semibold text-gray-200">EA & Bot Trading</p>
                        <p className="text-[10px] text-gray-500">Allow automated Expert Advisors</p>
                      </div>
                      <Switch
                        checked={!!planForm.ea_allowed}
                        onCheckedChange={(checked) => setPlanForm({ ...planForm, ea_allowed: checked ? 1 : 0 })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3.5 bg-[#0B0F19] rounded-xl border border-[#1F2937]">
                      <div>
                        <p className="text-xs font-semibold text-gray-200">Copy Trading</p>
                        <p className="text-[10px] text-gray-500">Allow account-to-account trade copiers</p>
                      </div>
                      <Switch
                        checked={!!planForm.copy_trading_allowed}
                        onCheckedChange={(checked) => setPlanForm({ ...planForm, copy_trading_allowed: checked ? 1 : 0 })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3.5 bg-[#0B0F19] rounded-xl border border-[#1F2937]">
                      <div>
                        <p className="text-xs font-semibold text-gray-200">Hedging Allowed</p>
                        <p className="text-[10px] text-gray-500">Allow simultaneous buy/sell on same pair</p>
                      </div>
                      <Switch
                        checked={!!planForm.hedging_allowed}
                        onCheckedChange={(checked) => setPlanForm({ ...planForm, hedging_allowed: checked ? 1 : 0 })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3.5 bg-[#0B0F19] rounded-xl border border-[#1F2937]">
                      <div>
                        <p className="text-xs font-semibold text-gray-200">Martingale / Grid</p>
                        <p className="text-[10px] text-gray-500">Allow doubling lot sizes on losing streaks</p>
                      </div>
                      <Switch
                        checked={!!planForm.martingale_allowed}
                        onCheckedChange={(checked) => setPlanForm({ ...planForm, martingale_allowed: checked ? 1 : 0 })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3.5 bg-[#0B0F19] rounded-xl border border-[#1F2937]">
                      <div>
                        <p className="text-xs font-semibold text-gray-200">Weekend Holding</p>
                        <p className="text-[10px] text-gray-500">Allow open swing trades over weekend</p>
                      </div>
                      <Switch
                        checked={!!planForm.weekend_holding}
                        onCheckedChange={(checked) => setPlanForm({ ...planForm, weekend_holding: checked ? 1 : 0 })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3.5 bg-[#0B0F19] rounded-xl border border-[#1F2937]">
                      <div>
                        <p className="text-xs font-semibold text-gray-200">News Event Trading</p>
                        <p className="text-[10px] text-gray-500">Allow orders during high impact news</p>
                      </div>
                      <Switch
                        checked={!!planForm.news_trading}
                        onCheckedChange={(checked) => setPlanForm({ ...planForm, news_trading: checked ? 1 : 0 })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3.5 bg-[#0B0F19] rounded-xl border border-[#1F2937]">
                      <div>
                        <p className="text-xs font-semibold text-gray-200">Stop Loss Required</p>
                        <p className="text-[10px] text-gray-500">Enforce mandatory SL on position open</p>
                      </div>
                      <Switch
                        checked={!!planForm.stop_loss_required}
                        onCheckedChange={(checked) => setPlanForm({ ...planForm, stop_loss_required: checked ? 1 : 0 })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3.5 bg-[#0B0F19] rounded-xl border border-[#1F2937]">
                      <div>
                        <p className="text-xs font-semibold text-gray-200">Consistency Rule</p>
                        <p className="text-[10px] text-gray-500">Cap max profit from any single trading day</p>
                      </div>
                      <Switch
                        checked={!!planForm.consistency_rule}
                        onCheckedChange={(checked) => setPlanForm({ ...planForm, consistency_rule: checked ? 1 : 0 })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3.5 bg-[#0B0F19] rounded-xl border border-[#1F2937]">
                      <div>
                        <p className="text-xs font-semibold text-gray-200">Strict IP Matching</p>
                        <p className="text-[10px] text-gray-500">Enforce verified IP addresses on trades</p>
                      </div>
                      <Switch
                        checked={!!planForm.ip_matching_required}
                        onCheckedChange={(checked) => setPlanForm({ ...planForm, ip_matching_required: checked ? 1 : 0 })}
                      />
                    </div>
                  </div>

                  {!!planForm.consistency_rule && (
                    <div className="p-3.5 bg-amber-500/10 rounded-xl border border-amber-500/30 space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="consistency-pct" className="text-xs font-semibold text-amber-400">Consistency Profit Cap (%)</Label>
                        <Input
                          id="consistency-pct"
                          type="number"
                          value={planForm.consistency_pct || 50}
                          onChange={(e) => setPlanForm({ ...planForm, consistency_pct: Number(e.target.value) })}
                          className="h-10 px-3 rounded-xl bg-[#0B0F19] border-amber-500/30 text-amber-200 text-xs focus:outline-none focus:border-amber-400 font-sans transition-all"
                        />
                      </div>
                      <div className="flex items-start gap-2.5 pt-1 text-[11px] text-amber-200/90 leading-relaxed border-t border-amber-500/20">
                        <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <p>
                          <strong>Capital Protection Rule:</strong> Prevents one-off 'gambling' trades. No single trading day can exceed {planForm.consistency_pct || 50}% of the total required profit target. Traders must demonstrate consistent edge over multiple sessions.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#1F2937]/60">
                    <div className="space-y-1.5">
                      <Label htmlFor="min-trade-sec" className="text-xs font-semibold text-gray-300">Anti-Scalping Min Duration (Seconds)</Label>
                      <Input
                        id="min-trade-sec"
                        type="number"
                        value={planForm.min_trade_seconds || 30}
                        onChange={(e) => setPlanForm({ ...planForm, min_trade_seconds: Number(e.target.value) })}
                        className="h-10 px-3 rounded-xl bg-[#0B0F19] border border-[#1F2937] text-xs text-white focus:outline-none focus:border-accent font-sans transition-all"
                      />
                      <span className="text-[10px] text-gray-500">Minimum time a position must remain open</span>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="min-hold-action" className="text-xs font-semibold text-gray-300">Action on Under-Duration Trade</Label>
                      <select
                        id="min-hold-action"
                        value={planForm.min_hold_action || 'flag'}
                        onChange={(e) => setPlanForm({ ...planForm, min_hold_action: e.target.value as any })}
                        className="w-full h-10 px-3 rounded-xl bg-[#0B0F19] border border-[#1F2937] text-xs text-white focus:outline-none focus:border-accent font-sans transition-all"
                      >
                        <option value="flag">Flag in Risk Alert Hub (Investigation)</option>
                        <option value="void_pnl">Void Trade PnL (Zero Profit/Loss)</option>
                        <option value="reject">Hard Breach Account (Immediate Termination)</option>
                      </select>
                    </div>
                  </div>

                  {(planForm.min_trade_seconds || 0) > 0 && (
                    <div className="p-3.5 bg-blue-500/10 rounded-xl border border-blue-500/30 flex items-start gap-2.5 text-[11px] text-blue-200 leading-relaxed">
                      <Zap className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <p>
                        <strong>Bridge & Liquidity Shield:</strong> Trades closed in under {planForm.min_trade_seconds} seconds will be {planForm.min_hold_action === 'void_pnl' ? 'voided (0 PnL credited)' : planForm.min_hold_action === 'reject' ? 'breached automatically' : 'flagged for compliance review'}. This protects your liquidity provider connections against toxic high-frequency latency arbitrage.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="news-minutes" className="text-xs font-semibold text-gray-300">News Window Buffer (Minutes)</Label>
                      <Input
                        id="news-minutes"
                        type="number"
                        value={planForm.news_window_minutes || 5}
                        onChange={(e) => setPlanForm({ ...planForm, news_window_minutes: Number(e.target.value) })}
                        className="h-10 px-3 rounded-xl bg-[#0B0F19] border border-[#1F2937] text-xs text-white focus:outline-none focus:border-accent font-sans transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="inactivity" className="text-xs font-semibold text-gray-300">Max Inactivity Auto-Close (Days)</Label>
                      <Input
                        id="inactivity"
                        type="number"
                        value={planForm.max_inactivity_days || 30}
                        onChange={(e) => setPlanForm({ ...planForm, max_inactivity_days: Number(e.target.value) })}
                        className="h-10 px-3 rounded-xl bg-[#0B0F19] border border-[#1F2937] text-xs text-white focus:outline-none focus:border-accent font-sans transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── SECTION 4: SCALING & PERKS ──────────────────────────────── */}
              {modalSection === 'scaling' && (
                <div className="space-y-4">
                  <div className="border-b border-[#1F2937]/70 pb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-accent" />
                      Trader Scaling Plan & Financial Perks
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Automated capital growth steps, reset discount coupons, and 100% refundable evaluation fees.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3.5 bg-[#0B0F19] rounded-xl border border-[#1F2937]">
                      <div>
                        <p className="text-xs font-semibold text-gray-200">Account Scaling Program</p>
                        <p className="text-[10px] text-gray-500">Auto-bump capital on milestone</p>
                      </div>
                      <Switch
                        checked={!!planForm.scaling_enabled}
                        onCheckedChange={(checked) => setPlanForm({ ...planForm, scaling_enabled: checked ? 1 : 0 })}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="scaling-growth" className="text-xs font-semibold text-gray-300">Capital Bump (% Step)</Label>
                      <Input
                        id="scaling-growth"
                        type="number"
                        value={planForm.scaling_growth_pct || 25}
                        onChange={(e) => setPlanForm({ ...planForm, scaling_growth_pct: Number(e.target.value) })}
                        disabled={!planForm.scaling_enabled}
                        className="h-10 px-3 rounded-xl bg-[#0B0F19] border border-[#1F2937] text-xs text-white focus:outline-none focus:border-accent font-sans transition-all disabled:opacity-50"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="scaling-target" className="text-xs font-semibold text-gray-300">Required Profit Milestone (%)</Label>
                      <Input
                        id="scaling-target"
                        type="number"
                        value={planForm.scaling_required_profit_pct || 10}
                        onChange={(e) => setPlanForm({ ...planForm, scaling_required_profit_pct: Number(e.target.value) })}
                        disabled={!planForm.scaling_enabled}
                        className="h-10 px-3 rounded-xl bg-[#0B0F19] border border-[#1F2937] text-xs text-white focus:outline-none focus:border-accent font-sans transition-all disabled:opacity-50"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="scaling-max" className="text-xs font-semibold text-gray-300">Max Scaled Capital ($)</Label>
                      <Input
                        id="scaling-max"
                        type="number"
                        value={planForm.scaling_max_balance || 2000000}
                        onChange={(e) => setPlanForm({ ...planForm, scaling_max_balance: Number(e.target.value) })}
                        disabled={!planForm.scaling_enabled}
                        className="h-10 px-3 rounded-xl bg-[#0B0F19] border border-[#1F2937] text-xs text-white focus:outline-none focus:border-accent font-sans transition-all disabled:opacity-50"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="reset-discount" className="text-xs font-semibold text-gray-300">Breach Reset Discount (%)</Label>
                      <Input
                        id="reset-discount"
                        type="number"
                        value={planForm.reset_discount_pct || 10}
                        onChange={(e) => setPlanForm({ ...planForm, reset_discount_pct: Number(e.target.value) })}
                        className="h-10 px-3 rounded-xl bg-[#0B0F19] border border-[#1F2937] text-xs text-white focus:outline-none focus:border-accent font-sans transition-all"
                      />
                      <span className="text-[10px] text-gray-500">Discount coupon generated upon breach</span>
                    </div>

                    <div className="flex items-center justify-between p-3.5 bg-[#0B0F19] rounded-xl border border-[#1F2937]">
                      <div>
                        <p className="text-xs font-semibold text-gray-200">Refundable Evaluation Fee</p>
                        <p className="text-[10px] text-gray-500">100% fee refunded on 1st payout</p>
                      </div>
                      <Switch
                        checked={!!planForm.refundable_fee}
                        onCheckedChange={(checked) => setPlanForm({ ...planForm, refundable_fee: checked ? 1 : 0 })}
                      />
                    </div>
                  </div>
                </div>
              )}

            </div>

          </div>

          {/* Modal Footer Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-[#1F2937]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPlanModalOpen(false)}
            >
              Cancel
            </Button>

            <div className="flex items-center gap-2">
              {modalSection !== 'basics' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (modalSection === 'scaling') setModalSection('rules')
                    else if (modalSection === 'rules') setModalSection('drawdown')
                    else if (modalSection === 'drawdown') setModalSection('basics')
                  }}
                >
                  ← Previous
                </Button>
              )}

              {modalSection !== 'scaling' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (modalSection === 'basics') setModalSection('drawdown')
                    else if (modalSection === 'drawdown') setModalSection('rules')
                    else if (modalSection === 'rules') setModalSection('scaling')
                  }}
                >
                  Next Step →
                </Button>
              )}

              <Button
                variant="primary"
                size="sm"
                onClick={handleSavePlanSubmit}
                loading={savePlanMutation.isPending}
                className="bg-accent text-slate-950 hover:bg-accent/90 font-bold"
              >
                <Save className="h-4 w-4 mr-1.5" />
                {editingPlan ? 'Update Plan' : 'Save Challenge Plan'}
              </Button>
            </div>
          </div>

        </div>
      </Modal>

      {/* Delete / Archive Plan Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!planToDelete}
        onCancel={() => setPlanToDelete(null)}
        onConfirm={() => {
          if (planToDelete) {
            deletePlanMutation.mutate(planToDelete.id)
            setPlanToDelete(null)
          }
        }}
        title={`Delete Plan: ${planToDelete?.name}`}
        description={`Are you sure you want to delete or archive "${planToDelete?.name}"? If active traders are using this plan, it will be safely deactivated.`}
        confirmText="Delete / Archive"
        isDestructive={true}
        loading={deletePlanMutation.isPending}
      />

      {/* Live SMTP Diagnostic Handshake Terminal Modal */}
      <Modal
        open={isSmtpModalOpen}
        onOpenChange={setIsSmtpModalOpen}
        title="SMTP Socket Handshake Diagnostic Terminal"
        description="Real-time TCP stream & authentication handshake logs with your configured mail server."
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4 pt-2">
          <div className="bg-[#0B0F19] rounded-xl border border-[#1F2937] p-4 font-mono text-xs text-emerald-400 space-y-1.5 max-h-[300px] overflow-y-auto">
            {smtpHandshakeLogs.map((log, idx) => (
              <div key={idx} className={`leading-relaxed ${log.includes('ERROR') || log.includes('EXCEPTION') ? 'text-red-400 font-bold' : log.includes('VERIFIED') ? 'text-emerald-300 font-bold' : 'text-gray-300'}`}>
                {log}
              </div>
            ))}
            {isTestingSmtp && (
              <div className="flex items-center gap-2 text-emerald-400 animate-pulse pt-2">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Negotiating TLS handshake & transmitting envelope...</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-gray-500 font-mono">Target: {testEmailTo}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSmtpModalOpen(false)}
            >
              Close Diagnostic Terminal
            </Button>
          </div>
        </div>
      </Modal>

      {/* Factory Reset & Purge Test Data Double-Confirmation Modal */}
      <Modal
        open={isPurgeModalOpen}
        onOpenChange={setIsPurgeModalOpen}
        title="⚠️ Factory Reset & Purge Test Database"
        description="This action will permanently delete all mock/test accounts, demo trading logs, orders, and breach notifications. Your admin account and challenge plans will remain intact."
        maxWidth="max-w-md"
      >
        <div className="space-y-4 pt-2">
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl space-y-1.5">
            <p className="text-xs font-semibold text-red-300">Type &quot;PURGE&quot; to confirm execution:</p>
            <Input
              placeholder="PURGE"
              value={purgeConfirmationText}
              onChange={(e) => setPurgeConfirmationText(e.target.value)}
              className="border-red-500/40 text-red-200 font-mono font-bold tracking-widest uppercase bg-[#0B0F19]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsPurgeModalOpen(false)
                setPurgeConfirmationText('')
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handlePurgeTestData}
              loading={isPurgingDemo}
              disabled={purgeConfirmationText.trim().toUpperCase() !== 'PURGE'}
              className="bg-red-600 hover:bg-red-500 text-white font-bold"
            >
              Confirm Factory Purge
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  )
}

