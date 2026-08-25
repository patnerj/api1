'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Eye, LogOut, ShieldAlert } from 'lucide-react'
import { useImpersonation } from '@/store/impersonation'
import { useAuth } from '@/store/auth'
import { api } from '@/lib/api'
import { setSession, clearFxsimCache } from '@/lib/fxsim'

export function ImpersonationBanner() {
  const router  = useRouter()
  const record  = useImpersonation((s) => s.record)
  const endImp  = useImpersonation((s) => s.end)
  const refresh = useAuth((s) => s.refresh)
  const signout = useAuth((s) => s.signout)

  if (!record) return null

  const exit = async () => {
    const res = await api.admin.impersonateStop()
    if (res.ok && res.data.success) {
      // Admin auth cookie has been restored server-side. Adopt the fresh nonce
      // and re-load the session as the admin — no logout.
      if (res.data.nonce) setSession({ nonce: res.data.nonce, bearer: null })
      endImp()
      // Drop every cached GET fetched as the impersonated trader (account,
      // positions, dashboard, etc.) so the restored admin session shows its
      // own data immediately — no hard refresh.
      clearFxsimCache()
      await refresh(true)
      toast.success(`Returned to your admin account (${record.admin_username}).`)
      router.replace('/admin')
    } else {
      // Fallback: if the session couldn't be restored, fail safe to login.
      endImp()
      await signout()
      toast.error('Could not restore your admin session — please sign in again.')
      router.replace('/login')
    }
  }

  return (
    <div className="sticky top-0 z-40 bg-warn text-bg shadow-card">
      <div className="px-4 md:px-8 h-9 flex items-center gap-2 text-2xs sm:text-xs">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        <Eye className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">
          Viewing as <b>{record.target_username}</b> · admin <b>{record.admin_username}</b>
        </span>
        <button
          onClick={exit}
          className="ml-auto inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-bg/20 hover:bg-bg/30 transition-colors font-medium shrink-0"
        >
          <LogOut className="h-3 w-3" />
          Exit
        </button>
      </div>
    </div>
  )
}
