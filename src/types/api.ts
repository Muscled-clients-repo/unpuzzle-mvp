// Standard API response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Course creation API types
export interface CreateCourseRequest {
  title: string
  description?: string
  price?: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
}

export interface CreateCourseResponse {
  course: Course
}

// Video upload API types
export interface VideoUploadRequest {
  courseId: string
  chapterId: string
  filename: string
  file: File
}

export interface VideoUploadResponse {
  video: Video
  uploadUrl: string
  fileId: string
}

// Batch operations
export interface BatchVideoUpdateRequest {
  updates: Array<{
    id: string
    filename?: string
    chapterId?: string
    order?: number
  }>
}

export interface BatchChapterUpdateRequest {
  updates: Array<{
    id: string
    title?: string
    order?: number
  }>
}

// Soft delete types
export interface PendingDelete {
  id: string
  type: 'video' | 'chapter'
  timestamp: number
}

// Import types to avoid circular dependency
import type { Course, Video } from './course'

// Re-export commonly used types for easier imports
export type { Course, Chapter, Video, UploadItem } from './course'