'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { invalidateFxsim } from '@/lib/fxsim'
import { usePrices } from '@/store/prices'
import type { Position } from '@/types/api'

export interface PlaceMarketParams {
  symbol: string
  side: 'buy' | 'sell'
  lots: number
  sl?: number | null
  tp?: number | null
  /** Minimum lot for validation (defaults to 0.01). */
  minLot?: number
}

/**
 * Single source of truth for placing a MARKET order. Used by both the order
 * ticket and the chart's 1-click box so there is exactly one `api.open` call
 * site with one set of toasts + cache invalidations.
 *
 * Returns `true` on success so callers can run extra UI (clear fields, close a
 * sheet) only when the order actually went through.
 */
export function usePlaceOrder() {
  const [busy, setBusy] = useState<'buy' | 'sell' | null>(null)

  const placeMarket = useCallback(async (params: PlaceMarketParams): Promise<boolean> => {
    const { symbol, side, lots, sl = null, tp = null, minLot = 0.01 } = params
    if (!Number.isFinite(lots) || lots < minLot) {
      toast.error(`Lot size must be at least ${minLot}`)
      return false
    }
    
    // Create optimistic row
    const tick = usePrices.getState().prices[symbol]
    const entryPx = side === 'buy' ? tick?.ask : tick?.bid
    const optimisticId = -Date.now()
    const optimisticPos: Position = {
      id: optimisticId,
      account_id: usePrices.getState().account?.id || 0,
      symbol,
      type: side,
      lot_size: lots,
      open_price: entryPx || 0,
      current_price: entryPx || 0,
      sl: sl,
      tp: tp,
      pnl: 0,
      swap: 0,
      commission: 0,
      margin: 0,
      opened_at: new Date().toISOString(),
    }
    
    // Inject optimistic row
    usePrices.getState().addOptimisticPosition(optimisticPos)
    setBusy(side)

    const res = await api.open({ symbol, type: side, lot_size: lots, sl, tp })
    
    setBusy(null)
    
    if (res.ok && res.data.success) {
      toast.success(`${side.toUpperCase()} ${lots} ${symbol} opened`)
      // Refresh positions immediately and remove fake row
      await usePrices.getState().refresh()
      usePrices.getState().removeOptimisticPosition(optimisticId)
      
      invalidateFxsim('/positions')
      invalidateFxsim('/account')
      return true
    }
    
    // On failure, just remove fake row
    usePrices.getState().removeOptimisticPosition(optimisticId)
    toast.error(res.ok ? (res.data.message || 'Order rejected') : res.error)
    return false
  }, [])

  return { placeMarket, busy }
}
