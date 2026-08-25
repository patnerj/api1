'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { PanelImperativeHandle } from 'react-resizable-panels'
import { storageGet, storageSet, type StorageKey } from '@/lib/storage'

/**
 * Encapsulates a react-resizable-panels collapsible panel: imperative ref,
 * collapsed state, persisted restore on mount, a toggle button handler, and an
 * onResize persistence callback. Replaces the duplicated market-watch /
 * positions collapse boilerplate in the trading terminal.
 */
export function useCollapsiblePanel(storageKey: StorageKey, collapseThreshold = 5) {
  const panelRef = useRef<PanelImperativeHandle>(null)
  const [collapsed, setCollapsed] = useState(false)

  // Restore persisted state on mount.
  useEffect(() => {
    const saved = storageGet(storageKey)
    if (saved === '1') {
      setCollapsed(true)
      panelRef.current?.collapse()
    } else if (saved === '0') {
      setCollapsed(false)
      panelRef.current?.expand()
    }
  }, [storageKey])

  const toggle = useCallback(() => {
    const panel = panelRef.current
    if (panel) {
      panel.isCollapsed() ? panel.expand() : panel.collapse()
    } else {
      setCollapsed((v) => {
        const next = !v
        storageSet(storageKey, next ? '1' : '0')
        return next
      })
    }
  }, [storageKey])

  const onResize = useCallback((size: { asPercentage: number }) => {
    const isCol = size.asPercentage <= collapseThreshold
    setCollapsed(isCol)
    storageSet(storageKey, isCol ? '1' : '0')
  }, [storageKey, collapseThreshold])

  return { panelRef, collapsed, toggle, onResize }
}
