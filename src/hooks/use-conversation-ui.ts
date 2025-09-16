'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ConversationUIState {
  // Message threading
  expandedThreads: Set<string>
  expandThread: (messageId: string) => void
  collapseThread: (messageId: string) => void
  toggleThread: (messageId: string) => void

  // Image viewer modal
  imageViewer: {
    isOpen: boolean
    messageId: string | null
    fileIndex: number
    totalFiles: number
  }
  openImageViewer: (messageId: string, fileIndex: number, totalFiles: number) => void
  closeImageViewer: () => void
  nextImage: () => void
  previousImage: () => void

  // Message selection and bulk operations
  selectedMessages: Set<string>
  toggleMessageSelection: (messageId: string) => void
  selectAllMessages: (messageIds: string[]) => void
  clearSelection: () => void
  isMessageSelected: (messageId: string) => boolean

  // Message composition UI
  composing: {
    isExpanded: boolean
    replyToId: string | null
    editingId: string | null
  }
  startReply: (messageId: string) => void
  startEdit: (messageId: string) => void
  cancelComposing: () => void
  expandComposer: () => void
  collapseComposer: () => void

  // File upload UI
  fileUpload: {
    isDragOver: boolean
    uploadProgress: Record<string, number>
  }
  setDragOver: (isDragOver: boolean) => void
  setUploadProgress: (fileId: string, progress: number) => void
  clearUploadProgress: (fileId: string) => void

  // View preferences
  preferences: {
    compactMode: boolean
    showTimestamps: boolean
    groupByDate: boolean
    messagePageSize: number
  }
  toggleCompactMode: () => void
  toggleTimestamps: () => void
  toggleGroupByDate: () => void
  setMessagePageSize: (size: number) => void

  // Scroll and pagination
  scrollState: {
    isNearBottom: boolean
    shouldAutoScroll: boolean
    lastReadMessageId: string | null
  }
  setNearBottom: (isNear: boolean) => void
  setShouldAutoScroll: (should: boolean) => void
  setLastReadMessage: (messageId: string) => void

  // Search and filtering
  search: {
    query: string
    isActive: boolean
    results: string[]
  }
  setSearchQuery: (query: string) => void
  toggleSearch: () => void
  setSearchResults: (messageIds: string[]) => void
  clearSearch: () => void
}

/**
 * Zustand store for conversation UI state
 * Handles all UI-specific state following 3-layer SSOT pattern
 */
