"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  MessageSquare, Send, Search,
  Mic, Image, Video, Play, CheckCircle
} from "lucide-react"
import { useAppStore } from "@/stores/app-store"

interface StudentJourneySidebarProps {
  videoId: string
  currentVideoTime: number
}

export function StudentJourneySidebar({
  videoId,
  currentVideoTime
}: StudentJourneySidebarProps) {
  const {
    currentReflectionIndex,
    navigateToReflection: storeNavigateToReflection,
    respondToReflection,
    setCurrentTime
  } = useAppStore()

  const [responseTexts, setResponseTexts] = useState<{[key: string]: string}>({})
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [studentSearchQuery, setStudentSearchQuery] = useState("")
  const [isStudentSearchFocused, setIsStudentSearchFocused] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState('sarah_chen')

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
    const allReflections: any[] = []
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
    if (studentJourneyData && studentJourneyData.reflections[index]) {
      const reflection = studentJourneyData.reflections[index]
      const time = reflection.timeInSeconds
      storeNavigateToReflection(index)
      setCurrentTime(time)
    }
  }

  const submitResponse = (reflectionId: string) => {
    const responseText = responseTexts[reflectionId]
    if (responseText?.trim()) {
      respondToReflection(reflectionId, responseText)
      setResponseTexts(prev => ({ ...prev, [reflectionId]: '' }))
      setReplyingTo(null)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Student Selector */}
      <div className="p-4 border-b flex-shrink-0">
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
        <div className="p-4 border-b grid grid-cols-3 gap-2 text-center flex-shrink-0">
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
        <div className="p-4 border-b grid grid-cols-3 gap-2 text-center flex-shrink-0">
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
                      <Image className="h-3 w-3 text-muted-foreground" />
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
                      <Image className="h-8 w-8 mx-auto text-muted-foreground mb-1" />
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
  )
}
