// src/stores/slices/student-learning-slice.ts
// Step 5: Store Integration - Connects UI to Database Service
// This slice manages the state for student learning with full analytics

import { StateCreator } from 'zustand'
import { Course } from '@/types/domain'
import { studentLearningService } from '@/services/student-learning.service'
import { studentCourseService } from '@/services/student-course-service'

// ============================================================
// TYPES FOR ENHANCED LEARNING STATE
// ============================================================

export interface GoalBasedCourse {
  // Course basic info
  course: Course
  courseId: string

  // Goal-based metadata
  goalAccessGrantedAt: string
}

export interface StudentLearningState {
  // Goal-based courses
  goalBasedCourses: GoalBasedCourse[]

  // Other course arrays for compatibility
  recommendedCourses: Course[]
  allCourses: Course[]

  // Current selections
  currentCourse: Course | null
  currentGoalBasedCourse: GoalBasedCourse | null

  // UI state
  loading: boolean
  error: string | null
  lastFetch: string | null
}

export interface StudentLearningActions {
  // Main data loading with analytics
  loadStudentLearningData: (userId: string) => Promise<void>

  // Individual loaders (for compatibility)
  loadGoalBasedCourses: (userId: string) => Promise<void>
  loadRecommendedCourses: (userId: string) => Promise<void>
  loadAllCourses: () => Promise<void>
  loadCourseById: (courseId: string) => Promise<void>

  // UI actions
  setCurrentCourse: (course: Course | null) => void

  // Computed
  getGoalBasedCourse: (courseId: string) => GoalBasedCourse | undefined
}

export interface StudentLearningSlice extends StudentLearningState, StudentLearningActions {}

const initialState: StudentLearningState = {
  goalBasedCourses: [],
  recommendedCourses: [],
  allCourses: [],
  currentCourse: null,
  currentGoalBasedCourse: null,
  loading: false,
  error: null,
  lastFetch: null
}

export const createStudentLearningSlice: StateCreator<StudentLearningSlice> = (set, get) => ({
  ...initialState,

  // ============================================================
  // MAIN LOADER - Gets everything in one efficient call
  // ============================================================
  loadStudentLearningData: async (userId: string) => {
    set({ loading: true, error: null })

    try {
      // Use existing goal-based course service
      const { getEnrolledCourses } = await import('@/app/actions/student-course-actions')
      const courses = await getEnrolledCourses()

      if (!courses) {
        set({ loading: false, error: 'Failed to load courses' })
        return
      }

      // Transform to simple goal-based format
      const goalBasedCourses: GoalBasedCourse[] = courses.map(course => ({
        course: course,
        courseId: course.id,
        goalAccessGrantedAt: new Date().toISOString()
      }))

      set({
        goalBasedCourses: goalBasedCourses,
        loading: false,
        error: null,
        lastFetch: new Date().toISOString()
      })
      
    } catch (error) {
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to load learning data' 
      })
    }
  },

  // ============================================================
  // COMPATIBILITY METHODS (for existing UI)
  // ============================================================
  loadGoalBasedCourses: async (userId: string) => {
    // Use the main loader which gets goal-based courses
    await get().loadStudentLearningData(userId)
  },

  loadRecommendedCourses: async (userId: string) => {
    set({ loading: true, error: null })
    
    // Use existing service for recommended courses (doesn't need analytics)
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
      set({ loading: false, allCourses: result.data || [], error: null })
    }
  },

  loadCourseById: async (courseId: string) => {
    set({ loading: true, error: null })
    
    const result = await studentCourseService.getCourseById(courseId)
    
    if (result.error) {
      set({ loading: false, error: result.error })
    } else {
      const course = result.data
      set({ loading: false, currentCourse: course || null, error: null })
      
      // Also set goal-based course if we have it
      if (course) {
        const goalBasedCourse = get().getGoalBasedCourse(course.id)
        set({ currentGoalBasedCourse: goalBasedCourse || null })
      }
    }
  },


  // ============================================================
  // UI ACTIONS
  // ============================================================
  setCurrentCourse: (course: Course | null) => {
    set({ currentCourse: course })

    // Also set goal-based course if available
    if (course) {
      const goalBasedCourse = get().getGoalBasedCourse(course.id)
      set({ currentGoalBasedCourse: goalBasedCourse || null })
    } else {
      set({ currentGoalBasedCourse: null })
    }
  },

  // ============================================================
  // COMPUTED GETTERS
  // ============================================================

  getGoalBasedCourse: (courseId: string) => {
    return get().goalBasedCourses.find(c => c.courseId === courseId)
  }
})