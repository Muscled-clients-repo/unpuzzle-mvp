// Base course entity
export interface Course {
  id: string
  title: string
  description: string | null
  price: number | null
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  status: 'draft' | 'published' | 'archived'
  instructor_id: string
  created_at: string
  updated_at: string
  
  // Computed fields (not stored in DB)
  chapters?: Chapter[]
  totalVideos?: number
  totalDuration?: number
  thumbnailUrl?: string
}

// Virtual chapter (derived from video chapter_id)
export interface Chapter {
  id: string // Format: 'chapter-{timestamp}' or 'chapter-{number}'
  title: string
  courseId: string
  order: number
  videos: Video[]
  videoCount: number
  totalDuration?: number
  
  // UI state (not stored in server)
  isExpanded?: boolean
}

// Video entity
export interface Video {
  id: string
  filename: string
  originalFilename: string
  course_id: string
  chapter_id: string
  order: number
  duration: number | null
  size: number
  format: string
  status: 'uploading' | 'processing' | 'ready' | 'error'
  
  // Backblaze storage
  backblaze_file_id: string | null
  backblaze_url: string | null
  
  // Metadata
  created_at: string
  updated_at: string
  
  // Computed fields
  thumbnailUrl?: string
  streamUrl?: string
  downloadUrl?: string
}

// Course creation wizard data
export interface CourseCreationData {
  // Step 1: Basic info
  title: string
  description: string
  price: number | null
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  
  // Step 2: Content structure (before upload)
  plannedChapters: Array<{
    id: string
    title: string
    plannedVideos: Array<{
      filename: string
      file: File
    }>
  }>
  
  // Step 3: Upload tracking
  uploads: Record<string, UploadItem>
}

export interface UploadItem {
  id: string
  file: File
  filename: string
  chapterId: string
  progress: number
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error'
  backblazeFileId?: string
  videoId?: string // Set after DB insert
  error?: string
}