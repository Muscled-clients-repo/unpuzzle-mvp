import { StateCreator } from 'zustand'
import { instructorCourseService } from '@/services/instructor-course-service'
import { videoUploadService, UploadSession, MediaFile } from '@/services/video-upload-service'

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
  // Upload session data
  sessionKey?: string
  storageKey?: string
  mediaFileId?: string
  uploadError?: string
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
  uploadSessions: Map<string, UploadSession>
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
  
  // Enhanced Upload Actions
  initiateVideoUpload: (files: FileList, chapterId?: string) => Promise<void>
  handleUploadProgress: (videoId: string, progress: number) => void
  completeVideoUpload: (videoId: string, mediaFile: MediaFile) => void
  retryFailedUpload: (videoId: string) => Promise<void>
  setUploadError: (videoId: string, error: string) => void
  
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
  loadCourseForEdit: (courseId: string) => Promise<void>
  
  // NEW EDIT-ONLY ACTIONS
  updateExistingCourse: (courseId: string) => Promise<void>
  loadCourseFromAPI: (courseId: string) => Promise<void>
  markAsEditMode: () => void
  getEditModeStatus: () => boolean
}

export const createCourseCreationSlice: StateCreator<CourseCreationSlice> = (set, get) => ({
  courseCreation: null,
  uploadQueue: [],
  uploadSessions: new Map(),
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
    
    // Check if this is edit mode
    if (courseCreation.id) {
      // Use new edit function
      await get().updateExistingCourse(courseCreation.id)
      return
    }
    
    // KEEP ALL EXISTING CREATION LOGIC UNCHANGED
    const title = courseCreation.title?.trim() || ''
    const description = courseCreation.description?.trim() || ''
    
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
      const courseData = {
        title: title,
        description: description,
        category: courseCreation.category || 'programming',
        difficulty: courseCreation.level || 'beginner',
        price: courseCreation.price || 0,
        isFree: courseCreation.price === 0,
        tags: courseCreation.category ? [courseCreation.category] : ['programming'],
        status: 'draft' as const
      }
      
      const result = await instructorCourseService.createCourse(courseData)
      
      if (result.data) {
        set(state => ({
          isAutoSaving: false,
          saveError: null,
          courseCreation: state.courseCreation ? {
            ...state.courseCreation,
            lastSaved: new Date(),
            hasAutoSaveError: false,
            id: result.data!.id || state.courseCreation.id
          } : null
        }))
        
        const appState = get() as any
        if (appState.loadInstructorCourses) {
          appState.loadInstructorCourses()
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
  
  loadCourseForEdit: async (courseId) => {
    console.log('📖 Loading course for edit:', courseId)
    await get().loadCourseFromAPI(courseId)
  },

  // NEW ACTION: Load course from API
  loadCourseFromAPI: async (courseId: string) => {
    console.log('🔄 loadCourseFromAPI called with courseId:', courseId)
    set({ isAutoSaving: true, saveError: null })
    
    try {
      const result = await instructorCourseService.getCourseForEditing(courseId)
      console.log('📦 Service returned:', result)
      
      if (result.error) {
        console.log('❌ Service error:', result.error)
        set({ 
          saveError: result.error,
          isAutoSaving: false
        })
        return
      }

      const courseData = result.data!
      console.log('📋 Course data received:', courseData)
      
      // Ensure the data has the correct structure
      const courseCreationData = {
        id: courseId,
        title: courseData.title || '',
        description: courseData.description || '',
        category: courseData.category || '',
        level: courseData.level || 'beginner',
        price: courseData.price || 0,
        chapters: courseData.chapters || [],
        videos: courseData.videos || [],
        status: courseData.status || 'draft',
        autoSaveEnabled: false,
        lastSaved: courseData.lastSaved || new Date()
      }
      
      console.log('💾 Setting courseCreation state with:', courseCreationData)
      
      set({
        courseCreation: courseCreationData,
        currentStep: 'info',
        isAutoSaving: false,
        saveError: null
      })
      
      console.log('✅ Course loaded for editing successfully')
    } catch (error) {
      console.log('❌ Failed to load course:', error)
      set({
        saveError: 'Failed to load course',
        isAutoSaving: false
      })
    }
  },

  // NEW ACTION: Update existing course
  updateExistingCourse: async (courseId: string) => {
    const { courseCreation } = get()
    if (!courseCreation) return
    
    console.log('💾 Updating existing course:', courseId)
    set({ isAutoSaving: true, saveError: null })
    
    try {
      const result = await instructorCourseService.updateCourseDetails(courseId, courseCreation)
      
      if (result.error) {
        set({ 
          saveError: result.error,
          isAutoSaving: false
        })
        return
      }

      set(state => ({
        isAutoSaving: false,
        saveError: null,
        courseCreation: state.courseCreation ? {
          ...state.courseCreation,
          lastSaved: new Date()
        } : null
      }))
      
      console.log('✅ Course updated successfully')
      
    } catch (error) {
      console.log('❌ Failed to update course:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update course'
      
      set({
        isAutoSaving: false,
        saveError: errorMessage
      })
    }
  },

  // NEW ACTION: Mark as edit mode
  markAsEditMode: () => {
    set(state => ({
      courseCreation: state.courseCreation ? {
        ...state.courseCreation,
        isEditMode: true
      } : null
    }))
  },

  // NEW ACTION: Get edit mode status  
  getEditModeStatus: () => {
    const { courseCreation } = get()
    return !!(courseCreation?.id)
  },

  // NEW UPLOAD ACTIONS: Video Upload Implementation
  initiateVideoUpload: async (files: FileList, chapterId?: string) => {
    console.log('🚀 Starting video upload for', files.length, 'files')
    const { courseCreation } = get()
    
    const videoPromises = Array.from(files).map(async (file) => {
      // Generate unique video ID
      const videoId = `video-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
      
      // Validate file
      const validation = videoUploadService.validateVideoFile(file)
      if (!validation.valid) {
        console.error('❌ File validation failed:', validation.error)
        get().setUploadError(videoId, validation.error || 'Invalid file')
        return
      }
      
      // Add to upload queue immediately
      const newVideo: VideoUpload = {
        id: videoId,
        file,
        name: file.name,
        size: file.size,
        status: 'pending',
        progress: 0,
        chapterId,
        order: get().uploadQueue.length
      }
      
      set(state => ({
        uploadQueue: [...state.uploadQueue, newVideo]
      }))

      try {
        console.log('🔄 Initiating upload for:', file.name)
        get().updateVideoStatus(videoId, 'pending')
        
        // Step 1: Initiate upload
        const sessionResult = await videoUploadService.initiateUpload(file, courseCreation?.id)
        if (sessionResult.error) {
          throw new Error(sessionResult.error)
        }

        if (!sessionResult.data) {
          throw new Error('No upload session data received from server')
        }

        const session = sessionResult.data
        console.log('✅ Upload session created:', session.sessionKey)
        
        // Store session data
        set(state => ({ 
          uploadSessions: new Map(state.uploadSessions.set(videoId, session)),
          uploadQueue: state.uploadQueue.map(v => 
            v.id === videoId 
              ? { ...v, sessionKey: session.sessionKey, storageKey: session.storageKey }
              : v
          )
        }))

        // Step 2: Update status to uploading
        get().updateVideoStatus(videoId, 'uploading')

        // Step 3: Upload file with progress tracking
        console.log('📤 Starting file upload to storage')
        const uploadResult = await videoUploadService.uploadFile(
          session,
          file,
          (progress) => get().handleUploadProgress(videoId, progress)
        )
        
        if (uploadResult.error) {
          throw new Error(uploadResult.error)
        }

        console.log('✅ File uploaded to storage successfully')
        get().updateVideoStatus(videoId, 'processing')

        // Step 4: Complete upload
        console.log('🏁 Completing upload process')
        const completeResult = await videoUploadService.completeUpload(
          session.sessionKey, 
          session.storageKey
        )
        
        if (completeResult.error) {
          throw new Error(completeResult.error)
        }

        const mediaFile = completeResult.data!
        console.log('✅ Upload completed successfully:', mediaFile.id)
        
        // Step 5: Update video with completed data
        get().completeVideoUpload(videoId, mediaFile)

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed'
        console.error('❌ Upload failed for', file.name, ':', errorMessage)
        get().setUploadError(videoId, errorMessage)
      }
    })

    // Wait for all uploads to complete (or fail)
    await Promise.allSettled(videoPromises)
    console.log('🏁 All upload processes completed')
  },

  handleUploadProgress: (videoId: string, progress: number) => {
    set(state => ({
      uploadQueue: state.uploadQueue.map(video =>
        video.id === videoId 
          ? { ...video, progress }
          : video
      )
    }))
  },

  completeVideoUpload: (videoId: string, mediaFile: MediaFile) => {
    console.log('✅ Completing video upload:', videoId, mediaFile.id)
    
    set(state => ({
      uploadQueue: state.uploadQueue.map(video =>
        video.id === videoId 
          ? {
              ...video,
              status: 'complete',
              progress: 100,
              mediaFileId: mediaFile.id,
              url: mediaFile.cdnUrl || mediaFile.storageKey,
              thumbnailUrl: mediaFile.cdnUrl ? `${mediaFile.cdnUrl}/thumbnail.jpg` : undefined,
              duration: mediaFile.metadata?.duration 
                ? videoUploadService.formatDuration(mediaFile.metadata.duration) 
                : undefined,
              uploadError: undefined
            }
          : video
      )
    }))

    // If video belongs to a chapter, update the chapter's video list
    const video = get().uploadQueue.find(v => v.id === videoId)
    if (!video) {
      console.error('❌ Video not found in upload queue:', videoId)
      return
    }

    if (video.chapterId) {
      set(state => ({
        courseCreation: state.courseCreation ? {
          ...state.courseCreation,
          chapters: state.courseCreation.chapters.map(chapter =>
            chapter.id === video.chapterId
              ? {
                  ...chapter,
                  videos: [...chapter.videos, {
                    id: video.id,
                    file: video.file,
                    name: video.name,
                    size: video.size,
                    duration: video.duration,
                    status: 'complete' as const,
                    progress: 100,
                    url: mediaFile.cdnUrl || mediaFile.storageKey,
                    thumbnailUrl: video.thumbnailUrl,
                    chapterId: video.chapterId,
                    order: video.order,
                    transcript: video.transcript,
                    sessionKey: video.sessionKey,
                    storageKey: video.storageKey,
                    mediaFileId: mediaFile.id,
                    uploadError: undefined
                  }]
                }
              : chapter
          )
        } : null
      }))
    } else {
      // Add to course videos if not in a chapter
      set(state => ({
        courseCreation: state.courseCreation ? {
          ...state.courseCreation,
          videos: [...state.courseCreation.videos, {
            id: video.id,
            file: video.file,
            name: video.name,
            size: video.size,
            duration: video.duration,
            status: 'complete' as const,
            progress: 100,
            url: mediaFile.cdnUrl || mediaFile.storageKey,
            thumbnailUrl: video.thumbnailUrl,
            chapterId: video.chapterId,
            order: video.order,
            transcript: video.transcript,
            sessionKey: video.sessionKey,
            storageKey: video.storageKey,
            mediaFileId: mediaFile.id,
            uploadError: undefined
          }]
        } : null
      }))
    }
  },

  retryFailedUpload: async (videoId: string) => {
    console.log('🔄 Retrying failed upload:', videoId)
    
    const video = get().uploadQueue.find(v => v.id === videoId)
    if (!video || !video.file) {
      console.error('❌ Cannot retry: video or file not found')
      return
    }

    // Reset video status and progress
    set(state => ({
      uploadQueue: state.uploadQueue.map(v =>
        v.id === videoId 
          ? { ...v, status: 'pending', progress: 0, uploadError: undefined }
          : v
      )
    }))

    // Create new file list and retry upload
    const fileList = new DataTransfer()
    fileList.items.add(video.file)
    
    await get().initiateVideoUpload(fileList.files, video.chapterId || undefined)
  },

  setUploadError: (videoId: string, error: string) => {
    console.error('❌ Setting upload error for', videoId, ':', error)
    
    set(state => ({
      uploadQueue: state.uploadQueue.map(video =>
        video.id === videoId 
          ? { 
              ...video, 
              status: 'error',
              uploadError: error
            }
          : video
      )
    }))
  }
})