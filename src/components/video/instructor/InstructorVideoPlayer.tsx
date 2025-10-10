"use client"

import { useState, useRef, useEffect } from "react"
import { VideoPlayerCore, VideoPlayerCoreRef } from "../core/VideoPlayerCore"
import { useAppStore } from "@/stores/app-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Target, BarChart3, Users, Clock } from "lucide-react"
import { CheckpointEditorSidebar } from "./CheckpointEditorSidebar"

export interface InstructorVideoPlayerRef {
  pause: () => void
  play: () => void
  isPaused: () => boolean
  getCurrentTime: () => number
}

interface InstructorVideoPlayerProps {
  videoUrl: string
  videoId: string  // Required for instructors
  title?: string
  transcript?: string
  initialTime?: number
  autoplay?: boolean
  onTimeUpdate?: (time: number) => void
  onPause?: (time: number) => void
  onPlay?: () => void
  onEnded?: () => void
}

export function InstructorVideoPlayer(props: InstructorVideoPlayerProps) {
  // Video player ref for imperative control
  const videoPlayerRef = useRef<VideoPlayerCoreRef>(null)

  // State for sidebar
  const currentTime = useAppStore((state) => state.currentTime)
  const showCheckpointSidebar = useAppStore((state) => state.preferences.showChatSidebar) // Reuse same preference
  const sidebarWidth = useAppStore((state) => state.preferences.sidebarWidth)
  const updatePreferences = useAppStore((state) => state.updatePreferences)

  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  // Handle resize
  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return

    const newWidth = window.innerWidth - e.clientX
    // Constrain width between 400px and 700px (wider for checkpoint editor)
    if (newWidth >= 400 && newWidth <= 700) {
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
  }, [isResizing])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }

  const handleVideoTimeUpdate = (time: number) => {
    props.onTimeUpdate?.(time)
  }

  const handleVideoPause = (time: number) => {
    props.onPause?.(time)
  }

  const handleVideoPlay = () => {
    props.onPlay?.()
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Video Player Section */}
        <div className="flex-1 bg-black p-4">
          <VideoPlayerCore
            ref={videoPlayerRef}
            {...props}
            onTimeUpdate={handleVideoTimeUpdate}
            onPause={handleVideoPause}
            onPlay={handleVideoPlay}
          />
        </div>

        {/* Video Info & Analytics - Below the video */}
        <div className="border-t bg-background p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold">{props.title || "Untitled Video"}</h1>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    156 students
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Avg completion: 78%
                  </span>
                  <span className="flex items-center gap-1">
                    <BarChart3 className="h-4 w-4" />
                    12 checkpoints
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => updatePreferences({ showChatSidebar: !showCheckpointSidebar })}
              >
                <Target className="mr-2 h-4 w-4" />
                {showCheckpointSidebar ? 'Hide' : 'Show'} Checkpoint Editor
              </Button>
            </div>

            <p className="text-muted-foreground mb-4">
              Manage video checkpoints, view student completion stats, and edit interactive elements.
            </p>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Checkpoints
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12</div>
                  <p className="text-xs text-muted-foreground">8 required, 4 optional</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Avg Completion
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">78%</div>
                  <p className="text-xs text-muted-foreground">122 of 156 students</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Avg Quiz Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">85%</div>
                  <p className="text-xs text-muted-foreground">Across all quizzes</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Checkpoint Editor Sidebar */}
      {showCheckpointSidebar && (
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
            className="border-l bg-background"
            style={{ width: `${sidebarWidth}px`, height: '100%', overflow: 'hidden', flexShrink: 0 }}
          >
            <CheckpointEditorSidebar
              videoId={props.videoId}
              currentVideoTime={currentTime}
              videoPlayerRef={videoPlayerRef}
            />
          </div>
        </>
      )}
    </div>
  )
}
