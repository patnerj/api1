'use client'

/**
 * Real-time Theme Accent & Typography Manager
 * Dynamically applies primary accent colors, glow effects, RGB/HSL values,
 * and font families across the entire platform in real-time.
 */

export const THEME_PRESETS = [
  {
    id: 'midnight-emerald',
    name: 'Midnight Obsidian',
    label: 'Neon Emerald Accent',
    primary: '#10B981',
    secondary: '#111827',
    glow: 'rgba(16, 185, 129, 0.25)',
  },
  {
    id: 'electric-blue',
    name: 'Electric Blue',
    label: 'Cobalt Accent',
    primary: '#3B82F6',
    secondary: '#111827',
    glow: 'rgba(59, 130, 246, 0.25)',
  },
  {
    id: 'gold-sovereign',
    name: 'Gold Sovereign',
    label: 'Amber Gold Accent',
    primary: '#F59E0B',
    secondary: '#111827',
    glow: 'rgba(245, 158, 11, 0.25)',
  },
  {
    id: 'crimson-edge',
    name: 'Crimson Edge',
    label: 'Red Accent',
    primary: '#EF4444',
    secondary: '#111827',
    glow: 'rgba(239, 68, 68, 0.25)',
  },
  {
    id: 'cyberpunk-violet',
    name: 'Cyberpunk Violet',
    label: 'Neon Purple Accent',
    primary: '#8B5CF6',
    secondary: '#111827',
    glow: 'rgba(139, 92, 246, 0.25)',
  },
  {
    id: 'nordic-cyan',
    name: 'Nordic Cyan',
    label: 'Arctic Teal Accent',
    primary: '#06B6D4',
    secondary: '#111827',
    glow: 'rgba(6, 182, 212, 0.25)',
  },
  {
    id: 'rose-prestige',
    name: 'Rose Gold Prestige',
    label: 'Luxury Rose Accent',
    primary: '#F43F5E',
    secondary: '#111827',
    glow: 'rgba(244, 63, 94, 0.25)',
  },
  {
    id: 'solar-flare',
    name: 'Solar Flare',
    label: 'Vibrant Orange Accent',
    primary: '#F97316',
    secondary: '#111827',
    glow: 'rgba(249, 115, 22, 0.25)',
  },
]

export const FONT_PRESETS = [
  {
    id: 'poppins',
    name: 'Poppins',
    tag: 'Default • Geometric & Modern',
    cssVar: 'var(--font-poppins), Poppins, system-ui, sans-serif',
    category: 'Geometric Sans',
  },
  {
    id: 'plus-jakarta',
    name: 'Plus Jakarta Sans',
    tag: 'High-End Fintech Standard',
    cssVar: 'var(--font-plus-jakarta), Plus Jakarta Sans, system-ui, sans-serif',
    category: 'Clean Sans',
  },
  {
    id: 'outfit',
    name: 'Outfit',
    tag: 'Futuristic & Clean',
    cssVar: 'var(--font-outfit), Outfit, system-ui, sans-serif',
    category: 'Geometric Display',
  },
  {
    id: 'inter',
    name: 'Inter',
    tag: 'Institutional Precision',
    cssVar: 'var(--font-inter), Inter, system-ui, sans-serif',
    category: 'Technical Sans',
  },
  {
    id: 'manrope',
    name: 'Manrope',
    tag: 'Modern Grotesque',
    cssVar: 'var(--font-manrope), Manrope, system-ui, sans-serif',
    category: 'Semi-Geometric',
  },
  {
    id: 'space-grotesk',
    name: 'Space Grotesk',
    tag: 'Cyber & Web3 Trading',
    cssVar: 'var(--font-space-grotesk), Space Grotesk, system-ui, sans-serif',
    category: 'Tech Display',
  },
  {
    id: 'urbanist',
    name: 'Urbanist',
    tag: 'Sleek Minimalist',
    cssVar: 'var(--font-urbanist), Urbanist, system-ui, sans-serif',
    category: 'Modern Sans',
  },
]

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let cleanHex = hex.replace(/^#/, '')
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('')
  }
  if (cleanHex.length !== 6) {
    return { r: 16, g: 185, b: 129 } // Default Emerald
  }
  return {
    r: parseInt(cleanHex.substring(0, 2), 16),
    g: parseInt(cleanHex.substring(2, 4), 16),
    b: parseInt(cleanHex.substring(4, 6), 16),
  }
}

