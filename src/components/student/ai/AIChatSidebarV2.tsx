"use client"

import { useState, useEffect, useRef } from "react"
import { Message, MessageState, ReflectionData } from "@/lib/video-agent-system"
import { SimpleVoiceMemoPlayer } from '@/components/reflection/SimpleVoiceMemoPlayer'
import { MessengerAudioPlayer } from '@/components/reflection/MessengerAudioPlayer'
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Puzzle, Send, Sparkles, Bot, User, Pause, Lightbulb, CheckCircle2, MessageSquare, Route, Clock, Brain, Zap, Target, Mic, Camera, Video, Upload, Square, Play, Trash2, MicOff, Activity, X, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"
import { useQuizAttemptsQuery } from "@/hooks/use-quiz-attempts-query"

// Utility functions for messenger-style date grouping
function formatDateHeader(date: Date): string {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return "Today"
  } else if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday"
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    })
  }
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

function groupActivitiesByDate(activities: any[]) {
  const groups: { [key: string]: any[] } = {}

  activities.forEach(activity => {
    const date = new Date(activity.timestamp)
    const dateKey = date.toDateString()

    if (!groups[dateKey]) {
      groups[dateKey] = []
    }
    groups[dateKey].push({
      ...activity,
      formattedTime: formatTime(date),
      dateHeader: formatDateHeader(date)
    })
  })

  // Sort groups by date (newest first)
  const sortedGroups = Object.keys(groups)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    .map(dateKey => ({
      dateKey,
      dateHeader: groups[dateKey][0].dateHeader,
      activities: groups[dateKey].sort((a, b) => b.timestamp - a.timestamp) // Newest first within day
    }))

  return sortedGroups
}

interface AIChatSidebarV2Props {
  messages: Message[]
  isVideoPlaying?: boolean
  videoId?: string
  courseId?: string
  currentVideoTime?: number
  onAgentRequest: (type: string) => void
  onAgentAccept: (id: string) => void
  onAgentReject: (id: string) => void
  onQuizAnswer?: (questionId: string, selectedAnswer: number) => void
  onReflectionSubmit?: (type: string, data: any) => void
  onReflectionTypeChosen?: (type: string) => void
  onReflectionCancel?: () => void
  segmentContext?: {
    inPoint: number | null
    outPoint: number | null
    isComplete: boolean
    sentToChat: boolean
  }
  onClearSegmentContext?: () => void
  dispatch?: (action: any) => void
  recordingState?: {
    isRecording: boolean
    isPaused: boolean
  }
  aiState?: {
    isGenerating: boolean
    generatingType: 'quiz' | null
    streamedContent: string
    error: string | null
  }
}

