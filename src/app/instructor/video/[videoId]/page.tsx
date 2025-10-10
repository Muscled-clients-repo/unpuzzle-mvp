"use client"

import { useState, useEffect } from "react"
import { use } from "react"
import dynamic from "next/dynamic"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { getInstructorVideoAction } from "@/app/actions/media-actions"

// Dynamically import the InstructorVideoPlayer component with loading fallback
const InstructorVideoPlayer = dynamic(
  () => import("@/components/video/instructor/InstructorVideoPlayer").then(mod => ({
    default: mod.InstructorVideoPlayer
  })),
  {
    loading: () => (
      <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
        <LoadingSpinner />
      </div>
    ),
    ssr: false // Disable SSR for video player as it uses browser APIs
  }
)

interface VideoData {
  id: string
  name: string
  cdn_url?: string
  backblaze_url?: string
  file_size: number
  duration_seconds: number | null
  file_type: string
  uploaded_by?: string
  status?: string
}

export default function InstructorVideoPage(props: { params: Promise<{ videoId: string }> }) {
  const params = use(props.params)
  const videoId = params.videoId

  const [isLoading, setIsLoading] = useState(true)
  const [videoData, setVideoData] = useState<VideoData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadVideoData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        console.log('🎥 [INSTRUCTOR VIDEO] Fetching video:', videoId)

        // Use server action to get video with CDN URL
        const result = await getInstructorVideoAction(videoId)

        console.log('🎥 [INSTRUCTOR VIDEO] Server action result:', result)

        if (!result.success || !result.video) {
          console.error('❌ Failed to fetch video:', result.error)
          setError(result.error || 'Video not found or access denied')
          setIsLoading(false)
          return
        }

        setVideoData(result.video)

      } catch (err) {
        console.error('Error loading video:', err)
        setError('Failed to load video')
      } finally {
        setIsLoading(false)
      }
    }

    loadVideoData()
  }, [videoId])

  // Show loading state while data is being fetched
  if (isLoading) {
    return (
      <div className="fixed inset-0 top-16 bg-background">
        <div className="flex h-full items-center justify-center">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  // Show error state if video not found
  if (error || !videoData) {
    return (
      <div className="flex min-h-screen flex-col">
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Video Not Found</h1>
            <p className="text-muted-foreground mb-4">
              {error || 'The video you are looking for does not exist or you do not have access to it.'}
            </p>
            <Button asChild>
              <Link href="/instructor/media">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Media
              </Link>
            </Button>
          </div>
        </main>
      </div>
    )
  }

  // Check if video URL is valid before rendering player
  if (!videoData.cdn_url && !videoData.backblaze_url) {
    return (
      <div className="flex min-h-screen flex-col">
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Video Source Not Available</h1>
            <p className="text-muted-foreground mb-4">
              The video file for "{videoData.name}" is not available.
            </p>
            <Button asChild>
              <Link href="/instructor/media">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Media
              </Link>
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 top-16 bg-background">
      {/* Instructor Video Player with checkpoint editor sidebar - takes full viewport minus header */}
      <InstructorVideoPlayer
        videoUrl={videoData.cdn_url || videoData.backblaze_url || ''}
        videoId={videoId}
        title={videoData.name}
        transcript={undefined}
        initialTime={0}
        autoplay={false}
      />
    </div>
  )
}
