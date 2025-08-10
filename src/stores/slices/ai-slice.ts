import { StateCreator } from 'zustand'
import { AIState, AIActions, ChatMessage, TranscriptReference, VideoContext } from '@/types/app-types'
import { aiService, type VideoContext as ServiceVideoContext, type TranscriptReference as ServiceTranscriptReference } from '@/services'
import { validateChatMessage, defaultRateLimiter } from '@/utils/validation'

export interface AISlice extends AIState, AIActions {}

const initialAIState: AIState = {
  chatMessages: [],
  transcriptReferences: [],
  isProcessing: false,
  activeInteractions: 0,
  error: null,
  metrics: {
    totalInteractions: 0,
    hintsGenerated: 0,
    quizzesCompleted: 0,
    reflectionsSubmitted: 0,
  },
}

export const createAISlice: StateCreator<AISlice> = (set, get) => ({
  ...initialAIState,

  // Service-based actions
  sendChatMessage: async (content: string, context?: VideoContext, transcriptRef?: TranscriptReference) => {
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
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      content: validation.sanitized,
      timestamp: new Date(),
      type: 'user',
      context,
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
        videoId: context.videoId || '',
        timestamp: context.timestamp || 0,
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
        const aiMessage: ChatMessage = {
          id: result.data.id,
          content: result.data.content,
          timestamp: result.data.timestamp,
          type: 'ai',
          context
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
        const messages: ChatMessage[] = result.data.map(msg => ({
          id: msg.id,
          content: msg.content,
          timestamp: msg.timestamp,
          type: msg.role === 'assistant' ? 'ai' : 'user',
          context: msg.metadata?.videoContext ? {
            videoId: msg.metadata.videoContext.videoId,
            timestamp: msg.metadata.videoContext.timestamp,
            duration: msg.metadata.videoContext.duration,
            title: msg.metadata.videoContext.title
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
  addChatMessage: (content: string, context?: VideoContext, type: 'user' | 'ai' = 'user') => {
    // Validate and sanitize input
    const validation = validateChatMessage(content)
    if (!validation.isValid) {
      set({ error: validation.errors.join(', ') })
      return
    }
    
    const message: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      content: validation.sanitized,
      timestamp: new Date(),
      type,
      context,
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
      timestamp: new Date(),
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