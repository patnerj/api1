import * as React from 'react'
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface AlertBannerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger'
  title?: string
  icon?: boolean
}

export function AlertBanner({
  className,
  variant = 'default',
  title,
  icon = true,
  children,
  ...props
}: AlertBannerProps) {
  const Icon = {
    default: Info,
    success: CheckCircle2,
    warning: AlertTriangle,
    danger: AlertCircle,
  }[variant]

  return (
    <div
      role="alert"
      className={cn(
        'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
        {
          'bg-surface-subtle text-text border-border': variant === 'default',
          'bg-danger/10 text-danger border-danger/20 [&>svg]:text-danger': variant === 'danger',
          'bg-success/10 text-success border-success/20 [&>svg]:text-success': variant === 'success',
          'bg-warn/10 text-warn border-warn/20 [&>svg]:text-warn': variant === 'warning',
        },
        className
      )}
      {...props}
    >
      {icon && <Icon className="h-4 w-4" />}
      {title && <h5 className="mb-1 font-medium leading-none tracking-tight">{title}</h5>}
      <div className="text-sm [&_p]:leading-relaxed opacity-90">
        {children}
      </div>
    </div>
  )
}
