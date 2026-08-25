'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/store/auth'
import { useImpersonation } from '@/store/impersonation'
import { Sidebar } from '@/components/admin/Sidebar'
import { Header } from '@/components/admin/Header'
import { TradingScreenLoader } from '@/components/ui/trading-loader'
import { cn } from '@/lib/cn'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, ready } = useAuth()
  const impersonating = useImpersonation((s) => s.record)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  // Auth & Impersonation Guard
  useEffect(() => {
    if (!ready) return
    // Re-verify the role against the SERVER on every admin mount — never trust
    // cached client state for an authorization decision.
    void useAuth.getState().refresh(true)
    if (!user) {
      router.replace('/login')
      return
    }
    if (impersonating || !user.is_admin) {
      router.replace('/dashboard')
    }
  }, [ready, user, impersonating, router])

  if (!ready || !user || !user.is_admin || impersonating) {
    return (
      <TradingScreenLoader
        label="Checking your session"
        subtitle="Verifying access permissions..."
      />
    )
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-100 flex flex-col lg:flex-row antialiased">
      
      {/* Desktop Sidebar (Persistent) */}
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="hidden lg:flex fixed inset-y-0 left-0"
      />

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity" 
            onClick={() => setMobileSidebarOpen(false)}
          />
          <Sidebar 
            collapsed={false}
            onMobileClose={() => setMobileSidebarOpen(false)}
            className="relative z-50 w-72 h-full shadow-2xl"
          />
        </div>
      )}

      {/* Main Content Wrapper */}
      <div 
        className={cn(
          "flex-1 flex flex-col min-h-screen w-full transition-all duration-300",
          sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
        )}
      >
        {/* Global Top Header */}
        <Header onMobileMenuToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)} />

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

    </div>
  )
}
