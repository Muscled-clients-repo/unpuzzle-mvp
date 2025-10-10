"use client"

import { useState, useEffect } from "react"
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
  const params = useParams()
  const searchParams = useSearchParams()
  const courseId = params.id as string
  const videoId = params.videoId as string

  // Calculate resume timestamp from URL params OR database progress
  const urlTimestamp = searchParams?.get('t') ? parseInt(searchParams.get('t')!) : 0
  
  // NEW: Use student video slice for video data
  const {
    currentVideo: storeVideoData,
    loadStudentVideo,
    reflections,
    addReflection,
    currentCourse,
    loadCourseById
  } = useAppStore()
  
  // OLD: Keep lessons for standalone mode
  const { lessons, loadLessons, trackView } = useAppStore()
  
  // Check if this is a standalone lesson
  const isStandaloneLesson = courseId === 'lesson'

  // ALL HOOKS MUST BE DECLARED AT THE TOP BEFORE ANY CONDITIONAL LOGIC OR EARLY RETURNS
  const [isLoading, setIsLoading] = useState(true)

  // Get video data based on context - use store data for course videos
  // 001-COMPLIANT: Use course context from junction table video action
  const course = !isStandaloneLesson
    ? (storeVideoData?.course ? {
        id: storeVideoData.course.id,
        title: storeVideoData.course.title,
        description: storeVideoData.course.description,
        videos: [] // Not needed for video page
      } : currentCourse)
    : null

  const standaloneLesson = isStandaloneLesson ? lessons?.find(l => l.id === videoId) : null

  const currentVideo = isStandaloneLesson
    ? standaloneLesson
      ? {
          id: standaloneLesson.id,
          title: standaloneLesson.title,
          description: standaloneLesson.description,
          videoUrl: standaloneLesson.videoUrl,
          thumbnailUrl: standaloneLesson.thumbnailUrl,
          duration: standaloneLesson.duration,
          transcript: [],
          timestamps: []
        }
      : null
    : storeVideoData // Use video data from junction table action

  // Only use URL timestamp for resume, no database progress loading
  const resumeTimestamp = urlTimestamp

  // Log resume functionality for debugging
  useEffect(() => {
    if (resumeTimestamp > 0) {
    }
  }, [resumeTimestamp])

  // Single effect to handle all loading - ensures hooks are always called in same order
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)

      if (!isStandaloneLesson) {
        // Load course video data
        try {
          await Promise.all([
            loadStudentVideo(videoId),
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

      // Give a small delay to ensure store is updated
      setTimeout(() => setIsLoading(false), 100)
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

  const handleTimeUpdate = (time: number) => {
    // Time update handling without progress saving
  }

  const handlePause = (time: number) => {
  }

  const handlePlay = () => {
  }

  const handleEnded = () => {
  }


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