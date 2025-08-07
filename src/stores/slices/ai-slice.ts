import { StateCreator } from 'zustand'
import { AIState, AIActions, ChatMessage, TranscriptReference, VideoContext } from '@/types/app-types'

export interface AISlice extends AIState, AIActions {}

const initialAIState: AIState = {
  chatMessages: [],
  transcriptReferences: [],
  isProcessing: false,
  activeInteractions: 0,
  metrics: {
    totalInteractions: 0,
    hintsGenerated: 0,
    quizzesCompleted: 0,
    reflectionsSubmitted: 0,
  },
}

export const createAISlice: StateCreator<AISlice> = (set, get) => ({
  ...initialAIState,

  addChatMessage: (content: string, context?: VideoContext) => {
    // Determine message type based on current state or context
    const state = get()
    const isAIResponse = state.chatMessages.length > 0 && 
                        state.chatMessages[state.chatMessages.length - 1]?.type === 'user'
    
    const message: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      content,
      timestamp: new Date(),
      type: isAIResponse ? 'ai' : 'user',
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
})