export function AIChatSidebarV2({
  messages,
  isVideoPlaying = false,
  videoId,
  courseId,
  currentVideoTime = 0,
  onAgentRequest,
  onAgentAccept,
  onAgentReject,
  onQuizAnswer,
  onReflectionSubmit,
  onReflectionTypeChosen,
  onReflectionCancel,
  segmentContext,
  onClearSegmentContext,
  dispatch,
  aiState,
  recordingState
}: AIChatSidebarV2Props) {
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [hasRecording, setHasRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackTime, setPlaybackTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
  const [loomUrl, setLoomUrl] = useState('')
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null)
  const [showReflectionOptions, setShowReflectionOptions] = useState<string | null>(null) // Track which message is showing reflection options
  const [activeTab, setActiveTab] = useState<'chat' | 'agents'>('chat')

  // Query for quiz attempts from database
  const quizAttemptsQuery = useQuizAttemptsQuery(videoId || '', courseId || '')

  // Track which agent is currently active based on messages
  const activeAgent = messages.find(msg =>
    msg.type === 'agent-prompt' &&
    msg.state === MessageState.UNACTIVATED &&
    !((msg as any).accepted)
  )?.agentType || null

  // Auto-switch to agents tab when agent becomes active
  useEffect(() => {
    if (activeAgent && activeTab === 'chat') {
      setActiveTab('agents')
    }
  }, [activeAgent, activeTab])
  
  const scrollRef = useRef<HTMLDivElement>(null)
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])
  
  const handleSendMessage = () => {
    if (!inputValue.trim()) return
    
    // Add segment context if present
    const messageWithContext = segmentContext?.sentToChat 
      ? `[Video segment: ${formatRecordingTime(segmentContext.inPoint!)} - ${formatRecordingTime(segmentContext.outPoint!)}]\n${inputValue}`
      : inputValue
    
    // Simulate sending message
    console.log("Sending message:", messageWithContext)
    setInputValue("")
    setIsTyping(true)
    
    // Clear segment context after sending
    if (segmentContext?.sentToChat) {
      onClearSegmentContext?.()
    }
    
    // Simulate AI response
    setTimeout(() => {
      setIsTyping(false)
    }, 2000)
  }
  
  const getAgentConfig = (type?: string) => {
    switch (type) {
      case 'quiz':
        return {
          icon: Brain,
          title: 'PuzzleCheck',
          color: 'from-emerald-500/20 to-green-500/20',
          borderColor: 'border-emerald-500',
          buttonColor: 'bg-emerald-500 hover:bg-emerald-600',
          iconBg: 'bg-gradient-to-br from-emerald-500 to-green-500'
        }
      case 'reflect':
        return {
          icon: Zap,
          title: 'PuzzleReflect',
          color: 'from-purple-500/20 to-pink-500/20',
          borderColor: 'border-purple-500',
          buttonColor: 'bg-purple-500 hover:bg-purple-600',
          iconBg: 'bg-gradient-to-br from-purple-500 to-pink-500'
        }
      default:
        return {
          icon: Puzzle,
          title: 'Unknown',
          color: 'from-gray-500/20 to-gray-400/20',
          borderColor: 'border-gray-500',
          buttonColor: 'bg-gray-500 hover:bg-gray-600',
          iconBg: 'bg-gray-500'
        }
    }
  }
  
  const formatRecordingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Dynamic placeholder text based on current video time
  const getPlaceholderText = (): string => {
    const formattedTime = formatRecordingTime(currentVideoTime)
    return segmentContext?.sentToChat
      ? `Ask about this video segment...`
      : `Discuss this moment (${formattedTime})...`
  }
  
  // Separate messages into chat and agent categories
  const chatMessages = messages.filter(msg => {
    // Only include audio messages (voice memos) in chat
    return msg.type === 'audio'
  })

  const agentMessages = messages.filter(msg => {
    // Exclude reflection options (shown in activity dropdowns)
    // But KEEP quiz-question messages so they appear in the main flow when taking quiz
    if (msg.type === 'reflection-options') {
      return false
    }

    // Exclude agent prompts that are shown as activities
    if (msg.type === 'agent-prompt' && msg.state === MessageState.ACTIVATED) {
      return false
    }

    // Exclude system messages that are activities (with 📍)
    if (msg.type === 'system' && msg.message.includes('📍')) {
      return false
    }

    if (msg.type === 'ai') {
      // Exclude congratulatory messages about quiz completion
      if (msg.message.includes('Great job completing the quiz') ||
          msg.message.includes('You scored') ||
          msg.message.includes('Your understanding of the material is excellent')) {
        return false
      }
      // Exclude quiz start messages
      if (msg.message.includes('Starting your quiz now') ||
          msg.message.includes('Answer each question to the best of your ability')) {
        return false
      }
      // Exclude countdown messages that appear after quiz completion
      if (msg.message.includes('video continues in') ||
          msg.message.includes('Video will resume') ||
          msg.message.match(/\d+\s*\.\.\.\s*\d+\s*\.\.\.\s*\d+/)) {
        return false
      }
    }

    return ['system', 'agent-prompt', 'ai', 'quiz-question', 'quiz-result', 'reflection-complete'].includes(msg.type)
  })
  
  const renderMessage = (msg: Message) => {
    // System messages (like "Paused at X:XX") - More subtle styling
    if (msg.type === 'system') {
      // Check if this is an activity message (e.g., "📍 PuzzleHint • Hint at 0:20")
      const isActivityMessage = msg.message.includes('📍')
      
      if (isActivityMessage) {
        // Activity messages - slightly more prominent but still subtle
        return (
          <div key={msg.id} className="flex justify-start my-3">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-secondary/60 px-4 py-2 rounded-full border border-border/50">
              <span>{msg.message.replace('📍', '•')}</span>
              {/* Add playback button for voice memos */}
              {(msg as any).reflectionData?.type === 'voice' && (msg as any).reflectionData?.fileUrl && (
                <SimpleVoiceMemoPlayer
                  messageId={msg.id}
                  fileUrl={(msg as any).reflectionData.fileUrl}
                  duration={(msg as any).reflectionData.duration}
                />
              )}
            </div>
          </div>
        )
      } else {
        // Regular system messages (like "Paused at X:XX" or "Recording paused at X:XX")
        const isRecordingPaused = msg.message.includes('Recording paused')
        return (
          <div key={msg.id} className="flex justify-start my-3">
            <div className={cn(
              "flex items-center gap-2 text-xs px-3 py-1.5 rounded-full backdrop-blur-sm border",
              isRecordingPaused 
                ? "text-red-600 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                : "text-muted-foreground bg-secondary/50 border-border/50"
            )}>
              <Clock className="h-3 w-3" />
              <span className="font-medium">{msg.message}</span>
            </div>
          </div>
        )
      }
    }

    // Agent prompt messages (unactivated with actions) - Minimalist chat design
    if (msg.type === 'agent-prompt' && msg.state === MessageState.UNACTIVATED && !(msg as any).accepted) {
      return (
        <div key={msg.id} className="flex items-start gap-3 my-3">
          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <span className="text-xs">AI</span>
          </div>
          <div className="flex-1 max-w-[80%]">
            <div className="bg-muted rounded-2xl px-3 py-2">
              <p className="text-sm">{msg.message}</p>
            </div>
            <div className="flex gap-4 mt-2 text-sm">
              {msg.agentType === 'reflect' && showReflectionOptions === msg.id ? (
                /* Show 3 reflection options after Yes is clicked */
                <>
                  <button
                    onClick={async () => {
                      onReflectionTypeChosen?.('voice')
                      console.log('Voice reflection chosen')

                      // Trigger voice recording functionality
                      try {
                        const stream = await navigator.mediaDevices.getUserMedia({
                          audio: {
                            echoCancellation: true,
                            noiseSuppression: true,
                            sampleRate: 44100
                          }
                        })

                        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                          ? 'audio/webm;codecs=opus'
                          : MediaRecorder.isTypeSupported('audio/webm')
                          ? 'audio/webm'
                          : MediaRecorder.isTypeSupported('audio/mp4')
                          ? 'audio/mp4'
                          : 'audio/webm'

                        const recorder = new MediaRecorder(stream, { mimeType })
                        setMediaRecorder(recorder)
                        setIsRecording(true)
                        setRecordingTime(0)
                        setHasRecording(false)

                        const audioChunks: BlobPart[] = []
                        recorder.ondataavailable = (event) => {
                          if (event.data.size > 0) {
                            audioChunks.push(event.data)
                          }
                        }

                        recorder.onstop = () => {
                          const audioBlob = new Blob(audioChunks, { type: mimeType })
                          setAudioBlob(audioBlob)
                          setHasRecording(true)
                          setIsRecording(false)
                          stream.getTracks().forEach(track => track.stop())
                        }

                        recorder.start()

                        recordingIntervalRef.current = setInterval(() => {
                          setRecordingTime(prev => prev + 1)
                        }, 1000)

                      } catch (error) {
                        console.error('Error starting recording:', error)
                      }
                    }}
                    className="text-blue-600 hover:underline"
                  >
                    🎤 Voice
                  </button>
                  <button
                    onClick={() => {
                      onReflectionTypeChosen?.('screenshot')
                      console.log('Screenshot reflection chosen')
                    }}
                    className="text-blue-600 hover:underline"
                  >
                    📷 Screenshot
                  </button>
                  <button
                    onClick={() => {
                      onReflectionTypeChosen?.('loom')
                      console.log('Loom reflection chosen')
                    }}
                    className="text-blue-600 hover:underline"
                  >
                    🎥 Video
                  </button>
                  <button
                    onClick={() => {
                      // Cancel back to Yes/No options
                      setShowReflectionOptions(null)
                    }}
                    className="text-muted-foreground hover:text-foreground ml-1"
                    title="Cancel"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </>
              ) : (
                /* Show Yes/No options initially for all agent types */
                <>
                  <button
                    className="text-blue-600 hover:underline"
                    onClick={() => {
                      if (msg.agentType === 'reflect') {
                        // For reflect, show the 3 reflection options
                        setShowReflectionOptions(msg.id)
                      } else {
                        // For other agents, use normal accept flow
                        onAgentAccept(msg.id)
                      }
                    }}
                    disabled={aiState?.isGenerating && aiState.generatingType === msg.agentType}
                  >
                    {aiState?.isGenerating && aiState.generatingType === msg.agentType ? 'Loading...' :
                      msg.agentType === 'quiz' ? 'Yes, quiz me' :
                      msg.agentType === 'reflect' ? 'Yes, let\'s reflect' :
                      'Yes, let\'s do it'}
                  </button>
                  <button
                    className="text-muted-foreground hover:underline"
                    onClick={() => {
                      // Reset reflection options state when rejecting
                      setShowReflectionOptions(null)
                      // Let StateMachine handle video resumption via REJECT_AGENT command
                      onAgentReject(msg.id)
                    }}
                  >
                    No, continue video
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )
    }
    
    // Activated agent prompts (show without buttons) - Minimalist design
    // Note: Rejected prompts are hidden completely (not shown)
    if (msg.type === 'agent-prompt' && (msg.state === MessageState.ACTIVATED || (msg as any).accepted)) {
      return (
        <div key={msg.id} className="flex items-start gap-3 my-3">
          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <span className="text-xs">AI</span>
          </div>
          <div className="flex-1 max-w-[80%]">
            <div className="bg-muted rounded-2xl px-3 py-2">
              <p className="text-sm">{msg.message}</p>
            </div>
          </div>
        </div>
      )
    }

    // Rejected agent prompts are completely hidden (no rendering)
    
    // AI messages (responses) - Enhanced styling with better visual hierarchy
    if (msg.type === 'ai') {
      // Check if this is a quiz result message
      const quizResult = (msg as any).quizResult
      
      return (
        <div key={msg.id} className="flex items-start gap-3 my-4">
          <Avatar className="h-10 w-10 border-2 border-primary/20 shadow-md">
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 bg-gradient-to-br from-secondary/50 to-secondary/30 rounded-lg px-4 py-3 border border-border/50">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="text-sm whitespace-pre-wrap">{msg.message}</div>
            </div>
          </div>
        </div>
      )
    }
    
    // User messages - Clean and simple
    if (msg.type === 'user') {
      return (
        <div key={msg.id} className="flex items-start gap-3 my-4 justify-end">
          <div className="bg-primary text-primary-foreground rounded-lg px-4 py-3 max-w-[80%] shadow-md">
            <p className="text-sm">{msg.message}</p>
          </div>
          <Avatar className="h-10 w-10 border-2 border-primary shadow-md">
            <AvatarFallback className="bg-primary text-primary-foreground">
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
        </div>
      )
    }
    
    // Quiz question messages - Interactive quiz cards
    if (msg.type === 'quiz-question') {
      const quizData = msg.quizData
      const quizState = msg.quizState
      
      if (!quizData) return null
      
      const hasAnswered = quizState?.userAnswers[quizState.currentQuestionIndex] !== null
      const selectedAnswer = quizState?.userAnswers[quizState.currentQuestionIndex]
      const isCorrect = selectedAnswer === quizData.correctAnswer
      
      return (
        <Card key={msg.id} className="my-4 bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-2 border-emerald-500/50">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="h-5 w-5 text-emerald-600" />
              <span className="font-bold text-sm">Quiz Question {(quizState?.currentQuestionIndex || 0) + 1}</span>
            </div>
            <p className="text-sm font-medium mb-4">{quizData.question}</p>
            <div className="space-y-2">
              {quizData.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => !hasAnswered && onQuizAnswer?.(quizData.id, index)}
                  disabled={hasAnswered}
                  className={cn(
                    "w-full text-left p-3 rounded-lg transition-all text-sm",
                    hasAnswered && index === selectedAnswer
                      ? isCorrect
                        ? "bg-green-100 dark:bg-green-950 border-2 border-green-500"
                        : "bg-red-100 dark:bg-red-950 border-2 border-red-500"
                      : hasAnswered && index === quizData.correctAnswer
                      ? "bg-green-100 dark:bg-green-950 border-2 border-green-500"
                      : hasAnswered
                      ? "bg-gray-100 dark:bg-gray-800 opacity-50"
                      : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span>{option}</span>
                    {hasAnswered && index === selectedAnswer && (
                      <span className={isCorrect ? "text-green-600" : "text-red-600"}>
                        {isCorrect ? "✓" : "✗"}
                      </span>
                    )}
                    {hasAnswered && index === quizData.correctAnswer && index !== selectedAnswer && (
                      <span className="text-green-600">✓</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
            {hasAnswered && (
              <div className={cn(
                "mt-4 p-3 rounded-lg text-sm",
                isCorrect 
                  ? "bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-200"
                  : "bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200"
              )}>
                <p className="font-semibold mb-1">
                  {isCorrect ? "Correct! 🎉" : "Not quite right."}
                </p>
                <p>{quizData.explanation}</p>
              </div>
            )}
          </div>
        </Card>
      )
    }

    // Reflection options messages - REMOVED (now handled in agent prompt directly)
    // if (msg.type === 'reflection-options') { ... }

    // Audio messages - Messenger-style audio player
    if (msg.type === 'audio' && msg.audioData) {
      return (
        <div key={msg.id} className="flex justify-end my-3">
          <MessengerAudioPlayer
            reflectionId={msg.audioData.reflectionId}
            fileUrl={msg.audioData.fileUrl}
            duration={msg.audioData.duration}
            timestamp={msg.audioData.videoTimestamp}
            isOwn={true}
          />
        </div>
      )
    }

    // Reflection complete messages are now handled by AI messages with reflectionData
    // This section can be removed as it's no longer used

    return null
  }

  // Extract activity entries from messages and database
  const messageActivities = messages.filter(msg => {
    // Include system messages with timestamps (📍)
    if (msg.type === 'system' && msg.message.includes('📍')) {
      return true
    }
    // EXCLUDE quiz-question messages (they're for active quiz taking, not timeline)
    // Only include quiz in activities AFTER it's completed (when quiz-result exists)
    if (msg.type === 'quiz-question') {
      return false
    }
    // Include reflection options (when reflect agent is activated)
    if (msg.type === 'reflection-options') {
      return true
    }
    // Include agent prompt activations ONLY if they're not quiz prompts
    // Quiz prompts shouldn't appear in timeline until completed
    if (msg.type === 'agent-prompt' && msg.state === MessageState.ACTIVATED) {
      if (msg.agentType === 'quiz') {
        return false // Don't show quiz prompts in timeline
      }
      return true
    }
    // Include completed quiz results in timeline
    if (msg.type === 'quiz-result') {
      return true
    }
    return false
  })

  // Convert database quiz attempts to activity format
  const databaseQuizActivities = (quizAttemptsQuery.data?.success && quizAttemptsQuery.data.data)
    ? quizAttemptsQuery.data.data.map(attempt => ({
        id: `db-quiz-${attempt.id}`,
        type: 'system' as const,
        state: MessageState.PERMANENT,
        message: `📍 PuzzleCheck • Quiz at ${Math.floor(attempt.video_timestamp / 60)}:${String(Math.floor(attempt.video_timestamp % 60)).padStart(2, '0')}`,
        timestamp: new Date(attempt.created_at).getTime(),
        quizResult: {
          score: attempt.score,
          total: attempt.total_questions,
          percentage: attempt.percentage,
          questions: attempt.questions.map((q: any, idx: number) => ({
            questionId: q.id || `q-${idx}`,
            question: q.question,
            userAnswer: attempt.user_answers[idx],
            correctAnswer: q.correctAnswer,
            isCorrect: attempt.user_answers[idx] === q.correctAnswer,
            explanation: q.explanation,
            options: q.options
          })),
          completedAt: attempt.video_timestamp
        },
        dbQuizAttempt: attempt // Store the original database record
      }))
    : []

  // Combine and sort all activities by timestamp
  const activities = [...messageActivities, ...databaseQuizActivities].sort((a, b) => a.timestamp - b.timestamp)

  // Parse activity type and details from message - handle both system messages and direct activity types
  const parseActivity = (msg: Message) => {
    const message = msg.message

    // Handle quiz questions directly (shouldn't appear in activities now, but keep for safety)
    if (msg.type === 'quiz-question') {
      return { type: 'quiz', icon: Brain, color: 'text-green-600' }
    }

    // Handle quiz results (completed quizzes)
    if (msg.type === 'quiz-result') {
      return { type: 'quiz-complete', icon: Trophy, color: 'text-green-600' }
    }

    // Handle reflection options directly
    if (msg.type === 'reflection-options') {
      return { type: 'reflect', icon: Target, color: 'text-blue-600' }
    }

    // Handle agent prompts
    if (msg.type === 'agent-prompt' && msg.agentType === 'quiz') {
      return { type: 'quiz', icon: Brain, color: 'text-green-600' }
    }
    if (msg.type === 'agent-prompt' && msg.agentType === 'reflect') {
      return { type: 'reflect', icon: Target, color: 'text-blue-600' }
    }

    // Handle system messages with timestamps
    if (message.includes('PuzzleHint activated')) {
      return { type: 'hint', icon: Puzzle, color: 'text-purple-600' }
    }
    // Handle both "PuzzleCheck activated" and "PuzzleCheck • Quiz" patterns
    if (message.includes('PuzzleCheck activated') || message.includes('PuzzleCheck • Quiz')) {
      return { type: 'quiz', icon: Brain, color: 'text-green-600' }
    }
    if (message.includes('Quiz completed')) {
      return { type: 'quiz-complete', icon: CheckCircle2, color: 'text-green-600' }
    }
    if (message.includes('PuzzleReflect activated')) {
      return { type: 'reflect', icon: Target, color: 'text-blue-600' }
    }
    if (message.includes('Reflection completed') || message.includes('Voice Memo') || message.includes('reflection saved')) {
      return { type: 'reflect-complete', icon: CheckCircle2, color: 'text-blue-600' }
    }
    if (message.includes('Screenshot')) {
      return { type: 'screenshot', icon: Camera, color: 'text-green-600' }
    }
    if (message.includes('Loom Video')) {
      return { type: 'loom', icon: Video, color: 'text-purple-600' }
    }
    return { type: 'unknown', icon: Activity, color: 'text-gray-600' }
  }

  // Extract timestamp from message - handle both system messages with timestamps and regular messages
  const extractTimestamp = (msg: Message) => {
    // For system messages, try to extract from message text first
    const match = msg.message.match(/at (\d+:\d+)/)
    if (match) return match[1]

    // For other messages, format the timestamp from the message object
    const date = new Date(msg.timestamp)
    const hours = date.getHours()
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    return `${displayHours}:${minutes} ${ampm}`
  }

  // Extract additional info (like quiz score)
  const extractAdditionalInfo = (message: string) => {
    const scoreMatch = message.match(/Score: (\d+\/\d+ \(\d+%\))/)
    if (scoreMatch) return scoreMatch[1]
    return null
  }

  const renderActivityList = () => {
    if (activities.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="text-muted-foreground text-sm">
            No activities yet. Use the buttons below to start learning.
          </div>
        </div>
      )
    }

    // Group activities by date for messenger-style display
    const groupedActivities = groupActivitiesByDate(activities)

    return (
      <div className="space-y-3 mb-4">
        {groupedActivities.map((group, groupIndex) => (
          <div key={group.dateKey}>
            {/* Date Header */}
            <div className="text-xs font-medium text-muted-foreground mb-3 px-2 sticky top-0 bg-background/95 backdrop-blur-sm py-1">
              {group.dateHeader}
            </div>

            {/* Activities for this date */}
            <div className="space-y-2">
              {group.activities.map((activity, index) => {
                const parsed = parseActivity(activity)
                const additionalInfo = extractAdditionalInfo(activity.message)
                const Icon = parsed.icon
                const isExpanded = expandedActivity === activity.id

                return (
                  <div key={activity.id}>
                    {/* Activity Item */}
                    <div
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer border",
                        isExpanded
                          ? "bg-primary/10 border-primary/20 rounded-b-none"
                          : "bg-secondary/20 border-border/30 hover:bg-secondary/40"
                      )}
                      onClick={() => setExpandedActivity(isExpanded ? null : activity.id)}
                    >
                      <div className={cn("p-1.5 rounded-md", isExpanded ? "bg-primary/20" : "bg-secondary")}>
                        <Icon className={cn("h-3 w-3", parsed.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-foreground">
                      {(() => {
                        // Display proper names for different activity types
                        if (parsed.type === 'quiz' || parsed.type === 'quiz-complete') {
                          return 'PuzzleCheck • Quiz'
                        }
                        if (parsed.type === 'reflect' || parsed.type === 'reflect-complete') {
                          return 'PuzzleReflect • Reflection'
                        }
                        if (parsed.type === 'hint') {
                          return 'PuzzleHint • Hint'
                        }
                        // For system messages, clean them up
                        return activity.message.replace(/📍\s*/, '').replace(/at \d+:\d+/, '').trim()
                      })()}
                      {/* Show quiz progress for quiz activities */}
                      {(parsed.type === 'quiz' || parsed.type === 'quiz-complete') && (() => {
                        // Check if this is a database quiz activity first
                        if ((activity as any).dbQuizAttempt) {
                          const result = (activity as any).quizResult
                          return ` • ${result.score}/${result.total}`
                        }

                        // Find related quiz result to show progress using explicit relationships
                        const quizResult = agentMessages.find(msg => {
                          const hasQuizResult = msg.type === 'quiz-result' ||
                                              (msg.type === 'ai' && (msg as any).quizResult)
                          // Use explicit relationships instead of timestamp proximity
                          const isRelatedToActivity = msg.id === activity.id ||
                                                    msg.linkedMessageId === activity.id ||
                                                    activity.linkedMessageId === msg.id
                          return hasQuizResult && isRelatedToActivity
                        })
                        if (quizResult?.quizResult) {
                          return ` • ${quizResult.quizResult.score}/${quizResult.quizResult.total}`
                        }
                        // Extract score from additionalInfo if available
                        if (additionalInfo && additionalInfo.includes('/')) {
                          return ` • ${additionalInfo}`
                        }
                        return ' • 0/1' // Default for incomplete
                      })()}
                    </span>
                    {/* Individual timestamp on the right side */}
                    <span className="text-xs text-muted-foreground ml-2">
                      {activity.formattedTime || formatTime(new Date(activity.timestamp))}
                    </span>
                  </div>
                  {/* Additional info now shown inline with activity name */}
                </div>
                <div className={cn(
                  "text-xs transition-transform",
                  isExpanded ? "rotate-180" : ""
                )}>
                  ▼
                </div>
              </div>

              {/* Expanded Content - Shows directly below */}
              {isExpanded && (
                <div className="bg-background/50 border border-primary/20 border-t-0 rounded-b-lg p-4">
                  <div className="text-sm font-medium mb-3 text-muted-foreground">
                    {parsed.type === 'quiz' || parsed.type === 'quiz-complete' ? 'Quiz' :
                     parsed.type === 'reflect' || parsed.type === 'reflect-complete' ? 'Reflection' : 'Activity Details'}
                  </div>
                  <div className="space-y-3">
                    {(() => {
                      // Find related content based on activity type
                      let relatedContent = null

                      if (parsed.type === 'quiz' || parsed.type === 'quiz-complete') {
                        // Check if this is a database quiz activity
                        if ((activity as any).dbQuizAttempt) {
                          // Database quiz - show its data directly without nested dropdown
                          const result = (activity as any).quizResult
                          return (
                            <div className="space-y-3">
                              {result.questions.map((q: any, idx: number) => (
                                <div key={q.questionId} className="space-y-1">
                                  <div className="flex items-start gap-2">
                                    <span className="text-xs text-muted-foreground mt-0.5">
                                      Q{idx + 1}.
                                    </span>
                                    <div className="flex-1 space-y-1">
                                      <p className="text-sm">{q.question}</p>

                                      <div className="flex items-center gap-2">
                                        {q.isCorrect ? (
                                          <CheckCircle2 className="h-3 w-3 text-green-600" />
                                        ) : (
                                          <X className="h-3 w-3 text-red-600" />
                                        )}
                                        <span className={cn(
                                          "text-xs",
                                          q.isCorrect ? "text-green-600" : "text-red-600"
                                        )}>
                                          Your answer: {q.options[q.userAnswer]}
                                        </span>
                                      </div>

                                      {!q.isCorrect && (
                                        <div className="text-xs text-muted-foreground">
                                          Correct: {q.options[q.correctAnswer]}
                                        </div>
                                      )}

                                      {!q.isCorrect && q.explanation && (
                                        <div className="text-xs text-muted-foreground mt-1 pl-2 border-l-2 border-border/50">
                                          {q.explanation}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        } else {
                          // Find messages explicitly linked to this specific activity (not timestamp proximity)
                          relatedContent = agentMessages.filter(msg =>
                            msg.id === activity.id ||
                            msg.linkedMessageId === activity.id ||
                            activity.linkedMessageId === msg.id
                          )
                        }
                      } else if (parsed.type === 'reflect' || parsed.type === 'reflect-complete') {
                        // Find reflection content - show reflection options for activation, audio player for completion
                        if (parsed.type === 'reflect-complete') {
                          // For completed reflections, show the audio player or result
                          relatedContent = agentMessages.filter(msg =>
                            msg.type === 'audio' &&
                            (msg.id === activity.id || msg.linkedMessageId === activity.id || activity.linkedMessageId === msg.id)
                          )
                        } else {
                          // For reflect activation, show reflection options
                          relatedContent = agentMessages.filter(msg =>
                            msg.type === 'reflection-options' &&
                            (msg.id === activity.id || msg.linkedMessageId === activity.id || activity.linkedMessageId === msg.id)
                          )
                        }
                      }

                      if (relatedContent && relatedContent.length > 0) {
                        // For quiz activities, show clean quiz review instead of AI messages
                        if (parsed.type === 'quiz' || parsed.type === 'quiz-complete') {
                          const aiMessageWithQuiz = relatedContent.find(msg => msg.type === 'ai' && (msg as any).quizResult)
                          if (aiMessageWithQuiz && (aiMessageWithQuiz as any).quizResult) {
                            const result = (aiMessageWithQuiz as any).quizResult
                            return (
                              <div className="space-y-3">
                                <div className="text-sm font-medium text-primary">
                                  Score: {result.score}/{result.total} ({result.percentage}%)
                                </div>
                                {result.questions.map((q: any, index: number) => (
                                  <div key={index} className="p-3 bg-secondary/30 rounded-lg">
                                    <div className="text-sm font-medium mb-2">{q.question}</div>
                                    <div className="space-y-1 text-xs">
                                      {q.options.map((option: string, optIndex: number) => (
                                        <div
                                          key={optIndex}
                                          className={cn(
                                            "p-2 rounded",
                                            optIndex === q.userAnswer
                                              ? q.isCorrect
                                                ? "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200"
                                                : "bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200"
                                              : optIndex === q.correctAnswer
                                              ? "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200"
                                              : "bg-gray-100 dark:bg-gray-800"
                                          )}
                                        >
                                          {option}
                                          {optIndex === q.userAnswer && (
                                            <span className="ml-2">
                                              {q.isCorrect ? "✓ Your answer" : "✗ Your answer"}
                                            </span>
                                          )}
                                          {optIndex === q.correctAnswer && optIndex !== q.userAnswer && (
                                            <span className="ml-2 text-green-600">✓ Correct</span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                    {q.explanation && (
                                      <div className="mt-2 text-xs text-muted-foreground italic">
                                        {q.explanation}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )
                          }
                        }

                        // For other activities, show messages normally
                        return relatedContent.map(renderMessage)
                      }

                      // Debug: Show activity info (removed timestamp proximity debug to avoid confusion)
                      console.log('Activity:', activity.message, 'ID:', activity.id)
                      console.log('Parsed activity type:', parsed.type)

                      // If no content found, try to find quiz state or completed quiz data
                      if (parsed.type === 'quiz' || parsed.type === 'quiz-complete') {
                        // Look for quiz results using explicit message relationships (not timestamp proximity)
                        const quizResult = agentMessages.find(msg => {
                          const hasQuizResult = msg.type === 'quiz-result' ||
                                              (msg.type === 'ai' && (msg as any).quizResult)
                          // Use explicit relationships: either this message IS the activity, or it's linked to it
                          const isRelatedToActivity = msg.id === activity.id ||
                                                    msg.linkedMessageId === activity.id ||
                                                    activity.linkedMessageId === msg.id
                          return hasQuizResult && isRelatedToActivity
                        })

                        console.log('Found quizResult:', quizResult)

                        // Extract quiz result data from either message type
                        let result = null
                        if (quizResult?.type === 'quiz-result' && (quizResult as any).quizResult) {
                          result = (quizResult as any).quizResult
                        } else if (quizResult?.type === 'ai' && (quizResult as any).quizResult) {
                          result = (quizResult as any).quizResult
                        }

                        console.log('Extracted result:', result)

                        if (result) {
                          return (
                            <div className="space-y-3">
                              <div className="text-sm font-medium text-primary">
                                Score: {result.score}/{result.total} ({result.percentage}%)
                              </div>
                              {result.questions.map((q, index) => (
                                <div key={index} className="p-3 bg-secondary/30 rounded-lg">
                                  <div className="text-sm font-medium mb-2">{q.question}</div>
                                  <div className="space-y-1 text-xs">
                                    {q.options.map((option, optIndex) => (
                                      <div
                                        key={optIndex}
                                        className={cn(
                                          "p-2 rounded",
                                          optIndex === q.userAnswer
                                            ? q.isCorrect
                                              ? "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200"
                                              : "bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200"
                                            : optIndex === q.correctAnswer
                                            ? "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200"
                                            : "bg-gray-100 dark:bg-gray-800"
                                        )}
                                      >
                                        {option}
                                        {optIndex === q.userAnswer && (
                                          <span className="ml-2">
                                            {q.isCorrect ? "✓ Your answer" : "✗ Your answer"}
                                          </span>
                                        )}
                                        {optIndex === q.correctAnswer && optIndex !== q.userAnswer && (
                                          <span className="ml-2 text-green-600">✓ Correct</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                  {q.explanation && (
                                    <div className="mt-2 text-xs text-muted-foreground italic">
                                      {q.explanation}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )
                        }

                        return (
                          <div className="text-xs text-muted-foreground italic">
                            Quiz content will appear here when activated.
                          </div>
                        )
                      }

                      return (
                        <div className="text-xs text-muted-foreground italic">
                          {parsed.type === 'reflect' ? 'Reflection options will appear here when activated.' :
                           'No additional content available for this activity.'}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )}
            </div>
          )
        })}
            </div>
          </div>
        ))}
      </div>
    )
  }


  return (
    <div className="relative flex flex-col h-full bg-gradient-to-b from-background to-secondary/5">
      {/* Header - Minimalist */}
      <div className="border-b bg-background/95 backdrop-blur-sm p-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-gradient-to-br from-primary to-primary/70">
              <Bot className="h-4 w-4 text-primary-foreground" />
            </div>
            <h3 className="font-medium text-sm">AI Assistant</h3>
          </div>
        </div>


        {/* Tab Navigation */}
        <div className="flex border-b bg-background/50 backdrop-blur-sm">
          {[
            { key: 'chat', label: 'Chat', icon: MessageSquare },
            { key: 'agents', label: 'Agents', icon: Brain }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as 'chat' | 'agents')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors relative",
                activeTab === key
                  ? "text-primary bg-background border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
              {/* Badge for active agents on Agents tab */}
              {key === 'agents' && activeAgent && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </button>
          ))}
        </div>

      </div>

      {/* Messages - Scrollable area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {activeTab === 'chat' ? (
            /* Chat Tab: Show only chat messages */
            chatMessages.map(renderMessage)
          ) : (
            /* Agents Tab: Show activity list + current agent messages + expanded content */
            <>
              {/* Activity List */}
              {renderActivityList()}

              {/* Current Agent Messages - Show all agent messages naturally */}
              {agentMessages.map(renderMessage)}
            </>
          )}

          {/* AI State Error */}
          {aiState?.error && (
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10 border-2 border-red-500/20 shadow-md">
                <AvatarFallback className="bg-red-100 dark:bg-red-950">
                  <Bot className="h-5 w-5 text-red-600 dark:text-red-400" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 bg-red-50 dark:bg-red-950/30 rounded-2xl px-3 py-2 border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 mb-2">
                  <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <span className="font-bold text-sm text-red-600 dark:text-red-400">Error</span>
                </div>
                <div className="text-sm text-red-700 dark:text-red-300">
                  {aiState.error}
                </div>
              </div>
            </div>
          )}

          {isTyping && (
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10 border-2 border-primary/20 shadow-md">
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70">
                  <Bot className="h-5 w-5 text-primary-foreground" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-2xl px-3 py-2">
                <div className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 bg-primary rounded-full animate-bounce"></span>
                  <span className="inline-block w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                  <span className="inline-block w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                </div>
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </div>

      {/* Input/Actions - Fixed at bottom */}
      <div className="border-t bg-background/95 backdrop-blur-sm p-4 flex-shrink-0">
        {activeTab === 'chat' ? (
          /* Chat Tab: Show input field and agent buttons */
          <>
            {/* Segment Context Display */}
            {segmentContext?.sentToChat && segmentContext.inPoint !== null && segmentContext.outPoint !== null && (
              <div className="mb-3 p-2 bg-secondary/50 rounded-lg border border-primary/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-gradient-to-b from-green-500 to-red-500 rounded-full" />
                    <span className="text-xs text-muted-foreground">Context:</span>
                    <span className="text-xs font-medium">
                      Video clip from {formatRecordingTime(segmentContext.inPoint)} to {formatRecordingTime(segmentContext.outPoint)}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onClearSegmentContext}
                    className="h-6 w-6 p-0 hover:bg-secondary"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-2 mb-2">
              <Input
                placeholder={getPlaceholderText()}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 border-2 focus:border-primary/50 transition-colors"
              />
              <Button onClick={handleSendMessage} size="sm" className="px-3">
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {/* Agent buttons below input - Minimalist icons only */}
            <div className="flex gap-1 px-1">
              {[
                { type: 'quiz', icon: Brain, tooltip: 'Take a quiz on video content' },
                { type: 'reflect', icon: Zap, tooltip: 'Reflect on what you learned' }
              ].map(({ type, icon: Icon, tooltip }) => (
                <Button
                  key={type}
                  size="sm"
                  variant="ghost"
                  onClick={() => onAgentRequest(type)}
                  className={cn(
                    "h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors",
                    activeAgent === type && "text-foreground bg-muted"
                  )}
                  title={tooltip}
                >
                  <Icon className="h-3.5 w-3.5" />
                </Button>
              ))}
            </div>
          </>
        ) : (
          /* Agents Tab: Show agent activation buttons only */
          <div className="space-y-3">
            <div className="text-center text-sm text-muted-foreground mb-3">
              Activate learning agents
            </div>
            <div className="flex gap-2">
              {[
                { type: 'quiz', icon: Brain, label: 'Quiz', tooltip: 'Take a quiz on video content' },
                { type: 'reflect', icon: Zap, label: 'Reflect', tooltip: 'Reflect on what you learned' }
              ].map(({ type, icon: Icon, label, tooltip }) => (
                <Button
                  key={type}
                  variant="outline"
                  onClick={() => onAgentRequest(type)}
                  className={cn(
                    "flex-1 flex items-center gap-2 h-12 transition-colors",
                    activeAgent === type && "border-primary bg-primary/10 text-primary"
                  )}
                  title={tooltip}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{label}</span>
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

