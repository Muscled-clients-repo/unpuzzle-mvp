// src/stores/slices/instructor-video-slice.ts
import { StateCreator } from 'zustand'
import { InstructorVideoData, StudentActivity } from '@/types/domain'
import { instructorVideoService } from '@/services/instructor-video-service'

export interface InstructorVideoSlice {
  // Instructor-specific video state
  currentVideoData: InstructorVideoData | null
  selectedStudent: string | 'all'
  studentActivities: StudentActivity[]
  currentReflectionIndex: number
  
  // Actions
  loadInstructorVideo: (videoId: string, studentId?: string) => Promise<void>
  selectStudent: (studentId: string | 'all') => void
  navigateToReflection: (index: number) => void
  respondToReflection: (reflectionId: string, response: string) => Promise<void>
}

export const createInstructorVideoSlice: StateCreator<InstructorVideoSlice> = (set, get) => ({
  currentVideoData: null,
  selectedStudent: 'all',
  studentActivities: [],
  currentReflectionIndex: 0,

  loadInstructorVideo: async (videoId: string, studentId?: string) => {
    const result = await instructorVideoService.getVideoWithInstructorData(videoId, studentId)
    if (result.data) {
      set({ 
        currentVideoData: result.data,
        studentActivities: result.data.studentActivity,
        selectedStudent: studentId || 'all'
      })
    }
  },

  selectStudent: (studentId: string | 'all') => {
    set({ selectedStudent: studentId })
    // Reload data for specific student if needed
    const videoId = get().currentVideoData?.id
    if (videoId && studentId !== 'all') {
      get().loadInstructorVideo(videoId, studentId)
    }
  },

  navigateToReflection: (index: number) => {
    set({ currentReflectionIndex: index })
  },

  respondToReflection: async (reflectionId: string, response: string) => {
    await instructorVideoService.respondToReflection(reflectionId, response)
    // Update local state to mark as responded
    set(state => ({
      studentActivities: state.studentActivities.map(activity => 
        activity.content === reflectionId 
          ? { ...activity, needsResponse: false }
          : activity
      )
    }))
  }
})