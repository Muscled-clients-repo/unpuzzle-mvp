"use client"

import { useState, useEffect } from "react"
import { useAppStore } from "@/stores/app-store"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  AlertCircle,
  Zap,
  ArrowUpRight,
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
  const router = useRouter()
  
  // Use individual selectors for optimal performance
  const chatMessages = useAppStore((state) => state.chatMessages)
  const transcriptReferences = useAppStore((state) => state.transcriptReferences)
  const addChatMessage = useAppStore((state) => state.addChatMessage)
  const sendChatMessage = useAppStore((state) => state.sendChatMessage)
  const removeTranscriptReference = useAppStore((state) => state.removeTranscriptReference)
  const clearVideoSegment = useAppStore((state) => state.clearVideoSegment)
  const profile = useAppStore((state) => state.profile)
  const useAiInteraction = useAppStore((state) => state.useAiInteraction)
  
  // New subscription and usage selectors
  const usageStats = useAppStore((state) => state.usageStats)
  const canUseAI = useAppStore((state) => state.canUseAI)
  const upgradeRequired = useAppStore((state) => state.upgradeRequired)
  const refreshUsageStats = useAppStore((state) => state.refreshUsageStats || (() => Promise.resolve()))
  const showUpgradePrompt = useAppStore((state) => state.showUpgradePrompt)
  const currentSubscription = useAppStore((state) => state.currentSubscription)
  
  // AI slice methods (optional for backward compatibility)
  const checkAILimits = useAppStore((state) => state.checkAILimits || (() => Promise.resolve(true)))
  
  // State for upgrade prompt modal
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [pendingMessage, setPendingMessage] = useState("")
  
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
  
  // Load usage stats on mount and periodically
  useEffect(() => {
    refreshUsageStats()
    const interval = setInterval(refreshUsageStats, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [refreshUsageStats])
  
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
  }, [currentTime, hasVideoStarted])
  
  // Auto-generate AI response when transcript references are added
  useEffect(() => {
    if (transcriptReference) {
      const handleTranscriptReference = async () => {
        const message = `Please explain this part of the video: "${transcriptReference.text}"`
        const context = {
          videoId,
          inPoint: transcriptReference.startTime,
          outPoint: transcriptReference.endTime,
          transcript: transcriptReference.text,
          purpose: 'ai-context' as const,
        }

        try {
          await sendChatMessage(message, context, transcriptReference)
        } catch (error) {
          console.error('Failed to process transcript reference:', error)
          // Fallback message
          const store = useAppStore.getState()
          store.addChatMessage('I\'m having trouble processing the transcript reference. Please try again.', context, 'ai')
        }
      }

      handleTranscriptReference()
    }
  }, [transcriptReference, videoId, sendChatMessage])

  const handleSendMessage = async () => {
    if (!input.trim()) return

    // Check AI limits first
    const canUse = await checkAILimits('chat')
    if (!canUse) {
      setPendingMessage(input)
      setShowUpgradeModal(true)
      return
    }
    
    // Legacy check for backward compatibility
    const canUseAILegacy = useAiInteraction()
    if (!canUseAILegacy) {
      // Add system message about limit
      const plan = profile?.subscription?.plan || currentSubscription?.plan_id || 'free'
      const dailyUsed = usageStats?.usage_today || profile?.subscription?.dailyAiInteractions || 0
      const dailyLimit = usageStats?.daily_limit || 3
      
      let limitMessage = ""
      if (plan === 'basic' || plan === 'free') {
        limitMessage = `🚫 Daily AI limit reached (${dailyUsed}/${dailyLimit}). Upgrade to Premium for 50 daily AI interactions!`
      } else {
        limitMessage = "🚫 Please upgrade to access AI features."
      }
      
      addChatMessage(limitMessage, undefined, 'ai')
      setInput("")
      setShowUpgradeModal(true)
      return
    }

    // Use the AI service through the store
    const messageContent = transcriptReference 
      ? `${input}\n\n📝 Transcript Reference:\n"${transcriptReference.text}"`
      : input

    const context = transcriptReference ? {
      videoId,
      inPoint: transcriptReference.startTime,
      outPoint: transcriptReference.endTime,
      transcript: transcriptReference.text,
      purpose: 'ai-context' as const,
    } : {
      videoId,
      inPoint: currentTime,
      outPoint: currentTime + 30,
      purpose: 'ai-context' as const,
    }

    setInput("")
    
    // Clear transcript reference from store if used
    if (transcriptReference) {
      removeTranscriptReference(transcriptReference.id)
      // Clear video in/out points after sending the message with the reference
      clearVideoSegment()
    }

    // Send message through AI service (this will make the actual API call)
    try {
      await sendChatMessage(messageContent, context, transcriptReference)
      // Usage stats will be refreshed automatically in the AI slice
    } catch (error) {
      console.error('Failed to send AI message:', error)
      // Fallback to local message if API fails
      addChatMessage('Sorry, I encountered an error. Please try again.', undefined, 'ai')
    }
  }

  const quickAction = async (action: string) => {
    // Check limits for the specific agent type
    const agentType = action.toLowerCase().includes('hint') ? 'hint' :
                     action.toLowerCase().includes('quiz') ? 'quiz' :
                     action.toLowerCase().includes('reflect') ? 'reflection' :
                     action.toLowerCase().includes('learning path') ? 'path' : 'chat'
    
    const canUse = await checkAILimits(agentType)
    if (!canUse) {
      setPendingMessage(action)
      setShowUpgradeModal(true)
      return
    }
    
    setInput(action)
    
    // Create context for quick actions
    const context = {
      videoId,
      inPoint: currentTime,
      outPoint: currentTime + 30, // Add a 30-second window for context
      purpose: 'ai-context' as const,
    }

    // Send message through AI service (this will make the actual API call)
    try {
      await sendChatMessage(action, context, transcriptReference)
      // Usage stats will be refreshed automatically in the AI slice
    } catch (error) {
      console.error('Failed to send AI quick action:', error)
      // Fallback to local message if API fails
      addChatMessage('Sorry, I encountered an error processing your request. Please try again.', undefined, 'ai')
    }
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

  // Usage indicator component
  const UsageIndicator = () => {
    if (!usageStats) return null
    
    const usagePercent = (usageStats.usage_today / usageStats.daily_limit) * 100
    const isNearLimit = usagePercent >= 80
    
    return (
      <div className="p-2 border-t bg-muted/50">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">AI Usage Today</span>
          <span className="font-medium">
            {usageStats.usage_today}/{usageStats.daily_limit}
          </span>
        </div>
        <Progress value={usagePercent} className="h-1" />
        {isNearLimit && (
          <p className="text-xs text-warning mt-1">
            {usageStats.remaining_today} interactions remaining
          </p>
        )}
      </div>
    )
  }
  
  // Upgrade prompt modal
  const UpgradePromptModal = () => (
    <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            AI Limit Reached
          </DialogTitle>
          <DialogDescription>
            You&apos;ve reached your daily AI interaction limit
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert>
            <Zap className="h-4 w-4" />
            <AlertDescription>
              <strong>Current Plan:</strong> {currentSubscription?.plan_name || 'Free'}<br/>
              <strong>Daily Limit:</strong> {usageStats?.daily_limit || 3} interactions<br/>
              <strong>Used Today:</strong> {usageStats?.usage_today || 0} interactions
            </AlertDescription>
          </Alert>
          
          <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
            <h4 className="font-semibold mb-2">Upgrade to Premium</h4>
            <ul className="space-y-1 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                50 AI interactions per day
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Smart hints & quizzes
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Reflection prompts
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Priority support
              </li>
            </ul>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={() => {
                setShowUpgradeModal(false)
                router.push('/subscription')
              }}
              className="flex-1"
            >
              Upgrade Now
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowUpgradeModal(false)
                setPendingMessage('')
              }}
              className="flex-1"
            >
              Maybe Later
            </Button>
          </div>
          
          {usageStats?.reset_time && (
            <p className="text-xs text-center text-muted-foreground">
              Daily limit resets in {(() => {
                const resetDate = new Date(usageStats.reset_time)
                const now = new Date()
                const diff = resetDate.getTime() - now.getTime()
                const hours = Math.floor(diff / (1000 * 60 * 60))
                return `${hours} hours`
              })()}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )

  return (
    <div className="flex h-full flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="border-b p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Learning Assistant
          </h3>
          {currentSubscription && (
            <Badge variant="outline" className="text-xs">
              {currentSubscription.plan_name}
            </Badge>
          )}
        </div>
      </div>
      
      {/* Usage Indicator */}
      {usageStats && <UsageIndicator />}

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
                  {new Date(message.timestamp).toLocaleTimeString([], {
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
                  &quot;{transcriptReference.text}&quot;
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
      
      {/* Upgrade Prompt Modal */}
      <UpgradePromptModal />
    </div>
  )
}