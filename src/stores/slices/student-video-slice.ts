// src/stores/slices/student-video-slice.ts
import { StateCreator } from 'zustand'
import { StudentVideoData, Reflection, VideoSegment, Quiz } from '@/types/domain'
import { studentVideoService } from '@/services/student-video-service'

export interface StudentVideoSlice {
  // Student-specific video state
  currentVideo: StudentVideoData | null
  selectedSegment: VideoSegment | null
  activeQuiz: Quiz | null
  reflections: Reflection[]
  // Cache to prevent duplicate loads
  _loadingVideoId: string | null
  
  // Basic video playback state
  currentTime: number
  duration: number
  isPlaying: boolean
  volume: number
  isMuted: boolean
  playbackRate: number
  isFullscreen: boolean
  
  // AI Chat context
  inPoint: number | null
  outPoint: number | null
  
  // UI state for video player
  showControls: boolean
  showLiveTranscript: boolean
  
  // Actions
  loadStudentVideo: (videoId: string, courseId?: string) => Promise<void>
  setVideoSegment: (inPoint: number, outPoint: number) => void
  clearVideoSegment: () => void
  addReflection: (reflection: Partial<Reflection>) => Promise<void>
  submitQuizAnswer: (quizId: string, answer: number) => Promise<void>
  setShowControls: (showControls: boolean) => void
  setShowLiveTranscript: (showLiveTranscript: boolean) => void
  
  // Basic video control actions
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setIsPlaying: (isPlaying: boolean) => void
  setVolume: (volume: number) => void
  setIsMuted: (isMuted: boolean) => void
  setPlaybackRate: (rate: number) => void
  setIsFullscreen: (isFullscreen: boolean) => void
  resetVideo: () => void
}

export const createStudentVideoSlice: StateCreator<StudentVideoSlice> = (set, get) => ({
  currentVideo: null,
  selectedSegment: null,
  activeQuiz: null,
  reflections: [],
  _loadingVideoId: null,

  // Basic video state
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  volume: 1,
  isMuted: false,
  playbackRate: 1,
  isFullscreen: false,

  inPoint: null,
  outPoint: null,
  showControls: true,
  showLiveTranscript: false,

  loadStudentVideo: async (videoId: string, courseId?: string) => {
    // PERFORMANCE: Prevent duplicate loads with the same videoId
    // This prevents regenerating HMAC tokens unnecessarily
    const state = get()

    // Skip if already loading this EXACT video (prevent duplicate concurrent requests)
    if (state._loadingVideoId === videoId) {
      return
    }

    // Skip if this video is already loaded AND we're not switching to a different video
    if (state.currentVideo?.id === videoId && state._loadingVideoId === null) {
      return
    }

    // Mark as loading this videoId (this ensures loader shows during video switch)
    set({ _loadingVideoId: videoId })

    // 001-COMPLIANT: Use junction table action instead of old videos table
    const { getStudentVideoFromJunctionTable } = await import('@/app/actions/student-course-actions-junction')

    try {
      // SECURITY: Pass courseId to verify video belongs to course (prevent URL manipulation)
      const videoData = await getStudentVideoFromJunctionTable(videoId, courseId)
      if (videoData) {
        set({
          currentVideo: videoData,
          reflections: videoData.reflections || [],
          _loadingVideoId: null
        })
      } else {
        set({
          currentVideo: null,
          reflections: [],
          _loadingVideoId: null
        })
      }
    } catch (error) {
      console.error('[Student Video Slice] Error loading video:', error)
      set({
        currentVideo: null,
        reflections: [],
        _loadingVideoId: null
      })
    }
  },

  setVideoSegment: (inPoint: number, outPoint: number) => {
    set({
      inPoint,
      outPoint,
      selectedSegment: {
        videoId: get().currentVideo?.id || '',
        inPoint,
        outPoint,
        purpose: 'ai-context'
      }
    })
  },

  clearVideoSegment: () => {
    set({
      inPoint: null,
      outPoint: null,
      selectedSegment: null
    })
  },

  addReflection: async (reflection: Partial<Reflection>) => {
    const result = await studentVideoService.saveReflection(reflection)
    if (result.data) {
      set(state => ({
        reflections: [...state.reflections, result.data!]
      }))
    }
  },

  submitQuizAnswer: async (quizId: string, answer: number) => {
    const result = await studentVideoService.submitQuizAnswer(quizId, answer)
    // Handle quiz result - could show feedback, update score, etc.
  },

  setShowControls: (showControls: boolean) => {
    set({ showControls })
  },

  setShowLiveTranscript: (showLiveTranscript: boolean) => {
    set({ showLiveTranscript })
  },
  
  // Basic video control actions
  setCurrentTime: (currentTime: number) => {
    set({ currentTime })
  },
  
  setDuration: (duration: number) => {
    set({ duration })
  },
  
  setIsPlaying: (isPlaying: boolean) => {
    set({ isPlaying })
  },
  
  setVolume: (volume: number) => {
    set({ volume: Math.min(1, Math.max(0, volume)) })
  },
  
  setIsMuted: (isMuted: boolean) => {
    set({ isMuted })
  },
  
  setPlaybackRate: (playbackRate: number) => {
    set({ playbackRate })
  },
  
  setIsFullscreen: (isFullscreen: boolean) => {
    set({ isFullscreen })
  },
  
  resetVideo: () => {
    set({
      currentTime: 0,
      isPlaying: false,
      inPoint: null,
      outPoint: null,
      selectedSegment: null
    })
  }
})