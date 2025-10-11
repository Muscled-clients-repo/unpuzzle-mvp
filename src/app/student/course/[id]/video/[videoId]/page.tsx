"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useParams, useSearchParams } from "next/navigation"
import dynamic from "next/dynamic"
import { useAppStore } from "@/stores/app-store"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"

// Dynamically import the StudentVideoPlayer component with loading fallback
const StudentVideoPlayer = dynamic(
  () => import("@/components/video/student/StudentVideoPlayer").then(mod => ({
    default: mod.StudentVideoPlayer
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

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  ChevronLeft, 
  ChevronRight, 
  BookOpen, 
  Clock, 
  CheckCircle2,
  Play,
  List,
  MessageSquare
} from "lucide-react"
import Link from "next/link"

export default function VideoPlayerPage() {
  // 🔍 DEBUG: Track page component renders
  const renderCountRef = useState(() => ({ current: 0 }))[0]
  renderCountRef.current++
  console.log(`📄 [VideoPlayerPage] RENDER #${renderCountRef.current}`)

  const params = useParams()
  const searchParams = useSearchParams()
  const courseId = params.id as string
  const videoId = params.videoId as string

  // Calculate resume timestamp from URL params OR database progress
  const urlTimestamp = searchParams?.get('t') ? parseInt(searchParams.get('t')!) : 0
  
  // PERFORMANCE: Use selective subscriptions to prevent unnecessary re-renders
  // Only re-render when currentVideo changes, not on every store update
  const storeVideoData = useAppStore((state) => state.currentVideo)
  const loadStudentVideo = useAppStore((state) => state.loadStudentVideo)
  const currentCourse = useAppStore((state) => state.currentCourse)
  const loadCourseById = useAppStore((state) => state.loadCourseById)

  // OLD: Keep lessons for standalone mode - also use selective subscription
  const lessons = useAppStore((state) => state.lessons)
  const loadLessons = useAppStore((state) => state.loadLessons)
  const trackView = useAppStore((state) => state.trackView)

  // Check if this is a standalone lesson
  const isStandaloneLesson = courseId === 'lesson'

  // ALL HOOKS MUST BE DECLARED AT THE TOP BEFORE ANY CONDITIONAL LOGIC OR EARLY RETURNS
  const [isLoading, setIsLoading] = useState(true)

  // Define all callback handlers at the top (before any early returns)
  const handleTimeUpdate = useCallback((time: number) => {
    // Time update handling without progress saving
  }, [])

  const handlePause = useCallback((time: number) => {
    // Pause handler
  }, [])

  const handlePlay = useCallback(() => {
    // Play handler
  }, [])

  const handleEnded = useCallback(() => {
    // Ended handler
  }, [])

  // Get video data based on context - use store data for course videos
  // 001-COMPLIANT: Use course context from junction table video action
  // PERFORMANCE: Memoize to prevent creating new object references on every render
  const course = useMemo(() => {
    if (isStandaloneLesson) return null

    if (storeVideoData?.course) {
      return {
        id: storeVideoData.course.id,
        title: storeVideoData.course.title,
        description: storeVideoData.course.description,
        videos: [] // Not needed for video page
      }
    }

    return currentCourse
  }, [isStandaloneLesson, storeVideoData?.course, currentCourse])

  const standaloneLesson = isStandaloneLesson ? lessons?.find(l => l.id === videoId) : null

  // PERFORMANCE: Memoize to prevent creating new object references on every render
  const currentVideo = useMemo(() => {
    if (isStandaloneLesson) {
      if (!standaloneLesson) return null

      return {
        id: standaloneLesson.id,
        title: standaloneLesson.title,
        description: standaloneLesson.description,
        videoUrl: standaloneLesson.videoUrl,
        thumbnailUrl: standaloneLesson.thumbnailUrl,
        duration: standaloneLesson.duration,
        transcript: [],
        timestamps: []
      }
    }

    return storeVideoData // Use video data from junction table action
  }, [isStandaloneLesson, standaloneLesson, storeVideoData])

  // Only use URL timestamp for resume, no database progress loading
  const resumeTimestamp = urlTimestamp

  // Log resume functionality for debugging
  useEffect(() => {
    if (resumeTimestamp > 0) {
    }
  }, [resumeTimestamp])

  // 🔍 DEBUG: Track storeVideoData changes
  useEffect(() => {
    console.log(`📄 [VideoPlayerPage] storeVideoData updated:`, {
      videoUrl: storeVideoData?.videoUrl,
      hasData: !!storeVideoData
    })
  }, [storeVideoData])

  // Single effect to handle all loading - ensures hooks are always called in same order
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)

      if (!isStandaloneLesson) {
        // Load course video data
        try {
          await Promise.all([
            loadStudentVideo(videoId, courseId), // SECURITY: Pass courseId to verify video belongs to course
            loadCourseById(courseId)
          ])
        } catch (error) {
          console.error('Error loading course data:', error)
        }
      } else {
        // Load standalone lesson data
        if (lessons.length === 0) {
          try {
            await loadLessons()
          } catch (error) {
            console.error('Error loading lessons:', error)
          }
        }
      }

      // Data is ready, show content immediately
      setIsLoading(false)
    }

    loadData()
  }, [isStandaloneLesson, videoId, courseId, loadStudentVideo, loadCourseById, loadLessons, lessons?.length])

  // Track view for standalone lesson - separate effect for side effects
  useEffect(() => {
    if (isStandaloneLesson && lessons && lessons.length > 0) {
      const lesson = lessons.find(l => l.id === videoId)
      if (lesson) {
        trackView(videoId)
      }
    }
  }, [isStandaloneLesson, videoId, lessons, trackView])


  // Debug video URL - only log once when video loads - MOVED HERE FOR HOOK ORDER
  useEffect(() => {
    if (currentVideo) {
    }
  }, [currentVideo?.id, videoId])

  // For video page, we don't need video index since we have direct video access
  const currentVideoIndex = !isStandaloneLesson ? 0 : 0

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

  // Only show "Video Not Found" after loading is complete
  if (!course || !currentVideo) {
    console.error('Missing data:', { course: !!course, currentVideo: !!currentVideo })
    return (
      <div className="flex min-h-screen flex-col">
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Video Not Found</h1>
            <p className="text-muted-foreground mb-4">
              {!course ? 'Course not found' : 'Video not found'}
            </p>
            <Button asChild>
              <Link href="/student">Back to Dashboard</Link>
            </Button>
          </div>
        </main>
      </div>
    )
  }

  // Debug logging moved to hooks section above to maintain proper hook order

  // For video page, navigation is handled by course page - simplify for now
  const nextVideo = null // Could be implemented by fetching chapter videos
  const prevVideo = null // Could be implemented by fetching chapter videos
  
  // Calculate progress through course - for video page, show as individual progress
  const courseProgress = 100 // Individual video is 100% when playing

  // Check if video URL is valid before rendering player
  if (!currentVideo.videoUrl) {
    return (
      <div className="flex min-h-screen flex-col">
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Video Source Not Available</h1>
            <p className="text-muted-foreground mb-4">
              The video file for "{currentVideo.title}" is not available.
            </p>
            <Button asChild>
              <Link href={`/student/course/${courseId}`}>Back to Course</Link>
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 top-16 bg-background">
      {/* Student Video Player with integrated AI sidebar - takes full viewport minus header */}
      <StudentVideoPlayer
        videoUrl={currentVideo.videoUrl}
        title={currentVideo.title}
        transcript={currentVideo.transcriptText || currentVideo.transcript?.join(' ')}
        videoId={videoId}
        courseId={courseId}
        initialTime={resumeTimestamp || 0}
        autoplay={false}
        onTimeUpdate={handleTimeUpdate}
        onPause={handlePause}
        onPlay={handlePlay}
        onEnded={handleEnded}
      />
    </div>
  )
}