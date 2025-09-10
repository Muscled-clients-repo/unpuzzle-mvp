"use client"

import { useState, useRef, useEffect } from "react"
import { SimpleModal } from "../media/SimpleModal"
import { Button } from "@/components/ui/button"
import { useSignedUrl } from "@/hooks/use-signed-url"
import { Loader2, AlertCircle, RefreshCw, Maximize, Minimize } from "lucide-react"

// Helper function to extract filename from full path
const extractFilename = (path: string | undefined): string | undefined => {
  if (!path) return undefined
  return path.split('/').pop() // Get the last part after the last slash
}

interface SimpleVideoPreviewProps {
  video: {
    id?: string
    name?: string
    title?: string
    filename?: string
    originalFilename?: string
    video_url?: string
    url?: string
    backblaze_url?: string
  } | null
  isOpen: boolean
  onClose: () => void
  title?: string
  autoPlay?: boolean
}

export function SimpleVideoPreview({ video, isOpen, onClose, title, autoPlay = true }: SimpleVideoPreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Get signed URL for private video access
  const videoUrl = video?.video_url || video?.url || video?.backblaze_url
  const signedUrl = useSignedUrl(videoUrl || null, 30)
  
  console.log('[VIDEO PREVIEW] Video URL format:', videoUrl)
  console.log('[VIDEO PREVIEW] Video data for title:', video)
  console.log('[VIDEO PREVIEW] SignedUrl state:', {
    isLoading: signedUrl.isLoading,
    error: signedUrl.error,
    data: signedUrl.data,
    hasData: !!signedUrl.data
  })

  const handleFullscreen = async () => {
    if (!containerRef.current) return
    
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
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

  if (!video || !videoUrl) {
    return null
  }

  return (
    <SimpleModal
      isOpen={isOpen}
      onClose={onClose}
      title={title || video?.name || video?.title || video?.originalFilename || video?.filename || extractFilename(video?.filename) || video?.fileName || video?.file_name || video?.originalName || "Video Preview"}
      maxWidth="max-w-4xl"
    >
      <div className="p-0">
        <div ref={containerRef} className="relative bg-black">
          {signedUrl.error ? (
            <div className="flex flex-col items-center justify-center h-64 text-white p-4">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p className="mb-2">Failed to load video</p>
              <p className="text-sm text-gray-300 mb-4">Error: {signedUrl.error?.message || 'Unknown error'}</p>
              <p className="text-xs text-gray-400 mb-4">Original URL: {videoUrl}</p>
              <Button 
                onClick={() => signedUrl.refetch()} 
                variant="outline"
                className="text-black"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : signedUrl.url ? (
            <div className="relative">
              <video
                ref={videoRef}
                src={signedUrl.url}
                controls
                className="w-full h-auto max-h-[70vh]"
                autoPlay={autoPlay}
                muted={autoPlay}
                preload="metadata"
                poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400'%3E%3Crect width='100%25' height='100%25' fill='%23000'/%3E%3C/svg%3E"
                onError={(e) => {
                  console.error('Video playback error:', e)
                  const target = e.target as HTMLVideoElement
                  const error = target.error
                  if (error) {
                    console.error('Video error details:', {
                      code: error.code,
                      message: error.message,
                      url: target.src
                    })
                  }
                }}
              >
                Your browser does not support the video tag.
              </video>
              
              {/* Fullscreen button */}
              <Button
                onClick={handleFullscreen}
                variant="ghost"
                size="sm"
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white"
              >
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </SimpleModal>
  )
}