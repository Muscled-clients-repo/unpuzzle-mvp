"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  MessageSquare, Send, Search,
  Mic, Image, Video, Play, CheckCircle, BookOpen, Trophy, MessageCircle
} from "lucide-react"
import { useAppStore } from "@/stores/app-store"
import {
  getStudentVideoActivities,
  getAllStudentsVideoActivities,
  type Activity
} from "@/lib/actions/activity-timeline-actions"

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
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all')

  // Real data state
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get unique students from activities
  const allStudents = Array.from(
    new Map(
      activities
        .filter(a => a.student_name && a.student_email)
        .map(a => [
          a.user_id,
          {
            id: a.user_id,
            name: a.student_name!,
            email: a.student_email!,
            reflectionCount: activities.filter(act =>
              act.user_id === a.user_id &&
              ['text', 'screenshot', 'voice', 'loom'].includes(act.activity_type)
            ).length
          }
        ])
    ).values()
  )

  // Filter students for search
  const filteredStudents = allStudents.filter(student =>
    student.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(studentSearchQuery.toLowerCase())
  )

  // Fetch activities when videoId or selectedStudentId changes
  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true)
      setError(null)

      try {
        let result
        if (selectedStudentId === 'all') {
          result = await getAllStudentsVideoActivities({ videoId })
        } else {
          result = await getStudentVideoActivities({ videoId, studentId: selectedStudentId })
        }

        if (result.error) {
          setError(result.error)
          setActivities([])
        } else {
          setActivities(result.data || [])
        }
      } catch (err) {
        setError('Failed to fetch activities')
        setActivities([])
      } finally {
        setLoading(false)
      }
    }

    fetchActivities()
  }, [videoId, selectedStudentId])

  // Transform Activity to reflection-like format for display
  const transformActivityToReflection = (activity: Activity) => {
    const timeInSeconds = activity.timestamp_seconds || 0
    const timestamp = `${Math.floor(timeInSeconds / 60)}:${String(timeInSeconds % 60).padStart(2, '0')}`

    // Base structure
    const reflection: any = {
      id: activity.id,
      timestamp,
      timeInSeconds,
      content: activity.content || '',
      status: 'unresponded' as const, // TODO: Check reflections table for responses
      type: activity.activity_type,
      studentName: activity.student_name,
      studentId: activity.user_id
    }

    // Add type-specific fields
    if (activity.metadata) {
      const metadata = activity.metadata as any
      if (activity.activity_type === 'voice' || activity.activity_type === 'loom') {
        reflection.duration = metadata.duration_seconds
          ? `${Math.floor(metadata.duration_seconds / 60)}:${String(metadata.duration_seconds % 60).padStart(2, '0')}`
          : '0:00'
      }
      if (metadata.file_url) {
        if (activity.activity_type === 'voice') reflection.audioUrl = metadata.file_url
        if (activity.activity_type === 'screenshot') reflection.imageUrl = metadata.file_url
        if (activity.activity_type === 'loom') reflection.videoUrl = metadata.file_url
      }
    }

    return reflection
  }

  // Filter and transform activities for display
  const displayActivities = activities
    .filter(a => ['text', 'screenshot', 'voice', 'loom', 'quiz', 'ai_chat'].includes(a.activity_type))
    .map(transformActivityToReflection)

  // Get activities for selected student or all
  const studentActivities = selectedStudentId === 'all'
    ? displayActivities.sort((a, b) => b.timeInSeconds - a.timeInSeconds)
    : displayActivities.filter(a => a.studentId === selectedStudentId)

  // Get student data for selected student
  const selectedStudent = selectedStudentId !== 'all'
    ? allStudents.find(s => s.id === selectedStudentId)
    : null

  // Navigation functions
  const navigateToReflection = (index: number) => {
    if (studentActivities[index]) {
      const reflection = studentActivities[index]
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

        {loading ? (
          <div className="flex items-center justify-center py-4">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-4">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        ) : selectedStudentId === 'all' ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">All Students</p>
              <p className="text-sm text-muted-foreground">{allStudents.length} students with activity</p>
            </div>
            <Badge variant="outline">
              {studentActivities.length} activities
            </Badge>
          </div>
        ) : selectedStudent ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{selectedStudent.name}</p>
              <p className="text-sm text-muted-foreground">{selectedStudent.email}</p>
            </div>
            <Badge variant="outline">
              {studentActivities.filter(r => r.status === 'unresponded').length} unresponded
            </Badge>
          </div>
        ) : null}
      </div>

      {/* Student Metrics - Hidden for now, will add when metrics are available */}
      {!loading && !error && studentActivities.length > 0 && (
        <div className="p-4 border-b grid grid-cols-3 gap-2 text-center flex-shrink-0">
          <div>
            <p className="text-2xl font-bold">{studentActivities.filter(a => ['text', 'screenshot', 'voice', 'loom'].includes(a.type)).length}</p>
            <p className="text-xs text-muted-foreground">reflections</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{studentActivities.filter(a => a.type === 'quiz').length}</p>
            <p className="text-xs text-muted-foreground">quizzes</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{studentActivities.filter(a => a.type === 'ai_chat').length}</p>
            <p className="text-xs text-muted-foreground">AI chats</p>
          </div>
        </div>
      )}

      {/* Student Activities List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">Loading activities...</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <h3 className="font-medium text-sm text-muted-foreground mb-3">
              {selectedStudentId === 'all' ? 'All Students\' Activities' : 'Student Activities on This Video'}
            </h3>

            {studentActivities.map((reflection, index) => (
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

                {reflection.type === 'quiz' && (
                  <div className="space-y-2">
                    <p className="text-sm">{reflection.content}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <BookOpen className="h-3 w-3" />
                      <span>Quiz completed</span>
                    </div>
                  </div>
                )}

                {reflection.type === 'ai_chat' && (
                  <div className="space-y-2">
                    <p className="text-sm">{reflection.content}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MessageCircle className="h-3 w-3" />
                      <span>AI conversation</span>
                    </div>
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

            {studentActivities.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No activities yet on this video</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
