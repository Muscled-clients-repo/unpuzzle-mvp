import { StateCreator } from 'zustand'
import { instructorCourseService } from '@/services/instructor-course-service'
import { videoUploadService, UploadSession, MediaFile } from '@/services/video-upload-service'
import { apiClient } from '@/lib/api-client'

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
  unassignedMedia?: VideoUpload[]
  
  // Metadata
  status: 'draft' | 'published' | 'under_review'
  totalDuration?: string
  lastSaved?: Date
  autoSaveEnabled: boolean
  hasAutoSaveError?: boolean // Track if auto-save failed
}

// Media Assignment Data
interface MediaAssignmentData {
  title?: string
  description?: string
  order?: number
  isPreview?: boolean
  isPublished?: boolean
}

// API Response Types
interface SectionResponse {
  id: string
  title: string
  description?: string
  order: number
  mediaFiles?: unknown[]
  videos?: unknown[]
  isPublished?: boolean
  isPreview?: boolean
}

// Media Library Types
interface MediaItem {
  id: string
  title?: string
  originalFilename?: string
  filename?: string
  fileType: string
  fileSize?: number
  file_size?: number
  fileSizeFormatted?: string
  duration?: string
  durationFormatted?: string
  resolution?: string
  thumbnailUrl?: string
  thumbnail_url?: string
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed'
  processing_status?: string
}

interface MediaLibraryState {
  isOpen: boolean
  targetChapterId: string | null
  media: MediaItem[]
  loading: boolean
  error: string | null
  selectedIds: Set<string>
  filters: {
    type: 'all' | 'video' | 'audio' | 'document' | 'image'
    search: string
  }
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface CourseCreationSlice {
  chapterMediaState: Record<string, { loading: boolean; loaded: boolean; error?: string }>
  loadChapterMedia: (courseId: string, chapterId: string) => Promise<void>
  courseCreation: CourseCreationData | null
  uploadQueue: VideoUpload[]
  uploadSessions: Map<string, UploadSession>
  isAutoSaving: boolean
  currentStep: 'info' | 'content' | 'review'
  saveError: string | null
  lastSaveAttempt: Date | null
  mediaLibrary: MediaLibraryState
  
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
  createChapter: (title: string) => Promise<void>
  updateChapter: (chapterId: string, updates: Partial<Chapter>) => Promise<void>
  deleteChapter: (chapterId: string) => Promise<void>
  reorderChapters: (chapters: Chapter[]) => void
  
  // Drag & Drop Actions
  moveVideoToChapter: (videoId: string, chapterId: string | null) => Promise<void>
  reorderVideosInChapter: (chapterId: string, videos: VideoUpload[]) => Promise<void>
  moveVideoBetweenChapters: (videoId: string, fromChapterId: string | null, toChapterId: string | null, newIndex: number) => Promise<void>
  
  // Media Assignment Actions
  loadCourseMedia: (courseId: string) => Promise<void>
  assignMediaToSection: (mediaFileId: string, sectionId: string, data?: MediaAssignmentData) => Promise<void>
  unassignMediaFromSection: (mediaFileId: string) => Promise<void>
  
  // Media Library Actions
  openMediaLibrary: (chapterId: string) => void
  closeMediaLibrary: () => void
  loadUnassignedMedia: (page?: number) => Promise<void>
  toggleMediaSelection: (mediaId: string) => void
  assignSelectedMedia: () => Promise<{ successful: number; failed: number } | undefined>
  setMediaFilters: (filters: Partial<MediaLibraryState['filters']>) => void
  
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
  chapterMediaState: {},  // Track loading state for each chapter
  mediaLibrary: {
    isOpen: false,
    targetChapterId: null,
    media: [],
    loading: false,
    error: null,
    selectedIds: new Set(),
    filters: {
      type: 'all',
      search: ''
    },
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      pages: 0
    }
  },
  
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
    
