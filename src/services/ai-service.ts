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
  courseId?: string
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
    data: {
      timestamp?: number
      segment?: { start: number; end: number }
      concept?: string
      url?: string
    }
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

export interface LearningHint {
  hint_id: string
  hint: string
  level: 'basic' | 'intermediate' | 'advanced'
  next_hint_available: boolean
  related_examples?: Array<{
    code: string
    explanation: string
  }>
}

export interface QuizQuestion {
  id: string
  type: 'multiple_choice' | 'true_false' | 'short_answer'
  question: string
  options?: string[]
  correct_answer?: number | string
  explanation: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  points: number
}

export interface GeneratedQuiz {
  quiz_id: string
  questions: QuizQuestion[]
  total_points: number
  passing_score: number
  time_limit_minutes?: number
}

export interface UsageLimits {
  subscription_plan: string
  limits: {
    daily_limit: number
    monthly_limit: number
  }
  usage: {
    daily_used: number
    monthly_used: number
    daily_remaining: number
    monthly_remaining: number
  }
  reset_times: {
    daily_reset: string
    monthly_reset: string
  }
  features: {
    gpt4_access: boolean
    code_execution: boolean
    image_generation: boolean
    priority_queue: boolean
  }
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
  // New AI Agent methods
  generateLearningHint(lessonId: string, concept: string, difficultyLevel: 'struggling' | 'comfortable' | 'advanced', previousHints?: string[]): Promise<ServiceResult<LearningHint>>
  generateQuizQuestions(lessonId: string, topics: string[], questionCount: number, difficulty: 'beginner' | 'intermediate' | 'advanced', questionTypes: ('multiple_choice' | 'true_false' | 'short_answer')[]): Promise<ServiceResult<GeneratedQuiz>>
  checkUsageLimits(): Promise<ServiceResult<UsageLimits>>
}

// Real AI Service implementation
class RealAIService implements AIService {
  private readonly baseUrl = '/api/v1/ai-assistant'
  private sessionId: string | null = null
  
  private getSessionId(): string {
    if (!this.sessionId) {
      this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }
    return this.sessionId
  }
  
  private mapResponseToMessage(response: {
    id?: string
    role?: string
    content?: string
    timestamp?: string
    suggestedActions?: Array<{
      type: string
      label: string
      data: unknown
    }>
  }): ChatMessage {
    return {
      id: response.message_id || response.id,
      content: response.response || response.message || response.content,
      role: 'assistant',
      timestamp: new Date(response.created_at || Date.now()),
      metadata: {
        confidence: response.confidence,
        videoContext: response.context,
        tokens_used: response.tokens_used,
        cached: response.cached,
        session_id: response.session_id
      }
    }
  }
  
  private handleError(error: unknown): ServiceResult<never> {
    return {
      error: error.message || 'An error occurred'
    }
  }
  
  async sendChatMessage(
    message: string,
    context?: VideoContext,
    transcriptRef?: TranscriptReference
  ): Promise<ServiceResult<ChatMessage>> {
    console.log('RealAIService.sendChatMessage called:', { message, baseUrl: this.baseUrl })
    
    try {
      const { apiClient } = await import('@/lib/api-client')
      const payload = {
        message,
        session_id: this.getSessionId(),
        context: context ? {
          video_id: context.videoId,
          timestamp: context.timestamp,
          course_id: context.courseId || undefined
        } : undefined
      }
      
      console.log('Making API request to:', `${this.baseUrl}/chat/send/`, payload)
      const response = await apiClient.post(`${this.baseUrl}/chat/send/`, payload)
      
      console.log('AI API Response:', {
        status: response.status,
        data: response.data,
        error: response.error
      })
      
      if (response.error) {
        console.log('AI API Error:', response.error)
        
        // For rate limit errors, return the complete response data
        if (response.error === 'rate_limit_exceeded' && response.data) {
          const rateLimitData = response.data
          return {
            error: 'rate_limit_exceeded',
            details: rateLimitData.details || rateLimitData,
            upgrade_required: rateLimitData.details?.upgrade_required || rateLimitData.upgrade_required || true,
            upgrade_message: rateLimitData.details?.upgrade_message || rateLimitData.upgrade_message || rateLimitData.message
          }
        }
        
        return { error: response.error }
      }
      
      const mappedMessage = this.mapResponseToMessage(response.data)
      console.log('Mapped AI Message:', mappedMessage)
      
      return {
        data: mappedMessage
      }
    } catch (error) {
      return this.handleError(error)
    }
  }
  
