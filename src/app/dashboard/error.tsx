'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service in production
    console.error('Dashboard Error Boundary caught:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
      <div className="h-16 w-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mb-6">
        <AlertCircle className="h-8 w-8" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight mb-2">Something went wrong</h2>
      <p className="text-text-muted max-w-md mb-4">
        We encountered an unexpected error while loading this page. Our team has been notified.
      </p>
      {/* DEBUG: surface the actual error so it can be reported — remove before public launch */}
      <pre className="text-xs text-danger bg-danger/5 border border-danger/20 rounded-lg p-3 max-w-xl overflow-x-auto mb-6 whitespace-pre-wrap text-left">
        {error?.message || 'Unknown error'}
        {error?.digest ? `\ndigest: ${error.digest}` : ''}
      </pre>
      <div className="flex gap-4">
        <Button onClick={() => window.location.reload()} variant="outline">
          Reload Page
        </Button>
        <Button onClick={() => reset()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    </div>
  )
}
