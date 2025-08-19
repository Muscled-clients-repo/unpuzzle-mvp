import { StateCreator } from 'zustand'
import { instructorCourseService } from '@/services/instructor-course-service'

export interface VideoUpload {
  id: string
  file?: File
  name: string
  size: number
  duration?: string
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error'
  progress: number
  url?: string
  thumbnailUrl?: string
  chapterId?: string | null
  order: number
  transcript?: string
}

export interface Chapter {
  id: string
  title: string
  description?: string
  order: number
  videos: VideoUpload[]
  duration?: string
}

export interface CourseCreationData {
  // Basic Info
  id?: string // Course ID for updates
  title: string
  description: string
  category: string
  level: 'beginner' | 'intermediate' | 'advanced'
  thumbnail?: File | string
  price: number
  
  // Content Structure
  chapters: Chapter[]
  videos: VideoUpload[]
  
  // Metadata
  status: 'draft' | 'published' | 'under_review'
  totalDuration?: string
  lastSaved?: Date
  autoSaveEnabled: boolean
  hasAutoSaveError?: boolean // Track if auto-save failed
}

export interface CourseCreationSlice {
  courseCreation: CourseCreationData | null
  uploadQueue: VideoUpload[]
  isAutoSaving: boolean
  currentStep: 'info' | 'content' | 'review'
  saveError: string | null
  lastSaveAttempt: Date | null
  
  // Basic Info Actions
  setCourseInfo: (info: Partial<CourseCreationData>) => void
  
  // Video Upload Actions
  addVideosToQueue: (files: FileList) => void
  updateVideoProgress: (videoId: string, progress: number) => void
  updateVideoStatus: (videoId: string, status: VideoUpload['status']) => void
  updateVideoName: (videoId: string, name: string) => void
  removeVideo: (videoId: string) => void
  
  // Chapter Actions
  createChapter: (title: string) => void
  updateChapter: (chapterId: string, updates: Partial<Chapter>) => void
  deleteChapter: (chapterId: string) => void
  reorderChapters: (chapters: Chapter[]) => void
  
  // Drag & Drop Actions
  moveVideoToChapter: (videoId: string, chapterId: string | null) => void
  reorderVideosInChapter: (chapterId: string, videos: VideoUpload[]) => void
  moveVideoBetweenChapters: (videoId: string, fromChapterId: string | null, toChapterId: string | null, newIndex: number) => void
  
  // Save Actions
  saveDraft: () => Promise<void>
  publishCourse: () => Promise<void>
  toggleAutoSave: () => void
  clearSaveError: () => void
  retryAutoSave: () => Promise<void>
  
  // Navigation
  setCurrentStep: (step: 'info' | 'content' | 'review') => void
  resetCourseCreation: () => void
  
  // Edit mode
  loadCourseForEdit: (courseId: string) => void
}

