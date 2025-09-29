// src/stores/slices/student-course-slice.ts
import { StateCreator } from 'zustand'
import { Course, CourseProgress } from '@/types/domain'
import { studentCourseService } from '@/services/student-course-service'

export interface StudentCourseState {
  coursesWithActiveGoals: Course[]
  recommendedCourses: Course[]
  currentCourse: Course | null
  courseProgress: CourseProgress | null
  loading: boolean
  error: string | null
}

export interface StudentCourseActions {
  loadCoursesWithActiveGoals: (userId: string) => Promise<void>
  loadRecommendedCourses: (userId: string) => Promise<void>
  loadAllCourses: () => Promise<void>
  loadCourseById: (courseId: string) => Promise<void>
  loadCourseProgress: (userId: string, courseId: string) => Promise<void>
  assignCourseGoal: (userId: string, courseId: string) => Promise<void>
  setCurrentCourse: (course: Course | null) => void
  calculateProgress: (courseId: string) => number
}

export interface StudentCourseSlice extends StudentCourseState, StudentCourseActions {}

const initialState: StudentCourseState = {
  coursesWithActiveGoals: [],
  recommendedCourses: [],
  currentCourse: null,
  courseProgress: null,
  loading: false,
  error: null,
}

export const createStudentCourseSlice: StateCreator<StudentCourseSlice> = (set, get) => ({
  ...initialState,

  loadCoursesWithActiveGoals: async (userId: string) => {
    set({ loading: true, error: null })

    const result = await studentCourseService.getCoursesWithActiveGoals(userId)

    if (result.error) {
      set({ loading: false, error: result.error })
    } else {
      set({ loading: false, coursesWithActiveGoals: result.data || [], error: null })
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

  assignCourseGoal: async (userId: string, courseId: string) => {
    set({ loading: true, error: null })

    const result = await studentCourseService.assignCourseGoal(userId, courseId)

    if (result.error) {
      set({ loading: false, error: result.error })
    } else if (result.data?.success) {
      // Reload student courses after successful goal assignment
      const coursesResult = await studentCourseService.getCoursesWithActiveGoals(userId)
      set({
        loading: false,
        coursesWithActiveGoals: coursesResult.data || [],
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