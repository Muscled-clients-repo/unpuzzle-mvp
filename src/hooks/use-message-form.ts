'use client'

import { useState, useCallback } from 'react'

export interface MessageFormState {
  messageText: string
  attachedFiles: File[]
  messageType: 'daily_note' | 'instructor_response' | 'activity' | 'milestone'
  targetDate?: string
  replyToId?: string
  metadata: Record<string, any>
}

export interface MessageFormActions {
  setMessageText: (text: string) => void
  setAttachedFiles: (files: File[]) => void
  addFiles: (files: File[]) => void
  removeFile: (index: number) => void
  setMessageType: (type: MessageFormState['messageType']) => void
  setTargetDate: (date: string) => void
  setReplyToId: (id: string | undefined) => void
  setMetadata: (metadata: Record<string, any>) => void
  updateMetadata: (key: string, value: any) => void
  resetForm: () => void
  isDirty: boolean
  isValid: boolean
}

/**
 * Form state hook for message composition
 * Handles all input state and validation for unified message creation
 */
export function useMessageForm(initialValues?: Partial<MessageFormState>): MessageFormState & MessageFormActions {
  const [messageText, setMessageText] = useState(initialValues?.messageText || '')
  const [attachedFiles, setAttachedFiles] = useState<File[]>(initialValues?.attachedFiles || [])
  const [messageType, setMessageType] = useState<MessageFormState['messageType']>(
    initialValues?.messageType || 'daily_note'
  )
  const [targetDate, setTargetDate] = useState(initialValues?.targetDate)
  const [replyToId, setReplyToId] = useState(initialValues?.replyToId)
  const [metadata, setMetadata] = useState<Record<string, any>>(initialValues?.metadata || {})

  // File management functions
  const addFiles = useCallback((newFiles: File[]) => {
    setAttachedFiles(prev => [...prev, ...newFiles])
  }, [])

  const removeFile = useCallback((index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Metadata management
  const updateMetadata = useCallback((key: string, value: any) => {
    setMetadata(prev => ({ ...prev, [key]: value }))
  }, [])

  // Form reset
  const resetForm = useCallback(() => {
    setMessageText('')
    setAttachedFiles([])
    setMessageType('daily_note')
    setTargetDate(undefined)
    setReplyToId(undefined)
    setMetadata({})
  }, [])

  // Computed properties
  const isDirty = messageText.trim() !== '' || attachedFiles.length > 0
  const isValid = messageText.trim() !== '' || attachedFiles.length > 0

  return {
    // State
    messageText,
    attachedFiles,
    messageType,
    targetDate,
    replyToId,
    metadata,

    // Actions
    setMessageText,
    setAttachedFiles,
    addFiles,
    removeFile,
    setMessageType,
    setTargetDate,
    setReplyToId,
    setMetadata,
    updateMetadata,
    resetForm,

    // Computed
    isDirty,
    isValid
  }
}

/**
 * Specialized hook for daily note composition
 */
export function useDailyNoteForm(targetDate?: string) {
  return useMessageForm({
    messageType: 'daily_note',
    targetDate: targetDate || new Date().toISOString().split('T')[0]
  })
}

/**
 * Specialized hook for instructor response composition
 */
export function useInstructorResponseForm(targetDate?: string, replyToId?: string) {
  return useMessageForm({
    messageType: 'instructor_response',
    targetDate,
    replyToId
  })
}

/**
 * Hook for quick response templates (instructor responses)
 */
export function useResponseTemplates() {
  const templates = [
    {
      id: 'encourage',
      label: '🌟 Encourage',
      content: 'Great progress! Keep up the excellent work. Your dedication is really showing in your results.'
    },
    {
      id: 'assign',
      label: '📋 Assign',
      content: 'I\'d like you to focus on [specific area] next. This will help accelerate your progress toward your goal.'
    },
    {
      id: 'call',
      label: '📞 Call',
      content: 'Let\'s schedule a quick 15-minute call to discuss your progress and next steps. When works best for you?'
    },
    {
      id: 'clarify',
      label: '❓ Clarify',
      content: 'Could you provide more details about [specific topic]? This will help me give you better guidance.'
    },
    {
      id: 'resource',
      label: '📚 Resource',
      content: 'I\'ve attached some resources that should help with what you\'re working on. Let me know if you have questions!'
    }
  ]

  const applyTemplate = useCallback((templateId: string, setMessageText: (text: string) => void) => {
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setMessageText(template.content)
    }
  }, [templates])

  return {
    templates,
    applyTemplate
  }
}

/**
 * Hook for handling file drag and drop
 */
export function useFileDropZone(onFilesAdded: (files: File[]) => void) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    if (e.dataTransfer.files) {
      const files = Array.from(e.dataTransfer.files)
      onFilesAdded(files)
    }
  }, [onFilesAdded])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      onFilesAdded(files)
      // Clear input for repeated selections
      e.target.value = ''
    }
  }, [onFilesAdded])

  const openFilePicker = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = 'image/*,application/pdf,.txt,.doc,.docx'
    input.onchange = handleFileInput
    input.click()
  }, [handleFileInput])

  return {
    isDragOver,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileInput,
    openFilePicker
  }
}