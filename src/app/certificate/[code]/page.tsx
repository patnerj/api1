'use client'

import { use, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { Certificate as Cert } from '@/types/api'
import { CertificateDocument } from '@/components/certificate-document'
import { Button } from '@/components/ui/button'
import { Download, Link as LinkIcon, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { downloadCertificatePdf } from '@/lib/certificate-pdf'

export default function PublicCertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const [cert, setCert] = useState<Cert | null | undefined>(undefined)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    let cancel = false
    api.certificatePublic(code).then((res) => {
      if (cancel) return
      setCert(res.ok ? res.data : null)
    })
    return () => { cancel = true }
  }, [code])

  if (cert === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg text-text-muted">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading certificate…
      </div>
    )
  }

  if (cert === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg text-center px-6">
        <AlertCircle className="h-8 w-8 text-danger mb-3" />
        <h1 className="text-lg font-semibold">Certificate not found</h1>
        <p className="text-sm text-text-muted mt-1">This certificate link is invalid or has expired.</p>
      </div>
    )
  }

  const copyLink = () => {
    try { navigator.clipboard.writeText(window.location.href); toast.success('Link copied') } catch { /* no clipboard */ }
  }

  const download = async () => {
    if (!cert) return
    setDownloading(true)
    try { await downloadCertificatePdf(cert) }
    catch { toast.error('Could not generate the PDF. Please try again.') }
    finally { setDownloading(false) }
  }

  return (
    <div className="min-h-screen bg-bg py-8 px-4 print:bg-white print:p-0">
      {/* Action bar — hidden when printing */}
      <div className="max-w-3xl mx-auto mb-5 flex items-center justify-end gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={copyLink}><LinkIcon className="h-4 w-4" /> Copy link</Button>
        <Button size="sm" onClick={download} loading={downloading}><Download className="h-4 w-4" /> Download Certificate</Button>
      </div>

      {/* The certificate is the only printable content on this route */}
      <div className="max-w-3xl mx-auto print:max-w-none">
        <div className="rounded-xl overflow-hidden border border-border-subtle print:border-0 print:rounded-none">
          <CertificateDocument cert={cert} />
        </div>
      </div>
    </div>
  )
}
