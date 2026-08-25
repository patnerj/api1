'use client'

import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

/** Renders a QR code for the given value entirely client-side (no third-party calls). */
export function QrCode({ value, size = 160, className }: { value: string; size?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!ref.current || !value) return
    QRCode.toCanvas(ref.current, value, {
      width: size,
      margin: 1,
      color: { dark: '#0b1220', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }).catch(() => { /* ignore render errors */ })
  }, [value, size])

  return (
    <div className={className} style={{ background: '#fff', padding: 8, borderRadius: 10, display: 'inline-block', lineHeight: 0 }}>
      <canvas ref={ref} width={size} height={size} />
    </div>
  )
}
