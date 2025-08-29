"use client"

import { useState, useEffect, useRef } from "react"
import { Message, MessageState, ReflectionData } from "@/lib/video-agent-system"
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
  
  // Voice recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  
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
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop any recording and clean up streams
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current)
      }
    }
  }, [])
  
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
      case 'hint':
        return {
          icon: Lightbulb,
          title: 'PuzzleHint',
          color: 'from-blue-500/20 to-cyan-500/20',
          borderColor: 'border-blue-500',
          buttonColor: 'bg-blue-500 hover:bg-blue-600',
          iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-500'
        }
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
      case 'path':
        return {
          icon: Target,
          title: 'PuzzlePath',
          color: 'from-orange-500/20 to-amber-500/20',
          borderColor: 'border-orange-500',
          buttonColor: 'bg-orange-500 hover:bg-orange-600',
          iconBg: 'bg-gradient-to-br from-orange-500 to-amber-500'
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
            "my-4 overflow-hidden shadow-lg",
            `bg-gradient-to-br ${config.color}`,
            `border-2 ${config.borderColor}`
          )}
        >
          <div className="p-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10 border-2 border-white/20 shadow-md">
                <AvatarFallback className={config.iconBg}>
                  <config.icon className="h-5 w-5 text-white" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-sm">{config.title}</span>
                  <span className="text-xs text-muted-foreground">AI Assistant</span>
                </div>
                <p className="text-sm mb-4">{msg.message}</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className={cn("text-white shadow-md", config.buttonColor)}
                    onClick={() => onAgentAccept(msg.id)}
                  >
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    Let&apos;s go
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="hover:bg-white/20"
                    onClick={() => onAgentReject(msg.id)}
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
    
    // Activated/Rejected agent prompts (show without buttons) - Minimalist design
    if (msg.type === 'agent-prompt' && (msg.state === MessageState.ACTIVATED || msg.state === MessageState.REJECTED || (msg as any).accepted)) {
      const config = getAgentConfig(msg.agentType)
      const isRejected = msg.state === MessageState.REJECTED
      
      return (
        <div key={msg.id} className="flex items-start gap-3 my-4">
          <Avatar className={cn(
            "h-10 w-10 border-2 shadow-md",
            isRejected ? "opacity-50 border-gray-300" : "border-primary/20"
          )}>
            <AvatarFallback className={cn(
              isRejected ? "bg-gray-400" : config.iconBg
            )}>
              <config.icon className="h-5 w-5 text-white" />
            </AvatarFallback>
          </Avatar>
          <div className={cn(
            "flex-1 bg-secondary/30 rounded-lg px-4 py-3 border",
            isRejected ? "opacity-60 border-gray-300" : "border-border/50"
          )}>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm">{config.title}</span>
              {isRejected && (
                <span className="text-xs text-muted-foreground">(Skipped)</span>
              )}
            </div>
            <p className="text-sm">{msg.message}</p>
          </div>
        </div>
      )
    }
    
    // Loading state for AI messages - Skeleton loader
    if (msg.type === 'ai-loading') {
      return (
        <div key={msg.id} className="flex items-start gap-3 my-4">
          <Avatar className="h-10 w-10 border-2 border-primary/20 shadow-md">
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 animate-pulse">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 bg-gradient-to-br from-secondary/50 to-secondary/30 rounded-lg px-4 py-3 border border-border/50">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <div className="space-y-2">
                <div className="h-2 bg-muted rounded animate-pulse w-3/4"></div>
                <div className="h-2 bg-muted rounded animate-pulse w-1/2"></div>
                <div className="h-2 bg-muted rounded animate-pulse w-2/3"></div>
              </div>
            </div>
          </div>
        </div>
      )
    }
    
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

    // Reflection options messages
    if (msg.type === 'reflection-options') {
      // Voice recording handlers
      const startRecording = async () => {
        try {
          // Request microphone access
          const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              sampleRate: 44100
            } 
          })
          
          streamRef.current = stream
          audioChunksRef.current = []
          
          // Create MediaRecorder
          const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
          })
          
          mediaRecorderRef.current = mediaRecorder
          
          // Handle data available
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              audioChunksRef.current.push(event.data)
            }
          }
          
          // Handle recording stop
          mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
            setAudioBlob(audioBlob)
            setHasRecording(true)
            
            // Clean up stream
            if (streamRef.current) {
              streamRef.current.getTracks().forEach(track => track.stop())
              streamRef.current = null
            }
          }
          
          // Start recording
          mediaRecorder.start(100) // Collect data every 100ms
          
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
          
        } catch (error) {
          console.error('Error starting recording:', error)
          alert('Could not access microphone. Please check your permissions.')
        }
      }

      const pauseRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.pause()
        }
        
        setIsPaused(true)
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current)
        }
        // Dispatch recording paused action
        dispatch?.({ type: 'RECORDING_PAUSED', payload: {} })
      }

      const resumeRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
          mediaRecorderRef.current.resume()
        }
        
        setIsPaused(false)
        recordingIntervalRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1)
        }, 1000)
        // Dispatch recording resumed action
        dispatch?.({ type: 'RECORDING_RESUMED', payload: {} })
      }

      const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop()
        }
        
        setIsRecording(false)
        setIsPaused(false)
        
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current)
        }
        
        // Dispatch recording stopped action
        dispatch?.({ type: 'RECORDING_STOPPED', payload: {} })
        
        // Audio blob will be set in mediaRecorder.onstop callback
      }

      const deleteRecording = () => {
        setHasRecording(false)
        setRecordingTime(0)
        setAudioBlob(null)
      }

      const startPlayback = () => {
        setIsPlaying(true)
        setPlaybackTime(0)
        
        playbackIntervalRef.current = setInterval(() => {
          setPlaybackTime(prev => {
            if (prev >= recordingTime) {
              stopPlayback()
              return recordingTime
            }
            return prev + 1
          })
        }, 1000)
      }

      const stopPlayback = () => {
        setIsPlaying(false)
        if (playbackIntervalRef.current) {
          clearInterval(playbackIntervalRef.current)
        }
      }

      const submitRecording = () => {
        if (audioBlob) {
          // Create reflection data
          const reflectionData: ReflectionData = {
            type: 'voice',
            content: URL.createObjectURL(audioBlob),
            duration: recordingTime,
            videoTimestamp: 0 // You might want to get this from video state
          }
          
          onReflectionSubmit?.('voice', reflectionData)
          
          // Reset all states
          setIsRecording(false)
          setHasRecording(false)
          setRecordingTime(0)
          setAudioBlob(null)
        }
      }

      return (
        <Card key={msg.id} className="my-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-2 border-purple-500/50">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-5 w-5 text-purple-600" />
              <span className="font-bold text-sm">Choose Your Reflection Method</span>
            </div>
            
            <div className="space-y-3">
              {/* Voice Memo Option */}
              <div className="space-y-2">
                {!isRecording && !hasRecording ? (
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
                        <div className="relative p-2 rounded-lg bg-red-100 dark:bg-red-950/30">
                          <Mic className={cn(
                            "h-5 w-5",
                            isPaused ? "text-red-400" : "text-red-600"
                          )} />
                          {!isPaused && (
                            <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></div>
                          )}
                          {!isPaused && (
                            <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-600 rounded-full"></div>
                          )}
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
                    <div className="flex gap-2">
                      {!isPaused ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={pauseRecording}
                          className="flex-1"
                        >
                          <Pause className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={resumeRecording}
                          className="flex-1"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={stopRecording}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                      >
                        <Square className="h-4 w-4 mr-1" />
                        Stop
                      </Button>
                    </div>
                  </div>
                ) : hasRecording ? (
                  // Playback state - minimalist
                  <div className="space-y-3">
                    <div className="bg-secondary/50 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/30">
                          {isPlaying ? (
                            <MicOff className="h-5 w-5 text-blue-600 animate-pulse" />
                          ) : (
                            <Mic className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Voice Memo Ready</p>
                          <p className="text-xs text-muted-foreground">
                            {isPlaying 
                              ? `Playing ${formatRecordingTime(playbackTime)} / ${formatRecordingTime(recordingTime)}`
                              : `Duration: ${formatRecordingTime(recordingTime)}`
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* Playback controls */}
                    <div className="flex gap-2">
                      {!isPlaying ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={startPlayback}
                          className="flex-1"
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Play
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={stopPlayback}
                          className="flex-1"
                        >
                          <Square className="h-4 w-4 mr-1" />
                          Stop
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={deleteRecording}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={submitRecording}
                        className="flex-1 bg-purple-500 hover:bg-purple-600 text-white"
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Submit
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Screenshot Option */}
              {!isRecording && !hasRecording && (
                <>
                  <button
                    onClick={() => {
                      onReflectionTypeChosen?.('screenshot')
                      console.log('Screenshot reflection chosen')
                    }}
                    className="w-full flex items-center gap-3 hover:bg-green-50 dark:hover:bg-green-950/30 rounded-lg p-2 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-950/30">
                      <Camera className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-medium text-sm">Screenshot</p>
                      <p className="text-xs text-muted-foreground">Capture screen with annotations</p>
                    </div>
                  </button>

                  {/* Loom Option */}
                  <button
                    onClick={() => {
                      onReflectionTypeChosen?.('loom')
                      console.log('Loom reflection chosen')
                    }}
                    className="w-full flex items-center gap-3 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-lg p-2 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950/30">
                      <Video className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-medium text-sm">Loom Video</p>
                      <p className="text-xs text-muted-foreground">Record screen & camera</p>
                    </div>
                  </button>
                </>
              )}

              {/* Cancel button - always visible */}
              {(isRecording || hasRecording) && (
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
              )}
            </div>
          </div>
        </Card>
      )
    }

    // Reflection complete messages are now handled by AI messages with reflectionData
    // This section can be removed as it's no longer used

    return null
  }

  return (
    <div className="relative flex flex-col h-full bg-gradient-to-b from-background to-secondary/5">
      {/* Header - Fixed at top */}
      <div className="border-b bg-background/95 backdrop-blur-sm p-4 flex-shrink-0">
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
            { type: 'quiz', icon: Brain, label: 'Quiz', color: 'hover:bg-gradient-to-r hover:from-emerald-500/10 hover:to-green-500/10 hover:border-emerald-500/50', activeColor: 'bg-gradient-to-r from-emerald-500/20 to-green-500/20 border-emerald-500' },
            { type: 'reflect', icon: Zap, label: 'Reflect', color: 'hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-pink-500/10 hover:border-purple-500/50', activeColor: 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500' },
            { type: 'path', icon: Target, label: 'Path', color: 'hover:bg-gradient-to-r hover:from-orange-500/10 hover:to-amber-500/10 hover:border-orange-500/50', activeColor: 'bg-gradient-to-r from-orange-500/20 to-amber-500/20 border-orange-500' }
          ].map(({ type, icon: Icon, label, color, activeColor }) => (
            <Button
              key={type}
              size="sm"
              variant="outline"
              onClick={() => onAgentRequest(type)}
              className={cn(
                "flex-1 h-9 px-2 transition-all duration-200 border-2",
                activeAgent === type ? activeColor : color
              )}
            >
              <Icon className="h-3.5 w-3.5 mr-1" />
              <span className="text-xs font-medium">{label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Messages - Scrollable area */}
      <div className="flex-1 overflow-y-auto p-4">
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