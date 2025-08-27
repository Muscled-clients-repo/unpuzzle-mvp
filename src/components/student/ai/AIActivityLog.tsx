"use client"

import { useState } from "react"
import { Message, MessageState } from "@/lib/video-agent-system"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Clock, Brain, Target, Route, Puzzle, CheckCircle2, X, Trophy, Mic, Camera, Video, Activity } from "lucide-react"
import { cn } from "@/lib/utils"

interface AIActivityLogProps {
  messages: Message[]
  isOpen?: boolean
  onToggle?: () => void
}

export function AIActivityLog({ messages, isOpen = false, onToggle }: AIActivityLogProps) {
  const [localIsOpen, setLocalIsOpen] = useState(isOpen)
  
  const handleToggle = () => {
    if (onToggle) {
      onToggle()
    } else {
      setLocalIsOpen(!localIsOpen)
    }
  }
  
  const effectiveIsOpen = onToggle ? isOpen : localIsOpen
  
  // Extract activity entries from messages
  const activities = messages.filter(msg => {
    // Include system messages with timestamps (📍)
    if (msg.type === 'system' && msg.message.includes('📍')) {
      return true
    }
    return false
  })
  
  // Parse activity type and details from message
  const parseActivity = (message: string) => {
    if (message.includes('PuzzleHint activated')) {
      return { type: 'hint', icon: Puzzle, color: 'text-purple-600' }
    }
    if (message.includes('PuzzleCheck activated')) {
      return { type: 'quiz', icon: Brain, color: 'text-green-600' }
    }
    if (message.includes('Quiz completed')) {
      return { type: 'quiz-complete', icon: Trophy, color: 'text-yellow-600' }
    }
    if (message.includes('PuzzleReflect activated')) {
      return { type: 'reflect', icon: Target, color: 'text-blue-600' }
    }
    if (message.includes('Voice Memo')) {
      return { type: 'voice', icon: Mic, color: 'text-blue-600' }
    }
    if (message.includes('Screenshot')) {
      return { type: 'screenshot', icon: Camera, color: 'text-green-600' }
    }
    if (message.includes('Loom Video')) {
      return { type: 'loom', icon: Video, color: 'text-purple-600' }
    }
    if (message.includes('PuzzlePath activated')) {
      return { type: 'path', icon: Route, color: 'text-indigo-600' }
    }
    return { type: 'unknown', icon: Activity, color: 'text-gray-600' }
  }
  
  // Extract timestamp from message
  const extractTimestamp = (message: string) => {
    const match = message.match(/at (\d+:\d+)/)
    return match ? match[1] : ''
  }
  
  // Extract additional info (like quiz score)
  const extractAdditionalInfo = (message: string) => {
    const scoreMatch = message.match(/Score: (\d+\/\d+ \(\d+%\))/)
    if (scoreMatch) return scoreMatch[1]
    return null
  }
  
  // For overlay mode, render within container
  if (onToggle) {
    return (
      <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm animate-in fade-in-0 slide-in-from-right">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">Activity Log</h2>
              {activities.length > 0 && (
                <span className="text-sm bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">
                  {activities.length} interactions
                </span>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={onToggle}
              className="hover:bg-secondary"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Content */}
          <ScrollArea className="flex-1 p-4">
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No interactions yet. Start by pausing the video or clicking an agent button.
              </p>
            ) : (
              <div className="space-y-3">
                {activities.map((activity, index) => {
                  const parsed = parseActivity(activity.message)
                  const timestamp = extractTimestamp(activity.message)
                  const additionalInfo = extractAdditionalInfo(activity.message)
                  const Icon = parsed.icon
                  
                  return (
                    <div
                      key={activity.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/20 transition-colors bg-background border border-border/50"
                    >
                      <div className="p-2 rounded-lg bg-secondary">
                        <Icon className={cn("h-4 w-4", parsed.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">
                            {timestamp}
                          </span>
                          <span className="text-sm text-foreground">
                            {activity.message.replace(/📍\s*/, '').replace(/at \d+:\d+/, '').trim()}
                          </span>
                        </div>
                        {additionalInfo && (
                          <span className="text-xs text-primary font-medium mt-1 block">
                            {additionalInfo}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    )
  }
  
  // Fallback to card view if no onToggle provided (shouldn't happen in our use case)
  return null
}