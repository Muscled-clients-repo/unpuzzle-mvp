"use client"

import React, { Component, ReactNode } from 'react'
import { errorHandler, type AppError, type ErrorContext } from '@/utils/error-handler'
import { ErrorFallback } from './ErrorFallback'

interface Props {
  children: ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: AppError, context: ErrorContext) => void
  context?: Partial<ErrorContext>
}

interface State {
  hasError: boolean
  error: AppError | null
}

export interface ErrorFallbackProps {
  error: AppError
  resetError: () => void
  context?: ErrorContext
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null
    }
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    const appError = errorHandler.handleError(error, {
      component: 'ErrorBoundary',
      action: 'component_error'
    })
    
    return {
      hasError: true,
      error: appError
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Enhanced error context
    const context: ErrorContext = {
      component: 'ErrorBoundary',
      action: 'component_crash',
      additionalData: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true
      },
      ...this.props.context
    }

    const appError = errorHandler.handleError(error, context)
    
    // Call custom error handler if provided
    this.props.onError?.(appError, context)
    
    // Update state with the processed error
    this.setState({
      hasError: true,
      error: appError
    })
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null
    })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || ErrorFallback
      
      return (
        <FallbackComponent
          error={this.state.error}
          resetError={this.resetError}
          context={this.props.context}
        />
      )
    }

    return this.props.children
  }
}

// HOC for wrapping components with error boundaries
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WithErrorBoundaryComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  )

  WithErrorBoundaryComponent.displayName = 
    `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`

  return WithErrorBoundaryComponent
}

// Hook for programmatic error reporting
export function useErrorHandler() {
  const reportError = (error: Error | AppError, context?: ErrorContext) => {
    return errorHandler.handleError(error, context)
  }

  const retryOperation = async <T,>(
    operation: () => Promise<T>,
    maxRetries?: number,
    delay?: number
  ): Promise<T> => {
    return errorHandler.retryOperation(operation, maxRetries, delay)
  }

  return {
    reportError,
    retryOperation,
    getRecentErrors: () => errorHandler.getRecentErrors(),
    clearErrors: () => errorHandler.clearErrorLog()
  }
}