  async getChatHistory(sessionId?: string): Promise<ServiceResult<ChatMessage[]>> {
    try {
      const { apiClient } = await import('@/lib/api-client')
      const sid = sessionId || this.getSessionId()
      const response = await apiClient.get(`${this.baseUrl}/chat/history/${sid}/`)
      
      if (response.error) {
        return { error: response.error }
      }
      
      const messages = response.data.messages?.map((msg: {
        id?: string
        role?: string
        content?: string
        timestamp?: string
        suggestedActions?: unknown[]
      }) => ({
        id: msg.id,
        content: msg.content,
        role: msg.message_type === 'assistant' ? 'assistant' : 'user',
        timestamp: new Date(msg.created_at),
        metadata: msg.metadata
      })) || []
      
      return { data: messages }
    } catch (error) {
      return this.handleError(error)
    }
  }
  
  async generateInsights(videoId: string, watchProgress: number): Promise<ServiceResult<LearningInsight[]>> {
    try {
      const { apiClient } = await import('@/lib/api-client')
      const response = await apiClient.post(`${this.baseUrl}/insights/generate/`, {
        video_id: videoId,
        progress: watchProgress
      })
      
      if (response.error) {
        return { error: response.error }
      }
      
      return { data: response.data.insights || [] }
    } catch (error) {
      return this.handleError(error)
    }
  }
  
  async explainConcept(concept: string, context?: VideoContext): Promise<ServiceResult<AIResponse>> {
    try {
      const { apiClient } = await import('@/lib/api-client')
      const response = await apiClient.post(`${this.baseUrl}/explain/`, {
        concept,
        context
      })
      
      if (response.error) {
        return { error: response.error }
      }
      
      return { data: response.data }
    } catch (error) {
      return this.handleError(error)
    }
  }
  
  async getPersonalizedSuggestions(userId: string, courseId: string): Promise<ServiceResult<string[]>> {
    try {
      const { apiClient } = await import('@/lib/api-client')
      const response = await apiClient.post(`${this.baseUrl}/suggestions/`, {
        user_id: userId,
        course_id: courseId
      })
      
      if (response.error) {
        return { error: response.error }
      }
      
      return { data: response.data.suggestions || [] }
    } catch (error) {
      return this.handleError(error)
    }
  }
  
  async processTranscriptQuery(transcriptText: string, question: string): Promise<ServiceResult<AIResponse>> {
    try {
      const { apiClient } = await import('@/lib/api-client')
      const response = await apiClient.post(`${this.baseUrl}/transcript/search/`, {
        query: question,
        transcript_text: transcriptText,
        semantic_search: true
      })
      
      if (response.error) {
        return { error: response.error }
      }
      
      return { data: response.data }
    } catch (error) {
      return this.handleError(error)
    }
  }
  
  async clearChatHistory(sessionId?: string): Promise<ServiceResult<void>> {
    try {
      const { apiClient } = await import('@/lib/api-client')
      const sid = sessionId || this.getSessionId()
      const response = await apiClient.delete(`${this.baseUrl}/chat/history/${sid}/`)
      
      if (response.error) {
        return { error: response.error }
      }
      
      this.sessionId = null // Reset session
      return { data: undefined }
    } catch (error) {
      return this.handleError(error)
    }
  }

