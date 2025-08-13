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
  loadAllCourses: () => Promise<void>
  loadCourseById: (courseId: string) => Promise<void>
  loadCourseProgress: (userId: string, courseId: string) => Promise<void>
  enrollInCourse: (userId: string, courseId: string) => Promise<void>
  setCurrentCourse: (course: Course | null) => void
  calculateProgress: (courseId: string) => number
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

export const createStudentCourseSlice: StateCreator<StudentCourseSlice> = (set, get) => ({
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

  loadAllCourses: async () => {
    set({ loading: true, error: null })
    
    const result = await studentCourseService.getAllCourses()
    
    if (result.error) {
      set({ loading: false, error: result.error })
    } else {
      set({ loading: false, recommendedCourses: result.data || [], error: null })
    }
  },

  loadCourseById: async (courseId: string) => {
    set({ loading: true, error: null })
    
    const result = await studentCourseService.getCourseById(courseId)
    
    if (result.error) {
      set({ loading: false, error: result.error })
    } else {
      set({ loading: false, currentCourse: result.data || null, error: null })
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

  calculateProgress: (courseId: string) => {
    // Mock calculation - in reality would use actual progress data
    return Math.floor(Math.random() * 100)
  },
})