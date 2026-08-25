'use client'

import { useEffect } from 'react'

/**
 * Admin-configurable live chat. Provider + widget ID come from build-time env
 * vars so this is purely frontend (no backend, API, or schema change):
 *
 *   NEXT_PUBLIC_CHAT_PROVIDER = tawk | crisp | chatwoot   (empty = disabled)
 *   NEXT_PUBLIC_CHAT_ID       = the provider widget/property/website ID
 *   NEXT_PUBLIC_CHATWOOT_URL  = (chatwoot only) base URL of the Chatwoot install
 *
 * Renders nothing when no provider is configured, so default installs are
 * unaffected and there is zero performance cost unless the operator opts in.
 */
export function LiveChat() {
  useEffect(() => {
    const provider = (process.env.NEXT_PUBLIC_CHAT_PROVIDER || '').toLowerCase().trim()
    const id = (process.env.NEXT_PUBLIC_CHAT_ID || '').trim()
    if (!provider || !id) return
    if (document.getElementById('fxsim-livechat')) return // guard against double-inject

    const mark = (el: HTMLScriptElement) => { el.id = 'fxsim-livechat'; el.async = true }

    if (provider === 'tawk') {
      const s = document.createElement('script')
      mark(s)
      s.src = `https://embed.tawk.to/${id}/default`
      s.charset = 'UTF-8'
      s.setAttribute('crossorigin', '*')
      document.body.appendChild(s)
    } else if (provider === 'crisp') {
      ;(window as unknown as { $crisp: unknown[] }).$crisp = []
      ;(window as unknown as { CRISP_WEBSITE_ID: string }).CRISP_WEBSITE_ID = id
      const s = document.createElement('script')
      mark(s)
      s.src = 'https://client.crisp.chat/l.js'
      document.head.appendChild(s)
    } else if (provider === 'chatwoot') {
      const base = (process.env.NEXT_PUBLIC_CHATWOOT_URL || 'https://app.chatwoot.com').replace(/\/+$/, '')
      const s = document.createElement('script')
      mark(s)
      s.src = `${base}/packs/js/sdk.js`
      s.defer = true
      s.onload = () => {
        const w = window as unknown as { chatwootSDK?: { run: (o: { websiteToken: string; baseUrl: string }) => void } }
        w.chatwootSDK?.run({ websiteToken: id, baseUrl: base })
      }
      document.body.appendChild(s)
    }
    // No cleanup: chat widgets are meant to persist for the session, and
    // re-mounting is guarded above.
  }, [])

  return null
}
