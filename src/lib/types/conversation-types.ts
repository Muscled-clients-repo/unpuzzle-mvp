// Unified conversation system types

export interface Conversation {
  id: string
  student_id: string
  instructor_id: string | null
  status: 'active' | 'paused' | 'archived'
  created_at: string
  updated_at: string

  // Computed fields from joins
  student_name?: string
  instructor_name?: string
  student_email?: string
  instructor_email?: string
}

export interface ConversationMessage {
  id: string
  conversation_id: string
  sender_id: string
  message_type: 'daily_note' | 'instructor_response' | 'activity' | 'milestone'
  content: string
  metadata: Record<string, any>
  target_date?: string
  reply_to_id?: string
  created_at: string
  updated_at: string

  // Computed fields from joins
  sender_name?: string
  sender_role?: 'student' | 'instructor'
  attachments?: ConversationAttachment[]
  replies?: ConversationMessage[]
}

export interface ConversationAttachment {
  id: string
  message_id: string
  filename: string
  original_filename: string
  file_size?: number
  mime_type?: string
  cdn_url?: string
  backblaze_file_id?: string
  storage_path?: string
  upload_status: 'pending' | 'uploading' | 'completed' | 'failed'
  created_at: string
}

// Request/Response types for API actions

export interface CreateMessageRequest {
  studentId: string
  conversationId?: string
  messageType: 'daily_note' | 'instructor_response' | 'activity' | 'milestone'
  content: string
  targetDate?: string
  replyToId?: string
  metadata?: Record<string, any>
}

export interface ConversationData {
  conversation: Conversation
  messages: ConversationMessage[]
  totalCount: number
  hasMore: boolean
}

export interface ConversationFilters {
  startDate?: string
  endDate?: string
  messageType?: string[]
  limit?: number
  offset?: number
  instructorId?: string
}

export interface StudentGoalProgress {
  student_id: string
  student_name: string
  total_days: number
  active_days: number
  total_messages: number
  last_activity: string
  response_rate: number
  engagement_score: number
}

// Migration-related types

export interface MigrationStatus {
  id: string
  migration_name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  started_at?: string
  completed_at?: string
  details: Record<string, any>
  created_at: string
}

export interface MigrationResult {
  operation: string
  count_migrated: number
  status: 'SUCCESS' | 'FAIL'
}

// Form state types

export interface MessageFormData {
  messageText: string
  attachedFiles: File[]
  messageType: 'daily_note' | 'instructor_response' | 'activity' | 'milestone'
  targetDate?: string
  replyToId?: string
  metadata: Record<string, any>
}

// UI state types

export interface ConversationUIPreferences {
  compactMode: boolean
  showTimestamps: boolean
  groupByDate: boolean
  messagePageSize: number
}

export interface ImageViewerState {
  isOpen: boolean
  messageId: string | null
  fileIndex: number
  totalFiles: number
}

export interface ComposingState {
  isExpanded: boolean
  replyToId: string | null
  editingId: string | null
}

export interface FileUploadState {
  isDragOver: boolean
  uploadProgress: Record<string, number>
}

export interface SearchState {
  query: string
  isActive: boolean
  results: string[]
}