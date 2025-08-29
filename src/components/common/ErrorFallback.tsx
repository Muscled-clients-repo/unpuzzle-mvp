"use client"

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  AlertCircle, 
  RefreshCw, 
  Home, 
  ChevronDown, 
  ChevronUp,
  Bug,
  Copy,
  Check
} from 'lucide-react'
import { useState, useCallback } from 'react'
import type { ErrorFallbackProps } from './ErrorBoundary'
import type { AppError } from '@/utils/error-handler'

export function ErrorFallback({ error, resetError, context }: ErrorFallbackProps | { error: string | null, resetError?: () => void, context?: Record<string, unknown> }) {
  const [showDetails, setShowDetails] = useState(false)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'success' | 'error'>('idle')
  
  // Handle string errors or null errors
  const errorObj: AppError = typeof error === 'string' ? {
    type: 'unknown',
    message: error,
    userMessage: error,
    timestamp: new Date(),
    recoverable: true,
    details: {},
    code: undefined
  } : error || {
    type: 'unknown',
    message: 'An unexpected error occurred',
    userMessage: 'An unexpected error occurred',
    timestamp: new Date(),
    recoverable: true,
    details: {},
    code: undefined
  }

  const handleGoHome = () => {
    // Navigate to home page
    window.location.href = '/'
  }

  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    // Check if clipboard API is available
    if (!navigator?.clipboard) {
      // Fallback method for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.top = '0'
      textArea.style.left = '0'
      textArea.style.width = '2em'
      textArea.style.height = '2em'
      textArea.style.padding = '0'
      textArea.style.border = 'none'
      textArea.style.outline = 'none'
      textArea.style.boxShadow = 'none'
      textArea.style.background = 'transparent'
      
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      try {
        const successful = document.execCommand('copy')
        document.body.removeChild(textArea)
        return successful
      } catch (err) {
        document.body.removeChild(textArea)
        return false
      }
    }
    
    // Modern clipboard API with proper errorObj handling
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
      return false
    }
  }, [])

  const handleReportBug = async () => {
    setCopyStatus('copying')
    
    const bugReport = {
      error: errorObj.message,
      type: errorObj.type,
      timestamp: errorObj.timestamp,
      context: context,
      userAgent: navigator.userAgent,
      url: window.location.href
    }
    
    // In production, this would open a support form or send to bug tracker
    console.log('Bug Report:', bugReport)
    
    // Copy to clipboard with user feedback
    const success = await copyToClipboard(JSON.stringify(bugReport, null, 2))
    
    if (success) {
      setCopyStatus('success')
      // Reset status after 3 seconds
      setTimeout(() => setCopyStatus('idle'), 3000)
    } else {
      setCopyStatus('error')
      // Show manual copy dialog as fallback
      const reportText = JSON.stringify(bugReport, null, 2)
      const modal = document.createElement('div')
      modal.innerHTML = `
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                    background: white; padding: 20px; border: 1px solid #ccc; 
                    border-radius: 8px; z-index: 9999; max-width: 500px;">
          <h3 style="margin-bottom: 10px;">Copy Error Report</h3>
          <p style="margin-bottom: 10px;">Please manually copy the error report below:</p>
          <textarea style="width: 100%; height: 200px; font-family: monospace; font-size: 12px;" 
                    readonly>${reportText}</textarea>
          <button onclick="this.parentElement.remove()" 
                  style="margin-top: 10px; padding: 8px 16px; cursor: pointer;">Close</button>
        </div>
      `
      document.body.appendChild(modal)
    }
  }

  const getErrorIcon = () => {
    switch (errorObj.type) {
      case 'network':
        return <AlertCircle className="h-12 w-12 text-blue-500" />
      case 'authentication':
        return <AlertCircle className="h-12 w-12 text-amber-500" />
      case 'authorization':
        return <AlertCircle className="h-12 w-12 text-orange-500" />
      case 'not_found':
        return <AlertCircle className="h-12 w-12 text-yellow-500" />
      case 'validation':
        return <AlertCircle className="h-12 w-12 text-purple-500" />
      case 'server':
        return <AlertCircle className="h-12 w-12 text-red-500" />
      default:
        return <AlertCircle className="h-12 w-12 text-gray-500" />
    }
  }

  const getErrorColor = () => {
    switch (errorObj.type) {
      case 'network':
        return 'bg-gradient-to-br from-blue-50 to-white border-blue-200'
      case 'authentication':
      case 'authorization':
        return 'bg-gradient-to-br from-amber-50 to-white border-amber-200'
      case 'not_found':
        return 'bg-gradient-to-br from-yellow-50 to-white border-yellow-200'
      case 'validation':
        return 'bg-gradient-to-br from-purple-50 to-white border-purple-200'
      case 'server':
        return 'bg-gradient-to-br from-red-50 to-white border-red-200'
      default:
        return 'bg-gradient-to-br from-gray-50 to-white border-gray-200'
    }
  }

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <Card className={`w-full max-w-2xl shadow-xl border-2 ${getErrorColor()}`}>
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 p-4 rounded-full bg-white shadow-md w-fit">
            {getErrorIcon()}
          </div>
          
          <CardTitle className="text-2xl font-bold text-gray-800">
            Something went wrong
          </CardTitle>
          
          <CardDescription className="text-base text-gray-600 mt-2">
            {errorObj.userMessage}
          </CardDescription>

          <div className="flex justify-center gap-2 mt-4">
            <Badge variant="secondary" className="capitalize bg-white/80 text-gray-700 border-gray-300">
              {errorObj.type.replace('_', ' ')}
            </Badge>
            
            {errorObj.recoverable && (
              <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-300">
                Recoverable
              </Badge>
            )}
            
            <Badge variant="secondary" className="bg-white/80 text-gray-700 border-gray-300">
              {errorObj.timestamp.toLocaleTimeString()}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          {/* Recovery Actions */}
          <Alert className="bg-white/60 border-gray-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-gray-800 font-semibold">What you can do:</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
                {errorObj.recoverable && (
                  <li>Try refreshing the page or retrying the action</li>
                )}
                <li>Check your internet connection</li>
                <li>Wait a few minutes and try again</li>
                {!errorObj.recoverable && (
                  <li>Contact support if the problem persists</li>
                )}
              </ul>
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 justify-center pt-2">
            {errorObj.recoverable && (
              <Button onClick={resetError} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            )}
            
            <Button variant="outline" onClick={handleGoHome} className="flex items-center gap-2 border-gray-300 hover:bg-gray-50 shadow-sm">
              <Home className="h-4 w-4" />
              Go Home
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleReportBug} 
              disabled={copyStatus === 'copying'}
              className="flex items-center gap-2 border-gray-300 hover:bg-gray-50 shadow-sm"
            >
              {copyStatus === 'idle' && (
                <>
                  <Bug className="h-4 w-4" />
                  Report Bug
                </>
              )}
              {copyStatus === 'copying' && (
                <>
                  <Copy className="h-4 w-4 animate-pulse" />
                  Copying...
                </>
              )}
              {copyStatus === 'success' && (
                <>
                  <Check className="h-4 w-4 text-green-600" />
                  Copied!
                </>
              )}
              {copyStatus === 'error' && (
                <>
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  Copy Failed
                </>
              )}
            </Button>
          </div>

          {/* Technical Details (Collapsible) */}
          <div className="border-t border-gray-200 pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 mx-auto"
            >
              {showDetails ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Hide Details
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Show Technical Details
                </>
              )}
            </Button>

            {showDetails && (
              <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono space-y-2">
                <div>
                  <strong>Error Type:</strong> {errorObj.type}
                </div>
                
                <div>
                  <strong>Message:</strong> {errorObj.message}
                </div>
                
                {errorObj.code && (
                  <div>
                    <strong>Code:</strong> {errorObj.code}
                  </div>
                )}
                
                <div>
                  <strong>Timestamp:</strong> {errorObj.timestamp.toISOString()}
                </div>
                
                {context?.component && (
                  <div>
                    <strong>Component:</strong> {context.component}
                  </div>
                )}
                
                {context?.action && (
                  <div>
                    <strong>Action:</strong> {context.action}
                  </div>
                )}
                
                {errorObj.details && (
                  <div>
                    <strong>Details:</strong>
                    <pre className="mt-2 p-2 bg-white border border-gray-200 rounded text-xs overflow-auto max-h-32">
                      {JSON.stringify(errorObj.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Specialized error fallbacks for different contexts
export function VideoErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-gray-50 to-white rounded-lg border-2 border-gray-200 shadow-lg">
      <div className="text-center p-6">
        <div className="mx-auto mb-4 p-3 rounded-full bg-white shadow-md w-fit">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Video Error</h3>
        <p className="text-gray-600 mb-4">{error.userMessage}</p>
        <Button onClick={resetError} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-md">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry Video
        </Button>
      </div>
    </div>
  )
}

export function ChatErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="p-4 border-2 border-red-200 bg-gradient-to-br from-red-50 to-white rounded-lg shadow-md">
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle className="h-4 w-4 text-red-500" />
        <span className="font-medium text-gray-800">Chat Error</span>
      </div>
      <p className="text-gray-600 text-sm mb-3">{error.userMessage}</p>
      <Button onClick={resetError} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
        <RefreshCw className="h-4 w-4 mr-2" />
        Retry
      </Button>
    </div>
  )
}