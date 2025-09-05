/**
 * Normalized state types for course management
 * This provides a single source of truth for all course-related data
 * Following normalization principles to eliminate data duplication
 */

// Video entity - single source of truth for video data
export interface NormalizedVideo {
  id: string
  title: string
  url?: string
  thumbnailUrl?: string
  duration?: number
  order: number  // Single source of truth for ordering
  chapterId: string
  courseId: string
  status: 'pending' | 'uploading' | 'processing' | 'ready' | 'error'
  uploadProgress?: number
  error?: string
  // Backblaze/storage fields
  backblazeFileId?: string
  filename?: string
  fileSize?: number
  uploadedAt?: string
  // Additional metadata
  createdAt?: string
  updatedAt?: string
}

// Chapter entity - contains references to videos via IDs
export interface NormalizedChapter {
  id: string
  title: string
  description?: string
  courseId: string
  videoIds: string[]  // Just IDs, not full video objects
  order: number  // Order within the course
  createdAt?: string
  updatedAt?: string
}

// Course entity - top level container
export interface NormalizedCourse {
  id: string
  title: string
  description?: string
  instructorId: string
  chapterIds: string[]  // Just IDs, not full chapter objects
  status: 'draft' | 'published' | 'under_review'
  // Course metadata
  thumbnailUrl?: string
  price?: number
  currency?: string
  category?: string
  level?: 'beginner' | 'intermediate' | 'advanced'
  tags?: string[]
  // Statistics
  studentsCount?: number
  completionRate?: number
  rating?: number
  // Timestamps
  createdAt?: string
  updatedAt?: string
  publishedAt?: string
}

// The normalized state structure
export interface NormalizedState {
  // Entity maps - each entity stored once by ID
  videos: Record<string, NormalizedVideo>
  chapters: Record<string, NormalizedChapter>
  courses: Record<string, NormalizedCourse>
  
  // NO videoOrder array - each video has its own 'order' field
  // This is the single source of truth for ordering
  
  // Track which course is currently being edited/created
  activeCourseId?: string
  
  // UI state (not entity data)
  isLoading: boolean
  error: string | null
  hasChanges: boolean
}

// Helper type for video upload state (used during upload process)
export interface VideoUploadState extends Omit<NormalizedVideo, 'id'> {
  file?: File
  localId?: string  // Temporary ID before server assigns real ID
}

// Selector return types (denormalized views for UI)
export interface ChapterWithVideos extends Omit<NormalizedChapter, 'videoIds'> {
  videos: NormalizedVideo[]
}

export interface CourseWithChapters extends Omit<NormalizedCourse, 'chapterIds'> {
  chapters: ChapterWithVideos[]
}

// Action payload types
export interface ReorderVideoPayload {
  videoId: string
  newOrder: number
  chapterId?: string  // Optional if moving to different chapter
}

export interface MoveVideoPayload {
  videoId: string
  fromChapterId: string
  toChapterId: string
  newOrder: number
}

export interface UpdateVideoPayload {
  videoId: string
  updates: Partial<NormalizedVideo>
}

export interface UpdateChapterPayload {
  chapterId: string
  updates: Partial<NormalizedChapter>
}

export interface UpdateCoursePayload {
  courseId: string
  updates: Partial<NormalizedCourse>
}

// Service response types (from API/Supabase)
export interface VideoResponse {
  id: string
  title: string
  url?: string
  thumbnail_url?: string
  duration?: number
  order: number
  chapter_id: string
  course_id: string
  status: string
  backblaze_file_id?: string
  filename?: string
  file_size?: number
  created_at: string
  updated_at: string
}

export interface ChapterResponse {
  id: string
  title: string
  description?: string
  course_id: string
  order: number
  created_at: string
  updated_at: string
  videos?: VideoResponse[]  // May include nested videos
}

export interface CourseResponse {
  id: string
  title: string
  description?: string
  instructor_id: string
  status: string
  thumbnail_url?: string
  price?: number
  currency?: string
  category?: string
  level?: string
  tags?: string[]
  students_count?: number
  completion_rate?: number
  rating?: number
  created_at: string
  updated_at: string
  published_at?: string
  chapters?: ChapterResponse[]  // May include nested chapters
}

// Utility type for normalized entities
export type NormalizedEntity = NormalizedVideo | NormalizedChapter | NormalizedCourse

// Type guards
export const isNormalizedVideo = (entity: NormalizedEntity): entity is NormalizedVideo => {
  return 'chapterId' in entity && 'status' in entity
}

export const isNormalizedChapter = (entity: NormalizedEntity): entity is NormalizedChapter => {
  return 'videoIds' in entity && !('chapterIds' in entity)
}

export const isNormalizedCourse = (entity: NormalizedEntity): entity is NormalizedCourse => {
  return 'chapterIds' in entity && 'instructorId' in entity
}