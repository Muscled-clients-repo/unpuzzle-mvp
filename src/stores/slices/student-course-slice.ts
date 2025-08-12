// src/stores/slices/student-course-slice.ts
import { StateCreator } from 'zustand'
import { Course, CourseProgress } from '@/types/domain'
import { studentCourseService } from '@/services/student-course-service'

export interface StudentCourseState {
  enrolledCourses: Course[]
  recommendedCourses: Course[]
  currentCourse: Course | null
  courseProgress: CourseProgress | null
  loading: boolean
  error: string | null
}

export interface StudentCourseActions {
  loadEnrolledCourses: (userId: string) => Promise<void>
  loadRecommendedCourses: (userId: string) => Promise<void>
  loadCourseProgress: (userId: string, courseId: string) => Promise<void>
  enrollInCourse: (userId: string, courseId: string) => Promise<void>
  setCurrentCourse: (course: Course | null) => void
}

export interface StudentCourseSlice extends StudentCourseState, StudentCourseActions {}

const initialState: StudentCourseState = {
  enrolledCourses: [],
  recommendedCourses: [],
  currentCourse: null,
  courseProgress: null,
  loading: false,
  error: null,
}

export const createStudentCourseSlice: StateCreator<StudentCourseSlice> = (set) => ({
  ...initialState,

  loadEnrolledCourses: async (userId: string) => {
    set({ loading: true, error: null })
    
    const result = await studentCourseService.getEnrolledCourses(userId)
    
    if (result.error) {
      set({ loading: false, error: result.error })
    } else {
      set({ loading: false, enrolledCourses: result.data || [], error: null })
    }
  },

  loadRecommendedCourses: async (userId: string) => {
    set({ loading: true, error: null })
    
    const result = await studentCourseService.getRecommendedCourses(userId)
    
    if (result.error) {
      set({ loading: false, error: result.error })
    } else {
      set({ loading: false, recommendedCourses: result.data || [], error: null })
    }
  },

  loadCourseProgress: async (userId: string, courseId: string) => {
    set({ loading: true, error: null })
    
    const result = await studentCourseService.getCourseProgress(userId, courseId)
    
    if (result.error) {
      set({ loading: false, error: result.error })
    } else {
      set({ loading: false, courseProgress: result.data || null, error: null })
    }
  },

  enrollInCourse: async (userId: string, courseId: string) => {
    set({ loading: true, error: null })
    
    const result = await studentCourseService.enrollInCourse(userId, courseId)
    
    if (result.error) {
      set({ loading: false, error: result.error })
    } else if (result.data?.success) {
      // Reload enrolled courses after successful enrollment
      const coursesResult = await studentCourseService.getEnrolledCourses(userId)
      set({ 
        loading: false, 
        enrolledCourses: coursesResult.data || [],
        error: null 
      })
    }
  },

  setCurrentCourse: (course: Course | null) => {
    set({ currentCourse: course })
  },
})