'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LearningTabs } from '@/components/student/ai/LearningTabs'
import { ChatInterface } from '@/components/student/ai/ChatInterface'
import { AgentInterface } from '@/components/student/ai/AgentInterface'
import { Message, MessageState } from '@/lib/video-agent-system'

export default function TestComponentsPage() {
  const [currentTime] = useState(120) // 2:00 timestamp

  // Mock data for testing
  const mockMessages: Message[] = [
    {
      id: 'test-1',
      type: 'user',
      message: 'Hello, can you help me understand this concept?',
      timestamp: Date.now() - 60000,
      sender: 'user'
    },
    {
      id: 'test-2',
      type: 'ai',
      message: 'Of course! I\'d be happy to help explain that concept. What specific part would you like me to clarify?',
      timestamp: Date.now() - 30000,
      sender: 'ai'
    },
    {
      id: 'test-3',
      type: 'agent-prompt',
      message: 'Would you like to take a quick quiz to test your understanding?',
      timestamp: Date.now() - 10000,
      sender: 'system',
      agentType: 'quiz',
      state: MessageState.UNACTIVATED
    },
    {
      id: 'test-4',
      type: 'agent-prompt',
      message: 'Would you like to reflect on what you\'ve learned so far?',
      timestamp: Date.now() - 5000,
      sender: 'system',
      agentType: 'reflect',
      state: MessageState.UNACTIVATED
    }
  ]

  const mockCourseId = 'test-course-123'
  const mockVideoId = 'test-video-456'

  const handleSendMessage = (message: string) => {
    console.log('Test: Send message:', message)
  }

  const handleAgentRequest = (agentType: string) => {
    console.log('Test: Agent request:', agentType)
  }

  const handleAgentAccept = (id: string) => {
    console.log('Test: Agent accept:', id)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Component Testing Page</h1>
          <p className="text-gray-600">Testing new ChatInterface, AgentInterface, and LearningTabs components</p>
        </div>

        {/* LearningTabs - Full Integration Test */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">LearningTabs (Full Integration)</h2>
          <div className="h-96 border rounded-lg">
            <LearningTabs
              messages={mockMessages}
              videoId={mockVideoId}
              courseId={mockCourseId}
              currentTime={currentTime}
              onSendMessage={handleSendMessage}
              onAgentRequest={handleAgentRequest}
              onAgentAccept={handleAgentAccept}
            />
          </div>
        </Card>

        {/* Individual Component Tests */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ChatInterface Test */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">ChatInterface (Isolated)</h2>
            <div className="h-96 border rounded-lg">
              <ChatInterface
                messages={mockMessages}
                videoId={mockVideoId}
                courseId={mockCourseId}
                currentTime={currentTime}
                onSendMessage={handleSendMessage}
              />
            </div>
          </Card>

          {/* AgentInterface Test */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">AgentInterface (Isolated)</h2>
            <div className="h-96 border rounded-lg overflow-y-auto">
              <AgentInterface
                courseId={mockCourseId}
                videoId={mockVideoId}
                currentTime={currentTime}
                messages={mockMessages}
                onQuizChoice={() => console.log('Test: Quiz choice')}
                onReflectionChoice={() => console.log('Test: Reflection choice')}
                onAgentRequest={handleAgentRequest}
              />
            </div>
          </Card>
        </div>

        {/* Debug Info */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Mock Course ID:</strong> {mockCourseId}</p>
            <p><strong>Mock Video ID:</strong> {mockVideoId}</p>
            <p><strong>Current Time:</strong> {currentTime}s ({Math.floor(currentTime / 60)}:{(currentTime % 60).toString().padStart(2, '0')})</p>
            <p><strong>Messages Count:</strong> {mockMessages.length}</p>
            <p><strong>Agent Prompts:</strong> {mockMessages.filter(m => m.type === 'agent-prompt').length}</p>
            <p><strong>Chat Messages:</strong> {mockMessages.filter(m => ['user', 'ai'].includes(m.type)).length}</p>
          </div>
        </Card>

        {/* Instructions */}
        <Card className="p-6 bg-blue-50">
          <h2 className="text-xl font-semibold mb-4 text-blue-900">Testing Instructions</h2>
          <div className="space-y-2 text-blue-800">
            <p>• <strong>LearningTabs:</strong> Test tab switching between Chat and Agent tabs</p>
            <p>• <strong>ChatInterface:</strong> Should show user/AI messages only, with input field</p>
            <p>• <strong>AgentInterface:</strong> Should show quiz/reflection prompts with action buttons</p>
            <p>• <strong>Console:</strong> Check browser console for test action logs</p>
            <p>• <strong>Isolation:</strong> These components should work independently of old AIChatSidebarV2</p>
          </div>
        </Card>
      </div>
    </div>
  )
}