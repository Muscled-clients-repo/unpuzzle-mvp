"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { useAppStore } from "@/stores/app-store"
import { StudentLearnPageSkeleton, ChapterVideosSkeleton } from "@/components/common/CourseCardSkeleton"
import { InstructorVideoView } from "@/components/video/views/InstructorVideoView"
import { apiClient } from "@/lib/api-client"
import { useVideoAgentSystem } from "@/lib/video-agent-system"

// Dynamically import the VideoPlayer component with loading fallback
const VideoPlayer = dynamic(
  () => import("@/components/video/student/StudentVideoPlayer").then(mod => ({ 
    default: mod.StudentVideoPlayer 
  })),
  { 
    loading: () => (
      <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
        <div className="w-16 h-16 bg-gray-700 rounded-full animate-pulse" />
      </div>
    ),
    ssr: false // Disable SSR for video player as it uses browser APIs
  }
)

// Import StudentVideoPlayerRef for video control
import type { StudentVideoPlayerRef } from "@/components/video/student/StudentVideoPlayer"

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  ChevronLeft,
  ChevronRight,
  Clock,
  MessageSquare,
  Share2,
  Eye,
  Sparkles,
  AlertCircle,
  ArrowRight,
  Copy,
  CheckCircle,
  CheckCircle2,
  Mail,
  Download,
  X,
  Lock,
  MessageCircle,
  ThumbsUp,
  Zap,
  BookOpen,
  Play,
  User
} from "lucide-react"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { CommentsSection } from "@/components/lesson/CommentsSection"
import { RelatedLessonsCarousel } from "@/components/lesson/RelatedLessonsCarousel"
import { Textarea } from "@/components/ui/textarea"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"

// Type for section videos
type SectionVideo = {id: string, title?: string, description?: string, duration?: number, url?: string, cdn_url?: string, file_url?: string, filename?: string}

