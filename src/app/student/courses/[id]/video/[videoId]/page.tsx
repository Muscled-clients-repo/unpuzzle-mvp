"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
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
  const courseId = params.id as string
  const videoId = params.videoId as string
  
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
  
  // Add loading state
  const [isLoading, setIsLoading] = useState(true)
  
  // Load student video data for course videos
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      if (!isStandaloneLesson) {
        console.log('📹 Loading student video data for:', videoId)
        console.log('📚 Loading course data for:', courseId)
        await Promise.all([
          loadStudentVideo(videoId),
          loadCourseById(courseId)
        ])
      }
      // Give a small delay to ensure store is updated
      setTimeout(() => setIsLoading(false), 100)
    }
    loadData()
  }, [isStandaloneLesson, videoId, courseId, loadStudentVideo, loadCourseById])
  
  // Load lessons if needed for standalone
  useEffect(() => {
    const loadStandaloneLessons = async () => {
      if (isStandaloneLesson && lessons.length === 0) {
        setIsLoading(true)
        await loadLessons()
        setTimeout(() => setIsLoading(false), 100)
      }
    }
    loadStandaloneLessons()
  }, [isStandaloneLesson, lessons.length, loadLessons])
  
  // Track view for standalone lesson
  useEffect(() => {
    if (isStandaloneLesson && lessons.length > 0) {
      const lesson = lessons.find(l => l.id === videoId)
      if (lesson) {
        trackView(videoId)
      }
    }
  }, [isStandaloneLesson, videoId, lessons.length, lessons, trackView])
  
  // Get video data based on context - use store data for course videos
  const course = !isStandaloneLesson ? currentCourse : null
  const standaloneLesson = isStandaloneLesson ? lessons.find(l => l.id === videoId) : null
  
  const currentVideo = isStandaloneLesson 
    ? standaloneLesson 
      ? {
          id: standaloneLesson.id,
          title: standaloneLesson.title,
          description: standaloneLesson.description,
          videoUrl: standaloneLesson.videoUrl || standaloneLesson.youtubeUrl || '',
          duration: standaloneLesson.duration || '10:00',
          transcript: [],
          timestamps: []
        }
      : null
    : storeVideoData || course?.videos?.find(v => v.id === videoId) // Use store video data or find in course videos
    
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
    return (
      <div className="flex min-h-screen flex-col">
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Video Not Found</h1>
            <Button asChild>
              <Link href="/student">Back to Dashboard</Link>
            </Button>
          </div>
        </main>
      </div>
    )
  }

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
    // VideoEngine automatically updates store.currentTime - no action needed
    console.log('Time update:', time)
  }

  const handlePause = (time: number) => {
    console.log('Paused at', time)
  }

  const handlePlay = () => {
    console.log('Playing')
  }

  const handleEnded = () => {
    console.log('Video ended')
  }

  return (
    <div className="fixed inset-0 top-16 bg-background">
      {/* V2 Video Player with integrated AI sidebar - takes full viewport minus header */}
      <StudentVideoPlayerV2
        videoUrl={currentVideo.videoUrl}
        title={currentVideo.title}
        transcript={currentVideo.transcript?.join(' ')}
        videoId={videoId}
        onTimeUpdate={handleTimeUpdate}
        onPause={handlePause}
        onPlay={handlePlay}
        onEnded={handleEnded}
      />
    </div>
  )
}