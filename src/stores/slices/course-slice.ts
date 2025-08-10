import { StateCreator } from 'zustand'
import { CourseState, CourseActions, Course } from '@/types/app-types'
import { courseService, type CourseFilters } from '@/services'

export interface CourseSlice extends CourseState, CourseActions {}

const initialCourseState: CourseState = {
  courses: [],
  currentCourse: null,
  enrolledCourses: [],
  loading: false,
  error: null,
}

export const createCourseSlice: StateCreator<CourseSlice> = (set, get) => ({
  ...initialCourseState,

  // Service-based actions
  loadCourses: async (filters?: CourseFilters) => {
    set({ loading: true, error: null })
    
    const result = await courseService.getCourses(filters)
    
    if (result.error) {
      set({ loading: false, error: result.error })
    } else {
      set({ loading: false, courses: result.data || [], error: null })
    }
  },

  loadCourseById: async (id: string) => {
    set({ loading: true, error: null })
    
    const result = await courseService.getCourseById(id)
    
    if (result.error) {
      set({ loading: false, error: result.error })
    } else {
      set({ loading: false, currentCourse: result.data || null, error: null })
    }
  },

  searchCourses: async (query: string) => {
    set({ loading: true, error: null })
    
    const result = await courseService.searchCourses(query)
    
    if (result.error) {
      set({ loading: false, error: result.error })
    } else {
      set({ loading: false, courses: result.data || [], error: null })
    }
  },

  // Legacy direct setters (kept for compatibility)
  setCourses: (courses: Course[]) => 
    set({ courses }),

  setCurrentCourse: (course: Course | null) =>
    set({ currentCourse: course }),

  enrollInCourse: (courseId: string) =>
    set((state) => ({
      enrolledCourses: state.enrolledCourses.includes(courseId)
        ? state.enrolledCourses
        : [...state.enrolledCourses, courseId],
    })),

  setLoading: (loading: boolean) =>
    set({ loading }),

  setError: (error: string | null) =>
    set({ error }),
})