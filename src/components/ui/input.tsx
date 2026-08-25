'use client'

import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '@/lib/cn'

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      'flex h-10 w-full rounded-lg border border-[#1F2937] bg-[#0B0F19] px-3.5 py-2 text-sm text-gray-100 shadow-sm transition-all duration-150',
      'placeholder:text-gray-500',
      'focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 hover:border-gray-700',
      'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-[#1F2937]',
      'file:border-0 file:bg-transparent file:text-sm file:font-medium',
      className,
    )}
    {...props}
  />
))
Input.displayName = 'Input'

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-[90px] w-full rounded-lg border border-[#1F2937] bg-[#0B0F19] px-3.5 py-2.5 text-sm text-gray-100 shadow-sm transition-all duration-150',
      'placeholder:text-gray-500',
      'focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 hover:border-gray-700',
      'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-[#1F2937]',
      className,
    )}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn('text-xs font-semibold text-gray-300 leading-none peer-disabled:opacity-70 mb-1.5 block', className)}
    {...props}
  />
))
Label.displayName = 'Label'
