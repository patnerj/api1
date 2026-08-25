'use client'

import React, { useMemo } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Trade } from '@/types/api'
import { fmtUSD } from '@/lib/format'
import { useTheme } from 'next-themes'

interface CalendarHeatmapProps {
  trades: Trade[]
}

export function CalendarHeatmap({ trades }: CalendarHeatmapProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  // Generate last 90 days
  const data = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const daysMap = new Map<string, { pnl: number, count: number, date: Date }>()
    
    // Initialize last 90 days
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      daysMap.set(dateStr, { pnl: 0, count: 0, date: d })
    }
    
    // Populate with trades
    trades.forEach(t => {
      const pnl = typeof t.pnl === 'string' ? parseFloat(t.pnl) : t.pnl
      let dateStr = ''
      if (t.closed_at_iso) {
        dateStr = t.closed_at_iso.split('T')[0]
      } else if (t.closed_at) {
        dateStr = t.closed_at.split(' ')[0]
      }
      
      if (dateStr && daysMap.has(dateStr)) {
        const existing = daysMap.get(dateStr)!
        existing.pnl += pnl
        existing.count += 1
      }
    })
    
    return Array.from(daysMap.values())
  }, [trades])

  // Group by weeks
  const weeks: { pnl: number, count: number, date: Date }[][] = []
  let currentWeek: { pnl: number, count: number, date: Date }[] = []
  
  // Pad the first week to align with Sunday
  if (data.length > 0) {
    const firstDay = data[0].date.getDay()
    for (let i = 0; i < firstDay; i++) {
      currentWeek.push({ pnl: 0, count: 0, date: new Date(0) }) // empty pad
    }
  }

  data.forEach(day => {
    currentWeek.push(day)
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  })
  
  if (currentWeek.length > 0) {
    while(currentWeek.length < 7) {
       currentWeek.push({ pnl: 0, count: 0, date: new Date(0) })
    }
    weeks.push(currentWeek)
  }

  const getColor = (pnl: number, count: number) => {
    if (count === 0) return isDark ? '#2a2a2a' : '#ebedf0'
    if (pnl > 0) {
      if (pnl > 500) return '#10b981' // strong green
      if (pnl > 100) return '#34d399' // med green
      return '#6ee7b7' // light green
    } else if (pnl < 0) {
      if (pnl < -500) return '#ef4444' // strong red
      if (pnl < -100) return '#f87171' // med red
      return '#fca5a5' // light red
    }
    return isDark ? '#3f3f46' : '#d4d4d8' // neutral/breakeven
  }

  return (
    <div className="w-full overflow-x-auto pb-4 scrollbar-thin">
      <div className="min-w-[600px]">
        <div className="flex text-xs text-text-muted mb-2 ml-8">
           <div className="flex-1 flex justify-between px-2">
             <span>90 days ago</span>
             <span>Today</span>
           </div>
        </div>
        
        <div className="flex gap-1">
          <div className="flex flex-col gap-1 text-[10px] text-text-muted pr-2 justify-between py-1 h-[100px]">
            <span>Mon</span>
            <span>Wed</span>
            <span>Fri</span>
          </div>
          
          <div className="flex gap-1 flex-1">
            <TooltipProvider delayDuration={0}>
              {weeks.map((week, i) => (
                <div key={i} className="flex flex-col gap-1">
                  {week.map((day, j) => {
                    // Skip render for padding days
                    if (day.date.getTime() === 0) {
                      return <div key={j} className="w-3 h-3 rounded-sm opacity-0" />
                    }
                    
                    return (
                      <Tooltip key={j}>
                        <TooltipTrigger asChild>
                          <div 
                            className="w-3 h-3 rounded-sm cursor-pointer hover:ring-2 hover:ring-text/20 transition-all"
                            style={{ backgroundColor: getColor(day.pnl, day.count) }}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs p-2">
                          <p className="font-medium text-text mb-1">
                            {day.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </p>
                          {day.count > 0 ? (
                            <>
                              <p className="text-text-muted">{day.count} trade{day.count > 1 ? 's' : ''}</p>
                              <p className={`font-semibold ${day.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                                {fmtUSD(day.pnl, { sign: true })}
                              </p>
                            </>
                          ) : (
                            <p className="text-text-muted">No trades</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                </div>
              ))}
            </TooltipProvider>
          </div>
        </div>
        
        <div className="flex items-center justify-end gap-2 mt-4 text-xs text-text-muted">
          <span>Less</span>
          <div className="flex gap-1">
             <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: isDark ? '#2a2a2a' : '#ebedf0' }} />
             <div className="w-3 h-3 rounded-sm bg-success/40" />
             <div className="w-3 h-3 rounded-sm bg-success" />
             <div className="w-3 h-3 rounded-sm bg-danger/40" />
             <div className="w-3 h-3 rounded-sm bg-danger" />
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  )
}
