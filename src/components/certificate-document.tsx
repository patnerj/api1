'use client'

import { fmtUSD, fmtDate, toNum } from '@/lib/format'
import type { Certificate as Cert, PayoutItem } from '@/types/api'
import { Award, Sparkles } from 'lucide-react'

/**
 * The certificate visual itself — no Card wrapper, no buttons, no chrome.
 * Rendered both inside the dashboard preview card and on the standalone
 * /certificate/[code] page (where it is the only thing on screen / printed).
 */
export function CertificateDocument({ cert }: { cert: Cert }) {
  const c = cert
  const funded = (c.status ?? '') === 'funded'
  const kind = funded ? 'Funded Trader' : 'Evaluation Pass'
  const year = (() => { const d = new Date(c.issued_date); return isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear() })()
  const verificationId = `PFL-${year}-${String(c.challenge_id).padStart(6, '0')}`

  return (
    <div className="relative bg-gradient-to-br from-bg-subtle to-surface p-1">
      <div className="absolute inset-0 bg-aurora opacity-25 pointer-events-none print:hidden" />
      <div className="relative m-2 border border-accent/30 rounded-lg">
        <div className="m-1.5 border border-border-subtle rounded-md px-6 py-7 sm:px-8 sm:py-9">
          {/* Header: seal + brand */}
          <div className="flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-warn via-accent to-success flex items-center justify-center text-white shadow-glow ring-2 ring-white/10">
              <Award className="h-7 w-7" />
            </div>
            <div className="mt-3 text-2xs uppercase tracking-[0.25em] text-text-muted">{c.brand}</div>
            <h2 className="mt-2 font-serif text-2xl sm:text-3xl tracking-tight">Certificate of Achievement</h2>
            <div className="mt-1 inline-flex items-center gap-1.5 text-2xs uppercase tracking-wider text-accent">
              <Sparkles className="h-3 w-3" /> {kind}
            </div>
          </div>

          {/* Recipient */}
          <div className="mt-7 text-center">
            <div className="text-2xs uppercase tracking-wider text-text-muted">This certifies that</div>
            <div className="mt-1 font-serif text-3xl sm:text-4xl font-semibold tracking-tight">{c.trader_name}</div>
            <div className="mx-auto mt-2 h-px w-40 bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
            <p className="mt-3 text-sm text-text-muted max-w-md mx-auto leading-relaxed">
              has successfully {funded ? 'qualified as a funded trader on' : 'passed the evaluation for'}{' '}
              the <span className="text-text font-medium">{c.plan_name}</span> program.
            </p>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-2 gap-4 max-w-sm mx-auto text-center">
            <div>
              <div className="text-2xs uppercase tracking-wider text-text-faint">Account size</div>
              <div className="font-semibold tabular mt-0.5">{fmtUSD(c.account_size, { decimals: 0 })}</div>
            </div>
            <div>
              <div className="text-2xs uppercase tracking-wider text-text-faint">Profit split</div>
              <div className="font-semibold tabular mt-0.5">{toNum(c.profit_split)}%</div>
            </div>
          </div>

          {/* Footer: signature + verification */}
          <div className="mt-8 flex items-end justify-between gap-4">
            <div className="text-left">
              <div className="font-serif italic text-lg text-text leading-none">{c.brand}</div>
              <div className="mt-1 h-px w-32 bg-border" />
              <div className="text-2xs text-text-muted mt-1">Authorized Signature</div>
            </div>
            <div className="text-right">
              <div className="text-2xs uppercase tracking-wider text-text-faint">Issued</div>
              <div className="text-sm font-medium">{fmtDate(c.issued_date)}</div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-border-subtle/60 text-2xs text-text-faint">
            Verification ID: <span className="tabular text-text-muted">{verificationId}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function PayoutCertificateDocument({ payout, planName }: { payout: PayoutItem, planName?: string }) {
  const brand = 'LaunchAPropFirm'
  const trader = payout.name || payout.username || 'Funded Trader'
  const splitPct = payout.profit_split_pct || 80
  const issued = payout.processed_at || payout.requested_at || new Date().toISOString()
  
  const year = (() => { const d = new Date(issued); return isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear() })()
  const verificationId = `PAY-${year}-${String(payout.id).padStart(6, '0')}`

  return (
    <div className="relative bg-gradient-to-br from-bg-subtle to-surface p-1">
      <div className="absolute inset-0 bg-aurora opacity-25 pointer-events-none print:hidden" />
      <div className="relative m-2 border border-success/30 rounded-lg">
        <div className="m-1.5 border border-border-subtle rounded-md px-6 py-7 sm:px-8 sm:py-9">
          {/* Header: seal + brand */}
          <div className="flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-success via-emerald-600 to-green-700 flex items-center justify-center text-white shadow-glow ring-2 ring-white/10">
              <Award className="h-7 w-7" />
            </div>
            <div className="mt-3 text-2xs uppercase tracking-[0.25em] text-text-muted">{brand}</div>
            <h2 className="mt-2 font-serif text-2xl sm:text-3xl tracking-tight">Certificate of Payout</h2>
            <div className="mt-1 inline-flex items-center gap-1.5 text-2xs uppercase tracking-wider text-success">
              <Sparkles className="h-3 w-3" /> Profit Split
            </div>
          </div>

          {/* Recipient */}
          <div className="mt-7 text-center">
            <div className="text-2xs uppercase tracking-wider text-text-muted">Proudly presented to</div>
            <div className="mt-1 font-serif text-3xl sm:text-4xl font-semibold tracking-tight">{trader}</div>
            <div className="mx-auto mt-2 h-px w-40 bg-gradient-to-r from-transparent via-success/40 to-transparent" />
            <p className="mt-3 text-sm text-text-muted max-w-md mx-auto leading-relaxed">
              for successfully withdrawing profits {planName && <>from their <span className="text-text font-medium">{planName}</span> funded account.</>}
            </p>
          </div>

          {/* Stats */}
          <div className="mt-6 text-center">
            <div className="text-2xs uppercase tracking-wider text-text-faint">Payout Amount</div>
            <div className="font-serif text-4xl sm:text-5xl font-semibold tracking-tight text-success mt-1">{fmtUSD(payout.trader_amount, { decimals: 0 })}</div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 max-w-sm mx-auto text-center">
            <div>
              <div className="text-2xs uppercase tracking-wider text-text-faint">Profit split</div>
              <div className="font-semibold tabular mt-0.5">{splitPct}%</div>
            </div>
            <div>
              <div className="text-2xs uppercase tracking-wider text-text-faint">Method</div>
              <div className="font-semibold tabular mt-0.5 uppercase">{(payout.payment_method || 'Payout')}</div>
            </div>
          </div>

          {/* Footer: signature + verification */}
          <div className="mt-8 flex items-end justify-between gap-4">
            <div className="text-left">
              <div className="font-serif italic text-lg text-text leading-none">{brand}</div>
              <div className="mt-1 h-px w-32 bg-border" />
              <div className="text-2xs text-text-muted mt-1">Authorized Signature</div>
            </div>
            <div className="text-right">
              <div className="text-2xs uppercase tracking-wider text-text-faint">Issued</div>
              <div className="text-sm font-medium">{fmtDate(issued)}</div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-border-subtle/60 text-2xs text-text-faint">
            Verification ID: <span className="tabular text-text-muted">{verificationId}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
