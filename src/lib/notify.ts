import { toast } from 'sonner'
import type { ApiResult } from '@/types/api'

export const notify = {
  success: (message: string) => {
    toast.success(message)
  },
  error: (message: string) => {
    toast.error(message)
  },
  info: (message: string) => {
    toast.info(message)
  },
  warning: (message: string) => {
    toast.warning(message)
  },

  /**
   * Standard helper to handle ApiResult<T> and show toast notifications automatically.
   * Returns true if request succeeded (res.ok === true), false otherwise.
   */
  apiResult: <T>(
    result: ApiResult<T>,
    options?: {
      successMessage?: string
      errorMessage?: string
      onSuccess?: (data: T) => void
      onError?: (error: string) => void
    }
  ): boolean => {
    if (result.ok) {
      if (options?.successMessage) {
        toast.success(options.successMessage)
      }
      options?.onSuccess?.(result.data)
      return true
    } else {
      const msg = options?.errorMessage || result.error || 'An unexpected error occurred'
      toast.error(msg)
      options?.onError?.(result.error)
      return false
    }
  },
}
