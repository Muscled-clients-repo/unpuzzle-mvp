"use client"

import { useState, useEffect, useRef } from "react"
import { AIChatSidebar } from "./ai-chat-sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Puzzle, Send, Sparkles, Bot, User, Pause, Lightbulb, CheckCircle2, MessageSquare, Route } from "lucide-react"
import { cn } from "@/lib/utils"

interface AIChatSidebarV2Props {
  courseId: string
  videoId: string
  currentTime: number
  onAgentTrigger?: (type: "hint" | "check" | "reflect" | "path") => void
  showPuzzleHint?: boolean
  pausedTimestamp?: string
  onHintResponse?: (accepted: boolean) => void
}

interface ChatMessage {
  id: string
  type: "user" | "ai" | "puzzle-hint" | "system"
  message: string
  timestamp: string
  actions?: {
    onAccept?: () => void
    onReject?: () => void
  }
}

export function AIChatSidebarV2({
  courseId,
  videoId,
  currentTime,
  onAgentTrigger,
  showPuzzleHint,
  pausedTimestamp,
  onHintResponse
}: AIChatSidebarV2Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      type: "ai",
      message: "Welcome! This is Alam, I'll use my team of agents to accelerate your learning of this video.",
      timestamp: "Just now"
    }
  ])
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [activePuzzleHintId, setActivePuzzleHintId] = useState<string | null>(null)
  const [activeSystemMessageId, setActiveSystemMessageId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastPauseTimeRef = useRef<string>("")

  // Add PuzzleHint message when video is paused
  useEffect(() => {
    if (showPuzzleHint && pausedTimestamp && pausedTimestamp !== lastPauseTimeRef.current) {
      lastPauseTimeRef.current = pausedTimestamp
      
      // First add system message showing pause
      const systemMessageId = `system-${Date.now()}`
      const systemMessage: ChatMessage = {
        id: systemMessageId,
        type: "system",
        message: `Paused at ${pausedTimestamp}`,
        timestamp: "Just now"
      }
      
      // Then add PuzzleHint message
      const puzzleHintId = `puzzle-${Date.now()}`
      const puzzleHintMessage: ChatMessage = {
        id: puzzleHintId,
        type: "puzzle-hint",
        message: `Do you want a hint about what's happening at this timestamp?`,
        timestamp: "Just now",
        actions: {
          onAccept: () => handleAcceptHint(pausedTimestamp),
          onReject: () => handleRejectHint()
        }
      }
      
      setMessages(prev => [...prev, systemMessage, puzzleHintMessage])
      setActivePuzzleHintId(puzzleHintId)
      setActiveSystemMessageId(systemMessageId)
      
      // Scroll to bottom
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" })
      }, 100)
    } else if (!showPuzzleHint && activePuzzleHintId) {
      // Video resumed without action - remove both the puzzle hint and system message
      setMessages(prev => prev.filter(msg => 
        msg.id !== activePuzzleHintId && msg.id !== activeSystemMessageId
      ))
      setActivePuzzleHintId(null)
      setActiveSystemMessageId(null)
    }
  }, [showPuzzleHint, pausedTimestamp, activePuzzleHintId, activeSystemMessageId])

  const handleAcceptHint = (timestamp: string) => {
    // Mark that action was taken - both messages stay in chat
    setActivePuzzleHintId(null)
    setActiveSystemMessageId(null)
    
    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: "user",
      message: `Give me a hint at ${timestamp}`,
      timestamp: "Just now"
    }
    
    setMessages(prev => [...prev, userMessage])
    onHintResponse?.(true)
    
    // Show typing indicator
    setIsTyping(true)
    
    // Simulate AI response
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: `ai-${Date.now()}`,
        type: "ai",
        message: `At ${timestamp}, the instructor is explaining a key concept. Pay attention to how they're setting up the state variable - this pattern will be used throughout the rest of the lesson. Notice the syntax they're using for the useState hook.`,
        timestamp: "Just now"
      }
      
      setMessages(prev => [...prev, aiResponse])
      setIsTyping(false)
    }, 1500)
  }

  const handleRejectHint = () => {
    // Mark that action was taken - both messages stay in chat
    setActivePuzzleHintId(null)
    setActiveSystemMessageId(null)
    onHintResponse?.(false)
  }
  
  // Format seconds to timestamp (e.g., 80 -> "1:20")
  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleSendMessage = () => {
    if (!inputValue.trim()) return
    
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: "user",
      message: inputValue,
      timestamp: "Just now"
    }
    
    setMessages(prev => [...prev, userMessage])
    setInputValue("")
    setIsTyping(true)
    
    // Simulate AI response
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: `ai-${Date.now()}`,
        type: "ai",
        message: "I'll help you with that. Let me analyze the current section of the video...",
        timestamp: "Just now"
      }
      
      setMessages(prev => [...prev, aiResponse])
      setIsTyping(false)
    }, 1000)
  }

  const handleQuickAction = (action: string) => {
    // Add user message for the quick action
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: "user",
      message: action,
      timestamp: "Just now"
    }
    
    setMessages(prev => [...prev, userMessage])
    setIsTyping(true)
    
    // Generate appropriate AI response based on action
    setTimeout(() => {
      let aiResponse: ChatMessage
      
      if (action.includes("hint")) {
        aiResponse = {
          id: `ai-${Date.now()}`,
          type: "ai",
          message: "💡 Here's a hint: Focus on the relationship between state and props in this section. Notice how the data flows from parent to child components.",
          timestamp: "Just now"
        }
      } else if (action.includes("quiz")) {
        aiResponse = {
          id: `ai-${Date.now()}`,
          type: "ai",
          message: "📝 Quiz Time!\n\nWhat is the primary purpose of the useState hook?\n\n1. To fetch data from an API\n2. To manage local component state\n3. To handle side effects\n4. To optimize performance\n\nType the number of your answer!",
          timestamp: "Just now"
        }
      } else if (action.includes("reflect")) {
        aiResponse = {
          id: `ai-${Date.now()}`,
          type: "ai",
          message: "🤔 Let's reflect:\n\nHow does this concept connect to what you learned earlier?\n\nConsider:\n• What patterns do you notice?\n• How would you apply this in your own projects?\n• What questions do you still have?",
          timestamp: "Just now"
        }
      } else {
        aiResponse = {
          id: `ai-${Date.now()}`,
          type: "ai",
          message: "🎯 Based on your progress, here's your personalized learning path:\n\n• Review React fundamentals (10 min)\n• Practice with hooks exercises (15 min)\n• Build a mini project (30 min)\n\nWould you like me to elaborate on any of these?",
          timestamp: "Just now"
        }
      }
      
      setMessages(prev => [...prev, aiResponse])
      setIsTyping(false)
    }, 1000)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="p-4 border-b">
        <h3 className="font-semibold">AI Assistant</h3>
      </div>

      {/* Quick Action Agents */}
      <div className="p-2 border-b bg-muted/30">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleQuickAction("Give me a hint")}
            className="text-xs gap-1"
          >
            <Lightbulb className="h-3 w-3 text-yellow-500" />
            Hint
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleQuickAction("Quiz me on this")}
            className="text-xs gap-1"
          >
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            Quiz
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleQuickAction("Help me reflect")}
            className="text-xs gap-1"
          >
            <MessageSquare className="h-3 w-3 text-blue-500" />
            Reflect
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleQuickAction("Show learning path")}
            className="text-xs gap-1"
          >
            <Route className="h-3 w-3 text-purple-500" />
            Path
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-3",
                msg.type === "user" ? "justify-end" : 
                msg.type === "system" ? "justify-center" : "justify-start"
              )}
            >
              {msg.type !== "user" && msg.type !== "system" && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {msg.type === "puzzle-hint" ? (
                      <Puzzle className="h-4 w-4 text-purple-600" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </AvatarFallback>
                </Avatar>
              )}
              
              <div className={cn(
                "max-w-[80%]",
                msg.type === "user" ? "items-end" : "items-start"
              )}>
                {msg.type === "system" ? (
                  // System message for pause events
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full">
                    <Pause className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">
                      {msg.message}
                    </span>
                  </div>
                ) : msg.type === "puzzle-hint" ? (
                  <Card className="p-3 border-purple-200 bg-purple-50 dark:bg-purple-950/20">
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-purple-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                            PuzzleHint Agent
                          </p>
                          <p className="text-sm mt-1">{msg.message}</p>
                        </div>
                      </div>
                      {msg.actions && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 h-8 bg-purple-600 hover:bg-purple-700"
                            onClick={msg.actions.onAccept}
                          >
                            Yes, give me a hint
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-8"
                            onClick={msg.actions.onReject}
                          >
                            No thanks
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                ) : (
                  <div className={cn(
                    "rounded-lg px-3 py-2",
                    msg.type === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}>
                    <p className="text-sm">{msg.message}</p>
                  </div>
                )}
                {msg.type !== "system" && (
                  <span className="text-xs text-muted-foreground mt-1 block">
                    {msg.timestamp}
                  </span>
                )}
              </div>
              
              {msg.type === "user" && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          
          {isTyping && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-lg px-3 py-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-2 h-2 bg-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-2 h-2 bg-foreground/60 rounded-full animate-bounce"></span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            placeholder="Ask about any timestamp..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            className="flex-1"
          />
          <Button size="icon" onClick={handleSendMessage}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}