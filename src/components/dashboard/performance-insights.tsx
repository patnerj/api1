'use client'

import { Card, CardContent } from '@/components/ui/card'
import { toNum, fmtPct, fmtUSD } from '@/lib/format'
import type { Trade } from '@/types/api'
import { Target, TrendingUp, Award, BarChart3 } from 'lucide-react'

interface Props {
  trades: Trade[] | null
}

export function PerformanceInsights({ trades }: Props) {
  if (!trades || trades.length === 0) {
    return (
      <Card className="border-accent/20 bg-surface/40 h-full">
        <CardContent className="p-6 flex flex-col items-center justify-center text-sm text-text-muted h-full text-center gap-2">
          <BarChart3 className="h-6 w-6 text-accent/50" />
          No trading data available to generate insights.
        </CardContent>
      </Card>
    )
  }

  // Calculate metrics
  let totalTrades = trades.length
  let winningTrades = 0
  let grossProfit = 0
  let grossLoss = 0
  const assetPnL: Record<string, number> = {}

  trades.forEach((t) => {
    const pnl = toNum(t.pnl)
    if (pnl > 0) {
      winningTrades++
      grossProfit += pnl
    } else if (pnl < 0) {
      grossLoss += Math.abs(pnl)
    }

    if (!assetPnL[t.symbol]) assetPnL[t.symbol] = 0
    assetPnL[t.symbol] += pnl
  })

  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0
  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss) : (grossProfit > 0 ? 99.99 : 0)
  
  let bestAsset = '-'
  let bestAssetPnL = 0
  Object.entries(assetPnL).forEach(([symbol, pnl]) => {
    if (pnl > bestAssetPnL) {
      bestAssetPnL = pnl
      bestAsset = symbol
    }
  })

  return (
    <Card className="relative overflow-hidden border-border/60 hover:border-border-strong hover:shadow-sm h-full flex flex-col justify-between group transition-all duration-300">
      <div className="absolute inset-0 bg-aurora opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity" />
      <div className="absolute -top-12 -right-12 h-32 w-32 bg-accent/20 blur-[50px] rounded-full pointer-events-none transition-all group-hover:scale-150" />
      
      <div className="p-5 border-b border-border-subtle relative z-10">
        <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <BarChart3 className="h-4 w-4 text-accent" /> Performance Insights
        </div>
      </div>
      
      <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10 flex-1">
        {/* Win Rate */}
        <div className="flex flex-col justify-center gap-1 p-3 rounded-xl bg-surface/50 border border-border-subtle hover:border-accent/30 transition-colors">
          <div className="flex items-center gap-1.5 text-2xs text-text-muted uppercase tracking-wider font-semibold">
            <Target className="h-3 w-3 text-success" /> Win Rate
          </div>
          <div className="text-2xl font-bold tabular tracking-tight">
            {fmtPct(winRate)}
          </div>
          <div className="text-xs text-text-muted">
            {winningTrades} of {totalTrades} trades
          </div>
        </div>

        {/* Profit Factor */}
        <div className="flex flex-col justify-center gap-1 p-3 rounded-xl bg-surface/50 border border-border-subtle hover:border-accent/30 transition-colors">
          <div className="flex items-center gap-1.5 text-2xs text-text-muted uppercase tracking-wider font-semibold">
            <TrendingUp className="h-3 w-3 text-accent" /> Profit Factor
          </div>
          <div className="text-2xl font-bold tabular tracking-tight">
            {profitFactor.toFixed(2)}
          </div>
          <div className="text-xs text-text-muted">
            Target &gt; 1.5
          </div>
        </div>

        {/* Best Asset */}
        <div className="flex flex-col justify-center gap-1 p-3 rounded-xl bg-surface/50 border border-border-subtle hover:border-accent/30 transition-colors">
          <div className="flex items-center gap-1.5 text-2xs text-text-muted uppercase tracking-wider font-semibold">
            <Award className="h-3 w-3 text-warning" /> Best Asset
          </div>
          <div className="text-2xl font-bold tracking-tight text-warning">
            {bestAsset}
          </div>
          <div className="text-xs text-text-muted tabular">
            {bestAssetPnL > 0 ? '+' : ''}{fmtUSD(bestAssetPnL)}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
