'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { KeyRound, ShieldAlert, Copy, Check, Sparkles, Loader2, Eye, EyeOff } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'

export interface DirectPasswordResetTarget {
  user_id: number
  name?: string
  username?: string
  email?: string
}

interface DirectPasswordResetModalProps {
  isOpen: boolean
  onClose: () => void
  trader: DirectPasswordResetTarget | null
  onSuccess?: () => void
}

function generateRandomPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*'
  let pw = 'Fx'
  for (let i = 0; i < 10; i++) {
    pw += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return pw
}

export function DirectPasswordResetModal({
  isOpen,
  onClose,
  trader,
  onSuccess,
}: DirectPasswordResetModalProps) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successPassword, setSuccessPassword] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setPassword(generateRandomPassword())
      setSuccessPassword(null)
      setCopied(false)
      setShowPassword(false)
    }
  }, [isOpen, trader])

  if (!trader) return null

  const handleSetPassword = async () => {
    if (!password.trim() || password.length < 4) {
      toast.error('Password must be at least 4 characters.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await api.admin.userResetPassword(trader.user_id, password.trim())
      if (res.ok) {
        setSuccessPassword(password.trim())
        toast.success(`Password for ${trader.username || trader.name || 'trader'} updated!`)
        if (onSuccess) onSuccess()
      } else {
        toast.error(res.error || 'Failed to update password')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopy = () => {
    if (successPassword) {
      navigator.clipboard.writeText(successPassword)
      setCopied(true)
      toast.success('Password copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      title={
        <div className="flex items-center gap-2 text-slate-100">
          <KeyRound className="h-5 w-5 text-amber-400" />
          <span>Direct Password Reset (Local / Offline)</span>
        </div>
      }
      description={
        <span className="text-xs text-slate-400">
          Instantly set a new login password for this trader without requiring SMTP email delivery.
        </span>
      }
    >
      <div className="space-y-4 pt-2">
        {/* Trader Target Summary */}
        <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-3 space-y-1 text-xs">
          <div className="flex justify-between text-slate-300">
            <span className="text-slate-500 font-medium">Trader:</span>
            <span className="font-semibold text-slate-200">{trader.name || trader.username || `User #${trader.user_id}`}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span className="text-slate-500 font-medium">Username:</span>
            <span className="font-mono text-emerald-400">{trader.username || `user_${trader.user_id}`}</span>
          </div>
          {trader.email && (
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-500 font-medium">Email:</span>
              <span className="font-mono text-slate-400">{trader.email}</span>
            </div>
          )}
        </div>

        {/* Success Confirmation Card */}
        {successPassword ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
              <Check className="h-4 w-4" />
              <span>Password Changed Successfully!</span>
            </div>
            <p className="text-xs text-slate-300">
              The trader can now log in immediately with this new password.
            </p>
            <div className="flex items-center justify-between bg-black/60 border border-emerald-500/20 rounded-lg px-3 py-2">
              <span className="font-mono text-base font-bold text-emerald-300 tracking-wider">
                {successPassword}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                onClick={handleCopy}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </Button>
            </div>
            <div className="pt-2">
              <Button className="w-full" variant="primary" onClick={onClose}>
                Done / Close
              </Button>
            </div>
          </div>
        ) : (
          /* Form Input */
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">New Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password..."
                  className="bg-black/50 border-slate-700 pr-20 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-amber-400 hover:text-amber-300 gap-1.5 p-0"
                onClick={() => setPassword(generateRandomPassword())}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Generate Strong Password
              </Button>
            </div>

            <div className="rounded-lg bg-amber-950/20 border border-amber-500/20 p-2.5 flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-300/90 leading-tight">
                This writes the hashed password directly to WordPress database. No email is sent or needed.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="ghost" className="flex-1" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white gap-2 font-semibold"
                onClick={handleSetPassword}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4" />
                    Set Password Directly
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
