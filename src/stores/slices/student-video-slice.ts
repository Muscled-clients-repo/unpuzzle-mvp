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
  
  // AI Chat context
  inPoint: number | null
  outPoint: number | null
  
  // Actions
  loadStudentVideo: (videoId: string) => Promise<void>
  setVideoSegment: (inPoint: number, outPoint: number) => void
  clearVideoSegment: () => void
  addReflection: (reflection: Partial<Reflection>) => Promise<void>
  submitQuizAnswer: (quizId: string, answer: number) => Promise<void>
}

export const createStudentVideoSlice: StateCreator<StudentVideoSlice> = (set, get) => ({
  currentVideo: null,
  selectedSegment: null,
  activeQuiz: null,
  reflections: [],
  inPoint: null,
  outPoint: null,

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
  }
})