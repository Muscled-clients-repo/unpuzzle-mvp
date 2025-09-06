'use client'

import { useQueryErrorResetBoundary } from '@tanstack/react-query'
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface ErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
}

function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div className="flex min-h-[400px] w-full items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="mb-4 flex justify-center">
          <AlertCircle className="h-12 w-12 text-red-500" />
        </div>
        
        <h2 className="mb-2 text-2xl font-bold text-gray-900">
          Something went wrong
        </h2>
        
        <p className="mb-4 text-gray-600">
          {error.message || 'An unexpected error occurred while loading this content.'}
        </p>
        
        {process.env.NODE_ENV === 'development' && (
          <details className="mb-4 text-left">
            <summary className="cursor-pointer text-sm text-gray-500">
              Error details
            </summary>
            <pre className="mt-2 overflow-auto rounded bg-gray-100 p-2 text-xs">
              {error.stack}
            </pre>
          </details>
        )}
        
        <button
          onClick={resetErrorBoundary}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      </div>
    </div>
  )
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
  onReset?: () => void
  resetKeys?: Array<string | number>
}

export function ErrorBoundary({ 
  children, 
  fallback = ErrorFallback,
  onReset,
  resetKeys 
}: ErrorBoundaryProps) {
  const { reset } = useQueryErrorResetBoundary()
  
  return (
    <ReactErrorBoundary
      FallbackComponent={fallback}
      onReset={() => {
        reset()
        onReset?.()
      }}
      resetKeys={resetKeys}
    >
      {children}
    </ReactErrorBoundary>
  )
}

// Specific error boundary for course-related errors
export function CourseErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      onReset={() => {
        // Could add course-specific reset logic here
        console.log('Resetting course error boundary')
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

// Specific error boundary for video-related errors
export function VideoErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={({ error, resetErrorBoundary }) => (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-red-900">
                Video Loading Error
              </h3>
              <p className="mt-1 text-sm text-red-700">
                {error.message || 'Failed to load video content'}
              </p>
              <button
                onClick={resetErrorBoundary}
                className="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  )
}