    // Use the enhanced upload function for real upload with progress tracking
    get().initiateVideoUpload(files, firstChapterId)
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
        ),
        chapters: state.courseCreation.chapters.map(chapter => ({
          ...chapter,
          videos: chapter.videos.map(v => 
            v.id === videoId ? { ...v, progress } : v
          )
        }))
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
        ),
        chapters: state.courseCreation.chapters.map(chapter => ({
          ...chapter,
          videos: chapter.videos.map(v => 
            v.id === videoId ? { ...v, status } : v
          )
        }))
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
  
  createChapter: async (title) => {
    const { courseCreation } = get()
    
    // If no course ID yet, need to save course first
    if (!courseCreation?.id) {
      console.error('Cannot create chapter without course ID')
      // Could auto-save course here if needed
      return
    }
    
    try {
      // Call API to create section
      const response = await apiClient.createCourseSection(courseCreation.id, {
        title,
        description: '',
        order: courseCreation.chapters.length + 1,
        isPublished: false,
        isPreview: false
      })
      
      if (response.error) {
        console.error('Failed to create chapter:', response.error)
        set({ saveError: response.error })
        return
      }
      
      // Handle nested data structure from API
      const sectionData = response.data?.data || response.data
      console.log('✅ Chapter created successfully, section data:', sectionData)
      
      // Map API response to chapter format
      const newChapter: Chapter = {
        id: sectionData.id || `chapter-${Date.now()}`,
        title: sectionData.title || title,
        description: sectionData.description || '',
        order: sectionData.order !== undefined ? sectionData.order : courseCreation.chapters.length + 1,
        videos: sectionData.mediaFiles || sectionData.videos || []
      }
      
      // Update local state with server response
      set(state => ({
        courseCreation: state.courseCreation ? {
          ...state.courseCreation,
          chapters: [...(state.courseCreation.chapters || []), newChapter]
        } : null,
        saveError: null
      }))
      
      console.log('✅ Chapter added to state:', newChapter.title)
      console.log('📊 Total chapters now:', get().courseCreation?.chapters?.length || 0)
    } catch (error) {
      console.error('Failed to create chapter:', error)
      set({ saveError: 'Failed to create chapter' })
    }
  },
  
  updateChapter: async (chapterId, updates) => {
    try {
      // Call API to update section
      const response = await apiClient.updateCourseSection(chapterId, {
        title: updates.title,
        description: updates.description,
        order: updates.order
      })
      
      if (response.error) {
        console.error('Failed to update chapter:', response.error)
        set({ saveError: response.error })
        return
      }
      
      // Handle nested data structure if present
      const sectionData = response.data?.data || response.data
      
      // Update local state with actual server response
      set(state => ({
        courseCreation: state.courseCreation ? {
          ...state.courseCreation,
          chapters: state.courseCreation.chapters.map(ch => 
            ch.id === chapterId ? { ...ch, ...updates } : ch
          )
        } : null,
        saveError: null
      }))
    } catch (error) {
      console.error('Failed to update chapter:', error)
      set({ saveError: 'Failed to update chapter' })
    }
  },
  
  deleteChapter: async (chapterId) => {
    try {
      // Call API to delete section
      const response = await apiClient.deleteCourseSection(chapterId)
      
      if (response.error) {
        console.error('Failed to delete chapter:', response.error)
        set({ saveError: response.error })
        return
      }
      
      console.log('✅ Chapter deleted successfully:', response)
      
      // Update local state after successful deletion
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
          },
          saveError: null
        }
      })
    } catch (error) {
      console.error('Failed to delete chapter:', error)
      set({ saveError: 'Failed to delete chapter' })
    }
  },
  
  reorderChapters: (chapters) => {
    set(state => ({
      courseCreation: state.courseCreation ? {
        ...state.courseCreation,
        chapters: chapters.map((ch, index) => ({ ...ch, order: index }))
      } : null
    }))
  },
  
  moveVideoToChapter: async (videoId, chapterId) => {
    const state = get()
    if (!state.courseCreation) return
    
    const video = state.courseCreation.videos.find(v => v.id === videoId)
    if (!video) return
    
    // If chapterId is null, unassign the media
    if (!chapterId) {
      try {
        const response = await apiClient.unassignMediaFromSection(videoId)
        if (!response.error) {
          // Move to unassigned media
          set(state => ({
            courseCreation: state.courseCreation ? {
              ...state.courseCreation,
              chapters: state.courseCreation.chapters.map(ch => ({
                ...ch,
                videos: ch.videos.filter(v => v.id !== videoId)
              })),
              unassignedMedia: [...(state.courseCreation.unassignedMedia || []), video]
            } : null
          }))
        }
      } catch (error) {
        console.error('Failed to unassign media:', error)
      }
      return
    }
    
    // Assign to new chapter
    try {
      const response = await apiClient.assignMediaToSection(chapterId, {
        mediaFileId: videoId,
        title: video.name,
        order: state.courseCreation.chapters.find(ch => ch.id === chapterId)?.videos.length || 0,
        isPublished: true
      })
      
      if (!response.error) {
        const updatedVideo = { ...video, chapterId }
        
        set(state => ({
          courseCreation: state.courseCreation ? {
            ...state.courseCreation,
            videos: state.courseCreation.videos.map(v => 
              v.id === videoId ? updatedVideo : v
            ),
            chapters: state.courseCreation.chapters.map(chapter => {
              if (chapter.id === chapterId) {
                return { ...chapter, videos: [...chapter.videos.filter(v => v.id !== videoId), updatedVideo] }
              } else {
                return { ...chapter, videos: chapter.videos.filter(v => v.id !== videoId) }
              }
            }),
            unassignedMedia: state.courseCreation.unassignedMedia?.filter(v => v.id !== videoId)
          } : null
        }))
      }
    } catch (error) {
      console.error('Failed to assign media to chapter:', error)
      throw error
    }
  },
  
  reorderVideosInChapter: async (chapterId, videos) => {
    // Update local state optimistically
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
    
    // Call API to persist the new order
    try {
      const mediaOrder = videos.map(v => v.id)
      const response = await apiClient.reorderMediaInSection(chapterId, mediaOrder)
      
      if (response.error) {
        console.error('Failed to reorder media:', response.error)
        // Could rollback the optimistic update here if needed
      }
    } catch (error) {
      console.error('Failed to reorder media:', error)
      throw error
    }
  },
  
  moveVideoBetweenChapters: async (videoId, fromChapterId, toChapterId, newIndex) => {
    const state = get()
    if (!state.courseCreation) return
    
    const video = state.courseCreation.videos.find(v => v.id === videoId)
    if (!video) return
    
    // Update local state optimistically
    const updatedVideo = { ...video, chapterId: toChapterId }
    
    set(state => ({
      courseCreation: state.courseCreation ? {
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
      } : null
    }))
    
    // Call API to persist the move
    try {
      // Assign to new chapter
      const response = await apiClient.assignMediaToSection(toChapterId || '', {
        mediaFileId: videoId,
        title: video.name,
        order: newIndex,
        isPublished: true
      })
      
      if (response.error) {
        console.error('Failed to move media between chapters:', response.error)
        // Could rollback here if needed
      }
    } catch (error) {
      console.error('Failed to move media between chapters:', error)
      throw error
    }
  },
  
  // Media Assignment API Functions
  // Lazy load media for a specific chapter/section
  loadChapterMedia: async (courseId: string, chapterId: string) => {
    const { chapterMediaState } = get()
    
    // Check if already loading or loaded
    if (chapterMediaState[chapterId]?.loading || chapterMediaState[chapterId]?.loaded) {
      console.log(`📹 Chapter ${chapterId} media already ${chapterMediaState[chapterId]?.loaded ? 'loaded' : 'loading'}`)
      return
    }
    
    // Set loading state
    set(state => ({
      chapterMediaState: {
        ...state.chapterMediaState,
        [chapterId]: { loading: true, loaded: false }
      }
    }))
    
    try {
      console.log(`📹 Loading media for chapter ${chapterId} in course ${courseId}`)
      const response = await apiClient.getSectionMedia(courseId, chapterId)
      console.log(`📹 Chapter ${chapterId} media response:`, response)
      
      if (!response.error && response.data) {
        const mediaData = response.data.data || response.data
        const mediaFiles = Array.isArray(mediaData) ? mediaData : (mediaData.mediaFiles || mediaData.videos || [])
        
        console.log(`📹 Found ${mediaFiles.length} media files for chapter ${chapterId}`)
        
        // Update the chapter's videos in state
        set(state => {
          if (!state.courseCreation) return state
          
          return {
            courseCreation: {
              ...state.courseCreation,
              chapters: state.courseCreation.chapters.map(chapter => 
                chapter.id === chapterId 
                  ? { ...chapter, videos: mediaFiles }
                  : chapter
              )
            },
            chapterMediaState: {
              ...state.chapterMediaState,
              [chapterId]: { loading: false, loaded: true }
            }
          }
        })
      } else {
        // Handle error
        set(state => ({
          chapterMediaState: {
            ...state.chapterMediaState,
            [chapterId]: { 
              loading: false, 
              loaded: false, 
              error: response.error || 'Failed to load media' 
            }
          }
        }))
      }
    } catch (error) {
      console.error(`Failed to load media for chapter ${chapterId}:`, error)
      set(state => ({
        chapterMediaState: {
          ...state.chapterMediaState,
          [chapterId]: { 
            loading: false, 
            loaded: false, 
            error: 'Network error loading media' 
          }
        }
      }))
    }
  },
  
  loadCourseMedia: async (courseId) => {
    try {
      console.log('🎬 Loading course media for courseId:', courseId)
      const response = await apiClient.getCourseMedia(courseId)
      console.log('🎬 Course media response:', response)
      
      if (!response.error && response.data) {
        const mediaData = response.data.data || response.data
        
        // Handle different response structures
        let sections = mediaData.sections || []
        let unsectionedMedia = mediaData.unsectionedMedia || mediaData.unassignedMedia || []
        
        // If media is returned as a flat array, we need to filter out already assigned ones
        if (Array.isArray(mediaData) && mediaData.length > 0) {
          // Get all assigned media IDs from current chapters
          const assignedMediaIds = new Set()
          const currentChapters = get().courseCreation?.chapters || []
          
          currentChapters.forEach(chapter => {
            if (chapter.videos && Array.isArray(chapter.videos)) {
              chapter.videos.forEach(video => {
                if (video.id) assignedMediaIds.add(video.id)
              })
            }
          })
          
          console.log('🎬 Already assigned media IDs:', Array.from(assignedMediaIds))
          
          // Filter out already assigned media
          unsectionedMedia = mediaData.filter((media: { id: string }) => !assignedMediaIds.has(media.id))
          sections = []
          
          console.log('🎬 Total media files:', mediaData.length)
          console.log('🎬 Already assigned:', assignedMediaIds.size)
          console.log('🎬 Actually unassigned:', unsectionedMedia.length)
        }
        
        console.log('🎬 Media sections:', sections)
        console.log('🎬 Unsectioned media:', unsectionedMedia)
        
        // Only update chapters if we have sections from media API
        // Otherwise preserve existing chapters
        set(state => {
          if (!state.courseCreation) return state
          
          if (sections && sections.length > 0) {
            console.log('🎬 Updating chapters with media sections')
            return {
              courseCreation: {
                ...state.courseCreation,
                chapters: sections.map((section: SectionResponse) => ({
                  id: section.sectionId,
                  title: section.sectionTitle,
                  order: section.order,
                  videos: section.mediaFiles || []
                })),
                unassignedMedia: unsectionedMedia
              }
            }
          } else {
            console.log('🎬 No media sections, preserving existing chapters and just updating unassigned media')
            return {
              courseCreation: {
                ...state.courseCreation,
                unassignedMedia: unsectionedMedia
              }
            }
          }
        })
      } else {
        console.log('🎬 No course media data, keeping chapters as-is')
      }
    } catch (error) {
      console.error('Failed to load course media:', error)
    }
  },
  
  assignMediaToSection: async (mediaFileId, sectionId, customData) => {
    try {
      const response = await apiClient.assignMediaToSection(sectionId, {
        mediaFileId,
        title: customData?.title,
        description: customData?.description,
        order: customData?.order,
        isPreview: customData?.isPreview || false,
        isPublished: customData?.isPublished ?? true
      })
      
      if (!response.error) {
        const mediaFile = response.data?.data?.mediaFile || response.data?.mediaFile
        
        // Update local state
        set(state => ({
          courseCreation: state.courseCreation ? {
            ...state.courseCreation,
            chapters: state.courseCreation.chapters.map(ch =>
              ch.id === sectionId
                ? { ...ch, videos: [...ch.videos, mediaFile] }
                : ch
            ),
            unassignedMedia: state.courseCreation.unassignedMedia?.filter(m => m.id !== mediaFileId)
          } : null
        }))
      }
    } catch (error) {
      console.error('Failed to assign media to section:', error)
      throw error
    }
  },
  
  unassignMediaFromSection: async (mediaFileId) => {
    try {
      const response = await apiClient.unassignMediaFromSection(mediaFileId)
      
      if (!response.error) {
        const mediaFile = response.data?.data?.mediaFile || response.data?.mediaFile
        
        // Remove from all chapters and add to unassigned
        set(state => ({
          courseCreation: state.courseCreation ? {
            ...state.courseCreation,
            chapters: state.courseCreation.chapters.map(ch => ({
              ...ch,
              videos: ch.videos.filter(v => v.id !== mediaFileId)
            })),
            unassignedMedia: [
              ...(state.courseCreation.unassignedMedia || []),
              mediaFile
            ]
          } : null
        }))
      }
    } catch (error) {
      console.error('Failed to unassign media:', error)
      throw error
    }
  },
  
  // Media Library Actions
  openMediaLibrary: (chapterId) => {
    set(state => ({
      mediaLibrary: {
        ...state.mediaLibrary,
        isOpen: true,
        targetChapterId: chapterId,
        selectedIds: new Set()
      }
    }))
    // Load media on open
    get().loadUnassignedMedia()
  },
  
  closeMediaLibrary: () => {
    set(state => ({
      mediaLibrary: {
        ...state.mediaLibrary,
        isOpen: false,
        targetChapterId: null,
        selectedIds: new Set()
      }
    }))
  },
  
  loadUnassignedMedia: async (page = 1) => {
    set(state => ({
      mediaLibrary: {
        ...state.mediaLibrary,
        loading: true,
        error: null
      }
    }))
    
    try {
      const { mediaLibrary } = get()
      const response = mediaLibrary.filters.type === 'all' 
        ? await apiClient.getUserUnassignedVideos({ page, limit: 20 })
        : await apiClient.getUserMedia({ 
            page, 
            limit: 20, 
            type: mediaLibrary.filters.type 
          })
      
      if (!response.error && response.data) {
        console.log('🎬 Raw unassigned media response:', response)
        console.log('🎬 Response.data:', response.data)
        console.log('🎬 Response.data type:', typeof response.data)
        console.log('🎬 Response.data keys:', Object.keys(response.data))
        
        const mediaData = response.data.data || response.data
        console.log('🎬 Extracted mediaData:', mediaData)
        console.log('🎬 MediaData type:', typeof mediaData)
        
        let videos = []
        let pagination = {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0
        }
        
        // Handle different response structures
        if (Array.isArray(mediaData)) {
          console.log('🎬 MediaData is array, length:', mediaData.length)
          videos = mediaData
        } else if (mediaData && typeof mediaData === 'object') {
          console.log('🎬 MediaData is object, keys:', Object.keys(mediaData))
          videos = mediaData.videos || mediaData.mediaFiles || mediaData.results || []
          pagination = mediaData.pagination || pagination
          
          // Handle flat structure where videos are at the root level
          if (videos.length === 0 && mediaData.id) {
            console.log('🎬 Detected single video object, wrapping in array')
            videos = [mediaData]
          }
        }
        
        console.log('🎬 Final videos array:', videos)
        console.log('🎬 Final videos length:', videos.length)
        console.log('🎬 First video sample:', videos[0])
        
        set(state => ({
          mediaLibrary: {
            ...state.mediaLibrary,
            media: videos,
            pagination,
            loading: false
          }
        }))
      }
    } catch (error) {
      console.error('Failed to load media library:', error)
      set(state => ({
        mediaLibrary: {
          ...state.mediaLibrary,
          loading: false,
          error: 'Failed to load media library'
        }
      }))
    }
  },
  
  toggleMediaSelection: (mediaId) => {
    set(state => {
      const newSelected = new Set(state.mediaLibrary.selectedIds)
      if (newSelected.has(mediaId)) {
        newSelected.delete(mediaId)
      } else {
        newSelected.add(mediaId)
      }
      return {
        mediaLibrary: {
          ...state.mediaLibrary,
          selectedIds: newSelected
        }
      }
    })
  },
  
  assignSelectedMedia: async () => {
    const { mediaLibrary, courseCreation } = get()
    if (!mediaLibrary.targetChapterId || mediaLibrary.selectedIds.size === 0) {
      return
    }
    
    const selectedMedia = Array.from(mediaLibrary.selectedIds)
    const results = await Promise.allSettled(
      selectedMedia.map(mediaId => 
        get().assignMediaToSection(mediaId, mediaLibrary.targetChapterId!, {
          isPublished: true
        })
      )
    )
    
    // Check results
    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length
    
    if (successful > 0) {
      // Reload course media to reflect changes
      if (courseCreation?.id) {
        await get().loadCourseMedia(courseCreation.id)
      }
    }
    
    // Close modal and reset
    get().closeMediaLibrary()
    
    return { successful, failed }
  },
  
  setMediaFilters: (filters) => {
    set(state => ({
      mediaLibrary: {
        ...state.mediaLibrary,
        filters: {
          ...state.mediaLibrary.filters,
          ...filters
        }
      }
    }))
    // Reload with new filters
    get().loadUnassignedMedia(1)
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
      
      // Handle specific server errors
      let errorMessage = 'Failed to save draft'
      if (error instanceof Error) {
        if (error.message.includes('405') || error.message.includes('Method') || error.message.includes('not allowed')) {
          errorMessage = 'Server endpoint not ready yet. Course saved locally.'
          // Save locally for now
          set(state => ({
            isAutoSaving: false,
            saveError: null, // Don't show as error since it's saved locally
            courseCreation: state.courseCreation ? {
              ...state.courseCreation,
              lastSaved: new Date(),
              hasAutoSaveError: false,
              id: state.courseCreation.id || `local-${Date.now()}` // Give it a local ID
            } : null
          }))
          return // Don't treat as error
        } else {
          errorMessage = error.message
        }
      }
      
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
      
      // Check if we have valid course data
      if (!courseData || (!courseData.title && !courseData.description && !courseData.category)) {
        console.log('⚠️ Received empty course data, API endpoint might be missing')
        console.log('💡 Consider enabling mock data with NEXT_PUBLIC_USE_MOCK_DATA=true')
        set({
          saveError: 'Course data not available. Server endpoint may not be configured yet.',
          isAutoSaving: false
        })
        return
      }
      
      // Load sections from API - but preserve existing course data chapters as fallback
      let chapters = courseData.chapters || []
      console.log('📚 Initial chapters from course data:', chapters)
      
      try {
        const sectionsResponse = await apiClient.getCourseSections(courseId)
        console.log('📚 Sections loaded from API:', sectionsResponse)
        
        // Check the response structure - handle multiple possible response formats
        if (!sectionsResponse.error && sectionsResponse.data) {
          let sections: SectionResponse[] = []
          
          // Try different response structures
          if (Array.isArray(sectionsResponse.data)) {
            // Direct array response
            sections = sectionsResponse.data
          } else if (sectionsResponse.data.data && Array.isArray(sectionsResponse.data.data)) {
            // Nested data.data array
            sections = sectionsResponse.data.data
          } else if (sectionsResponse.data.sections && Array.isArray(sectionsResponse.data.sections)) {
            // data.sections array
            sections = sectionsResponse.data.sections
          } else if (sectionsResponse.data.data && sectionsResponse.data.data.sections) {
            // data.data.sections array
            sections = sectionsResponse.data.data.sections
          }
          
          console.log('📚 Extracted sections:', sections)
          
          // Only override chapters if we actually got sections from the API
          if (sections && sections.length > 0) {
            // Map backend sections to frontend chapters
            chapters = sections.map((section: SectionResponse, index: number) => {
              // Process videos - handle both array of objects and array of strings
              let processedVideos = []
              const rawVideos = section.mediaFiles || section.videos || []
              
              if (Array.isArray(rawVideos)) {
                processedVideos = rawVideos.map((video: unknown, vIndex: number) => {
                  // If video is a string (ID), create a minimal object
                  if (typeof video === 'string') {
                    return {
                      id: video,
                      title: `Video ${vIndex + 1}`,
                      name: `Video ${vIndex + 1}`
                    }
                  }
                  // If video is already an object, use it as-is
                  return video
                })
              }
              
              console.log(`📹 Section ${index} videos:`, processedVideos)
              
              return {
                id: section.id || `section-${courseId}-${index}`,
                title: section.title || `Section ${index + 1}`,
                description: section.description || '',
                order: section.order !== undefined ? section.order : index,
                videos: processedVideos,
                isPublished: section.isPublished,
                isPreview: section.isPreview
              }
            })
            console.log('📚 Using API sections, mapped chapters:', chapters)
          } else {
            console.log('📚 No sections from API, keeping course data chapters:', chapters)
          }
        } else {
          console.log('📚 API error/empty response, keeping course data chapters:', sectionsResponse.error || 'No data')
        }
      } catch (error) {
        console.log('⚠️ API call failed, keeping course data chapters:', error)
        // Keep the original chapters from course data
        console.log('📚 Preserving original course data chapters:', chapters)
      }
      
      // Ensure the data has the correct structure
      const courseCreationData = {
        id: courseId,
        title: courseData.title || '',
        description: courseData.description || '',
        category: courseData.category || '',
        level: courseData.level || 'beginner',
        price: courseData.price || 0,
        chapters,
        videos: courseData.videos || [],
        status: courseData.status || 'draft',
        autoSaveEnabled: false,
        lastSaved: courseData.lastSaved || new Date()
      }
      
      console.log('💾 Setting courseCreation state with chapters count:', courseCreationData.chapters.length)
      console.log('💾 Chapters being set:', courseCreationData.chapters)
      
      set({
        courseCreation: courseCreationData,
        currentStep: 'info',
        isAutoSaving: false,
        saveError: null
      })
      
      console.log('✅ Course loaded for editing successfully')
      console.log('📊 Final chapters in state:', get().courseCreation?.chapters?.length || 0)
      
      // Don't load media here - it will be lazy loaded when chapters are expanded
      console.log('🎬 Media will be loaded lazily when chapters are expanded')
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

        // Check if proxy upload already completed everything (has mediaInfo)
        if (uploadResult.mediaInfo) {
          console.log('🚀 Proxy upload already completed - skipping separate completion step')
          const mediaFile = {
            id: uploadResult.mediaInfo.id,
            cdnUrl: uploadResult.mediaInfo.cdnUrl,
            processingStatus: (uploadResult.mediaInfo.processingStatus as 'pending' | 'processing' | 'completed' | 'failed') || 'completed',
            // Add other required fields with defaults
            userId: 'current-user',
            filename: file.name,
            fileSize: file.size,
            contentType: file.type,
            storageKey: session.storageKey,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
          
          console.log('✅ Proxy upload completed successfully:', mediaFile.id)
          get().completeVideoUpload(videoId, mediaFile)
        } else {
          // Traditional flow: separate upload and complete steps
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
        }

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