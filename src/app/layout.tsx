import type { Metadata, Viewport } from 'next'
import { cookies } from 'next/headers'
import { 
  Poppins, 
  Inter, 
  Plus_Jakarta_Sans, 
  Outfit, 
  Manrope, 
  Space_Grotesk, 
  Urbanist,
  JetBrains_Mono 
} from 'next/font/google'

import './globals.css'
import { Providers } from '@/components/providers'
import { LiveChat } from '@/components/marketing/live-chat'
import { CommandPalette } from '@/components/ui/command-palette'
import { ThemeSettings } from '@/types/api'

// ── Google Font Initializations (Zero layout shift & optimized) ──
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
})

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta',
  display: 'swap',
})

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-outfit',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

const urbanist = Urbanist({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-urbanist',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains',
  display: 'swap',
})

export async function generateMetadata(): Promise<Metadata> {
  let brandName = 'LaunchAPropFirm'
  let brandTagline = 'The Funded Trader Platform'
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)
    
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || ''
    const apiPath = process.env.NEXT_PUBLIC_FXSIM_API || ''
    
    const res = await fetch(`${baseUrl}${apiPath}/branding`, { 
      next: { revalidate: 60 },
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)

    if (res.ok) {
      const data = await res.json()
      if (data.brand_name) brandName = data.brand_name
      if (data.brand_tagline) brandTagline = data.brand_tagline
    }
  } catch (e) {
    // silently fallback on timeout or fetch error
  }

  return {
    title:       { default: brandName, template: '%s' },
    description: `${brandTagline}. Pass the evaluation, trade our capital, keep up to 90% of your profits.`,
    applicationName: brandName,
    openGraph: {
      title:       brandName,
      description: `${brandTagline}. Pass the evaluation, trade our capital, keep up to 90% of your profits.`,
      type:        'website',
    },
    twitter: { card: 'summary_large_image' },
    icons: { icon: '/favicon.svg' },
    manifest: '/manifest.json',
  }
}

export const viewport: Viewport = {
  themeColor:   '#060a12',
  width:        'device-width',
  initialScale: 1,
}

// Simple HEX to HSL converter for SSR
function hexToHsl(hex: string): string {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

async function getThemeCSS() {
  const apiPath = process.env.NEXT_PUBLIC_FXSIM_API || '/api/wp'
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ''
  
  const urlsToTry: string[] = []
  if (siteUrl) {
    urlsToTry.push(`${siteUrl}${apiPath}/theme`)
  }
  urlsToTry.push(`http://127.0.0.1:3000${apiPath}/theme`)
  urlsToTry.push(`http://propfirm.local/wp-json/fxsim/v1/theme`)

  for (const fetchUrl of urlsToTry) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2000)
      
      const res = await fetch(fetchUrl, { 
        next: { revalidate: 10 },
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (res.ok) {
        const data: ThemeSettings = await res.json()
        if (data && data.primaryColor) {
          const accentHsl = hexToHsl(data.primaryColor);
          const foreground = data.primaryForeground || '#ffffff';
          const fontFamily = data.fontFamily || 'var(--font-poppins), Poppins, sans-serif';
          return `
            :root { --accent: ${accentHsl}; --accent-hover: ${accentHsl}; --font-sans: ${fontFamily}; }
            .dark { --accent: ${accentHsl}; --accent-hover: ${accentHsl}; }
            body, html { font-family: ${fontFamily} !important; }
            .bg-primary { color: ${foreground} !important; }
          `;
        }
      }
    } catch (e) {
      // try next url in fallback list
    }
  }
  return '';
}

/**
 * Sanitize a theme value before splicing it into a CSS string. The theme
 * cookie is client-writable, so an unsanitized fontFamily/primaryForeground
 * is a persistent CSS-injection sink (e.g. `x} body{background:url(//evil)}`).
 * Allow only a safe charset and cap length; anything else falls back.
 */
