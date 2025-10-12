'use client'

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Send, User, Bot, Sparkles, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Message, MessageState } from "@/lib/video-agent-system"
import { useTranscriptQuery } from "@/hooks/use-transcript-queries"
import { useVideoSummary } from "@/hooks/use-video-summary"
import { UnpuzzlingAnimation } from "@/components/ui/UnpuzzlingAnimation"
import { useInfiniteAIConversations } from "@/hooks/use-ai-conversations-query"
import { useVirtualizer } from "@tanstack/react-virtual"

interface ChatInterfaceProps {
  messages: Message[]
  videoId: string | null
  courseId: string | null
  currentTime: number
  onSendMessage?: (message: string) => void
  onAddMessage?: (message: Message) => void
  onAddOrUpdateMessage?: (message: Message) => void
  onLoadInitialMessages?: (messages: Message[]) => void
  segmentContext?: {
    inPoint: number | null
    outPoint: number | null
    isComplete: boolean
    sentToChat: boolean
    transcriptText?: string  // Pre-extracted transcript text from StateMachine
  }
  onClearSegmentContext?: () => void
  onUpdateSegmentContext?: (inPoint: number, outPoint: number) => void
}

export function ChatInterface({
  messages,
  videoId,
  courseId,
  currentTime: videoCurrentTime,
  onSendMessage,
  onAddMessage,
  onAddOrUpdateMessage,
  onLoadInitialMessages,
  segmentContext,
  onClearSegmentContext,
  onUpdateSegmentContext
}: ChatInterfaceProps) {
  const [input, setInput] = useState('')
  const [hasUpdatedSegment, setHasUpdatedSegment] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasStartedResponse, setHasStartedResponse] = useState(false)
  const [timestampRefreshTick, setTimestampRefreshTick] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Update timestamp refresh tick every 5 seconds to refresh "Just now" → "less than a minute ago" etc.
  // Also update when isGenerating changes to immediately show/hide "Just now"
  useEffect(() => {
    const interval = setInterval(() => {
      setTimestampRefreshTick(prev => prev + 1)
    }, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [])

  // Force re-render when isGenerating changes to update timestamp display
  useEffect(() => {
    setTimestampRefreshTick(prev => prev + 1)
  }, [isGenerating])

  // Get transcript data for this video
  const { data: transcriptData } = useTranscriptQuery(videoId || '')

  // Get video summary for AI context
  const { data: videoSummary } = useVideoSummary(videoId)

  // PERFORMANCE P0: Get conversation history with infinite query (pagination)
  const {
    data: conversationsData,
    isLoading: isLoadingConversations,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteAIConversations(videoId || '', 20)

  // Convert database conversations to Message format and merge with current messages
  // Use a ref to track if we've already loaded the initial conversations
  const hasLoadedConversations = useRef(false)

  useEffect(() => {
    if (conversationsData?.pages && !hasLoadedConversations.current) {
      // Flatten all pages of conversations
      const dbConversations = conversationsData.pages.flatMap(page => page.conversations)

      // Convert each conversation to two messages (user + AI)
      const dbMessages: Message[] = []
      dbConversations.forEach((conv) => {
        // User message
        dbMessages.push({
          id: `db_user_${conv.id}`,
          type: 'user',
          state: MessageState.PERMANENT,
          message: conv.user_message,
          timestamp: new Date(conv.created_at).getTime(),
          contextData: conv.conversation_context ? {
            transcript: conv.conversation_context,
            startTime: conv.video_timestamp || 0,
            endTime: conv.video_timestamp || 0
          } : undefined,
          metadata: {
            conversationId: conv.id
          }
        })

        // AI response
        dbMessages.push({
          id: `db_ai_${conv.id}`,
          type: 'ai',
          state: MessageState.PERMANENT,
          message: conv.ai_response,
          timestamp: new Date(conv.created_at).getTime() + 1,
          metadata: {
            conversationId: conv.id
          }
        })
      })

      // Only add messages that don't already exist
      const existingIds = new Set(messages.map(m => m.id))
      const newMessages = dbMessages.filter(m => !existingIds.has(m.id))

      if (newMessages.length > 0) {
        // Use loadInitialMessages for batch loading (prevents multiple re-renders)
        if (onLoadInitialMessages) {
          onLoadInitialMessages(newMessages)
        } else if (onAddMessage) {
          // Fallback to old method if loadInitialMessages not available
          newMessages.forEach(msg => onAddMessage(msg))
        }
      }

      hasLoadedConversations.current = true
    }
    // Note: Intentionally NOT including 'messages' in dependencies to avoid re-trigger after loading
    // The hasLoadedConversations ref already guards against duplicate loads
  }, [conversationsData, onAddMessage, onLoadInitialMessages, videoId])

  // Reset the flag when videoId changes
  useEffect(() => {
    hasLoadedConversations.current = false
  }, [videoId])

  // No threading - just show messages in chronological order
  const chatMessages = messages

  // Auto-scroll to bottom when new messages arrive or when AI completes
  // ALWAYS scroll when user sends a message or when AI is generating
  useEffect(() => {
    if (scrollRef.current) {
      const lastMessage = messages[messages.length - 1]
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100

      // Always scroll if:
      // 1. Last message is from user (you just sent it)
      // 2. AI is currently generating (streaming) - keep following the text
      // 3. Near bottom for historical messages (to avoid interrupting reading old messages)
      if (lastMessage?.type === 'user' || isGenerating || isNearBottom) {
        // Use setTimeout to ensure DOM is updated after message is added
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
          }
        }, 0)
      }
    }
  }, [messages, isGenerating])

  // PERFORMANCE FIX: Scroll to bottom on initial load when conversations are loaded
  useEffect(() => {
    if (scrollRef.current && conversationsData?.pages && !isLoadingConversations) {
      // Small delay to ensure DOM is rendered
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
      }, 100)
    }
  }, [conversationsData?.pages, isLoadingConversations])

  // Update video player in/out points when segment context changes and transcript chunks extend the range
  useEffect(() => {
    if (
      segmentContext?.sentToChat &&
      segmentContext.inPoint !== null &&
      segmentContext.outPoint !== null &&
      onUpdateSegmentContext &&
      !hasUpdatedSegment
    ) {
      const transcriptData = getTranscriptDataBetween(segmentContext.inPoint, segmentContext.outPoint)

      // Only update if the actual boundaries are different from current selection
      if (
        transcriptData.actualStart !== segmentContext.inPoint ||
        transcriptData.actualEnd !== segmentContext.outPoint
      ) {
        onUpdateSegmentContext(transcriptData.actualStart, transcriptData.actualEnd)
        setHasUpdatedSegment(true)
      }
    }
  }, [segmentContext?.sentToChat, segmentContext?.inPoint, segmentContext?.outPoint, onUpdateSegmentContext, hasUpdatedSegment])

  // Reset the flag when segment is cleared or new segment is created
  useEffect(() => {
    if (!segmentContext?.sentToChat) {
      setHasUpdatedSegment(false)
    }
  }, [segmentContext?.sentToChat])

  // Format time for display
  const formatRecordingTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Get transcript text and actual boundaries between two timestamps
  const getTranscriptDataBetween = (startTime: number, endTime: number): { text: string; actualStart: number; actualEnd: number } => {
    // If we have pre-extracted transcript text from StateMachine, use it
    if (segmentContext?.transcriptText) {
      return {
        text: segmentContext.transcriptText,
        actualStart: startTime,
        actualEnd: endTime
      }
    }

    // Fallback to extracting from transcript segments (existing logic)
    if (!transcriptData?.hasTranscript || !transcriptData.transcript?.segments) {
      return { text: '', actualStart: startTime, actualEnd: endTime }
    }

    let segments = transcriptData.transcript.segments

    // Handle nested segments structure (segments.segments)
    if (!Array.isArray(segments) && segments.segments && Array.isArray(segments.segments)) {
      segments = segments.segments
    }

    // Ensure we have an array
    if (!Array.isArray(segments)) {
      return { text: '', actualStart: startTime, actualEnd: endTime }
    }

    const relevantSegments = segments.filter((segment: any) =>
      segment &&
      typeof segment.start === 'number' &&
      typeof segment.end === 'number' &&
      typeof segment.text === 'string' &&
      (
        (segment.start >= startTime && segment.start <= endTime) ||
        (segment.end >= startTime && segment.end <= endTime) ||
        (segment.start <= startTime && segment.end >= endTime)
      )
    )

    if (relevantSegments.length === 0) {
      return { text: '', actualStart: startTime, actualEnd: endTime }
    }

    // Get actual chunk boundaries
    const actualStart = Math.min(...relevantSegments.map((segment: any) => segment.start))
    const actualEnd = Math.max(...relevantSegments.map((segment: any) => segment.end))
    const text = relevantSegments.map((segment: any) => segment.text).join(' ').trim()

    return { text, actualStart, actualEnd }
  }

  const handleSendMessage = useCallback(async () => {
    if (!input.trim() || isGenerating || !videoId || !onAddMessage || !onAddOrUpdateMessage) return

    const userMessage = input.trim()
    setInput('')
    setIsGenerating(true)
    setHasStartedResponse(false)

    // Get selected transcript context if available
    const selectedTranscript = segmentContext?.sentToChat && segmentContext.inPoint !== null && segmentContext.outPoint !== null
      ? getTranscriptDataBetween(segmentContext.inPoint, segmentContext.outPoint)
      : null

    // Add user message with context metadata (like Cursor AI)
    const userMsg: Message = {
      id: `user_${Date.now()}`,
      type: 'user',
      state: MessageState.PERMANENT,
      message: userMessage,
      timestamp: Date.now(),
      // Add context as metadata for custom rendering
      contextData: selectedTranscript ? {
        transcript: selectedTranscript.text,
        startTime: selectedTranscript.actualStart,
        endTime: selectedTranscript.actualEnd
      } : undefined
    }
    onAddMessage(userMsg)

    // Clear the segment context from input area (like Cursor AI)
    if (selectedTranscript?.text && onClearSegmentContext) {
      onClearSegmentContext()
    }

    // Prepare context for AI (selectedTranscript already defined above)

    const chatHistory = messages.filter(msg =>
      msg.type === 'user' || (msg.type === 'ai' && msg.state === MessageState.PERMANENT)
    ).slice(-6) // Last 6 messages for context

    try {
      // PERFORMANCE P1: Optimistic update - Start API call immediately without artificial delay
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          userMessage,
          videoSummary: videoSummary,
          selectedTranscript: selectedTranscript ? {
            text: selectedTranscript.text,
            startTime: selectedTranscript.actualStart,
            endTime: selectedTranscript.actualEnd
          } : null,
          chatHistory: chatHistory.map(msg => ({
            type: msg.type,
            message: msg.message,
            timestamp: msg.timestamp
          })),
          currentTimestamp: videoCurrentTime
        })
      })

      if (!response.ok) throw new Error('Failed to get AI response')

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      let aiMessageId = `ai_${Date.now()}`
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'chunk') {
                fullContent = data.fullContent

                // Only create/update AI message if we have actual content
                if (fullContent && fullContent.trim().length > 0) {
                  // PERFORMANCE P1: Show first chunk immediately to hide loading animation
                  if (!hasStartedResponse) {
                    setHasStartedResponse(true)
                  }

                  // PERFORMANCE P1: Optimistic update - Update or create AI message immediately
                  const aiMsg: Message = {
                    id: aiMessageId,
                    type: 'ai',
                    state: MessageState.PERMANENT,
                    message: fullContent,
                    timestamp: Date.now()
                  }
                  onAddOrUpdateMessage(aiMsg)

                  // No delay - fast response is preferred
                }
              } else if (data.type === 'complete') {
                // Final message is already handled by chunks
                break
              } else if (data.type === 'error') {
                throw new Error(data.error)
              }
            } catch (e) {
              // Skip malformed JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      const errorMsg: Message = {
        id: `error_${Date.now()}`,
        type: 'ai',
        state: MessageState.PERMANENT,
        message: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now()
      }
      onAddMessage(errorMsg)
    } finally {
      setIsGenerating(false)
      setHasStartedResponse(false)
    }
  }, [input, isGenerating, videoId, onAddMessage, segmentContext, videoCurrentTime, messages])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTimeAgo = (timestamp: number, isLastUserMessage: boolean = false) => {
    // Don't show "Just now" for the last user message while AI is generating
    // Show actual time instead, then switch to time-based display when AI completes
    if (isLastUserMessage && isGenerating) {
      // Show actual time while AI is generating
      const date = new Date(timestamp)
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }

    // Calculate time difference
    const now = Date.now()
    const diff = now - timestamp
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(diff / 60000)

    // Progressive time display (only after AI completes for last user message)
    if (seconds < 5) {
      return 'Just now'
    } else if (seconds < 60) {
      return 'less than a minute ago'
    } else if (minutes < 5) {
      return `${minutes} min ago`
    } else {
      // Show actual time for 5+ minutes
      const date = new Date(timestamp)
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-3 p-4"
      >
        {isLoadingConversations ? (
          // Loading skeleton while conversations load
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                {/* User message skeleton */}
                <div className="flex justify-end gap-3">
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-lg px-3 py-2 max-w-[80%] animate-pulse">
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-48 mb-2"></div>
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 animate-pulse"></div>
                </div>
                {/* AI message skeleton */}
                <div className="flex justify-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 animate-pulse"></div>
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-lg px-3 py-2 max-w-[80%] animate-pulse">
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-64 mb-2"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-56 mb-2"></div>
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : chatMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="h-8 w-8 text-muted-foreground mb-2" />
            <div className="text-sm text-muted-foreground">
              Start a conversation with your AI learning assistant
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Ask questions about the course content or get help
            </div>
          </div>
        ) : (
          <>
            {/* PERFORMANCE P0: Load More button for pagination */}
            {hasNextPage && (
              <div className="flex justify-center mb-4">
                <Button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  {isFetchingNextPage ? 'Loading...' : 'Load older messages'}
                </Button>
              </div>
            )}

            {/* Render messages normally without virtual scrolling */}
            {chatMessages.map((msg, index) => {
              // Check if this is the last user message
              const lastUserMessageIndex = chatMessages.map((m, i) => ({ type: m.type, index: i }))
                .filter(m => m.type === 'user')
                .pop()?.index
              const isLastUserMessage = msg.type === 'user' && index === lastUserMessageIndex

              return (
                <div key={msg.id} className="space-y-2">
                  {/* Context Area (if user message has context) */}
                  {msg.type === 'user' && msg.contextData && (
                    <div className="flex justify-end">
                      <div className="max-w-[80%] bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                        <div className="text-xs text-muted-foreground mb-1">
                          Video context {formatRecordingTime(msg.contextData.startTime)}-{formatRecordingTime(msg.contextData.endTime)}
                        </div>
                        <div className="text-sm italic text-gray-700 dark:text-gray-300">
                          {msg.contextData.transcript}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Message Content */}
                  <div
                    className={cn(
                      "flex gap-3",
                      msg.type === 'user' ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-3 py-2",
                        msg.type === 'user'
                          ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700"
                          : msg.type === 'ai'
                          ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          : "bg-orange-50 dark:bg-orange-900/20 text-orange-900 dark:text-orange-100 border border-orange-200 dark:border-orange-800"
                      )}
                    >
                      <div className="text-sm whitespace-pre-wrap">
                        {msg.message}
                      </div>
                      {/* Don't show timestamp for AI messages while generating */}
                      {!(msg.type === 'ai' && isGenerating) && (
                        <div className="text-xs opacity-70 mt-1">
                          {formatTimeAgo(msg.timestamp, isLastUserMessage)}
                        </div>
                      )}
                    </div>

                    {/* Avatar */}
                    <div className={cn(
                      "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                      msg.type === 'user'
                        ? "bg-gray-400 dark:bg-gray-600 text-white order-first"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                    )}>
                      {msg.type === 'user' ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </>
        )}

        {/* Loading animation - only show before response starts */}
        {isGenerating && !hasStartedResponse && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg px-3 py-2 bg-gray-100 dark:bg-gray-800">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"
                      style={{
                        animationDelay: `${i * 200}ms`,
                        animationDuration: '1s'
                      }}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">Unpuzzling...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Segment Context - Above Input */}
      {segmentContext?.sentToChat && segmentContext.inPoint !== null && segmentContext.outPoint !== null && (
        <div className="border-t border-b bg-secondary/50 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              {(() => {
                const transcriptData = getTranscriptDataBetween(segmentContext.inPoint, segmentContext.outPoint)
                return (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1 h-4 bg-gradient-to-b from-green-500 to-red-500 rounded-full" />
                      <span className="text-xs text-muted-foreground">Video clip:</span>
                      <span className="text-xs font-medium">
                        {formatRecordingTime(transcriptData.actualStart)} - {formatRecordingTime(transcriptData.actualEnd)}
                      </span>
                    </div>
                    {transcriptData.text && (
                      <div className="text-xs text-foreground bg-background/50 rounded p-2 border">
                        <span className="text-muted-foreground">Transcript: </span>
                        <span className="italic">"{transcriptData.text}"</span>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={onClearSegmentContext}
              className="h-6 w-6 p-0 hover:bg-secondary flex-shrink-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Chat Input - At Bottom */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about the course content..."
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!input.trim() || isGenerating}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          {isGenerating ? 'AI is thinking...' : 'AI-powered learning assistant'}
        </div>
      </div>
    </div>
  )
}