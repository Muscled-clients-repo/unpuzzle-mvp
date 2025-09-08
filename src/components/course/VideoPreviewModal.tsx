"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useState, useRef, useEffect } from "react"
import type { VideoUpload } from "@/stores/slices/course-creation-slice"

interface VideoPreviewModalProps {
  video: VideoUpload | null
  isOpen: boolean
  onClose: () => void
}

export function VideoPreviewModal({ video, isOpen, onClose }: VideoPreviewModalProps) {
  
  const [isFullscreen, setIsFullscreen] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

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

  const videoUrl = video.backblaze_url || video.video_url || video.url
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
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            autoPlay
            className="w-full h-auto max-h-[70vh]"
            controlsList="nodownload"
          >
            Your browser does not support the video tag.
          </video>
        </div>

        {video.duration && (
          <div className="p-4 pt-2 text-sm text-muted-foreground">
            Duration: {video.duration}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}