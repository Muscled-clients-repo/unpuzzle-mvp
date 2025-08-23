"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { useAppStore } from "@/stores/app-store"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { InstructorVideoView } from "@/components/video/views/InstructorVideoView"

// Dynamically import the VideoPlayer component with loading fallback
const VideoPlayer = dynamic(
  () => import("@/components/video/student/StudentVideoPlayer").then(mod => ({ 
    default: mod.StudentVideoPlayer 
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

// Dynamically import the AIChatSidebar component
const AIChatSidebar = dynamic(
  () => import("@/components/student/ai/ai-chat-sidebar").then(mod => ({
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

export default function StandaloneLessonPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const contentId = params.id as string
  
  // Check for instructor mode
  const isInstructorMode = searchParams.get('instructor') === 'true'
  
  // Check for video query param (course deep linking)
  const videoQueryParam = searchParams.get('v')
  
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
  
  // State for current video in course (for video switching)
  const [currentVideoId, setCurrentVideoId] = useState<string>('')
  
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
  
  const FREE_AI_LIMIT = 3
  const [lessonLoading, setLessonLoading] = useState(false)
  const [courseLoadingState, setCourseLoadingState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle')
  
  // Reset course loading state when course ID changes
  useEffect(() => {
    if (isCourse) {
      setCourseLoadingState('idle')
    }
  }, [contentId, isCourse])

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
  }, [contentId, isStandaloneLesson, isCourse, lessons.length, loadLessons, loadCourseById])
  
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
  
  // Set current video for courses (from query param or first video)
  useEffect(() => {
    console.log('📹 Course video effect - isCourse:', isCourse, 'currentCourse:', currentCourse, 'videos:', currentCourse?.videos?.length)
    if (isCourse && currentCourse?.videos?.length) {
      const videoId = videoQueryParam || currentCourse.videos[0]?.id || ''
      console.log('📹 Setting current video ID:', videoId)
      setCurrentVideoId(videoId)
      
      if (videoId) {
        console.log('📹 Loading video data for:', videoId)
        loadStudentVideo(videoId)
      }
    } else if (isCourse && currentCourse && !currentCourse?.videos?.length) {
      console.log('📹 Course loaded but no videos available:', currentCourse)
    } else if (isCourse && !currentCourse) {
      console.log('📹 Course not loaded yet, waiting...')
    }
  }, [isCourse, currentCourse, currentCourse?.videos, videoQueryParam, loadStudentVideo])
  
  // Video switching function for courses
  const switchToVideo = (videoId: string) => {
    if (isCourse) {
      setCurrentVideoId(videoId)
      loadStudentVideo(videoId)
      
      // Update URL with query param
      const newUrl = `/learn/${contentId}?v=${videoId}`
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
  const currentVideo = isCourse 
    ? storeVideoData || currentCourse?.videos?.find(v => v.id === currentVideoId)
    : lesson 
      ? {
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          videoUrl: lesson.videoUrl || lesson.youtubeUrl || '',
          duration: lesson.duration || '10:00',
          transcript: [],
          timestamps: []
        }
      : null
  
  // Course video navigation
  const currentVideoIndex = isCourse && currentCourse?.videos 
    ? currentCourse.videos.findIndex(v => v.id === currentVideoId) 
    : -1
  const nextVideo = isCourse && currentCourse?.videos && currentVideoIndex < currentCourse.videos.length - 1 
    ? currentCourse.videos[currentVideoIndex + 1] 
    : null
  const prevVideo = isCourse && currentCourse?.videos && currentVideoIndex > 0 
    ? currentCourse.videos[currentVideoIndex - 1] 
    : null
  
  // Track view for lessons
  useEffect(() => {
    if (isStandaloneLesson && lesson && lesson.status === 'published') {
      console.log('🎯 Lesson loaded:', lesson.title, 'YouTube URL:', lesson.youtubeUrl)
      trackView(contentId)
    }
  }, [isStandaloneLesson, lesson, contentId, trackView])
  
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
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }
  
  const handleTimeUpdate = (time: number) => {
    // Remove console log to avoid spam
    // console.log('Time update:', time)
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
  
  // Exit intent detection
  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !hasInteractedWithExit && !user) {
        setShowExitIntent(true)
        setHasInteractedWithExit(true)
      }
    }
    
    document.addEventListener('mouseleave', handleMouseLeave)
    return () => document.removeEventListener('mouseleave', handleMouseLeave)
  }, [hasInteractedWithExit, user])

  // Show loading spinner for courses
  if (isCourse && courseLoadingState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading course...</p>
        </div>
      </div>
    )
  }

  // Show loading spinner for lessons
  if (isStandaloneLesson && lessonLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading lesson...</p>
        </div>
      </div>
    )
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
              videoUrl={currentVideo?.videoUrl || ''}
              title={currentVideo?.title || ''}
              transcript={currentVideo?.transcript || []}
              videoId={isCourse ? currentVideoId : contentId}
              onTimeUpdate={handleTimeUpdate}
              onPause={(time) => console.log('Paused at', time)}
              onPlay={() => console.log('Playing')}
              onEnded={() => console.log('Video ended')}
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
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {currentCourse.instructor.name}
                      </span>
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
              
              {/* Course Playlist (only for courses) */}
              {isCourse && currentCourse && currentCourse.videos && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Course Content
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {currentCourse.videos.map((video, index) => (
                        <div
                          key={video.id}
                          className={`flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer ${
                            video.id === currentVideoId 
                              ? 'bg-primary/10 border border-primary/20' 
                              : 'hover:bg-muted'
                          }`}
                          onClick={() => switchToVideo(video.id)}
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                            {video.id === currentVideoId ? (
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
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
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
              <AIChatSidebar
                courseId={isCourse ? contentId : "lesson"} 
                videoId={isCourse ? currentVideoId : contentId}
                currentTime={currentTime}
                onAgentTrigger={handleAgentTrigger}
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
                  <CardTitle>You've Used Your Free AI Credits</CardTitle>
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