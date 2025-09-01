import { StateCreator } from 'zustand'

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
  chapterId?: string
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
}

export interface CourseCreationSlice {
  courseCreation: CourseCreationData | null
  uploadQueue: VideoUpload[]
  isAutoSaving: boolean
  currentStep: 'info' | 'content' | 'review'
  
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
  
  // Navigation
  setCurrentStep: (step: CourseCreationData['currentStep']) => void
  resetCourseCreation: () => void
  
  // Edit mode
  loadCourseForEdit: (courseId: string) => void
}

export const createCourseCreationSlice: StateCreator<CourseCreationSlice> = (set, get) => ({
  courseCreation: null,
  uploadQueue: [],
  isAutoSaving: false,
  currentStep: 'info',
  
  setCourseInfo: (info) => {
    set(state => ({
      courseCreation: {
        ...state.courseCreation,
        ...info,
        lastSaved: new Date()
      } as CourseCreationData
    }))
    
    // Trigger auto-save if enabled
    const { courseCreation } = get()
    if (courseCreation?.autoSaveEnabled) {
      get().saveDraft()
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
        autoSaveEnabled: true
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
    
    if (!courseCreation) {
      console.error('No course to save')
      return
    }

    set({ isAutoSaving: true })
    
    try {
      // Check feature flag for real course updates
      const useRealBackend = process.env.NEXT_PUBLIC_USE_REAL_COURSE_UPDATES === 'true'
      
      if (useRealBackend && courseCreation.id) {
        // Import the service dynamically
        const { supabaseCourseService } = await import('@/services/supabase/course-service')
        
        // Prepare update data
        const updateData = {
          title: courseCreation.title,
          description: courseCreation.description,
          price: courseCreation.price,
          difficulty: courseCreation.level,
          totalDuration: courseCreation.totalDuration,
          // Keep existing status unless changed
          status: courseCreation.status
        }
        
        console.log('[SUPABASE] Saving course draft...', courseCreation.id)
        await supabaseCourseService.updateCourse(courseCreation.id, updateData)
        console.log('[SUPABASE] Course draft saved successfully')
        
        set(state => ({
          isAutoSaving: false,
          courseCreation: state.courseCreation ? {
            ...state.courseCreation,
            lastSaved: new Date()
          } : null
        }))
        
      } else {
        // Mock implementation for development or new courses
        console.log('[MOCK] Saving course draft...', courseCreation.title)
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        set(state => ({
          isAutoSaving: false,
          courseCreation: state.courseCreation ? {
            ...state.courseCreation,
            lastSaved: new Date()
          } : null
        }))
        
        console.log('[MOCK] Course draft saved!')
      }
      
    } catch (error: any) {
      console.error('[ERROR] Failed to save course draft:', error)
      
      set({ isAutoSaving: false })
      throw error
    }
  },
  
  publishCourse: async () => {
    const { courseCreation } = get()
    
    if (!courseCreation) {
      console.error('No course to publish')
      return
    }

    // Validation
    if (!courseCreation.title) {
      throw new Error('Course title is required')
    }
    
    if (!courseCreation.videos || courseCreation.videos.length === 0) {
      throw new Error('Course must have at least one video')
    }

    try {
      // Set status to under_review first
      set(state => ({
        courseCreation: state.courseCreation ? {
          ...state.courseCreation,
          status: 'under_review' as const
        } : null
      }))

      // Get instructor ID from Supabase auth
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated')
      }
      
      const instructorId = user.id
      
      // Check feature flag for real course creation
      const useRealBackend = process.env.NEXT_PUBLIC_USE_REAL_COURSE_CREATION === 'true'
      
      if (useRealBackend) {
        // Import the service dynamically to avoid circular deps
        const { supabaseCourseService } = await import('@/services/supabase/course-service')
        
        // Convert courseCreation to InstructorCourse format
        const courseData = {
          title: courseCreation.title,
          description: courseCreation.description || '',
          thumbnail: '/api/placeholder/400/225', // Default thumbnail
          price: courseCreation.price || 0,
          difficulty: courseCreation.level || 'beginner',
          totalVideos: courseCreation.videos.length,
          totalDuration: '0h 0m', // TODO: Calculate from video durations
          students: 0,
          completionRate: 0,
          revenue: 0,
          pendingConfusions: 0,
          status: 'published' as const
        }
        
        console.log('[SUPABASE] Publishing course...', courseData)
        const publishedCourse = await supabaseCourseService.createCourse(instructorId, courseData)
        console.log('[SUPABASE] Course published successfully:', publishedCourse.id)
        
        // Update local state with published status
        set(state => ({
          courseCreation: state.courseCreation ? {
            ...state.courseCreation,
            id: publishedCourse.id,
            status: 'published' as const
          } : null
        }))
        
        // Redirect to instructor courses list to see the new course
        if (typeof window !== 'undefined') {
          window.location.href = '/instructor/courses'
        }
        
      } else {
        // Mock implementation for development
        console.log('[MOCK] Publishing course...', courseCreation.title)
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        set(state => ({
          courseCreation: state.courseCreation ? {
            ...state.courseCreation,
            status: 'published' as const
          } : null
        }))
        
        console.log('[MOCK] Course published!')
      }
      
    } catch (error: any) {
      console.error('[ERROR] Failed to publish course:', error)
      
      // Reset status on error
      set(state => ({
        courseCreation: state.courseCreation ? {
          ...state.courseCreation,
          status: 'draft' as const
        } : null
      }))
      
      throw error
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
      currentStep: 'info'
    })
  },
  
  loadCourseForEdit: async (courseId) => {
    // Check feature flag for real course editing
    const useRealBackend = process.env.NEXT_PUBLIC_USE_REAL_COURSE_UPDATES === 'true'
    
    if (useRealBackend) {
      try {
        // Import the service dynamically
        const { supabaseCourseService } = await import('@/services/supabase/course-service')
        
        // Get the authenticated user
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          throw new Error('User not authenticated')
        }

        // Fetch all courses and find the one to edit
        console.log('[SUPABASE] Loading course for edit:', courseId)
        const courses = await supabaseCourseService.getInstructorCourses(user.id)
        const course = courses.find(c => c.id === courseId)
        
        if (!course) {
          throw new Error(`Course ${courseId} not found or access denied`)
        }

        // Convert InstructorCourse to CourseCreationData format
        const courseCreationData: CourseCreationData = {
          id: course.id,
          title: course.title,
          description: course.description || '',
          category: 'programming', // Default since not stored in current schema
          level: (course.difficulty as 'beginner' | 'intermediate' | 'advanced') || 'beginner',
          price: course.price || 0,
          chapters: [
            {
              id: 'chapter-1',
              title: 'Main Content',
              description: 'Course content',
              order: 0,
              videos: [],
              duration: course.totalDuration || '0h 0m'
            }
          ],
          videos: [],
          status: course.status as 'draft' | 'published' | 'under_review',
          totalDuration: course.totalDuration || '0h 0m',
          lastSaved: new Date(),
          autoSaveEnabled: true
        }
        
        console.log('[SUPABASE] Course loaded for editing:', courseCreationData.title)
        set({
          courseCreation: courseCreationData,
          currentStep: 'info'
        })
        
      } catch (error: any) {
        console.error('[ERROR] Failed to load course for edit:', error)
        
        // Fallback to mock data on error
        const mockCourseData: CourseCreationData = {
          title: `Course ${courseId}`,
          description: `Description for course ${courseId}`,
          category: 'programming',
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
            }
          ],
          videos: [],
          status: 'draft',
          totalDuration: '1h 15min',
          lastSaved: new Date(),
          autoSaveEnabled: true
        }
        
        console.log('[FALLBACK] Using mock data due to error')
        set({
          courseCreation: mockCourseData,
          currentStep: 'info'
        })
      }
      
    } else {
      // Mock implementation for development
      console.log('[MOCK] Loading course for edit:', courseId)
      const mockCourseData: CourseCreationData = {
        title: `Course ${courseId}`,
        description: `Description for course ${courseId}`,
        category: 'programming',
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
          }
        ],
        videos: [],
        status: 'draft',
        totalDuration: '1h 15min',
        lastSaved: new Date(),
        autoSaveEnabled: true
      }
      
      set({
        courseCreation: mockCourseData,
        currentStep: 'info'
      })
    }
  }
})