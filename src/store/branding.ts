'use client'

import { create } from 'zustand'
import { api } from '@/lib/api'
import { invalidateFxsim } from '@/lib/fxsim'

export interface Branding {
  brand_name: string
  brand_tagline: string
  logo_url: string
  sidebar_icon_url: string
  login_logo_url: string
  favicon_url: string
  support_email: string
  primary_color: string
  secondary_color: string
  footer_text: string
  /** Platform→TradingView chart symbol overrides (JSON object string, V10.5). */
  tv_symbol_map: string
}

const DEFAULTS: Branding = {
  brand_name: 'LaunchAPropFirm',
  brand_tagline: 'The Funded Trader Platform',
  logo_url: '', sidebar_icon_url: '', login_logo_url: '', favicon_url: '',
  support_email: '', primary_color: '', secondary_color: '', footer_text: '', tv_symbol_map: '',
}

interface BrandingState {
  branding: Branding
  loaded: boolean
  load: () => Promise<void>
  reload: () => Promise<void>
  set: (b: Partial<Branding>) => void
}

let loadPromise: Promise<void> | null = null

export const useBranding = create<BrandingState>((set, get) => ({
  branding: DEFAULTS,
  loaded: false,
  load: async () => {
    if (get().loaded || loadPromise) return loadPromise ?? Promise.resolve()
    loadPromise = (async () => {
      const res = await api.branding()
      if (res.ok) {
        const b = { ...DEFAULTS, ...res.data }
        set({ branding: b, loaded: true })
        applyDocumentBranding(b)
      } else {
        set({ loaded: true })
      }
    })().finally(() => { loadPromise = null })
    return loadPromise
  },
  // Used by the admin previewer to reflect unsaved edits live.
  set: (b) => {
    const next = { ...get().branding, ...b }
    set({ branding: next })
    applyDocumentBranding(next)
  },
  // Re-fetch from the server, bypassing the one-shot `loaded` guard. Called
  // after an admin saves branding so the global store (sidebar/login/title/
  // favicon) reconciles with the persisted values — no hard refresh, no route
  // change, and no reversion to the previously-cached branding.
  reload: async () => {
    invalidateFxsim('/branding')          // drop the 60s public cache so we read fresh
    const res = await api.branding()
    if (res.ok) {
      const b = { ...DEFAULTS, ...res.data }
      set({ branding: b, loaded: true })
      applyDocumentBranding(b)
    }
  },
}))

/** Apply title + favicon at runtime (true white-label without rebuild). */
function applyDocumentBranding(b: Branding) {
  if (typeof document === 'undefined') return
  if (b.brand_name) document.title = b.brand_name
  if (b.favicon_url) {
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']")
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = b.favicon_url
  }
}
