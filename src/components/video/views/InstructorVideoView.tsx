"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { User } from "lucide-react"
import { useAppStore } from "@/stores/app-store"
import { InstructorVideoSidebar } from "../instructor/InstructorVideoSidebar"
import type { VideoPlayerCoreRef } from "../core/VideoPlayerCore"

// Dynamically import VideoPlayer
const VideoPlayer = dynamic(
  () => import("@/components/video/student/StudentVideoPlayer").then(mod => ({ 
    default: mod.StudentVideoPlayer 
  })),
  { ssr: false }
)

interface InstructorVideoViewProps {
  videoId?: string
  courseId?: string
}

export function InstructorVideoView(props?: InstructorVideoViewProps) {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()

  // Use props if provided, otherwise fall back to params (for backwards compatibility)
  const videoId = props?.videoId || (params.videoId as string) || (params.id as string)
  const courseId = props?.courseId || searchParams.get('courseId') || (params.id as string)

  console.log('🎥 [InstructorVideoView] IDs:', {
    propsVideoId: props?.videoId,
    propsCourseId: props?.courseId,
    finalVideoId: videoId,
    finalCourseId: courseId,
    params,
    searchParams: Object.fromEntries(searchParams.entries())
  })

  const studentId = searchParams.get('student')
  const hotspotTimestamp = searchParams.get('hotspot')
  const fromAnalytics = searchParams.get('from') === 'analytics'
  
  // Store - OLD (for lessons data)
  const { lessons, loadLessons } = useAppStore()

  // Store - Use course video loading for actual video data
  const currentVideo = useAppStore((state) => state.currentVideo)
  const loadCourseVideo = useAppStore((state) => state.loadCourseVideo)

  // Store - OLD (for current time - still needed for video playback)
  const currentTime = useAppStore((state) => state.currentTime)
  const setCurrentTime = useAppStore((state) => state.setCurrentTime)
  
  // State
  const videoPlayerRef = useRef<VideoPlayerCoreRef>(null)
  
  // Load lessons
  useEffect(() => {
    if (lessons && lessons.length === 0) {
      loadLessons()
    }
  }, [lessons?.length, loadLessons])
  
  // Load actual video data (using course video loader for real data)
  useEffect(() => {
    if (videoId && courseId) {
      console.log('📹 Loading video data for:', { videoId, courseId })
      loadCourseVideo(videoId, courseId)
    }
  }, [videoId, courseId, loadCourseVideo])

  // Debug current video data
  useEffect(() => {
    if (currentVideo) {
      console.log('🎬 Current video data loaded:', {
        title: currentVideo.title,
        videoUrl: currentVideo.videoUrl,
        id: currentVideo.id
      })
    }
  }, [currentVideo])
  
  const lesson = lessons?.find(l => l.id === videoId) || {
    id: videoId,
    title: "React Hooks Deep Dive",
    videoUrl: "https://example.com/video",
    description: "Master React Hooks",
    tags: ["React", "Hooks"],
    isFree: false
  }
  
  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time)
  }
  
  return (
    <div className="fixed inset-0 top-16 bg-background">
      <VideoPlayer
        videoUrl={currentVideo?.videoUrl || null}
        title={currentVideo?.title || 'Loading...'}
        transcript={currentVideo?.transcriptText || currentVideo?.transcript?.join(' ') || ''}
        videoId={videoId}
        courseId={courseId}
        isInstructorMode={true}
        customSidebar={
          <InstructorVideoSidebar
            videoId={videoId}
            currentVideoTime={currentTime}
            videoPlayerRef={videoPlayerRef}
          />
        }
        onTimeUpdate={handleTimeUpdate}
        onPause={(time) => console.log('Paused at', time)}
        onPlay={() => console.log('Playing')}
        onEnded={() => console.log('Video ended')}
      />
    </div>
  )
}