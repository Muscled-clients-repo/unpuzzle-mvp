"use client"

import { useState, useEffect, useRef } from "react"
import { Message, MessageState, ReflectionData } from "@/lib/video-agent-system"
import { SimpleVoiceMemoPlayer } from '@/components/reflection/SimpleVoiceMemoPlayer'
import { MessengerAudioPlayer } from '@/components/reflection/MessengerAudioPlayer'
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Puzzle, Send, Sparkles, Bot, User, Pause, Lightbulb, CheckCircle2, MessageSquare, Route, Clock, Brain, Zap, Target, Mic, Camera, Video, Upload, Square, Play, Trash2, MicOff, Activity, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { AIActivityLog } from "./AIActivityLog"
import { QuizResultBox } from "./QuizResultBox"

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
  const [showActivityLog, setShowActivityLog] = useState(false)
  const [showReflectionOptions, setShowReflectionOptions] = useState<string | null>(null) // Track which message is showing reflection options

  // Track which agent is currently active based on messages
  const activeAgent = messages.find(msg => 
    msg.type === 'agent-prompt' && 
    msg.state === MessageState.UNACTIVATED &&
    !((msg as any).accepted)
  )?.agentType || null
  
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
  
  // Filter messages for display (no filtering here, done in state machine)
  const displayMessages = messages
  
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
            {quizResult && (
              <div className="mt-3">
                <QuizResultBox quizResult={quizResult} />
              </div>
            )}
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
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowActivityLog(!showActivityLog)}
            className={cn(
              "h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors",
              showActivityLog && "text-foreground bg-muted"
            )}
            title="View Activity Log"
          >
            <Activity className="h-3.5 w-3.5" />
          </Button>
        </div>

      </div>

      {/* Messages - Scrollable area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {/* Chat Messages */}
          {displayMessages.map(renderMessage)}

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

      {/* Input - Fixed at bottom */}
      <div className="border-t bg-background/95 backdrop-blur-sm p-4 flex-shrink-0">
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
      </div>

      {showActivityLog && (
        <AIActivityLog
          messages={messages}
          isOpen={true}
          onToggle={() => setShowActivityLog(false)}
        />
      )}
    </div>
  )
}

