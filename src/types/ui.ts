// UI-specific types for Zustand stores
export interface DragItem {
  id: string
  type: 'video' | 'chapter'
  sourceChapterId?: string
  originalIndex: number
}

export interface DropTarget {
  id: string
  type: 'chapter' | 'chapter-content'
  chapterId?: string
  insertIndex?: number
}

export interface EditingState {
  type: 'course' | 'chapter' | 'video' | null
  id: string | null
  field?: string // For specific field editing
}

export interface ModalState {
  type: 'video-preview' | 'delete-confirmation' | 'upload-settings' | null
  data?: unknown
}

export interface ValidationError {
  field: string
  message: string
}

export interface FormState {
  isDirty: boolean
  isValid: boolean
  errors: ValidationError[]
}