'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Toaster } from 'sonner'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Data is considered fresh for 5 minutes
        staleTime: 5 * 60 * 1000,
        // Keep data in cache for 10 minutes
        gcTime: 10 * 60 * 1000,
        // Retry failed requests only once to avoid delays
        retry: 1,
        // Faster retry delay
        retryDelay: 500,
        // Don't refetch on window focus to avoid unnecessary requests
        refetchOnWindowFocus: false,
        // Use error boundary for error handling
        throwOnError: false,
      },
      mutations: {
        // Retry failed mutations once
        retry: 1,
        // Use error boundary for mutation errors
        throwOnError: false,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        {children}
        <Toaster position="bottom-center" richColors />
      </ErrorBoundary>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}