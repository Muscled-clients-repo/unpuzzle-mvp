"use client"

import { useState, useRef, useEffect } from "react"
import { StudentVideoPlayer, StudentVideoPlayerRef } from "./StudentVideoPlayer"
import { useAppStore } from "@/stores/app-store"
import { useVideoAgentSystem } from "@/lib/video-agent-system"
import dynamic from "next/dynamic"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, Eye, Clock, Sparkles, Puzzle, X } from "lucide-react"

// Dynamically import the AIChatSidebarV2 component for enhanced features
const AIChatSidebarV2 = dynamic(
  () => import("@/components/student/ai/AIChatSidebarV2").then(mod => ({
    default: mod.AIChatSidebarV2
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

// All props that the original StudentVideoPlayer accepts
interface StudentVideoPlayerV2Props {
  videoUrl: string
  title?: string
  transcript?: string
  videoId?: string
  onTimeUpdate?: (time: number) => void
  onPause?: (time: number) => void
  onPlay?: () => void
  onEnded?: () => void
}

export function StudentVideoPlayerV2(props: StudentVideoPlayerV2Props) {
  // Video player ref for imperative control
  const videoPlayerRef = useRef<StudentVideoPlayerRef>(null)
  
  // State machine for agent system
  const { context, dispatch, setVideoRef } = useVideoAgentSystem()
  
  // State for sidebar
  const currentTime = useAppStore((state) => state.currentTime)
  const showChatSidebar = useAppStore((state) => state.preferences.showChatSidebar)
  const sidebarWidth = useAppStore((state) => state.preferences.sidebarWidth)
  const updatePreferences = useAppStore((state) => state.updatePreferences)
  
  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  
  // V2-specific state for enhanced interactions
  const [highlightedSegment, setHighlightedSegment] = useState<number | null>(null)
  
  // Connect video ref to state machine
  useEffect(() => {
    if (videoPlayerRef.current) {
      setVideoRef(videoPlayerRef.current)
    }
  }, [])
  
  // Handle resize
  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return
    
    const newWidth = window.innerWidth - e.clientX
    // Constrain width between 300px and 600px
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
  }, [isResizing])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }
  
  // REMOVED OLD handleAgentTrigger - no longer needed
  
  // V2-specific: Enhanced interactions between sidebar and video
  const handleSegmentClick = (segmentTime: number, segmentIndex: number) => {
    // This is V2-only behavior
    setHighlightedSegment(segmentIndex)
    setSidebarMessage(`Jumping to segment ${segmentIndex + 1}`)
    
    // You could trigger video seek here if you had a ref to the video
    // For now, just log it
    console.log(`V2 Feature: Seeking to ${segmentTime}s for segment ${segmentIndex + 1}`)
  }
  
  const handleVideoTimeUpdate = (time: number) => {
    // Call the original handler
    props.onTimeUpdate?.(time)
    
    // V2-only: Check if we're in a special segment and notify sidebar
    if (time > 30 && time < 60) {
      setSidebarMessage("You're in the advanced section!")
    }
  }
  
  // V2-specific: Sidebar can request video actions
  const handleSidebarVideoRequest = (action: "play" | "pause" | "seek", time?: number) => {
    setVideoAction(action)
    if (action === "seek" && time !== undefined) {
      console.log(`V2: Sidebar requested seek to ${time}s`)
    }
  }
  
  // REMOVED formatTimestamp - handled by state machine
  
  // Handle video pause (manual)
  const handleVideoPause = (time: number) => {
    // Call original handler if provided
    props.onPause?.(time)
    
    // Dispatch manual pause to state machine
    dispatch({
      type: 'VIDEO_MANUALLY_PAUSED',
      payload: { time }
    })
  }
  
  // Handle video play
  const handleVideoPlay = () => {
    // Call original handler if provided
    props.onPlay?.()
    
    // Dispatch play to state machine
    dispatch({
      type: 'VIDEO_PLAYED',
      payload: {}
    })
  }
  
  // REMOVED handleHintResponse - handled by state machine
  
  // Handle agent button clicks from sidebar
  const handleAgentRequest = (agentType: string) => {
    dispatch({
      type: 'AGENT_BUTTON_CLICKED',
      payload: agentType
    })
  }

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Video Player Section */}
        <div className="flex-1 bg-black p-4">
          <StudentVideoPlayer 
            ref={videoPlayerRef}
            {...props}
            onTimeUpdate={handleVideoTimeUpdate}  // V2 enhanced handler
            onPause={handleVideoPause}  // V2 enhanced pause handler
            onPlay={handleVideoPlay}  // V2 enhanced play handler
          />
        </div>

        {/* Video Info & Features - Below the video */}
        <div className="border-t bg-background p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold">{props.title || "Untitled Video"}</h1>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    1,234 views
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    10:00
                  </span>
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-4 w-4" />
                    42 AI interactions
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => updatePreferences({ showChatSidebar: !showChatSidebar })}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                {showChatSidebar ? 'Hide' : 'Show'} AI Assistant
              </Button>
            </div>
            
            <p className="text-muted-foreground mb-4">
              Learn the fundamentals of React Hooks including useState, useEffect, and custom hooks. 
              This comprehensive lesson covers everything you need to know to start using hooks in your React applications.
            </p>
            
            {/* Course Outline / Lesson Segments */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Course Outline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div 
                    className={`flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer ${highlightedSegment === 0 ? 'bg-primary/10 border border-primary/20' : ''}`}
                    onClick={() => handleSegmentClick(0, 0)}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium">
                      1
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Introduction to Hooks</div>
                      <div className="text-sm text-muted-foreground">Understanding the basics • 0:00</div>
                    </div>
                  </div>
                  <div 
                    className={`flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer ${highlightedSegment === 1 ? 'bg-primary/10 border border-primary/20' : ''}`}
                    onClick={() => handleSegmentClick(180, 1)}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium">
                      2
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">useState Hook</div>
                      <div className="text-sm text-muted-foreground">Managing component state • 3:00</div>
                    </div>
                  </div>
                  <div 
                    className={`flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer ${highlightedSegment === 2 ? 'bg-primary/10 border border-primary/20' : ''}`}
                    onClick={() => handleSegmentClick(300, 2)}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium">
                      3
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">useEffect Hook</div>
                      <div className="text-sm text-muted-foreground">Side effects in components • 5:00</div>
                    </div>
                  </div>
                  <div 
                    className={`flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer ${highlightedSegment === 3 ? 'bg-primary/10 border border-primary/20' : ''}`}
                    onClick={() => handleSegmentClick(420, 3)}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium">
                      4
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Custom Hooks</div>
                      <div className="text-sm text-muted-foreground">Building your own hooks • 7:00</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
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
            className="flex-shrink-0 h-full overflow-hidden border-l bg-background"
            style={{ width: `${sidebarWidth}px` }}
          >
            <AIChatSidebarV2
              messages={context.messages}
              onAgentRequest={handleAgentRequest}
              onAgentAccept={(id) => dispatch({ type: 'ACCEPT_AGENT', payload: id })}
              onAgentReject={(id) => dispatch({ type: 'REJECT_AGENT', payload: id })}
            />
          </div>
        </>
      )}
    </div>
  )
}