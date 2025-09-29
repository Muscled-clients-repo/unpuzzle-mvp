"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { StudentVideoPlayer, StudentVideoPlayerRef } from "./StudentVideoPlayer"
import { useAppStore } from "@/stores/app-store"
import { useVideoAgentSystem } from "@/lib/video-agent-system"
import { useReflectionMutation } from "@/hooks/use-reflection-mutation"
import { useReflectionsQuery } from "@/hooks/use-reflections-query"
import { useQuizAttemptMutation } from "@/hooks/use-quiz-attempt-mutation"
import { deleteAllVoiceMemosAction } from "@/app/actions/reflection-actions"
import { useSignedUrl } from "@/hooks/use-signed-url"
import dynamic from "next/dynamic"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, Eye, Clock, Sparkles, Puzzle, X, AlertCircle, RefreshCw } from "lucide-react"

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
  courseId?: string
  initialTime?: number
  autoplay?: boolean
  onTimeUpdate?: (time: number) => void
  onPause?: (time: number) => void
  onPlay?: () => void
  onEnded?: () => void
}

export function StudentVideoPlayerV2(props: StudentVideoPlayerV2Props) {
  // Video player ref for imperative control
  const videoPlayerRef = useRef<StudentVideoPlayerRef>(null)

  // Get signed URL for private video access
  const signedUrl = useSignedUrl(props.videoUrl || null, 30)

  // TanStack mutations for reflection and quiz submission
  const reflectionMutation = useReflectionMutation()
  const quizAttemptMutation = useQuizAttemptMutation()

  // Query to fetch existing reflections for this video
  const reflectionsQuery = useReflectionsQuery(props.videoId || '', props.courseId || '')

  // State machine for agent system with mutations
  const { context, dispatch, setVideoRef, setVideoId, setCourseId, loadInitialMessages, clearAudioMessages, addMessage, addOrUpdateMessage } = useVideoAgentSystem({
    reflectionMutation: reflectionMutation.mutateAsync,
    quizAttemptMutation: quizAttemptMutation.mutateAsync
  })

  // State for sidebar
  const currentTime = useAppStore((state) => state.currentTime)
  const showChatSidebar = useAppStore((state) => state.preferences.showChatSidebar)
  const sidebarWidth = useAppStore((state) => state.preferences.sidebarWidth)

  // Only log signed URL state on changes, not every render
  useEffect(() => {
    if (signedUrl.url) {
    } else if (signedUrl.error) {
      console.error('[STUDENT VIDEO PLAYER V2] Signed URL error:', signedUrl.error)
    }
  }, [signedUrl.url, signedUrl.error])
  const updatePreferences = useAppStore((state) => state.updatePreferences)
  
  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  
  // V2-specific state for enhanced interactions
  const [highlightedSegment, setHighlightedSegment] = useState<number | null>(null)
  
  // Connect video ref to state machine with retry logic
  useEffect(() => {
    // Only try to connect if we have a signed URL
    if (!signedUrl.url) {
      console.log('[V2] Waiting for signed URL before connecting video ref')
      return
    }

    const connectVideoRef = () => {
      if (videoPlayerRef.current) {
        console.log('[V2] Successfully connected video ref')
        setVideoRef(videoPlayerRef.current)
        return true
      } else {
        console.log('[V2] Video ref not available yet, retrying...')
        return false
      }
    }

    // Try immediately
    if (connectVideoRef()) {
      return
    }

    // If not available, retry with small delay
    const retryInterval = setInterval(() => {
      if (connectVideoRef()) {
        clearInterval(retryInterval)
      }
    }, 200) // Increased interval

    // Clean up after 10 seconds (increased timeout)
    const timeout = setTimeout(() => {
      clearInterval(retryInterval)
      console.warn('[V2] Failed to connect video ref after 10 seconds', {
        hasSignedUrl: !!signedUrl.url,
        hasVideoRef: !!videoPlayerRef.current
      })
    }, 10000)

    return () => {
      clearInterval(retryInterval)
      clearTimeout(timeout)
    }
  }, [setVideoRef, signedUrl.url]) // Added signedUrl.url dependency

  // Set video ID and course ID for AI agent context
  useEffect(() => {
    setVideoId(props.videoId || null)
  }, [props.videoId, setVideoId])

  useEffect(() => {
    setCourseId(props.courseId || null)
  }, [props.courseId, setCourseId])

  // Load existing reflections and convert them to audio messages for persistence
  useEffect(() => {
    if (reflectionsQuery.data?.success && reflectionsQuery.data.data) {
      const reflections = reflectionsQuery.data.data

      // Convert voice reflections to audio messages
      const audioMessages = reflections
        .filter(reflection => reflection.reflection_type === 'voice')
        .map(reflection => {
          // Use structured database columns (database optimization aligned)
          const fileUrl = reflection.file_url
          const duration = reflection.duration_seconds || 0
          const videoTimestamp = reflection.video_timestamp_seconds || 0

          if (fileUrl) {

            return {
              id: `audio-${reflection.id}`,
              type: 'audio' as const,
              state: 'permanent' as const,
              message: `Voice memo • ${Math.floor(videoTimestamp / 60)}:${Math.floor(videoTimestamp % 60).toString().padStart(2, '0')}`,
              timestamp: new Date(reflection.created_at).getTime(),
              audioData: {
                fileUrl,
                duration,
                videoTimestamp,
                reflectionId: reflection.id
              }
            }
          }
          return null
        })
        .filter(Boolean)

      if (audioMessages.length > 0) {
        loadInitialMessages(audioMessages)
      }
    }
  }, [reflectionsQuery.data, loadInitialMessages])

  // Cleanup function to delete all voice memos
  const handleDeleteAllVoiceMemos = async () => {
    if (confirm('Are you sure you want to delete ALL voice memos? This cannot be undone.')) {
      try {

        // 1. Clear from frontend (remove audio messages from chat)
        clearAudioMessages()

        // 2. Delete from server (database + files)
        const result = await deleteAllVoiceMemosAction()

        if (result.success) {
          alert(result.message)

          // 3. Refetch reflections to update UI
          reflectionsQuery.refetch()
        } else {
          console.error('[CLEANUP] Failed:', result.error)
          alert('Failed to delete voice memos: ' + result.error)
        }
      } catch (error) {
        console.error('[CLEANUP] Error:', error)
        alert('Error deleting voice memos: ' + error)
      }
    }
  }

  // Add keyboard shortcut for cleanup (Ctrl+Shift+Delete) and expose to console
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'Delete') {
        e.preventDefault()
        handleDeleteAllVoiceMemos()
      }
    }

    // Expose cleanup function to window for console access
    ;(window as any).deleteAllVoiceMemos = handleDeleteAllVoiceMemos

    document.addEventListener('keydown', handleKeydown)
    return () => {
      document.removeEventListener('keydown', handleKeydown)
      delete (window as any).deleteAllVoiceMemos
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
    // Note: setSidebarMessage was removed - it was test code
    
    // You could trigger video seek here if you had a ref to the video
    // For now, just log it
    console.log(`V2 Feature: Seeking to ${segmentTime}s for segment ${segmentIndex + 1}`)
  }
  
  const handleVideoTimeUpdate = (time: number) => {
    // Call the original handler
    props.onTimeUpdate?.(time)
    
    // V2-only: Check if we're in a special segment 
    // Note: setSidebarMessage was removed - it was test code
    if (time > 30 && time < 60) {
      // Could add special segment behavior here if needed
    }
  }
  
  // V2-specific: Sidebar can request video actions (removed - not used)
  
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

  // Handle spacebar and other keyboard shortcuts via state machine
  const handleVideoPlayerKeydown = useCallback((e: KeyboardEvent) => {
    // Check if in input field
    const isInInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)
    if (isInInput) return

    switch (e.key) {
      case ' ':
        e.preventDefault()
        // Instead of calling handlePlayPause directly, use state machine
        if (context.videoState?.isPlaying) {
          dispatch({
            type: 'VIDEO_MANUALLY_PAUSED',
            payload: { time: currentTime }
          })
        } else {
          dispatch({
            type: 'VIDEO_PLAYED',
            payload: {}
          })
        }
        break
      // Let other keys fall through to the original handler
    }
  }, [context.videoState?.isPlaying, currentTime, dispatch])

  // Add keyboard event listener for spacebar routing through state machine
  useEffect(() => {
    document.addEventListener('keydown', handleVideoPlayerKeydown)
    return () => {
      document.removeEventListener('keydown', handleVideoPlayerKeydown)
    }
  }, [handleVideoPlayerKeydown])

  // Handle video play
  const handleVideoPlay = () => {
    // Call original handler if provided
    props.onPlay?.()
    
    // Always dispatch the play event - the state machine will handle it properly
    // If it's a manual resume, the unactivated messages should be cleared
    dispatch({
      type: 'VIDEO_PLAYED',
      payload: {}
    })
  }
  
  // REMOVED handleHintResponse - handled by state machine
  
  // Handle agent button clicks from sidebar
  const handleAgentRequest = (agentType: string) => {
    // Get current time from video player ref
    const currentTime = videoPlayerRef.current?.getCurrentTime() || 0

    dispatch({
      type: 'AGENT_BUTTON_CLICKED',
      payload: { agentType, time: currentTime }
    })
  }

  // Handle quiz answer selection
  const handleQuizAnswer = (questionId: string, selectedAnswer: number) => {
    
    dispatch({
      type: 'QUIZ_ANSWER_SELECTED',
      payload: { questionId, selectedAnswer }
    })
  }

  // Handle reflection submission
  const handleReflectionSubmit = (type: string, data: any) => {

    // Add courseId to the data
    const enhancedData = {
      ...data,
      courseId: props.courseId
    }

    dispatch({
      type: 'REFLECTION_SUBMITTED',
      payload: { type, data: enhancedData }
    })
  }

  // Handle reflection type chosen
  const handleReflectionTypeChosen = (reflectionType: string) => {
    
    dispatch({
      type: 'REFLECTION_TYPE_CHOSEN',
      payload: { reflectionType }
    })
  }

  // Handle reflection cancel
  const handleReflectionCancel = () => {
    
    dispatch({
      type: 'REFLECTION_CANCELLED',
      payload: {}
    })
  }

  // Handle segment actions
  const handleSetInPoint = () => {
    dispatch({
      type: 'SET_IN_POINT',
      payload: {}
    })
  }

  const handleSetOutPoint = () => {
    dispatch({
      type: 'SET_OUT_POINT',
      payload: {}
    })
  }

  const handleClearSegment = () => {
    dispatch({
      type: 'CLEAR_SEGMENT',
      payload: {}
    })
  }

  const handleUpdateSegmentContext = (inPoint: number, outPoint: number) => {
    dispatch({
      type: 'UPDATE_SEGMENT',
      payload: { inPoint, outPoint }
    })
  }

  const handleSendSegmentToChat = () => {
    dispatch({
      type: 'SEND_SEGMENT_TO_CHAT',
      payload: {}
    })
  }

  // Handle signed URL loading and errors
  if (signedUrl.isLoading) {
    return (
      <div className="flex h-full w-full overflow-hidden">
        <div className="flex-1 flex items-center justify-center bg-black">
          <div className="text-center text-white">
            <LoadingSpinner />
            <p className="mt-4">Loading video...</p>
          </div>
        </div>
      </div>
    )
  }

  if (signedUrl.error) {
    return (
      <div className="flex h-full w-full overflow-hidden">
        <div className="flex-1 flex items-center justify-center bg-black">
          <div className="text-center text-white p-4">
            <AlertCircle className="h-8 w-8 mb-2 mx-auto" />
            <p className="mb-2">Failed to load video</p>
            <p className="text-sm text-gray-300 mb-4">Error: {signedUrl.error}</p>
            <p className="text-xs text-gray-400 mb-4">Original URL: {props.videoUrl}</p>
            <Button
              onClick={() => signedUrl.refresh()}
              variant="outline"
              className="text-black"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!signedUrl.url) {
    return (
      <div className="flex h-full w-full overflow-hidden">
        <div className="flex-1 flex items-center justify-center bg-black">
          <div className="text-center text-white">
            <p>No video URL available</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Video Player Section */}
        <div className="flex-1 bg-black p-4">
          <StudentVideoPlayer
            ref={videoPlayerRef}
            {...props}
            videoUrl={signedUrl.url} // Use signed URL instead of private URL
            onTimeUpdate={handleVideoTimeUpdate}  // V2 enhanced handler
            onPause={handleVideoPause}  // V2 enhanced pause handler
            onPlay={handleVideoPlay}  // V2 enhanced play handler
            // Pass segment handlers to child (these will be passed to VideoControls)
            onSetInPoint={handleSetInPoint}
            onSetOutPoint={handleSetOutPoint}
            onSendToChat={handleSendSegmentToChat}
            onClearSelection={handleClearSegment}
            onUpdateSegment={handleUpdateSegmentContext}
            inPoint={context.segmentState.inPoint}
            outPoint={context.segmentState.outPoint}
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
            className="border-l bg-background"
            style={{ width: `${sidebarWidth}px`, height: '100%', overflow: 'hidden', flexShrink: 0 }}
          >
            <AIChatSidebarV2
              messages={context.messages}
              isVideoPlaying={context.videoState?.isPlaying || false}
              videoId={props.videoId}
              courseId={props.courseId}
              currentVideoTime={currentTime}
              aiState={context.aiState}
              onAgentRequest={handleAgentRequest}
              onAgentAccept={(id) => dispatch({ type: 'ACCEPT_AGENT', payload: id })}
              onAgentReject={(id) => dispatch({ type: 'REJECT_AGENT', payload: id })}
              onQuizAnswer={handleQuizAnswer}
              onReflectionSubmit={handleReflectionSubmit}
              onReflectionTypeChosen={handleReflectionTypeChosen}
              onReflectionCancel={handleReflectionCancel}
              segmentContext={context.segmentState}
              onClearSegmentContext={handleClearSegment}
              onUpdateSegmentContext={handleUpdateSegmentContext}
              dispatch={dispatch}
              recordingState={context.recordingState}
              addMessage={addMessage}
              addOrUpdateMessage={addOrUpdateMessage}
            />
          </div>
        </>
      )}
    </div>
  )
}