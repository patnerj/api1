'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useKycQuery } from '@/hooks/useApi'
import { fmtDate } from '@/lib/format'
import type { KycStatus } from '@/types/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/ui/page-header'
import {
  ShieldCheck, IdCard, ScanFace, FileText, UploadCloud, X, CheckCircle2,
  Clock, AlertCircle, Loader2, FileCheck2, Lock, Wallet, Camera,
  Sparkles, Check, ArrowRight, ShieldAlert, FileX, Info, ExternalLink
} from 'lucide-react'

type DocKey = 'id_doc' | 'id_doc_back' | 'selfie' | 'address_doc'
interface DocSpec { 
  key: DocKey
  title: string
  subtitle: string
  hint: string
  icon: React.ComponentType<{ className?: string }> 
}

const DOCS: DocSpec[] = [
  { 
    key: 'id_doc',      
    title: 'Government ID (Front)',     
    subtitle: 'Passport photo page, National ID or Driver’s License (Front)',
    hint: 'Ensure all 4 corners and photo are clearly visible with no glare.', 
    icon: IdCard 
  },
  { 
    key: 'id_doc_back',      
    title: 'Government ID (Back)',     
    subtitle: 'National ID, Driver’s License (Back) or Passport Cover',
    hint: 'Ensure barcode, issue info, and signature line are clear.', 
    icon: IdCard 
  },
  { 
    key: 'selfie',      
    title: 'Biometric Facial Selfie', 
    subtitle: 'Live photo of your face holding ID',
    hint: 'Good lighting, facing camera directly, no sunglasses or headwear.',       
    icon: ScanFace 
  },
  { 
    key: 'address_doc', 
    title: 'Proof of Residence',  
    subtitle: 'Utility Bill or Bank Statement (< 3 months)',
    hint: 'Must show your full legal name and current residential address.',             
    icon: FileText 
  },
]

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,application/pdf'

