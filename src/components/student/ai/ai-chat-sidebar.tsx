"use client"

import { useState, useEffect } from "react"
import { useAppStore } from "@/stores/app-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Lightbulb,
  CheckCircle2,
  MessageSquare,
  Route,
  Send,
  Bot,
  User,
  Sparkles,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { mockAIResponses } from "@/data/mock"

interface Message {
  id: string
  type: "user" | "ai"
  content: string
  timestamp: Date
  agentType?: "hint" | "check" | "reflect" | "path"
}

interface AIChatSidebarProps {
  courseId: string
  videoId: string
  currentTime: number
  onAgentTrigger?: (type: "hint" | "check" | "reflect" | "path") => void
}

export function AIChatSidebar({
  courseId,
  videoId,
  currentTime,
  onAgentTrigger,
}: AIChatSidebarProps) {
  const [input, setInput] = useState("")
  
  // Use individual selectors for optimal performance
  const chatMessages = useAppStore((state) => state.chatMessages)
  const transcriptReferences = useAppStore((state) => state.transcriptReferences)
  const addChatMessage = useAppStore((state) => state.addChatMessage)
  const removeTranscriptReference = useAppStore((state) => state.removeTranscriptReference)
  const clearSelection = useAppStore((state) => state.clearSelection)
  const profile = useAppStore((state) => state.profile)
  const useAiInteraction = useAppStore((state) => state.useAiInteraction)
  
  // Convert store messages to component format
  const messages: Message[] = chatMessages.map(msg => ({
    id: msg.id,
    type: msg.type,
    content: msg.content,
    timestamp: msg.timestamp,
  }))
  
  // Get the latest transcript reference
  const transcriptReference = transcriptReferences.length > 0 
    ? transcriptReferences[transcriptReferences.length - 1]
    : null

  // Don't show welcome message initially - just show the centered info
  const [hasAiActivated, setHasAiActivated] = useState(false)
  const [hasVideoStarted, setHasVideoStarted] = useState(false)
  
  // Track when AI actually activates
  useEffect(() => {
    if (chatMessages.length > 0) {
      setHasAiActivated(true)
    }
  }, [chatMessages.length])
  
  // Track if video has started (currentTime > 0 means video has played)
  useEffect(() => {
    if (currentTime > 0 && !hasVideoStarted) {
      setHasVideoStarted(true)
    }
  }, [currentTime])
  
  // Auto-generate AI response when transcript references are added
  useEffect(() => {
    if (transcriptReference) {
      // Simulate AI response to transcript reference
      setTimeout(() => {
        const aiResponse = `I see you've selected: "${transcriptReference.text}" from ${Math.floor(transcriptReference.startTime)}s to ${Math.floor(transcriptReference.endTime)}s.\n\nBased on this section, here are the key points:\n1. The main concept being explained\n2. How it connects to previous material\n3. Important for upcoming exercises\n\nWould you like me to explain any specific part in more detail?`
        
        // Add AI response as a message (this would come from AI service in production)
        const store = useAppStore.getState()
        store.addChatMessage(aiResponse, {
          videoId,
          timestamp: transcriptReference.startTime,
          transcript: transcriptReference.text,
        })
      }, 1000)
    }
  }, [transcriptReferences.length])

  const handleSendMessage = () => {
    if (!input.trim()) return

    // Check if user can use AI interaction
    const canUseAI = useAiInteraction()
    if (!canUseAI) {
      // Add system message about limit
      const plan = profile?.subscription?.plan
      const dailyUsed = profile?.subscription?.dailyAiInteractions || 0
      
      let limitMessage = ""
      if (plan === 'basic') {
        limitMessage = `🚫 Daily AI limit reached (${dailyUsed}/3). Upgrade to Premium for unlimited AI help!`
      } else {
        limitMessage = "🚫 Please upgrade to access AI features."
      }
      
      addChatMessage(limitMessage, undefined, 'ai')
      setInput("")
      return
    }

    // Include transcript reference if available
    const messageContent = transcriptReference 
      ? `${input}\n\n📝 Transcript Reference:\n"${transcriptReference.text}"`
      : input

    // Add user message to store
    addChatMessage(messageContent, transcriptReference ? {
      videoId,
      timestamp: transcriptReference.startTime,
      transcript: transcriptReference.text,
    } : undefined)
    
    // Check for intent and respond accordingly
    const lowerInput = input.toLowerCase()
    let responseContent = ""
    let agentType: "hint" | "check" | "reflect" | "path" | undefined = undefined

    if (lowerInput.includes("hint") || lowerInput.includes("stuck") || lowerInput.includes("help")) {
      const hint = mockAIResponses.hints[0]
      responseContent = `💡 Here's a hint: ${hint.hint}`
      agentType = "hint"
    } else if (lowerInput.includes("quiz") || lowerInput.includes("test") || lowerInput.includes("check")) {
      const check = mockAIResponses.checks[0]
      responseContent = `📝 Quiz Time!\n\n${check.question}\n\nOptions:\n${check.options.map((o, i) => `${i + 1}. ${o}`).join("\n")}\n\nType the number of your answer!`
      agentType = "check"
    } else if (lowerInput.includes("reflect") || lowerInput.includes("think")) {
      const reflection = mockAIResponses.reflections[0]
      responseContent = `🤔 Let's reflect:\n\n${reflection.prompt}\n\nConsider these questions:\n${reflection.guidingQuestions?.map(q => `• ${q}`).join("\n")}`
      agentType = "reflect"
    } else if (lowerInput.includes("path") || lowerInput.includes("struggling") || lowerInput.includes("don't understand")) {
      const path = mockAIResponses.paths[0]
      responseContent = `🎯 I see you might need some extra help with ${path.detectedIssue}.\n\nHere's a personalized learning path:\n${path.recommendedContent.map(c => `• ${c.title} (${c.duration})`).join("\n")}\n\nWould you like me to explain any of these topics?`
      agentType = "path"
    } else {
      responseContent = "I understand you're asking about that concept. Let me help you understand it better. The key thing to remember is that this builds on what you learned earlier in the video.\n\nYou can also ask me to:\n• Give you a hint\n• Quiz you on this topic\n• Help you reflect on what you've learned\n• Suggest a learning path"
    }

    setInput("")
    
    // Clear transcript reference from store if used
    if (transcriptReference) {
      removeTranscriptReference(transcriptReference.id)
      // Clear video in/out points after sending the message with the reference
      clearSelection()
    }

    // Simulate AI response (in production, this would be an API call)
    setTimeout(() => {
      // Add AI response to store
      const store = useAppStore.getState()
      store.addChatMessage(responseContent, { videoId, timestamp: currentTime })
    }, 1000)
  }

  const quickAction = (action: string) => {
    setInput(action)
    // Add user action to store
    addChatMessage(action, { videoId, timestamp: currentTime })
    
    // Process the action
    const lowerInput = action.toLowerCase()
    let responseContent = ""
    let agentType: "hint" | "check" | "reflect" | "path" | undefined = undefined

    if (lowerInput.includes("hint")) {
      const hint = mockAIResponses.hints[0]
      responseContent = `💡 Here's a hint: ${hint.hint}`
      agentType = "hint"
    } else if (lowerInput.includes("quiz")) {
      const check = mockAIResponses.checks[0]
      responseContent = `📝 Quiz Time!\n\n${check.question}\n\nOptions:\n${check.options.map((o, i) => `${i + 1}. ${o}`).join("\n")}\n\nType the number of your answer!`
      agentType = "check"
    } else if (lowerInput.includes("reflect")) {
      const reflection = mockAIResponses.reflections[0]
      responseContent = `🤔 Let's reflect:\n\n${reflection.prompt}\n\nConsider these questions:\n${reflection.guidingQuestions?.map(q => `• ${q}`).join("\n")}`
      agentType = "reflect"
    } else if (lowerInput.includes("learning path")) {
      const path = mockAIResponses.paths[0]
      responseContent = `🎯 Here's a personalized learning path based on your progress:\n\n${path.recommendedContent.map(c => `• ${c.title} (${c.duration})`).join("\n")}\n\nWould you like me to explain any of these topics?`
      agentType = "path"
    }

    setTimeout(() => {
      // Add AI response to store
      const store = useAppStore.getState()
      store.addChatMessage(responseContent, { videoId, timestamp: currentTime })
    }, 1000)
  }

  const getAgentIcon = (type?: "hint" | "check" | "reflect" | "path") => {
    switch (type) {
      case "hint":
        return <Lightbulb className="h-4 w-4 text-yellow-500" />
      case "check":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "reflect":
        return <MessageSquare className="h-4 w-4 text-blue-500" />
      case "path":
        return <Route className="h-4 w-4 text-purple-500" />
      default:
        return <Bot className="h-4 w-4 text-muted-foreground" />
    }
  }

  return (
    <div className="flex h-full flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="border-b p-4 flex-shrink-0">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Learning Assistant
        </h3>
      </div>

      {/* Quick Actions */}
      <div className="border-b p-2 flex-shrink-0">
        <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => quickAction("Give me a hint")}
              className="text-xs"
              disabled={!hasVideoStarted}
              title={!hasVideoStarted ? "Start the video to activate AI agents" : "Get an AI hint"}
            >
              <Lightbulb className="mr-1 h-3 w-3" />
              Hint
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => quickAction("Quiz me on this")}
              className="text-xs"
              disabled={!hasVideoStarted}
              title={!hasVideoStarted ? "Start the video to activate AI agents" : "Take a quick quiz"}
            >
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Quiz
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => quickAction("Help me reflect")}
              className="text-xs"
              disabled={!hasVideoStarted}
              title={!hasVideoStarted ? "Start the video to activate AI agents" : "Reflect on learning"}
            >
              <MessageSquare className="mr-1 h-3 w-3" />
              Reflect
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => quickAction("Suggest learning path")}
              className="text-xs"
              disabled={!hasVideoStarted}
              title={!hasVideoStarted ? "Start the video to activate AI agents" : "Get learning path suggestions"}
            >
              <Route className="mr-1 h-3 w-3" />
              Path
            </Button>
        </div>
      </div>

      {/* Chat Messages - Scrollable */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-4 p-4">
          {!hasAiActivated && messages.length === 0 ? (
            // Centered message when no AI activity yet
            <div className="flex h-full min-h-[400px] items-center justify-center">
              <div className="text-center px-6">
                <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {!hasVideoStarted 
                    ? "Start the video to activate AI learning agents"
                    : "AI agents activate automatically by observing your learning behavior"
                  }
                </p>
                <p className="text-xs text-muted-foreground/70 mt-2">
                  {!hasVideoStarted 
                    ? "AI features will be available once you begin watching"
                    : "Or use the buttons above to trigger them manually"
                  }
                </p>
              </div>
            </div>
          ) : (
            // Show messages when AI has activated
            messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.type === "user" && "flex-row-reverse"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full",
                  message.type === "ai" ? "bg-primary/10" : "bg-muted"
                )}
              >
                {message.type === "ai" ? (
                  getAgentIcon(message.agentType)
                ) : (
                  <User className="h-4 w-4" />
                )}
              </div>
              <div
                className={cn(
                  "flex-1 rounded-lg p-3",
                  message.type === "ai"
                    ? "bg-muted"
                    : "bg-primary text-primary-foreground"
                )}
              >
                <p className="text-sm whitespace-pre-line">{message.content}</p>
                <span className="mt-1 block text-xs opacity-50">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          )))}
        </div>
      </ScrollArea>

      {/* Chat Input - Fixed at bottom */}
      <div className="border-t bg-background flex-shrink-0">
        {/* Transcript Reference Display */}
        {transcriptReference && (
          <div className="p-3 bg-primary/5 border-b">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-primary">📝 Referenced from transcript</span>
                  <span className="text-xs text-muted-foreground">
                    ({Math.floor(transcriptReference.startTime / 60)}:{(transcriptReference.startTime % 60).toString().padStart(2, '0')})
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  "{transcriptReference.text}"
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0"
                onClick={() => transcriptReference && removeTranscriptReference(transcriptReference.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
        
        <div className="p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
            className="flex gap-2"
          >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question or type 'help' for options..."
            className="flex-1"
          />
          <Button type="submit" size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </form>
        </div>
      </div>
    </div>
  )
}