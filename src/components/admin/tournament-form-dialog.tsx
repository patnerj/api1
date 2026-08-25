'use client'

import { useState } from 'react'
import type { Competition } from '@/types/api'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'

interface TournamentFormDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<Competition>) => Promise<void>
  initialData?: Competition
}

export function TournamentFormDialog({ isOpen, onClose, onSave, initialData }: TournamentFormDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Partial<Competition>>({
    name: initialData?.name || initialData?.title || '',
    title: initialData?.title || initialData?.name || '',
    description: initialData?.description || '',
    start_date: initialData?.start_date || '',
    end_date: initialData?.end_date || '',
    prize_pool: initialData?.prize_pool || '',
    status: initialData?.status || 'upcoming',
    starting_balance: initialData?.starting_balance || initialData?.initial_balance || 100000,
    initial_balance: initialData?.initial_balance || initialData?.starting_balance || 100000,
    entry_fee: initialData?.entry_fee || 0,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSave(formData)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Edit Tournament' : 'Create Tournament'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-text-muted">Name</Label>
            <Input 
              required
              type="text" 
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-text-muted">Description</Label>
            <Textarea 
              rows={3}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-text-muted">Start Date</Label>
              <Input 
                required
                type="date" 
                value={formData.start_date?.split('T')[0] || ''}
                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-text-muted">End Date</Label>
              <Input 
                required
                type="date" 
                value={formData.end_date?.split('T')[0] || ''}
                onChange={e => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-text-muted">Initial Balance ($)</Label>
              <Input 
                required
                type="number" 
                value={formData.initial_balance || ''}
                onChange={e => setFormData({ ...formData, initial_balance: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-text-muted">Entry Fee ($)</Label>
              <Input 
                required
                type="number" 
                value={formData.entry_fee || 0}
                onChange={e => setFormData({ ...formData, entry_fee: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-text-muted">Status</Label>
              <select
                className="w-full bg-surface-muted border border-border rounded-md px-3 py-2 text-sm text-text focus:outline-none focus:ring-1 focus:ring-accent"
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
              >
                <option value="upcoming">Upcoming</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-text-muted">Prize Pool Text</Label>
            <Input 
              required
              type="text" 
              placeholder="e.g. $10,000 + 3 Funded Accounts"
              value={formData.prize_pool}
              onChange={e => setFormData({ ...formData, prize_pool: e.target.value })}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
            >
              Save Tournament
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
