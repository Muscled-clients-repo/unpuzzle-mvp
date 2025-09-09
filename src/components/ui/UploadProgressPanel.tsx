"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { X, CheckCircle, AlertCircle, Loader2, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface GenericUploadItem {
  id: string
  filename: string
  progress: number
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error'
  error?: string
}

interface UploadProgressPanelProps {
  uploads: GenericUploadItem[]
  title?: string
  subtitle?: string
  className?: string
  onClearCompleted?: () => void
  onRemoveUpload?: (id: string) => void
  showOverallProgress?: boolean
}

/**
 * Generic upload progress panel that can be used for any type of upload progress
 * Reusable component extracted from course-specific version
 */
export function UploadProgressPanel({ 
  uploads, 
  title = "Upload Progress",
  subtitle,
  className,
  onClearCompleted,
  onRemoveUpload,
  showOverallProgress = true
}: UploadProgressPanelProps) {
  
  const activeUploads = uploads.filter(upload => 
    upload.status === 'uploading' || upload.status === 'processing'
  )
  
  const completedUploads = uploads.filter(upload => upload.status === 'complete')
  const failedUploads = uploads.filter(upload => upload.status === 'error')
  
  // Calculate total progress
  const totalProgress = uploads.length > 0 
    ? Math.round(uploads.reduce((sum, upload) => sum + upload.progress, 0) / uploads.length)
    : 0
  
  // Don't show panel if no uploads
  if (uploads.length === 0) {
    return null
  }
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Upload className="h-4 w-4 text-gray-400" />
    }
  }
  
  const getStatusColor = (status: string, progress: number = 0) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return 'bg-blue-50 border-blue-200'
      case 'complete':
        return 'bg-green-50 border-green-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      default:
        // If we have progress but no explicit status, assume it's uploading (prevents grey flicker)
        return progress > 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
    }
  }
  
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Upload className="h-4 w-4" />
            {title}
            {subtitle && (
              <Badge variant="outline" className="text-xs">
                {subtitle}
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {showOverallProgress && totalProgress < 100 && activeUploads.length > 1 && (
              <Badge variant="outline" className="text-xs">
                {totalProgress}%
              </Badge>
            )}
            
            {completedUploads.length > 0 && onClearCompleted && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearCompleted}
                className="h-6 px-2 text-xs"
              >
                Clear Completed
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Overall Progress - only show for multiple uploads */}
        {showOverallProgress && activeUploads.length > 1 && (
          <div>
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Overall Progress</span>
              <span>{totalProgress}%</span>
            </div>
            <Progress value={totalProgress} className="h-2" />
          </div>
        )}
        
        {/* Individual Upload Items */}
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {uploads.map((upload) => (
            <div
              key={upload.id}
              className={cn(
                'flex items-center gap-3 p-2 rounded border transition-colors',
                getStatusColor(upload.status, upload.progress)
              )}
            >
              {getStatusIcon(upload.status)}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium truncate">
                    {upload.filename}
                  </span>
                  <span className="text-xs text-gray-500">
                    {upload.progress}%
                  </span>
                </div>
                
                {(upload.status === 'uploading' || upload.status === 'processing') && (
                  <Progress value={upload.progress} className="h-1" />
                )}
                
                {upload.error && (
                  <p className="text-xs text-red-600 mt-1">
                    {upload.error}
                  </p>
                )}
                
                {upload.status === 'complete' && (
                  <p className="text-xs text-green-600 mt-1">
                    Upload completed successfully
                  </p>
                )}
              </div>
              
              {onRemoveUpload && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveUpload(upload.id)}
                  className="h-6 w-6 p-0 hover:bg-red-100"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
        
        {/* Summary Stats */}
        {uploads.length > 0 && (
          <div className="pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <div className="flex items-center gap-4">
                {activeUploads.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {activeUploads.length} uploading
                  </span>
                )}
                
                {completedUploads.length > 0 && (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    {completedUploads.length} completed
                  </span>
                )}
                
                {failedUploads.length > 0 && (
                  <span className="flex items-center gap-1 text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {failedUploads.length} failed
                  </span>
                )}
              </div>
              
              <span>
                Total: {uploads.length} files
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}