function ModernStepper({ status }: { status: KycStatus }) {
  const step = status === 'approved' ? 3 : status === 'pending' ? 2 : 1
  const rejected = status === 'rejected'

  const steps = [
    { n: 1, label: 'Document Submission', desc: 'Upload verified identity files' },
    { n: 2, label: 'Compliance Audit', desc: 'Under institutional review' },
    { n: 3, label: 'Verified & Payout Ready', desc: 'Profit withdrawals unlocked' },
  ]

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {steps.map((s) => {
          const isDone = s.n < step
          const isCurrent = s.n === step
          const isRejectStep = rejected && s.n === 1

          return (
            <div
              key={s.n}
              className={`relative overflow-hidden rounded-xl border p-4 transition-all duration-300 ${
                isDone
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : isCurrent
                  ? isRejectStep
                    ? 'border-red-500/40 bg-red-500/5 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                    : 'border-cyan-500/40 bg-cyan-500/5 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                  : 'border-[#1F2937] bg-[#0B0F19]/60 opacity-60'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`h-9 w-9 rounded-lg flex items-center justify-center font-mono font-bold text-sm shrink-0 border transition-all ${
                    isDone
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : isCurrent
                      ? isRejectStep
                        ? 'bg-red-500/20 text-red-400 border-red-500/40'
                        : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                      : 'bg-[#111827] text-gray-400 border-[#1F2937]'
                  }`}
                >
                  {isDone ? (
                    <Check className="h-4 w-4 stroke-[3]" />
                  ) : isRejectStep ? (
                    <AlertCircle className="h-4 w-4 text-red-400" />
                  ) : (
                    `0${s.n}`
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                    <span>{s.label}</span>
                    {isDone && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 inline" />}
                    {isCurrent && !isRejectStep && (
                      <span className="inline-block h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                    )}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{s.desc}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ModernUploadTile({
  spec,
  file,
  preview,
  uploading,
  onPick,
  onClear,
}: {
  spec: DocSpec
  file: File | null
  preview: string | null
  uploading: boolean
  onPick: (f: File) => void
  onClear: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const Icon = spec.icon

  const handle = (f?: File | null) => {
    if (!f) return
    const mimeTypes = ACCEPTED_TYPES.split(',')
    if (!mimeTypes.includes(f.type)) {
      toast.error('Format not supported. Please upload JPG, PNG, WebP or PDF.')
      return
    }
    if (f.size > MAX_FILE_SIZE) {
      toast.error('File exceeds 5MB size limit.')
      return
    }
    onPick(f)
  }

  const isPdf = file?.type === 'application/pdf'

  return (
    <div
      className={`group rounded-2xl border transition-all duration-300 p-5 ${
        file
          ? 'border-emerald-500/40 bg-[#0B0F19] shadow-[0_0_20px_rgba(16,185,129,0.06)]'
          : drag
          ? 'border-cyan-500 bg-cyan-500/5 shadow-[0_0_25px_rgba(6,182,212,0.15)]'
          : 'border-[#1F2937] bg-[#0B0F19]/80 hover:border-gray-700'
      }`}
    >
      {/* Tile Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`h-10 w-10 rounded-xl flex items-center justify-center border shrink-0 transition-colors ${
              file
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800/80 text-cyan-400 border-[#1F2937]'
            }`}
          >
            {file ? <FileCheck2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              {spec.title}
              {file && (
                <Badge tone="success" size="sm" className="font-mono text-[10px]">
                  Uploaded
                </Badge>
              )}
            </div>
            <div className="text-xs text-gray-400">{spec.subtitle}</div>
          </div>
        </div>
      </div>

      {/* Upload Box / Preview Box */}
      {!file ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDrag(true)
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDrag(false)
            handle(e.dataTransfer.files?.[0])
          }}
          className={`w-full rounded-xl border border-dashed p-6 flex flex-col items-center justify-center gap-2.5 text-center transition-all ${
            drag
              ? 'border-cyan-400 bg-cyan-500/10 text-cyan-300'
              : 'border-[#1F2937] bg-[#111827]/40 hover:border-cyan-500/50 hover:bg-[#111827]/80 text-gray-400 hover:text-gray-200'
          }`}
        >
          <div className="h-10 w-10 rounded-full bg-slate-800/60 border border-[#1F2937] flex items-center justify-center text-gray-300 group-hover:scale-110 transition-transform">
            <UploadCloud className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-200">
              Click to upload <span className="text-gray-500 font-normal">or drag & drop</span>
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">{spec.hint}</p>
          </div>
          <span className="text-[10px] font-mono text-gray-500 bg-[#0B0F19] px-2.5 py-0.5 rounded border border-[#1F2937]">
            JPG, PNG, WebP, PDF · Max 5MB
          </span>
        </button>
      ) : (
        <div className="rounded-xl border border-[#1F2937] bg-[#111827]/70 p-3 flex items-center gap-3.5">
          <div className="h-16 w-16 rounded-lg overflow-hidden bg-[#0B0F19] shrink-0 border border-[#1F2937] flex items-center justify-center relative">
            {isPdf ? (
              <div className="text-center p-1">
                <FileText className="h-6 w-6 text-emerald-400 mx-auto" />
                <span className="text-[9px] font-bold text-gray-400 uppercase">PDF</span>
              </div>
            ) : preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="preview" className="h-full w-full object-cover" />
            ) : (
              <FileCheck2 className="h-6 w-6 text-emerald-400" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-white truncate">{file.name}</div>
            <div className="text-[11px] font-mono text-gray-400 mt-0.5">
              {(file.size / 1024 / 1024).toFixed(2)} MB · {file.type.split('/')[1]?.toUpperCase()}
            </div>
            {uploading ? (
              <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full w-2/3 rounded-full bg-cyan-400 animate-pulse" />
              </div>
            ) : (
              <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                <CheckCircle2 className="h-3 w-3" /> Ready for submission
              </div>
            )}
          </div>

          {!uploading && (
            <button
              onClick={onClear}
              className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-[#1F2937] bg-[#0B0F19] text-gray-400 hover:text-red-400 hover:border-red-500/30 transition-colors shrink-0"
              aria-label="Remove file"
              title="Remove and replace file"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0])}
      />
    </div>
  )
}

export default function KycPage() {
  const { data: kyc, isPending, refetch } = useKycQuery()
  const loading = isPending && !kyc

  const [docType, setDocType] = useState<'national_id' | 'passport' | 'drivers_license'>('national_id')
  const [country, setCountry] = useState('United States')

  const [files, setFiles] = useState<Record<DocKey, File | null>>({
    id_doc: null,
    id_doc_back: null,
    selfie: null,
    address_doc: null,
  })
  const [previews, setPreviews] = useState<Record<DocKey, string | null>>({
    id_doc: null,
    id_doc_back: null,
    selfie: null,
    address_doc: null,
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => () => {
    Object.values(previews).forEach((u) => u && URL.revokeObjectURL(u))
  }, [previews])

  const pick = (key: DocKey, f: File) => {
    setFiles((p) => ({ ...p, [key]: f }))
    setPreviews((p) => {
      if (p[key]) URL.revokeObjectURL(p[key]!)
      return { ...p, [key]: f.type.startsWith('image/') ? URL.createObjectURL(f) : null }
    })
  }

  const clear = (key: DocKey) => {
    setPreviews((p) => {
      if (p[key]) URL.revokeObjectURL(p[key]!)
      return { ...p, [key]: null }
    })
    setFiles((p) => ({ ...p, [key]: null }))
  }

  const uploadedCount = Object.values(files).filter(Boolean).length
  const allReady = !!(files.id_doc && files.id_doc_back && files.selfie && files.address_doc) && country.trim().length > 0

  const submit = async () => {
    if (!country.trim()) {
      toast.error('Please enter the country of issuance for your identity document.')
      return
    }
    if (!allReady) {
      toast.error('Please select all 4 required identity documents.')
      return
    }
    setSubmitting(true)
    const form = new FormData()
    form.append('doc_type', docType)
    form.append('country', country.trim())
    form.append('id_doc', files.id_doc!)
    form.append('id_doc_back', files.id_doc_back!)
    form.append('selfie', files.selfie!)
    form.append('address_doc', files.address_doc!)
    const res = await api.kycSubmit(form)
    setSubmitting(false)
    if (res.ok && res.data.success) {
      toast.success('KYC documents submitted successfully for compliance review!')
      setFiles({ id_doc: null, id_doc_back: null, selfie: null, address_doc: null })
      setPreviews({ id_doc: null, id_doc_back: null, selfie: null, address_doc: null })
      refetch()
    } else {
      toast.error(res.ok ? res.data.message || 'Submission failed' : res.error)
    }
  }

  const status = kyc?.status ?? 'not_started'
  const showForm = status === 'not_started' || status === 'rejected'

  return (
    <div className="w-full space-y-8 pb-16">
      <PageHeader
        variant="hero"
        title="Identity KYC Verification"
        description="Verify your identity with our compliance desk to unlock instant payouts on funded accounts."
        icon={ShieldCheck}
        badge={{ label: 'AML Compliance', tone: 'accent' }}
      />

      <div className="max-w-6xl mx-auto w-full space-y-6">
        {loading ? (
          <Card className="border-[#1F2937] bg-[#111827]">
            <CardContent className="p-8">
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Status Progress Stepper */}
            <ModernStepper status={status} />

            {/* Approved State Banner */}
            {status === 'approved' && (
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
                <Card className="border-emerald-500/40 bg-emerald-950/20 backdrop-blur-sm overflow-hidden relative">
                  <div className="absolute top-0 right-0 h-40 w-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                  <CardContent className="p-8 text-center max-w-xl mx-auto space-y-4">
                    <div className="h-16 w-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 inline-flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                      <ShieldCheck className="h-8 w-8 stroke-[2.5]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Identity Fully Verified</h2>
                      <p className="text-sm text-gray-300 mt-1 leading-relaxed">
                        Your compliance audit has been approved by the risk desk. You have full access to
                        instant profit splits and bank/crypto payouts.
                      </p>
                    </div>
                    {kyc?.reviewed_at && (
                      <div className="inline-block font-mono text-xs text-emerald-400/90 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                        Verified on {fmtDate(kyc.reviewed_at, true)}
                      </div>
                    )}
                    <div className="pt-2">
                      <Button asChild size="md" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 shadow-lg shadow-emerald-500/20">
                        <a href="/dashboard/payouts">
                          <Wallet className="h-4 w-4" />
                          Proceed to Payouts Hub
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Under Review Pending State Banner */}
            {status === 'pending' && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-amber-500/40 bg-amber-950/10 backdrop-blur-sm overflow-hidden">
                  <CardContent className="p-6 sm:p-8 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-500/20 pb-5">
                      <div className="flex items-start gap-3.5">
                        <div className="h-12 w-12 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                          <Clock className="h-6 w-6 animate-pulse" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2.5">
                            <h2 className="text-lg font-bold text-white">Under Compliance Review</h2>
                            <Badge tone="warning" size="sm" pulsing>
                              In Queue
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-300 mt-1">
                            Your 4 verified documents (Front ID, Back ID, Selfie, Proof of Address) are currently with our compliance officer. Expected turnaround: 1–2 business days.
                          </p>
                        </div>
                      </div>

                      {kyc?.submitted_at && (
                        <div className="text-right font-mono text-xs text-gray-400 bg-[#0B0F19] px-3 py-1.5 rounded-lg border border-[#1F2937] shrink-0">
                          Submitted: <span className="text-gray-200">{fmtDate(kyc.submitted_at, true)}</span>
                        </div>
                      )}
                    </div>

                    {/* Received Documents Grid */}
                    <div>
                      {(() => {
                        const isDocUploaded = (k: DocKey) => {
                          return !!kyc?.docs?.[k];
                        };
                        const uploadedCount = DOCS.filter(d => isDocUploaded(d.key)).length;

                        return (
                          <>
                            <span className="text-xs uppercase tracking-wider text-gray-400 font-mono block mb-3 font-semibold">
                              Received & Audited Files ({uploadedCount} of {DOCS.length})
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                              {DOCS.map((d) => {
                                const uploaded = isDocUploaded(d.key);
                                return (
                                  <div
                                    key={d.key}
                                    className={`rounded-xl border p-3.5 flex items-center gap-3 ${
                                      uploaded 
                                        ? 'border-emerald-500/30 bg-[#0B0F19]' 
                                        : 'border-border/40 bg-surface-muted/30 opacity-70'
                                    }`}
                                  >
                                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                                      uploaded ? 'bg-emerald-500/10 text-emerald-400' : 'bg-surface-muted text-text-muted'
                                    }`}>
                                      {uploaded ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-gray-200 truncate">{d.title}</p>
                                      <p className={`text-[11px] font-mono ${uploaded ? 'text-emerald-400' : 'text-text-muted'}`}>
                                        {uploaded ? 'Securely Encrypted' : 'Pending Upload'}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Rejection State Banner */}
            {status === 'rejected' && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
                <div className="rounded-2xl border border-red-500/40 bg-red-950/20 p-5 backdrop-blur-sm space-y-2.5">
                  <div className="flex items-center gap-2.5 text-red-400">
                    <ShieldAlert className="h-5 w-5 shrink-0" />
                    <h3 className="font-bold text-sm text-white">Previous KYC Submission Needs Attention</h3>
                  </div>
                  <div className="bg-[#0B0F19] p-3.5 rounded-xl border border-red-500/30 text-xs font-mono text-gray-200 leading-relaxed">
                    <strong className="text-red-400">Compliance Reason: </strong>
                    {kyc?.admin_note || 'One or more documents were blurry, cropped, or expired. Please upload fresh copies below.'}
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Please review the guidance in each upload section below and submit high-resolution documents to clear verification.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Submission Form Grid */}
            {showForm && (
              <div className="grid lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Side: 4 Document Upload Slots in 2x2 Grid */}
                <div className="lg:col-span-7 space-y-4">
                  
                  {/* Doc Type & Country Selectors */}
                  <div className="grid sm:grid-cols-2 gap-3 p-4 rounded-xl border border-[#1F2937] bg-[#111827]">
                    <div>
                      <label className="text-xs font-semibold text-gray-300 block mb-1.5">Document Type</label>
                      <select 
                        value={docType} 
                        onChange={(e) => setDocType(e.target.value as any)}
                        className="w-full h-9 rounded-lg bg-[#0B0F19] border border-[#1F2937] px-3 text-xs text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="national_id">National ID Card</option>
                        <option value="passport">Passport</option>
                        <option value="drivers_license">Driver’s License</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                        Country of Issuance <span className="text-rose-400">*</span>
                      </label>
                      <input 
                        type="text" 
                        value={country} 
                        onChange={(e) => setCountry(e.target.value)}
                        placeholder="e.g. United States, United Kingdom"
                        required
                        className="w-full h-9 rounded-lg bg-[#0B0F19] border border-[#1F2937] px-3 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400 font-mono">
                      Required Identity Documents (4)
                    </span>
                    <span className="text-xs font-mono text-cyan-400">
                      {uploadedCount} of 4 Files Selected
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {DOCS.map((d) => (
                      <ModernUploadTile
                        key={d.key}
                        spec={d}
                        file={files[d.key]}
                        preview={previews[d.key]}
                        uploading={submitting}
                        onPick={(f) => pick(d.key, f)}
                        onClear={() => clear(d.key)}
                      />
                    ))}
                  </div>

                  {/* Submit Action Card */}
                  <Card className="border-[#1F2937] bg-[#111827]">
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Lock className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>AES-256 encrypted, visible only to certified compliance officers.</span>
                      </div>
                      <Button
                        onClick={submit}
                        disabled={!allReady || submitting}
                        className={`font-bold shrink-0 w-full sm:w-auto gap-2 transition-all ${
                          allReady
                            ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                            : 'opacity-50 cursor-not-allowed'
                        }`}
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            Submitting Documents…
                          </>
                        ) : (
                          <>
                            Submit for Verification
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Side: Trust & Guidelines Card */}
                <div className="lg:col-span-5 space-y-4">
                  <Card className="border-[#1F2937] bg-[#111827]">
                    <CardHeader className="border-b border-[#1F2937] pb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center shrink-0">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base text-white">Why Identity Verification?</CardTitle>
                          <CardDescription className="text-xs text-gray-400">
                            Regulatory and payout security compliance
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 space-y-4 text-xs leading-relaxed text-gray-300">
                      <p>
                        As an institutional prop firm, we verify every funded trader&apos;s identity prior to releasing
                        profit withdrawals. This guarantees that capital rewards reach legitimate traders and fulfills
                        global Anti-Money Laundering (AML) standards.
                      </p>

                      <div className="space-y-2.5 pt-2">
                        <div className="flex items-start gap-3 p-3 rounded-xl border border-[#1F2937] bg-[#0B0F19]">
                          <Wallet className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-white">Unlocks Payouts</p>
                            <p className="text-gray-400 text-[11px] mt-0.5">
                              Required only once before your first funded payout request.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 rounded-xl border border-[#1F2937] bg-[#0B0F19]">
                          <Lock className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-white">Bank-Grade Privacy</p>
                            <p className="text-gray-400 text-[11px] mt-0.5">
                              Documents are never shared or sold; stored behind private access controls.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 rounded-xl border border-[#1F2937] bg-[#0B0F19]">
                          <Clock className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-white">Fast 24–48h Turnaround</p>
                            <p className="text-gray-400 text-[11px] mt-0.5">
                              Audited within 1–2 business days by our dedicated risk team.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Checklist Box */}
                      <div className="p-4 rounded-xl border border-[#1F2937] bg-[#0B0F19] space-y-2 mt-4">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400 font-bold block">
                          Checklist Before Upload
                        </span>
                        <ul className="space-y-1.5 text-[11px] text-gray-300">
                          <li className="flex items-center gap-2">
                            <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            All 4 corners of Government ID visible
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            Document is not expired and has high resolution
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            Proof of address is dated within last 90 days
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            Selfie photo is well-lit without glare or hats
                          </li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </div>

              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
