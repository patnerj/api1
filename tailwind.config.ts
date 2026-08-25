import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

// ── Legacy color bridge ─────────────────────────────────────────────────
// Admin/legacy pages were built with stock Tailwind palette colors. Remap
// every stock shade onto the dynamic theme tokens so admin branding config
// (accent/warn/danger/info) drives the ENTIRE site — no per-file rewrites.
const t = {
  text:    'hsl(var(--text) / <alpha-value>)',
  muted:   'hsl(var(--text-muted) / <alpha-value>)',
  subtle:  'hsl(var(--text-subtle) / <alpha-value>)',
  surface: 'hsl(var(--surface) / <alpha-value>)',
  surfaceMuted: 'hsl(var(--surface-muted) / <alpha-value>)',
  surfaceStrong: 'hsl(var(--surface-strong) / <alpha-value>)',
  bg:      'hsl(var(--bg) / <alpha-value>)',
  border:  'hsl(var(--border) / <alpha-value>)',
  accent:  'hsl(var(--accent) / <alpha-value>)',
  accentTint: 'hsl(var(--accent) / 0.12)',
  warn:    'hsl(var(--warn) / <alpha-value>)',
  warnTint: 'hsl(var(--warn) / 0.12)',
  danger:  'hsl(var(--danger) / <alpha-value>)',
  dangerTint: 'hsl(var(--danger) / 0.12)',
  info:    'hsl(var(--info) / <alpha-value>)',
  infoTint: 'hsl(var(--info) / 0.12)',
}

const grayFamily = (bright: string, dim: string, faint: string) => ({
  50: bright, 100: bright, 200: bright, 300: bright,
  400: dim, 500: dim, 600: faint,
  700: t.surfaceStrong, 800: t.surfaceMuted, 900: t.bg, 950: t.bg,
})

