// Shared types for course and video operations
// Extracted from old course-creation-slice for use across the application

export interface VideoUpload {
  id: string
  file: File
  name: string
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'processing'
  error?: string
  url?: string
  thumbnailUrl?: string
  duration?: number
  fileSize?: number
  backblazeFileId?: string
  filename?: string
  chapterId?: string
}

export interface Chapter {
  id: string
  title: string
  order: number
  videoIds: string[]
}

export interface Video {
  id: string
  title: string
  url?: string
  thumbnailUrl?: string
  duration?: number
  order: number
  chapterId: string
  status: 'pending' | 'processing' | 'ready' | 'error'
  backblazeFileId?: string
  filename?: string
  fileSize?: number
  createdAt?: string
  updatedAt?: string
}

export interface Course {
  id: string
  title: string
  description: string
  price: number
  category: string
  level: 'beginner' | 'intermediate' | 'advanced'
  status: 'draft' | 'published' | 'archived'
  instructorId: string
  createdAt: string
  updatedAt: string
  videos?: Video[]
  chapters?: Chapter[]
}