export default function StandaloneLessonPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const contentId = params.id as string
  const lessonId = contentId // For AI interaction tracking
  
  // Check for instructor mode
  const isInstructorMode = searchParams.get('instructor') === 'true'
  
  // Check for video query param (course deep linking)
  const videoQueryParam = searchParams.get('video') || searchParams.get('v')
  
  // Detect if this is a course or standalone lesson
  const isStandaloneLesson = contentId === 'lesson'
  const isCourse = !isStandaloneLesson
  
  // Use Zustand store - both lesson and course data
  const { 
    lessons, 
    loadLessons, 
    trackView,
    trackAiInteraction,
    user,
    // Course-related from student video page
    currentVideo: storeVideoData,
    loadStudentVideo,
    reflections,
    addReflection,
    currentCourse,
    loadCourseById,
    // Course loading states
    loading: courseLoading,
    error: courseError
  } = useAppStore()
  
  // Video agent system for V2 sidebar
  const { context, dispatch, setVideoRef } = useVideoAgentSystem()
  
  // State for current video in course (for video switching)
  const [currentVideoId, setCurrentVideoId] = useState<string>('')
  
  // State for lazy loading section videos
  const [sectionVideos, setSectionVideos] = useState<{[sectionId: string]: SectionVideo[]}>({})
  const [loadingSections, setLoadingSections] = useState<{[sectionId: string]: boolean}>({})
  const loadedSectionsRef = useRef<Set<string>>(new Set())
  
  // Video player state from store
  const currentTime = useAppStore((state) => state.currentTime)
  const showChatSidebar = useAppStore((state) => state.preferences.showChatSidebar)
  const sidebarWidth = useAppStore((state) => state.preferences.sidebarWidth)
  const updatePreferences = useAppStore((state) => state.updatePreferences)
  // const fetchYouTubeTranscript = useAppStore((state) => state.fetchYouTubeTranscript)
  
  const [isResizing, setIsResizing] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [freeAiInteractions, setFreeAiInteractions] = useState(0)
  const [showEmailCapture, setShowEmailCapture] = useState(false)
  const [email, setEmail] = useState("")
  const [showExitIntent, setShowExitIntent] = useState(false)
  const [hasInteractedWithExit, setHasInteractedWithExit] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const videoPlayerRef = useRef<StudentVideoPlayerRef>(null)
  const [videoPlayerReady, setVideoPlayerReady] = useState(false)
  
  const FREE_AI_LIMIT = 3
  const [lessonLoading, setLessonLoading] = useState(false)
  const [courseLoadingState, setCourseLoadingState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle')
  
  // Get sections from current course
  const sections = useMemo(() => currentCourse?.sections || [], [currentCourse?.sections])
  
  // Reset course loading state when course ID changes
  useEffect(() => {
    if (isCourse) {
      setCourseLoadingState('idle')
      // Reset section videos when course changes
      loadedSectionsRef.current.clear()
      setSectionVideos({})
      setLoadingSections({})
    }
  }, [contentId, isCourse])
  
  // Load section videos lazily in background
  useEffect(() => {
    if (!currentCourse || !sections.length) return

    const loadSectionVideos = async () => {
      for (const section of sections) {
        // Skip if already loaded or loading
        if (loadedSectionsRef.current.has(section.id)) continue

        loadedSectionsRef.current.add(section.id)
        setLoadingSections(prev => ({ ...prev, [section.id]: true }))

        try {
          const response = await apiClient.get(`/api/v1/sections/${section.id}/media/`)
          
          if (response.status === 200 && response.data) {
            const responseData = response.data as any
            let videos: any[] = []
            
            // Handle nested response structure {success: true, data: {...}}
            const data = responseData.data || responseData
            
            // Handle different response formats
            if (Array.isArray(data)) {
              videos = data
            } else if (data.results && Array.isArray(data.results)) {
              videos = data.results
            } else if (data.mediaFiles && Array.isArray(data.mediaFiles)) {
              videos = data.mediaFiles
            } else if (data.videos && Array.isArray(data.videos)) {
              videos = data.videos
            } else if (data.media && Array.isArray(data.media)) {
              videos = data.media
            } else {
              // Try to find any array in the data as fallback
              for (const key of Object.keys(data)) {
                if (Array.isArray(data[key])) {
                  videos = data[key]
                  break
                }
              }
            }
            
            
            setSectionVideos(prev => ({
              ...prev, 
              [section.id]: videos
            }))
          }
        } catch (error) {
          console.error(`Failed to load videos for section ${section.id}:`, error)
          // Remove from loaded set on error so it can be retried
          loadedSectionsRef.current.delete(section.id)
        } finally {
          setLoadingSections(prev => ({ ...prev, [section.id]: false }))
        }
      }
    }

    loadSectionVideos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCourse?.id, sections.length])

  // Load data based on content type
  useEffect(() => {
    if (isStandaloneLesson) {
      // Load lessons for standalone mode
      if (lessons.length === 0) {
        setLessonLoading(true)
        loadLessons().finally(() => setLessonLoading(false))
      }
    } else if (isCourse) {
      // Load course data
      console.log('📚 Loading course data for:', contentId)
      console.log('📚 Current course state:', currentCourse)
      console.log('📚 Course loading state:', courseLoading)
      
      // Set loading state immediately
      setCourseLoadingState('loading')
      loadCourseById(contentId)
    }
  }, [contentId, isStandaloneLesson, isCourse, lessons.length, loadLessons, loadCourseById, currentCourse, courseLoading])
  
  // Update course loading state based on store state
  useEffect(() => {
    if (isCourse) {
      if (courseLoading) {
        setCourseLoadingState('loading')
      } else if (courseError) {
        setCourseLoadingState('error')
      } else if (currentCourse) {
        setCourseLoadingState('loaded')
      }
    }
  }, [isCourse, courseLoading, courseError, currentCourse])
  
  // Set current video for courses (from query param or first video from sections)
  useEffect(() => {
    if (isCourse && sections.length > 0) {
      let videoId = videoQueryParam || ''
      
      // If no video param, find the first video from sections
      if (!videoId) {
        for (const section of sections) {
          const videos = sectionVideos[section.id] || section.mediaFiles || []
          if (videos.length > 0) {
            videoId = videos[0].id
            break
          }
        }
      }
      
      console.log('📹 Setting current video ID:', videoId)
      if (videoId && videoId !== currentVideoId) {
        setCurrentVideoId(videoId)
        loadStudentVideo(videoId)
      }
    }
  }, [isCourse, sections, sectionVideos, videoQueryParam, currentVideoId, loadStudentVideo])
  
  // Set video ref for agent system when it becomes available
  useEffect(() => {
    // Check periodically if the ref is available (for dynamic imports)
    const checkAndSetRef = () => {
      if (videoPlayerRef.current && setVideoRef) {
        console.log('🎬 Setting video ref for agent system')
        // Pass videoId and courseId to the agent system
        const videoId = isCourse ? currentVideoId : contentId
        const courseId = isCourse ? contentId : undefined
        setVideoRef(videoPlayerRef.current, videoId, courseId)
        setVideoPlayerReady(true)
        return true
      }
      return false
    }
    
    // Try immediately
    if (checkAndSetRef()) return
    
    // If not available, try again after a delay
    const timer = setInterval(() => {
      if (checkAndSetRef()) {
        clearInterval(timer)
      }
    }, 100)
    
    // Cleanup
    return () => clearInterval(timer)
  }, [setVideoRef, videoPlayerReady, currentVideoId, contentId, isCourse])
  
  // Video switching function for courses
  const switchToVideo = (videoId: string) => {
    if (isCourse) {
      setCurrentVideoId(videoId)
      loadStudentVideo(videoId)
      
      // Update URL with query param  
      const newUrl = `/student/courses/learn/${contentId}?video=${videoId}`
      router.push(newUrl, { scroll: false })
    }
  }
  
  // Handle 404 redirect for courses (only after loading is complete)
  useEffect(() => {
    if (isCourse && !courseLoading && courseError === 'Course not found') {
      console.log('🚫 Redirecting to 404 - Course not found:', courseError)
      router.push('/404')
    }
  }, [isCourse, courseLoading, courseError, router])

  // Get the lesson (for standalone mode)
  const lesson = isStandaloneLesson ? lessons.find(l => l.id === contentId) : null
  
  // Get current video data based on mode
  const currentVideo = useMemo(() => {
    if (!isCourse) {
      // Standalone lesson mode
      return lesson ? {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        videoUrl: lesson.videoUrl || lesson.youtubeUrl || '',
        duration: lesson.duration || '10:00',
        transcript: [],
        timestamps: []
      } : null
    }
    
    // Course mode - find video from sections
    if (currentVideoId && sections.length > 0) {
      for (const section of sections) {
        const videos = sectionVideos[section.id] || []
        const video = videos.find(v => v.id === currentVideoId)
        if (video) {
          
          return {
            id: video.id,
            title: video.title || video.filename || 'Untitled Video',
            description: video.description || '',
            videoUrl: video.cdn_url || video.url || video.file_url || '',
            duration: video.duration ? `${Math.floor(video.duration / 60)}:${(video.duration % 60).toString().padStart(2, '0')}` : '10:00',
            transcript: storeVideoData?.transcript || [],
            timestamps: storeVideoData?.timestamps || [],
            // Keep the original video object for debugging
            _raw: video
          }
        }
      }
    }
    
    // Fallback to store data if available
    return storeVideoData
  }, [isCourse, currentVideoId, sections, sectionVideos, lesson, storeVideoData])
  
  // Course video navigation with sections
  const { currentVideoIndex, nextVideo, prevVideo } = useMemo(() => {
    if (!isCourse || !currentVideoId || sections.length === 0) {
      return { currentVideoIndex: -1, nextVideo: null, prevVideo: null }
    }
    
    // Flatten all videos from sections in order
    const allVideos: any[] = []
    for (const section of sections) {
      const videos = sectionVideos[section.id] || []
      allVideos.push(...videos)
    }
    
    const index = allVideos.findIndex(v => v.id === currentVideoId)
    
    return {
      currentVideoIndex: index,
      nextVideo: index >= 0 && index < allVideos.length - 1 ? allVideos[index + 1] : null,
      prevVideo: index > 0 ? allVideos[index - 1] : null
    }
  }, [isCourse, currentVideoId, sections, sectionVideos])
  
  // Track view for lessons
  useEffect(() => {
    if (isStandaloneLesson && lesson && lesson.status === 'published') {
      console.log('🎯 Lesson loaded:', lesson.title, 'YouTube URL:', lesson.youtubeUrl)
      trackView(contentId)
    }
  }, [isStandaloneLesson, lesson, contentId, trackView])
  
  // Handle resize
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return
    
    const newWidth = window.innerWidth - e.clientX
    // Constrain width between 300px and 600px
    if (newWidth >= 300 && newWidth <= 600) {
      updatePreferences({ sidebarWidth: newWidth })
    }
  }, [isResizing, updatePreferences])

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
  }, [])

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
  }, [isResizing, handleMouseMove, handleMouseUp])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }
  
  const handleTimeUpdate = (time: number) => {
    // Time updates are handled internally by the video player
    // No need to dispatch to agent system
    // console.log('Time update:', time)
  }

  const handleVideoPause = (time: number) => {
    console.log('Paused at', time)
    
    // Notify V2 context
    dispatch({
      type: 'VIDEO_MANUALLY_PAUSED',
      payload: { time }
    })
  }

  const handleVideoPlay = () => {
    console.log('Playing')
    
    // Notify V2 context
    dispatch({
      type: 'VIDEO_PLAYED',
      payload: {}
    })
  }

  const handleVideoEnded = () => {
    console.log('Video ended')
    // Video ended is not a standard action in the agent system
    // It can be handled through other mechanisms if needed
  }

  const handleAgentTrigger = (type: "hint" | "check" | "reflect" | "path") => {
    console.log(`AI Agent triggered: ${type} at ${currentTime}s`)
    
    // Check AI interaction limits for non-users
    if (!user) {
      if (freeAiInteractions >= FREE_AI_LIMIT) {
        setShowEmailCapture(true)
        return
      }
      setFreeAiInteractions(prev => prev + 1)
    }
    
    trackAiInteraction(lessonId)
  }

  // V2 Event Handlers for Advanced AI Features
  const handleAgentRequest = (agentType: string) => {
    const currentTime = videoPlayerRef.current?.getCurrentTime() || 0
    console.log('[Learn Page] Agent button clicked:', agentType, currentTime)
    
    dispatch({
      type: 'AGENT_BUTTON_CLICKED',
      payload: { agentType, time: currentTime }
    })
  }

  const handleQuizAnswer = (questionId: string, selectedAnswer: number) => {
    console.log('[Learn Page] Quiz answer selected:', { questionId, selectedAnswer })
    
    dispatch({
      type: 'QUIZ_ANSWER_SELECTED',
      payload: { questionId, selectedAnswer }
    })
  }

  const handleReflectionSubmit = async (type: string, data: Record<string, unknown>) => {
    console.log('[Learn Page] Reflection submitted:', { type, data })
    
    // Get current video context
    const videoId = currentVideo?.id || (isCourse ? currentVideoId : contentId)
    const courseId = isCourse ? contentId : undefined
    const currentTime = videoPlayerRef.current?.getCurrentTime() || 0
    
    // Validate video ID
    if (!videoId) {
      console.error('[Learn Page] No video ID available for reflection')
      // Could show error toast here
      return
    }
    
    console.log('[Learn Page] Video context:', { videoId, courseId, timestamp: currentTime })
    
    // Enhanced payload with video context
    const enhancedPayload = {
      type,
      data: {
        ...data,
        videoId,
        courseId,
        timestamp: currentTime,
        videoTitle: currentVideo?.title || lesson?.title || 'Unknown Video'
      }
    }
    
    console.log('[Learn Page] Enhanced reflection payload:', enhancedPayload)
    
    // Dispatch to StateMachine (which will now handle API calls)
    dispatch({
      type: 'REFLECTION_SUBMITTED',
      payload: enhancedPayload
    })
  }

  const handleReflectionTypeChosen = (reflectionType: string) => {
    console.log('[Learn Page] Reflection type chosen:', reflectionType)
    
    dispatch({
      type: 'REFLECTION_TYPE_CHOSEN',
      payload: { reflectionType }
    })
  }

  const handleReflectionCancel = () => {
    console.log('[Learn Page] Reflection cancelled')
    
    dispatch({
      type: 'REFLECTION_CANCELLED',
      payload: {}
    })
  }

  const handleSetInPoint = () => {
    console.log('[Learn Page] Setting in point')
    dispatch({
      type: 'SET_IN_POINT',
      payload: {}
    })
  }

  const handleSetOutPoint = () => {
    console.log('[Learn Page] Setting out point')
    dispatch({
      type: 'SET_OUT_POINT',
      payload: {}
    })
  }

  const handleClearSegment = () => {
    console.log('[Learn Page] Clearing segment')
    dispatch({
      type: 'CLEAR_SEGMENT',
      payload: {}
    })
  }

  const handleSendSegmentToChat = () => {
    console.log('[Learn Page] Sending segment to chat')
    dispatch({
      type: 'SEND_SEGMENT_TO_CHAT',
      payload: {}
    })
  }
  
  // Exit intent detection - TEMPORARILY DISABLED FOR DEVELOPMENT
  useEffect(() => {
    // const handleMouseLeave = (e: MouseEvent) => {
    //   if (e.clientY <= 0 && !hasInteractedWithExit && !user) {
    //     setShowExitIntent(true)
    //     setHasInteractedWithExit(true)
    //   }
    // }
    
    // document.addEventListener('mouseleave', handleMouseLeave)
    // return () => document.removeEventListener('mouseleave', handleMouseLeave)
  }, [hasInteractedWithExit, user])

  // Show skeleton loader for courses and lessons
  if ((isCourse && courseLoadingState === 'loading') || (isStandaloneLesson && lessonLoading)) {
    return <StudentLearnPageSkeleton />
  }
  
  // Handle instructor mode
  if (isInstructorMode) {
    return <InstructorVideoView />
  }

  
  // Show not found if no current video (for courses)

  // Check if lesson is draft (only for standalone lessons)
  if (isStandaloneLesson && lesson && lesson.status === 'draft' && !user) {
    return (
      <div className="flex min-h-screen flex-col">
        <main className="flex-1 flex items-center justify-center">
          <Card className="p-6">
            <CardContent className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Lesson Not Available</h3>
              <p className="text-muted-foreground mb-4">
                This lesson is currently in draft mode.
              </p>
              <Button asChild>
                <Link href="/">Back to Home</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Header - Different for courses vs lessons */}
      {isStandaloneLesson && lesson && (
        <div className="border-b bg-background flex-shrink-0">
          <div className="container px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button asChild variant="ghost" size="sm">
                  <Link href="/">
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back to Home
                  </Link>
                </Button>
                <div>
                  <h2 className="font-semibold flex items-center gap-2">
                    {lesson.isFree && (
                      <Badge variant="secondary" className="text-xs">
                        Free
                      </Badge>
                    )}
                    Standalone Lesson
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {lesson.tags.join(" • ")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                >
                  {copiedLink ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Share2 className="mr-2 h-4 w-4" />
                      Share
                    </>
                  )}
                </Button>
                {lesson.ctaText && lesson.ctaLink && (
                  <Button asChild>
                    <Link href={lesson.ctaLink}>
                      {lesson.ctaText}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Video Player */}
          <div className="flex-1 bg-black p-4">
            <VideoPlayer
              ref={videoPlayerRef}
              videoUrl={currentVideo?.videoUrl || ''}
              title={currentVideo?.title || ''}
              transcript={currentVideo?.transcript || []}
              videoId={isCourse ? currentVideoId : contentId}
              onTimeUpdate={handleTimeUpdate}
              onPause={handleVideoPause}
              onPlay={handleVideoPlay}
              onEnded={handleVideoEnded}
            />
          </div>

          {/* Video Info & Features */}
          <div className="border-t bg-background p-6">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                {isStandaloneLesson && lesson ? (
                  <div>
                    <h1 className="text-2xl font-bold">{lesson.title}</h1>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        {lesson.views.toLocaleString()} views
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {lesson.duration || '10:00'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-4 w-4" />
                        {lesson.aiInteractions} AI interactions
                      </span>
                    </div>
                  </div>
                ) : isCourse && currentCourse ? (
                  <div>
                    <h1 className="text-2xl font-bold">{currentCourse.title}</h1>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      {currentCourse.instructor && (
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {currentCourse.instructor.name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {Math.floor(currentCourse.duration / 60)} minutes
                      </span>
                      <span className="flex items-center gap-1">
                        <Play className="h-4 w-4" />
                        {currentCourse.videos?.length || 0} videos
                      </span>
                    </div>
                    {currentVideo && (
                      <div className="mt-2 text-lg font-medium text-muted-foreground">
                        Current: {currentVideo.title}
                      </div>
                    )}
                  </div>
                ) : (
                  <h1 className="text-2xl font-bold">Course</h1>
                )}
                <Button
                  variant="outline"
                  onClick={() => updatePreferences({ showChatSidebar: !showChatSidebar })}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {showChatSidebar ? 'Hide' : 'Show'} AI Assistant
                </Button>
              </div>
              
              <p className="text-muted-foreground mb-4">
                {currentVideo?.description}
              </p>
              
              {/* Course Video Navigation (only for courses) */}
              {isCourse && (
                <div className="flex items-center justify-between mb-6">
                  <Button
                    variant="outline"
                    disabled={!prevVideo}
                    className="flex items-center gap-2"
                    onClick={() => prevVideo && switchToVideo(prevVideo.id)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous Lesson
                  </Button>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{currentVideo?.duration}</span>
                    </div>
                    <Badge variant="secondary">
                      Lesson {currentVideoIndex + 1}
                    </Badge>
                  </div>

                  <Button
                    disabled={!nextVideo}
                    className="flex items-center gap-2"
                    onClick={() => nextVideo && switchToVideo(nextVideo.id)}
                  >
                    {nextVideo ? (
                      <>
                        Next Lesson
                        <ChevronRight className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Course Complete!
                        <CheckCircle2 className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              )}
              
              {/* Course Sections and Videos (only for courses) */}
              {isCourse && currentCourse && sections.length > 0 && (
                <div className="mb-6 space-y-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Course Content
                  </h2>
                  
                  {sections.map((section, sectionIndex) => (
                    <Card key={section.id} className="overflow-hidden">
                      <CardHeader className="bg-muted/50 py-3">
                        <CardTitle className="text-base">
                          {section.title || `Chapter ${sectionIndex + 1}`}
                        </CardTitle>
                        {section.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {section.description}
                          </p>
                        )}
                      </CardHeader>
                      
                      <CardContent className="p-0">
                        <div className="space-y-0">
                          {loadingSections[section.id] ? (
                            <ChapterVideosSkeleton count={2} />
                          ) : sectionVideos[section.id] && Array.isArray(sectionVideos[section.id]) ? (
                            sectionVideos[section.id].map((media, mediaIndex: number) => {
                              const isCurrentVideo = media.id === currentVideoId
                              const isCompleted = false // TODO: Track completion
                              
                              return (
                                <div
                                  key={media.id}
                                  className={`flex items-center gap-3 p-3 transition-colors cursor-pointer border-b last:border-b-0 ${
                                    isCurrentVideo 
                                      ? 'bg-primary/10 border-l-2 border-l-primary' 
                                      : 'hover:bg-muted'
                                  }`}
                                  onClick={() => switchToVideo(media.id)}
                                >
                                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                                    isCurrentVideo 
                                      ? 'bg-primary text-primary-foreground' 
                                      : isCompleted
                                      ? 'bg-green-100 dark:bg-green-950'
                                      : 'bg-muted'
                                  }`}>
                                    {isCurrentVideo ? (
                                      <Play className="h-4 w-4" />
                                    ) : isCompleted ? (
                                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                    ) : (
                                      <span className="font-medium">{mediaIndex + 1}</span>
                                    )}
                                  </div>
                                  
                                  <div className="flex-1">
                                    <p className="font-medium text-sm">
                                      {media.title || media.filename || 'Untitled Video'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {media.duration ? `${Math.floor(media.duration / 60)} min` : '~10 min'}
                                    </p>
                                  </div>
                                  
                                  {isCurrentVideo && (
                                    <Badge variant="default" className="text-xs">
                                      Playing
                                    </Badge>
                                  )}
                                  {isCompleted && !isCurrentVideo && (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  )}
                                </div>
                              )
                            })
                          ) : (
                            <div className="p-3 text-center text-sm text-muted-foreground">
                              No videos in this section
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Unlock Full Course Banner (only for lessons) */}
              {isStandaloneLesson && lesson && lesson.relatedCourseId && !user && (
                <Card className="mb-4 border-primary bg-primary/5">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Lock className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">This is a preview lesson</p>
                          <p className="text-sm text-muted-foreground">
                            Unlock the full course with 12+ lessons
                          </p>
                        </div>
                      </div>
                      <Button asChild>
                        <Link href={`/course/${lesson.relatedCourseId}`}>
                          Unlock Full Course
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI Features Info (only for lessons) */}
              {isStandaloneLesson && lesson && (lesson.transcriptEnabled || lesson.confusionsEnabled || lesson.segmentSelectionEnabled) && (
                <Alert>
                  <Sparkles className="h-4 w-4" />
                  <AlertDescription>
                    <div className="flex justify-between items-start">
                      <div>
                        <strong>AI Features Available:</strong>
                        <div className="flex gap-4 mt-2">
                          {lesson.transcriptEnabled && (
                            <span className="text-sm">✓ Smart Transcript</span>
                          )}
                          {lesson.confusionsEnabled && (
                            <span className="text-sm">✓ Confusion Tracking</span>
                          )}
                          {lesson.segmentSelectionEnabled && (
                            <span className="text-sm">✓ Segment Analysis</span>
                          )}
                        </div>
                      </div>
                      {!user && (
                        <Badge variant="secondary" className="ml-4">
                          {FREE_AI_LIMIT - freeAiInteractions} free AI uses left
                        </Badge>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
            
            {/* Comments Section (only for lessons) */}
            {isStandaloneLesson && lesson && (
              <div className="mt-8">
                <CommentsSection 
                  lessonId={contentId}
                  user={user}
                  onSignupPrompt={() => setShowEmailCapture(true)}
                />
              </div>
            )}
            
            {/* Related Lessons (only for lessons) */}
            {isStandaloneLesson && lesson && (
              <div className="mt-8">
                <RelatedLessonsCarousel
                  currentLessonId={contentId}
                  lessons={lessons}
                  title="Continue Learning"
                />
              </div>
            )}
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
              <AIChatSidebarV2
                messages={context.messages}
                isVideoPlaying={context.videoState?.isPlaying || false}
                onAgentRequest={handleAgentRequest}
                onAgentAccept={(id) => dispatch({ type: 'ACCEPT_AGENT', payload: id })}
                onAgentReject={(id) => dispatch({ type: 'REJECT_AGENT', payload: id })}
                onQuizAnswer={handleQuizAnswer}
                onReflectionSubmit={handleReflectionSubmit}
                onReflectionTypeChosen={handleReflectionTypeChosen}
                onReflectionCancel={handleReflectionCancel}
                onSetInPoint={handleSetInPoint}
                onSetOutPoint={handleSetOutPoint}
                onClearSegment={handleClearSegment}
                onSendSegmentToChat={handleSendSegmentToChat}
                context={context}
              />
            </div>
          </>
        )}
      </div>
      
      {/* Email Capture Modal */}
      {showEmailCapture && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>You&apos;ve Used Your Free AI Credits</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Get unlimited AI interactions by signing up
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowEmailCapture(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-primary" />
                  <span className="text-sm">Download lesson transcript</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span className="text-sm">Unlimited AI interactions</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  <span className="text-sm">Access to discussion forum</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button className="w-full">
                  <Mail className="mr-2 h-4 w-4" />
                  Get Free Access
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  No credit card required • Instant access
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Exit Intent Popup - Email Collection */}
      {showExitIntent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl">Want More Free Lessons? 🎓</CardTitle>
                  <p className="text-muted-foreground mt-1">
                    Get exclusive AI-powered video lessons delivered weekly
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowExitIntent(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm">Free weekly lessons on trending topics</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm">AI-powered learning features included</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm">Early access to new courses</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full"
                />
                <Button className="w-full" size="lg">
                  <Mail className="mr-2 h-4 w-4" />
                  Send Me Free Lessons
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  No spam, unsubscribe anytime
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}