"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { X, CheckCircle, AlertCircle, Loader2, Upload } from 'lucide-react'
import { useCourseCreationUI } from '@/stores/course-creation-ui'
import { cn } from '@/lib/utils'

interface UploadProgressPanelProps {
  chapterId?: string // If provided, only show uploads for this chapter
  className?: string
}

/**
 * Upload progress panel that shows real-time upload status from Zustand store
 */
export function UploadProgressPanel({ chapterId, className }: UploadProgressPanelProps) {
  const ui = useCourseCreationUI()
  
  // Get uploads (filtered by chapter if specified)
  const uploads = chapterId 
    ? ui.getUploadsByChapter(chapterId)
    : Object.values(ui.uploads)
  
  const activeUploads = uploads.filter(upload => 
    upload.status === 'uploading' || upload.status === 'processing'
  )
  
  const completedUploads = uploads.filter(upload => upload.status === 'complete')
  const failedUploads = uploads.filter(upload => upload.status === 'error')
  
  const totalProgress = ui.getTotalUploadProgress()
  
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
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return 'bg-blue-50 border-blue-200'
      case 'complete':
        return 'bg-green-50 border-green-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }
  
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Progress
            {chapterId && (
              <Badge variant="outline" className="text-xs">
                Chapter Only
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {totalProgress < 100 && (
              <Badge variant="outline" className="text-xs">
                {totalProgress}%
              </Badge>
            )}
            
            {completedUploads.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={ui.clearCompletedUploads}
                className="h-6 px-2 text-xs"
              >
                Clear Completed
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Overall Progress */}
        {activeUploads.length > 0 && (
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
                getStatusColor(upload.status)
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
                
                {upload.status === 'uploading' && (
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
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => ui.removeUpload(upload.id)}
                className="h-6 w-6 p-0 hover:bg-red-100"
              >
                <X className="h-3 w-3" />
              </Button>
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