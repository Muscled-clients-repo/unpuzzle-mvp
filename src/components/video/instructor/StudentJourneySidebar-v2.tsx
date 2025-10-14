"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  MessageSquare, Search, Brain, Mic, Video, CheckCircle2, X, Bot, Target, Users, User
} from "lucide-react"
import { useInfiniteQuizAttemptsQuery, flattenQuizAttempts } from "@/hooks/use-instructor-quiz-attempts"
import { useInfiniteReflectionsQuery, flattenReflections } from "@/hooks/use-instructor-reflections"
import { useInfiniteAIChatQuery, flattenAIConversations } from "@/hooks/use-instructor-ai-chat"
import { getEnrolledStudents } from "@/app/actions/instructor-students-actions"
import { useQuery } from "@tanstack/react-query"
import { MessengerAudioPlayer } from '@/components/reflection/MessengerAudioPlayer'
import { LoomVideoCard } from '@/components/reflection/LoomVideoCard'
import { CheckpointEditorSidebar } from "./CheckpointEditorSidebar"
import { cn } from "@/lib/utils"
import {
  mergeAndSortActivities,
  groupActivitiesByDate,
  type InstructorActivity
} from "@/lib/instructor-activity-utils"
import type { VideoPlayerCoreRef } from "../core/VideoPlayerCore"

interface StudentJourneySidebarProps {
  videoId: string
  courseId: string
  currentVideoTime: number
  videoPlayerRef: React.RefObject<VideoPlayerCoreRef>
}

