'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'
import { Loader2 } from 'lucide-react'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50 disabled:pointer-events-none select-none active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary:     'bg-accent hover:bg-accent-hover text-slate-950 font-semibold shadow-sm hover:shadow-[0_0_20px_var(--accent-glow)]',
        secondary:   'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-sm',
        destructive: 'bg-red-600 hover:bg-red-500 text-white shadow-sm',
        danger:      'bg-red-600 hover:bg-red-500 text-white shadow-sm',
        ghost:       'text-slate-300 hover:text-white hover:bg-slate-800/60',
        outline:     'bg-transparent text-slate-200 border border-slate-700 hover:bg-slate-800/50 hover:border-slate-600',
        success:     'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm',
        buy:         'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm font-semibold',
        sell:        'bg-red-600 hover:bg-red-500 text-white shadow-sm font-semibold',
        link:        'text-accent hover:text-accent-hover underline-offset-4 hover:underline px-0',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        xl: 'h-14 px-8 text-base',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
            {children}
          </>
        )}
      </Comp>
    )
  },
)
Button.displayName = 'Button'
