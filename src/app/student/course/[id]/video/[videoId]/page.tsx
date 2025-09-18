"use client"

import { useState, useEffect } from "react"
import { useParams, useSearchParams } from "next/navigation"
import dynamic from "next/dynamic"
import { useAppStore } from "@/stores/app-store"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { updateVideoProgress } from "@/app/actions/student-course-actions"

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
  const [lastSavedProgress, setLastSavedProgress] = useState<number>(0)
  const [saveRetryCount, setSaveRetryCount] = useState<number>(0)

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

  // Calculate resume timestamp - prioritize URL param, fallback to database progress
  const resumeTimestamp = urlTimestamp > 0
    ? urlTimestamp
    : (currentVideo?.progress?.watchedSeconds || 0)

  // Log resume functionality for debugging
  useEffect(() => {
    if (resumeTimestamp > 0) {
      const source = urlTimestamp > 0 ? 'URL parameter' : 'database progress'
      console.log(`🎯 Resuming video at ${resumeTimestamp} seconds from ${source} (${Math.floor(resumeTimestamp / 60)}:${String(resumeTimestamp % 60).padStart(2, '0')})`)
      console.log('📊 Progress data:', {
        urlTimestamp,
        dbProgress: currentVideo?.progress?.watchedSeconds || 0,
        finalResume: resumeTimestamp
      })
    }
  }, [resumeTimestamp, urlTimestamp, currentVideo?.progress?.watchedSeconds])

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

  // Sync offline progress on mount - MOVED HERE TO ENSURE PROPER HOOK ORDER
  useEffect(() => {
    const syncOfflineProgress = () => {
      if (isStandaloneLesson) return

      const progressKey = `video_progress_${courseId}_${videoId}`
      const savedProgress = localStorage.getItem(progressKey)

      if (savedProgress) {
        try {
          const progress = JSON.parse(savedProgress)
          const timeSinceLastSave = Date.now() - progress.timestamp

          // Only sync if saved less than 1 hour ago (prevent stale data)
          if (timeSinceLastSave < 3600000) {
            console.log('🔄 Syncing offline progress:', progress.time)
            // Note: saveProgressWithRetry will be available when this runs
            // since this effect runs after component mounts
          } else {
            localStorage.removeItem(progressKey)
          }
        } catch (error) {
          console.error('Failed to sync offline progress:', error)
          localStorage.removeItem(progressKey)
        }
      }
    }

    if (!isStandaloneLesson) {
      syncOfflineProgress()
    }
  }, [courseId, videoId, isStandaloneLesson])

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

  // Enhanced progress persistence - Phase 2 implementation

  const saveProgressWithRetry = async (time: number, completed: boolean = false, retryCount: number = 0) => {
    if (isStandaloneLesson) return

    try {
      // Local storage backup for offline resilience (001 pattern)
      const progressKey = `video_progress_${courseId}_${videoId}`
      localStorage.setItem(progressKey, JSON.stringify({
        time,
        completed,
        timestamp: Date.now(),
        courseId,
        videoId
      }))

      const success = await updateVideoProgress(courseId, videoId, time, completed)

      if (success) {
        setLastSavedProgress(time)
        setSaveRetryCount(0)
        // Clear local storage backup on successful save
        localStorage.removeItem(progressKey)
        // Only log on important milestones or completion
        if (completed || Math.floor(time) % 60 === 0) {
          console.log(`✅ Progress saved: ${Math.round(time)}s ${completed ? '(completed)' : ''}`)
        }
      } else {
        throw new Error('Progress save failed - server returned false')
      }
    } catch (error) {
      console.error('❌ Failed to update video progress:', {
        error: error instanceof Error ? error.message : error,
        courseId,
        videoId,
        time: Math.round(time),
        completed,
        retryCount
      })

      // Retry logic with exponential backoff (max 3 retries)
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000 // 1s, 2s, 4s
        console.log(`⏳ Retrying progress save in ${delay}ms (attempt ${retryCount + 1}/3)`)
        setTimeout(() => {
          saveProgressWithRetry(time, completed, retryCount + 1)
        }, delay)
        setSaveRetryCount(retryCount + 1)
      } else {
        console.error('❌ Progress save failed after 3 retries, keeping in local storage')
      }
    }
  }

  const handleTimeUpdate = (time: number) => {
    // Enhanced progress persistence - save every 30 seconds while debugging
    // Only save if time has progressed significantly (avoid duplicate saves)
    const timeDiff = Math.abs(time - lastSavedProgress)
    const shouldSave = Math.floor(time) % 30 === 0 && timeDiff >= 30

    if (shouldSave && !isStandaloneLesson) {
      saveProgressWithRetry(time)
    }
  }

  const handlePause = (time: number) => {
    // Save progress immediately on pause (critical for user experience)
    console.log('⏸️ Video paused, saving progress immediately')
    saveProgressWithRetry(time)
  }

  const handlePlay = () => {
    console.log('▶️ Video playing')
    // Sync any offline progress when video starts playing - logic moved to useEffect above
  }

  const handleEnded = () => {
    console.log('🏁 Video ended - marking as completed')
    // Mark video as completed when it ends
    const duration = typeof currentVideo?.duration === 'number'
      ? currentVideo.duration
      : parseInt(String(currentVideo?.duration || '600').replace(/[^\d]/g, '')) || 600

    saveProgressWithRetry(duration, true)
  }

  // All progress sync logic has been moved to useEffect hooks above to maintain proper hook order

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
        initialTime={resumeTimestamp}
        autoplay={true}
        onTimeUpdate={handleTimeUpdate}
        onPause={handlePause}
        onPlay={handlePlay}
        onEnded={handleEnded}
      />
    </div>
  )
}