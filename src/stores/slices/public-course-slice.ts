import { StateCreator } from 'zustand'
import { Course, CourseReview } from '@/types/domain'
import { publicCourseService, CourseFilters, CourseCatalogResponse, CourseReviewsResponse } from '@/services/public-course-service'

export interface PublicCourseSlice {
  // State
  courses: Course[]
  currentCourse: Course | null
  courseReviews: CourseReview[]
  recommendedCourses: Course[]
  
  // Pagination & Filters
  currentFilters: CourseFilters
  totalPages: number
  currentPage: number
  totalCount: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  
  // Reviews Data
  averageRating: number
  ratingDistribution: Record<number, number>
  reviewsCurrentPage: number
  reviewsTotalPages: number
  reviewsTotalCount: number
  
  // Loading States
  loading: boolean
  loadingCourse: boolean
  loadingReviews: boolean
  loadingRecommendations: boolean
  
  // Error States
  error: string | null
  courseError: string | null
  reviewsError: string | null
  
  // Actions
  loadCourses: (filters?: CourseFilters) => Promise<void>
  loadCourseById: (courseId: string) => Promise<void>
  loadCourseReviews: (courseId: string, page?: number) => Promise<void>
  loadRecommendedCourses: () => Promise<void>
  updateFilters: (filters: Partial<CourseFilters>) => void
  clearCurrentCourse: () => void
  clearError: () => void
  resetFilters: () => void
}

const defaultFilters: CourseFilters = {
  page: 1,
  limit: 20,
  sortBy: 'newest',
  difficulty: 'all',
  priceRange: 'all'
}

export const createPublicCourseSlice: StateCreator<
  PublicCourseSlice,
  [],
  [],
  PublicCourseSlice
> = (set, get) => ({
  // Initial State
  courses: [],
  currentCourse: null,
  courseReviews: [],
  recommendedCourses: [],
  
  currentFilters: { ...defaultFilters },
  totalPages: 0,
  currentPage: 1,
  totalCount: 0,
  hasNextPage: false,
  hasPreviousPage: false,
  
  averageRating: 0,
  ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  reviewsCurrentPage: 1,
  reviewsTotalPages: 0,
  reviewsTotalCount: 0,
  
  loading: false,
  loadingCourse: false,
  loadingReviews: false,
  loadingRecommendations: false,
  
  error: null,
  courseError: null,
  reviewsError: null,

  // Actions
  loadCourses: async (filters?: CourseFilters) => {
    const mergedFilters = { ...get().currentFilters, ...filters }
    
    // Reset to page 1 if filters changed (except page)
    if (filters && Object.keys(filters).some(key => key !== 'page')) {
      mergedFilters.page = 1
    }
    
    set({ 
      loading: true, 
      error: null,
      currentFilters: mergedFilters 
    })

    try {
      const result = await publicCourseService.getCourses(mergedFilters)

      if (result.success) {
        set({
          courses: result.data.courses,
          totalPages: result.data.totalPages,
          currentPage: result.data.currentPage,
          totalCount: result.data.totalCount,
          hasNextPage: result.data.hasNextPage,
          hasPreviousPage: result.data.hasPreviousPage,
          loading: false,
          error: null
        })
      } else {
        set({
          error: result.error,
          loading: false
        })
      }
    } catch (error) {
      set({
        error: 'Unexpected error while loading courses',
        loading: false
      })
    }
  },

  loadCourseById: async (courseId: string) => {
    set({ loadingCourse: true, courseError: null })

    try {
      const result = await publicCourseService.getCourseById(courseId)

      if (result.success) {
        set({
          currentCourse: result.data,
          loadingCourse: false,
          courseError: null
        })
      } else {
        set({
          courseError: result.error,
          loadingCourse: false
        })
      }
    } catch (error) {
      set({
        courseError: 'Unexpected error while loading course details',
        loadingCourse: false
      })
    }
  },

  loadCourseReviews: async (courseId: string, page = 1) => {
    set({ loadingReviews: true, reviewsError: null })

    try {
      const result = await publicCourseService.getCourseReviews(courseId, page, 20)

      if (result.success) {
        set({
          courseReviews: result.data.reviews,
          averageRating: result.data.averageRating,
          ratingDistribution: result.data.ratingDistribution,
          reviewsCurrentPage: result.data.currentPage,
          reviewsTotalPages: result.data.totalPages,
          reviewsTotalCount: result.data.totalCount,
          loadingReviews: false,
          reviewsError: null
        })
      } else {
        set({
          reviewsError: result.error,
          loadingReviews: false
        })
      }
    } catch (error) {
      set({
        reviewsError: 'Unexpected error while loading reviews',
        loadingReviews: false
      })
    }
  },

  loadRecommendedCourses: async () => {
    set({ loadingRecommendations: true })

    try {
      const result = await publicCourseService.getRecommendedCourses()

      if (result.success) {
        set({
          recommendedCourses: result.data,
          loadingRecommendations: false
        })
      } else {
        // Don't set error for recommendations, just fail silently
        set({
          loadingRecommendations: false
        })
      }
    } catch (error) {
      set({
        loadingRecommendations: false
      })
    }
  },

  updateFilters: (filters: Partial<CourseFilters>) => {
    const currentFilters = get().currentFilters
    const newFilters = { ...currentFilters, ...filters }
    
    // Reset page to 1 if any filter other than page changed
    if (Object.keys(filters).some(key => key !== 'page')) {
      newFilters.page = 1
    }
    
    set({ currentFilters: newFilters })
    get().loadCourses(newFilters)
  },

  clearCurrentCourse: () => {
    set({ 
      currentCourse: null, 
      courseError: null,
      courseReviews: [],
      reviewsError: null,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    })
  },

  clearError: () => {
    set({ error: null, courseError: null, reviewsError: null })
  },

  resetFilters: () => {
    const newFilters = { ...defaultFilters }
    set({ currentFilters: newFilters })
    get().loadCourses(newFilters)
  }
})