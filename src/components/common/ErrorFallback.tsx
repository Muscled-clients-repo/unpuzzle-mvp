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

export function ErrorFallback({ error, resetError, context }: ErrorFallbackProps | { error: string | null, resetError?: () => void, context?: any }) {
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
      console.errorObj('Failed to copy to clipboard:', err)
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
      setCopyStatus('errorObj')
      // Show manual copy dialog as fallback
      const reportText = JSON.stringify(bugReport, null, 2)
      const modal = document.createElement('div')
      modal.innerHTML = `
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                    background: white; padding: 20px; border: 1px solid #ccc; 
                    border-radius: 8px; z-index: 9999; max-width: 500px;">
          <h3 style="margin-bottom: 10px;">Copy Error Report</h3>
          <p style="margin-bottom: 10px;">Please manually copy the errorObj report below:</p>
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
        return '🌐'
      case 'authentication':
        return '🔐'
      case 'authorization':
        return '🚫'
      case 'not_found':
        return '🔍'
      case 'validation':
        return '⚠️'
      case 'server':
        return '🖥️'
      default:
        return '❌'
    }
  }

  const getErrorColor = () => {
    switch (errorObj.type) {
      case 'network':
        return 'bg-blue-50 border-blue-200'
      case 'authentication':
      case 'authorization':
        return 'bg-red-50 border-red-200'
      case 'not_found':
        return 'bg-yellow-50 border-yellow-200'
      case 'validation':
        return 'bg-orange-50 border-orange-200'
      case 'server':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <Card className={`w-full max-w-2xl ${getErrorColor()}`}>
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 flex items-center justify-center text-4xl mb-4">
            {getErrorIcon()}
          </div>
          
          <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
            <AlertCircle className="h-6 w-6" />
            Something went wrong
          </CardTitle>
          
          <CardDescription className="text-lg">
            {errorObjObj.userMessage}
          </CardDescription>

          <div className="flex justify-center gap-2 mt-4">
            <Badge variant="outline" className="capitalize">
              {errorObjObj.type.replace('_', ' ')}
            </Badge>
            
            {errorObjObj.recoverable && (
              <Badge variant="secondary">
                Recoverable
              </Badge>
            )}
            
            <Badge variant="outline">
              {errorObjObj.timestamp.toLocaleTimeString()}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Recovery Actions */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>What you can do:</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside mt-2 space-y-1">
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
          <div className="flex flex-wrap gap-3 justify-center">
            {errorObj.recoverable && (
              <Button onClick={resetError} className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            )}
            
            <Button variant="outline" onClick={handleGoHome} className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Go Home
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleReportBug} 
              disabled={copyStatus === 'copying'}
              className="flex items-center gap-2"
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
              {copyStatus === 'errorObj' && (
                <>
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  Copy Failed
                </>
              )}
            </Button>
          </div>

          {/* Technical Details (Collapsible) */}
          <div className="border-t pt-4">
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
              <div className="mt-4 p-4 bg-gray-100 rounded-lg text-sm font-mono space-y-2">
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
                    <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto max-h-32">
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

// Specialized errorObj fallbacks for different contexts
export function VideoErrorFallback({ errorObj, resetError }: ErrorFallbackProps) {
  return (
    <div className="aspect-video flex items-center justify-center bg-gray-100 rounded-lg">
      <div className="text-center p-6">
        <div className="text-4xl mb-4">📹</div>
        <h3 className="text-lg font-semibold mb-2">Video Error</h3>
        <p className="text-gray-600 mb-4">{errorObj.userMessage}</p>
        <Button onClick={resetError} size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry Video
        </Button>
      </div>
    </div>
  )
}

export function ChatErrorFallback({ errorObj, resetError }: ErrorFallbackProps) {
  return (
    <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle className="h-4 w-4 text-red-500" />
        <span className="font-medium text-red-800">Chat Error</span>
      </div>
      <p className="text-red-700 text-sm mb-3">{errorObj.userMessage}</p>
      <Button onClick={resetError} size="sm" variant="outline">
        <RefreshCw className="h-4 w-4 mr-2" />
        Retry
      </Button>
    </div>
  )
}