'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ReactNode } from 'react'

interface Props {
  selectedCount: number
  actions: ReactNode
  onClear?: () => void
}

export function FloatingActionBar({ selectedCount, actions, onClear }: Props) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0, scale: 0.95, x: '-50%' }}
          animate={{ y: 0, opacity: 1, scale: 1, x: '-50%' }}
          exit={{ y: 100, opacity: 0, scale: 0.95, x: '-50%' }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="fixed bottom-6 left-1/2 z-50 flex items-center gap-4 rounded-xl bg-surface-strong/90 backdrop-blur-[16px] px-4 py-3 shadow-glow border border-border-strong"
        >
          <div className="flex items-center gap-3 border-r border-border-subtle pr-4">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-medium text-white shadow-sm">
              {selectedCount}
            </span>
            <span className="text-sm font-medium text-text">selected</span>
            {onClear && (
              <button
                onClick={onClear}
                className="text-xs text-text-muted hover:text-text transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {actions}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