export function StudentJourneySidebarV2({
  videoId,
  courseId,
  currentVideoTime,
  videoPlayerRef
}: StudentJourneySidebarProps) {
  const [activeTab, setActiveTab] = useState<'checkpoints' | 'students'>('checkpoints')
  const [studentSearchQuery, setStudentSearchQuery] = useState("")
  const [isStudentSearchFocused, setIsStudentSearchFocused] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null)

  // Fetch enrolled students for dropdown
  const studentsQuery = useQuery({
    queryKey: ['enrolled-students', courseId],
    queryFn: () => getEnrolledStudents(courseId),
    staleTime: 5 * 60 * 1000 // 5 minutes
  })

  const students = studentsQuery.data?.success ? studentsQuery.data.data : []

  // Filter students for search
  const filteredStudents = students?.filter(student =>
    student.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(studentSearchQuery.toLowerCase())
  ) || []

  // Fetch activities using infinite queries
  const quizQuery = useInfiniteQuizAttemptsQuery(
    videoId,
    courseId,
    selectedStudentId,
    { pageSize: 20 }
  )

  const reflectionsQuery = useInfiniteReflectionsQuery(
    videoId,
    courseId,
    selectedStudentId,
    { pageSize: 20 }
  )

  const aiChatQuery = useInfiniteAIChatQuery(
    videoId,
    courseId,
    selectedStudentId,
    { pageSize: 20 }
  )

  // Flatten paginated data
  const quizzes = flattenQuizAttempts(quizQuery.data)
  const reflections = flattenReflections(reflectionsQuery.data)
  const conversations = flattenAIConversations(aiChatQuery.data)

  // Merge and sort all activities
  const allActivities = useMemo(() => {
    return mergeAndSortActivities(quizzes, reflections, conversations)
  }, [quizzes, reflections, conversations])

  // Group by date
  const groupedActivities = useMemo(() => {
    return groupActivitiesByDate(allActivities)
  }, [allActivities])

  // Get student info if one is selected
  const selectedStudent = students?.find(s => s.id === selectedStudentId)

  // Check if any query is loading
  const isLoading = quizQuery.isLoading || reflectionsQuery.isLoading || aiChatQuery.isLoading
  const isError = quizQuery.isError || reflectionsQuery.isError || aiChatQuery.isError

  // Check if more pages available
  const hasMore = quizQuery.hasNextPage || reflectionsQuery.hasNextPage || aiChatQuery.hasNextPage

  // Load more function
  const handleLoadMore = () => {
    if (quizQuery.hasNextPage) quizQuery.fetchNextPage()
    if (reflectionsQuery.hasNextPage) reflectionsQuery.fetchNextPage()
    if (aiChatQuery.hasNextPage) aiChatQuery.fetchNextPage()
  }

  return (
    <div className="relative flex flex-col h-full bg-gradient-to-b from-background to-secondary/5">
      {/* Header with Tab Navigation */}
      <div className="border-b bg-background/95 backdrop-blur-sm flex-shrink-0">
        <div className="flex">
          {[
            { key: 'checkpoints', label: 'Checkpoints', icon: Target },
            { key: 'students', label: 'Student Journey', icon: Users }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as 'checkpoints' | 'students')}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative flex-1",
                activeTab === key
                  ? "text-primary bg-background border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'checkpoints' ? (
        <CheckpointEditorSidebar
          videoId={videoId}
          currentVideoTime={currentVideoTime}
          videoPlayerRef={videoPlayerRef}
        />
      ) : (
        <div className="flex flex-col h-full flex-1 overflow-hidden">
          {/* Student Selector + Metrics (Condensed) */}
          <div className="p-4 border-b flex-shrink-0 space-y-2">
            {/* Row 1: Search + Student Info + View All */}
            <div className="flex items-center gap-2">
              {/* Search */}
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
                  <div className="absolute top-full mt-1 left-0 right-0 bg-background border rounded-md shadow-lg z-10 max-h-64 overflow-y-auto">
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

              {/* Student Info - Only show when specific student selected */}
              {selectedStudent && (
                <div className="text-sm whitespace-nowrap">
                  <span className="font-medium">{selectedStudent.name}</span>
                </div>
              )}

              {/* View All Button */}
              <Button
                size="sm"
                variant={selectedStudentId === null ? 'default' : 'outline'}
                onClick={() => {
                  setSelectedStudentId(null)
                  setStudentSearchQuery("")
                }}
              >
                View All
              </Button>
            </div>

            {/* Row 2: Metrics */}
            <div className="flex gap-0 border rounded-md overflow-hidden">
              <div className="px-3 py-1.5 bg-secondary/30 border-r text-center flex-1">
                <p className="text-lg font-bold leading-none">45</p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">min/hr</p>
              </div>
              <div className="px-3 py-1.5 bg-secondary/30 border-r text-center flex-1">
                <p className="text-lg font-bold leading-none">78%</p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">exec</p>
              </div>
              <div className="px-3 py-1.5 bg-secondary/30 text-center flex-1">
                <p className="text-lg font-bold leading-none">28s</p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">pace</p>
              </div>
            </div>
          </div>

      {/* Activities Timeline */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-3">
          <h3 className="font-medium text-sm text-muted-foreground mb-3">
            Activity Timeline
          </h3>

          {/* Loading State */}
          {isLoading && allActivities.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Loading activities...</p>
            </div>
          )}

          {/* Error State */}
          {isError && (
            <div className="text-center py-8 text-destructive">
              <p className="text-sm">Failed to load activities. Please try again.</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !isError && allActivities.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No activities yet</p>
            </div>
          )}

          {/* Activities Grouped by Date */}
          {groupedActivities.map((group) => (
            <div key={group.dateKey}>
              {/* Date Header */}
              <div className="text-xs font-medium text-muted-foreground mb-3 px-2 text-center py-1">
                {group.dateHeader}
              </div>

              {/* Activities for this date */}
              <div className="space-y-2">
                {group.activities.map((activity) => {
                  const isExpanded = expandedActivity === activity.id
                  const Icon = activity.type === 'quiz' ? Brain : activity.type === 'voice' ? Mic : activity.type === 'loom' ? Video : activity.type === 'ai-chat-session' ? MessageSquare : Bot

                  // Get student info for "View All" mode
                  const activityStudent = students?.find(s => s.id === activity.userId)

                  return (
                    <div key={activity.id}>
                      <Card
                        className={cn(
                          "cursor-pointer transition-all",
                          isExpanded && "ring-2 ring-primary"
                        )}
                        onClick={() => setExpandedActivity(isExpanded ? null : activity.id)}
                      >
                        <CardContent className="pt-4 pb-3">
                          {/* Show student name if in "View All" mode */}
                          {selectedStudentId === null && activityStudent && (
                            <div className="text-xs font-medium text-muted-foreground mb-2">
                              {activityStudent.name}
                            </div>
                          )}

                          {/* Activity Header */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="p-1.5 rounded-md bg-secondary flex-shrink-0">
                                <Icon className="h-3 w-3 text-primary" />
                              </div>
                              <Badge variant="default" className="text-xs flex-shrink-0">
                                {activity.formattedVideoTime}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                              {activity.type === 'quiz' && activity.quizData ? (
                                <span className="font-medium">
                                  {activity.quizData.score}/{activity.quizData.total} • {activity.formattedTime}
                                </span>
                              ) : (
                                activity.formattedTime
                              )}
                            </div>
                          </div>

                          {/* Activity Content Preview */}
                          <div className="text-sm">
                            {activity.type === 'quiz' && (
                              <p>Quiz completed - {activity.quizData?.percentage}%</p>
                            )}
                            {activity.type === 'voice' && activity.audioData && (
                              <div className="mt-2">
                                <p className="text-xs text-muted-foreground mb-2">Voice Memo</p>
                                <MessengerAudioPlayer
                                  reflectionId={activity.audioData.reflectionId}
                                  fileUrl={activity.audioData.fileUrl}
                                  duration={activity.audioData.duration}
                                  timestamp={activity.videoTimestamp || 0}
                                  isOwn={false}
                                />
                              </div>
                            )}
                            {activity.type === 'loom' && activity.videoData && (
                              <div className="mt-2">
                                <p className="text-xs text-muted-foreground mb-2">Loom Video</p>
                                <LoomVideoCard
                                  url={activity.videoData.url}
                                  timestamp={activity.videoTimestamp || 0}
                                  isOwn={false}
                                />
                              </div>
                            )}
                            {activity.type === 'ai-chat-session' && activity.chatSessionData && (
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">
                                  Chat Session • {activity.chatSessionData.messageCount} message{activity.chatSessionData.messageCount !== 1 ? 's' : ''}
                                </p>
                                <p className="text-xs line-clamp-2">{activity.chatSessionData.firstMessage}</p>
                              </div>
                            )}
                          </div>

                          {/* Expanded Content for Quiz */}
                          {isExpanded && activity.type === 'quiz' && activity.quizData && (
                            <div className="mt-4 pt-4 border-t space-y-3">
                              <div className="text-sm font-medium">
                                Score: {activity.quizData.score}/{activity.quizData.total} ({activity.quizData.percentage}%)
                              </div>
                              {activity.quizData.questions.map((q: any, idx: number) => (
                                <div key={idx} className="space-y-1">
                                  <div className="flex items-start gap-2">
                                    <span className="text-xs text-muted-foreground mt-0.5">Q{idx + 1}.</span>
                                    <div className="flex-1 space-y-1">
                                      <p className="text-sm">{q.question}</p>
                                      <div className="flex items-center gap-2">
                                        {activity.quizData.userAnswers[idx] === q.correctAnswer ? (
                                          <CheckCircle2 className="h-3 w-3 text-green-600" />
                                        ) : (
                                          <X className="h-3 w-3 text-red-600" />
                                        )}
                                        <span className={cn(
                                          "text-xs",
                                          activity.quizData.userAnswers[idx] === q.correctAnswer
                                            ? "text-green-600"
                                            : "text-red-600"
                                        )}>
                                          {q.options[activity.quizData.userAnswers[idx]]}
                                        </span>
                                      </div>
                                      {activity.quizData.userAnswers[idx] !== q.correctAnswer && (
                                        <div className="text-xs text-muted-foreground">
                                          Correct: {q.options[q.correctAnswer]}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Expanded Content for AI Chat Session */}
                          {isExpanded && activity.type === 'ai-chat-session' && activity.chatSessionData && (
                            <div className="mt-4 pt-4 border-t space-y-3 max-h-96 overflow-y-auto">
                              <div className="text-xs font-medium text-muted-foreground mb-3">
                                Chat Conversation ({activity.chatSessionData.messageCount} messages)
                              </div>
                              {activity.chatSessionData.conversations.map((conv, idx) => (
                                <div key={conv.id} className="space-y-2">
                                  {/* Student Message */}
                                  <div className="flex items-start gap-2">
                                    <div className="p-1.5 rounded-full bg-primary/20 flex-shrink-0">
                                      <User className="h-3 w-3 text-primary" />
                                    </div>
                                    <div className="flex-1 bg-primary/5 rounded-lg p-2">
                                      <p className="text-xs text-foreground">{conv.user_message}</p>
                                    </div>
                                  </div>
                                  {/* AI Response */}
                                  <div className="flex items-start gap-2">
                                    <div className="p-1.5 rounded-full bg-secondary flex-shrink-0">
                                      <Bot className="h-3 w-3 text-primary" />
                                    </div>
                                    <div className="flex-1 bg-secondary rounded-lg p-2">
                                      <p className="text-xs text-muted-foreground">{conv.ai_response}</p>
                                    </div>
                                  </div>
                                  {/* Separator between conversation pairs */}
                                  {idx < activity.chatSessionData.conversations.length - 1 && (
                                    <div className="border-t border-border/30 my-2" />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Load More Button */}
          {hasMore && !isLoading && (
            <div className="text-center pt-4">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={quizQuery.isFetchingNextPage || reflectionsQuery.isFetchingNextPage || aiChatQuery.isFetchingNextPage}
              >
                {quizQuery.isFetchingNextPage || reflectionsQuery.isFetchingNextPage || aiChatQuery.isFetchingNextPage
                  ? 'Loading...'
                  : 'Load More'}
              </Button>
            </div>
          )}
        </div>
      </div>
        </div>
      )}
    </div>
  )
}
