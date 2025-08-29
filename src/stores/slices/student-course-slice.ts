// src/stores/slices/student-course-slice.ts
import { StateCreator } from 'zustand'
import { Course, CourseProgress } from '@/types/domain'
import { studentCourseService } from '@/services/student-course-service'

export interface StudentCourseState {
  enrolledCourses: Course[]
  recommendedCourses: Course[]
  currentCourse: Course | null
  courseProgress: Record<string, CourseProgress> // Store progress per course
  loading: boolean
  error: string | null
  // Operation-specific loading states
  enrollingCourseId: string | null
  unenrollingCourseId: string | null
  loadingProgressCourseId: string | null
  submittingReviewCourseId: string | null
}

export interface StudentCourseActions {
  loadEnrolledCourses: (userId: string) => Promise<void>
  loadRecommendedCourses: (userId: string) => Promise<void>
  loadAllCourses: () => Promise<void>
  loadCourseById: (courseId: string) => Promise<void>
  loadCourseProgress: (courseId: string) => Promise<void>
  enrollInCourse: (userId: string, courseId: string, paymentData?: { paymentMethod?: string; couponCode?: string }) => Promise<void>
  unenrollFromCourse: (courseId: string) => Promise<void>
  submitCourseReview: (courseId: string, review: { rating: number; comment: string }) => Promise<void>
  setCurrentCourse: (course: Course | null) => void
  calculateProgress: (courseId: string) => number
}

export interface StudentCourseSlice extends StudentCourseState, StudentCourseActions {}

const initialState: StudentCourseState = {
  enrolledCourses: [],
  recommendedCourses: [],
  currentCourse: null,
  courseProgress: {},
  loading: false,
  error: null,
  enrollingCourseId: null,
  unenrollingCourseId: null,
  loadingProgressCourseId: null,
  submittingReviewCourseId: null,
}

export const createStudentCourseSlice: StateCreator<StudentCourseSlice> = (set, get) => ({
  ...initialState,

  loadEnrolledCourses: async (userId: string) => {
    set({ loading: true, error: null })
    
    try {
      const result = await studentCourseService.getEnrolledCourses(userId)
      
      if (result.error) {
        console.error('Error loading enrolled courses:', result.error)
        set({ loading: false, error: result.error, enrolledCourses: [] })
      } else {
        // Ensure we always set an array
        const courses = Array.isArray(result.data) ? result.data : []
        console.log(`Loaded ${courses.length} enrolled courses`)
        set({ loading: false, enrolledCourses: courses, error: null })
      }
    } catch (error) {
      console.error('Exception loading enrolled courses:', error)
      set({ loading: false, error: 'Failed to load courses', enrolledCourses: [] })
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

  loadCourseProgress: async (courseId: string) => {
    set({ loadingProgressCourseId: courseId, error: null })
    
    // Backend extracts userId from auth token
    const result = await studentCourseService.getCourseProgress('', courseId)
    
    if (result.error) {
      set({ loadingProgressCourseId: null, error: result.error })
    } else if (result.data) {
      const currentProgress = get().courseProgress
      set({ 
        loadingProgressCourseId: null, 
        courseProgress: { ...currentProgress, [courseId]: result.data },
        error: null 
      })
    }
  },

  enrollInCourse: async (userId: string, courseId: string, paymentData?: { paymentMethod?: string; couponCode?: string }) => {
    set({ enrollingCourseId: courseId, error: null })
    
    const result = await studentCourseService.enrollInCourse(userId, courseId, paymentData)
    
    if (result.error) {
      set({ enrollingCourseId: null, error: result.error })
    } else if (result.data?.success) {
      // Reload enrolled courses after successful enrollment
      const coursesResult = await studentCourseService.getEnrolledCourses(userId)
      set({ 
        enrollingCourseId: null, 
        enrolledCourses: coursesResult.data || [],
        error: null 
      })
    }
  },

  unenrollFromCourse: async (courseId: string) => {
    set({ unenrollingCourseId: courseId, error: null })
    
    const result = await studentCourseService.unenrollFromCourse(courseId)
    
    if (result.error) {
      set({ unenrollingCourseId: null, error: result.error })
      return
    }
    
    // Optimistically remove from enrolled courses
    const currentCourses = get().enrolledCourses
    set({ 
      enrolledCourses: currentCourses.filter(c => c.id !== courseId),
      unenrollingCourseId: null,
      error: null
    })
  },

  submitCourseReview: async (courseId: string, review: { rating: number; comment: string }) => {
    set({ submittingReviewCourseId: courseId, error: null })
    
    const result = await studentCourseService.submitCourseReview(courseId, review)
    
    if (result.error) {
      set({ submittingReviewCourseId: null, error: result.error })
      return
    }
    
    set({ submittingReviewCourseId: null, error: null })
    
    // Optionally reload course to get updated review
    // await get().loadCourseProgress('', courseId)
  },

  setCurrentCourse: (course: Course | null) => {
    set({ currentCourse: course })
  },

  calculateProgress: (courseId: string) => {
    // Get actual progress from state if available
    const progress = get().courseProgress[courseId]
    return progress?.percentComplete || 0
  },
})