  async generateLearningHint(
    lessonId: string, 
    concept: string, 
    difficultyLevel: 'struggling' | 'comfortable' | 'advanced', 
    previousHints?: string[]
  ): Promise<ServiceResult<LearningHint>> {
    try {
      const { apiClient } = await import('@/lib/api-client')
      const response = await apiClient.post(`${this.baseUrl}/agents/hint/`, {
        lesson_id: lessonId,
        concept,
        difficulty_level: difficultyLevel,
        previous_hints: previousHints
      })
      
      if (response.error) {
        // For rate limit errors, return the complete response data
        if (response.error === 'rate_limit_exceeded' && response.data) {
          const rateLimitData = response.data
          return {
            error: 'rate_limit_exceeded',
            details: rateLimitData.details || rateLimitData,
            upgrade_required: rateLimitData.details?.upgrade_required || rateLimitData.upgrade_required || true,
            upgrade_message: rateLimitData.details?.upgrade_message || rateLimitData.upgrade_message || rateLimitData.message
          }
        }
        return { error: response.error }
      }
      
      return { data: response.data as LearningHint }
    } catch (error) {
      return this.handleError(error)
    }
  }

  async generateQuizQuestions(
    lessonId: string, 
    topics: string[], 
    questionCount: number, 
    difficulty: 'beginner' | 'intermediate' | 'advanced',
    questionTypes: ('multiple_choice' | 'true_false' | 'short_answer')[]
  ): Promise<ServiceResult<GeneratedQuiz>> {
    try {
      const { apiClient } = await import('@/lib/api-client')
      const response = await apiClient.post(`${this.baseUrl}/agents/quiz/`, {
        lesson_id: lessonId,
        topics,
        question_count: questionCount,
        difficulty,
        question_types: questionTypes
      })
      
      if (response.error) {
        // For rate limit errors, return the complete response data
        if (response.error === 'rate_limit_exceeded' && response.data) {
          const rateLimitData = response.data
          return {
            error: 'rate_limit_exceeded',
            details: rateLimitData.details || rateLimitData,
            upgrade_required: rateLimitData.details?.upgrade_required || rateLimitData.upgrade_required || true,
            upgrade_message: rateLimitData.details?.upgrade_message || rateLimitData.upgrade_message || rateLimitData.message
          }
        }
        return { error: response.error }
      }
      
      return { data: response.data as GeneratedQuiz }
    } catch (error) {
      return this.handleError(error)
    }
  }

  async checkUsageLimits(): Promise<ServiceResult<UsageLimits>> {
    try {
      const { apiClient } = await import('@/lib/api-client')
      const response = await apiClient.get(`${this.baseUrl}/user/check-limits/`)
      
      if (response.error) {
        // For rate limit errors, return the complete response data
        if (response.error === 'rate_limit_exceeded' && response.data) {
          const rateLimitData = response.data
          return {
            error: 'rate_limit_exceeded',
            details: rateLimitData.details || rateLimitData,
            upgrade_required: rateLimitData.details?.upgrade_required || rateLimitData.upgrade_required || true,
            upgrade_message: rateLimitData.details?.upgrade_message || rateLimitData.upgrade_message || rateLimitData.message
          }
        }
        return { error: response.error }
      }
      
      return { data: response.data as UsageLimits }
    } catch (error) {
      return this.handleError(error)
    }
  }
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

