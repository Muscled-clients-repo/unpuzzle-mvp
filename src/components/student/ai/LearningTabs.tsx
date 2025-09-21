'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { MessageSquare, Lightbulb } from "lucide-react"
import { cn } from "@/lib/utils"
import { ChatInterface } from "./ChatInterface"
import { AgentInterface } from "./AgentInterface"
import { Message } from "@/lib/video-agent-system"

interface LearningTabsProps {
  messages: Message[]
  videoId: string | null
  courseId: string | null
  currentTime: number
  onSendMessage?: (message: string) => void
  onReflectionTypeChosen?: (type: string) => void
  onAgentRequest?: (agentType: string) => void
  onAgentAccept?: (id: string) => void
}

export function LearningTabs({
  messages,
  videoId,
  courseId,
  currentTime,
  onSendMessage,
  onReflectionTypeChosen,
  onAgentRequest,
  onAgentAccept
}: LearningTabsProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'agents'>('chat')

  const tabs = [
    {
      key: 'chat' as const,
      label: 'Chat',
      icon: MessageSquare,
    },
    {
      key: 'agents' as const,
      label: 'Agent',
      icon: Lightbulb,
    },
  ]

  if (!courseId || !videoId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <div className="text-sm">Learning assistant not available</div>
          <div className="text-xs mt-1">Course or video not found</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab Navigation */}
      <div className="flex border-b bg-gray-50 dark:bg-gray-900/50">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative",
              activeTab === key
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
            {/* Active tab indicator */}
            {activeTab === key && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' && (
          <ChatInterface
            messages={messages}
            videoId={videoId}
            courseId={courseId}
            currentTime={currentTime}
            onSendMessage={onSendMessage}
          />
        )}

        {activeTab === 'agents' && (
          <div className="h-full overflow-y-auto p-4">
            <AgentInterface
              courseId={courseId}
              videoId={videoId}
              currentTime={currentTime}
              messages={messages}
              onQuizChoice={() => {
                // Find the quiz agent prompt and accept it
                const quizPrompt = messages.find(msg =>
                  msg.type === 'agent-prompt' &&
                  msg.agentType === 'quiz' &&
                  msg.state === 'unactivated'
                )
                if (quizPrompt && onAgentAccept) {
                  onAgentAccept(quizPrompt.id)
                }
              }}
              onReflectionChoice={() => {
                // Find the reflection agent prompt and accept it
                const reflectionPrompt = messages.find(msg =>
                  msg.type === 'agent-prompt' &&
                  msg.agentType === 'reflect' &&
                  msg.state === 'unactivated'
                )
                if (reflectionPrompt && onAgentAccept) {
                  onAgentAccept(reflectionPrompt.id)
                }
              }}
              onAgentRequest={onAgentRequest}
            />
          </div>
        )}
      </div>
    </div>
  )
}