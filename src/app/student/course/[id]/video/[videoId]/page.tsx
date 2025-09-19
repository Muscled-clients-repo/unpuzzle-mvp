"use client"

import { useState, useEffect } from "react"
import { useParams, useSearchParams } from "next/navigation"
import dynamic from "next/dynamic"
import { useAppStore } from "@/stores/app-store"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"

// Dynamically import the V2 VideoPlayer component with loading fallback
const StudentVideoPlayerV2 = dynamic(
  () => import("@/components/video/student/StudentVideoPlayerV2").then(mod => ({ 
    default: mod.StudentVideoPlayerV2 
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
  const course = !isStandaloneLesson ? currentCourse : null
  const standaloneLesson = isStandaloneLesson ? lessons.find(l => l.id === videoId) : null

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
    : storeVideoData || course?.videos?.find(v => v.id === videoId) // Use store video data or find in course videos

  // Only use URL timestamp for resume, no database progress loading
  const resumeTimestamp = urlTimestamp

  // Log resume functionality for debugging
  useEffect(() => {
    if (resumeTimestamp > 0) {
      console.log(`🎯 Resuming video at ${resumeTimestamp} seconds from URL parameter (${Math.floor(resumeTimestamp / 60)}:${String(resumeTimestamp % 60).padStart(2, '0')})`)
    }
  }, [resumeTimestamp])

  // Single effect to handle all loading - ensures hooks are always called in same order
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)

      if (!isStandaloneLesson) {
        // Load course video data
        console.log('📹 Loading student video data for:', videoId)
        console.log('📚 Loading course data for:', courseId)
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
  }, [isStandaloneLesson, videoId, courseId, loadStudentVideo, loadCourseById, loadLessons, lessons.length])

  // Track view for standalone lesson - separate effect for side effects
  useEffect(() => {
    if (isStandaloneLesson && lessons.length > 0) {
      const lesson = lessons.find(l => l.id === videoId)
      if (lesson) {
        trackView(videoId)
      }
    }
  }, [isStandaloneLesson, videoId, lessons, trackView])


  // Debug video URL - only log once when video loads - MOVED HERE FOR HOOK ORDER
  useEffect(() => {
    if (currentVideo) {
      console.log('🎥 Video loaded:', {
        videoId,
        title: currentVideo.title,
        hasVideoUrl: !!currentVideo.videoUrl
      })
    }
  }, [currentVideo?.id, videoId])

  const currentVideoIndex = !isStandaloneLesson ? (course?.videos.findIndex(v => v.id === videoId) ?? -1) : 0

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

  const nextVideo = !isStandaloneLesson && course && currentVideoIndex < course.videos.length - 1 
    ? course.videos[currentVideoIndex + 1] 
    : null
  const prevVideo = !isStandaloneLesson && course && currentVideoIndex > 0 
    ? course.videos[currentVideoIndex - 1] 
    : null
  
  // Calculate progress through course
  const courseProgress = !isStandaloneLesson && course 
    ? Math.round(((currentVideoIndex + 1) / course.videos.length) * 100)
    : 100

  const handleTimeUpdate = (time: number) => {
    // Time update handling without progress saving
  }

  const handlePause = (time: number) => {
    console.log('⏸️ Video paused')
  }

  const handlePlay = () => {
    console.log('▶️ Video playing')
  }

  const handleEnded = () => {
    console.log('🏁 Video ended')
  }


  // Check if video URL is valid before rendering player
  if (!currentVideo.videoUrl) {
    console.error('❌ No video URL provided:', currentVideo)
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
      {/* V2 Video Player with integrated AI sidebar - takes full viewport minus header */}
      <StudentVideoPlayerV2
        videoUrl={currentVideo.videoUrl}
        title={currentVideo.title}
        transcript={currentVideo.transcript?.join(' ')}
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