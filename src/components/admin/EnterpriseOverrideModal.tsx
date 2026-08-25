'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Label } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { ShieldAlert, Sparkles, Sliders, CheckCircle2, User, AlertCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'

export interface TraderOverrideTarget {
  id: number
  user_id?: number
  name?: string
  username?: string
  user_login?: string
  user_email?: string
  email?: string
  account_id?: number | string
  plan_name?: string
  profit_split?: number
  max_daily_loss?: number
  max_total_loss?: number
  min_days?: number
  news_trading?: boolean
  weekend_holding?: boolean
  [key: string]: any
}

interface EnterpriseOverrideModalProps {
  isOpen: boolean
  onClose: () => void
  trader: TraderOverrideTarget | null
  onSuccess?: () => void
}

export function EnterpriseOverrideModal({
  isOpen,
  onClose,
  trader,
  onSuccess,
}: EnterpriseOverrideModalProps) {
  const [profitSplit, setProfitSplit] = useState<number>(80)
  const [maxDailyLoss, setMaxDailyLoss] = useState<number>(5)
  const [maxTotalLoss, setMaxTotalLoss] = useState<number>(10)
  const [minTradingDays, setMinTradingDays] = useState<number>(5)
  const [newsTradingAllowed, setNewsTradingAllowed] = useState<boolean>(true)
  const [weekendHoldingAllowed, setWeekendHoldingAllowed] = useState<boolean>(false)
  const [adminNote, setAdminNote] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // Initialize values when trader changes
  useEffect(() => {
    if (trader) {
      setProfitSplit(trader.profit_split ?? 80)
      setMaxDailyLoss(trader.max_daily_loss ?? 5)
      setMaxTotalLoss(trader.max_total_loss ?? 10)
      setMinTradingDays(trader.min_days ?? 5)
      setNewsTradingAllowed(trader.news_trading ?? true)
      setWeekendHoldingAllowed(trader.weekend_holding ?? false)
      setAdminNote('')
    }
  }, [trader])

  const traderName = trader?.name || trader?.username || trader?.user_login || `Trader #${trader?.user_id || trader?.id}`
  const accountId = trader?.account_id || trader?.id || 88219
  const basePlan = trader?.plan_name || '$100K Stellar 2-Step'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!adminNote.trim()) {
      toast.error('Audit note is required for applying custom risk overrides.')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        profit_split: profitSplit,
        daily_drawdown: maxDailyLoss,
        max_daily_loss: maxDailyLoss,
        max_drawdown: maxTotalLoss,
        max_total_loss: maxTotalLoss,
        min_trading_days: minTradingDays,
        news_trading: newsTradingAllowed,
        weekend_holding: weekendHoldingAllowed,
        admin_note: adminNote.trim(),
      }

      const userId = trader?.user_id || trader?.id || 0
      const res = await api.admin.overrideRule(userId, payload)

      if (res.ok && (res.data as any)?.success !== false) {
        toast.success(`Custom rules saved successfully for ${traderName} (ACC-${accountId})`)
        onSuccess?.()
        onClose()
      } else {
        toast.error((res as any).error || 'Failed to apply custom rule overrides')
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred while saving overrides')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen && !!trader}
      onClose={onClose}
      title="Enterprise Account Overrides"
      description="Apply bespoke rule parameters, profit splits, and risk constraints for VIP & Institutional traders."
      className="max-w-2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            loading={isSubmitting}
            className="gap-2 shadow-emerald-500/20"
          >
            <CheckCircle2 className="h-4 w-4" />
            Save Custom Rules
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5 py-2">
        {/* Trader Target Summary Header */}
        <div className="bg-[#0B0F19] rounded-xl border border-[#1F2937] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
              {traderName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-100 text-sm">{traderName}</span>
                <Badge tone="accent" size="sm" className="font-mono text-[10px]">
                  #TRD-{accountId}
                </Badge>
              </div>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                Base Plan: <span className="text-gray-300 font-medium">{basePlan}</span>
              </p>
            </div>
          </div>

          <Badge tone="neutral" size="sm" className="self-start sm:self-center font-mono">
            Custom Override Mode
          </Badge>
        </div>

        {/* Form Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Profit Split (%) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="profit-split" className="mb-0">Profit Split (%)</Label>
              <span className="text-[11px] text-emerald-400 font-mono font-semibold">{profitSplit}% Trader</span>
            </div>
            <div className="relative">
              <Input
                id="profit-split"
                type="number"
                min={50}
                max={95}
                value={profitSplit}
                onChange={(e) => setProfitSplit(Number(e.target.value))}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-mono">%</span>
            </div>
            <p className="text-[11px] text-gray-500">Default 80%, configurable up to 95%.</p>
          </div>

          {/* Min Trading Days */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="min-days" className="mb-0">Min Trading Days</Label>
              <span className="text-[11px] text-gray-400 font-mono">{minTradingDays} Days</span>
            </div>
            <div className="relative">
              <Input
                id="min-days"
                type="number"
                min={0}
                max={30}
                value={minTradingDays}
                onChange={(e) => setMinTradingDays(Number(e.target.value))}
                className="pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-mono">Days</span>
            </div>
            <p className="text-[11px] text-gray-500">Set 0 to remove minimum requirement.</p>
          </div>

          {/* Max Daily Loss (%) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="max-daily-loss" className="mb-0">Max Daily Loss (%)</Label>
              <span className="text-[11px] text-amber-400 font-mono">{maxDailyLoss}%</span>
            </div>
            <div className="relative">
              <Input
                id="max-daily-loss"
                type="number"
                min={1}
                max={20}
                step={0.5}
                value={maxDailyLoss}
                onChange={(e) => setMaxDailyLoss(Number(e.target.value))}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-mono">%</span>
            </div>
            <p className="text-[11px] text-gray-500">Daily drawdown threshold relative to start balance.</p>
          </div>

          {/* Max Total Loss (%) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="max-total-loss" className="mb-0">Max Total Loss (%)</Label>
              <span className="text-[11px] text-red-400 font-mono">{maxTotalLoss}%</span>
            </div>
            <div className="relative">
              <Input
                id="max-total-loss"
                type="number"
                min={2}
                max={30}
                step={0.5}
                value={maxTotalLoss}
                onChange={(e) => setMaxTotalLoss(Number(e.target.value))}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-mono">%</span>
            </div>
            <p className="text-[11px] text-gray-500">Overall account breach ceiling.</p>
          </div>

        </div>

        {/* Toggle Switches */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          
          {/* News Trading Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-[#1F2937] bg-[#0B0F19]">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-gray-200">News Trading Allowed</span>
              <p className="text-[11px] text-gray-500">Permit execution during high-impact news</p>
            </div>
            <Switch
              checked={newsTradingAllowed}
              onCheckedChange={setNewsTradingAllowed}
            />
          </div>

          {/* Weekend Holding Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-[#1F2937] bg-[#0B0F19]">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-gray-200">Weekend Holding Allowed</span>
              <p className="text-[11px] text-gray-500">Allow holding positions over market close</p>
            </div>
            <Switch
              checked={weekendHoldingAllowed}
              onCheckedChange={setWeekendHoldingAllowed}
            />
          </div>

        </div>

        {/* Admin Audit Note */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="admin-note" className="mb-0">
              Admin Note / Audit Reason <span className="text-red-400">*</span>
            </Label>
            <span className="text-[10px] text-gray-500">Logged to compliance trail</span>
          </div>
          <Textarea
            id="admin-note"
            rows={3}
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            placeholder="e.g. VIP Trader upgrade approved per contract #LP-9912. Higher profit share and weekend holding unlocked."
            required
          />
        </div>

      </form>
    </Modal>
  )
}
