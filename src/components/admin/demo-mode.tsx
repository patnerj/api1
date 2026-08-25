'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { invalidateFxsim } from '@/lib/fxsim'
import type { DemoStatus } from '@/types/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { FlaskConical, Trash2, Sparkles } from 'lucide-react'

/** Clear cached GETs that demo data feeds so screens repopulate immediately. */
function invalidateDemoSurfaces() {
  for (const p of ['/admin/demo/status', '/admin/stats', '/admin/analytics', '/admin/users', '/admin/banners', '/admin/payouts', '/stats/leaderboard', '/banners']) {
    invalidateFxsim(p)
  }
  // Tell any mounted indicator (admin layout persists across pages) to refetch now.
  try { window.dispatchEvent(new Event('fxsim:demo-changed')) } catch { /* SSR */ }
}

export function useDemoStatus(): [DemoStatus | null, () => void] {
  const [st, setSt] = useState<DemoStatus | null>(null)
  const load = () => { api.admin.demoStatus().then((r) => { if (r.ok) setSt(r.data) }) }
  useEffect(() => {
    load()
    window.addEventListener('fxsim:demo-changed', load)
    return () => window.removeEventListener('fxsim:demo-changed', load)
  }, [])
  return [st, load]
}

/** Settings → Advanced: generate / remove demo data. */
export function DemoModeCard() {
  const [st, reload] = useDemoStatus()
  const [busy, setBusy] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const generate = async () => {
    setBusy(true)
    const r = await api.admin.demoGenerate()
    setBusy(false)
    if (r.ok && r.data.success) {
      invalidateDemoSurfaces(); reload()
      toast.success('Sample data loaded')
    } else toast.error(r.ok ? (r.data.message || 'Could not load sample data') : r.error)
  }

  const remove = async () => {
    setConfirmOpen(false)
    setBusy(true)
    const r = await api.admin.demoRemove()
    setBusy(false)
    if (r.ok && r.data.success) { invalidateDemoSurfaces(); reload(); toast.success('Sample data removed') }
    else toast.error(r.ok ? (r.data.message || 'Removal failed') : r.error)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FlaskConical className="h-4 w-4 text-accent" /> Sample dataset</CardTitle>
        <p className="text-2xs text-text-muted mt-1">
          Load a realistic sample dataset — traders, challenges, revenue, certificates, and payout requests — to explore or
          present the platform. Everything is tracked and removed exactly when you clear it.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {st?.active ? (
          <>
            <div className="text-sm">
              <span className="inline-flex items-center gap-1.5 text-success font-medium"><Sparkles className="h-4 w-4" /> Sample Data Loaded</span>
            </div>
            <p className="text-2xs text-text-muted">A sample dataset is active so you can explore the platform with realistic content. Remove it before taking real customers, so your live metrics start clean.</p>
            <Button variant="outline" onClick={() => setConfirmOpen(true)} loading={busy} className="text-danger border-danger/40 hover:bg-danger-muted">
              {!busy && <Trash2 className="h-4 w-4" />} Remove Sample Data
            </Button>
          </>
        ) : (
          <Button onClick={generate} loading={busy}>
            {!busy && <Sparkles className="h-4 w-4" />} Load Sample Data
          </Button>
        )}
      </CardContent>
    
      <Dialog open={confirmOpen} onOpenChange={(o) => { if (!busy) setConfirmOpen(o) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Sample Data</DialogTitle>
            <DialogDescription>
              This removes the sample dataset and returns the platform to a clean state. Your real users, orders, and settings are not affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={remove} loading={busy} className="bg-danger hover:bg-danger/90">Remove Sample Data</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
