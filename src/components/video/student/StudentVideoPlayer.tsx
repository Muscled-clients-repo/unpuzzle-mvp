"use client"

import { useState, useRef, useEffect, useCallback, Suspense } from "react"
import { VideoPlayerCore, VideoPlayerCoreRef } from "../core/VideoPlayerCore"
import { useAppStore } from "@/stores/app-store"
import { useVideoAgentSystem } from "@/lib/video-agent-system"
import { useReflectionMutation } from "@/hooks/use-reflection-mutation"
import { useReflectionsQuery } from "@/hooks/use-reflections-query"
import { useQuizAttemptMutation } from "@/hooks/use-quiz-attempt-mutation"
import { deleteAllVoiceMemosAction } from "@/app/actions/reflection-actions"
import { useCourseStructureQuery } from "@/hooks/use-course-structure-query"
import Link from "next/link"
import dynamic from "next/dynamic"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare } from "lucide-react"

// PERFORMANCE P2: Dynamically import AI sidebar with Suspense boundary
const AIChatSidebarV2 = dynamic(
  () => import("@/components/student/ai/AIChatSidebarV2").then(mod => ({
    default: mod.AIChatSidebarV2
  })),
  {
    ssr: false
  }
)

// PERFORMANCE P2: Suspense fallback for AI sidebar
const SidebarSkeleton = () => (
  <div className="h-full flex flex-col items-center justify-center bg-background p-6 gap-4">
    <LoadingSpinner />
    <p className="text-sm text-muted-foreground">Loading AI Assistant...</p>
  </div>
)

export interface StudentVideoPlayerRef {
  pause: () => void
  play: () => void
  isPaused: () => boolean
  getCurrentTime: () => number
}

interface StudentVideoPlayerProps {
  videoUrl: string | null  // Allow null for loading state
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
  isInstructorMode?: boolean  // Disable AI sidebar for instructor view
  customSidebar?: React.ReactNode  // Custom sidebar component (e.g., InstructorVideoSidebar)
  courseStructure?: {
    chapters: {
      id: string
      title: string
      order: number
      videos: {
        id: string
        title: string
        duration_seconds: number
        order: number
        chapter_id: string
      }[]
    }[]
  } | null
}

