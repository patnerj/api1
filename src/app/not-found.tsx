import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-surface border border-border-subtle rounded-xl p-8 text-center shadow-lg">
        <div className="w-16 h-16 bg-accent/10 text-accent rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-text mb-3">Page Not Found</h2>
        <p className="text-text-muted mb-8 text-sm">
          We couldn't find the page you were looking for. It may have been moved, deleted, or never existed.
        </p>
        <Link href="/">
          <Button className="bg-accent text-white hover:bg-accent-hover w-full sm:w-auto">
            Return to Homepage
          </Button>
        </Link>
      </div>
    </div>
  )
}
