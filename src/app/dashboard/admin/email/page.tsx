'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Send, Users, CheckCircle2, AlertTriangle } from 'lucide-react'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/cn'

type Segment = 'all' | 'active' | 'funded' | 'failed'

const SEGMENTS: { key: Segment; label: string; hint: string }[] = [
  { key: 'all',    label: 'All users',       hint: 'Every registered account' },
  { key: 'active', label: 'Active challenge', hint: 'In an evaluation phase' },
  { key: 'funded', label: 'Funded',          hint: 'Funded traders' },
  { key: 'failed', label: 'Failed',          hint: 'Breached / failed accounts' },
]

export default function AdminBroadcastPage() {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [segment, setSegment] = useState<Segment>('all')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ sent: number; errors: number } | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const send = () => {
    if (!subject.trim() || !message.trim()) { toast.error('Subject and message are required.'); return }
    setConfirmOpen(true)
  }

  const doSend = async () => {
    setConfirmOpen(false)
    setBusy(true)
    setResult(null)
    const res = await api.admin.bulkEmail(subject.trim(), message.trim(), segment)
    setBusy(false)
    if (res.ok && res.data.success) {
      setResult({ sent: res.data.sent, errors: res.data.errors })
      toast.success(`Sent to ${res.data.sent} recipient${res.data.sent === 1 ? '' : 's'}.`)
      setSubject(''); setMessage('')
    } else {
      toast.error(res.ok ? 'Send failed.' : (res.error || 'Send failed.'))
    }
  }

  return (
    <div className="max-w-2xl space-y-6 mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Broadcast email</h1>
        <p className="text-sm text-text-muted mt-1">
          Send a branded announcement to a segment of your users. Use <code className="text-accent">{'{name}'}</code> to personalise with each recipient&apos;s name.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Recipients</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {SEGMENTS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSegment(s.key)}
                className={cn(
                  'text-left rounded-lg border px-3 py-2.5 transition-colors focus-ring',
                  segment === s.key ? 'border-accent bg-accent-muted/40' : 'border-border-subtle hover:bg-surface-muted',
                )}
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Users className="h-3.5 w-3.5 text-text-muted" /> {s.label}
                </div>
                <div className="text-2xs text-text-muted mt-0.5">{s.hint}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Message</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="bc-subject">Subject</Label>
            <Input id="bc-subject" value={subject} onChange={(e) => setSubject(e.target.value)}
              placeholder="Platform update" className="mt-1 text-lg font-medium py-2 h-11" maxLength={150} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label htmlFor="bc-message">Body</Label>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-6 px-2 text-2xs text-text-muted">{'< >'} HTML</Button>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-2xs text-text-muted">Aa Formatting</Button>
              </div>
            </div>
            <div className="relative rounded-lg border border-border-subtle bg-surface focus-within:ring-1 focus-within:ring-accent focus-within:border-accent overflow-hidden shadow-sm transition-all duration-200">
              <div className="flex items-center gap-1 border-b border-border-subtle bg-surface-muted px-2 py-1.5 overflow-x-auto">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Bold"><span className="font-bold">B</span></Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Italic"><span className="italic">I</span></Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Underline"><span className="underline">U</span></Button>
                <div className="w-px h-4 bg-border mx-1" />
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Insert Variable" onClick={() => setMessage(prev => prev + '{name}')}>
                  <code className="text-2xs text-accent">{"{ }"}</code>
                </Button>
              </div>
              <textarea
                id="bc-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={12}
                placeholder={'Hi {name},\n\nWe just shipped…'}
                className="w-full bg-transparent px-4 py-3 text-sm focus:outline-none placeholder:text-text-faint resize-y min-h-[200px]"
              />
            </div>
            <p className="text-2xs text-text-faint mt-2 flex items-center justify-between">
              <span>Basic HTML is allowed. Wrapped automatically in your branded email template.</span>
              <span className="font-mono">{message.length} chars</span>
            </p>
          </div>

          {result && (
            <div className="rounded-lg border border-border-subtle p-3 text-sm flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5 text-success">
                <CheckCircle2 className="h-4 w-4" /> {result.sent} sent
              </span>
              {result.errors > 0 && (
                <span className="inline-flex items-center gap-1.5 text-warn">
                  <AlertTriangle className="h-4 w-4" /> {result.errors} failed
                </span>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={send} disabled={busy}>
              <Send className="h-4 w-4" /> {busy ? 'Sending…' : 'Send broadcast'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send broadcast email?</DialogTitle>
            <DialogDescription>
              This will email the <span className="text-text font-medium">{SEGMENTS.find((s) => s.key === segment)?.label}</span> segment. This action can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={doSend}><Send className="h-4 w-4" /> Send broadcast</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