export const createCourseCreationSlice: StateCreator<CourseCreationSlice> = (set, get) => ({
  courseCreation: null,
  uploadQueue: [],
  isAutoSaving: false,
  currentStep: 'info',
  saveError: null,
  lastSaveAttempt: null,
  
  setCourseInfo: (info) => {
    set(state => ({
      courseCreation: {
        ...state.courseCreation,
        ...info,
        lastSaved: new Date()
      } as CourseCreationData,
      // Clear save error when user modifies data (gives them a chance to retry)
      saveError: null
    }))
    
    // Trigger auto-save if enabled AND no previous error exists
    const { courseCreation, saveError } = get()
    if (courseCreation?.autoSaveEnabled && !saveError) {
      // Debounce auto-save to avoid too many requests
      const currentTime = Date.now()
      const lastAttempt = get().lastSaveAttempt?.getTime() || 0
      const timeSinceLastAttempt = currentTime - lastAttempt
      
      // Only auto-save if it's been at least 2 seconds since last attempt
      if (timeSinceLastAttempt > 2000) {
        get().saveDraft()
      }
    }
  },
  
  addVideosToQueue: (files) => {
    const state = get()
    
    // Create Chapter 1 if no chapters exist
    if (!state.courseCreation?.chapters.length) {
      get().createChapter('Chapter 1')
    }
    
    // Get the first chapter (where we'll add videos by default)
    const firstChapterId = get().courseCreation?.chapters[0]?.id
    
    const newVideos: VideoUpload[] = Array.from(files).map((file, index) => ({
      id: `video-${Date.now()}-${index}`,
      file,
      name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
      size: file.size,
      status: 'pending' as const,
      progress: 0,
      order: get().uploadQueue.length + index,
      chapterId: firstChapterId // Assign to first chapter automatically
    }))
    
    set(state => ({
      uploadQueue: [...state.uploadQueue, ...newVideos],
      courseCreation: state.courseCreation ? {
        ...state.courseCreation,
        videos: [...(state.courseCreation.videos || []), ...newVideos],
        chapters: state.courseCreation.chapters.map(chapter => 
          chapter.id === firstChapterId 
            ? { ...chapter, videos: [...chapter.videos, ...newVideos] }
            : chapter
        )
      } : null
    }))
    
    // Start upload simulation
    newVideos.forEach(video => {
      setTimeout(() => {
        get().updateVideoStatus(video.id, 'uploading')
        // Simulate upload progress
        let progress = 0
        const interval = setInterval(() => {
          progress += Math.random() * 30
          if (progress >= 100) {
            progress = 100
            clearInterval(interval)
            get().updateVideoStatus(video.id, 'complete')
            // Add mock URL after "upload"
            set(state => ({
              courseCreation: state.courseCreation ? {
                ...state.courseCreation,
                videos: state.courseCreation.videos.map(v => 
                  v.id === video.id 
                    ? { ...v, url: `/videos/${video.id}.mp4`, thumbnailUrl: `/thumbs/${video.id}.jpg`, duration: '5:30' }
                    : v
                )
              } : null
            }))
          }
          get().updateVideoProgress(video.id, Math.min(progress, 100))
        }, 500)
      }, 100)
    })
  },
  
  updateVideoProgress: (videoId, progress) => {
    set(state => ({
      uploadQueue: state.uploadQueue.map(v => 
        v.id === videoId ? { ...v, progress } : v
      ),
      courseCreation: state.courseCreation ? {
        ...state.courseCreation,
        videos: state.courseCreation.videos.map(v => 
          v.id === videoId ? { ...v, progress } : v
        )
      } : null
    }))
  },
  
  updateVideoStatus: (videoId, status) => {
    set(state => ({
      uploadQueue: state.uploadQueue.map(v => 
        v.id === videoId ? { ...v, status } : v
      ),
      courseCreation: state.courseCreation ? {
        ...state.courseCreation,
        videos: state.courseCreation.videos.map(v => 
          v.id === videoId ? { ...v, status } : v
        )
      } : null
    }))
  },
  
  updateVideoName: (videoId, name) => {
    set(state => ({
      courseCreation: state.courseCreation ? {
        ...state.courseCreation,
        videos: state.courseCreation.videos.map(v => 
          v.id === videoId ? { ...v, name } : v
        ),
        chapters: state.courseCreation.chapters.map(chapter => ({
          ...chapter,
          videos: chapter.videos.map(v => 
            v.id === videoId ? { ...v, name } : v
          )
        }))
      } : null
    }))
  },
  
  removeVideo: (videoId) => {
    set(state => ({
      uploadQueue: state.uploadQueue.filter(v => v.id !== videoId),
      courseCreation: state.courseCreation ? {
        ...state.courseCreation,
        videos: state.courseCreation.videos.filter(v => v.id !== videoId),
        chapters: state.courseCreation.chapters.map(chapter => ({
          ...chapter,
          videos: chapter.videos.filter(v => v.id !== videoId)
        }))
      } : null
    }))
  },
  
  createChapter: (title) => {
    const newChapter: Chapter = {
      id: `chapter-${Date.now()}`,
      title,
      order: get().courseCreation?.chapters.length || 0,
      videos: []
    }
    
    set(state => ({
      courseCreation: state.courseCreation ? {
        ...state.courseCreation,
        chapters: [...state.courseCreation.chapters, newChapter]
      } : {
        title: '',
        description: '',
        category: '',
        level: 'beginner',
        price: 0,
        chapters: [newChapter],
        videos: [],
        status: 'draft',
        autoSaveEnabled: false
      }
    }))
  },
  
  updateChapter: (chapterId, updates) => {
    set(state => ({
      courseCreation: state.courseCreation ? {
        ...state.courseCreation,
        chapters: state.courseCreation.chapters.map(ch => 
          ch.id === chapterId ? { ...ch, ...updates } : ch
        )
      } : null
    }))
  },
  
  deleteChapter: (chapterId) => {
    set(state => {
      if (!state.courseCreation) return state
      
      const chapterToDelete = state.courseCreation.chapters.find(ch => ch.id === chapterId)
      const orphanedVideos = chapterToDelete?.videos || []
      const remainingChapters = state.courseCreation.chapters.filter(ch => ch.id !== chapterId)
      
      // If there are other chapters, move videos to the first remaining chapter
      // Otherwise, create a new Chapter 1
      if (remainingChapters.length === 0 && orphanedVideos.length > 0) {
        // Create a new Chapter 1 to hold the orphaned videos
        const newChapter: Chapter = {
          id: `chapter-${Date.now()}`,
          title: 'Chapter 1',
          order: 0,
          videos: orphanedVideos.map(v => ({ ...v, chapterId: `chapter-${Date.now()}` }))
        }
        
        return {
          courseCreation: {
            ...state.courseCreation,
            chapters: [newChapter],
            videos: state.courseCreation.videos.map(v => 
              orphanedVideos.find(ov => ov.id === v.id) 
                ? { ...v, chapterId: newChapter.id }
                : v
            )
          }
        }
      } else if (remainingChapters.length > 0) {
        // Move orphaned videos to the first remaining chapter
        const targetChapterId = remainingChapters[0].id
        
        return {
          courseCreation: {
            ...state.courseCreation,
            chapters: remainingChapters.map(ch => 
              ch.id === targetChapterId 
                ? { ...ch, videos: [...ch.videos, ...orphanedVideos.map(v => ({ ...v, chapterId: targetChapterId }))] }
                : ch
            ),
            videos: state.courseCreation.videos.map(v => 
              orphanedVideos.find(ov => ov.id === v.id) 
                ? { ...v, chapterId: targetChapterId }
                : v
            )
          }
        }
      }
      
      return {
        courseCreation: {
          ...state.courseCreation,
          chapters: remainingChapters
        }
      }
    })
  },
  
  reorderChapters: (chapters) => {
    set(state => ({
      courseCreation: state.courseCreation ? {
        ...state.courseCreation,
        chapters: chapters.map((ch, index) => ({ ...ch, order: index }))
      } : null
    }))
  },
  
  moveVideoToChapter: (videoId, chapterId) => {
    set(state => {
      if (!state.courseCreation) return state
      
      const video = state.courseCreation.videos.find(v => v.id === videoId)
      if (!video) return state
      
      const updatedVideo = { ...video, chapterId }
      
      return {
        courseCreation: {
          ...state.courseCreation,
          videos: state.courseCreation.videos.map(v => 
            v.id === videoId ? updatedVideo : v
          ),
          chapters: state.courseCreation.chapters.map(chapter => {
            if (chapter.id === chapterId) {
              return { ...chapter, videos: [...chapter.videos, updatedVideo] }
            } else {
              return { ...chapter, videos: chapter.videos.filter(v => v.id !== videoId) }
            }
          })
        }
      }
    })
  },
  
  reorderVideosInChapter: (chapterId, videos) => {
    set(state => ({
      courseCreation: state.courseCreation ? {
        ...state.courseCreation,
        chapters: state.courseCreation.chapters.map(ch => 
          ch.id === chapterId 
            ? { ...ch, videos: videos.map((v, index) => ({ ...v, order: index })) }
            : ch
        )
      } : null
    }))
  },
  
  moveVideoBetweenChapters: (videoId, fromChapterId, toChapterId, newIndex) => {
    set(state => {
      if (!state.courseCreation) return state
      
      const video = state.courseCreation.videos.find(v => v.id === videoId)
      if (!video) return state
      
      const updatedVideo = { ...video, chapterId: toChapterId }
      
      return {
        courseCreation: {
          ...state.courseCreation,
          videos: state.courseCreation.videos.map(v => 
            v.id === videoId ? updatedVideo : v
          ),
          chapters: state.courseCreation.chapters.map(chapter => {
            if (chapter.id === fromChapterId) {
              // Remove from source chapter
              return { ...chapter, videos: chapter.videos.filter(v => v.id !== videoId) }
            } else if (chapter.id === toChapterId) {
              // Add to target chapter at specific index
              const newVideos = [...chapter.videos]
              newVideos.splice(newIndex, 0, updatedVideo)
              return { ...chapter, videos: newVideos.map((v, i) => ({ ...v, order: i })) }
            }
            return chapter
          })
        }
      }
    })
  },
  
  saveDraft: async () => {
    const { courseCreation } = get()
    if (!courseCreation) return
    
    // Validation before saving
    const title = courseCreation.title?.trim() || ''
    const description = courseCreation.description?.trim() || ''
    
    // Don't save if basic required fields are empty or too short
    if (!title || title.length < 3) {
      set({
        saveError: 'Course title is required and must be at least 3 characters long',
        isAutoSaving: false
      })
      return
    }
    
    if (description.length > 0 && description.length < 10) {
      set({
        saveError: 'Description must be at least 10 characters long or left empty',
        isAutoSaving: false
      })
      return
    }
    
    set({ isAutoSaving: true, lastSaveAttempt: new Date() })
    
    try {
      // Prepare course data for API
      const courseData = {
        title: title,
        description: description,
        category: courseCreation.category || 'programming',
        difficulty: courseCreation.level || 'beginner',
        price: courseCreation.price || 0,
        isFree: courseCreation.price === 0,
        tags: courseCreation.category ? [courseCreation.category] : ['programming'],
        status: 'draft' as const
        // Don't send video data in create - handle separately
      }
      
      let result
      
      // If course already has an ID, update it; otherwise create new
      if (courseCreation.id) {
        result = await instructorCourseService.updateCourse(courseCreation.id, courseData)
      } else {
        result = await instructorCourseService.createCourse(courseData)
      }
      
      if (result.data) {
        set(state => ({
          isAutoSaving: false,
          saveError: null, // Clear any previous error
          courseCreation: state.courseCreation ? {
            ...state.courseCreation,
            lastSaved: new Date(),
            hasAutoSaveError: false,
            // Store the created course ID for future updates
            id: result.data!.id || state.courseCreation.id
          } : null
        }))
        console.log('Course draft saved successfully!', result.data)
        
        // Also update the instructor courses in the store
        const appState = get() as any
        if (appState.loadInstructorCourses && appState.profile?.id) {
          appState.loadInstructorCourses(appState.profile.id)
        }
      } else {
        throw new Error(result.error || 'Failed to save draft')
      }
    } catch (error) {
      console.error('Failed to save draft:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to save draft'
      
      set(state => ({
        isAutoSaving: false,
        saveError: errorMessage,
        courseCreation: state.courseCreation ? {
          ...state.courseCreation,
          hasAutoSaveError: true
        } : null
      }))
    }
  },
  
  publishCourse: async () => {
    const { courseCreation } = get()
    if (!courseCreation) return
    
    try {
      // First save the draft if not already saved
      if (!courseCreation.id) {
        await get().saveDraft()
      }
      
      const updatedCourseCreation = get().courseCreation
      if (!updatedCourseCreation?.id) {
        console.error('Failed to get course ID')
        return
      }
      
      // Update status to under_review
      set(state => ({
        courseCreation: state.courseCreation ? {
          ...state.courseCreation,
          status: 'under_review' as const
        } : null
      }))
      
      // Call publish API
      const result = await instructorCourseService.publishCourse(updatedCourseCreation.id)
      
      if (result.data) {
        set(state => ({
          courseCreation: state.courseCreation ? {
            ...state.courseCreation,
            status: 'published' as const
          } : null
        }))
        console.log('Course published successfully!')
        
        // Update the instructor courses in the store
        const appState = get() as any
        if (appState.loadInstructorCourses && appState.profile?.id) {
          appState.loadInstructorCourses(appState.profile.id)
        }
      } else {
        throw new Error(result.error || 'Failed to publish course')
      }
    } catch (error) {
      console.error('Failed to publish course:', error)
      // Revert status on error
      set(state => ({
        courseCreation: state.courseCreation ? {
          ...state.courseCreation,
          status: 'draft' as const
        } : null
      }))
    }
  },
  
  toggleAutoSave: () => {
    set(state => ({
      courseCreation: state.courseCreation ? {
        ...state.courseCreation,
        autoSaveEnabled: !state.courseCreation.autoSaveEnabled
      } : null
    }))
  },
  
  setCurrentStep: (step) => {
    set({ currentStep: step })
  },
  
  resetCourseCreation: () => {
    set({
      courseCreation: null,
      uploadQueue: [],
      isAutoSaving: false,
      currentStep: 'info',
      saveError: null,
      lastSaveAttempt: null
    })
  },

  clearSaveError: () => {
    set({ saveError: null })
  },

  retryAutoSave: async () => {
    // Clear the error and retry saving
    set({ saveError: null })
    await get().saveDraft()
  },
  
  loadCourseForEdit: (courseId) => {
    // Mock implementation - in production this would fetch from API
    // For now, create sample course data based on courseId
    const mockCourseData: CourseCreationData = {
      title: `Course ${courseId}`,
      description: `Description for course ${courseId}`,
      category: 'web-development',
      level: 'intermediate',
      price: 99,
      chapters: [
        {
          id: 'chapter-1',
          title: 'Introduction',
          description: 'Getting started with the course',
          order: 0,
          videos: [],
          duration: '30 min'
        },
        {
          id: 'chapter-2',
          title: 'Core Concepts',
          description: 'Understanding the fundamentals',
          order: 1,
          videos: [],
          duration: '45 min'
        }
      ],
      videos: [],
      status: 'draft',
      totalDuration: '1h 15min',
      lastSaved: new Date(),
      autoSaveEnabled: false
    }
    
    set({
      courseCreation: mockCourseData,
      currentStep: 'info'
    })
  }
})