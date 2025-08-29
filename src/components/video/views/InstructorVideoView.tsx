"use client"

import { useState, useEffect } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { 
  MessageSquare, AlertCircle, Send, Users,
  User, Brain, Target, Search,
  Mic, Image as ImageIcon, Video, Play, CheckCircle, ChevronRight
} from "lucide-react"
import { useAppStore } from "@/stores/app-store"

// Dynamically import VideoPlayer
const VideoPlayer = dynamic(
  () => import("@/components/video/student/StudentVideoPlayer").then(mod => ({ 
    default: mod.StudentVideoPlayer 
  })),
  { ssr: false }
)

export function InstructorVideoView() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const lessonId = params.id as string
  const studentId = searchParams.get('student')
  const hotspotTimestamp = searchParams.get('hotspot')
  const fromAnalytics = searchParams.get('from') === 'analytics'
  const courseId = searchParams.get('courseId')
  
  // Store - OLD (for lessons data)
  const { lessons, loadLessons } = useAppStore()
  
  // Store - NEW (instructor video features)
  const {
    currentVideoData,
    selectedStudent, 
    studentActivities,
    currentReflectionIndex,
    loadInstructorVideo,
    selectStudent,
    navigateToReflection: storeNavigateToReflection,
    respondToReflection
  } = useAppStore()
  
  // Store - OLD (for current time - still needed for video playback)
  const currentTime = useAppStore((state) => state.currentTime)
  const setCurrentTime = useAppStore((state) => state.setCurrentTime)
  
  // State
  const [responseTexts, setResponseTexts] = useState<{[key: string]: string}>({})
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'single-student' | 'all-students'>('single-student')
  const [studentSearchQuery, setStudentSearchQuery] = useState("")
  const [isStudentSearchFocused, setIsStudentSearchFocused] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState(
    fromAnalytics ? 'all' : (studentId || 'sarah_chen')
  )
  
  // Load lessons
  useEffect(() => {
    if (lessons.length === 0) {
      loadLessons()
    }
  }, [lessons.length, loadLessons])
  
  // Load instructor video data
  useEffect(() => {
    if (lessonId) {
      console.log('📹 Loading instructor video data for:', lessonId)
      loadInstructorVideo(lessonId, selectedStudentId !== 'all' ? selectedStudentId : undefined)
    }
  }, [lessonId, selectedStudentId, loadInstructorVideo])
  
  // Debug current video data
  useEffect(() => {
    if (currentVideoData) {
      console.log('🎬 Current video data loaded:', {
        title: currentVideoData.title,
        videoUrl: currentVideoData.videoUrl,
        hasActivities: currentVideoData.studentActivity?.length || 0
      })
    }
  }, [currentVideoData])
  
  // Debug student activities
  useEffect(() => {
    console.log('📊 Student activities:', studentActivities)
    console.log('📊 Activities count:', studentActivities.length)
  }, [studentActivities])
  
  // Update selected student in store when local state changes
  useEffect(() => {
    selectStudent(selectedStudentId)
  }, [selectedStudentId, selectStudent])
  
  const lesson = lessons.find(l => l.id === lessonId) || {
    id: lessonId,
    title: "React Hooks Deep Dive",
    videoUrl: "https://example.com/video",
    description: "Master React Hooks",
    tags: ["React", "Hooks"],
    isFree: false
  }
  
  // Mock data - All available students
  const allStudents = [
    { id: 'sarah_chen', name: 'Sarah Chen', email: 'sarah.chen@example.com', reflectionCount: 4 },
    { id: 'mike_johnson', name: 'Mike Johnson', email: 'mike.j@company.com', reflectionCount: 2 },
    { id: 'emma_wilson', name: 'Emma Wilson', email: 'emma.w@university.edu', reflectionCount: 3 }
  ]
  
  // Filter students for search
  const filteredStudents = allStudents.filter(student =>
    student.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(studentSearchQuery.toLowerCase())
  )
  
  // Mock student journey data
  const getStudentJourneyData = (studentId: string) => {
    const journeys = {
      'sarah_chen': {
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
            status: 'responded' as const,
            response: 'Thanks Sarah! Glad the roadmap helped set expectations.',
            sentiment: 'positive' as const,
            type: 'text' as const
          },
          {
            id: 'r2',
            timestamp: '12:45',
            timeInSeconds: 765,
            content: 'Voice memo about useCallback vs useMemo',
            audioUrl: '/mock-audio.mp3',
            duration: '0:45',
            status: 'unresponded' as const,
            sentiment: 'positive' as const,
            type: 'voice' as const
          },
          {
            id: 'r3',
            timestamp: '18:32',
            timeInSeconds: 1112,
            content: 'Screenshot showing console error with useEffect',
            imageUrl: '/mock-screenshot.png',
            status: 'unresponded' as const,
            type: 'screenshot' as const,
            sentiment: 'confused' as const
          },
          {
            id: 'r4',
            timestamp: '22:10',
            timeInSeconds: 1330,
            content: 'Loom video walkthrough of my implementation',
            videoUrl: 'https://loom.com/share/mock',
            duration: '2:30',
            status: 'unresponded' as const,
            type: 'loom' as const,
            sentiment: 'neutral' as const
          }
        ]
      },
      'mike_johnson': {
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
            status: 'unresponded' as const,
            sentiment: 'neutral' as const,
            type: 'text' as const
          },
          {
            id: 'r6',
            timestamp: '15:20',
            timeInSeconds: 920,
            content: 'Voice memo with my confusion about dependency arrays',
            audioUrl: '/mock-audio-2.mp3',
            duration: '1:20',
            status: 'unresponded' as const,
            type: 'voice' as const,
            sentiment: 'confused' as const
          }
        ]
      },
      'emma_wilson': {
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
            status: 'unresponded' as const,
            sentiment: 'positive' as const,
            type: 'text' as const
          },
          {
            id: 'r8',
            timestamp: '16:45',
            timeInSeconds: 1005,
            content: 'Loom walkthrough of how I implemented memoization in my project',
            videoUrl: 'https://loom.com/share/mock-emma',
            duration: '3:15',
            status: 'unresponded' as const,
            type: 'loom' as const,
            sentiment: 'positive' as const
          }
        ]
      }
    }
    
    return journeys[studentId as keyof typeof journeys] || null
  }
  
  const studentJourneyData = selectedStudentId === 'all' ? null : getStudentJourneyData(selectedStudentId)
  
  // Get all reflections when viewing all students
  const getAllReflections = () => {
    const allReflections = []
    allStudents.forEach(student => {
      const journey = getStudentJourneyData(student.id)
      if (journey) {
        journey.reflections.forEach(reflection => {
          allReflections.push({
            ...reflection,
            studentName: student.name,
            studentId: student.id
          })
        })
      }
    })
    return allReflections.sort((a, b) => b.timeInSeconds - a.timeInSeconds)
  }
  
  const allStudentReflections = selectedStudentId === 'all' ? getAllReflections() : []
  
  // Navigation functions
  const navigateToReflection = (index: number) => {
    console.log('🧭 navigateToReflection called with index:', index)
    console.log('🧭 studentJourneyData exists:', !!studentJourneyData)
    console.log('🧭 reflections length:', studentJourneyData?.reflections?.length || 0)
    
    if (studentJourneyData && studentJourneyData.reflections[index]) {
      const reflection = studentJourneyData.reflections[index]
      const time = reflection.timeInSeconds
      console.log('🧭 Navigating to reflection:', reflection.content, 'at time:', time)
      storeNavigateToReflection(index)
      setCurrentTime(time)
    } else {
      console.log('❌ Navigation failed - no reflection at index:', index)
    }
  }
  
  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time)
  }
  
  const submitResponse = (reflectionId: string) => {
    const responseText = responseTexts[reflectionId]
    if (responseText?.trim()) {
      console.log('📝 Submitting response via store for', reflectionId, ':', responseText)
      respondToReflection(reflectionId, responseText)
      setResponseTexts(prev => ({ ...prev, [reflectionId]: '' }))
      setReplyingTo(null)
    }
  }
  
  return (
    <div className="min-h-screen">
      <Header 
        user={{ 
          name: "John Instructor", 
          email: "john@unpuzzle.com", 
          role: "instructor" 
        }}
        backButton={{
          href: fromAnalytics && courseId 
            ? `/instructor/course/${courseId}/analytics` 
            : "/instructor/engagement",
          label: fromAnalytics 
            ? "Back to Analytics" 
            : "Back to Engagement"
        }}
      />
      
      <div className="pt-16 flex h-screen">
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Video Player */}
          <div className="bg-black p-4">
            <div className="relative">
              <VideoPlayer
                videoUrl={currentVideoData?.videoUrl || lesson.videoUrl || ''}
                title={currentVideoData?.title || lesson.title}
                transcript={[]}
                onTimeUpdate={handleTimeUpdate}
                onPause={(time) => console.log('Paused at', time)}
                onPlay={() => console.log('Playing')}
                onEnded={() => console.log('Video ended')}
              />
              
            </div>
          </div>
          
          {/* Video Info */}
          <div className="p-6 bg-background flex-1 overflow-y-auto">
            <div className="max-w-3xl">
              {/* Instructor and Video Info */}
              <div className="mb-6">
                <h1 className="text-2xl font-bold mb-3">{lesson.title}</h1>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">John Instructor</p>
                    <p className="text-sm text-muted-foreground">Course Instructor</p>
                  </div>
                </div>
              </div>
              
              {selectedStudentId !== 'all' && (
                <>
                  <h2 className="text-xl font-semibold mb-4">
                    Video Context at {
                      studentJourneyData?.reflections[currentReflectionIndex]?.timestamp || 
                      (currentTime > 0 ? `${Math.floor(currentTime / 60)}:${(currentTime % 60).toString().padStart(2, '0')}` : '0:00')
                    }
                  </h2>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        {/* Dynamic context based on current reflection */}
                        {studentJourneyData?.reflections[currentReflectionIndex] ? (
                          <>
                            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                              <div className="flex items-center gap-2 mb-2">
                                <MessageSquare className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium">Student Reflection</span>
                              </div>
                              <p className="text-sm">{studentJourneyData.reflections[currentReflectionIndex].content}</p>
                            </div>
                            
                            <div>
                              <h3 className="font-medium mb-2">Transcript at this moment</h3>
                              <p className="text-sm text-muted-foreground">
                                {currentReflectionIndex === 0 ? 
                                  "Welcome to React Hooks! Today we'll explore the fundamental concepts that make React Hooks so powerful. Let's start with a roadmap of what we'll cover..." :
                                currentReflectionIndex === 1 ?
                                  "useCallback is particularly useful when you need to prevent unnecessary re-renders of child components that depend on callbacks. It's different from useMemo which memoizes values..." :
                                currentReflectionIndex === 2 ?
                                  "When using useEffect, always remember to clean up side effects. This prevents memory leaks and ensures your components behave correctly when unmounting..." :
                                  "Custom hooks allow you to extract component logic into reusable functions. They're a powerful pattern for sharing stateful logic between components..."
                                }
                              </p>
                            </div>
                            
                            <div>
                              <h3 className="font-medium mb-2">Code on Screen</h3>
                              <pre className="text-sm bg-muted p-3 rounded overflow-x-auto">
{currentReflectionIndex === 0 ? 
`// React Hooks Roadmap
1. useState - State management
2. useEffect - Side effects
3. useCallback - Memoized callbacks
4. useMemo - Memoized values
5. Custom Hooks - Reusable logic` :
currentReflectionIndex === 1 ?
`const memoizedCallback = useCallback(
  () => {
    doSomething(a, b);
  },
  [a, b]  // Dependencies
);

// vs useMemo
const memoizedValue = useMemo(
  () => computeExpensiveValue(a, b),
  [a, b]
);` :
currentReflectionIndex === 2 ?
`useEffect(() => {
  const subscription = subscribeToSomething();
  
  // Cleanup function
  return () => {
    subscription.unsubscribe();
  };
}, [dependency]);` :
`// Custom Hook Example
function useCounter(initialValue = 0) {
  const [count, setCount] = useState(initialValue);
  
  const increment = useCallback(() => {
    setCount(c => c + 1);
  }, []);
  
  return { count, increment };
}`
}
                              </pre>
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <h3 className="font-medium mb-2">Transcript</h3>
                              <p className="text-sm text-muted-foreground">
                                Navigate to a student reflection to see the video context at that timestamp
                              </p>
                            </div>
                            <div>
                              <h3 className="font-medium mb-2">Code on Screen</h3>
                              <p className="text-sm text-muted-foreground">
                                Select a reflection from the sidebar to view the code being discussed
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Instructor Sidebar */}
        <div className="w-[400px] border-l bg-background flex flex-col">
          {/* Student Selector */}
          <div className="p-4 border-b">
            <div className="flex gap-2 mb-3 relative">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search students..."
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  onFocus={() => setIsStudentSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsStudentSearchFocused(false), 200)}
                  className="pl-10"
                />
                
                {isStudentSearchFocused && filteredStudents.length > 0 && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-background border rounded-md shadow-lg z-10">
                    {filteredStudents.map(student => (
                      <button
                        key={student.id}
                        className="w-full px-4 py-2 text-left hover:bg-muted transition-colors"
                        onMouseDown={() => {
                          setSelectedStudentId(student.id)
                          setStudentSearchQuery("")
                        }}
                      >
                        <p className="font-medium">{student.name}</p>
                        <p className="text-sm text-muted-foreground">{student.email}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <Button 
                size="sm" 
                variant={selectedStudentId === 'all' ? 'default' : 'outline'}
                onClick={() => {
                  setSelectedStudentId('all')
                  setStudentSearchQuery("")
                }}
              >
                View All
              </Button>
            </div>
            
            {selectedStudentId === 'all' ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">All Students</p>
                  <p className="text-sm text-muted-foreground">{allStudents.length} students total</p>
                </div>
                <Badge variant="outline">
                  View all activity
                </Badge>
              </div>
            ) : studentJourneyData && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{studentJourneyData.student.name}</p>
                  <p className="text-sm text-muted-foreground">{studentJourneyData.student.email}</p>
                </div>
                <Badge variant="outline">
                  {studentJourneyData.reflections.filter(r => r.status === 'unresponded').length} unresponded
                </Badge>
              </div>
            )}
          </div>
          
          {/* Student Metrics */}
          {selectedStudentId === 'all' ? (
            <div className="p-4 border-b grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-2xl font-bold">42</p>
                <p className="text-xs text-muted-foreground">avg min/hr</p>
              </div>
              <div>
                <p className="text-2xl font-bold">89%</p>
                <p className="text-xs text-muted-foreground">avg execution</p>
              </div>
              <div>
                <p className="text-2xl font-bold">28s</p>
                <p className="text-xs text-muted-foreground">avg pace</p>
              </div>
            </div>
          ) : studentJourneyData && (
            <div className="p-4 border-b grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-2xl font-bold">{studentJourneyData.student.metrics.learnRate}</p>
                <p className="text-xs text-muted-foreground">min/hr</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{studentJourneyData.student.metrics.executionRate}%</p>
                <p className="text-xs text-muted-foreground">execution</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{studentJourneyData.student.metrics.executionPace}s</p>
                <p className="text-xs text-muted-foreground">pace</p>
              </div>
            </div>
          )}
          
          {/* Student Reflections List */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-3">
              <h3 className="font-medium text-sm text-muted-foreground mb-3">
                {selectedStudentId === 'all' ? 'All Students\' Reflections & Confusions' : 'Student Reflections & Confusions'}
              </h3>
              
              {(selectedStudentId === 'all' ? allStudentReflections : studentJourneyData?.reflections || []).map((reflection, index) => (
                <Card 
                  key={selectedStudentId === 'all' ? `${reflection.studentId}-${reflection.id}` : reflection.id}
                  className={`cursor-pointer transition-all ${
                    selectedStudentId !== 'all' && currentReflectionIndex === index
                      ? 'ring-2 ring-primary' 
                      : ''
                  }`}
                  onClick={() => selectedStudentId !== 'all' && navigateToReflection(index)}
                >
                  <CardContent className="pt-4 pb-3">
                    {/* Show student name if in "all" view */}
                    {selectedStudentId === 'all' && reflection.studentName && (
                      <div className="text-xs font-medium text-muted-foreground mb-2">
                        {reflection.studentName}
                      </div>
                    )}
                    
                    {/* Header with timestamp and status */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={reflection.type === 'screenshot' || reflection.type === 'confusion' ? 'destructive' : 'default'}
                          className="text-xs"
                        >
                          {reflection.timestamp}
                        </Badge>
                        {/* Type indicator */}
                        {reflection.type === 'voice' && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mic className="h-3 w-3" />
                            {reflection.duration}
                          </div>
                        )}
                        {reflection.type === 'screenshot' && (
                          <ImageIcon className="h-3 w-3 text-muted-foreground" />
                        )}
                        {reflection.type === 'loom' && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Video className="h-3 w-3" />
                            {reflection.duration}
                          </div>
                        )}
                      </div>
                      {reflection.status === 'responded' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Badge variant="destructive" className="text-xs">New</Badge>
                      )}
                    </div>
                    
                    {/* Content based on type */}
                    {reflection.type === 'text' && (
                      <p className="text-sm mb-2">{reflection.content}</p>
                    )}
                    
                    {reflection.type === 'voice' && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">{reflection.content}</p>
                        <Button variant="outline" size="sm" className="w-full">
                          <Play className="mr-2 h-3 w-3" />
                          Play Voice Memo
                        </Button>
                      </div>
                    )}
                    
                    {reflection.type === 'screenshot' && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">{reflection.content}</p>
                        <div className="bg-muted rounded p-2 text-center">
                          <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-1" />
                          <p className="text-xs text-muted-foreground">Click to view screenshot</p>
                        </div>
                      </div>
                    )}
                    
                    {reflection.type === 'loom' && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">{reflection.content}</p>
                        <Button variant="outline" size="sm" className="w-full">
                          <Video className="mr-2 h-3 w-3" />
                          Watch Loom Video
                        </Button>
                      </div>
                    )}
                    
                    {/* Existing response if any */}
                    {reflection.response && reflection.status === 'responded' && (
                      <div className="mt-3 pl-3 border-l-2 border-green-500">
                        <p className="text-xs text-muted-foreground mb-1">Your response:</p>
                        <p className="text-sm italic">{reflection.response}</p>
                      </div>
                    )}
                    
                    {/* Reply section */}
                    {reflection.status === 'unresponded' && (
                      <>
                        {replyingTo === reflection.id ? (
                          <div className="mt-3 space-y-2">
                            <Textarea
                              placeholder="Type your response..."
                              value={responseTexts[reflection.id] || ''}
                              onChange={(e) => setResponseTexts(prev => ({
                                ...prev,
                                [reflection.id]: e.target.value
                              }))}
                              className="min-h-[80px] text-sm"
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                onClick={() => submitResponse(reflection.id)}
                                disabled={!responseTexts[reflection.id]?.trim()}
                              >
                                <Send className="mr-1 h-3 w-3" />
                                Send
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setReplyingTo(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="mt-2 w-full"
                            onClick={(e) => {
                              e.stopPropagation()
                              setReplyingTo(reflection.id)
                            }}
                          >
                            Reply
                          </Button>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
              
              {((selectedStudentId === 'all' && allStudentReflections.length === 0) || 
                (selectedStudentId !== 'all' && (!studentJourneyData || studentJourneyData.reflections.length === 0))) && (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No reflections yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}