export const useConversationUI = create<ConversationUIState>()(
  persist(
    (set, get) => ({
      // Message threading
      expandedThreads: new Set<string>(),
      expandThread: (messageId: string) =>
        set((state) => ({
          expandedThreads: new Set([...state.expandedThreads, messageId])
        })),
      collapseThread: (messageId: string) =>
        set((state) => {
          const newSet = new Set(state.expandedThreads)
          newSet.delete(messageId)
          return { expandedThreads: newSet }
        }),
      toggleThread: (messageId: string) => {
        const { expandedThreads } = get()
        if (expandedThreads.has(messageId)) {
          get().collapseThread(messageId)
        } else {
          get().expandThread(messageId)
        }
      },

      // Image viewer modal
      imageViewer: {
        isOpen: false,
        messageId: null,
        fileIndex: 0,
        totalFiles: 0
      },
      openImageViewer: (messageId: string, fileIndex: number, totalFiles: number) =>
        set({
          imageViewer: {
            isOpen: true,
            messageId,
            fileIndex,
            totalFiles
          }
        }),
      closeImageViewer: () =>
        set({
          imageViewer: {
            isOpen: false,
            messageId: null,
            fileIndex: 0,
            totalFiles: 0
          }
        }),
      nextImage: () =>
        set((state) => ({
          imageViewer: {
            ...state.imageViewer,
            fileIndex:
              state.imageViewer.fileIndex < state.imageViewer.totalFiles - 1
                ? state.imageViewer.fileIndex + 1
                : 0
          }
        })),
      previousImage: () =>
        set((state) => ({
          imageViewer: {
            ...state.imageViewer,
            fileIndex:
              state.imageViewer.fileIndex > 0
                ? state.imageViewer.fileIndex - 1
                : state.imageViewer.totalFiles - 1
          }
        })),

      // Message selection
      selectedMessages: new Set<string>(),
      toggleMessageSelection: (messageId: string) =>
        set((state) => {
          const newSet = new Set(state.selectedMessages)
          if (newSet.has(messageId)) {
            newSet.delete(messageId)
          } else {
            newSet.add(messageId)
          }
          return { selectedMessages: newSet }
        }),
      selectAllMessages: (messageIds: string[]) =>
        set({ selectedMessages: new Set(messageIds) }),
      clearSelection: () => set({ selectedMessages: new Set() }),
      isMessageSelected: (messageId: string) => get().selectedMessages.has(messageId),

      // Message composition UI
      composing: {
        isExpanded: false,
        replyToId: null,
        editingId: null
      },
      startReply: (messageId: string) =>
        set({
          composing: {
            isExpanded: true,
            replyToId: messageId,
            editingId: null
          }
        }),
      startEdit: (messageId: string) =>
        set({
          composing: {
            isExpanded: true,
            replyToId: null,
            editingId: messageId
          }
        }),
      cancelComposing: () =>
        set({
          composing: {
            isExpanded: false,
            replyToId: null,
            editingId: null
          }
        }),
      expandComposer: () =>
        set((state) => ({
          composing: { ...state.composing, isExpanded: true }
        })),
      collapseComposer: () =>
        set((state) => ({
          composing: { ...state.composing, isExpanded: false }
        })),

      // File upload UI
      fileUpload: {
        isDragOver: false,
        uploadProgress: {}
      },
      setDragOver: (isDragOver: boolean) =>
        set((state) => ({
          fileUpload: { ...state.fileUpload, isDragOver }
        })),
      setUploadProgress: (fileId: string, progress: number) =>
        set((state) => ({
          fileUpload: {
            ...state.fileUpload,
            uploadProgress: { ...state.fileUpload.uploadProgress, [fileId]: progress }
          }
        })),
      clearUploadProgress: (fileId: string) =>
        set((state) => {
          const newProgress = { ...state.fileUpload.uploadProgress }
          delete newProgress[fileId]
          return {
            fileUpload: { ...state.fileUpload, uploadProgress: newProgress }
          }
        }),

      // View preferences
      preferences: {
        compactMode: false,
        showTimestamps: true,
        groupByDate: true,
        messagePageSize: 50
      },
      toggleCompactMode: () =>
        set((state) => ({
          preferences: { ...state.preferences, compactMode: !state.preferences.compactMode }
        })),
      toggleTimestamps: () =>
        set((state) => ({
          preferences: { ...state.preferences, showTimestamps: !state.preferences.showTimestamps }
        })),
      toggleGroupByDate: () =>
        set((state) => ({
          preferences: { ...state.preferences, groupByDate: !state.preferences.groupByDate }
        })),
      setMessagePageSize: (size: number) =>
        set((state) => ({
          preferences: { ...state.preferences, messagePageSize: size }
        })),

      // Scroll and pagination
      scrollState: {
        isNearBottom: true,
        shouldAutoScroll: true,
        lastReadMessageId: null
      },
      setNearBottom: (isNear: boolean) =>
        set((state) => ({
          scrollState: { ...state.scrollState, isNearBottom: isNear }
        })),
      setShouldAutoScroll: (should: boolean) =>
        set((state) => ({
          scrollState: { ...state.scrollState, shouldAutoScroll: should }
        })),
      setLastReadMessage: (messageId: string) =>
        set((state) => ({
          scrollState: { ...state.scrollState, lastReadMessageId: messageId }
        })),

      // Search and filtering
      search: {
        query: '',
        isActive: false,
        results: []
      },
      setSearchQuery: (query: string) =>
        set((state) => ({
          search: { ...state.search, query, isActive: query.length > 0 }
        })),
      toggleSearch: () =>
        set((state) => ({
          search: { ...state.search, isActive: !state.search.isActive }
        })),
      setSearchResults: (messageIds: string[]) =>
        set((state) => ({
          search: { ...state.search, results: messageIds }
        })),
      clearSearch: () =>
        set({
          search: { query: '', isActive: false, results: [] }
        })
    }),
    {
      name: 'conversation-ui-state',
      partialize: (state) => ({
        preferences: state.preferences,
        expandedThreads: Array.from(state.expandedThreads) // Convert Set to Array for persistence
      }),
      onRehydrate: (state) => {
        // Convert persisted arrays back to Sets
        if (state && state.expandedThreads) {
          state.expandedThreads = new Set(state.expandedThreads)
        }
        if (state && !state.selectedMessages) {
          state.selectedMessages = new Set()
        }
      }
    }
  )
)

/**
 * Specialized hook for instructor view UI state
 */
export function useInstructorConversationUI() {
  const ui = useConversationUI()

  // Instructor-specific UI helpers
  const startInstructorResponse = (targetDate: string) => {
    ui.expandComposer()
    // Additional instructor-specific logic could go here
  }

  const canEditResponse = (messageId: string, senderId: string, currentUserId: string) => {
    return senderId === currentUserId // Instructors can edit their own responses
  }

  return {
    ...ui,
    startInstructorResponse,
    canEditResponse
  }
}

/**
 * Specialized hook for student view UI state
 */
export function useStudentConversationUI() {
  const ui = useConversationUI()

  // Student-specific UI helpers
  const startDailyNote = (targetDate: string) => {
    ui.expandComposer()
    // Additional student-specific logic could go here
  }

  const canAddActivity = () => {
    return true // Students can always add activities
  }

  return {
    ...ui,
    startDailyNote,
    canAddActivity
  }
}