const stockBridge = {
  gray:   grayFamily(t.text, t.muted, t.subtle),
  zinc:   grayFamily(t.text, t.muted, t.subtle),
  neutral: grayFamily(t.text, t.muted, t.subtle),
  stone:  grayFamily(t.text, t.muted, t.subtle),
  slate:  grayFamily(t.text, t.muted, t.subtle),
  emerald: { 50: t.accentTint, 100: t.accentTint, 200: t.accentTint, 300: t.accent, 400: t.accent, 500: t.accent, 600: t.accent, 700: t.accent, 800: t.accent, 900: t.accent, 950: t.accentTint },
  green:  { 300: t.accent, 400: t.accent, 500: t.accent, 600: t.accent, 700: t.accent, 950: t.accentTint },
  teal:   { 300: t.accent, 400: t.accent, 500: t.accent, 600: t.accent, 700: t.accent, 950: t.accentTint },
  lime:   { 300: t.accent, 400: t.accent, 500: t.accent, 600: t.accent },
  yellow: { 200: t.warn, 300: t.warn, 400: t.warn, 500: t.warn, 600: t.warn, 700: t.warn, 900: t.warnTint, 950: t.warnTint },
  amber:  { 100: t.warnTint, 200: t.warn, 300: t.warn, 400: t.warn, 500: t.warn, 600: t.warn, 700: t.warn, 800: t.warn, 900: t.warnTint, 950: t.warnTint },
  orange: { 300: t.warn, 400: t.warn, 500: t.warn, 600: t.warn, 700: t.warn, 950: t.warnTint },
  red:    { 100: t.dangerTint, 200: t.danger, 300: t.danger, 400: t.danger, 500: t.danger, 600: t.danger, 700: t.danger, 800: t.danger, 900: t.dangerTint, 950: t.dangerTint },
  rose:   { 200: t.dangerTint, 300: t.danger, 400: t.danger, 500: t.danger, 600: t.danger, 700: t.danger, 950: t.dangerTint },
  pink:   { 300: t.danger, 400: t.danger, 500: t.danger, 600: t.danger },
  fuchsia: { 300: t.accent, 400: t.accent, 500: t.accent, 600: t.accent, 950: t.accentTint },
  purple: { 100: t.accentTint, 200: t.accentTint, 300: t.accent, 400: t.accent, 500: t.accent, 600: t.accent, 700: t.accent, 800: t.accent, 900: t.accent, 950: t.accentTint },
  violet: { 300: t.accent, 400: t.accent, 500: t.accent, 600: t.accent, 700: t.accent, 950: t.accentTint },
  indigo: { 300: t.accent, 400: t.accent, 500: t.accent, 600: t.accent, 700: t.accent, 950: t.accentTint },
  blue:   { 100: t.infoTint, 200: t.info, 300: t.info, 400: t.info, 500: t.info, 600: t.info, 700: t.info, 900: t.infoTint, 950: t.infoTint },
  sky:    { 300: t.info, 400: t.info, 500: t.info, 600: t.info, 700: t.info, 950: t.infoTint },
  cyan:   { 100: t.infoTint, 200: t.info, 300: t.info, 400: t.info, 500: t.info, 600: t.info, 700: t.info, 900: t.infoTint, 950: t.infoTint },
}

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: { '2xl': '1440px' },
    },
    extend: {
      colors: {
        ...stockBridge,
        // ── Design tokens ─────────────────────────────────────────────
        bg:        { DEFAULT: 'hsl(var(--bg) / <alpha-value>)', subtle: 'hsl(var(--bg-subtle) / <alpha-value>)', raised: 'hsl(var(--bg-raised) / <alpha-value>)' },
        surface:   { DEFAULT: 'hsl(var(--surface) / <alpha-value>)', muted: 'hsl(var(--surface-muted) / <alpha-value>)', strong: 'hsl(var(--surface-strong) / <alpha-value>)' },
        border:    { DEFAULT: 'hsl(var(--border) / <alpha-value>)', strong: 'hsl(var(--border-strong) / <alpha-value>)', subtle: 'hsl(var(--border-subtle) / <alpha-value>)' },
        text:      { DEFAULT: 'hsl(var(--text) / <alpha-value>)', muted: 'hsl(var(--text-muted) / <alpha-value>)', subtle: 'hsl(var(--text-subtle) / <alpha-value>)' },
        accent:    { DEFAULT: 'hsl(var(--accent, 246 87% 70.5%) / <alpha-value>)', hover: 'hsl(var(--accent-hover, 246 87% 65%) / <alpha-value>)', muted: 'hsl(var(--accent, 246 87% 70.5%) / 0.14)' },
        success:   { DEFAULT: 'hsl(var(--success) / <alpha-value>)', hover: 'hsl(var(--success-hover) / <alpha-value>)', muted: 'hsl(var(--success) / 0.14)' },
        danger:    { DEFAULT: 'hsl(var(--danger) / <alpha-value>)', hover: 'hsl(var(--danger-hover) / <alpha-value>)', muted: 'hsl(var(--danger) / 0.14)' },
        warn:      { DEFAULT: 'hsl(var(--warn) / <alpha-value>)', hover: 'hsl(var(--warn) / <alpha-value>)', muted: 'hsl(var(--warn) / 0.14)' },
        info:      { DEFAULT: 'hsl(var(--info) / <alpha-value>)', hover: 'hsl(var(--info) / <alpha-value>)', muted: 'hsl(var(--info) / 0.14)' },
        // shadcn aliases (used by ported primitives)
        background:  'hsl(var(--bg) / <alpha-value>)',
        foreground:  'hsl(var(--text) / <alpha-value>)',
        primary:     { DEFAULT: 'hsl(var(--accent, 246 87% 70.5%) / <alpha-value>)', foreground: 'hsl(var(--surface) / <alpha-value>)' },
        secondary:   { DEFAULT: 'hsl(var(--surface-muted) / <alpha-value>)', foreground: 'hsl(var(--text) / <alpha-value>)' },
        destructive: { DEFAULT: 'hsl(var(--danger) / <alpha-value>)', foreground: 'hsl(var(--surface) / <alpha-value>)' },
        muted:       { DEFAULT: 'hsl(var(--surface-muted) / <alpha-value>)', foreground: 'hsl(var(--text-muted) / <alpha-value>)' },
        popover:     { DEFAULT: 'hsl(var(--surface) / <alpha-value>)', foreground: 'hsl(var(--text) / <alpha-value>)' },
        card:        { DEFAULT: 'hsl(var(--surface) / <alpha-value>)', foreground: 'hsl(var(--text) / <alpha-value>)' },
        input:       'hsl(var(--border) / <alpha-value>)',
        ring:        'hsl(var(--accent, 246 87% 70.5%) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'var(--font-poppins)', 'Poppins', 'Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        // Mono follows the admin-configured theme font so admin and trader
        // dashboards render identical typography; tabular-nums keeps
        // numeric columns aligned (see globals.css .font-mono rule).
        mono: ['var(--font-sans)', 'var(--font-poppins)', 'Poppins', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        poppins: ['var(--font-poppins)', 'Poppins', 'sans-serif'],
        inter: ['var(--font-inter)', 'Inter', 'sans-serif'],
        jakarta: ['var(--font-plus-jakarta)', 'Plus Jakarta Sans', 'sans-serif'],
        outfit: ['var(--font-outfit)', 'Outfit', 'sans-serif'],
        manrope: ['var(--font-manrope)', 'Manrope', 'sans-serif'],
        space: ['var(--font-space-grotesk)', 'Space Grotesk', 'sans-serif'],
        urbanist: ['var(--font-urbanist)', 'Urbanist', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '0.875rem' }],
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
      borderRadius: {
        none: '0px',
        sm: 'calc(var(--radius, 8px) * 0.5)',
        DEFAULT: 'var(--radius, 8px)',
        md: 'var(--radius, 8px)',
        lg: 'calc(var(--radius, 8px) * 1.5)',
        xl: 'calc(var(--radius, 8px) * 2)',
        '2xl': 'calc(var(--radius, 8px) * 2.5)',
        full: '9999px',
      },
      boxShadow: {
        'card':      '0 1px 2px rgba(0,0,0,.4), 0 0 0 1px rgba(255,255,255,.02) inset',
        'card-lg':   '0 8px 32px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.04) inset',
        'glow':      '0 0 0 1px rgba(124,110,245,.4), 0 0 24px rgba(124,110,245,.25)',
        'glow-success': '0 0 0 1px rgba(16,185,129,.4), 0 0 24px rgba(16,185,129,.25)',
      },
      backgroundImage: {
        'grid':      'linear-gradient(rgba(255,255,255,.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.02) 1px, transparent 1px)',
        'noise':     'url("data:image/svg+xml;utf8,<svg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'><filter id=\'n\'><feTurbulence type=\'fractalNoise\' baseFrequency=\'.9\'/></filter><rect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'.4\'/></svg>")',
        'aurora':    'radial-gradient(circle at 20% 0%, rgba(124,110,245,.18) 0%, transparent 50%), radial-gradient(circle at 80% 100%, rgba(16,185,129,.12) 0%, transparent 50%)',
      },
      keyframes: {
        pulseGlow: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(16,185,129,.4)' },
          '50%':     { boxShadow: '0 0 0 8px rgba(16,185,129,0)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        breathingGlow: {
          '0%, 100%': { boxShadow: '0 0 0 1px hsl(var(--accent, 246 87% 70.5%) / 0.2), 0 0 12px hsl(var(--accent, 246 87% 70.5%) / 0.1)' },
          '50%': { boxShadow: '0 0 0 1px hsl(var(--accent, 246 87% 70.5%) / 0.5), 0 0 24px hsl(var(--accent, 246 87% 70.5%) / 0.25)' },
        }
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s infinite',
        'slide-up':   'slideUp .4s cubic-bezier(.16,1,.3,1) both',
        'shimmer':    'shimmer 2s linear infinite',
        'breathing-glow': 'breathingGlow 3s ease-in-out infinite',
      },
    },
  },
  plugins: [animate],
}
export default config
