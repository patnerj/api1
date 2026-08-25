/**
 * Format helpers used by every page. wpdb often serialises DECIMAL columns
 * as strings, so toNum() is the canonical coercer.
 */

export const toNum = (v: unknown): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  if (typeof v === 'string') {
    const n = parseFloat(v)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

/**
 * Sanitize free-typed numeric input.
 *  • strips anything that isn't a digit or a dot
 *  • collapses to a SINGLE decimal point (keeps the first)
 *  • optionally truncates the fractional part to `maxDecimals`
 *  • trims redundant leading zeros ("00.5" → "0.5", "007" → "7")
 * Never returns NaN-producing garbage like "1.2.3".
 */
export const sanitizeDecimal = (v: string, maxDecimals?: number): string => {
  // keep only digits and dots
  let s = v.replace(/[^\d.]/g, '')
  // collapse to a single dot (keep the first)
  const firstDot = s.indexOf('.')
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '')
  }
  // split into integer / fraction
  let [intPart, fracPart = ''] = s.split('.')
  const hasDot = s.includes('.')
  // trim leading zeros on the integer part, but keep a single leading zero
  intPart = intPart.replace(/^0+(?=\d)/, '')
  if (intPart === '' && (hasDot || s !== '')) intPart = s === '' ? '' : '0'
  // truncate fraction
  if (maxDecimals !== undefined && fracPart.length > maxDecimals) {
    fracPart = fracPart.slice(0, maxDecimals)
  }
  return hasDot ? `${intPart}.${fracPart}` : intPart
}

export const fmtUSD = (v: unknown, opts: { sign?: boolean; decimals?: number } = {}) => {
  const n = toNum(v)
  const d = opts.decimals ?? 2
  const abs = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
  if (opts.sign) {
    if (n > 0) return `+$${abs}`
    if (n < 0) return `-$${abs}`
    return `$${abs}`
  }
  return n < 0 ? `-$${abs}` : `$${abs}`
}

export const fmtPct = (v: unknown, decimals = 2, sign = false) => {
  const n = toNum(v)
  const fixed = n.toFixed(decimals)
  if (sign && n > 0) return `+${fixed}%`
  return `${fixed}%`
}

export const fmtNum = (v: unknown, decimals = 0) =>
  toNum(v).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

export const fmtPrice = (v: unknown, digits = 5) => toNum(v).toFixed(digits)

export const fmtLots = (v: unknown) => toNum(v).toFixed(2)

export const pnlClass = (v: unknown) => {
  const n = toNum(v)
  if (n > 0) return 'text-success'
  if (n < 0) return 'text-danger'
  return 'text-text-muted'
}

/** Relative time — small, human, no extra dep */
export const timeAgo = (iso: string | number): string => {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return String(iso)
  
  let s = Math.floor((Date.now() - then) / 1000)
  if (s < 0) {
    if (s < -60) return fmtDate(String(iso), true) // Fix MT5 timezone drift where server time is 'in the future' relative to local browser
    s = 0 
  }

  if (s < 60)     return `${s}s ago`
  if (s < 3600)   return `${Math.floor(s / 60)}m ago`
  if (s < 86400)  return `${Math.floor(s / 3600)}h ago`
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export const fmtDate = (iso: string, withTime = false) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return iso
  if (withTime) {
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Used by certificate display & funded-trader status */
export const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    active: 'In Evaluation', passed: 'Passed', failed: 'Failed',
    funded: 'Funded', suspended: 'Suspended', breached: 'Breached',
  }
  return map[status] ?? status
}

export const statusTone = (status: string): 'success' | 'danger' | 'warn' | 'info' | 'neutral' => {
  const map: Record<string, 'success' | 'danger' | 'warn' | 'info' | 'neutral'> = {
    active: 'info', passed: 'success', funded: 'success',
    failed: 'danger', breached: 'danger', suspended: 'warn',
    pending: 'warn', submitted: 'warn', approved: 'success', rejected: 'danger',
  }
  return map[status] ?? 'neutral'
}
