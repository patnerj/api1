import type { PayoutItem } from '@/types/api'

/** Slugify a value for a clean, filesystem-safe filename. */
function slug(s: string): string {
  return (s || '')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'Payout'
}

function money(v: number | string): string {
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, ''))
  if (!isFinite(n)) return String(v)
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

/** Escape user-provided strings for safe embedding in SVG markup. */
function esc(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

/**
 * Generates a beautiful Payout Certificate as an A4 PDF.
 */
export async function downloadPayoutCertificatePdf(
  payout: PayoutItem, 
  options: { brand?: string; planName?: string } = {}
): Promise<void> {
  const year = (() => { const d = new Date(payout.processed_at || payout.requested_at || Date.now()); return isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear() })()
  const verificationId = `PAY-${year}-${String(payout.id).padStart(6, '0')}`
  
  const brand = esc(options.brand || 'PropFirm')
  const trader = esc(payout.name || payout.username || 'Funded Trader')
  const plan = options.planName ? esc(options.planName) : ''
  const issued = esc(payout.processed_at ? new Date(payout.processed_at).toLocaleDateString() : new Date().toLocaleDateString())
  const payoutStr = esc(money(payout.trader_amount))
  const splitPct = payout.profit_split_pct ? `${payout.profit_split_pct}%` : '80%'
  const method = esc((payout.payment_method || 'Payout').toUpperCase())

  // A4 portrait at ~150 px/inch in the SVG coordinate space; rasterized at 2×.
  const W = 1240, H = 1754
  const serif = "Georgia, 'Times New Roman', serif"
  const sans = "Arial, Helvetica, sans-serif"

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="frame" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#7c6ef5"/><stop offset="100%" stop-color="#10b981"/>
    </linearGradient>
    <linearGradient id="seal" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#10b981"/><stop offset="50%" stop-color="#059669"/><stop offset="100%" stop-color="#047857"/>
    </linearGradient>
    <linearGradient id="divider" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#10b981" stop-opacity="0"/>
      <stop offset="50%" stop-color="#34d399" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="aur1" cx="0.22" cy="0.16" r="0.55">
      <stop offset="0%" stop-color="#7c6ef5" stop-opacity="0.18"/><stop offset="100%" stop-color="#7c6ef5" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="aur2" cx="0.82" cy="0.85" r="0.6">
      <stop offset="0%" stop-color="#10b981" stop-opacity="0.18"/><stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="aur3" cx="0.85" cy="0.12" r="0.45">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.10"/><stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Background: deep navy + aurora washes (matches the on-screen bg) -->
  <rect width="${W}" height="${H}" fill="#0b1220"/>
  <rect width="${W}" height="${H}" fill="url(#aur1)"/>
  <rect width="${W}" height="${H}" fill="url(#aur2)"/>
  <rect width="${W}" height="${H}" fill="url(#aur3)"/>

  <!-- Double frame: gradient outer, subtle inner -->
  <rect x="64" y="64" width="${W - 128}" height="${H - 128}" rx="22" fill="none" stroke="url(#frame)" stroke-width="3" stroke-opacity="0.65"/>
  <rect x="84" y="84" width="${W - 168}" height="${H - 168}" rx="16" fill="none" stroke="#2a3850" stroke-width="2"/>

  <!-- Seal -->
  <circle cx="${W / 2}" cy="300" r="64" fill="url(#seal)"/>
  <circle cx="${W / 2}" cy="300" r="64" fill="none" stroke="#ffffff" stroke-opacity="0.25" stroke-width="4"/>
  <path d="M ${W / 2 - 20} 300 L ${W / 2 - 5} 315 L ${W / 2 + 20} 285"
        stroke="#ffffff" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- Brand -->
  <text x="${W / 2}" y="428" text-anchor="middle" font-family="${sans}" font-size="26" letter-spacing="10" fill="#8ba4c0">${brand.toUpperCase()}</text>

  <!-- Title -->
  <text x="${W / 2}" y="512" text-anchor="middle" font-family="${serif}" font-size="72" fill="#e8eef7">Certificate of Payout</text>

  <!-- Kind badge -->
  <text x="${W / 2}" y="566" text-anchor="middle" font-family="${sans}" font-size="24" letter-spacing="6" fill="#10b981">✦  PROFIT SPLIT  ✦</text>

  <!-- Recipient -->
  <text x="${W / 2}" y="700" text-anchor="middle" font-family="${sans}" font-size="24" letter-spacing="4" fill="#8ba4c0">PROUDLY PRESENTED TO</text>
  <text x="${W / 2}" y="788" text-anchor="middle" font-family="${serif}" font-size="84" font-weight="bold" fill="#ffffff">${trader}</text>
  <rect x="${W / 2 - 160}" y="822" width="320" height="3" fill="url(#divider)"/>

  <!-- Description -->
  <text x="${W / 2}" y="896" text-anchor="middle" font-family="${sans}" font-size="28" fill="#8ba4c0">for successfully withdrawing profits</text>
  ${plan ? `<text x="${W / 2}" y="940" text-anchor="middle" font-family="${sans}" font-size="28" fill="#8ba4c0">from their <tspan fill="#e8eef7" font-weight="bold">${plan}</tspan> funded account.</text>` : ''}

  <!-- Stats -->
  <text x="${W / 2}" y="1060" text-anchor="middle" font-family="${sans}" font-size="22" letter-spacing="4" fill="#5b7392">PAYOUT AMOUNT</text>
  <text x="${W / 2}" y="1132" text-anchor="middle" font-family="${serif}" font-size="72" font-weight="bold" fill="#10b981">${payoutStr}</text>

  <text x="${W / 2 - 200}" y="1220" text-anchor="middle" font-family="${sans}" font-size="18" letter-spacing="2" fill="#5b7392">PROFIT SPLIT</text>
  <text x="${W / 2 - 200}" y="1256" text-anchor="middle" font-family="${sans}" font-size="32" font-weight="bold" fill="#e8eef7">${splitPct}</text>
  
  <text x="${W / 2 + 200}" y="1220" text-anchor="middle" font-family="${sans}" font-size="18" letter-spacing="2" fill="#5b7392">METHOD</text>
  <text x="${W / 2 + 200}" y="1256" text-anchor="middle" font-family="${sans}" font-size="32" font-weight="bold" fill="#e8eef7">${method}</text>

  <!-- Signature + issued -->
  <text x="170" y="1430" font-family="${serif}" font-size="42" font-style="italic" fill="#e8eef7">${brand}</text>
  <rect x="170" y="1452" width="300" height="2" fill="#3a4a64"/>
  <text x="170" y="1486" font-family="${sans}" font-size="20" fill="#8ba4c0">Authorized Signature</text>
  <text x="${W - 170}" y="1408" text-anchor="end" font-family="${sans}" font-size="20" letter-spacing="4" fill="#5b7392">ISSUED</text>
  <text x="${W - 170}" y="1444" text-anchor="end" font-family="${sans}" font-size="28" fill="#e8eef7">${issued}</text>

  <!-- Verification footer -->
  <rect x="170" y="1540" width="${W - 340}" height="2" fill="#23304a"/>
  <text x="${W / 2}" y="1590" text-anchor="middle" font-family="${sans}" font-size="20" fill="#5b7392">Verification ID: <tspan fill="#8ba4c0">${verificationId}</tspan></text>
</svg>`

  // Rasterize the SVG at 2× (~300 DPI for A4) using the browser's SVG renderer.
  const scale = 2
  const img = new Image()
  const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('SVG render failed'))
    img.src = svgUrl
  })
  const canvas = document.createElement('canvas')
  canvas.width = W * scale
  canvas.height = H * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const png = canvas.toDataURL('image/png')

  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  doc.addImage(png, 'PNG', 0, 0, 210, 297, undefined, 'FAST')

  const filename = `${slug(brand)}-Payout-${payout.id}.pdf`
  doc.save(filename)
}
