'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from './dialog'
import { Button } from './button'
import { AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface ConfirmDialogProps {
  isOpen: boolean
  title: React.ReactNode
  description?: React.ReactNode
  confirmText?: string
  cancelText?: string
  isDestructive?: boolean
  loading?: boolean
  onConfirm: () => void | Promise<void>
  onCancel: () => void
  className?: string
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  loading = false,
  onConfirm,
  onCancel,
  className
}: ConfirmDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !loading) onCancel() }}>
      <DialogContent className={cn('max-w-md bg-[#111827] border-[#1F2937] text-white p-6 shadow-2xl rounded-2xl', className)}>
        <div className="flex items-start gap-4">
          <div className={cn(
            'h-10 w-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
            isDestructive 
              ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          )}>
            {isDestructive ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <HelpCircle className="h-5 w-5" />
            )}
          </div>

          <div className="space-y-1.5 flex-1">
            <DialogTitle className="text-base font-bold text-white tracking-tight">
              {title}
            </DialogTitle>
            {description && (
              <DialogDescription className="text-xs text-gray-400 leading-relaxed">
                {description}
              </DialogDescription>
            )}
          </div>
        </div>

        <DialogFooter className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-[#1F2937]/70">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={onCancel}
            className="border-[#1F2937] text-gray-300 hover:bg-[#1A2234] hover:text-white text-xs h-9 px-4"
          >
            {cancelText}
          </Button>

          <Button
            type="button"
            variant={isDestructive ? 'destructive' : 'primary'}
            size="sm"
            loading={loading}
            onClick={onConfirm}
            className={cn(
              'text-xs font-semibold h-9 px-4',
              isDestructive 
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20' 
                : 'shadow-emerald-500/20'
            )}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
