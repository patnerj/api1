'use client'

import * as React from 'react'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from './table'
import { Loader2, Inbox } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface ColumnDef<T> {
  key: string
  header: React.ReactNode
  render?: (row: T, index: number) => React.ReactNode
  align?: 'left' | 'center' | 'right'
  className?: string
  hideOn?: 'sm' | 'md' | 'lg'
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  emptyIcon?: React.ReactNode
  onRowClick?: (row: T) => void
  className?: string
}

export function DataTable<T extends { id?: string | number } | Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No records found.',
  emptyIcon,
  onRowClick,
  className,
}: DataTableProps<T>) {
  return (
    <Table className={className}>
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead 
              key={col.key} 
              align={col.align} 
              hideOn={col.hideOn}
              className={col.className}
            >
              {col.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="h-44 text-center">
              <div className="flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                <span className="text-xs text-gray-400 font-mono">Loading data...</span>
              </div>
            </TableCell>
          </TableRow>
        ) : data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="h-44 text-center">
              <div className="flex flex-col items-center justify-center gap-2 text-gray-500">
                {emptyIcon || <Inbox className="h-8 w-8 text-gray-600" />}
                <span className="text-sm font-medium text-gray-400">{emptyMessage}</span>
              </div>
            </TableCell>
          </TableRow>
        ) : (
          data.map((row, idx) => (
            <TableRow
              key={row.id ?? idx}
              onClick={() => onRowClick?.(row)}
              className={cn(
                onRowClick && 'cursor-pointer hover:bg-slate-800/60 transition-colors'
              )}
            >
              {columns.map((col) => (
                <TableCell 
                  key={col.key} 
                  align={col.align} 
                  hideOn={col.hideOn}
                  className={col.className}
                >
                  {col.render ? col.render(row, idx) : (row as any)[col.key]}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
