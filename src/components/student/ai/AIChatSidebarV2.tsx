"use client"

import { useState, useEffect, useRef } from "react"
import { Message, MessageState, ReflectionData } from "@/lib/video-agent-system"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Puzzle, Send, Sparkles, Bot, User, Pause, Lightbulb, CheckCircle2, MessageSquare, Route, Clock, Brain, Zap, Target, Mic, Camera, Video, Upload, Square, Play, Trash2, MicOff, Activity, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { AIActivityLog } from "./AIActivityLog"
import { QuizResultBox } from "./QuizResultBox"

interface AIChatSidebarV2Props {
  messages: Message[]
  isVideoPlaying?: boolean
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
}

export function AIChatSidebarV2({
  messages,
  isVideoPlaying = false,
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
  const [loomUrl, setLoomUrl] = useState('')
  const [showActivityLog, setShowActivityLog] = useState(false)
  
  // Track which agent is currently active based on messages
  const activeAgent = messages.find(msg => 
    msg.type === 'agent-prompt' && 
    msg.state === MessageState.UNACTIVATED &&
    !((msg as any).accepted)
  )?.agentType || null
  const [acceptedAgents, setAcceptedAgents] = useState<Set<string>>(new Set())
  const scrollRef = useRef<HTMLDivElement>(null)
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Add welcome message if no messages
  const displayMessages: Message[] = messages.length === 0 ? [{
    id: "welcome",
    type: "ai" as const,
    state: MessageState.PERMANENT,
    message: "Welcome! This is Alam, I'll use my team of agents to accelerate your learning of this video.",
    timestamp: Date.now()
  }] : messages

  // Scroll to bottom when messages change
  // Clear accepted agents when reflection options appear (means they accepted)
  useEffect(() => {
    const hasReflectionOptions = messages.some(msg => msg.type === 'reflection-options')
    if (hasReflectionOptions) {
      setAcceptedAgents(new Set())
    }
  }, [messages])

  // Pause recording when video plays
  useEffect(() => {
    if (isVideoPlaying && isRecording && !isPaused) {
      // Video started playing while recording - pause the recording
      console.log('[Sidebar] Video playing - pausing voice recording')
      setIsPaused(true)
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
        recordingIntervalRef.current = null
      }
    }
  }, [isVideoPlaying, isRecording, isPaused])

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 100)
  }, [messages])

  const handleSendMessage = () => {
    if (!inputValue.trim()) return
    
    // Build message with segment context if available
    let message = inputValue
    if (segmentContext?.sentToChat && segmentContext.inPoint !== null && segmentContext.outPoint !== null) {
      const contextPrefix = `[Context: Video clip from ${formatRecordingTime(segmentContext.inPoint)} to ${formatRecordingTime(segmentContext.outPoint)}]\n`
      message = contextPrefix + inputValue
      console.log("User message with context:", message)
      
      // Clear segment context after sending
      onClearSegmentContext?.()
    } else {
      console.log("User message:", message)
    }
    
    setInputValue("")
    
    // Show typing indicator
    setIsTyping(true)
    
    // Simulate AI response
    setTimeout(() => {
      setIsTyping(false)
      // Response would be handled by state machine in real implementation
    }, 2000)
  }

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const formatRecordingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getAgentIcon = (agentType?: string) => {
    switch (agentType) {
      case 'hint':
        return <Puzzle className="h-4 w-4" />
      case 'quiz':
        return <Brain className="h-4 w-4" />
      case 'reflect':
        return <Target className="h-4 w-4" />
      case 'path':
        return <Route className="h-4 w-4" />
      default:
        return <Bot className="h-4 w-4" />
    }
  }

  const getAgentConfig = (agentType?: string) => {
    switch (agentType) {
      case 'hint':
        return {
          color: 'from-blue-500 to-cyan-500',
          bgColor: 'bg-gradient-to-br from-blue-500/10 to-cyan-500/10',
          borderColor: 'border-blue-500/20',
          textColor: 'text-blue-700 dark:text-blue-300',
          icon: <Puzzle className="h-5 w-5" />,
          label: 'PuzzleHint',
          description: 'Get hints about key concepts'
        }
      case 'quiz':
        return {
          color: 'from-green-500 to-emerald-500',
          bgColor: 'bg-gradient-to-br from-green-500/10 to-emerald-500/10',
          borderColor: 'border-green-500/20',
          textColor: 'text-green-700 dark:text-green-300',
          icon: <Brain className="h-5 w-5" />,
          label: 'PuzzleCheck',
          description: 'Test your understanding'
        }
      case 'reflect':
        return {
          color: 'from-purple-500 to-yellow-500',
          bgColor: 'bg-gradient-to-br from-purple-500/10 to-yellow-500/10',
          borderColor: 'border-purple-500/20',
          textColor: 'text-purple-700 dark:text-purple-300',
          icon: <Target className="h-5 w-5" />,
          label: 'PuzzleReflect',
          description: 'Reflect on your learning'
        }
      case 'path':
        return {
          color: 'from-indigo-500 to-purple-500',
          bgColor: 'bg-gradient-to-br from-indigo-500/10 to-purple-500/10',
          borderColor: 'border-indigo-500/20',
          textColor: 'text-indigo-700 dark:text-indigo-300',
          icon: <Route className="h-5 w-5" />,
          label: 'PuzzlePath',
          description: 'Get personalized learning paths'
        }
      default:
        return {
          color: 'from-gray-500 to-gray-600',
          bgColor: 'bg-gray-500/10',
          borderColor: 'border-gray-500/20',
          textColor: 'text-gray-700 dark:text-gray-300',
          icon: <Bot className="h-5 w-5" />,
          label: 'AI Assistant',
          description: 'General assistance'
        }
    }
  }

  const renderMessage = (msg: Message) => {
    // System messages - Subtle, consistent design, left-aligned
    if (msg.type === 'system') {
      // Check if this is a timestamp activity message (contains 📍)
      const isActivityMessage = msg.message.includes('📍')
      
      if (isActivityMessage) {
        // Activity messages - slightly more prominent but still subtle
        return (
          <div key={msg.id} className="flex justify-start my-3">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-secondary/60 px-4 py-2 rounded-full border border-border/50">
              <span>{msg.message.replace('📍', '•')}</span>
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

    // Agent prompt messages (unactivated with actions - not yet accepted/rejected) - Enhanced card design
    if (msg.type === 'agent-prompt' && msg.state === MessageState.UNACTIVATED && !(msg as any).accepted) {
      const config = getAgentConfig(msg.agentType)
      return (
        <Card 
          key={msg.id}
          className={cn(
            "mb-4 border-2 overflow-hidden transition-all hover:shadow-lg",
            config.borderColor,
            config.bgColor
          )}
        >
          <div className="p-5">
            <div className="flex items-start gap-4">
              <div className={cn(
                "p-3 rounded-xl bg-gradient-to-br shadow-lg",
                config.color
              )}>
                <div className="text-white">
                  {config.icon}
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn("font-bold text-sm", config.textColor)}>
                    {config.label}
                  </span>
                  <Sparkles className="h-3 w-3 text-yellow-500 animate-pulse" />
                </div>
                <p className="font-medium text-foreground mb-4">{msg.message}</p>
                <div className="flex gap-3">
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!acceptedAgents.has(msg.id)) {
                        setAcceptedAgents(prev => new Set([...prev, msg.id]))
                        onAgentAccept(msg.id)
                      }
                    }}
                    disabled={acceptedAgents.has(msg.id)}
                    className={cn(
                      "bg-gradient-to-r text-white font-medium shadow-md hover:shadow-lg transition-all",
                      config.color,
                      acceptedAgents.has(msg.id) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Zap className="mr-1 h-3 w-3" />
                    {acceptedAgents.has(msg.id) ? "Loading..." : "Yes, let's go!"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onAgentReject(msg.id)}
                    disabled={acceptedAgents.has(msg.id)}
                    className="hover:bg-secondary/50"
                  >
                    Not now
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )
    }

    // Agent prompt messages (activated, rejected, or accepted but still unactivated for reflect) - Enhanced style
    if (msg.type === 'agent-prompt' && (msg.state === MessageState.ACTIVATED || msg.state === MessageState.REJECTED || (msg.state === MessageState.UNACTIVATED && (msg as any).accepted))) {
      const config = getAgentConfig(msg.agentType)
      return (
        <div key={msg.id} className="mb-4">
          <div className={cn(
            "flex items-start gap-3 p-3 rounded-lg",
            msg.state === MessageState.REJECTED ? "opacity-60" : "",
            config.bgColor
          )}>
            <Avatar className="h-10 w-10 border-2 border-background shadow-md">
              <AvatarFallback className={cn("bg-gradient-to-br text-white", config.color)}>
                {getAgentIcon(msg.agentType)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn("text-sm font-bold", config.textColor)}>
                  {config.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatTimestamp(msg.timestamp)}
                </span>
                {msg.state === MessageState.REJECTED && (
                  <span className="text-xs bg-secondary/50 px-2 py-0.5 rounded-full text-muted-foreground">
                    Declined
                  </span>
                )}
              </div>
              <p className="text-sm text-foreground/90">{msg.message}</p>
            </div>
          </div>
        </div>
      )
    }

    // AI messages - Enhanced design with reflection and quiz support
    if (msg.type === 'ai') {
      const reflectionData = (msg as any).reflectionData
      const quizResult = (msg as any).quizResult
      
      return (
        <div key={msg.id} className="mb-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 border-2 border-primary/20 shadow-md">
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70">
                <Bot className="h-5 w-5 text-primary-foreground" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-bold text-primary">AI Assistant</span>
                <span className="text-xs text-muted-foreground">
                  {formatTimestamp(msg.timestamp)}
                </span>
              </div>
              <div className="bg-secondary/30 rounded-lg p-3 border border-border/50">
                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                
                {/* Show quiz results if this is a quiz completion message */}
                {quizResult && (
                  <div className="mt-3">
                    <QuizResultBox quizResult={quizResult} />
                  </div>
                )}
                
                {/* Show voice memo player if this is a voice reflection */}
                {reflectionData?.type === 'voice' && reflectionData.duration && (
                  <div className="mt-3 bg-background/50 rounded-md p-2 border border-border/50">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="p-1.5 h-8 w-8 hover:bg-primary/10"
                      >
                        <Play className="h-4 w-4 text-primary/70" />
                      </Button>
                      <div className="flex-1">
                        <div className="h-1 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full w-0 bg-primary/50" />
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] text-muted-foreground">0:00</span>
                          <span className="text-[10px] font-medium text-muted-foreground">
                            {formatRecordingTime(reflectionData.duration)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 px-2">
                        <Mic className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Voice Memo</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Show screenshot indicator if this is a screenshot reflection */}
                {reflectionData?.type === 'screenshot' && (
                  <div className="mt-3 bg-background/50 rounded-md p-2 border border-border/50">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded bg-secondary">
                        <Camera className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <span className="text-xs text-muted-foreground">Screenshot attached</span>
                    </div>
                  </div>
                )}
                
                {/* Show loom link if this is a loom reflection */}
                {reflectionData?.type === 'loom' && (
                  <div className="mt-3 bg-background/50 rounded-md p-2 border border-border/50">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded bg-secondary">
                        <Video className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <span className="text-xs text-muted-foreground truncate flex-1">
                        Loom video linked
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )
    }

    // User messages - Enhanced style
    if (msg.type === 'user') {
      return (
        <div key={msg.id} className="mb-4 flex items-start gap-3 justify-end">
          <div className="flex-1 max-w-[80%]">
            <div className="flex items-center gap-2 mb-1 justify-end">
              <span className="text-xs text-muted-foreground">
                {formatTimestamp(msg.timestamp)}
              </span>
              <span className="text-sm font-medium">You</span>
            </div>
            <div className="bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg p-3 border border-primary/20">
              <p className="text-sm">{msg.message}</p>
            </div>
          </div>
          <Avatar className="h-10 w-10 border-2 border-background shadow-md">
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600">
              <User className="h-5 w-5 text-white" />
            </AvatarFallback>
          </Avatar>
        </div>
      )
    }

    // Quiz question messages - Compact for sidebar
    if (msg.type === 'quiz-question' && msg.quizData) {
      const { quizData } = msg
      return (
        <div key={msg.id} className="mb-3">
          <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-4 w-4 text-green-600" />
              <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                {msg.message}
              </span>
            </div>
            <p className="text-sm font-medium mb-2">{quizData.question}</p>
            <div className="space-y-1">
              {quizData.options.map((option, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left text-xs p-2 h-auto hover:bg-green-50 dark:hover:bg-green-950/30"
                  onClick={() => onQuizAnswer?.(quizData.id, index)}
                >
                  <span className="mr-2 text-green-600 font-semibold">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  <span className="truncate">{option}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      )
    }

    // Quiz result messages - Now handled in AI messages with quizResult
    // Skip rendering old quiz-result type messages
    if (msg.type === 'quiz-result') {
      return null
    }

    // Reflection options messages
    if (msg.type === 'reflection-options') {
      // Voice recording handlers
      const startRecording = () => {
        // Notify that voice memo was chosen
        onReflectionTypeChosen?.('voice')
        
        setIsRecording(true)
        setIsPaused(false)
        setRecordingTime(0)
        setHasRecording(false)
        
        // Dispatch recording started action
        dispatch?.({ type: 'RECORDING_STARTED', payload: {} })
        
        // Start recording timer
        recordingIntervalRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1)
        }, 1000)
      }

      const pauseRecording = () => {
        setIsPaused(true)
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current)
        }
        // Dispatch recording paused action
        dispatch?.({ type: 'RECORDING_PAUSED', payload: {} })
      }

      const resumeRecording = () => {
        setIsPaused(false)
        recordingIntervalRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1)
        }, 1000)
        // Dispatch recording resumed action
        dispatch?.({ type: 'RECORDING_RESUMED', payload: {} })
      }

      const stopRecording = () => {
        setIsRecording(false)
        setIsPaused(false)
        setHasRecording(true)
        
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current)
        }
        
        // Dispatch recording stopped action
        dispatch?.({ type: 'RECORDING_STOPPED', payload: {} })
        
        // Simulate creating audio blob
        const mockBlob = new Blob(['mock-audio-data'], { type: 'audio/wav' })
        setAudioBlob(mockBlob)
      }

      const deleteRecording = () => {
        setHasRecording(false)
        setRecordingTime(0)
        setAudioBlob(null)
        setIsPlaying(false)
        setPlaybackTime(0)
      }

      const playRecording = () => {
        setIsPlaying(true)
        setPlaybackTime(0)
        
        playbackIntervalRef.current = setInterval(() => {
          setPlaybackTime(prev => {
            if (prev >= recordingTime) {
              setIsPlaying(false)
              if (playbackIntervalRef.current) {
                clearInterval(playbackIntervalRef.current)
              }
              return 0
            }
            return prev + 1
          })
        }, 1000)
      }

      const pausePlayback = () => {
        setIsPlaying(false)
        if (playbackIntervalRef.current) {
          clearInterval(playbackIntervalRef.current)
        }
      }

      const sendRecording = () => {
        if (hasRecording && audioBlob) {
          onReflectionSubmit?.('voice', {
            duration: recordingTime,
            audioUrl: 'data:audio/wav;base64,mock-audio-data'
          })
          // Reset after sending
          deleteRecording()
        }
      }

      const handleScreenshotUpload = () => {
        // Notify that screenshot was chosen
        onReflectionTypeChosen?.('screenshot')
        
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.onchange = (e: any) => {
          const file = e.target.files[0]
          if (file) {
            const reader = new FileReader()
            reader.onload = (e) => {
              onReflectionSubmit?.('screenshot', {
                imageUrl: e.target?.result
              })
            }
            reader.readAsDataURL(file)
          }
        }
        input.click()
      }

      const handleLoomSubmit = () => {
        if (loomUrl.trim()) {
          onReflectionSubmit?.('loom', {
            loomUrl: loomUrl.trim()
          })
        }
      }

      return (
        <div key={msg.id} className="mb-3">
          <div className="space-y-2">
            {/* Voice Memo Option - Enhanced Messenger Style */}
            <Card className="border-blue-200 dark:border-blue-800 overflow-hidden">
              <div className="p-3">
                {!isRecording && !hasRecording ? (
                  // Initial state - Start recording
                  <button
                    onClick={startRecording}
                    className="w-full flex items-center gap-3 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg p-2 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/30">
                      <Mic className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-medium text-sm">Voice Memo</p>
                      <p className="text-xs text-muted-foreground">Tap to record audio reflection</p>
                    </div>
                  </button>
                ) : isRecording ? (
                  // Recording state - minimalist
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="p-2 rounded-lg bg-red-100 dark:bg-red-950/30">
                          <Mic className={cn(
                            "h-5 w-5",
                            isPaused ? "text-red-400" : "text-red-600"
                          )} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {!isPaused && (
                              <div className="relative">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                                <div className="absolute top-0 left-0 w-2 h-2 bg-red-600 rounded-full"></div>
                              </div>
                            )}
                            <span className={cn(
                              "text-sm font-medium",
                              isPaused ? "text-red-400" : "text-red-600"
                            )}>
                              {isPaused ? 'Recording paused' : 'Recording'}
                            </span>
                            <span className="text-sm font-mono text-muted-foreground">{formatRecordingTime(recordingTime)}</span>
                            {isPaused && isVideoPlaying && (
                              <span className="text-xs text-amber-600 dark:text-amber-500">(Video playing)</span>
                            )}
                          </div>
                          {/* Minimalist waveform */}
                          <div className="flex items-center gap-0.5 h-4 mt-1">
                            {[...Array(20)].map((_, i) => (
                              <div
                                key={i}
                                className="w-0.5 bg-muted-foreground/30 rounded-full"
                                style={{
                                  height: `${20 + Math.random() * 60}%`,
                                  animationDelay: `${i * 50}ms`,
                                  animation: isPaused ? 'none' : 'pulse 1.5s ease-in-out infinite'
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Recording controls - minimalist */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={stopRecording}
                        className="flex-1"
                      >
                        <Square className="h-3 w-3 mr-1" />
                        Stop
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={isPaused ? resumeRecording : pauseRecording}
                        className="hover:bg-secondary"
                      >
                        {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Has recording - Playback state - minimalist
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="p-2 hover:bg-secondary"
                        onClick={isPlaying ? pausePlayback : playRecording}
                      >
                        {isPlaying ? (
                          <Pause className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Play className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground">
                            {formatRecordingTime(isPlaying ? playbackTime : 0)}
                          </span>
                          <span className="text-xs text-muted-foreground">/</span>
                          <span className="text-xs text-muted-foreground">
                            {formatRecordingTime(recordingTime)}
                          </span>
                        </div>
                        {/* Progress bar - minimalist */}
                        <div className="h-1 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-muted-foreground/50 transition-all duration-300"
                            style={{ 
                              width: `${isPlaying ? (playbackTime / recordingTime) * 100 : 0}%` 
                            }}
                          />
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="p-2 hover:bg-secondary"
                        onClick={deleteRecording}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                    {/* Send button - minimalist */}
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full"
                      onClick={sendRecording}
                    >
                      <Send className="h-3 w-3 mr-2" />
                      Send Voice Memo
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            {/* Screenshot Upload Option */}
            <Card className="p-3 hover:shadow-md transition-shadow cursor-pointer border-green-200 dark:border-green-800">
              <button
                onClick={handleScreenshotUpload}
                className="w-full flex items-center gap-3"
              >
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-950/30">
                  <Camera className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-medium text-sm">Screenshot</p>
                  <p className="text-xs text-muted-foreground">Upload a screenshot or diagram</p>
                </div>
              </button>
            </Card>

            {/* Loom Video Option */}
            <Card className="p-3 border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950/30">
                  <Video className="h-5 w-5 text-purple-600" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-medium text-sm">Loom Video</p>
                  <p className="text-xs text-muted-foreground">Share a Loom recording link</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Paste Loom URL..."
                  value={loomUrl}
                  onChange={(e) => {
                    setLoomUrl(e.target.value)
                    // Notify that loom was chosen when they start typing
                    if (e.target.value && !loomUrl) {
                      onReflectionTypeChosen?.('loom')
                    }
                  }}
                  className="flex-1 text-xs h-8"
                />
                <Button
                  size="sm"
                  onClick={handleLoomSubmit}
                  disabled={!loomUrl.trim()}
                  className="h-8 px-3"
                >
                  <Upload className="h-3 w-3" />
                </Button>
              </div>
            </Card>
            
            {/* Cancel button */}
            {(isRecording || hasRecording || loomUrl) && (
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    // Reset all states
                    setIsRecording(false)
                    setHasRecording(false)
                    setRecordingTime(0)
                    setAudioBlob(null)
                    setLoomUrl('')
                    setIsPaused(false)
                    if (recordingIntervalRef.current) {
                      clearInterval(recordingIntervalRef.current)
                    }
                    // Call cancel handler
                    onReflectionCancel?.()
                  }}
                  className="w-full hover:bg-destructive/10 hover:text-destructive"
                >
                  Cancel Reflection
                </Button>
              </div>
            )}
          </div>
        </div>
      )
    }

    // Reflection complete messages are now handled by AI messages with reflectionData
    // This section can be removed as it's no longer used

    return null
  }

  return (
    <div className="relative flex flex-col h-full bg-gradient-to-b from-background to-secondary/5">
      {/* Header - Enhanced design */}
      <div className="border-b bg-background/95 backdrop-blur-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary/70 shadow-md">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-bold text-lg">AI Learning Assistant</h3>
              <p className="text-xs text-muted-foreground">Powered by 4 specialized agents</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowActivityLog(!showActivityLog)}
            className={cn(
              "p-2 hover:bg-secondary",
              showActivityLog && "bg-secondary"
            )}
          >
            <Activity className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Agent Buttons - Single row optimized */}
        <div className="flex gap-1 w-full">
          {[
            { type: 'hint', icon: Puzzle, label: 'Hint', color: 'hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-cyan-500/10 hover:border-blue-500/50', activeColor: 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-500' },
            { type: 'quiz', icon: Brain, label: 'Quiz', color: 'hover:bg-gradient-to-r hover:from-green-500/10 hover:to-emerald-500/10 hover:border-green-500/50', activeColor: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500' },
            { type: 'reflect', icon: Target, label: 'Reflect', color: 'hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-yellow-500/10 hover:border-purple-500/50', activeColor: 'bg-gradient-to-r from-purple-500/20 to-yellow-500/20 border-purple-500' },
            { type: 'path', icon: Route, label: 'Path', color: 'hover:bg-gradient-to-r hover:from-indigo-500/10 hover:to-purple-500/10 hover:border-indigo-500/50', activeColor: 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border-indigo-500' }
          ].map(({ type, icon: Icon, label, color, activeColor }) => {
            const isActive = activeAgent === type
            return (
              <Button
                key={type}
                size="sm"
                variant="outline"
                className={cn(
                  "flex-1 flex-col justify-center items-center h-14 py-2 transition-all border-2",
                  isActive ? activeColor : color
                )}
                onClick={() => onAgentRequest(type)}
                disabled={isActive}
              >
                <Icon className={cn("h-4 w-4", isActive && "text-primary")} />
                <span className={cn("text-xs font-medium", isActive && "text-primary")}>{label}</span>
              </Button>
            )
          })}
        </div>
      </div>

      {/* Messages - With gradient background */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          {/* Chat Messages */}
          {displayMessages.map(renderMessage)}
          
          {isTyping && (
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10 border-2 border-primary/20 shadow-md">
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70">
                  <Bot className="h-5 w-5 text-primary-foreground" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-secondary/30 rounded-lg px-4 py-3 border border-border/50">
                <div className="flex gap-1">
                  <span className="inline-block w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                  <span className="inline-block w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                  <span className="inline-block w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input - Enhanced design */}
      <div className="border-t bg-background/95 backdrop-blur-sm p-4">
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
            placeholder={segmentContext?.sentToChat ? "Ask about this video segment..." : "Ask about the video content..."}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 border-2 focus:border-primary/50 transition-colors"
          />
          <Button
            size="icon"
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          Use agent buttons above for guided learning experiences
        </p>
      </div>
      
      {/* Activity Log Overlay - Renders outside the main flow */}
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