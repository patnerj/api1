'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { 
  CreditCard, Globe, Cpu, CheckCircle2, XCircle, Eye, 
  RefreshCw, Save, DollarSign, ShieldCheck, FileText,
  Clock, AlertTriangle, ExternalLink, Zap, Lock
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { getSession, apiUrl } from '@/lib/fxsim'
import type { PaymentOrder, PaymentGatewaysConfig } from '@/types/api'
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter 
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/DataTable'
import { Switch } from '@/components/ui/switch'
import { Modal } from '@/components/ui/Modal'
import { Input, Label } from '@/components/ui/input'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from 'sonner'

export default function PaymentsHubPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'gateways' | 'queue'>('gateways')

  // ─────────────────────────────────────────────────────────────────
  // TAB 1: GATEWAYS CONFIGURATION STATE & QUERIES
  // ─────────────────────────────────────────────────────────────────
  const [gatewayForm, setGatewayForm] = useState<PaymentGatewaysConfig>({
    stripe_enabled: true,
    stripe_public_key: '',
    stripe_secret_key: '',
    stripe_webhook_secret: '',
    cryptomus_enabled: true,
    cryptomus_merchant_id: '',
    cryptomus_api_key: '',
    nowpayments_enabled: false,
    nowpayments_api_key: '',
    paypal_enabled: false,
    paypal_client_id: '',
    paypal_secret: '',
    manual_crypto_enabled: true,
    manual_bank_enabled: true,
  })

  const { data: gatewayData, isLoading: isGatewaysLoading, refetch: refetchGateways } = useQuery({
    queryKey: ['admin-payment-gateways'],
    queryFn: async () => {
      const res = await api.admin.paymentGatewaysGet()
      return res.ok && res.data ? res.data : null
    },
    staleTime: 10000,
  })

  useEffect(() => {
    if (gatewayData) {
      setGatewayForm(gatewayData)
    }
  }, [gatewayData])

  const saveGatewaysMutation = useMutation({
    mutationFn: async (payload: typeof gatewayForm) => {
      const res = await api.admin.paymentGatewaysSave(payload)
      if (!res.ok) throw new Error(res.error || 'Failed to save payment gateway settings.')
      return res.data
    },
    onSuccess: () => {
      toast.success('Payment gateway credentials and routing rules saved successfully!')
      queryClient.invalidateQueries({ queryKey: ['admin-payment-gateways'] })
    },
    onError: (err: any) => {
      toast.error('Save Error: ' + err.message)
    },
  })

  // Stripe status check
  const { data: stripeStatusData, refetch: refetchStripeStatus, isFetching: isCheckingStripe } = useQuery({
    queryKey: ['admin-stripe-status-check'],
    queryFn: async () => {
      const res = await api.admin.stripeStatus()
      return res.ok && res.data ? res.data : null
    },
    enabled: false,
  })

  // ─────────────────────────────────────────────────────────────────
  // TAB 2: MANUAL PAYMENT PROOFS QUEUE STATE & QUERIES
  // ─────────────────────────────────────────────────────────────────
  const [selectedOrder, setSelectedOrder] = useState<PaymentOrder | null>(null)
  const [isProofModalOpen, setIsProofModalOpen] = useState(false)
  const [adminActionNote, setAdminActionNote] = useState('')
  const [isOrderActionLoading, setIsOrderActionLoading] = useState(false)
  const [proofBlobUrl, setProofBlobUrl] = useState<string | null>(null)
  const [isProofPdf, setIsProofPdf] = useState(false)
  const [isProofLoading, setIsProofLoading] = useState(false)

  const { data: orders = [], isLoading: isOrdersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ['admin-payments-list'],
    queryFn: async () => {
      const res = await api.admin.paymentsList()
      return res.ok && Array.isArray(res.data) ? res.data : []
    },
    staleTime: 5000,
  })

  const handleApprovePayment = async (orderId: number) => {
    setIsOrderActionLoading(true)
    try {
      const res = await api.admin.paymentApprove(orderId, adminActionNote)
      if (res.ok) {
        toast.success(`Order #${orderId} approved! Evaluation account provisioned and emailed to trader.`)
        setIsProofModalOpen(false)
        setSelectedOrder(null)
        setAdminActionNote('')
        queryClient.invalidateQueries({ queryKey: ['admin-payments-list'] })
      } else {
        toast.error(res.error || 'Failed to approve payment.')
      }
    } catch (err: any) {
      toast.error('Approve Error: ' + err.message)
    } finally {
      setIsOrderActionLoading(false)
    }
  }

  const handleRejectPayment = async (orderId: number) => {
    if (!adminActionNote.trim()) {
      toast.error('Please enter a note explaining why this payment was rejected.')
      return
    }
    setIsOrderActionLoading(true)
    try {
      const res = await api.admin.paymentReject(orderId, adminActionNote)
      if (res.ok) {
        toast.success(`Order #${orderId} marked as rejected.`)
        setIsProofModalOpen(false)
        setSelectedOrder(null)
        setAdminActionNote('')
        queryClient.invalidateQueries({ queryKey: ['admin-payments-list'] })
      } else {
        toast.error(res.error || 'Failed to reject payment.')
      }
    } catch (err: any) {
      toast.error('Reject Error: ' + err.message)
    } finally {
      setIsOrderActionLoading(false)
    }
  }

  const openProofReviewModal = (order: PaymentOrder) => {
    setSelectedOrder(order)
    setAdminActionNote(order.admin_note || '')
    setIsProofModalOpen(true)
  }

  useEffect(() => {
    if (!selectedOrder?.proof_view_url || !isProofModalOpen) {
      if (proofBlobUrl) URL.revokeObjectURL(proofBlobUrl)
      setProofBlobUrl(null)
      setIsProofPdf(false)
      return
    }

    let isCancelled = false
    setIsProofLoading(true)

    const fetchModalProof = async () => {
      try {
        const session = getSession()
        const token = session.bearer || ''
        const baseDocUrl = selectedOrder.proof_view_url!.startsWith('http')
          ? selectedOrder.proof_view_url!
          : apiUrl(selectedOrder.proof_view_url!)
        const urlWithToken = token
          ? `${baseDocUrl}${baseDocUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
          : baseDocUrl

        const headers: Record<string, string> = {}
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
          headers['X-FXSIM-Token'] = token
        }
        if (session.nonce) {
          headers['X-WP-Nonce'] = session.nonce
        }

        const res = await fetch(urlWithToken, { credentials: 'include', headers, cache: 'no-store' })
        if (!res.ok) throw new Error(String(res.status))
        const contentType = res.headers.get('content-type') || ''
        const blob = await res.blob()
        if (isCancelled) return

        const url = URL.createObjectURL(blob)
        setProofBlobUrl(url)
        setIsProofPdf(contentType.includes('pdf') || blob.type === 'application/pdf')
      } catch {
        if (!isCancelled) setProofBlobUrl(null)
      } finally {
        if (!isCancelled) setIsProofLoading(false)
      }
    }

    fetchModalProof()

    return () => {
      isCancelled = true
    }
  }, [selectedOrder, isProofModalOpen])

  // Proof files are served through an authenticated endpoint
  const viewProof = async (relativePath: string) => {
    try {
      const session = getSession()
      const token = session.bearer || ''
      const baseDocUrl = relativePath.startsWith('http') ? relativePath : apiUrl(relativePath)
      const urlWithToken = token
        ? `${baseDocUrl}${baseDocUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
        : baseDocUrl

      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
        headers['X-FXSIM-Token'] = token
      }
      if (session.nonce) {
        headers['X-WP-Nonce'] = session.nonce
      }

      const res = await fetch(urlWithToken, { credentials: 'include', headers, cache: 'no-store' })
      if (!res.ok) throw new Error(String(res.status))
      const blob = await res.blob()
      const obj = URL.createObjectURL(blob)
      window.open(obj, '_blank', 'noopener')
      setTimeout(() => URL.revokeObjectURL(obj), 60_000)
    } catch {
      toast.error('Could not open payment proof')
    }
  }

  const pendingManualOrders = orders.filter((o: PaymentOrder) => o.status === 'pending' || o.status === 'submitted')

  return (
    <div className="w-full space-y-8 pb-16">
      
      {/* ── Top Header Banner ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1F2937]/70 pb-6 w-full">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Payment Gateways & Order Approvals
            </h1>
            <Badge tone="accent" size="sm" pulsing className="font-mono">
              Treasury Desk
            </Badge>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Configure credit card processors, automated crypto checkout APIs, and review offline payment proofs.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-[#111827] p-1.5 rounded-xl border border-[#1F2937]">
          <button
            onClick={() => setActiveTab('gateways')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'gateways'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <CreditCard className="h-3.5 w-3.5" />
            Gateway Configuration
          </button>

          <button
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'queue'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            Manual Proofs Queue ({pendingManualOrders.length})
          </button>
        </div>
      </div>

      {/* ── TAB 1: GATEWAY CONFIGURATION ──────────────────────────────────── */}
      {activeTab === 'gateways' && (
        <div className="space-y-6 max-w-4xl">
          
          {/* Stripe Card */}
          <Card className="bg-[#111827] border-[#1F2937]">
            <CardHeader className="border-b border-[#1F2937]/60 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-gray-100">Stripe Credit & Debit Cards</CardTitle>
                    <CardDescription className="text-xs text-gray-400">
                      Direct credit/debit card checkout via Stripe Elements and Checkout sessions.
                    </CardDescription>
                  </div>
                </div>
                <Switch
                  checked={gatewayForm.stripe_enabled}
                  onCheckedChange={(checked) => setGatewayForm({ ...gatewayForm, stripe_enabled: checked })}
                />
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="stripe-pk">Stripe Publishable Key</Label>
                  <Input
                    id="stripe-pk"
                    placeholder="pk_live_..."
                    value={gatewayForm.stripe_public_key}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, stripe_public_key: e.target.value })}
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="stripe-sk">Stripe Secret Key</Label>
                  <Input
                    id="stripe-sk"
                    type="password"
                    placeholder="sk_live_..."
                    value={gatewayForm.stripe_secret_key}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, stripe_secret_key: e.target.value })}
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="stripe-whk">Stripe Webhook Signing Secret</Label>
                <Input
                  id="stripe-whk"
                  type="password"
                  placeholder="whsec_..."
                  value={gatewayForm.stripe_webhook_secret}
                  onChange={(e) => setGatewayForm({ ...gatewayForm, stripe_webhook_secret: e.target.value })}
                  className="font-mono text-xs"
                />
                <p className="text-[11px] text-gray-500 font-mono">
                  Webhook URL to register in Stripe Dashboard: <code className="text-emerald-400">/wp-json/fxsim/v1/stripe/webhook</code>
                </p>
                {gatewayForm.stripe_enabled && !gatewayForm.stripe_webhook_secret && (
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>Stripe webhook secret not configured — Stripe checkouts will not auto-activate accounts.</span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const res = await refetchStripeStatus()
                    if (res.data?.connected) {
                      toast.success(res.data.message || 'Stripe connection verified!')
                    } else {
                      toast.error('Stripe connection check failed')
                    }
                  }}
                  loading={isCheckingStripe}
                  className="text-xs gap-1.5 border-[#1F2937]"
                >
                  <Zap className="h-3.5 w-3.5 text-blue-400" />
                  Test Stripe Connection
                </Button>

                {stripeStatusData && (
                  <span className="text-xs font-mono text-emerald-400">
                    {stripeStatusData.message}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Cryptomus & Crypto Processor */}
          <Card className="bg-[#111827] border-[#1F2937]">
            <CardHeader className="border-b border-[#1F2937]/60 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-gray-100">Cryptomus & Crypto Settlement</CardTitle>
                    <CardDescription className="text-xs text-gray-400">
                      Automated cryptocurrency checkout with instant blockchain confirmations (USDT, BTC, ETH).
                    </CardDescription>
                  </div>
                </div>
                <Switch
                  checked={gatewayForm.cryptomus_enabled}
                  onCheckedChange={(checked) => setGatewayForm({ ...gatewayForm, cryptomus_enabled: checked })}
                />
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cryptomus-mid">Cryptomus Merchant ID</Label>
                  <Input
                    id="cryptomus-mid"
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    value={gatewayForm.cryptomus_merchant_id}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, cryptomus_merchant_id: e.target.value })}
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cryptomus-key">Cryptomus Payment API Key</Label>
                  <Input
                    id="cryptomus-key"
                    type="password"
                    placeholder="••••••••••••••••"
                    value={gatewayForm.cryptomus_api_key}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, cryptomus_api_key: e.target.value })}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PayPal Commerce */}
          <Card className="bg-[#111827] border-[#1F2937]">
            <CardHeader className="border-b border-[#1F2937]/60 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-blue-600/10 border border-blue-600/20 text-blue-400 flex items-center justify-center">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-gray-100">PayPal Gateway</CardTitle>
                    <CardDescription className="text-xs text-gray-400">
                      Standard PayPal wallet and alternative card payments.
                    </CardDescription>
                  </div>
                </div>
                <Switch
                  checked={gatewayForm.paypal_enabled}
                  onCheckedChange={(checked) => setGatewayForm({ ...gatewayForm, paypal_enabled: checked })}
                />
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="paypal-cid">PayPal Client ID</Label>
                  <Input
                    id="paypal-cid"
                    placeholder="A..."
                    value={gatewayForm.paypal_client_id}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, paypal_client_id: e.target.value })}
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="paypal-sec">PayPal Secret</Label>
                  <Input
                    id="paypal-sec"
                    type="password"
                    placeholder="E..."
                    value={gatewayForm.paypal_secret}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, paypal_secret: e.target.value })}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => saveGatewaysMutation.mutate(gatewayForm)}
              loading={saveGatewaysMutation.isPending}
              className="gap-2 shadow-emerald-500/20"
            >
              <Save className="h-4 w-4" />
              Save Gateway Configuration
            </Button>
          </div>

        </div>
      )}

      {/* ── TAB 2: MANUAL PAYMENT PROOFS QUEUE ────────────────────────────── */}
      {activeTab === 'queue' && (
        <div className="space-y-6">
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl overflow-hidden shadow-xl">
            <DataTable
              data={orders}
              loading={isOrdersLoading}
              emptyMessage="No pending manual payment receipts in the queue."
              columns={[
                {
                  key: 'id',
                  header: 'Order #',
                  render: (o: PaymentOrder) => (
                    <span className="font-mono font-bold text-white text-xs">#{o.id}</span>
                  ),
                },
                {
                  key: 'trader',
                  header: 'Trader / Account',
                  render: (o: PaymentOrder) => (
                    <div>
                      <span className="font-bold text-white text-xs block">{o.user_email || `User #${o.user_id}`}</span>
                      <span className="text-[10px] text-gray-500 font-mono">Plan ID: #{o.plan_id}</span>
                    </div>
                  ),
                },
                {
                  key: 'amount',
                  header: 'Amount',
                  render: (o: PaymentOrder) => (
                    <span className="font-mono font-bold text-emerald-400 text-xs">
                      ${Number(o.amount || 0).toLocaleString()} {o.currency || 'USD'}
                    </span>
                  ),
                },
                {
                  key: 'gateway',
                  header: 'Payment Method',
                  render: (o: PaymentOrder) => (
                    <Badge tone="neutral" size="sm" className="capitalize font-mono">
                      {o.gateway || 'Manual Crypto'}
                    </Badge>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (o: PaymentOrder) => {
                    if (o.status === 'approved') {
                      return <Badge tone="success" size="sm">Provisioned</Badge>
                    }
                    if (o.status === 'rejected') {
                      return <Badge tone="danger" size="sm">Rejected</Badge>
                    }
                    return <Badge tone="warning" size="sm">Pending Review</Badge>
                  },
                },
                {
                  key: 'date',
                  header: 'Date',
                  render: (o: PaymentOrder) => (
                    <span className="text-xs text-gray-400 font-mono">
                      {o.created_at ? new Date(o.created_at).toLocaleDateString() : 'Recent'}
                    </span>
                  ),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  align: 'right',
                  render: (o: PaymentOrder) => (
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openProofReviewModal(o)}
                        className="h-8 text-xs gap-1.5 border-[#1F2937] hover:bg-slate-800"
                      >
                        <Eye className="h-3.5 w-3.5 text-emerald-400" />
                        Audit Proof
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        </div>
      )}

      {/* ── Order Proof Review Modal ───────────────────────────────────────── */}
      <Modal
        open={isProofModalOpen}
        onOpenChange={setIsProofModalOpen}
        title={
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-400" />
            <span>Audit Payment Receipt: Order #{selectedOrder?.id}</span>
          </div>
        }
        description="Verify manual offline crypto transaction hash or bank wire remittance slip."
        maxWidth="max-w-xl"
      >
        {selectedOrder && (
          <div className="space-y-6 pt-2">
            
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl border border-[#1F2937] bg-[#0B0F19] text-xs font-mono">
              <div>
                <span className="text-gray-500 block text-[10px] uppercase">Amount Due</span>
                <span className="font-bold text-emerald-400 text-sm">
                  ${Number(selectedOrder.amount || 0).toLocaleString()} {selectedOrder.currency || 'USD'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px] uppercase">Payment Gateway</span>
                <span className="font-bold text-white capitalize">{selectedOrder.gateway || 'Manual Crypto'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500 block text-[10px] uppercase">Trader Account</span>
                <span className="font-bold text-gray-200">{selectedOrder.user_email || `Trader #${selectedOrder.user_id}`}</span>
              </div>
            </div>

            {/* Proof Container */}
            <div className="space-y-2">
              <Label className="text-xs text-gray-300">Transaction Hash / Receipt Proof</Label>
              <div className="p-4 rounded-xl border border-[#1F2937] bg-[#0B0F19] space-y-2">
                {selectedOrder.txn_id ? (
                  <span className="text-xs text-gray-400 font-mono block break-all">
                    Tx Reference: <strong>{selectedOrder.txn_id}</strong>
                  </span>
                ) : (
                  <span className="text-xs text-gray-500 font-mono block">No transaction reference provided.</span>
                )}
                {/* Inline Proof Preview */}
                {isProofLoading && (
                  <div className="flex items-center justify-center py-6 gap-2 text-emerald-400">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span className="text-xs font-mono text-gray-400">Loading proof attachment...</span>
                  </div>
                )}
                {!isProofLoading && proofBlobUrl && !isProofPdf && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-[#1F2937] bg-black/40 flex items-center justify-center max-h-72">
                    <img 
                      src={proofBlobUrl} 
                      alt="Payment receipt proof" 
                      className="max-h-72 w-auto object-contain cursor-pointer"
                      onClick={() => viewProof(selectedOrder.proof_view_url!)}
                      title="Click to view full size"
                    />
                  </div>
                )}
                {!isProofLoading && proofBlobUrl && isProofPdf && (
                  <div className="mt-2 p-3 rounded-lg border border-[#1F2937] bg-black/20 flex items-center justify-between">
                    <span className="text-xs font-mono text-emerald-300">PDF document attached</span>
                    <button
                      type="button"
                      onClick={() => viewProof(selectedOrder.proof_view_url!)}
                      className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-mono"
                    >
                      Open PDF <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2 pt-1">
                  {selectedOrder.proof_view_url ? (
                    <button
                      type="button"
                      onClick={() => viewProof(selectedOrder.proof_view_url!)}
                      className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 font-mono"
                    >
                      Open in new tab <ExternalLink className="h-3 w-3" />
                    </button>
                  ) : (
                    <span className="text-[11px] text-gray-500 font-mono">No proof file was uploaded for this order.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="order-note" className="text-xs text-gray-300">
                Auditor Notes / Reason (Optional)
              </Label>
              <Textarea
                id="order-note"
                rows={2}
                placeholder="e.g. 100 USDT verified on blockchain block #892831. Challenge account provisioned."
                value={adminActionNote}
                onChange={(e) => setAdminActionNote(e.target.value)}
                className="text-xs bg-[#0B0F19] border-[#1F2937]"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#1F2937]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsProofModalOpen(false)}
              >
                Cancel
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleRejectPayment(selectedOrder.id)}
                  loading={isOrderActionLoading}
                  className="bg-red-600 hover:bg-red-500 text-white"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject Payment
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleApprovePayment(selectedOrder.id)}
                  loading={isOrderActionLoading}
                  className="shadow-emerald-500/20"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Approve & Provision Account
                </Button>
              </div>
            </div>

          </div>
        )}
      </Modal>

    </div>
  )
}
