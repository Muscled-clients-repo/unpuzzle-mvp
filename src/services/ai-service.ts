import { ServiceResult } from './types'

// AI service types
export interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant' | 'system'
  timestamp: Date
  metadata?: {
    videoContext?: VideoContext
    transcriptReference?: TranscriptReference
    confidence?: number
  }
}

export interface VideoContext {
  videoId: string
  timestamp: number
  duration?: number
  title?: string
}

export interface TranscriptReference {
  id: string
  text: string
  startTime: number
  endTime: number
  videoId: string
  confidence?: number
}

export interface AIResponse {
  content: string
  confidence: number
  sources?: Array<{
    type: 'transcript' | 'course_material' | 'external'
    reference: string
    relevance: number
  }>
  suggestedActions?: Array<{
    type: 'replay_segment' | 'jump_to_timestamp' | 'review_concept'
    label: string
    data: any
  }>
}

export interface LearningInsight {
  id: string
  type: 'concept_explanation' | 'related_topic' | 'practice_suggestion' | 'review_reminder'
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  videoContext?: VideoContext
  actionable: boolean
}

export interface AIPersonality {
  name: string
  role: 'tutor' | 'peer' | 'mentor' | 'coach'
  tone: 'friendly' | 'professional' | 'enthusiastic' | 'patient'
  expertise: string[]
}

// AI service interface
export interface AIService {
  sendChatMessage(message: string, context?: VideoContext, transcriptRef?: TranscriptReference): Promise<ServiceResult<ChatMessage>>
  getChatHistory(sessionId?: string): Promise<ServiceResult<ChatMessage[]>>
  generateInsights(videoId: string, watchProgress: number): Promise<ServiceResult<LearningInsight[]>>
  explainConcept(concept: string, context?: VideoContext): Promise<ServiceResult<AIResponse>>
  getPersonalizedSuggestions(userId: string, courseId: string): Promise<ServiceResult<string[]>>
  processTranscriptQuery(transcriptText: string, question: string): Promise<ServiceResult<AIResponse>>
  clearChatHistory(sessionId?: string): Promise<ServiceResult<void>>
}

// Mock implementation
class MockAIService implements AIService {
  private chatHistory: ChatMessage[] = []
  
  private delay(ms: number = 800): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9)
  }

  async sendChatMessage(
    message: string, 
    context?: VideoContext, 
    transcriptRef?: TranscriptReference
  ): Promise<ServiceResult<ChatMessage>> {
    try {
      await this.delay(1000) // Simulate AI processing time
      
      // Add user message to history
      const userMessage: ChatMessage = {
        id: this.generateId(),
        content: message,
        role: 'user',
        timestamp: new Date(),
        metadata: {
          videoContext: context,
          transcriptReference: transcriptRef
        }
      }
      
      this.chatHistory.push(userMessage)
      
      // Generate AI response based on context
      let aiResponse = "I'd be happy to help you with that!"
      
      if (transcriptRef) {
        aiResponse = `Based on the transcript segment "${transcriptRef.text}", I can explain that this concept relates to web development fundamentals. The timing from ${transcriptRef.startTime}s to ${transcriptRef.endTime}s covers important foundational material.`
      } else if (context) {
        aiResponse = `At timestamp ${context.timestamp}s in this video, we're covering key concepts. Let me break this down for you...`
      } else if (message.toLowerCase().includes('explain')) {
        aiResponse = "Let me explain that concept step by step. This is a fundamental topic in web development that builds on previous lessons."
      } else if (message.toLowerCase().includes('practice')) {
        aiResponse = "Great question about practice! I recommend trying some hands-on exercises to reinforce this concept."
      }
      
      const aiMessage: ChatMessage = {
        id: this.generateId(),
        content: aiResponse,
        role: 'assistant',
        timestamp: new Date(),
        metadata: {
          confidence: 0.85,
          videoContext: context,
          transcriptReference: transcriptRef
        }
      }
      
      this.chatHistory.push(aiMessage)
      
      return { data: aiMessage }
    } catch (error) {
      return { error: 'Failed to send chat message' }
    }
  }

  async getChatHistory(sessionId?: string): Promise<ServiceResult<ChatMessage[]>> {
    try {
      await this.delay(200)
      
      // Return filtered history based on session if provided
      return { data: [...this.chatHistory] }
    } catch (error) {
      return { error: 'Failed to fetch chat history' }
    }
  }

  async generateInsights(videoId: string, watchProgress: number): Promise<ServiceResult<LearningInsight[]>> {
    try {
      await this.delay(600)
      
      const mockInsights: LearningInsight[] = [
        {
          id: this.generateId(),
          type: 'concept_explanation',
          title: 'HTML Structure',
          description: 'You might want to review HTML document structure before moving forward',
          priority: 'medium',
          videoContext: { videoId, timestamp: 120 },
          actionable: true
        },
        {
          id: this.generateId(),
          type: 'practice_suggestion',
          title: 'Hands-on Practice',
          description: 'Try building a simple webpage to practice these concepts',
          priority: 'high',
          actionable: true
        }
      ]
      
      return { data: mockInsights }
    } catch (error) {
      return { error: 'Failed to generate insights' }
    }
  }

  async explainConcept(concept: string, context?: VideoContext): Promise<ServiceResult<AIResponse>> {
    try {
      await this.delay(1200)
      
      const mockResponse: AIResponse = {
        content: `${concept} is a fundamental concept in web development. Let me break it down: [Detailed explanation would go here]`,
        confidence: 0.92,
        sources: [
          {
            type: 'transcript',
            reference: 'Video transcript segment',
            relevance: 0.95
          },
          {
            type: 'course_material',
            reference: 'Course documentation',
            relevance: 0.88
          }
        ],
        suggestedActions: [
          {
            type: 'replay_segment',
            label: 'Replay relevant section',
            data: { startTime: 45, endTime: 120 }
          },
          {
            type: 'review_concept',
            label: 'Review prerequisites',
            data: { concepts: ['HTML basics', 'CSS fundamentals'] }
          }
        ]
      }
      
      return { data: mockResponse }
    } catch (error) {
      return { error: 'Failed to explain concept' }
    }
  }

  async getPersonalizedSuggestions(userId: string, courseId: string): Promise<ServiceResult<string[]>> {
    try {
      await this.delay(500)
      
      const suggestions = [
        'Review HTML fundamentals before moving to CSS',
        'Practice with interactive coding exercises',
        'Join the community discussion for this lesson',
        'Take a short break - you\'ve been learning for 45 minutes!'
      ]
      
      return { data: suggestions }
    } catch (error) {
      return { error: 'Failed to get personalized suggestions' }
    }
  }

  async processTranscriptQuery(transcriptText: string, question: string): Promise<ServiceResult<AIResponse>> {
    try {
      await this.delay(900)
      
      const response: AIResponse = {
        content: `Based on the transcript: "${transcriptText.substring(0, 50)}...", here's the answer to your question: [AI-generated response]`,
        confidence: 0.87,
        sources: [
          {
            type: 'transcript',
            reference: transcriptText,
            relevance: 1.0
          }
        ]
      }
      
      return { data: response }
    } catch (error) {
      return { error: 'Failed to process transcript query' }
    }
  }

  async clearChatHistory(sessionId?: string): Promise<ServiceResult<void>> {
    try {
      await this.delay(100)
      
      this.chatHistory = []
      
      return { data: undefined }
    } catch (error) {
      return { error: 'Failed to clear chat history' }
    }
  }
}

// Export singleton instance
export const aiService: AIService = new MockAIService()