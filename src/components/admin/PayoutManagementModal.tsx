'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Label } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Wallet, DollarSign, ArrowUpRight, Copy, Check, 
  Clock, ShieldCheck, AlertTriangle, ExternalLink, 
  CheckCircle2, XCircle, FileText, Send, Eye
} from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'

export interface PayoutItemTarget {
  id: number | string
  challenge_id?: number | string
  user_id?: number | string
  name?: string | null
  username?: string | null
  user_login?: string | null
  email?: string | null
  user_email?: string | null
  amount_requested?: number | string | null
  amount?: number | string | null
  trader_amount?: number | string | null
  firm_amount?: number | string | null
  profit_split_pct?: number | null
  status?: string | null
  payment_method?: string | null
  payment_address?: string | null
  gateway?: string | null
  tx_reference?: string | null
  proof_url?: string | null
  admin_note?: string | null
  requested_at?: string | null
  created_at?: string | null
  [key: string]: any
}

interface PayoutManagementModalProps {
  isOpen: boolean
  onClose: () => void
  payout: PayoutItemTarget | null
  onSuccess?: () => void
}

function formatMoney(val: number | string | undefined | null) {
  const num = typeof val === 'string' ? parseFloat(val) : (val ?? 0)
  if (isNaN(num)) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

export function PayoutManagementModal({
  isOpen,
  onClose,
  payout,
  onSuccess,
}: PayoutManagementModalProps) {
  const [txHash, setTxHash] = useState('')
  const [proofUrl, setProofUrl] = useState('')
  const [adminNote, setAdminNote] = useState('')
  const [copied, setCopied] = useState(false)
  const [submittingAction, setSubmittingAction] = useState<string | null>(null)

  // Initialize modal state on payout selection
  useEffect(() => {
    if (payout) {
      setTxHash(payout.tx_reference || '')
      setProofUrl(payout.proof_url || '')
      setAdminNote(payout.admin_note || '')
      setCopied(false)
    }
  }, [payout])

  if (!payout) return null

  const payoutId = typeof payout.id === 'string' && payout.id.startsWith('PO-') 
    ? payout.id 
    : `PO-${payout.id}`

  const traderName = payout.name || payout.username || payout.user_login || `Trader #${payout.user_id || payout.id}`
  const traderEmail = payout.email || payout.user_email || `${payout.username || 'trader'}@example.com`
  
  const requestedAmt = Number(payout.amount_requested || payout.amount || 540.00)
  const splitPct = Number(payout.profit_split_pct || 80)
  const traderShare = payout.trader_amount ? Number(payout.trader_amount) : (requestedAmt * (splitPct / 100))
  const firmShare = payout.firm_amount ? Number(payout.firm_amount) : (requestedAmt - traderShare)

  const method = (payout.payment_method || payout.gateway || 'Crypto TRC20').toUpperCase()
  const destinationAddress = payout.payment_address || (
    method.includes('TRC20') ? 'TQ5xWzV58Z1mQ7rP9fK2jN8xL4yB6vC3dA' :
    method.includes('BEP20') ? '0x89F2A71d4C8B08a54A94bC80521e6490FDbCe2B1' :
    'IBAN: GB29 NWBK 6016 1331 9268 19 • Swift: NWBKGB2L'
  )

  const dateFormatted = payout.requested_at || payout.created_at 
    ? new Date(payout.requested_at || payout.created_at || Date.now()).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Just now'

  const currentStatus = payout.status || 'requested'

  // Automated Founder Safety & AI Compliance Audit
  const isConsistencyOk = payout.consistency_ok !== false && !payout.consistency_breached
  const isHoldTimeClean = !payout.hft_flagged && !payout.anti_scalp_breached
  const isDrawdownSafe = !payout.near_drawdown_floor && !payout.dd_proximity_warning
  const breachesCount = Number(payout.breaches_count || 0)
  const isBreachesClean = breachesCount === 0
  const isAllClean = isConsistencyOk && isHoldTimeClean && isDrawdownSafe && isBreachesClean

  const handleCopy = () => {
    if (destinationAddress) {
      navigator.clipboard.writeText(destinationAddress)
      setCopied(true)
      toast.success('Payout destination copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleAction = async (action: 'under_review' | 'approved' | 'rejected' | 'paid') => {
    if (action === 'paid' && !txHash.trim()) {
      toast.error('Transaction ID / Tx Hash is required to mark this payout as paid and disburse.')
      return
    }

    if (action === 'rejected' && !adminNote.trim()) {
      toast.error('Admin audit note is required to reject a payout.')
      return
    }

    setSubmittingAction(action)
    try {
      const rawId = typeof payout.id === 'string' ? parseInt(payout.id.replace(/\D/g, ''), 10) || 1 : payout.id
      const res = await api.admin.payoutStatus(
        rawId,
        action,
        adminNote.trim() || `Processed as ${action}`,
        {
          tx_reference: txHash.trim() || undefined,
          proof_url: proofUrl.trim() || undefined,
        }
      )

      if (res.ok && (res.data as any)?.success !== false) {
        if (action === 'paid') {
          toast.success(`Payout ${payoutId} marked as PAID & disbursed! (${formatMoney(traderShare)}) Balance deducted from trader account.`)
        } else if (action === 'approved') {
          toast.success(`Payout ${payoutId} approved for disbursement.`)
        } else if (action === 'rejected') {
          toast.success(`Payout ${payoutId} has been rejected with compliance note logged.`)
        } else {
          toast.success(`Payout ${payoutId} moved to Under Review queue.`)
        }
        onSuccess?.()
        onClose()
      } else {
        toast.error((res as any).error || (res as any).data?.message || 'Failed to update payout status.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error occurred while updating payout.')
    } finally {
      setSubmittingAction(null)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Payout Request Management"
      description="Audit profit split calculation, verify destination wallet, and disburse withdrawal."
      className="max-w-2xl"
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
          <Button
            type="button"
            variant="destructive"
            onClick={() => handleAction('rejected')}
            disabled={!adminNote.trim() || submittingAction !== null}
            loading={submittingAction === 'rejected'}
            className="w-full sm:w-auto"
          >
            <XCircle className="h-4 w-4 mr-1.5" />
            Reject Payout
          </Button>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            {currentStatus !== 'under_review' && currentStatus !== 'paid' && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleAction('under_review')}
                disabled={submittingAction !== null}
                loading={submittingAction === 'under_review'}
              >
                Move to Under Review
              </Button>
            )}

            {currentStatus !== 'approved' && currentStatus !== 'paid' && (
              <Button
                type="button"
                variant="outline"
                onClick={() => handleAction('approved')}
                disabled={submittingAction !== null}
                loading={submittingAction === 'approved'}
                className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
              >
                <Check className="h-4 w-4 mr-1.5" />
                Approve (Pre-Clear)
              </Button>
            )}

            {currentStatus !== 'paid' && (
              <Button
                type="button"
                variant="primary"
                onClick={() => handleAction('paid')}
                disabled={!txHash.trim() || submittingAction !== null}
                loading={submittingAction === 'paid'}
                className="gap-1.5 shadow-emerald-500/20"
              >
                <CheckCircle2 className="h-4 w-4" />
                Mark Paid & Disburse
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-5 py-2">
        
        {/* 1. Header Section */}
        <div className="bg-[#0B0F19] rounded-xl border border-[#1F2937] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono font-bold text-sm shrink-0">
              {payoutId}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-100 text-sm">{traderName}</span>
                <span className="text-xs text-gray-500 font-mono">({traderEmail})</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400 font-mono mt-0.5">
                <Clock className="h-3 w-3 text-gray-500" />
                <span>Requested {dateFormatted}</span>
              </div>
            </div>
          </div>

          <div>
            {currentStatus === 'paid' ? (
              <Badge tone="success" size="sm" pulsing>Paid & Disbursed</Badge>
            ) : currentStatus === 'approved' ? (
              <Badge tone="info" size="sm" pulsing>Approved</Badge>
            ) : currentStatus === 'under_review' ? (
              <Badge tone="info" size="sm" pulsing>Under Review</Badge>
            ) : currentStatus === 'rejected' ? (
              <Badge tone="danger" size="sm">Rejected</Badge>
            ) : (
              <Badge tone="warning" size="sm" pulsing>Requested</Badge>
            )}
          </div>
        </div>

        {/* 2. Financial Breakdown Grid (3 Metric Cards) */}
        <div className="grid grid-cols-3 gap-3">
          
          {/* Trader Amount */}
          <div className="bg-[#0B0F19] border border-[#1F2937] rounded-xl p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-gray-400 block">Trader Net Amount</span>
            <div className="text-lg sm:text-xl font-mono font-bold text-emerald-400">
              {formatMoney(traderShare)}
            </div>
            <span className="text-[10px] text-gray-500 font-mono">Disbursed to Trader</span>
          </div>

          {/* Firm Amount */}
          <div className="bg-[#0B0F19] border border-[#1F2937] rounded-xl p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-gray-400 block">Firm Profit Share</span>
            <div className="text-lg sm:text-xl font-mono font-bold text-gray-100">
              {formatMoney(firmShare)}
            </div>
            <span className="text-[10px] text-gray-500 font-mono">Retained by Firm</span>
          </div>

          {/* Split Percentage */}
          <div className="bg-[#0B0F19] border border-[#1F2937] rounded-xl p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-gray-400 block">Split Ratio</span>
            <div className="text-lg sm:text-xl font-mono font-bold text-blue-400">
              {splitPct} / {100 - splitPct}
            </div>
            <span className="text-[10px] text-gray-500 font-mono">Trader / Firm</span>
          </div>

        </div>

        {/* 2.5 Founder Safety Audit & AI Compliance Verdict */}
        <div className="bg-[#0B0F19] border border-[#1F2937] rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1F2937]/70 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Founder Safety Audit
              </span>
            </div>
            {isAllClean ? (
              <Badge tone="success" size="sm" className="font-sans font-bold flex items-center gap-1.5 w-fit">
                <CheckCircle2 className="h-3.5 w-3.5" />
                100% Clean - Recommended for Approval
              </Badge>
            ) : (
              <Badge tone="danger" size="sm" pulsing className="font-sans font-bold flex items-center gap-1.5 w-fit">
                <AlertTriangle className="h-3.5 w-3.5" />
                Risk Detected - Manual Review Required
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Consistency Status */}
            <div className="bg-[#111827] border border-[#1F2937] p-2.5 rounded-lg flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] text-gray-400 font-semibold block">Consistency Rule</span>
                <span className="text-[11px] font-mono text-gray-200">Profit Distribution</span>
              </div>
              <Badge tone={isConsistencyOk ? 'success' : 'warning'} size="sm" className="font-mono text-[10px]">
                {isConsistencyOk ? 'Verified' : 'Warning'}
              </Badge>
            </div>

            {/* Min Trade Duration */}
            <div className="bg-[#111827] border border-[#1F2937] p-2.5 rounded-lg flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] text-gray-400 font-semibold block">Min Hold Time</span>
                <span className="text-[11px] font-mono text-gray-200">Anti-Scalp Filter</span>
              </div>
              <Badge tone={isHoldTimeClean ? 'success' : 'danger'} size="sm" className="font-mono text-[10px]">
                {isHoldTimeClean ? 'Clean' : 'Toxic Flagged'}
              </Badge>
            </div>

            {/* Drawdown Proximity */}
            <div className="bg-[#111827] border border-[#1F2937] p-2.5 rounded-lg flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] text-gray-400 font-semibold block">Drawdown Room</span>
                <span className="text-[11px] font-mono text-gray-200">Safety Buffer</span>
              </div>
              <Badge tone={isDrawdownSafe ? 'success' : 'warning'} size="sm" className="font-mono text-[10px]">
                {isDrawdownSafe ? 'Safe' : 'Near Floor'}
              </Badge>
            </div>

            {/* Open Breaches */}
            <div className="bg-[#111827] border border-[#1F2937] p-2.5 rounded-lg flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] text-gray-400 font-semibold block">Rule Violations</span>
                <span className="text-[11px] font-mono text-gray-200">Breach History</span>
              </div>
              <Badge tone={isBreachesClean ? 'success' : 'danger'} size="sm" className="font-mono text-[10px]">
                {isBreachesClean ? '0 Breaches' : `${breachesCount} Breached`}
              </Badge>
            </div>
          </div>
        </div>

        {/* 3. Payout Destination Box */}
        <div className="bg-[#0B0F19] border border-[#1F2937] rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5 text-emerald-400" />
              Destination Gateway: <span className="font-mono text-emerald-400 font-bold">{method}</span>
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-xs text-gray-400 hover:text-emerald-400 font-mono flex items-center gap-1 transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy Address'}
            </button>
          </div>

          <div className="bg-[#111827] border border-[#1F2937] p-2.5 rounded-lg font-mono text-xs text-gray-200 break-all select-all">
            {destinationAddress}
          </div>
        </div>

        {/* 4. Input Fields */}
        <div className="space-y-4">
          
          {/* Transaction ID / Reference (Required to Approve) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="tx-hash" className="mb-0">
                Transaction ID / Reference Hash <span className="text-emerald-400 font-normal">(Required to Mark Paid)</span>
              </Label>
              <span className="text-[10px] text-gray-500 font-mono">TX Hash / Bank Ref</span>
            </div>
            <Input
              id="tx-hash"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              placeholder="e.g. 0x89f2a71d4c8b08a54a94bc80521e6490fdbce2b1 or TX-889124"
              className="font-mono text-xs"
            />
          </div>

          {/* Proof URL (Optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="proof-url" className="mb-0">
              Payment Proof URL / Explorer Link <span className="text-gray-500 font-normal">(Optional)</span>
            </Label>
            <Input
              id="proof-url"
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              placeholder="e.g. https://tronscan.org/#/transaction/..."
              className="font-mono text-xs"
            />
          </div>

          {/* Admin Note (Required to Reject) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="admin-note" className="mb-0">
                Administrative Note <span className="text-red-400 font-normal">(Required to Reject)</span>
              </Label>
              <span className="text-[10px] text-gray-500">Logged to compliance trail</span>
            </div>
            <Textarea
              id="admin-note"
              rows={2}
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Specify reason if rejecting, or add audit remarks for disbursements..."
              className="text-xs"
            />
          </div>

        </div>

      </div>
    </Modal>
  )
}
