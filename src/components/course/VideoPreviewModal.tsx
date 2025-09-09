"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useState, useRef, useEffect } from "react"
import type { VideoUpload } from "@/stores/slices/course-creation-slice"
import { useSignedUrl } from "@/hooks/use-signed-url"
import { Loader2, AlertCircle, RefreshCw } from "lucide-react"

interface VideoPreviewModalProps {
  video: VideoUpload | null
  isOpen: boolean
  onClose: () => void
}

export function VideoPreviewModal({ video, isOpen, onClose }: VideoPreviewModalProps) {
  
  const [isFullscreen, setIsFullscreen] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Get signed URL for private video access
  // Prioritize video_url (private format) over direct URLs for proper signing
  const videoUrl = video?.video_url || video?.url || video?.backblaze_url
  const signedUrl = useSignedUrl(videoUrl || null, 30) // Refresh 30min before expiry
  
  console.log('[VIDEO PREVIEW] Video URL format:', videoUrl)

  const handleFullscreen = async () => {
    if (!containerRef.current) return

    try {
      if (!isFullscreen) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen()
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen()
        }
      }
      setIsFullscreen(!isFullscreen)
    } catch (error) {
      console.error('Fullscreen error:', error)
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  if (!video) {
    return null
  }

  if (!videoUrl) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        ref={containerRef}
        className="max-w-4xl w-full p-0 overflow-hidden"
      >
        <DialogHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold truncate pr-4">
              {video.name}
            </DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="relative bg-black">
          {signedUrl.isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
              <span className="ml-2 text-white">Loading video...</span>
            </div>
          ) : signedUrl.error ? (
            <div className="flex flex-col items-center justify-center h-64 text-white">
              <AlertCircle className="h-8 w-8 mb-2" />
              <span className="mb-2">Failed to load video</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={signedUrl.refresh}
                className="bg-transparent border-white text-white hover:bg-white hover:text-black"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            </div>
          ) : signedUrl.url ? (
            <video
              ref={videoRef}
              src={signedUrl.url}
              controls
              autoPlay
              className="w-full h-auto max-h-[70vh]"
              controlsList="nodownload"
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="flex items-center justify-center h-64">
              <span className="text-white">No video URL available</span>
            </div>
          )}
        </div>

        <div className="p-4 pt-2">
          {video.duration && (
            <div className="text-sm text-muted-foreground mb-2">
              Duration: {video.duration}
            </div>
          )}
          {signedUrl.isNearExpiry && signedUrl.timeUntilExpiry && (
            <div className="text-xs text-amber-600 flex items-center">
              <AlertCircle className="h-3 w-3 mr-1" />
              Video link expires in {Math.ceil(signedUrl.timeUntilExpiry / (1000 * 60))} minutes
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}