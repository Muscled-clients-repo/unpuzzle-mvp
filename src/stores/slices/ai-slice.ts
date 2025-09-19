import { StateCreator } from 'zustand'
import { AIMessage, TranscriptReference, VideoSegment } from '@/types/domain'
import { aiService, type VideoContext as ServiceVideoContext, type TranscriptReference as ServiceTranscriptReference } from '@/services'
import { validateChatMessage, defaultRateLimiter } from '@/utils/validation'

// Local types for this slice
interface AIState {
  chatMessages: AIMessage[]
  transcriptReferences: TranscriptReference[]
  isProcessing: boolean
  activeInteractions: number
  error: string | null
  metrics: {
    totalInteractions: number
    quizzesCompleted: number
    reflectionsSubmitted: number
  }
}

interface AIActions {
  sendChatMessage: (content: string, context?: VideoSegment, transcriptRef?: TranscriptReference) => Promise<void>
  loadChatHistory: (sessionId?: string) => Promise<void>
  clearChatHistory: (sessionId?: string) => Promise<void>
  addChatMessage: (content: string, context?: VideoSegment, type?: 'user' | 'ai') => void
  addTranscriptReference: (ref: Omit<TranscriptReference, 'id' | 'timestamp'>) => void
  setIsProcessing: (isProcessing: boolean) => void
  incrementInteractions: () => void
  clearChat: () => void
  removeTranscriptReference: (id: string) => void
  clearError: () => void
}

export interface AISlice extends AIState, AIActions {}

const initialAIState: AIState = {
  chatMessages: [],
  transcriptReferences: [],
  isProcessing: false,
  activeInteractions: 0,
  error: null,
  metrics: {
    totalInteractions: 0,
    quizzesCompleted: 0,
    reflectionsSubmitted: 0,
  },
}

export const createAISlice: StateCreator<AISlice> = (set, get) => ({
  ...initialAIState,

  // Service-based actions
  sendChatMessage: async (content: string, context?: VideoSegment, transcriptRef?: TranscriptReference) => {
    // Validate and sanitize input
    const validation = validateChatMessage(content)
    if (!validation.isValid) {
      set({ 
        error: validation.errors.join(', '),
        isProcessing: false 
      })
      return
    }
    
    // Check rate limiting
    const userId = 'user-default' // In production, use actual user ID
    if (!defaultRateLimiter.isAllowed(userId)) {
      set({ 
        error: 'Too many messages. Please wait a moment before sending another.',
        isProcessing: false 
      })
      return
    }
    
    set({ isProcessing: true, error: null })
    
    // Add user message with sanitized content
    const userMessage: AIMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      content: validation.sanitized,
      timestamp: new Date().toISOString(),
      role: 'user',
      videoContext: context,
    }
    
    set((state) => ({
      chatMessages: [...state.chatMessages, userMessage],
      metrics: {
        ...state.metrics,
        totalInteractions: state.metrics.totalInteractions + 1,
      },
    }))
    
    try {
      // Convert to service types
      const serviceContext: ServiceVideoContext | undefined = context ? {
        videoId: context.videoId,
        timestamp: context.inPoint || 0,
        transcript: context.transcript
      } : undefined
      
      const serviceTranscriptRef: ServiceTranscriptReference | undefined = transcriptRef ? {
        id: transcriptRef.id,
        text: transcriptRef.text,
        startTime: transcriptRef.startTime,
        endTime: transcriptRef.endTime,
        videoId: transcriptRef.videoId
      } : undefined
      
      // Get AI response
      const result = await aiService.sendChatMessage(content, serviceContext, serviceTranscriptRef)
      
      if (result.error) {
        set({ isProcessing: false, error: result.error })
        return
      }
      
      if (result.data) {
        const aiMessage: AIMessage = {
          id: result.data.id,
          content: result.data.content,
          timestamp: result.data.timestamp,
          role: 'assistant',
          videoContext: context
        }
        
        set((state) => ({
          chatMessages: [...state.chatMessages, aiMessage],
          isProcessing: false,
          error: null
        }))
      }
    } catch (error) {
      set({ 
        isProcessing: false, 
        error: error instanceof Error ? error.message : 'Failed to send message'
      })
    }
  },

  loadChatHistory: async (sessionId?: string) => {
    set({ isProcessing: true, error: null })
    
    try {
      const result = await aiService.getChatHistory(sessionId)
      
      if (result.error) {
        set({ isProcessing: false, error: result.error })
        return
      }
      
      if (result.data) {
        // Convert service messages to store format
        const messages: AIMessage[] = result.data.map(msg => ({
          id: msg.id,
          content: msg.content,
          timestamp: msg.timestamp,
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          videoContext: msg.metadata?.videoContext ? {
            videoId: msg.metadata.videoContext.videoId,
            inPoint: msg.metadata.videoContext.timestamp || 0,
            outPoint: (msg.metadata.videoContext.timestamp || 0) + (msg.metadata.videoContext.duration || 0),
            purpose: 'ai-context' as const
          } : undefined
        }))
        
        set({ chatMessages: messages, isProcessing: false, error: null })
      }
    } catch (error) {
      set({ 
        isProcessing: false, 
        error: error instanceof Error ? error.message : 'Failed to load chat history'
      })
    }
  },

  clearChatHistory: async (sessionId?: string) => {
    await aiService.clearChatHistory(sessionId)
    set({
      chatMessages: [],
      transcriptReferences: [],
    })
  },

  // Legacy direct actions (kept for compatibility)
  addChatMessage: (content: string, context?: VideoSegment, type: 'user' | 'ai' = 'user') => {
    // Validate and sanitize input
    const validation = validateChatMessage(content)
    if (!validation.isValid) {
      set({ error: validation.errors.join(', ') })
      return
    }
    
    const message: AIMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      content: validation.sanitized,
      timestamp: new Date().toISOString(),
      role: type === 'ai' ? 'assistant' : 'user',
      videoContext: context,
    }
    
    set((state) => ({
      chatMessages: [...state.chatMessages, message],
      metrics: {
        ...state.metrics,
        totalInteractions: state.metrics.totalInteractions + 1,
      },
    }))
  },

  addTranscriptReference: (ref: Omit<TranscriptReference, 'id' | 'timestamp'>) => {
    const reference: TranscriptReference = {
      ...ref,
      id: `ref-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString(),
    }
    
    set((state) => ({
      transcriptReferences: [...state.transcriptReferences, reference],
    }))
  },

  setIsProcessing: (isProcessing: boolean) =>
    set({ isProcessing }),

  incrementInteractions: () =>
    set((state) => ({
      activeInteractions: state.activeInteractions + 1,
    })),

  clearChat: () =>
    set({
      chatMessages: [],
      transcriptReferences: [],
    }),

  removeTranscriptReference: (id: string) =>
    set((state) => ({
      transcriptReferences: state.transcriptReferences.filter(ref => ref.id !== id),
    })),

  clearError: () =>
    set({ error: null }),
})