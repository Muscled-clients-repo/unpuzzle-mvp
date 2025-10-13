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

  // Store - Use student video loading for actual video data
  const currentVideo = useAppStore((state) => state.currentVideo)
  const loadStudentVideo = useAppStore((state) => state.loadStudentVideo)

  // Store - NEW (instructor video features for student activity)
  const {
    studentActivities,
    loadInstructorVideo
  } = useAppStore()

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
  
  // Load actual video data (using student video loader for real data)
  useEffect(() => {
    if (videoId && courseId) {
      console.log('📹 Loading video data for:', { videoId, courseId })
      loadStudentVideo(videoId, courseId)
      // Also load instructor-specific data (student activities)
      loadInstructorVideo(videoId, undefined)
    }
  }, [videoId, courseId, loadStudentVideo, loadInstructorVideo])

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

  // Debug student activities
  useEffect(() => {
    console.log('📊 Student activities:', studentActivities)
    console.log('📊 Activities count:', studentActivities.length)
  }, [studentActivities])
  
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
    <div className="min-h-screen pt-16">
      <div className="flex h-screen">
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Video Player */}
          <div className="bg-black p-4">
            <div className="relative">
              <VideoPlayer
                videoUrl={currentVideo?.videoUrl || null}
                title={currentVideo?.title || 'Loading...'}
                transcript={currentVideo?.transcriptText || currentVideo?.transcript?.join(' ') || ''}
                videoId={videoId}
                courseId={courseId}
                isInstructorMode={true}
                onTimeUpdate={handleTimeUpdate}
                onPause={(time) => console.log('Paused at', time)}
                onPlay={() => console.log('Playing')}
                onEnded={() => console.log('Video ended')}
              />
              
            </div>
          </div>
          
          {/* Video Info */}
          <div className="p-6 bg-background flex-1 overflow-y-auto">
            <div className="max-w-3xl">
              {/* Instructor and Video Info */}
              <div className="mb-6">
                <h1 className="text-2xl font-bold mb-3">{currentVideo?.title || 'Loading...'}</h1>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Instructor</p>
                    <p className="text-sm text-muted-foreground">Course Instructor</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Instructor Sidebar */}
        <div className="w-[400px] border-l bg-background">
          <InstructorVideoSidebar
            videoId={videoId}
            currentVideoTime={currentTime}
            videoPlayerRef={videoPlayerRef}
          />
        </div>
      </div>
    </div>
  )
}