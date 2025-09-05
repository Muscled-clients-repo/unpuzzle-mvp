import { useState } from 'react'
import type { VideoUpload } from '@/stores/slices/course-creation-slice'

export function useVideoPreview() {
  const [previewVideo, setPreviewVideo] = useState<VideoUpload | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const openPreview = (video: VideoUpload) => {
    setPreviewVideo(video)
    setIsPreviewOpen(true)
  }

  const closePreview = () => {
    setIsPreviewOpen(false)
    // Delay clearing video to allow animation
    setTimeout(() => setPreviewVideo(null), 200)
  }

  return {
    previewVideo,
    isPreviewOpen,
    openPreview,
    closePreview
  }
}