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
  loadStudentVideo: (videoId: string) => Promise<void>
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

  loadStudentVideo: async (videoId: string) => {
    const result = await studentVideoService.getVideoWithStudentData(videoId)
    if (result.data) {
      set({ 
        currentVideo: result.data,
        reflections: result.data.reflections || []
      })
    }
  },

  setVideoSegment: (inPoint: number, outPoint: number) => {
    console.log('🎯 setVideoSegment called:', { inPoint, outPoint })
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
    console.log('🧹 clearVideoSegment called')
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
    if (result.data) {
      // Handle quiz result - could show feedback, update score, etc.
      console.log('Quiz result:', result.data)
    }
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