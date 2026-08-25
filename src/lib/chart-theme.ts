/**
 * Single source of truth for chart colors, shared by the TradingView widget
 * (chart-panel) and the lightweight-charts equity curve (equity-chart).
 *
 * Success/danger hexes live here so both charts stay in sync with each other;
 * neutral text/grid colors are read from the app's CSS variables at runtime so
 * charts follow the active theme (light, dark, and custom themes).
 */

export const CHART_UP_HEX   = '#10B981' // success
export const CHART_DOWN_HEX = '#ef4444' // danger

/** Read a `--token` HSL triple ("160 84% 39%") into a usable `hsl()` string. */
export function cssHsl(token: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim()
    return raw ? `hsl(${raw})` : fallback
  } catch {
    return fallback
  }
}

/**
 * Detect whether the ACTIVE theme is light by reading the `--bg` token's
 * lightness. This app has many custom themes ("clean-light", "tokyo-night", …)
 * selected via a `data-theme` attribute, so a class-based (next-themes) check is
 * unreliable — the token lightness is the ground truth. Dark themes sit ~11–16%,
 * the light theme ~98%.
 */
export function isLightTheme(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
    const lightness = parseFloat(bg.split(/\s+/)[2]) // "H S% L%"
    return Number.isFinite(lightness) ? lightness > 50 : false
  } catch {
    return false
  }
}

/** Config fragment for the TradingView tv.js widget — reads the live theme. */
export function tvThemeConfig() {
  const light = isLightTheme()
  return {
    theme: (light ? 'light' : 'dark') as 'light' | 'dark',
    toolbar_bg: light ? '#ffffff' : '#0a0f1a',
    backgroundColor: light ? 'rgba(255,255,255,0)' : 'rgba(10,15,26,0)',
    gridColor: light ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)',
  }
}

/** Colors for the lightweight-charts equity area series + layout. */
export function equityChartTheme(up: boolean) {
  const line = up ? CHART_UP_HEX : CHART_DOWN_HEX
  const topAlpha = up ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'
  const bottomAlpha = up ? 'rgba(16, 185, 129, 0)' : 'rgba(239, 68, 68, 0)'
  return {
    lineColor: line,
    topColor: topAlpha,
    bottomColor: bottomAlpha,
    textColor: cssHsl('--text-muted', 'rgba(156,163,175,0.8)'),
    gridColor: cssHsl('--border-subtle', 'rgba(255,255,255,0.06)'),
  }
}
