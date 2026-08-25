'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'

interface CircularProgressProps {
  value: number
  size?: number
  strokeWidth?: number
  tone?: 'success' | 'warn' | 'danger' | 'accent' | 'info'
  className?: string
  children?: React.ReactNode
}

const TONES = {
  accent:  'text-accent drop-shadow-[0_0_8px_rgba(124,110,245,0.4)]',
  success: 'text-success drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]',
  danger:  'text-danger drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]',
  warn:    'text-warn drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]',
  info:    'text-info drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]',
}

export function CircularProgress({
  value,
  size = 64,
  strokeWidth = 6,
  tone = 'accent',
  className,
  children
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  // Clamp value between 0 and 100
  const clampedValue = Math.max(0, Math.min(100, value))
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference
  
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          className="text-bg-subtle/50"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <motion.circle
          className={TONES[tone]}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  )
}
