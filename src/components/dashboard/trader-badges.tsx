'use client'

import { Card, CardContent } from '@/components/ui/card'
import type { Trade } from '@/types/api'
import { toNum } from '@/lib/format'
import { Medal, Star, ShieldCheck, Zap, Flame, Target } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/cn'

interface Props {
  trades: Trade[] | null
}

interface BadgeDef {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  colorClass: string
  bgClass: string
  glowClass: string
  earned: boolean
}

export function TraderBadges({ trades }: Props) {
  // Simple client-side badge logic based on recent trades
  const totalTrades = trades?.length || 0
  const winRate = totalTrades > 0 
    ? (trades!.filter(t => toNum(t.pnl) > 0).length / totalTrades) 
    : 0
  
  // Calculate win streak
  let currentStreak = 0
  if (trades) {
    for (const t of trades) {
      if (toNum(t.pnl) > 0) currentStreak++
      else break
    }
  }

  const badges: BadgeDef[] = [
    {
      id: 'first_trade',
      name: 'First Blood',
      description: 'Placed your first trade.',
      icon: Zap,
      colorClass: 'text-accent',
      bgClass: 'bg-accent/10',
      glowClass: 'shadow-[0_0_15px_rgba(var(--accent),0.5)]',
      earned: totalTrades > 0,
    },
    {
      id: 'hot_streak',
      name: 'Hot Streak',
      description: 'Won 3 trades in a row.',
      icon: Flame,
      colorClass: 'text-warning',
      bgClass: 'bg-warning/10',
      glowClass: 'shadow-[0_0_15px_rgba(234,179,8,0.5)]', // amber/yellow glow
      earned: currentStreak >= 3,
    },
    {
      id: 'sniper',
      name: 'Sniper',
      description: 'Achieved a >60% win rate on recent trades.',
      icon: Target,
      colorClass: 'text-success',
      bgClass: 'bg-success/10',
      glowClass: 'shadow-[0_0_15px_rgba(16,185,129,0.5)]',
      earned: totalTrades >= 5 && winRate >= 0.6,
    },
    {
      id: 'consistent',
      name: 'Consistent',
      description: 'Placed 10 or more trades.',
      icon: ShieldCheck,
      colorClass: 'text-info',
      bgClass: 'bg-info/10',
      glowClass: 'shadow-[0_0_15px_rgba(59,130,246,0.5)]',
      earned: totalTrades >= 10,
    }
  ]

  return (
    <Card className="border-border-subtle h-full">
      <div className="p-4 border-b border-border-subtle">
        <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Medal className="h-4 w-4 text-accent" /> Achievements
        </div>
      </div>
      <CardContent className="p-5 flex flex-wrap gap-4 items-center justify-start h-[calc(100%-53px)]">
        <TooltipProvider>
          {badges.map((b) => {
            const Icon = b.icon
            return (
              <Tooltip key={b.id} delayDuration={100}>
                <TooltipTrigger asChild>
                  <div 
                    className={cn(
                      'relative h-14 w-14 rounded-2xl flex items-center justify-center transition-all duration-300',
                      b.earned ? b.bgClass : 'bg-surface/50 border border-border-subtle grayscale opacity-40',
                      b.earned && `hover:scale-110 ${b.glowClass}`
                    )}
                  >
                    <Icon className={cn('h-6 w-6', b.earned ? b.colorClass : 'text-text-muted')} />
                    
                    {/* Small star icon overlay for earned badges */}
                    {b.earned && (
                      <div className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-surface rounded-full flex items-center justify-center border border-border-subtle">
                        <Star className="h-3 w-3 text-warning fill-warning" />
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[200px] text-center">
                  <div className="font-semibold text-sm mb-1">{b.name}</div>
                  <div className="text-xs text-text-muted">{b.description}</div>
                  {!b.earned && (
                    <div className="mt-2 text-2xs uppercase tracking-wider text-accent font-semibold">Locked</div>
                  )}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </TooltipProvider>
        
        {badges.every(b => !b.earned) && (
          <div className="text-xs text-text-muted text-center w-full mt-2">
            Trade to unlock badges
          </div>
        )}
      </CardContent>
    </Card>
  )
}