function safeCssValue(v: unknown, fallback: string): string {
  const s = typeof v === 'string' ? v.trim() : ''
  return /^[a-zA-Z0-9 _#%(),.'"-]{1,120}$/.test(s) ? s : fallback
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let themeCss = '';
  try {
    const cookieStore = await cookies();
    const rawCookie = cookieStore.get('fxsim-theme-data')?.value;
    if (rawCookie) {
      const decoded = decodeURIComponent(rawCookie);
      const data: ThemeSettings = JSON.parse(decoded);
      if (data && data.primaryColor) {
        const accentHsl = hexToHsl(data.primaryColor);
        const foreground = safeCssValue(data.primaryForeground, '#ffffff');
        const fontFamily = safeCssValue(data.fontFamily, 'var(--font-poppins), Poppins, sans-serif');
        themeCss = `
          :root { --accent: ${accentHsl}; --accent-hover: ${accentHsl}; --font-sans: ${fontFamily}; }
          .dark { --accent: ${accentHsl}; --accent-hover: ${accentHsl}; }
          body, html { font-family: ${fontFamily} !important; }
          .bg-primary { color: ${foreground} !important; }
        `;
      }
    }
  } catch (e) {
    // silent fail
  }

  if (!themeCss) {
    themeCss = await getThemeCSS();
  }

  const fontVariables = [
    poppins.variable,
    plusJakarta.variable,
    outfit.variable,
    inter.variable,
    manrope.variable,
    spaceGrotesk.variable,
    urbanist.variable,
    jetbrainsMono.variable,
  ].join(' ')

  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var theme = localStorage.getItem('user-theme') || 'midnight-obsidian';
              document.documentElement.setAttribute('data-theme', theme);

              var savedFont = localStorage.getItem('fxsim:theme-font') || 'poppins';
              var fontMap = {
                'poppins': 'var(--font-poppins), Poppins, system-ui, sans-serif',
                'plus-jakarta': 'var(--font-plus-jakarta), Plus Jakarta Sans, system-ui, sans-serif',
                'outfit': 'var(--font-outfit), Outfit, system-ui, sans-serif',
                'inter': 'var(--font-inter), Inter, system-ui, sans-serif',
                'manrope': 'var(--font-manrope), Manrope, system-ui, sans-serif',
                'space-grotesk': 'var(--font-space-grotesk), Space Grotesk, system-ui, sans-serif',
                'urbanist': 'var(--font-urbanist), Urbanist, system-ui, sans-serif'
              };
              var chosenFont = fontMap[savedFont] || fontMap['poppins'];
              document.documentElement.style.setProperty('--font-sans', chosenFont);

              var data = null;
              var cookies = document.cookie ? document.cookie.split(';') : [];
              for (var i = 0; i < cookies.length; i++) {
                var c = cookies[i].trim();
                if (c.indexOf('fxsim-theme-data=') === 0) {
                  try {
                    var val = c.substring('fxsim-theme-data='.length);
                    data = JSON.parse(decodeURIComponent(val));
                  } catch (e) {}
                  break;
                }
              }

              if (!data) {
                try {
                  var saved = localStorage.getItem('fxsim-theme');
                  if (saved) {
                    data = JSON.parse(saved);
                  }
                } catch (e) {}
              }

              if (data && data.primaryColor) {
                var safeVal = function(v, fb) {
                  if (typeof v !== 'string') return fb;
                  v = v.trim();
                  return (/^[a-zA-Z0-9 _#%(),.'"-]{1,120}$/.test(v) && v) || fb;
                };
                var safeFont = safeVal(data.fontFamily, chosenFont);
                var safeFg = safeVal(data.primaryForeground, '#ffffff');
                var hex = data.primaryColor.replace(/^#/, '');
                if (!/^[0-9a-fA-F]{3}$/.test(hex) && !/^[0-9a-fA-F]{6}$/.test(hex)) { return; }
                if (hex.length === 3) hex = hex.split('').map(function(x){return x+x}).join('');
                var r = parseInt(hex.substring(0, 2), 16) / 255, g = parseInt(hex.substring(2, 4), 16) / 255, b = parseInt(hex.substring(4, 6), 16) / 255;
                var max = Math.max(r, g, b), min = Math.min(r, g, b);
                var h = 0, s = 0, l = (max + min) / 2;
                if (max !== min) {
                  var d = max - min;
                  s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
                  else if (max === g) h = (b - r) / d + 2;
                  else h = (r - g) / d + 4;
                  h /= 6;
                }
                var accentHsl = Math.round(h * 360) + ' ' + Math.round(s * 100) + '% ' + Math.round(l * 100) + '%';
                var styleEl = document.getElementById('fxsim-dynamic-theme-local');
                if (!styleEl) {
                  styleEl = document.createElement('style');
                  styleEl.id = 'fxsim-dynamic-theme-local';
                  document.head.appendChild(styleEl);
                }
                styleEl.innerHTML = ':root { --accent: ' + accentHsl + '; --accent-hover: ' + accentHsl + '; --font-sans: ' + safeFont + '; } .dark { --accent: ' + accentHsl + '; --accent-hover: ' + accentHsl + '; } body, html { font-family: ' + safeFont + ' !important; } .bg-primary { color: ' + safeFg + ' !important; }';
              }
            } catch (e) {}
          })();
        ` }} suppressHydrationWarning />
        <style id="fxsim-dynamic-theme-ssr" dangerouslySetInnerHTML={{ __html: themeCss || '' }} suppressHydrationWarning />
      </head>
      <body className={`min-h-screen antialiased font-sans ${poppins.className}`} style={{ fontFamily: 'var(--font-sans, var(--font-poppins))' }} suppressHydrationWarning>
        <Providers>{children}</Providers>
        <LiveChat />
        <CommandPalette />
      </body>
    </html>
  )
}
