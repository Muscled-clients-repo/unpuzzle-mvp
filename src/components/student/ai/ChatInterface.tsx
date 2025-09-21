'use client'

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Send, User, Bot, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { Message, MessageState } from "@/lib/video-agent-system"

interface ChatInterfaceProps {
  messages: Message[]
  videoId: string | null
  courseId: string | null
  currentTime: number
  onSendMessage?: (message: string) => void
}

export function ChatInterface({
  messages,
  videoId,
  courseId,
  currentTime,
  onSendMessage
}: ChatInterfaceProps) {
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Filter messages for chat tab (no agent prompts)
  const chatMessages = messages.filter(msg => {
    // EXCLUDE all agent-prompt messages from chat tab
    if (msg.type === 'agent-prompt') {
      return false
    }

    // EXCLUDE quiz and reflection specific messages
    if (['quiz-question', 'quiz-result', 'reflection-complete'].includes(msg.type)) {
      return false
    }

    // INCLUDE conversational messages
    return ['user', 'ai', 'system'].includes(msg.type)
  })

  const handleSendMessage = () => {
    if (input.trim() && onSendMessage) {
      onSendMessage(input.trim())
      setInput('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`
    return `${Math.floor(minutes / 1440)}d ago`
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-3 p-4"
      >
        {chatMessages.length === 0 ? (
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
          chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-3",
                msg.type === 'user' ? "justify-end" : "justify-start"
              )}
            >
              {/* Message Content */}
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-3 py-2",
                  msg.type === 'user'
                    ? "bg-blue-500 text-white"
                    : msg.type === 'ai'
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    : "bg-orange-50 dark:bg-orange-900/20 text-orange-900 dark:text-orange-100 border border-orange-200 dark:border-orange-800"
                )}
              >
                <div className="text-sm whitespace-pre-wrap">
                  {msg.message}
                </div>
                <div className="text-xs opacity-70 mt-1">
                  {formatTimeAgo(msg.timestamp)}
                </div>
              </div>

              {/* Avatar */}
              <div className={cn(
                "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                msg.type === 'user'
                  ? "bg-blue-500 text-white order-first"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              )}>
                {msg.type === 'user' ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Chat Input */}
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
            disabled={!input.trim()}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          AI-powered learning assistant
        </div>
      </div>
    </div>
  )
}