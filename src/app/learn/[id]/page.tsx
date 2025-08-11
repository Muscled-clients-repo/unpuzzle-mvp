"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useSearchParams } from "next/navigation"
import dynamic from "next/dynamic"
import { useAppStore } from "@/stores/app-store"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { InstructorVideoView } from "@/components/video/views/InstructorVideoView"

// Dynamically import the VideoPlayer component with loading fallback
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
    ssr: false // Disable SSR for video player as it uses browser APIs
  }
)

// Dynamically import the AIChatSidebar component
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  ChevronLeft,
  Clock,
  MessageSquare,
  Share2,
  Eye,
  Sparkles,
  AlertCircle,
  ArrowRight,
  Copy,
  CheckCircle,
  Mail,
  Download,
  X,
  Lock,
  MessageCircle,
  ThumbsUp,
  Zap
} from "lucide-react"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { CommentsSection } from "@/components/lesson/CommentsSection"
import { RelatedLessonsCarousel } from "@/components/lesson/RelatedLessonsCarousel"
import { Textarea } from "@/components/ui/textarea"

export default function StandaloneLessonPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const lessonId = params.id as string
  
  // Check for instructor mode
  const isInstructorMode = searchParams.get('instructor') === 'true'
  
  // Use Zustand store
  const { 
    lessons, 
    loadLessons, 
    trackView,
    trackAiInteraction,
    user
  } = useAppStore()
  
  // Video player state from store
  const currentTime = useAppStore((state) => state.currentTime)
  const showChatSidebar = useAppStore((state) => state.preferences.showChatSidebar)
  const sidebarWidth = useAppStore((state) => state.preferences.sidebarWidth)
  const updatePreferences = useAppStore((state) => state.updatePreferences)
  const fetchYouTubeTranscript = useAppStore((state) => state.fetchYouTubeTranscript)
  
  const [isResizing, setIsResizing] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [freeAiInteractions, setFreeAiInteractions] = useState(0)
  const [showEmailCapture, setShowEmailCapture] = useState(false)
  const [email, setEmail] = useState("")
  const [showExitIntent, setShowExitIntent] = useState(false)
  const [hasInteractedWithExit, setHasInteractedWithExit] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  
  const FREE_AI_LIMIT = 3
  const [isLoading, setIsLoading] = useState(true)
  
  // Load lessons on mount
  useEffect(() => {
    if (lessons.length === 0) {
      loadLessons()
    }
    // Set loading to false after initial check or when lessons load
    const timer = setTimeout(() => setIsLoading(false), 100)
    return () => clearTimeout(timer)
  }, [lessons.length])
  
  // Get the lesson
  const lesson = lessons.find(l => l.id === lessonId)
  
  // Track view and fetch transcript when lesson loads
  useEffect(() => {
    if (lesson && lesson.status === 'published') {
      console.log('🎯 Lesson loaded:', lesson.title, 'YouTube URL:', lesson.youtubeUrl)
      trackView(lessonId)
      
      // Fetch YouTube transcript if it's a YouTube video
      if (lesson.youtubeUrl) {
        console.log('📺 Fetching transcript for YouTube video...')
        fetchYouTubeTranscript(lesson.youtubeUrl)
      } else {
        console.log('❌ No YouTube URL found for this lesson')
      }
    }
  }, [lessonId, lesson?.id, lesson?.youtubeUrl])
  
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

  // Show loading state first
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <main className="flex-1 flex items-center justify-center">
          <LoadingSpinner />
        </main>
      </div>
    )
  }
  
  // Handle instructor mode
  if (isInstructorMode) {
    return <InstructorVideoView />
  }

  // Then show not found if lesson doesn't exist
  if (!lesson) {
    return (
      <div className="flex min-h-screen flex-col">
        <main className="flex-1 flex items-center justify-center">
          <Card className="p-6">
            <CardContent className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Lesson Not Found</h3>
              <p className="text-muted-foreground mb-4">
                This lesson may have been removed or is still being processed.
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

  // Check if lesson is draft
  if (lesson.status === 'draft' && !user) {
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
      {/* Header */}
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

      <div className="flex flex-1 min-h-0">
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Video Player */}
          <div className="flex-1 bg-black p-4">
            <VideoPlayer
              videoUrl={lesson.videoUrl || lesson.youtubeUrl || ''}
              title={lesson.title}
              transcript={[]} // Could be populated from lesson data
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
                <Button
                  variant="outline"
                  onClick={() => updatePreferences({ showChatSidebar: !showChatSidebar })}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {showChatSidebar ? 'Hide' : 'Show'} AI Assistant
                </Button>
              </div>
              
              <p className="text-muted-foreground mb-4">
                {lesson.description}
              </p>
              
              {/* Unlock Full Course Banner */}
              {lesson.relatedCourseId && !user && (
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

              {/* AI Features Info */}
              {(lesson.transcriptEnabled || lesson.confusionsEnabled || lesson.segmentSelectionEnabled) && (
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
            
            {/* Comments Section */}
            <div className="mt-8">
              <CommentsSection 
                lessonId={lessonId}
                user={user}
                onSignupPrompt={() => setShowEmailCapture(true)}
              />
            </div>
            
            {/* Related Lessons */}
            <div className="mt-8">
              <RelatedLessonsCarousel
                currentLessonId={lessonId}
                lessons={lessons}
                title="Continue Learning"
              />
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
              className="flex-shrink-0 h-full overflow-hidden border-l"
              style={{ width: `${sidebarWidth}px` }}
            >
              <AIChatSidebar
                courseId="lesson" // Special ID for standalone lessons
                videoId={lessonId}
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