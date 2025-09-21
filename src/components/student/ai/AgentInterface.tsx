'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Lightbulb, CheckCircle2, MessageSquare, Play, Clock, Trophy, Brain } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LoomVideoCard } from '@/components/reflection/LoomVideoCard'
import { MessengerAudioPlayer } from '@/components/reflection/MessengerAudioPlayer'
import { useLearningActivitiesQuery, useActivityStateHelpers } from '@/hooks/use-learning-activities'
import { useQuizAttemptsQuery } from '@/hooks/use-quiz-attempts-query'
import { useReflectionsQuery } from '@/hooks/use-reflections-query'
import type { LearningActivity } from '@/hooks/use-learning-activities'
import { MessageState } from '@/lib/video-agent-system'

interface AgentInterfaceProps {
  courseId: string
  videoId: string
  currentTime: number
  messages: any[] // Temporary: until we migrate agent prompt creation to learning_activities
  onQuizChoice?: () => void
  onReflectionChoice?: () => void
  onAgentRequest?: (agentType: string) => void // Add trigger prop
}

export function AgentInterface({ courseId, videoId, currentTime, messages, onQuizChoice, onReflectionChoice, onAgentRequest }: AgentInterfaceProps) {
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null)

  // TanStack Query hooks for data (3-Layer SSOT pattern)
  const activitiesQuery = useLearningActivitiesQuery(courseId, videoId)
  const quizAttemptsQuery = useQuizAttemptsQuery(videoId, courseId)
  const reflectionsQuery = useReflectionsQuery(videoId, courseId)

  // Activity state helpers
  const { activateActivity, completeActivity, isUpdating } = useActivityStateHelpers()

  // TEMPORARY: Bridge old message system until we migrate agent prompt creation
  // TODO: Replace with learning_activities creation system
  const agentPrompts = messages.filter((msg: any) =>
    msg.type === 'agent-prompt' &&
    msg.state === MessageState.UNACTIVATED &&
    !((msg as any).accepted) &&
    ['quiz', 'reflect'].includes(msg.agentType || '')
  )



  // Convert agent prompts to activity format (TEMPORARY)
  const promptActivities = agentPrompts.map((msg: any) => ({
    id: `prompt-${msg.id}`,
    type: 'prompt' as const,
    title: msg.agentType === 'quiz' ? 'Knowledge Check' : 'Reflection Prompt',
    message: msg.message,
    timestamp: msg.timestamp,
    videoTimestamp: 0,
    agentType: msg.agentType,
    promptMessage: msg
  }))

  // Convert database quiz attempts to activity format
  const quizActivities = (quizAttemptsQuery.data?.success && quizAttemptsQuery.data.data)
    ? quizAttemptsQuery.data.data.map(attempt => ({
        id: `quiz-${attempt.id}`,
        type: 'quiz' as const,
        title: 'Knowledge Check Quiz',
        timestamp: new Date(attempt.created_at).getTime(),
        videoTimestamp: attempt.video_timestamp,
        score: attempt.score,
        total: attempt.total_questions,
        percentage: attempt.percentage,
        questions: attempt.questions,
        userAnswers: attempt.user_answers,
        completedAt: attempt.video_timestamp
      }))
    : []

  // Convert database reflections to activity format
  const reflectionActivities = (reflectionsQuery.data?.success && reflectionsQuery.data.data)
    ? reflectionsQuery.data.data
        .filter(reflection => {
          // Include voice and loom reflections that have valid file URLs
          return (reflection.reflection_type === 'voice' || reflection.reflection_type === 'loom') &&
                 reflection.file_url &&
                 reflection.file_url.trim() !== '' &&
                 // For voice: check duration, for loom: no duration needed
                 (reflection.reflection_type === 'loom' ||
                  (reflection.duration_seconds > 0 || reflection.duration_seconds === null))
        })
        .map(reflection => {
          const videoTimestamp = reflection.video_timestamp_seconds || 0
          const fileUrl = reflection.file_url || ''

          const audioData = reflection.reflection_type === 'voice' ? {
            fileUrl,
            duration: reflection.duration_seconds || 0,
            videoTimestamp,
            reflectionId: reflection.id
          } : undefined

          const loomData = reflection.reflection_type === 'loom' ? {
            url: fileUrl,
            videoTimestamp
          } : undefined

          return {
            id: `reflection-${reflection.id}`,
            type: 'reflection' as const,
            title: `${reflection.reflection_type === 'loom' ? 'Loom Video' : 'Voice Memo'} Reflection`,
            timestamp: new Date(reflection.created_at).getTime(),
            videoTimestamp,
            reflectionType: reflection.reflection_type,
            audioData,
            loomData,
            dbReflection: reflection
          }
        })
    : []

  // Convert learning activities from new system (TODO: Implement when we migrate agent prompts)
  const learningActivities = (activitiesQuery.data?.success && activitiesQuery.data.data)
    ? activitiesQuery.data.data.map(activity => ({
        id: `learning-${activity.id}`,
        type: 'prompt' as const,
        title: activity.title,
        message: activity.content?.message || activity.title,
        timestamp: new Date(activity.created_at).getTime(),
        videoTimestamp: activity.triggered_at_timestamp || 0,
        agentType: activity.activity_type,
        activityData: activity
      }))
    : []

  // Combine all activities and sort by timestamp
  const allActivities = [
    ...promptActivities,   // TEMPORARY: Agent prompts from messages
    ...learningActivities, // New learning activities system
    ...quizActivities,     // Completed quiz attempts
    ...reflectionActivities, // Completed reflections
  ].sort((a, b) => b.timestamp - a.timestamp)

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getActivityIcon = (activity: any) => {
    switch (activity.type) {
      case 'prompt':
        return activity.agentType === 'quiz'
          ? <Brain className="h-4 w-4 text-purple-600" />
          : <Lightbulb className="h-4 w-4 text-orange-600" />
      case 'quiz':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'reflection':
        return activity.reflectionType === 'loom'
          ? <Play className="h-4 w-4 text-blue-600" />
          : <MessageSquare className="h-4 w-4 text-blue-600" />
      default:
        return <Lightbulb className="h-4 w-4 text-orange-600" />
    }
  }

  const getActivityDescription = (activity: any) => {
    switch (activity.type) {
      case 'prompt':
        return activity.agentType === 'quiz'
          ? '🧠 Quiz available - click to start'
          : '💭 Reflection prompt - click to respond'
      case 'quiz':
        const durationText = activity.score !== undefined
          ? `${activity.score}/${activity.total} (${activity.percentage}%)`
          : '0:00'
        return `📊 Quiz result ${durationText} at ${formatTimestamp(activity.videoTimestamp)}`
      case 'reflection':
        if (activity.audioData) {
          const duration = activity.audioData.duration || 0
          const durationText = duration > 0 ? `${duration.toFixed(1)}s` : '0:00'
          return `🎙️ Voice memo (${durationText}) at ${formatTimestamp(activity.videoTimestamp)}`
        } else if (activity.loomData) {
          return `🎬 Loom video at ${formatTimestamp(activity.videoTimestamp)}`
        }
        return '🎙️ Voice memo'
      default:
        return activity.title
    }
  }

  if (activitiesQuery.isLoading || quizAttemptsQuery.isLoading || reflectionsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-sm text-muted-foreground">Loading activities...</div>
      </div>
    )
  }

  if (allActivities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-center">
        <Lightbulb className="h-8 w-8 text-muted-foreground mb-2" />
        <div className="text-sm text-muted-foreground">
          No learning activities yet
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Complete quizzes and reflections to see them here
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* TEMPORARY: Test trigger to create agent prompts */}
      {onAgentRequest && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200">
          <div className="text-sm font-medium mb-2 text-yellow-800 dark:text-yellow-200">
            ⚠️ TESTING: Create Agent Prompts
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => onAgentRequest('quiz')}
              className="flex-1"
            >
              Trigger Quiz
            </Button>
            <Button
              size="sm"
              onClick={() => onAgentRequest('reflect')}
              className="flex-1"
            >
              Trigger Reflection
            </Button>
          </div>
        </div>
      )}

      {allActivities.map((activity) => (
        <Card
          key={activity.id}
          className={cn(
            "p-3 cursor-pointer transition-colors",
            expandedActivity === activity.id && "ring-2 ring-blue-500/20"
          )}
          onClick={() => setExpandedActivity(
            expandedActivity === activity.id ? null : activity.id
          )}
        >
          {/* Activity Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0 mt-0.5">
                {getActivityIcon(activity)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {activity.title}
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <span className="text-xs text-gray-500">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {formatTimestamp(activity.videoTimestamp)}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {getActivityDescription(activity)}
                </div>
              </div>
            </div>
          </div>

          {/* Expanded Content */}
          {expandedActivity === activity.id && (
            <div className="mt-3 pt-3 border-t">
              {/* Agent Prompt Actions */}
              {activity.type === 'prompt' && (
                <div className="space-y-3">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    {activity.message}
                  </div>
                  <div className="flex gap-2">
                    {activity.agentType === 'quiz' ? (
                      <Button
                        size="sm"
                        onClick={() => onQuizChoice?.()}
                        className="flex-1"
                      >
                        Yes, quiz me
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => onReflectionChoice?.()}
                        className="flex-1"
                      >
                        Yes, let's reflect
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setExpandedActivity(null)}
                      className="flex-1"
                    >
                      Maybe later
                    </Button>
                  </div>
                </div>
              )}

              {/* Quiz Results */}
              {activity.type === 'quiz' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Trophy className="h-4 w-4 text-yellow-600" />
                    <span>Score: {activity.score}/{activity.total} ({activity.percentage}%)</span>
                  </div>
                  {activity.questions && (
                    <div className="text-xs text-muted-foreground">
                      {activity.questions.length} question{activity.questions.length !== 1 ? 's' : ''} completed
                    </div>
                  )}
                </div>
              )}

              {/* Voice Memo Player */}
              {activity.type === 'reflection' && activity.audioData && activity.audioData.fileUrl && (
                <MessengerAudioPlayer
                  reflectionId={activity.audioData.reflectionId}
                  fileUrl={activity.audioData.fileUrl}
                  duration={activity.audioData.duration}
                  timestamp={activity.audioData.videoTimestamp}
                  isOwn={true}
                />
              )}

              {/* Loom Video Card */}
              {activity.type === 'reflection' && activity.loomData && activity.loomData.url && (
                <LoomVideoCard
                  url={activity.loomData.url}
                  timestamp={activity.loomData.videoTimestamp}
                  isOwn={true}
                />
              )}
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}