export function hexToHsl(hex: string): string {
  const { r, g, b } = hexToRgb(hex)
  const rNorm = r / 255
  const gNorm = g / 255
  const bNorm = b / 255

  const max = Math.max(rNorm, gNorm, bNorm)
  const min = Math.min(rNorm, gNorm, bNorm)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)
        break
      case gNorm:
        h = (bNorm - rNorm) / d + 2
        break
      case bNorm:
        h = (rNorm - gNorm) / d + 4
        break
    }
    h /= 6
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

export function applyThemeAccent(hex: string) {
  if (!hex || typeof window === 'undefined') return

  const cleanHex = hex.startsWith('#') ? hex : `#${hex}`
  const { r, g, b } = hexToRgb(cleanHex)
  const hsl = hexToHsl(cleanHex)
  const glow = `rgba(${r}, ${g}, ${b}, 0.25)`

  const root = document.documentElement

  root.style.setProperty('--accent', hsl)
  root.style.setProperty('--accent-hex', cleanHex)
  root.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`)
  root.style.setProperty('--accent-glow', glow)

  root.style.setProperty('--primary', cleanHex)
  root.style.setProperty('--primary-rgb', `${r}, ${g}, ${b}`)
  root.style.setProperty('--primary-hover', cleanHex)

  // Inject or update real-time style override tag
  let styleEl = document.getElementById('fxsim-live-theme-accent')
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = 'fxsim-live-theme-accent'
    document.head.appendChild(styleEl)
  }
  styleEl.innerHTML = `
    :root, [data-theme] {
      --accent: ${hsl} !important;
      --accent-hover: ${hsl} !important;
      --accent-hex: ${cleanHex} !important;
      --accent-rgb: ${r}, ${g}, ${b} !important;
      --accent-glow: ${glow} !important;
      --primary: ${cleanHex} !important;
      --primary-rgb: ${r}, ${g}, ${b} !important;
    }
    .text-accent,
    .text-emerald-400,
    .text-emerald-500 {
      color: ${cleanHex} !important;
    }
    .bg-accent,
    .bg-emerald-500,
    .bg-emerald-600 {
      background-color: ${cleanHex} !important;
    }
    .border-accent,
    .border-emerald-500,
    .border-emerald-500\\/40,
    .border-emerald-500\\/30,
    .border-emerald-500\\/20 {
      border-color: ${cleanHex} !important;
    }
    .bg-accent\\/15,
    .bg-emerald-500\\/15,
    .bg-emerald-500\\/10,
    .bg-emerald-500\\/20,
    .bg-emerald-600\\/10 {
      background-color: rgba(${r}, ${g}, ${b}, 0.15) !important;
    }
    .hover\\:bg-emerald-500\\/20:hover,
    .hover\\:bg-emerald-500\\/10:hover {
      background-color: rgba(${r}, ${g}, ${b}, 0.2) !important;
    }
    .hover\\:border-emerald-500:hover,
    .hover\\:border-emerald-500\\/50:hover {
      border-color: ${cleanHex} !important;
    }
    .hover\\:text-emerald-300:hover,
    .hover\\:text-emerald-400:hover {
      color: ${cleanHex} !important;
    }
    .shadow-accent,
    .shadow-emerald-500\\/20,
    .shadow-emerald-500\\/10 {
      box-shadow: 0 0 15px ${glow} !important;
    }
    .focus-within\\:border-\\[\\#10B981\\]:focus-within {
      border-color: ${cleanHex} !important;
    }
    .focus-within\\:ring-\\[\\#10B981\\]:focus-within {
      --tw-ring-color: ${cleanHex} !important;
    }
  `

  try {
    localStorage.setItem('fxsim:theme-accent', cleanHex)
  } catch {
    /* private mode */
  }
}

export function applyFontFamily(fontId: string) {
  if (typeof window === 'undefined') return

  const found = FONT_PRESETS.find((f) => f.id === fontId) || FONT_PRESETS[0]
  const root = document.documentElement

  root.style.setProperty('--font-sans', found.cssVar)
  root.style.setProperty('font-family', found.cssVar)
  document.body.style.fontFamily = found.cssVar

  // Inject or update real-time font override tag
  let fontStyleEl = document.getElementById('fxsim-live-theme-font')
  if (!fontStyleEl) {
    fontStyleEl = document.createElement('style')
    fontStyleEl.id = 'fxsim-live-theme-font'
    document.head.appendChild(fontStyleEl)
  }
  fontStyleEl.innerHTML = `
    html, body, button, input, select, textarea, [data-theme], h1, h2, h3, h4, h5, h6, p, span, a, table, th, td {
      font-family: ${found.cssVar} !important;
    }
  `

  try {
    localStorage.setItem('fxsim:theme-font', found.id)
  } catch {
    /* private mode */
  }
}

export const RADIUS_PRESETS: Record<string, { base: string; sm: string; md: string; lg: string; xl: string; '2xl': string }> = {
  none: { base: '0px', sm: '0px', md: '0px', lg: '0px', xl: '0px', '2xl': '0px' },
  sm:   { base: '4px', sm: '2px', md: '4px', lg: '6px', xl: '8px', '2xl': '10px' },
  md:   { base: '8px', sm: '4px', md: '8px', lg: '12px', xl: '16px', '2xl': '20px' },
  lg:   { base: '14px', sm: '6px', md: '10px', lg: '14px', xl: '20px', '2xl': '24px' },
  full: { base: '9999px', sm: '9999px', md: '9999px', lg: '9999px', xl: '9999px', '2xl': '9999px' },
}

export function applyRadius(radiusId: string) {
  if (typeof window === 'undefined') return

  const cleanRadius = (radiusId || 'md').toLowerCase()
  const r = RADIUS_PRESETS[cleanRadius] || RADIUS_PRESETS['md']
  const root = document.documentElement

  root.style.setProperty('--radius', r.base)

  let radiusStyleEl = document.getElementById('fxsim-live-theme-radius')
  if (!radiusStyleEl) {
    radiusStyleEl = document.createElement('style')
    radiusStyleEl.id = 'fxsim-live-theme-radius'
    document.head.appendChild(radiusStyleEl)
  }

  radiusStyleEl.innerHTML = `
    :root, [data-theme] {
      --radius: ${r.base} !important;
    }
    .rounded-sm {
      border-radius: ${r.sm} !important;
    }
    .rounded, .rounded-md {
      border-radius: ${r.md} !important;
    }
    .rounded-lg {
      border-radius: ${r.lg} !important;
    }
    .rounded-xl {
      border-radius: ${r.xl} !important;
    }
    .rounded-2xl {
      border-radius: ${r['2xl']} !important;
    }
    .rounded-none {
      border-radius: 0px !important;
    }
    .rounded-full {
      border-radius: 9999px !important;
    }
  `

  try {
    localStorage.setItem('fxsim:theme-radius', cleanRadius)
  } catch {
    /* private mode */
  }
}

export function initializeSavedTheme() {
  if (typeof window === 'undefined') return

  try {
    const savedAccent = localStorage.getItem('fxsim:theme-accent')
    if (savedAccent) {
      applyThemeAccent(savedAccent)
    }

    const savedFont = localStorage.getItem('fxsim:theme-font') || 'poppins'
    applyFontFamily(savedFont)

    const savedRadius = localStorage.getItem('fxsim:theme-radius') || 'md'
    applyRadius(savedRadius)
  } catch {
    /* private mode */
  }
}

export const initThemeAccent = initializeSavedTheme
