/**
 * Normalized course state slice
 * This runs PARALLEL to existing course-creation-slice
 * We'll gradually migrate features to use this normalized state
 */

import { StateCreator } from 'zustand'
import {
  NormalizedState,
  NormalizedVideo,
  NormalizedChapter,
  NormalizedCourse,
  ReorderVideoPayload,
  MoveVideoPayload,
  UpdateVideoPayload,
  UpdateChapterPayload,
  UpdateCoursePayload,
} from '@/types/normalized'

// Initial empty normalized state
const initialNormalizedState: NormalizedState = {
  videos: {},
  chapters: {},
  courses: {},
  activeCourseId: undefined,
  isLoading: false,
  error: null,
  hasChanges: false,
}

// Slice interface
export interface NormalizedCourseSlice {
  // The normalized state
  normalizedState: NormalizedState
  
  // Basic setters for migration
  setNormalizedState: (state: NormalizedState) => void
  resetNormalizedState: () => void
  
  // Course operations
  setNormalizedCourse: (course: any) => void // Use any for now during migration
  updateNormalizedCourse: (payload: UpdateCoursePayload) => void
  
  // Chapter operations
  addNormalizedChapter: (chapter: NormalizedChapter) => void
  updateNormalizedChapter: (payload: UpdateChapterPayload) => void
  removeNormalizedChapter: (chapterId: string) => void
  
  // Video operations
  addNormalizedVideo: (video: NormalizedVideo) => void
  updateNormalizedVideo: (payload: UpdateVideoPayload) => void
  removeNormalizedVideo: (videoId: string) => void
  
  // Reordering operations (THE KEY FIX)
  reorderVideoNormalized: (payload: ReorderVideoPayload) => void
  moveVideoToChapter: (payload: MoveVideoPayload) => void
  
  // Bulk operations for migration
  normalizeVideos: (videos: any[]) => void
  normalizeChapters: (chapters: any[]) => void
  
  // UI state
  setNormalizedLoading: (loading: boolean) => void
  setNormalizedError: (error: string | null) => void
  setNormalizedHasChanges: (hasChanges: boolean) => void
}

// Create the slice
export const createNormalizedCourseSlice: StateCreator<
  NormalizedCourseSlice,
  [],
  [],
  NormalizedCourseSlice
