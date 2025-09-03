"use client"

import { useEffect, useRef } from 'react'
import { X, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface VideoPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  videoUrl: string | undefined
  videoTitle: string
  videoDuration?: string
}

export function VideoPreviewModal({
  isOpen,
  onClose,
  videoUrl,
  videoTitle,
  videoDuration
}: VideoPreviewModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Handle ESC key and click outside
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    document.addEventListener('mousedown', handleClickOutside)
    document.body.style.overflow = 'hidden' // Prevent scrolling

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Pause video when modal closes
  useEffect(() => {
    if (!isOpen && videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        className="relative z-10 w-full max-w-4xl mx-4 bg-background rounded-lg shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold truncate" title={videoTitle}>
              {videoTitle}
            </h2>
            {videoDuration && (
              <p className="text-sm text-muted-foreground">
                Duration: {videoDuration}
              </p>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onClose}
            className="shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Video Player */}
        <div className="relative aspect-video bg-black">
          {videoUrl ? (
            <video
              ref={videoRef}
              className="w-full h-full"
              controls
              preload="metadata"
              onError={(e) => {
                console.error('Video playback error:', e)
              }}
            >
              <source src={videoUrl} type="video/mp4" />
              <source src={videoUrl} type="video/webm" />
              <source src={videoUrl} type="video/ogg" />
              Your browser does not support the video tag.
            </video>
          ) : (
            // Fallback when no URL available
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Play className="h-12 w-12 mb-4 opacity-50" />
              <p>Video not available</p>
              <p className="text-sm">Upload may still be in progress</p>
            </div>
          )}
        </div>

        {/* Footer with helpful info */}
        <div className="p-3 bg-muted/50 text-xs text-muted-foreground">
          <p>Press ESC or click outside to close • Video will pause when closed</p>
        </div>
      </div>
    </div>
  )
}