'use client'

import { useEffect, useRef, useMemo } from 'react'
import {
  createChart, ColorType, AreaSeries,
  type IChartApi, type ISeriesApi, type UTCTimestamp,
} from 'lightweight-charts'
import { toNum } from '@/lib/format'
import { equityChartTheme } from '@/lib/chart-theme'
import { useThemeAttribute } from '@/hooks/use-theme-attribute'

interface EquityPoint { date: string; balance: number }

interface Props {
  data:   EquityPoint[]
  height?: number
}

type Point = { time: UTCTimestamp; value: number }

export function EquityChart({ data, height = 280 }: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null)
  const themeKey = useThemeAttribute()

  const seriesData = useMemo<Point[]>(() => {
    if (!data || !Array.isArray(data)) return []
    return data
      .map((p) => ({
        time: Math.floor(new Date(p.date).getTime() / 1000) as UTCTimestamp,
        value: toNum(p.balance),
      }))
      .filter((p) => Number.isFinite(p.value))
      .sort((a, b) => a.time - b.time)
      // lightweight-charts requires strictly increasing time values
      .reduce((acc, curr) => {
        if (acc.length > 0 && acc[acc.length - 1].time >= curr.time) {
          curr.time = (acc[acc.length - 1].time + 1) as UTCTimestamp
        }
        acc.push(curr)
        return acc
      }, [] as Point[])
  }, [data])

  // ── Create the chart + series ONCE, and observe container resizes. ──
  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgba(156,163,175,0.8)',
      },
      width: chartContainerRef.current.clientWidth,
      height,
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.06)', style: 3 },
        horzLines: { color: 'rgba(255,255,255,0.06)', style: 3 },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true, fixLeftEdge: true, fixRightEdge: true },
      crosshair: { mode: 1 },
      handleScroll: false,
      handleScale: false,
    })
    chartRef.current = chart

    seriesRef.current = chart.addSeries(AreaSeries, {
      lineWidth: 2,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    })

    // ResizeObserver reacts to parent/panel resizes (not just window).
    const ro = new ResizeObserver(() => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth })
      }
    })
    ro.observe(chartContainerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [height])

  // ── Update data + theme-dependent colors in place (no chart re-creation). ──
  useEffect(() => {
    const chart = chartRef.current
    const series = seriesRef.current
    if (!chart || !series) return

    const up = seriesData.length > 1
      ? seriesData[seriesData.length - 1].value >= seriesData[0].value
      : true
    const t = equityChartTheme(up)

    series.applyOptions({
      lineColor: t.lineColor,
      topColor: t.topColor,
      bottomColor: t.bottomColor,
    })
    chart.applyOptions({
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: t.textColor },
      grid: {
        vertLines: { color: t.gridColor, style: 3 },
        horzLines: { color: t.gridColor, style: 3 },
      },
    })
    series.setData(seriesData)
    chart.timeScale().fitContent()
  }, [seriesData, themeKey])

  // Container is ALWAYS mounted so the create-once effect can attach even before
  // data arrives; the empty state is an overlay, not a replacement.
  return (
    <div style={{ width: '100%', height }} className="relative px-2 pb-2">
      <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />
      {seriesData.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-text-muted px-6 text-center">
          Not enough data to draw the equity curve yet.
        </div>
      )}
    </div>
  )
}
