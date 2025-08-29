// Centralized error handling utilities
import { isDevelopment, config } from '@/config/env'

export type ErrorType = 
  | 'network'
  | 'validation' 
  | 'authentication'
  | 'authorization'
  | 'not_found'
  | 'server'
  | 'client'
  | 'timeout'
  | 'unknown'

export interface AppError {
  type: ErrorType
  message: string
  code?: string | number
  details?: Record<string, unknown>
  timestamp: Date
  recoverable: boolean
  userMessage: string
}

export interface ErrorContext {
  component?: string
  action?: string
  userId?: string
  additionalData?: Record<string, unknown>
}

export class ErrorHandler {
  private static instance: ErrorHandler
  private errorLog: AppError[] = []
  private maxLogSize = config.MAX_ERROR_LOG_SIZE

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler()
    }
    return ErrorHandler.instance
  }

  // Create standardized error objects
  createError(
    type: ErrorType,
    message: string,
    options: {
      code?: string | number
      details?: Record<string, unknown>
      recoverable?: boolean
      userMessage?: string
    } = {}
  ): AppError {
    const error: AppError = {
      type,
      message,
      code: options.code,
      details: options.details,
      timestamp: new Date(),
      recoverable: options.recoverable ?? this.isRecoverableByType(type),
      userMessage: options.userMessage ?? this.getDefaultUserMessage(type, message)
    }

    // Log the error
    this.logError(error)
    
    return error
  }

  // Handle different error types with appropriate responses
  handleError(error: Error | AppError, context?: ErrorContext): AppError {
    let appError: AppError

    if (this.isAppError(error)) {
      appError = error
    } else {
      // Convert generic Error to AppError
      appError = this.convertGenericError(error)
    }

    // Add context information
    if (context) {
      appError.details = {
        ...appError.details,
        context
      }
    }

    // Log the error
    this.logError(appError)

    // Report to monitoring service (in production)
    this.reportError(appError, context)

    return appError
  }

  // Check if error is recoverable and suggest actions
  getRecoveryActions(error: AppError): string[] {
    const actions: string[] = []

    switch (error.type) {
      case 'network':
        actions.push('Check your internet connection')
        actions.push('Try again in a few moments')
        break
      
      case 'timeout':
        actions.push('The request took too long')
        actions.push('Please try again')
        break
      
      case 'not_found':
        actions.push('The requested resource was not found')
        actions.push('Check the URL or try searching')
        break
      
      case 'authentication':
        actions.push('Please log in again')
        actions.push('Check your credentials')
        break
      
      case 'authorization':
        actions.push('You don\'t have permission for this action')
        actions.push('Contact support if you think this is a mistake')
        break
      
      case 'validation':
        actions.push('Please check your input')
        actions.push('Make sure all required fields are filled')
        break
      
      case 'server':
        actions.push('Server error occurred')
        actions.push('Please try again later')
        break
      
      default:
        actions.push('An unexpected error occurred')
        actions.push('Please try again or contact support')
    }

    return actions
  }

  // Get user-friendly error messages
  private getDefaultUserMessage(type: ErrorType, originalMessage: string): string {
    switch (type) {
      case 'network':
        return 'Unable to connect to the server. Please check your internet connection.'
      
      case 'timeout':
        return 'The request is taking longer than expected. Please try again.'
      
      case 'not_found':
        return 'The requested content could not be found.'
      
      case 'authentication':
        return 'Please log in to continue.'
      
      case 'authorization':
        return 'You don\'t have permission to perform this action.'
      
      case 'validation':
        return 'Please check your input and try again.'
      
      case 'server':
        return 'A server error occurred. Please try again later.'
      
      default:
        return 'Something went wrong. Please try again.'
    }
  }

  private isRecoverableByType(type: ErrorType): boolean {
    return ['network', 'timeout', 'server'].includes(type)
  }

  private isAppError(error: unknown): error is AppError {
    return error && typeof error === 'object' && 'type' in error && 'userMessage' in error
  }

  private convertGenericError(error: Error): AppError {
    let type: ErrorType = 'unknown'
    
    // Detect error type from message or error properties
    const message = error.message.toLowerCase()
    
    if (message.includes('network') || message.includes('fetch')) {
      type = 'network'
    } else if (message.includes('timeout')) {
      type = 'timeout'
    } else if (message.includes('not found') || message.includes('404')) {
      type = 'not_found'
    } else if (message.includes('unauthorized') || message.includes('401')) {
      type = 'authentication'
    } else if (message.includes('forbidden') || message.includes('403')) {
      type = 'authorization'
    } else if (message.includes('validation') || message.includes('invalid')) {
      type = 'validation'
    } else if (message.includes('server') || message.includes('500')) {
      type = 'server'
    }

    return this.createError(type, error.message, {
      details: {
        stack: error.stack,
        name: error.name
      }
    })
  }

  private logError(error: AppError): void {
    // Add to in-memory log
    this.errorLog.unshift(error)
    
    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize)
    }

    // Console log in development
    if (isDevelopment) {
      console.group(`🚨 ${error.type.toUpperCase()} Error`)
      console.error(error.message)
      if (error.details) {
        console.log('Details:', error.details)
      }
      console.log('User Message:', error.userMessage)
      console.log('Recoverable:', error.recoverable)
      console.groupEnd()
    }
  }

  private reportError(error: AppError, context?: ErrorContext): void {
    // In production, this would send to error monitoring service
    // (Sentry, LogRocket, etc.)
    
    if (!isDevelopment) {
      // Example: Send to monitoring service
      // ErrorMonitoring.captureException(error, { context })
    }
  }

  // Get recent errors for debugging
  getRecentErrors(limit: number = 10): AppError[] {
    return this.errorLog.slice(0, limit)
  }

  // Clear error log
  clearErrorLog(): void {
    this.errorLog = []
  }

  // Retry helper for recoverable errors
  async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: AppError | undefined

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = this.handleError(error as Error, {
          action: 'retry_operation',
          additionalData: { attempt, maxRetries }
        })

        // Don't retry non-recoverable errors
        if (!lastError.recoverable) {
          break
        }

        // Don't delay on the last attempt
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt))
        }
      }
    }

    throw lastError!
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance()

// Convenience functions
export const createError = (type: ErrorType, message: string, options = {}) =>
  errorHandler.createError(type, message, options)

export const handleError = (error: Error | AppError, context?: ErrorContext) =>
  errorHandler.handleError(error, context)

export const retryOperation = <T>(
  operation: () => Promise<T>,
  maxRetries?: number,
  delay?: number
) => errorHandler.retryOperation(operation, maxRetries, delay)