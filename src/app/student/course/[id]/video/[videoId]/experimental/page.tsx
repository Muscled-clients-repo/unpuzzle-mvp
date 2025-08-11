"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import dynamic from "next/dynamic"
import { useAppStore } from "@/stores/app-store"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"

// Dynamically import components
const VideoPlayer = dynamic(
  () => import("@/components/video/VideoPlayerRefactored").then(mod => ({ 
    default: mod.VideoPlayerRefactored 
  })),
  { 
    loading: () => (
      <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
        <LoadingSpinner />
      </div>
    ),
    ssr: false
  }
)

const AIChatSidebar = dynamic(
  () => import("@/components/ai/ai-chat-sidebar").then(mod => ({
    default: mod.AIChatSidebar
  })),
  { 
    loading: () => (
      <div className="h-full flex items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    ),
    ssr: false
  }
)

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { mockCourses } from "@/data/mock"
import { 
  ChevronLeft, 
  ChevronRight, 
  BookOpen, 
  Clock, 
  CheckCircle2,
  Play,
  List,
  MessageSquare,
  Plus,
  PenTool,
  MessageCircle,
  Lightbulb,
  AlertCircle
} from "lucide-react"
import Link from "next/link"

export default function ExperimentalVideoPlayerPage() {
  const params = useParams()
  const courseId = params.id as string
  const videoId = params.videoId as string
  // Use Zustand store instead of local state
  const currentTime = useAppStore((state) => state.currentTime)
  const isPlaying = useAppStore((state) => state.isPlaying)
  
  // Use store for sidebar state, keep experimental UI state local
  const showChatSidebar = useAppStore((state) => state.preferences.showChatSidebar)
  const sidebarWidth = useAppStore((state) => state.preferences.sidebarWidth)
  const updatePreferences = useAppStore((state) => state.updatePreferences)
  const [isResizing, setIsResizing] = useState(false)
  const [showPauseActions, setShowPauseActions] = useState(false)
  const [annotationMode, setAnnotationMode] = useState<'note' | 'question' | null>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)
  
  const course = mockCourses.find(c => c.id === courseId)
  const currentVideo = course?.videos.find(v => v.id === videoId)
  const currentVideoIndex = course?.videos.findIndex(v => v.id === videoId) ?? -1

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return
    
    const newWidth = window.innerWidth - e.clientX
    if (newWidth >= 300 && newWidth <= 600) {
      updatePreferences({ sidebarWidth: newWidth })
    }
  }

  const handleMouseUp = () => {
    setIsResizing(false)
  }

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'col-resize'
    } else {
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
  }, [isResizing, handleMouseMove])

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

  const nextVideo = currentVideoIndex < course.videos.length - 1 ? course.videos[currentVideoIndex + 1] : null
  const prevVideo = currentVideoIndex > 0 ? course.videos[currentVideoIndex - 1] : null
  const courseProgress = Math.round(((currentVideoIndex + 1) / course.videos.length) * 100)

  const handleTimeUpdate = (time: number) => {
    // VideoEngine already updates store.currentTime - no need to do anything
    console.log('Time update:', time)
  }

  const handlePlay = () => {
    // VideoEngine already updates store.isPlaying = true
    setShowPauseActions(false)
    setAnnotationMode(null)
  }

  const handlePause = (time: number) => {
    // VideoEngine already updates store.isPlaying = false and store.currentTime
    
    // Show pause actions after a brief delay, checking fresh store state
    setTimeout(() => {
      const currentState = useAppStore.getState()
      if (!currentState.isPlaying) { // Check if still paused
        setShowPauseActions(true)
      }
    }, 500)
  }

  const handleAgentTrigger = (type: "hint" | "check" | "reflect" | "path") => {
    console.log(`AI Agent triggered: ${type} at ${currentTime}s`)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const handleAnnotation = (type: 'note' | 'question') => {
    setAnnotationMode(type)
    console.log(`Starting ${type} annotation at ${formatTime(currentTime)}`)
    // Here you would open annotation UI
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Course Progress Bar */}
      <div className="border-b bg-background flex-shrink-0">
        <div className="container px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button asChild variant="ghost" size="sm">
                <Link href="/student">
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Link>
              </Button>
              <div>
                <h2 className="font-semibold">{course.title}</h2>
                <p className="text-sm text-muted-foreground">
                  🧪 EXPERIMENTAL - Lesson {currentVideoIndex + 1} of {course.videos.length}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                Course Progress: {courseProgress}%
              </div>
              <Progress value={courseProgress} className="w-32" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Video Player */}
          <div className="relative flex-1 bg-black p-4">
            <VideoPlayer
              videoUrl={currentVideo.videoUrl}
              title={currentVideo.title}
              transcript={currentVideo.transcript}
              onTimeUpdate={handleTimeUpdate}
              onPause={handlePause}
              onPlay={handlePlay}
              onEnded={() => console.log('Video ended')}
            />

            {/* Pause Actions Overlay */}
            {!isPlaying && showPauseActions && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border max-w-md w-full mx-4">
                  <div className="text-center mb-6">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Clock className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">
                      Video Paused
                    </h3>
                    <p className="text-sm text-gray-600">
                      At {formatTime(currentTime)} - What would you like to do?
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 mb-4">
                    <Button
                      variant="outline"
                      onClick={() => handleAnnotation('note')}
                      className="flex items-center gap-3 p-4 h-auto justify-start bg-yellow-50 border-yellow-200 hover:bg-yellow-100"
                    >
                      <PenTool className="h-5 w-5 text-yellow-600" />
                      <div className="text-left">
                        <div className="font-medium text-gray-900">Add Note</div>
                        <div className="text-xs text-gray-600">Jot down key insights</div>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => handleAnnotation('question')}
                      className="flex items-center gap-3 p-4 h-auto justify-start bg-blue-50 border-blue-200 hover:bg-blue-100"
                    >
                      <MessageCircle className="h-5 w-5 text-blue-600" />
                      <div className="text-left">
                        <div className="font-medium text-gray-900">Ask Question</div>
                        <div className="text-xs text-gray-600">Get AI help or clarification</div>
                      </div>
                    </Button>

                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPauseActions(false)}
                      className="flex-1"
                    >
                      Continue Watching
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setShowPauseActions(false)
                        updatePreferences({ showChatSidebar: true })
                      }}
                      className="flex items-center gap-2"
                    >
                      <Lightbulb className="h-4 w-4" />
                      AI Assistant
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Annotation Mode Indicator */}
            {annotationMode && (
              <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border z-20">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${
                    annotationMode === 'note' ? 'bg-yellow-500' :
                    annotationMode === 'question' ? 'bg-blue-500' : 'bg-green-500'
                  }`} />
                  <span className="text-sm font-medium capitalize">{annotationMode} Mode</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAnnotationMode(null)}
                    className="h-6 w-6 p-0 ml-2"
                  >
                    ×
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Video Info & Controls */}
          <div className="border-t bg-background p-6">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold">{currentVideo.title}</h1>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    🧪 Experimental
                  </Badge>
                  <Button
                    variant="outline"
                    onClick={() => updatePreferences({ showChatSidebar: !showChatSidebar })}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    {showChatSidebar ? 'Hide' : 'Show'} AI Assistant
                  </Button>
                </div>
              </div>
              
              <p className="text-muted-foreground mb-4">
                {currentVideo.description}
              </p>

              {/* Experimental Features Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-800 mb-1">Experimental Features</h4>
                    <p className="text-sm text-amber-700">
                      This page includes new annotation and interaction features. 
                      Try pausing the video to see enhanced options!
                    </p>
                  </div>
                </div>
              </div>

              {/* Video Navigation */}
              <div className="flex items-center justify-between">
                <Button
                  asChild
                  variant="outline"
                  disabled={!prevVideo}
                  className="flex items-center gap-2"
                >
                  {prevVideo ? (
                    <Link href={`/learn/course/${courseId}/video/${prevVideo.id}/experimental`}>
                      <ChevronLeft className="h-4 w-4" />
                      Previous Lesson
                    </Link>
                  ) : (
                    <span>
                      <ChevronLeft className="h-4 w-4" />
                      Previous Lesson
                    </span>
                  )}
                </Button>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{currentVideo.duration}</span>
                  </div>
                  <Badge variant="secondary">
                    Lesson {currentVideoIndex + 1}
                  </Badge>
                </div>

                <Button
                  asChild
                  disabled={!nextVideo}
                  className="flex items-center gap-2"
                >
                  {nextVideo ? (
                    <Link href={`/learn/course/${courseId}/video/${nextVideo.id}/experimental`}>
                      Next Lesson
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <span>
                      Course Complete!
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </div>
            </div>

            {/* Course Content */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Course Content
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {course.videos.map((video, index) => (
                    <Link
                      key={video.id}
                      href={`/learn/course/${courseId}/video/${video.id}/experimental`}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        video.id === videoId 
                          ? 'bg-primary/10 border border-primary/20' 
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                        {video.id === videoId ? (
                          <Play className="h-4 w-4" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{video.title}</p>
                        <p className="text-xs text-muted-foreground">{video.duration}</p>
                      </div>
                      {index < currentVideoIndex && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* AI Chat Sidebar */}
        {showChatSidebar && (
          <>
            {/* Resize Handle */}
            <div
              className="w-1 bg-border hover:bg-primary/20 cursor-col-resize transition-colors relative group"
              onMouseDown={handleMouseDown}
            >
              <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-primary/10" />
            </div>
            
            {/* Sidebar */}
            <div 
              ref={sidebarRef}
              className="flex-shrink-0 h-full overflow-hidden border-l"
              style={{ width: `${sidebarWidth}px` }}
            >
              <AIChatSidebar
                courseId={courseId}
                videoId={videoId}
                currentTime={currentTime}
                onAgentTrigger={handleAgentTrigger}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}