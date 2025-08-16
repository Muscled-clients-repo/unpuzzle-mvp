"use client"

import { useState, useEffect, useRef } from "react"
import { Message, MessageState } from "@/lib/video-agent-system"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Puzzle, Send, Sparkles, Bot, User, Pause, Lightbulb, CheckCircle2, MessageSquare, Route, Clock, Brain, Zap, Target } from "lucide-react"
import { cn } from "@/lib/utils"

interface AIChatSidebarV2Props {
  messages: Message[]
  onAgentRequest: (type: string) => void
  onAgentAccept: (id: string) => void
  onAgentReject: (id: string) => void
  onQuizAnswer?: (questionId: string, selectedAnswer: number) => void
}

export function AIChatSidebarV2({
  messages,
  onAgentRequest,
  onAgentAccept,
  onAgentReject,
  onQuizAnswer
}: AIChatSidebarV2Props) {
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  
  // Add welcome message if no messages
  const displayMessages: Message[] = messages.length === 0 ? [{
    id: "welcome",
    type: "ai" as const,
    state: MessageState.PERMANENT,
    message: "Welcome! This is Alam, I'll use my team of agents to accelerate your learning of this video.",
    timestamp: Date.now()
  }] : messages

  // Scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 100)
  }, [messages])

  const handleSendMessage = () => {
    if (!inputValue.trim()) return
    
    // In a real implementation, this would send to the AI backend
    console.log("User message:", inputValue)
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
          color: 'from-purple-500 to-yellow-500',
          bgColor: 'bg-gradient-to-br from-purple-500/10 to-yellow-500/10',
          borderColor: 'border-purple-500/20',
          textColor: 'text-purple-700 dark:text-purple-300',
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
          color: 'from-blue-500 to-cyan-500',
          bgColor: 'bg-gradient-to-br from-blue-500/10 to-cyan-500/10',
          borderColor: 'border-blue-500/20',
          textColor: 'text-blue-700 dark:text-blue-300',
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
    // System messages - Enhanced design
    if (msg.type === 'system') {
      return (
        <div key={msg.id} className="flex justify-center my-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-gradient-to-r from-secondary/50 to-secondary/30 px-4 py-2 rounded-full backdrop-blur-sm border border-border/50">
            <Clock className="h-3 w-3" />
            <span className="font-medium">{msg.message}</span>
          </div>
        </div>
      )
    }

    // Agent prompt messages (unactivated) - Enhanced card design from 1 commit ago
    if (msg.type === 'agent-prompt' && msg.state === MessageState.UNACTIVATED) {
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
                    onClick={() => onAgentAccept(msg.id)}
                    className={cn(
                      "bg-gradient-to-r text-white font-medium shadow-md hover:shadow-lg transition-all",
                      config.color
                    )}
                  >
                    <Zap className="mr-1 h-3 w-3" />
                    Yes, let's go!
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onAgentReject(msg.id)}
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

    // Agent prompt messages (activated or rejected) - Enhanced style
    if (msg.type === 'agent-prompt' && (msg.state === MessageState.ACTIVATED || msg.state === MessageState.REJECTED)) {
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

    // AI messages - Enhanced design
    if (msg.type === 'ai') {
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

    // Quiz result messages - Horizontal compact layout
    if (msg.type === 'quiz-result' && msg.quizState) {
      const { quizState } = msg
      const percentage = Math.round((quizState.score / quizState.questions.length) * 100)
      const emoji = percentage >= 80 ? '🎉' : percentage >= 60 ? '👍' : '📚'
      
      return (
        <div key={msg.id} className="mb-3">
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              {/* Left side - Score */}
              <div className="flex items-center gap-2">
                <span className="text-xl">{emoji}</span>
                <div>
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Quiz Complete</p>
                  <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
                    {quizState.score}/{quizState.questions.length} • {percentage}%
                  </p>
                </div>
              </div>
              
              {/* Right side - Question results */}
              <div className="flex items-center gap-1.5 text-xs">
                {quizState.questions.map((question, index) => {
                  const userAnswer = quizState.userAnswers[index]
                  const isCorrect = userAnswer === question.correctAnswer
                  return (
                    <span key={question.id} className="flex items-center">
                      <span className="text-muted-foreground">Q{index + 1}</span>
                      <span className="ml-0.5 text-[10px]">{isCorrect ? '✅' : '❌'}</span>
                    </span>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background to-secondary/5">
      {/* Header - Enhanced design */}
      <div className="border-b bg-background/95 backdrop-blur-sm p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-primary/70 shadow-md">
            <Bot className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-bold text-lg">AI Learning Assistant</h3>
            <p className="text-xs text-muted-foreground">Powered by 4 specialized agents</p>
          </div>
        </div>
        
        {/* Agent Buttons - Single row optimized */}
        <div className="flex gap-1 w-full">
          {[
            { type: 'hint', icon: Puzzle, label: 'Hint', color: 'hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-yellow-500/10 hover:border-purple-500/50' },
            { type: 'quiz', icon: Brain, label: 'Quiz', color: 'hover:bg-gradient-to-r hover:from-green-500/10 hover:to-emerald-500/10 hover:border-green-500/50' },
            { type: 'reflect', icon: Target, label: 'Reflect', color: 'hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-cyan-500/10 hover:border-blue-500/50' },
            { type: 'path', icon: Route, label: 'Path', color: 'hover:bg-gradient-to-r hover:from-indigo-500/10 hover:to-purple-500/10 hover:border-indigo-500/50' }
          ].map(({ type, icon: Icon, label, color }) => (
            <Button
              key={type}
              size="sm"
              variant="outline"
              className={cn(
                "flex-1 flex-col justify-center items-center h-14 py-2 transition-all border-2",
                color
              )}
              onClick={() => onAgentRequest(type)}
            >
              <Icon className="h-4 w-4" />
              <span className="text-xs font-medium">{label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Messages - With gradient background */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
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
        <div className="flex gap-2 mb-2">
          <Input
            placeholder="Ask about the video content..."
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
    </div>
  )
}