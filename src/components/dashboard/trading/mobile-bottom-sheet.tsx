'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence, type PanInfo } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

interface Props {
  open:     boolean
  onClose:  () => void
  title?:   React.ReactNode
  /** Sheet height as a fraction of viewport (default 0.8). */
  height?:  number
  /** Tailwind override for the panel. */
  className?: string
  children: React.ReactNode
}

export function MobileBottomSheet({
  open, onClose, title, height = 0.85, className, children,
}: Props) {
  // Lock body scroll while open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  // Escape to close
  useEffect(() => {
    if (!open) return
    const on = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [open, onClose])

  const onDragEnd = (_e: unknown, info: PanInfo) => {
    // Dismiss if dragged down >120px or fast flick down
    if (info.offset.y > 120 || info.velocity.y > 600) onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            aria-hidden
          />

          {/* Sheet */}
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={onDragEnd}
            style={{ height: `${height * 100}dvh` }}
            className={cn(
              'fixed inset-x-0 bottom-0 z-50 flex flex-col',
              'rounded-t-2xl glass-strong shadow-card-lg',
              'pb-[env(safe-area-inset-bottom)]',
              className,
            )}
          >
            {/* Drag handle */}
            <div className="shrink-0 flex justify-center pt-2 pb-1.5 cursor-grab active:cursor-grabbing">
              <div className="h-1 w-10 rounded-full bg-border-strong" aria-hidden />
            </div>

            {/* Header */}
            {title && (
              <div className="shrink-0 flex items-center justify-between px-4 pb-2 border-b border-border-subtle">
                <div className="font-semibold text-sm">{title}</div>
                <button
                  onClick={onClose}
                  className="p-1.5 -mr-1.5 rounded-md text-text-muted hover:text-text hover:bg-surface-muted focus-ring"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
