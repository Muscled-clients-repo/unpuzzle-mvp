"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useSearchParams } from "next/navigation"
import dynamic from "next/dynamic"
import { useAppStore } from "@/stores/app-store"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
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
  Zap,
  User,
  Brain,
  Target,
  Send,
  ChevronRight,
  Users,
  ThumbsDown,
  SkipForward,
  Search,
  Bell,
  LogOut,
  Settings,
  UserCheck,
  GraduationCap
} from "lucide-react"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { CommentsSection } from "@/components/lesson/CommentsSection"
import { RelatedLessonsCarousel } from "@/components/lesson/RelatedLessonsCarousel"
import { Header } from "@/components/layout/header"
import { useRouter } from "next/navigation"

export default function StandaloneLessonPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const lessonId = params.id as string
  
  // Check for instructor mode
  const isInstructorMode = searchParams.get('instructor') === 'true'
  const studentId = searchParams.get('student')
  const hotspotTimestamp = searchParams.get('hotspot')
  
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
  
  // Instructor mode state
  const [currentReflectionIndex, setCurrentReflectionIndex] = useState(0)
  const [responseText, setResponseText] = useState("")
  const [viewMode, setViewMode] = useState<'single-student' | 'all-students'>('single-student')
  const [studentSearchQuery, setStudentSearchQuery] = useState("")
  const [isStudentSearchFocused, setIsStudentSearchFocused] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState(studentId || 'sarah_chen')
  
  const FREE_AI_LIMIT = 3
  const [isLoading, setIsLoading] = useState(true)
  
  // All available students (mock data)
  const allStudents = [
    { id: 'sarah_chen', name: 'Sarah Chen', email: 'sarah.chen@example.com', reflectionCount: 4 },
    { id: 'mike_johnson', name: 'Mike Johnson', email: 'mike.j@company.com', reflectionCount: 2 },
    { id: 'emma_wilson', name: 'Emma Wilson', email: 'emma.w@university.edu', reflectionCount: 3 },
    { id: 'alex_kim', name: 'Alex Kim', email: 'alex.kim@tech.io', reflectionCount: 1 },
    { id: 'lisa_davis', name: 'Lisa Davis', email: 'lisa.d@startup.com', reflectionCount: 5 }
  ]
  
  // Filter students for search
  const filteredStudents = allStudents.filter(student =>
    student.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(studentSearchQuery.toLowerCase())
  )
  
  // Mock student journey data (inline for prototyping)
  const studentJourneyData = selectedStudentId === 'sarah_chen' ? {
    student: {
      id: 'sarah_chen',
      name: 'Sarah Chen',
      email: 'sarah.chen@example.com',
      metrics: {
        learnRate: 45,
        executionRate: 92,
        executionPace: 28,
        courseProgress: 75,
        videoProgress: 94,
        quizScore: 9
      }
    },
    reflections: [
      {
        id: 'r1',
        timestamp: '2:15',
        timeInSeconds: 135,
        content: 'Great introduction! The roadmap really helps me understand what\'s coming.',
        status: 'responded',
        response: 'Thanks Sarah! Glad the roadmap helped set expectations.',
        sentiment: 'positive'
      },
      {
        id: 'r2',
        timestamp: '12:45',
        timeInSeconds: 765,
        content: 'The useCallback explanation was brilliant. I finally understand when to use it vs useMemo.',
        status: 'unresponded',
        sentiment: 'positive'
      },
      {
        id: 'r3',
        timestamp: '18:32',
        timeInSeconds: 1112,
        content: 'Why does useEffect run twice in strict mode?',
        status: 'unresponded',
        type: 'confusion',
        sentiment: 'confused'
      },
      {
        id: 'r4',
        timestamp: '35:20',
        timeInSeconds: 2120,
        content: 'This video really tied everything together. The practical examples made all the difference!',
        status: 'unresponded',
        sentiment: 'positive'
      }
    ],
    otherStudentsAtTimestamp: {
      '12:45': [
        { name: 'Mike Johnson', content: 'Still confused about dependencies', type: 'confusion' },
        { name: 'Emma Wilson', content: 'Great example!', type: 'reflection' }
      ]
    }
  } : selectedStudentId === 'mike_johnson' ? {
    student: {
      id: 'mike_johnson',
      name: 'Mike Johnson',
      email: 'mike.j@company.com',
      metrics: {
        learnRate: 38,
        executionRate: 85,
        executionPace: 35,
        courseProgress: 60,
        videoProgress: 78,
        quizScore: 8
      }
    },
    reflections: [
      {
        id: 'r5',
        timestamp: '5:30',
        timeInSeconds: 330,
        content: 'Following along but the pace is a bit fast.',
        status: 'unresponded',
        sentiment: 'neutral'
      },
      {
        id: 'r6',
        timestamp: '18:30',
        timeInSeconds: 1110,
        content: 'Still struggling with the dependency array concept',
        status: 'unresponded',
        type: 'confusion',
        sentiment: 'confused'
      }
    ],
    otherStudentsAtTimestamp: {}
  } : selectedStudentId === 'emma_wilson' ? {
    student: {
      id: 'emma_wilson',
      name: 'Emma Wilson',
      email: 'emma.w@university.edu',
      metrics: {
        learnRate: 52,
        executionRate: 95,
        executionPace: 22,
        courseProgress: 80,
        videoProgress: 100,
        quizScore: 10
      }
    },
    reflections: [
      {
        id: 'r7',
        timestamp: '8:20',
        timeInSeconds: 500,
        content: 'The React.memo explanation with practical examples was exactly what I needed!',
        status: 'unresponded',
        sentiment: 'positive'
      },
      {
        id: 'r8',
        timestamp: '14:00',
        timeInSeconds: 840,
        content: 'React.memo makes sense now',
        status: 'unresponded',
        sentiment: 'positive'
      },
      {
        id: 'r9',
        timestamp: '22:10',
        timeInSeconds: 1330,
        content: 'Custom hooks section is excellent',
        status: 'unresponded',
        sentiment: 'positive'
      }
    ],
    otherStudentsAtTimestamp: {}
  } : null

  // Mock data for all students mode (when < 10 total reflections)
  const allStudentsData = {
    totalReflections: 8,
    reflections: [
      { 
        id: 'r1', 
        studentName: 'Sarah Chen', 
        timestamp: '2:15', 
        timeInSeconds: 135,
        content: 'Great introduction!', 
        status: 'responded',
        sentiment: 'positive'
      },
      { 
        id: 'r2', 
        studentName: 'Mike Johnson', 
        timestamp: '5:30', 
        timeInSeconds: 330,
        content: 'Pace is a bit fast', 
        status: 'unresponded',
        sentiment: 'neutral'
      },
      { 
        id: 'r3', 
        studentName: 'Sarah Chen', 
        timestamp: '12:45', 
        timeInSeconds: 765,
        content: 'useCallback explanation brilliant!', 
        status: 'unresponded',
        sentiment: 'positive'
      },
      { 
        id: 'r4', 
        studentName: 'Emma Wilson', 
        timestamp: '14:00', 
        timeInSeconds: 840,
        content: 'React.memo makes sense now', 
        status: 'unresponded',
        sentiment: 'positive'
      },
      { 
        id: 'r5', 
        studentName: 'Sarah Chen', 
        timestamp: '18:32', 
        timeInSeconds: 1112,
        content: 'Why does useEffect run twice?', 
        status: 'unresponded',
        type: 'confusion',
        sentiment: 'confused'
      },
      { 
        id: 'r6', 
        studentName: 'Mike Johnson', 
        timestamp: '18:30', 
        timeInSeconds: 1110,
        content: 'Dependency array confusion', 
        status: 'unresponded',
        type: 'confusion',
        sentiment: 'confused'
      },
      { 
        id: 'r7', 
        studentName: 'Emma Wilson', 
        timestamp: '22:10', 
        timeInSeconds: 1330,
        content: 'Custom hooks section is excellent', 
        status: 'unresponded',
        sentiment: 'positive'
      },
      { 
        id: 'r8', 
        studentName: 'Sarah Chen', 
        timestamp: '35:20', 
        timeInSeconds: 2120,
        content: 'Everything tied together!', 
        status: 'unresponded',
        sentiment: 'positive'
      }
    ]
  }

  // Load lessons on mount
  useEffect(() => {
    // loadLessons returns void, not a promise
    loadLessons()
    setIsLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty dependency array - only run once on mount
  
  // Handle instructor mode navigation
  useEffect(() => {
    // If instructor mode, jump to specific timestamp or reflection
    if (isInstructorMode && studentJourneyData) {
      const reflectionId = searchParams.get('r')
      if (reflectionId) {
        const index = studentJourneyData.reflections.findIndex(r => r.id === reflectionId)
        if (index !== -1) {
          setCurrentReflectionIndex(index)
          // Would trigger video seek here
        }
      }
    }
  }, [isInstructorMode, searchParams, studentJourneyData])

  const lesson = lessons.find(l => l.id === lessonId) || {
    id: lessonId,
    title: "React Hooks Deep Dive",
    description: "Master React Hooks with practical examples",
    videoUrl: "https://example.com/video.mp4",
    youtubeUrl: "",
    duration: "45:00",
    views: 1234,
    aiInteractions: 567,
    completionRate: 85,
    status: 'published' as const,
    isFree: true,
    tags: ["React", "Hooks", "JavaScript"],
    ctaText: "Learn Full Course",
    ctaLink: "/courses/react-advanced",
    transcriptEnabled: true,
    confusionsEnabled: true,
    segmentSelectionEnabled: true,
    visibility: 'public' as const
  }

  // Track view
  useEffect(() => {
    if (lesson && !isInstructorMode) {
      trackView(lessonId)
    }
  }, [lesson, lessonId, trackView, isInstructorMode])

  // Handle time update from video player
  const handleTimeUpdate = (time: number) => {
    // Update current time in store
    // This would be connected to the actual video player
  }

  const handleCopyLink = () => {
    const url = `${window.location.origin}/learn/${lessonId}`
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleEmailSubmit = () => {
    if (!email) return
    // Save email and unlock AI features
    setShowEmailCapture(false)
    setFreeAiInteractions(0)
  }

  // Instructor functions
  const navigateToReflection = (index: number) => {
    if (!studentJourneyData) return
    setCurrentReflectionIndex(index)
    const reflection = studentJourneyData.reflections[index]
    // Would trigger video seek to reflection.timeInSeconds
    console.log('Seeking to', reflection.timestamp)
  }

  const sendResponse = () => {
    if (!responseText.trim()) return
    console.log('Sending response:', responseText, 'to reflection:', currentReflectionIndex)
    // Would save response to database
    setResponseText('')
    // Auto-advance to next unresponded
    const nextUnresponded = studentJourneyData?.reflections.findIndex(
      (r, i) => i > currentReflectionIndex && r.status === 'unresponded'
    )
    if (nextUnresponded !== -1) {
      navigateToReflection(nextUnresponded)
    }
  }

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

  // Instructor Mode View
  if (isInstructorMode) {
    return (
      <div className="min-h-screen">
        {/* Use shared Header component with back button */}
        <Header 
          user={{ 
            name: "John Instructor", 
            email: "john@unpuzzle.com", 
            role: "instructor" 
          }}
          backButton={{
            href: "/instructor/engagement",
            label: "Back to Engagement"
          }}
        />
        
        {/* Main container with padding for fixed header */}
        <div className="pt-16 flex h-screen flex-col">
          <div className="flex flex-1 min-h-0">
            {/* Main Content with Video */}
            <div className="flex-1 overflow-y-auto">
            {/* Video Player with Timeline Markers */}
            <div className="bg-black p-4">
              <div className="relative">
                <VideoPlayer
                  videoUrl={lesson.videoUrl || lesson.youtubeUrl || ''}
                  title={lesson.title}
                  transcript={[]}
                  onTimeUpdate={handleTimeUpdate}
                  onPause={(time) => console.log('Paused at', time)}
                  onPlay={() => console.log('Playing')}
                  onEnded={() => console.log('Video ended')}
                />
                
                {/* Timeline Markers Overlay */}
                {studentJourneyData && (
                  <div className="absolute bottom-16 left-4 right-4 h-2 bg-white/20 rounded">
                    {studentJourneyData.reflections.map((reflection) => (
                      <div
                        key={reflection.id}
                        className="absolute top-0 w-2 h-2 rounded-full cursor-pointer"
                        style={{
                          left: `${(reflection.timeInSeconds / 2700) * 100}%`, // Assuming 45min video
                          backgroundColor: 
                            reflection.type === 'confusion' ? '#fb923c' :
                            reflection.sentiment === 'positive' ? '#22c55e' : '#3b82f6'
                        }}
                        onClick={() => navigateToReflection(studentJourneyData.reflections.indexOf(reflection))}
                        title={`${reflection.timestamp} - ${reflection.content.substring(0, 50)}...`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Video Context Area */}
            <div className="p-6 bg-background">
              <div className="max-w-3xl">
                <h2 className="text-xl font-semibold mb-4">Video Context at Current Time</h2>
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium mb-2">Transcript</h3>
                        <p className="text-sm text-muted-foreground">
                          "...useCallback is particularly useful when you need to prevent unnecessary re-renders 
                          of child components that depend on callbacks. It memoizes the function reference..."
                        </p>
                      </div>
                      <div>
                        <h3 className="font-medium mb-2">Code on Screen</h3>
                        <pre className="text-sm bg-muted p-3 rounded">
{`const memoizedCallback = useCallback(
  () => {
    doSomething(a, b);
  },
  [a, b]
);`}
                        </pre>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Instructor Sidebar */}
            <div className="w-[400px] border-l bg-background flex flex-col h-full">
            {/* Fixed Header with Search */}
            <div className="flex-shrink-0">
              {/* Student Search and Selection */}
              <div className="p-4 border-b">
                {/* Search Bar */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search students..."
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    onFocus={() => setIsStudentSearchFocused(true)}
                    onBlur={() => setTimeout(() => setIsStudentSearchFocused(false), 200)}
                    className="pl-10 pr-20"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 px-2"
                    onClick={() => setViewMode(viewMode === 'single-student' ? 'all-students' : 'single-student')}
                  >
                    <Users className="h-3 w-3 mr-1" />
                    {viewMode === 'single-student' ? 'View All' : 'Single'}
                  </Button>
                  
                  {/* Search Dropdown */}
                  {isStudentSearchFocused && studentSearchQuery && filteredStudents.length > 0 && (
                    <div className="absolute top-full mt-1 w-full bg-background border rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                      {filteredStudents.map(student => (
                        <button
                          key={student.id}
                          className="w-full px-3 py-2 text-left hover:bg-muted transition-colors flex items-center justify-between text-sm"
                          onMouseDown={() => {
                            setSelectedStudentId(student.id)
                            setStudentSearchQuery('')
                            setCurrentReflectionIndex(0)
                            setViewMode('single-student')
                          }}
                        >
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-xs text-muted-foreground">{student.email}</p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {student.reflectionCount} reflections
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Currently Selected Student or All Students Badge */}
                {viewMode === 'single-student' && studentJourneyData ? (
                  <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-sm">
                      {studentJourneyData.student.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{studentJourneyData.student.name}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{studentJourneyData.reflections.length} reflections</span>
                        <span>•</span>
                        <span>{studentJourneyData.student.metrics.videoProgress}% watched</span>
                      </div>
                    </div>
                  </div>
                ) : viewMode === 'all-students' && (
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Viewing All Students</span>
                    <Badge variant="outline" className="text-xs ml-auto">
                      {allStudentsData.totalReflections} total reflections
                    </Badge>
                  </div>
                )}
              </div>
            </div>
            
            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Content based on view mode */}
              {viewMode === 'single-student' && studentJourneyData ? (
                // Single Student Journey View
                <>
                {studentJourneyData && (
                  <>
                    {/* Student Overview */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Student Overview</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground">Learn Rate</p>
                            <p className="font-medium">{studentJourneyData.student.metrics.learnRate} min/hr</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Execution</p>
                            <p className="font-medium">{studentJourneyData.student.metrics.executionRate}%</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Video Progress</p>
                            <p className="font-medium">{studentJourneyData.student.metrics.videoProgress}%</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Quiz Score</p>
                            <p className="font-medium">{studentJourneyData.student.metrics.quizScore}/10</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Current Reflection */}
                    <Card className="border-primary">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">
                            Reflection {currentReflectionIndex + 1} of {studentJourneyData.reflections.length}
                          </CardTitle>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigateToReflection(Math.max(0, currentReflectionIndex - 1))}
                              disabled={currentReflectionIndex === 0}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigateToReflection(Math.min(studentJourneyData.reflections.length - 1, currentReflectionIndex + 1))}
                              disabled={currentReflectionIndex === studentJourneyData.reflections.length - 1}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              {studentJourneyData.reflections[currentReflectionIndex].timestamp}
                            </Badge>
                            {studentJourneyData.reflections[currentReflectionIndex].type === 'confusion' ? (
                              <Badge variant="destructive" className="text-xs">Confusion</Badge>
                            ) : studentJourneyData.reflections[currentReflectionIndex].sentiment === 'positive' ? (
                              <ThumbsUp className="h-3 w-3 text-green-500" />
                            ) : (
                              <MessageSquare className="h-3 w-3 text-blue-500" />
                            )}
                            {studentJourneyData.reflections[currentReflectionIndex].status === 'responded' && (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            )}
                          </div>
                          <p className="text-sm italic">
                            "{studentJourneyData.reflections[currentReflectionIndex].content}"
                          </p>
                        </div>

                        {studentJourneyData.reflections[currentReflectionIndex].status === 'responded' ? (
                          <div className="bg-muted p-3 rounded">
                            <p className="text-xs font-medium mb-1">Your Response:</p>
                            <p className="text-sm">{studentJourneyData.reflections[currentReflectionIndex].response}</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <Textarea
                              placeholder="Type your response..."
                              value={responseText}
                              onChange={(e) => setResponseText(e.target.value)}
                              className="min-h-[100px]"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const next = studentJourneyData.reflections.findIndex(
                                    (r, i) => i > currentReflectionIndex && r.status === 'unresponded'
                                  )
                                  if (next !== -1) navigateToReflection(next)
                                }}
                              >
                                <SkipForward className="mr-2 h-3 w-3" />
                                Skip
                              </Button>
                              <Button
                                size="sm"
                                className="flex-1"
                                onClick={sendResponse}
                                disabled={!responseText.trim()}
                              >
                                <Send className="mr-2 h-3 w-3" />
                                Send Response
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Journey Overview */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Journey Overview</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {studentJourneyData.reflections.map((reflection, index) => (
                            <button
                              key={reflection.id}
                              onClick={() => navigateToReflection(index)}
                              className={`w-full text-left p-2 rounded hover:bg-muted transition-colors ${
                                index === currentReflectionIndex ? 'bg-muted' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${
                                  reflection.status === 'responded' ? 'bg-green-500' : 'bg-orange-500'
                                }`} />
                                <span className="text-xs text-muted-foreground">{reflection.timestamp}</span>
                                {reflection.type === 'confusion' && (
                                  <AlertCircle className="h-3 w-3 text-orange-500" />
                                )}
                                <span className="text-sm truncate flex-1">
                                  {reflection.content.substring(0, 40)}...
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Other Students at Current Timestamp */}
                    {studentJourneyData.otherStudentsAtTimestamp[studentJourneyData.reflections[currentReflectionIndex].timestamp] && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">
                            Other Students at {studentJourneyData.reflections[currentReflectionIndex].timestamp}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {studentJourneyData.otherStudentsAtTimestamp[studentJourneyData.reflections[currentReflectionIndex].timestamp].map((other, i) => (
                              <div key={i} className="p-2 bg-muted rounded">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium">{other.name}</span>
                                  {other.type === 'confusion' && (
                                    <Badge variant="destructive" className="text-xs">Confusion</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">{other.content}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
                </>
              ) : viewMode === 'all-students' ? (
                // All Students View
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      All Reflections ({allStudentsData.totalReflections})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {allStudentsData.reflections.map((reflection) => (
                        <div key={reflection.id} className="border rounded p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{reflection.studentName}</span>
                              <Badge variant="outline" className="text-xs">
                                {reflection.timestamp}
                              </Badge>
                              {reflection.type === 'confusion' && (
                                <AlertCircle className="h-3 w-3 text-orange-500" />
                              )}
                            </div>
                            {reflection.status === 'responded' ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <Button size="sm" variant="outline">
                                Respond
                              </Button>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground italic">
                            "{reflection.content}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      </div>
      </div>
      </div>
    )
  }

  // Regular Student View (existing code)
  return (
    <div className="flex h-screen flex-col">
      {/* Regular Header */}
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
              transcript={[]}
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
              </div>
              
              <p className="text-muted-foreground">{lesson.description}</p>

              {/* Email Capture for Guests */}
              {!user && showEmailCapture && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-lg">Get More from This Lesson</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Enter your email to unlock AI features and save your progress
                    </p>
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                      <Button onClick={handleEmailSubmit}>
                        <Mail className="mr-2 h-4 w-4" />
                        Continue
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
              className="w-1 bg-border hover:bg-primary/20 cursor-col-resize transition-colors"
              onMouseDown={(e) => {
                setIsResizing(true)
                e.preventDefault()
              }}
            />
            
            {/* Sidebar */}
            <div 
              ref={sidebarRef}
              className="border-l bg-background"
              style={{ width: `${sidebarWidth}px` }}
            >
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="font-semibold">AI Assistant</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => updatePreferences({ showChatSidebar: false })}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex-1">
                  <AIChatSidebar
                    lessonId={lessonId}
                    lessonTitle={lesson.title}
                    currentTime={currentTime}
                    onInteraction={() => {
                      if (!user) {
                        setFreeAiInteractions(prev => prev + 1)
                        if (freeAiInteractions >= FREE_AI_LIMIT - 1) {
                          setShowEmailCapture(true)
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Floating AI Toggle (when sidebar is hidden) */}
      {!showChatSidebar && (
        <Button
          className="fixed bottom-6 right-6 rounded-full shadow-lg"
          size="lg"
          onClick={() => updatePreferences({ showChatSidebar: true })}
        >
          <MessageCircle className="mr-2 h-5 w-5" />
          AI Chat
        </Button>
      )}

      {/* Exit Intent Modal */}
      {showExitIntent && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Wait! Before You Go...</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Get the most from this lesson with our AI features. Enter your email to continue learning!
              </p>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button onClick={() => {
                  handleEmailSubmit()
                  setShowExitIntent(false)
                  setHasInteractedWithExit(true)
                }}>
                  Continue
                </Button>
              </div>
              <Button
                variant="ghost"
                className="w-full mt-2"
                onClick={() => {
                  setShowExitIntent(false)
                  setHasInteractedWithExit(true)
                }}
              >
                No thanks
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}