> = (set, get) => ({
  // Initialize with empty state
  normalizedState: initialNormalizedState,
  
  // Basic state management
  setNormalizedState: (state) => set({ normalizedState: state }),
  resetNormalizedState: () => set({ normalizedState: initialNormalizedState }),
  
  // Course operations
  setNormalizedCourse: (course) => {
    
    set((state) => {
      const courseId = course.id || crypto.randomUUID()
      
      // Create normalized course
      const normalizedCourse: NormalizedCourse = {
        id: courseId,
        title: course.title || '',
        description: course.description,
        instructorId: course.instructor_id || course.instructorId,
        chapterIds: [],
        status: course.status || 'draft',
        thumbnailUrl: course.thumbnail_url || course.thumbnailUrl,
        price: course.price,
        currency: course.currency,
        category: course.category,
        level: course.level,
        tags: course.tags,
        studentsCount: course.students_count || course.studentsCount || 0,
        completionRate: course.completion_rate || course.completionRate || 0,
        rating: course.rating,
        createdAt: course.created_at || course.createdAt,
        updatedAt: course.updated_at || course.updatedAt,
        publishedAt: course.published_at || course.publishedAt,
      }
      
      return {
        normalizedState: {
          ...state.normalizedState,
          courses: {
            ...state.normalizedState.courses,
            [courseId]: normalizedCourse,
          },
          activeCourseId: courseId,
        },
      }
    })
  },
  
  updateNormalizedCourse: (payload) => {
    set((state) => {
      const course = state.normalizedState.courses[payload.courseId]
      if (!course) return state
      
      return {
        normalizedState: {
          ...state.normalizedState,
          courses: {
            ...state.normalizedState.courses,
            [payload.courseId]: { ...course, ...payload.updates },
          },
          hasChanges: true,
        },
      }
    })
  },
  
  // Chapter operations
  addNormalizedChapter: (chapter) => {
    set((state) => ({
      normalizedState: {
        ...state.normalizedState,
        chapters: {
          ...state.normalizedState.chapters,
          [chapter.id]: chapter,
        },
        hasChanges: true,
      },
    }))
  },
  
  updateNormalizedChapter: (payload) => {
    set((state) => {
      const chapter = state.normalizedState.chapters[payload.chapterId]
      if (!chapter) return state
      
      return {
        normalizedState: {
          ...state.normalizedState,
          chapters: {
            ...state.normalizedState.chapters,
            [payload.chapterId]: { ...chapter, ...payload.updates },
          },
          hasChanges: true,
        },
      }
    })
  },
  
  removeNormalizedChapter: (chapterId) => {
    set((state) => {
      const { [chapterId]: removed, ...remainingChapters } = state.normalizedState.chapters
      
      // Remove chapter ID from course
      const courseId = state.normalizedState.activeCourseId
      if (courseId) {
        const course = state.normalizedState.courses[courseId]
        if (course) {
          course.chapterIds = course.chapterIds.filter(id => id !== chapterId)
        }
      }
      
      return {
        normalizedState: {
          ...state.normalizedState,
          chapters: remainingChapters,
          hasChanges: true,
        },
      }
    })
  },
  
  // Video operations
  addNormalizedVideo: (video) => {
    set((state) => {
      // Add video to the videos map
      const newState = {
        normalizedState: {
          ...state.normalizedState,
          videos: {
            ...state.normalizedState.videos,
            [video.id]: video,
          },
          hasChanges: true,
        },
      }
      
      // Add video ID to its chapter
      if (video.chapterId && state.normalizedState.chapters[video.chapterId]) {
        const chapter = state.normalizedState.chapters[video.chapterId]
        if (!chapter.videoIds.includes(video.id)) {
          chapter.videoIds.push(video.id)
        }
      }
      
      return newState
    })
  },
  
  updateNormalizedVideo: (payload) => {
    set((state) => {
      const video = state.normalizedState.videos[payload.videoId]
      if (!video) return state
      
      return {
        normalizedState: {
          ...state.normalizedState,
          videos: {
            ...state.normalizedState.videos,
            [payload.videoId]: { ...video, ...payload.updates },
          },
          hasChanges: true,
        },
      }
    })
  },
  
  removeNormalizedVideo: (videoId) => {
    set((state) => {
      const video = state.normalizedState.videos[videoId]
      if (!video) return state
      
      const { [videoId]: removed, ...remainingVideos } = state.normalizedState.videos
      
      // Remove video ID from its chapter
      if (video.chapterId && state.normalizedState.chapters[video.chapterId]) {
        const chapter = state.normalizedState.chapters[video.chapterId]
        chapter.videoIds = chapter.videoIds.filter(id => id !== videoId)
      }
      
      return {
        normalizedState: {
          ...state.normalizedState,
          videos: remainingVideos,
          hasChanges: true,
        },
      }
    })
  },
  
  // THE FIX: Reordering with single source of truth
  reorderVideoNormalized: (payload) => {
    
    set((state) => {
      const video = state.normalizedState.videos[payload.videoId]
      if (!video) {
        return state
      }
      
      
      // Simple: just update the order field
      // No array manipulation needed!
      const updatedState = {
        normalizedState: {
          ...state.normalizedState,
          videos: {
            ...state.normalizedState.videos,
            [payload.videoId]: {
              ...video,
              order: payload.newOrder,
              chapterId: payload.chapterId || video.chapterId,
            },
          },
          hasChanges: true,
        },
      }
      
      
      return updatedState
    })
  },
  
  // Move video between chapters
  moveVideoToChapter: (payload) => {
    
    set((state) => {
      const video = state.normalizedState.videos[payload.videoId]
      if (!video) return state
      
      const fromChapter = state.normalizedState.chapters[payload.fromChapterId]
      const toChapter = state.normalizedState.chapters[payload.toChapterId]
      
      if (!fromChapter || !toChapter) return state
      
      // Update chapter ID arrays
      fromChapter.videoIds = fromChapter.videoIds.filter(id => id !== payload.videoId)
      if (!toChapter.videoIds.includes(payload.videoId)) {
        toChapter.videoIds.push(payload.videoId)
      }
      
      // Update video's chapter and order
      return {
        normalizedState: {
          ...state.normalizedState,
          videos: {
            ...state.normalizedState.videos,
            [payload.videoId]: {
              ...video,
              chapterId: payload.toChapterId,
              order: payload.newOrder,
            },
          },
          hasChanges: true,
        },
      }
    })
  },
  
  // Bulk operations for migration
  normalizeVideos: (videos) => {
    
    set((state) => {
      const normalizedVideos: Record<string, NormalizedVideo> = {}
      
      videos.forEach((video: any) => {
        const id = video.id || crypto.randomUUID()
        
        // Map status from old state to normalized state
        let normalizedStatus: NormalizedVideo['status'] = 'pending'
        if (video.status === 'complete') {
          normalizedStatus = 'ready'
        } else if (video.status === 'uploading') {
          normalizedStatus = 'uploading'
        } else if (video.status === 'processing') {
          normalizedStatus = 'processing'
        } else if (video.status === 'error' || video.status === 'failed') {
          normalizedStatus = 'error'
        } else if (video.status === 'ready') {
          normalizedStatus = 'ready'
        }
        
        normalizedVideos[id] = {
          id,
          title: video.title || video.name || '',
          url: video.url || video.video_url || video.videoUrl,
          thumbnailUrl: video.thumbnail_url || video.thumbnailUrl,
          duration: video.duration,
          order: video.order !== undefined ? video.order : 0,
          chapterId: video.chapter_id || video.chapterId || '',
          courseId: video.course_id || video.courseId || '',
          status: normalizedStatus,
          uploadProgress: video.progress || video.uploadProgress,
          error: video.error,
          backblazeFileId: video.backblaze_file_id || video.backblazeFileId,
          filename: video.filename,
          fileSize: video.file_size || video.fileSize || video.size,
          uploadedAt: video.uploaded_at || video.uploadedAt,
          createdAt: video.created_at || video.createdAt,
          updatedAt: video.updated_at || video.updatedAt,
        }
      })
      
      return {
        normalizedState: {
          ...state.normalizedState,
          videos: { ...state.normalizedState.videos, ...normalizedVideos },
        },
      }
    })
  },
  
  normalizeChapters: (chapters) => {
    
    set((state) => {
      const normalizedChapters: Record<string, NormalizedChapter> = {}
      
      chapters.forEach((chapter: any) => {
        const id = chapter.id || crypto.randomUUID()
        normalizedChapters[id] = {
          id,
          title: chapter.title || '',
          description: chapter.description,
          courseId: chapter.course_id || chapter.courseId || '',
          videoIds: chapter.videos?.map((v: any) => v.id) || [],
          order: chapter.order || 0,
          createdAt: chapter.created_at || chapter.createdAt,
          updatedAt: chapter.updated_at || chapter.updatedAt,
        }
      })
      
      return {
        normalizedState: {
          ...state.normalizedState,
          chapters: { ...state.normalizedState.chapters, ...normalizedChapters },
        },
      }
    })
  },
  
  // UI state management
  setNormalizedLoading: (loading) => {
    set((state) => ({
      normalizedState: { ...state.normalizedState, isLoading: loading },
    }))
  },
  
  setNormalizedError: (error) => {
    set((state) => ({
      normalizedState: { ...state.normalizedState, error },
    }))
  },
  
  setNormalizedHasChanges: (hasChanges) => {
    set((state) => ({
      normalizedState: { ...state.normalizedState, hasChanges },
    }))
  },
})