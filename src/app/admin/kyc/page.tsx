'use client'

import * as React from 'react'
import { useState, useMemo } from 'react'
import { 
  UserCheck, ShieldAlert, ShieldCheck, Clock, Search, 
  CheckCircle2, XCircle, Eye, RefreshCw, FileText, Camera,
  AlertTriangle, Filter, ExternalLink, MapPin, Download,
  FileX, Lock, Shield, AlertCircle
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { apiUrl, getSession } from '@/lib/fxsim'
import type { KycSubmission } from '@/types/api'
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'
import { Input, Label } from '@/components/ui/input'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from 'sonner'

function KycDocViewer({ 
  kycId, 
  docPath, 
  tabName 
}: { 
  kycId: number
  docPath: string | null
  tabName: string 
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPdf, setIsPdf] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [rotate, setRotate] = useState(0)

  React.useEffect(() => {
    if (!docPath) {
      setBlobUrl(null)
      setError(null)
      setIsPdf(false)
      return
    }

    let isCancelled = false
    let currentUrl: string | null = null
    setLoading(true)
    setError(null)
    setZoom(1)
    setRotate(0)

    const fetchDoc = async () => {
      try {
        const session = getSession()
        const token = session.bearer || ''
        const baseDocUrl = docPath.startsWith('http') ? docPath : apiUrl(docPath)

        // SECURITY: the token travels in headers ONLY. Query-string tokens leak
        // into browser history, proxy/access logs and Referer headers (and the
        // backend rejects query tokens anyway).
        const headers: Record<string, string> = {}
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
          headers['X-FXSIM-Token'] = token
        }
        if (session.nonce) {
          headers['X-WP-Nonce'] = session.nonce
        }

        let res: Response | null = null
        try {
          // Primary: Direct backend fetch with auth headers
          res = await fetch(baseDocUrl, {
            headers,
            cache: 'no-store',
          })
        } catch {
          // Fallback: If browser blocked direct fetch, try same-origin proxy
          // (token forwarded via header — never the URL)
          const match = docPath.match(/\/admin\/kyc\/(\d+)\/doc\/([^/]+)/)
          if (match && token) {
            const [, kycId, docType] = match
            const proxyUrl = `/api/kyc-doc?id=${encodeURIComponent(kycId)}&type=${encodeURIComponent(docType)}`
            res = await fetch(proxyUrl, {
              cache: 'no-store',
              headers: { 'X-FXSIM-Token': token, 'Authorization': `Bearer ${token}` },
            })
          }
        }

        if (!res || !res.ok) {
          throw new Error(`Document fetch returned HTTP ${res?.status || 'Network Error'}`)
        }
        const contentType = res.headers.get('content-type') || ''
        const blob = await res.blob()
        if (isCancelled) return

        const url = URL.createObjectURL(blob)
        currentUrl = url
        setBlobUrl(url)
        setIsPdf(contentType.includes('pdf') || blob.type === 'application/pdf')
      } catch (err: any) {
        if (!isCancelled) {
          setError(err?.message || 'Could not load document')
        }
      } finally {
        if (!isCancelled) setLoading(false)
      }
    }

    fetchDoc()

    return () => {
      isCancelled = true
      if (currentUrl) URL.revokeObjectURL(currentUrl)
    }
  }, [docPath])

  if (!docPath) {
    return (
      <div className="text-center space-y-2 py-8 text-gray-500">
        <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <FileX className="h-6 w-6" />
        </div>
        <p className="text-xs font-bold text-gray-300 uppercase tracking-wider">
          {tabName === 'back' ? 'Optional Back ID: Not Uploaded' : `No Document Uploaded: ${tabName.toUpperCase()}`}
        </p>
        <p className="text-[11px] font-mono text-gray-500 max-w-sm mx-auto">
          {tabName === 'back' 
            ? 'Single-sided ID / Passport submitted. Back ID was not required or provided.' 
            : 'The trader has not submitted a file for this document category yet.'}
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-emerald-400">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="text-xs font-mono text-gray-400">Loading verified document...</span>
      </div>
    )
  }

  if (error || !blobUrl) {
    // Retry via the same-origin proxy (auth via header — no token in any URL).
    const retryViaProxy = () => {
      const session = getSession()
      const token = session.bearer || ''
      const match = docPath.match(/\/admin\/kyc\/(\d+)\/doc\/([^/]+)/)
      if (!match || !token) return
      const [, kycId, docType] = match
      fetch(`/api/kyc-doc?id=${encodeURIComponent(kycId)}&type=${encodeURIComponent(docType)}`, {
        cache: 'no-store',
        headers: { 'X-FXSIM-Token': token, 'Authorization': `Bearer ${token}` },
      })
        .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.blob() })
        .then((b) => { setBlobUrl(URL.createObjectURL(b)); setError(null) })
        .catch((e) => setError(e?.message || 'Proxy download failed'))
    }

    return (
      <div className="text-center space-y-2 py-8 text-red-400">
        <AlertTriangle className="h-8 w-8 mx-auto" />
        <p className="text-xs font-bold uppercase">Failed to load document preview</p>
        <p className="text-[11px] font-mono text-gray-400 max-w-sm mx-auto">{error || 'Unknown error'}</p>
        <Button
          size="sm"
          variant="outline"
          onClick={retryViaProxy}
          className="border-red-500/30 text-xs text-red-300 hover:bg-red-500/10 gap-1.5 mt-2"
        >
          <ExternalLink className="h-3 w-3" />
          Retry via secure proxy
        </Button>
      </div>
    )
  }

  if (isPdf) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
        <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
          <FileText className="h-8 w-8" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">PDF Document Attached</p>
          <p className="text-xs text-gray-400 font-mono mt-1">Official Proof of Address / Identity PDF</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            asChild 
            size="sm" 
            className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
          >
            <a href={blobUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              Open PDF in New Window
            </a>
          </Button>
          <Button 
            asChild 
            variant="outline" 
            size="sm" 
            className="border-gray-700 text-gray-300 gap-2"
          >
            <a href={blobUrl} download={`kyc_${kycId}_${tabName}.pdf`}>
              <Download className="h-4 w-4" />
              Download
            </a>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full min-h-[320px]">
      {/* Zoom / Rotate Toolbar */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-black/70 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 text-xs">
        <button 
          onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
          className="p-1 text-gray-300 hover:text-white rounded hover:bg-white/10"
          title="Zoom Out"
        >
          -
        </button>
        <span className="font-mono text-[10px] text-emerald-400 px-1">{Math.round(zoom * 100)}%</span>
        <button 
          onClick={() => setZoom(z => Math.min(3, z + 0.25))}
          className="p-1 text-gray-300 hover:text-white rounded hover:bg-white/10"
          title="Zoom In"
        >
          +
        </button>
        <div className="h-3 w-px bg-white/20 mx-1" />
        <button 
          onClick={() => setRotate(r => (r + 90) % 360)}
          className="p-1 text-gray-300 hover:text-white rounded hover:bg-white/10"
          title="Rotate 90°"
        >
          ↻
        </button>
        <button 
          onClick={() => { setZoom(1); setRotate(0) }}
          className="p-1 text-gray-300 hover:text-white rounded hover:bg-white/10"
          title="Reset"
        >
          Reset
        </button>
        <a 
          href={blobUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="p-1 text-gray-300 hover:text-white rounded hover:bg-white/10 ml-1"
          title="Full Resolution"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div className="w-full h-full flex items-center justify-center overflow-auto p-2">
        <img 
          src={blobUrl} 
          alt={tabName} 
          style={{ 
            transform: `scale(${zoom}) rotate(${rotate}deg)`,
            transition: 'transform 0.2s ease-in-out'
          }}
          className="max-h-[360px] max-w-full object-contain rounded-lg shadow-2xl select-none pointer-events-auto"
        />
      </div>
    </div>
  )
}

export default function KycHubPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Review Modal State
  const [selectedKyc, setSelectedKyc] = useState<KycSubmission | null>(null)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [activeDocTab, setActiveDocTab] = useState<'front' | 'back' | 'selfie' | 'address'>('front')
  const [rejectionNote, setRejectionNote] = useState('')
  const [allowForceOverride, setAllowForceOverride] = useState(false)
  const [isActionLoading, setIsActionLoading] = useState(false)

  // Fetch KYC Submissions
  const { data: kycData = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-kyc-list', statusFilter],
    queryFn: async () => {
      const res = await api.admin.kycList(statusFilter === 'all' ? undefined : statusFilter)
      if (res.ok && Array.isArray(res.data)) {
        return res.data
      }
      return []
    },
    staleTime: 5000,
  })

  // Review Mutation
  const reviewMutation = useMutation({
    mutationFn: async ({ id, action, note, force_override }: { id: number; action: 'approve' | 'reject'; note?: string; force_override?: boolean }) => {
      const res = await api.admin.kycReview(id, action, note, force_override)
      if (!res.ok) throw new Error(res.error || `Failed to ${action} KYC submission.`)
      return res.data
    },
    onSuccess: (_, variables) => {
      toast.success(`KYC submission ${variables.action === 'approve' ? 'approved & verified' : 'rejected'} successfully!`)
      setIsReviewModalOpen(false)
      setSelectedKyc(null)
      setRejectionNote('')
      setAllowForceOverride(false)
      queryClient.invalidateQueries({ queryKey: ['admin-kyc-list'] })
    },
    onError: (err: any) => {
      toast.error('KYC Review Error: ' + err.message)
    },
  })

  // Helper functions for document extraction (4 synchronized KYC files: Front ID, Back ID, Selfie, Address)
  const getDocUrl = (kyc: KycSubmission | null, tab: 'front' | 'back' | 'selfie' | 'address'): string | null => {
    if (!kyc) return null
    if (tab === 'front') return kyc.id_doc || kyc.docs?.id_doc || null
    if (tab === 'back') return kyc.id_doc_back || kyc.docs?.id_doc_back || null
    if (tab === 'selfie') return kyc.selfie || kyc.docs?.selfie || null
    if (tab === 'address') return kyc.address_doc || kyc.docs?.address_doc || null
    return null
  }

  const getDocCount = (kyc: KycSubmission): number => {
    let count = 0
    if (kyc.id_doc || kyc.docs?.id_doc) count++
    if (kyc.id_doc_back || kyc.docs?.id_doc_back) count++
    if (kyc.selfie || kyc.docs?.selfie) count++
    if (kyc.address_doc || kyc.docs?.address_doc) count++
    return count
  }

  const hasAnyDocuments = (kyc: KycSubmission | null): boolean => {
    if (!kyc) return false
    return getDocCount(kyc) > 0
  }

  const handleApprove = async (id: number) => {
    if (!selectedKyc) return
    const hasDocs = hasAnyDocuments(selectedKyc)
    
    if (!hasDocs && !allowForceOverride) {
      toast.error('Compliance Policy: Cannot verify trader without submitted identity documents.')
      return
    }

    setIsActionLoading(true)
    try {
      await reviewMutation.mutateAsync({ 
        id, 
        action: 'approve', 
        note: rejectionNote, 
        force_override: !hasDocs && allowForceOverride 
      })
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleReject = async (id: number) => {
    if (!rejectionNote.trim()) {
      toast.error('Please provide a reason for rejecting this KYC verification.')
      return
    }
    setIsActionLoading(true)
    try {
      await reviewMutation.mutateAsync({ id, action: 'reject', note: rejectionNote })
    } finally {
      setIsActionLoading(false)
    }
  }

  const handlePreFillMissingDocNotice = () => {
    setRejectionNote('Identity verification rejected: No government-issued ID or biometric selfie was uploaded. Please login to your portal and upload a high-resolution photo of your Passport/ID and live selfie.')
    toast.info('Rejection note pre-filled with document re-upload request.')
  }

  // Filtered dataset
  const filteredData = useMemo(() => {
    return kycData.filter((item) => {
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter
      const search = searchQuery.toLowerCase()
      const matchesSearch = 
        !searchQuery ||
        item.name?.toLowerCase().includes(search) ||
        item.email?.toLowerCase().includes(search) ||
        String(item.user_id).includes(search) ||
        String(item.id).includes(search)

      return matchesStatus && matchesSearch
    })
  }, [kycData, statusFilter, searchQuery])

  // Aggregate Metrics
  const counts = useMemo(() => {
    return {
      pending: kycData.filter(k => k.status === 'pending').length,
      approved: kycData.filter(k => k.status === 'approved').length,
      rejected: kycData.filter(k => k.status === 'rejected').length,
    }
  }, [kycData])

  const openReviewModal = (kyc: KycSubmission) => {
    setSelectedKyc(kyc)
    setActiveDocTab('front')
    setRejectionNote(kyc.admin_note || '')
    setAllowForceOverride(false)
    setIsReviewModalOpen(true)
  }

  const currentDocUrl = selectedKyc ? getDocUrl(selectedKyc, activeDocTab) : null
  const selectedHasDocs = selectedKyc ? hasAnyDocuments(selectedKyc) : false

  return (
    <div className="w-full space-y-8 pb-16">
      
      {/* ── Top Header Banner ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1F2937]/70 pb-6 w-full">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              KYC & Identity Verification Hub
            </h1>
            <Badge tone="accent" size="sm" pulsing className="font-mono">
              Compliance Desk
            </Badge>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Institutional Anti-Money Laundering (AML) and trader identity verification queue.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              refetch()
              toast.success('KYC queue refreshed')
            }}
            className="border-[#1F2937] text-gray-300 hover:text-white hover:bg-slate-800/80 gap-2 h-9"
          >
            <RefreshCw className="h-4 w-4 text-emerald-400" />
            Refresh Queue
          </Button>
        </div>
      </div>

      {/* ── Metric Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-[#111827] border-[#1F2937] p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pending Review</span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight font-mono">{counts.pending}</span>
            <span className="text-xs text-amber-400 font-medium">Awaiting Audit</span>
          </div>
        </Card>

        <Card className="bg-[#111827] border-[#1F2937] p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Verified Traders</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight font-mono">{counts.approved}</span>
            <span className="text-xs text-emerald-400 font-medium">Payout Eligible</span>
          </div>
        </Card>

        <Card className="bg-[#111827] border-[#1F2937] p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Rejected Documents</span>
            <div className="h-8 w-8 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight font-mono">{counts.rejected}</span>
            <span className="text-xs text-red-400 font-medium">Requires Re-upload</span>
          </div>
        </Card>
      </div>

      {/* ── Filters & Search Bar ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#111827] p-3 rounded-2xl border border-[#1F2937]">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search by trader name, email, or user ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#0B0F19] border border-[#1F2937] text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 font-medium"
          />
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 bg-[#0B0F19] p-1 rounded-xl border border-[#1F2937] shrink-0">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                statusFilter === tab
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab === 'all' ? 'All Queue' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── KYC Table ──────────────────────────────────────────────────────── */}
      <div className="bg-[#111827] border border-[#1F2937] rounded-2xl overflow-hidden shadow-xl">
        <DataTable
          data={filteredData}
          loading={isLoading}
          emptyMessage="No KYC submissions found matching criteria."
          columns={[
            {
              key: 'trader',
              header: 'Trader Profile',
              render: (k: KycSubmission) => (
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs">{k.name || k.username || 'Unnamed Trader'}</span>
                    <span className="font-mono text-[10px] text-emerald-400/90 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      ID #{k.user_id}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 font-mono truncate">{k.email}</p>
                </div>
              ),
            },
            {
              key: 'country',
              header: 'Country',
              render: (k: KycSubmission) => (
                <div className="flex items-center gap-1.5 text-xs text-gray-300 font-medium">
                  <MapPin className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                  <span>{k.country || 'Global'}</span>
                </div>
              ),
            },
            {
              key: 'docs_status',
              header: 'Documents',
              render: (k: KycSubmission) => {
                const count = getDocCount(k)
                if (count > 0) {
                  return (
                    <Badge tone="success" size="sm" className="font-mono gap-1">
                      <FileText className="h-3 w-3" />
                      {count} Attached
                    </Badge>
                  )
                }
                return (
                  <Badge tone="danger" size="sm" className="font-mono gap-1">
                    <FileX className="h-3 w-3" />
                    0 Uploaded
                  </Badge>
                )
              },
            },
            {
              key: 'status',
              header: 'Verification Status',
              render: (k: KycSubmission) => {
                if (k.status === 'approved') {
                  return <Badge tone="success" size="sm">Verified</Badge>
                }
                if (k.status === 'rejected') {
                  return <Badge tone="danger" size="sm">Rejected</Badge>
                }
                return <Badge tone="warning" size="sm">Pending Review</Badge>
              },
            },
            {
              key: 'submitted',
              header: 'Submitted Date',
              render: (k: KycSubmission) => (
                <span className="text-xs text-gray-400 font-mono">
                  {k.submitted_at ? new Date(k.submitted_at).toLocaleDateString() : 'Recent'}
                </span>
              ),
            },
            {
              key: 'actions',
              header: 'Actions',
              align: 'right',
              render: (k: KycSubmission) => (
                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openReviewModal(k)}
                    className="h-8 text-xs gap-1.5 border-[#1F2937] hover:bg-slate-800"
                  >
                    <Eye className="h-3.5 w-3.5 text-emerald-400" />
                    Review Documents
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* ── Document Inspection & Review Modal ─────────────────────────────── */}
      <Modal
        open={isReviewModalOpen}
        onOpenChange={setIsReviewModalOpen}
        title={
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-emerald-400" />
            <span>KYC Compliance Audit: {selectedKyc?.name || selectedKyc?.username}</span>
          </div>
        }
        description="Verify government-issued identity documents, biometric selfie, and proof of address."
        maxWidth="max-w-3xl"
      >
        {selectedKyc && (
          <div className="space-y-5 pt-2">
            
            {/* Compliance Warning if no documents uploaded */}
            {!selectedHasDocs && (
              <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-amber-300">Compliance Warning: No Identity Documents Uploaded</p>
                  <p className="text-gray-300 leading-relaxed">
                    This trader has not submitted any government ID or live selfie files. Standard verification is locked to protect AML compliance.
                  </p>
                </div>
              </div>
            )}

            {/* Trader Overview Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl border border-[#1F2937] bg-[#0B0F19] text-xs font-mono">
              <div>
                <span className="text-gray-500 block text-[10px] uppercase">Trader Name</span>
                <span className="font-bold text-white truncate block">{selectedKyc.name || selectedKyc.username}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px] uppercase">User ID</span>
                <span className="font-bold text-emerald-400">#{selectedKyc.user_id}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px] uppercase">Country</span>
                <span className="font-bold text-gray-200">{selectedKyc.country || 'Global'}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-[10px] uppercase">Attached Files</span>
                <span className={`font-bold ${getDocCount(selectedKyc) === 4 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {getDocCount(selectedKyc)} / 4 Uploaded {getDocCount(selectedKyc) === 4 ? '(Complete)' : ''}
                </span>
              </div>
            </div>

            {/* Document Navigation Tabs (4 Synchronized Files) */}
            <div className="flex items-center gap-2 border-b border-[#1F2937] pb-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveDocTab('front')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  activeDocTab === 'front'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <FileText className="h-3.5 w-3.5" /> 
                1. ID Front
                {getDocUrl(selectedKyc, 'front') ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveDocTab('back')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  activeDocTab === 'back'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <FileText className="h-3.5 w-3.5" /> 
                2. ID Back
                {getDocUrl(selectedKyc, 'back') ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveDocTab('selfie')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  activeDocTab === 'selfie'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Camera className="h-3.5 w-3.5" /> 
                3. Biometric Selfie
                {getDocUrl(selectedKyc, 'selfie') ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveDocTab('address')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  activeDocTab === 'address'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <MapPin className="h-3.5 w-3.5" /> 
                4. Proof of Address
                {getDocUrl(selectedKyc, 'address') ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                )}
              </button>
            </div>

            {/* Document Visualizer Canvas */}
            <div className="relative aspect-[16/9] w-full rounded-2xl border-2 border-[#1F2937] bg-[#0B0F19] overflow-hidden flex flex-col items-center justify-center p-4">
              <KycDocViewer 
                kycId={selectedKyc.id} 
                docPath={currentDocUrl} 
                tabName={activeDocTab} 
              />
            </div>

            {/* Rejection Note Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="kyc-reject-note" className="text-xs text-gray-300">
                  Compliance Audit Notes / Rejection Reason (Emailed to Trader if Rejected)
                </Label>
                {!selectedHasDocs && (
                  <button
                    type="button"
                    onClick={handlePreFillMissingDocNotice}
                    className="text-[11px] text-amber-400 hover:underline font-mono"
                  >
                    Auto-Fill Missing Doc Notice
                  </button>
                )}
              </div>
              <Textarea
                id="kyc-reject-note"
                rows={2}
                placeholder="e.g. Document image is blurry or expired. Please upload a clear photo of your valid Passport."
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                className="text-xs bg-[#0B0F19] border-[#1F2937]"
              />
            </div>

            {/* Administrative Force Override Checkbox (When no docs uploaded) */}
            {!selectedHasDocs && (
              <div className="p-3 rounded-xl border border-dashed border-[#1F2937] bg-[#0B0F19]">
                <label className="flex items-center gap-2 text-xs text-amber-300/90 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowForceOverride}
                    onChange={(e) => setAllowForceOverride(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-700 bg-slate-900 text-amber-500 focus:ring-amber-500"
                  />
                  <span>
                    <strong>Administrative Override:</strong> I confirm this trader was verified offline or out-of-band.
                  </span>
                </label>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-[#1F2937]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsReviewModalOpen(false)}
              >
                Cancel
              </Button>

              <div className="flex items-center gap-2.5">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleReject(selectedKyc.id)}
                  loading={isActionLoading}
                  className="bg-red-600 hover:bg-red-500 text-white gap-1.5"
                >
                  <XCircle className="h-4 w-4" />
                  Reject Verification
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleApprove(selectedKyc.id)}
                  loading={isActionLoading}
                  disabled={!selectedHasDocs && !allowForceOverride}
                  className={`gap-1.5 shadow-emerald-500/20 ${
                    !selectedHasDocs && !allowForceOverride
                      ? 'opacity-50 cursor-not-allowed bg-slate-800 border-slate-700 text-gray-500'
                      : allowForceOverride
                      ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500'
                      : ''
                  }`}
                >
                  {!selectedHasDocs && !allowForceOverride ? (
                    <>
                      <Lock className="h-4 w-4" />
                      Approval Locked (Missing Docs)
                    </>
                  ) : allowForceOverride ? (
                    <>
                      <Shield className="h-4 w-4" />
                      Force Approve (Override)
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Approve & Verify Trader
                    </>
                  )}
                </Button>
              </div>
            </div>

          </div>
        )}
      </Modal>

    </div>
  )
}