export function StudentVideoPlayer(props: StudentVideoPlayerProps) {
  // Video player ref for imperative control
  const videoPlayerRef = useRef<VideoPlayerCoreRef>(null)

  // TanStack mutations for reflection and quiz submission
  const reflectionMutation = useReflectionMutation()
  const quizAttemptMutation = useQuizAttemptMutation()

  // Query to fetch existing reflections for this video
  const reflectionsQuery = useReflectionsQuery(props.videoId || '', props.courseId || '')

  // Query to fetch course structure for outline
  const courseStructureQuery = useCourseStructureQuery(props.courseId || null)
  const courseStructure = courseStructureQuery.data

  // DEBUG: Log course structure query state
  useEffect(() => {
    console.log('[CourseStructure] Query state:', {
      courseId: props.courseId,
      isLoading: courseStructureQuery.isLoading,
      isError: courseStructureQuery.isError,
      error: courseStructureQuery.error,
      hasData: !!courseStructure,
      chaptersCount: courseStructure?.chapters?.length || 0,
      data: courseStructure
    })
  }, [props.courseId, courseStructureQuery.isLoading, courseStructureQuery.isError, courseStructure])

  // State machine for agent system with mutations
  const { context, dispatch, setVideoRef, setVideoId, setCourseId, loadInitialMessages, clearAudioMessages, addMessage, addOrUpdateMessage } = useVideoAgentSystem({
    reflectionMutation: reflectionMutation.mutateAsync,
    quizAttemptMutation: quizAttemptMutation.mutateAsync
  })

  // State for sidebar
  // Note: We get currentTime from videoPlayerRef when needed to avoid re-renders on every time update
  const showChatSidebar = useAppStore((state) => state.preferences.showChatSidebar)
  const sidebarWidth = useAppStore((state) => state.preferences.sidebarWidth)
  const updatePreferences = useAppStore((state) => state.updatePreferences)

  // REMOVED: loadCourseVideo call - parent page handles this
  // Calling it here causes duplicate loads and regenerates HMAC tokens

  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  // Student-specific state for enhanced interactions
  const [highlightedSegment, setHighlightedSegment] = useState<number | null>(null)

  // Connect video ref to state machine with retry logic
  useEffect(() => {
    const connectVideoRef = () => {
      if (videoPlayerRef.current) {
        setVideoRef(videoPlayerRef.current)
        return true
      } else {
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
    }, 200)

    // Clean up after 10 seconds
    const timeout = setTimeout(() => {
      clearInterval(retryInterval)
    }, 10000)

    return () => {
      clearInterval(retryInterval)
      clearTimeout(timeout)
    }
  }, [setVideoRef])

  // Set video ID and course ID for AI agent context
  useEffect(() => {
    setVideoId(props.videoId || null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.videoId])

  useEffect(() => {
    setCourseId(props.courseId || null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.courseId])

  // Load existing reflections and convert them to audio messages for persistence
  useEffect(() => {
    if (reflectionsQuery.data?.success && reflectionsQuery.data.data) {
      const reflections = reflectionsQuery.data.data

      // Convert voice reflections to audio messages
      const audioMessages = reflections
        .filter(reflection => reflection.reflection_type === 'voice')
        .map(reflection => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reflectionsQuery.data])

  // Cleanup function to delete all voice memos
  const handleDeleteAllVoiceMemos = async () => {
    if (confirm('Are you sure you want to delete ALL voice memos? This cannot be undone.')) {
      try {
        clearAudioMessages()
        const result = await deleteAllVoiceMemosAction()

        if (result.success) {
          alert(result.message)
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

  // Student-specific: Enhanced interactions between sidebar and video
  const handleSegmentClick = (segmentTime: number, segmentIndex: number) => {
    setHighlightedSegment(segmentIndex)
  }

  const handleVideoTimeUpdate = (time: number) => {
    // Call the original handler
    props.onTimeUpdate?.(time)
  }

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
          const currentTime = videoPlayerRef.current?.getCurrentTime() || 0
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
  }, [context.videoState?.isPlaying, dispatch])

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
    dispatch({
      type: 'VIDEO_PLAYED',
      payload: {}
    })
  }

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

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Video Player Section */}
        <div className="flex-1 bg-black p-4">
          {/* PERFORMANCE P2: Show skeleton only for video while data loads, keep UI visible */}
          {!props.videoUrl ? (
            <div className="aspect-video bg-black flex items-center justify-center rounded-lg">
              <div className="text-center text-white/80">
                <LoadingSpinner />
                <p className="mt-4 text-sm">Loading video...</p>
              </div>
            </div>
          ) : (
            <VideoPlayerCore
              ref={videoPlayerRef}
              {...props}
              onTimeUpdate={handleVideoTimeUpdate}
              onPause={handleVideoPause}
              onPlay={handleVideoPlay}
              // Pass segment handlers to core player
              onSetInPoint={handleSetInPoint}
              onSetOutPoint={handleSetOutPoint}
              onSendToChat={handleSendSegmentToChat}
              onClearSelection={handleClearSegment}
              onUpdateSegment={handleUpdateSegmentContext}
              inPoint={context.segmentState.inPoint}
              outPoint={context.segmentState.outPoint}
            />
          )}
        </div>

        {/* Video Info & Features - Below the video */}
        <div className="border-t bg-background p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold">{props.title || "Untitled Video"}</h1>
              </div>
              {!props.isInstructorMode && (
                <Button
                  variant="outline"
                  onClick={() => updatePreferences({ showChatSidebar: !showChatSidebar })}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {showChatSidebar ? 'Hide' : 'Show'} AI Assistant
                </Button>
              )}
            </div>

            {/* Course Outline / Lesson Segments */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Course Outline</CardTitle>
              </CardHeader>
              <CardContent>
                {courseStructureQuery.isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg animate-pulse">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : courseStructure?.chapters && courseStructure.chapters.length > 0 ? (
                  <div className="space-y-4">
                    {courseStructure.chapters.map((chapter, chapterIndex) => (
                      <div key={chapter.id}>
                        <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                          {chapter.title}
                        </h3>
                        <div className="space-y-2">
                          {chapter.videos.map((video, videoIndex) => {
                            const globalIndex = courseStructure.chapters
                              .slice(0, chapterIndex)
                              .reduce((sum, ch) => sum + ch.videos.length, 0) + videoIndex
                            const isCurrentVideo = video.id === props.videoId
                            const minutes = Math.floor(video.duration_seconds / 60)
                            const seconds = video.duration_seconds % 60

                            return (
                              <Link
                                key={video.id}
                                href={`/student/course/${props.courseId}/video/${video.id}`}
                                className={`flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors ${
                                  isCurrentVideo ? 'bg-primary/10 border border-primary/20' : ''
                                }`}
                              >
                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                  isCurrentVideo ? 'bg-primary text-primary-foreground' : 'bg-primary/20'
                                }`}>
                                  {globalIndex + 1}
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium">{video.title}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {minutes}:{seconds.toString().padStart(2, '0')}
                                  </div>
                                </div>
                              </Link>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No course outline available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Sidebar - Custom (instructor) or AI Chat (student) */}
      {props.customSidebar ? (
        // Instructor mode: Show custom sidebar (InstructorVideoSidebar)
        <div className="w-[400px] border-l bg-background flex-shrink-0">
          {props.customSidebar}
        </div>
      ) : (
        // Student mode: Show AI Chat Sidebar
        !props.isInstructorMode && showChatSidebar && (
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
              {/* PERFORMANCE P2: Suspense boundary for AI sidebar - better perceived performance */}
              <Suspense fallback={<SidebarSkeleton />}>
                <AIChatSidebarV2
                  messages={context.messages}
                  isVideoPlaying={context.videoState?.isPlaying || false}
                  videoId={props.videoId}
                  courseId={props.courseId}
                  currentVideoTime={videoPlayerRef.current?.getCurrentTime() || 0}
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
                  loadInitialMessages={loadInitialMessages}
                />
              </Suspense>
            </div>
          </>
        )
      )}
    </div>
  )
}
