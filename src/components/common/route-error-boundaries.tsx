"use client"

import { ErrorBoundary } from "./ErrorBoundary"
import { ReactNode } from "react"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface RouteErrorBoundaryProps {
  children: ReactNode
  routeName: string
}

/**
 * Specialized error fallback for instructor routes
 */
function InstructorErrorFallback({ 
  error, 
  resetError 
}: {
  error: any
  resetError: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md w-full p-6 text-center space-y-4">
        <div className="flex justify-center">
          <AlertCircle className="h-12 w-12 text-red-500" />
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground text-sm mb-4">
            We encountered an error while loading this page. This has been automatically reported.
          </p>
        </div>

        <div className="space-y-2">
          <Button 
            onClick={resetError}
            className="w-full"
            variant="default"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try again
          </Button>
          
          <Button 
            onClick={() => window.location.href = '/instructor'}
            variant="outline"
            className="w-full"
          >
            Return to Dashboard
          </Button>
        </div>
      </Card>
    </div>
  )
}

/**
 * Specialized error fallback for media operations
 */
function MediaErrorFallback({ 
  error, 
  resetError 
}: {
  error: any
  resetError: () => void
}) {
  return (
    <div className="flex items-center justify-center p-8">
      <Card className="max-w-sm w-full p-6 text-center space-y-4">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
        
        <div>
          <h3 className="font-semibold mb-1">Media Error</h3>
          <p className="text-sm text-muted-foreground">
            Failed to load media content
          </p>
        </div>

        <Button onClick={resetError} size="sm" variant="outline" className="w-full">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </Card>
    </div>
  )
}

/**
 * Route-level error boundaries for different instructor sections
 */
export function InstructorRouteErrorBoundary({ 
  children, 
  routeName 
}: RouteErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={InstructorErrorFallback}
      context={{
        component: `InstructorRoute_${routeName}`,
        action: 'route_error'
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

export function MediaOperationErrorBoundary({ 
  children 
}: { 
  children: ReactNode 
}) {
  return (
    <ErrorBoundary
      fallback={MediaErrorFallback}
      context={{
        component: 'MediaOperation',
        action: 'media_operation_error'
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

/**
 * Form-specific error boundary
 */
export function FormErrorBoundary({ 
  children,
  formName 
}: { 
  children: ReactNode
  formName: string 
}) {
  const FormErrorFallback = ({ error, resetError }: any) => (
    <div className="p-4 border border-red-200 rounded-lg bg-red-50">
      <div className="flex items-center gap-2 text-red-700 mb-2">
        <AlertCircle className="h-4 w-4" />
        <span className="font-medium">Form Error</span>
      </div>
      <p className="text-sm text-red-600 mb-3">
        There was an error with the {formName} form.
      </p>
      <Button onClick={resetError} size="sm" variant="outline">
        Reset Form
      </Button>
    </div>
  )

  return (
    <ErrorBoundary
      fallback={FormErrorFallback}
      context={{
        component: `Form_${formName}`,
        action: 'form_error'
      }}
    >
      {children}
    </ErrorBoundary>
  )
}