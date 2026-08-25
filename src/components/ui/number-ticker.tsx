'use client'

import { useEffect, useRef, useState } from 'react'
import { useInView, useSpring } from 'framer-motion'
import { fmtUSD, fmtPct } from '@/lib/format'

interface Props {
  value: number
  format?: 'usd' | 'pct' | 'raw'
  decimals?: number
  className?: string
}

export function NumberTicker({ value, format = 'raw', decimals = 0, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.5 })
  const spring = useSpring(0, {
    mass: 1,
    stiffness: 75,
    damping: 15,
  })

  const [display, setDisplay] = useState('')

  useEffect(() => {
    if (inView) {
      spring.set(value)
    }
  }, [inView, spring, value])

  useEffect(() => {
    return spring.on('change', (latest) => {
      let str = ''
      if (format === 'usd') {
        str = fmtUSD(latest, { decimals })
      } else if (format === 'pct') {
        str = fmtPct(latest, decimals)
      } else {
        str = latest.toFixed(decimals)
      }
      setDisplay(str)
    })
  }, [spring, format, decimals])

  // Initial render format
  const initial = format === 'usd' ? fmtUSD(0, { decimals }) : format === 'pct' ? fmtPct(0, decimals) : (0).toFixed(decimals)

  return <span ref={ref} className={className}>{display || initial}</span>
}
