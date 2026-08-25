'use client'

import * as React from 'react'
import { cn } from '@/lib/cn'

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto rounded-xl border border-[#1F2937] bg-[#111827] shadow-sm">
    <table
      ref={ref}
      className={cn('w-full caption-bottom text-sm text-gray-200', className)}
      {...props}
    />
  </div>
))
Table.displayName = 'Table'

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead 
    ref={ref} 
    className={cn('bg-[#0B0F19]/80 border-b border-[#1F2937] text-xs font-bold text-gray-400 uppercase tracking-wider', className)} 
    {...props} 
  />
))
TableHeader.displayName = 'TableHeader'

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn('divide-y divide-[#1F2937]/60 [&_tr:last-child]:border-0', className)}
    {...props}
  />
))
TableBody.displayName = 'TableBody'

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      'border-b border-[#1F2937]/50 transition-colors hover:bg-slate-800/40 data-[state=selected]:bg-slate-800/60',
      className
    )}
    {...props}
  />
))
TableRow.displayName = 'TableRow'

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'center' | 'right'; hideOn?: 'sm' | 'md' | 'lg' }
>(({ className, align = 'left', hideOn, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'h-11 px-4 text-left align-middle text-[11px] font-bold uppercase tracking-wider text-gray-400 [&:has([role=checkbox])]:pr-0',
      align === 'center' && 'text-center',
      align === 'right' && 'text-right',
      hideOn === 'sm' && 'hidden sm:table-cell',
      hideOn === 'md' && 'hidden md:table-cell',
      hideOn === 'lg' && 'hidden lg:table-cell',
      className
    )}
    {...props}
  />
))
TableHead.displayName = 'TableHead'

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'center' | 'right'; hideOn?: 'sm' | 'md' | 'lg' }
>(({ className, align = 'left', hideOn, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      'p-4 align-middle text-sm text-gray-200 [&:has([role=checkbox])]:pr-0',
      align === 'center' && 'text-center',
      align === 'right' && 'text-right',
      hideOn === 'sm' && 'hidden sm:table-cell',
      hideOn === 'md' && 'hidden md:table-cell',
      hideOn === 'lg' && 'hidden lg:table-cell',
      className
    )}
    {...props}
  />
))
TableCell.displayName = 'TableCell'

export {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
}