  async generateLearningHint(
    lessonId: string, 
    concept: string, 
    difficultyLevel: 'struggling' | 'comfortable' | 'advanced', 
    previousHints?: string[]
  ): Promise<ServiceResult<LearningHint>> {
    try {
      await this.delay(800)
      
      const hints = {
        'struggling': `Think about ${concept} as a way to simplify complex problems. Start with the basic definition and work your way up.`,
        'comfortable': `You're doing well with ${concept}! Try applying it to a more complex scenario to deepen your understanding.`,
        'advanced': `Since you understand ${concept} well, consider how it relates to other advanced topics and real-world applications.`
      }
      
      const hint: LearningHint = {
        hint_id: `hint_${Date.now()}`,
        hint: hints[difficultyLevel],
        level: difficultyLevel === 'struggling' ? 'basic' : difficultyLevel === 'comfortable' ? 'intermediate' : 'advanced',
        next_hint_available: true,
        related_examples: [
          {
            code: `// Example usage of ${concept}`,
            explanation: `This demonstrates how ${concept} works in practice`
          }
        ]
      }
      
      return { data: hint }
    } catch (error) {
      return { error: 'Failed to generate learning hint' }
    }
  }

  async generateQuizQuestions(
    lessonId: string, 
    topics: string[], 
    questionCount: number, 
    difficulty: 'beginner' | 'intermediate' | 'advanced',
    questionTypes: ('multiple_choice' | 'true_false' | 'short_answer')[]
  ): Promise<ServiceResult<GeneratedQuiz>> {
    try {
      await this.delay(1200)
      
      const questions: QuizQuestion[] = []
      
      for (let i = 0; i < Math.min(questionCount, 5); i++) {
        const topic = topics[i % topics.length]
        const questionType = questionTypes[i % questionTypes.length]
        
        if (questionType === 'multiple_choice') {
          questions.push({
            id: `q_${i + 1}`,
            type: 'multiple_choice',
            question: `What is the primary purpose of ${topic}?`,
            options: [
              `To manage ${topic} efficiently`,
              `To optimize ${topic} performance`,
              `To simplify ${topic} implementation`,
              `To debug ${topic} issues`
            ],
            correct_answer: 0,
            explanation: `${topic} is primarily used to manage and organize functionality efficiently.`,
            difficulty,
            points: 10
          })
        } else if (questionType === 'true_false') {
          questions.push({
            id: `q_${i + 1}`,
            type: 'true_false',
            question: `${topic} is essential for modern development.`,
            correct_answer: 'true',
            explanation: `Yes, ${topic} plays a crucial role in modern development practices.`,
            difficulty,
            points: 5
          })
        }
      }
      
      const quiz: GeneratedQuiz = {
        quiz_id: `quiz_${Date.now()}`,
        questions,
        total_points: questions.reduce((sum, q) => sum + q.points, 0),
        passing_score: Math.floor(questions.reduce((sum, q) => sum + q.points, 0) * 0.7),
        time_limit_minutes: questionCount * 2
      }
      
      return { data: quiz }
    } catch (error) {
      return { error: 'Failed to generate quiz questions' }
    }
  }

  async checkUsageLimits(): Promise<ServiceResult<UsageLimits>> {
    try {
      await this.delay(300)
      
      const limits: UsageLimits = {
        subscription_plan: 'free',
        limits: {
          daily_limit: 10,
          monthly_limit: 100
        },
        usage: {
          daily_used: 3,
          monthly_used: 25,
          daily_remaining: 7,
          monthly_remaining: 75
        },
        reset_times: {
          daily_reset: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          monthly_reset: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        features: {
          gpt4_access: false,
          code_execution: true,
          image_generation: false,
          priority_queue: false
        }
      }
      
      return { data: limits }
    } catch (error) {
      return { error: 'Failed to check usage limits' }
    }
  }
}

// Export with feature flag for progressive enhancement
const useRealAI = process.env.NEXT_PUBLIC_USE_REAL_AI === 'true'

console.log('AI Service Config:', {
  NEXT_PUBLIC_USE_REAL_AI: process.env.NEXT_PUBLIC_USE_REAL_AI,
  useRealAI,
  serviceName: useRealAI ? 'RealAIService' : 'MockAIService'
})

export const aiService: AIService = useRealAI
  ? new RealAIService()
  : new MockAIService()

// Export for testing
export { MockAIService, RealAIService }