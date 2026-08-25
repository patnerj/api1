'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Fatal Global Error:', error)
  }, [error])

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-background p-4 font-sans">
          <div className="max-w-md w-full bg-surface border border-border-subtle rounded-xl p-8 text-center shadow-lg">
            <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-text">Fatal Application Error</h2>
            <p className="text-text-muted mb-8 text-sm">
              We encountered a critical error. Please reload the page to recover.
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => window.location.reload()} variant="outline">
                Reload Page
              </Button>
              <Button onClick={() => reset()} className="bg-accent text-white hover:bg-accent-hover">
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
