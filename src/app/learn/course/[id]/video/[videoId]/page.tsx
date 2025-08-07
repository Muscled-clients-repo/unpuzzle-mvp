"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { useAppStore } from "@/stores/app-store"
import { VideoPlayer } from "@/components/video/video-player"
import { AIChatSidebar } from "@/components/ai/ai-chat-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { mockCourses, mockUsers } from "@/data/mock"
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
  const [currentTime, setCurrentTime] = useState(0)
  const [showChatSidebar, setShowChatSidebar] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(384) // 384px = 24rem = w-96
  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  
  const course = mockCourses.find(c => c.id === courseId)
  const currentVideo = course?.videos.find(v => v.id === videoId)
  const currentVideoIndex = course?.videos.findIndex(v => v.id === videoId) ?? -1
  const learner = mockUsers.learners[0]

  if (!course || !currentVideo) {
    return (
      <div className="flex min-h-screen flex-col">
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Video Not Found</h1>
            <Button asChild>
              <Link href="/learn">Back to Dashboard</Link>
            </Button>
          </div>
        </main>
      </div>
    )
  }

  const nextVideo = currentVideoIndex < course.videos.length - 1 ? course.videos[currentVideoIndex + 1] : null
  const prevVideo = currentVideoIndex > 0 ? course.videos[currentVideoIndex - 1] : null
  
  // Calculate progress through course
  const courseProgress = Math.round(((currentVideoIndex + 1) / course.videos.length) * 100)

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time)
  }

  const handleAgentTrigger = (type: "hint" | "check" | "reflect" | "path") => {
    console.log(`AI Agent triggered: ${type} at ${currentTime}s`)
    // This would trigger the AI chat sidebar to show relevant content
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return
    
    const newWidth = window.innerWidth - e.clientX
    // Constrain width between 300px and 600px
    if (newWidth >= 300 && newWidth <= 600) {
      setSidebarWidth(newWidth)
    }
  }

  const handleMouseUp = () => {
    setIsResizing(false)
  }

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      // Prevent text selection while resizing
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
  }, [isResizing])

  // Access Zustand store for direct communication (no DOM events needed)
  const { inPoint, outPoint } = useAppStore()

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Course Progress Bar */}
      <div className="border-b bg-background flex-shrink-0">
        <div className="container px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button asChild variant="ghost" size="sm">
                <Link href="/learn">
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Link>
              </Button>
              <div>
                <h2 className="font-semibold">{course.title}</h2>
                <p className="text-sm text-muted-foreground">
                  Lesson {currentVideoIndex + 1} of {course.videos.length}
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
            <div className="flex-1 bg-black p-4">
              <VideoPlayer
                videoUrl={currentVideo.videoUrl}
                title={currentVideo.title}
                transcript={currentVideo.transcript}
                onTimeUpdate={handleTimeUpdate}
                onPause={(time) => console.log('Paused at', time)}
                onPlay={() => console.log('Playing')}
                onEnded={() => console.log('Video ended')}
                timestamps={currentVideo.timestamps}
              />
            </div>

            {/* Video Info & Controls */}
            <div className="border-t bg-background p-6">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-2xl font-bold">{currentVideo.title}</h1>
                  <Button
                    variant="outline"
                    onClick={() => setShowChatSidebar(!showChatSidebar)}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    {showChatSidebar ? 'Hide' : 'Show'} AI Assistant
                  </Button>
                </div>
                
                <p className="text-muted-foreground mb-4">
                  {currentVideo.description}
                </p>

                {/* Video Navigation */}
                <div className="flex items-center justify-between">
                  <Button
                    asChild
                    variant="outline"
                    disabled={!prevVideo}
                    className="flex items-center gap-2"
                  >
                    {prevVideo ? (
                      <Link href={`/learn/course/${courseId}/video/${prevVideo.id}`}>
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
                      <Link href={`/learn/course/${courseId}/video/${nextVideo.id}`}>
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

              {/* Video Timestamps */}
              {currentVideo.timestamps && currentVideo.timestamps.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <List className="h-5 w-5" />
                      Chapter Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {currentVideo.timestamps.map((timestamp) => (
                        <div
                          key={timestamp.time}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer"
                          onClick={() => {
                            // Would seek to timestamp in real implementation
                            console.log('Seek to', timestamp.time)
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <Badge 
                              variant={
                                timestamp.type === "chapter" ? "default" :
                                timestamp.type === "concept" ? "secondary" : "outline"
                              }
                              className="text-xs"
                            >
                              {timestamp.type}
                            </Badge>
                            <span className="font-medium">{timestamp.label}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {Math.floor(timestamp.time / 60)}:{(timestamp.time % 60).toString().padStart(2, '0')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Course Playlist */}
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
                        href={`/learn/course/${courseId}/video/${video.id}`}
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