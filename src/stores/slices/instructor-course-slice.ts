// src/stores/slices/instructor-course-slice.ts
import { StateCreator } from 'zustand'
import { Course, Video } from '@/types/domain'
import { instructorCourseService } from '@/services/instructor-course-service'

export interface InstructorCourseState {
  instructorCourses: Course[]
  currentCourse: Course | null
  currentCourseAnalytics: {
    enrollments: number
    completionRate: number
    avgProgress: number
    revenueTotal: number
    revenueThisMonth: number
    totalStudents?: number
    studentEngagement: {
      active: number
      inactive: number
      struggling: number
    }
  } | null
  loading: boolean
  error: string | null
  successMessage: string | null
}

export interface InstructorCourseActions {
  loadInstructorCourses: () => Promise<void>
  loadCourseAnalytics: (courseId: string) => Promise<void>
  createCourse: (course: Partial<Course>) => Promise<void>
  updateCourse: (courseId: string, updates: Partial<Course>) => Promise<void>
  deleteCourse: (courseId: string) => Promise<void>
  publishCourse: (courseId: string) => Promise<void>
  unpublishCourse: (courseId: string) => Promise<void>
  duplicateCourse: (courseId: string) => Promise<void>
  addVideoToCourse: (courseId: string, video: Partial<Video>) => Promise<void>
  setCurrentCourse: (course: Course | null) => void
  clearMessages: () => void
}

export interface InstructorCourseSlice extends InstructorCourseState, InstructorCourseActions {}

const initialState: InstructorCourseState = {
  instructorCourses: [],
  currentCourse: null,
  currentCourseAnalytics: null,
  loading: false,
  error: null,
  successMessage: null,
}

export const createInstructorCourseSlice: StateCreator<InstructorCourseSlice> = (set, get) => ({
  ...initialState,

  loadInstructorCourses: async () => {
    console.log('🔍 loadInstructorCourses called')
    set({ loading: true, error: null })
    
    try {
      console.log('📞 About to call instructorCourseService.getInstructorCourses()')
      const result = await instructorCourseService.getInstructorCourses()
      console.log('📊 API result received:', result)
      console.log('📊 Result type:', typeof result)
      console.log('📊 Result.data:', result.data)
      console.log('📊 Result.error:', result.error)
      
      if (result.error) {
        console.log('❌ Error loading courses:', result.error)
        set({ loading: false, error: result.error })
      } else {
        // Handle both ServiceResult format and raw API response format
        let coursesData = result.data
        
        // If result.data has a nested 'data' property, extract it
        if (coursesData && typeof coursesData === 'object' && 'data' in coursesData && Array.isArray(coursesData.data)) {
          coursesData = coursesData.data
          console.log('📦 Extracted nested data array:', coursesData.length, 'courses')
        }
        
        console.log('✅ Courses loaded successfully:', coursesData?.length || 0, 'courses')
        set({ loading: false, instructorCourses: coursesData || [], error: null })
      }
      console.log('🏁 loadInstructorCourses completed, loading set to false')
    } catch (error) {
      console.error('💥 Unexpected error in loadInstructorCourses:', error)
      set({ loading: false, error: 'Unexpected error occurred' })
    }
  },

  loadCourseAnalytics: async (courseId: string) => {
    set({ loading: true, error: null })
    
    const result = await instructorCourseService.getCourseAnalytics(courseId)
    
    if (result.error) {
      set({ loading: false, error: result.error })
    } else {
      set({ loading: false, currentCourseAnalytics: result.data || null, error: null })
    }
  },

  createCourse: async (course: Partial<Course>) => {
    set({ loading: true, error: null })
    
    const result = await instructorCourseService.createCourse(course)
    
    if (result.error) {
      set({ loading: false, error: result.error })
    } else {
      // Add new course to the list
      set((state) => ({
        loading: false,
        instructorCourses: [...state.instructorCourses, result.data!],
        error: null
      }))
    }
  },

  updateCourse: async (courseId: string, updates: Partial<Course>) => {
    set({ loading: true, error: null })
    
    const result = await instructorCourseService.updateCourse(courseId, updates)
    
    if (result.error) {
      set({ loading: false, error: result.error })
    } else {
      // Update course in the list
      set((state) => ({
        loading: false,
        instructorCourses: state.instructorCourses.map(c => 
          c.id === courseId ? result.data! : c
        ),
        currentCourse: state.currentCourse?.id === courseId ? result.data! : state.currentCourse,
        error: null
      }))
    }
  },

  publishCourse: async (courseId: string) => {
    // Find the course
    const course = get().instructorCourses.find(c => c.id === courseId)
    if (!course) return
    
    // Optimistic update
    set((state) => ({
      instructorCourses: state.instructorCourses.map(c => 
        c.id === courseId ? { ...c, status: 'published' } : c
      ),
      loading: false,
      successMessage: 'Course published successfully'
    }))
    
    const result = await instructorCourseService.publishCourse(courseId)
    
    if (result.error) {
      // Rollback on error
      set((state) => ({
        instructorCourses: state.instructorCourses.map(c => 
          c.id === courseId ? { ...c, status: course.status } : c
        ),
        error: result.error,
        loading: false
      }))
    }
  },

  unpublishCourse: async (courseId: string) => {
    // Find the course
    const course = get().instructorCourses.find(c => c.id === courseId)
    if (!course) return
    
    // Optimistic update
    set((state) => ({
      instructorCourses: state.instructorCourses.map(c => 
        c.id === courseId ? { ...c, status: 'draft' } : c
      ),
      loading: false,
      successMessage: 'Course unpublished successfully'
    }))
    
    const result = await instructorCourseService.unpublishCourse(courseId)
    
    if (result.error) {
      // Rollback on error
      set((state) => ({
        instructorCourses: state.instructorCourses.map(c => 
          c.id === courseId ? { ...c, status: course.status } : c
        ),
        error: result.error,
        loading: false
      }))
    }
  },

  addVideoToCourse: async (courseId: string, video: Partial<Video>) => {
    set({ loading: true, error: null })
    
    const result = await instructorCourseService.addVideoToCourse(courseId, video)
    
    if (result.error) {
      set({ loading: false, error: result.error })
    } else {
      // Add video to course
      set((state) => ({
        loading: false,
        instructorCourses: state.instructorCourses.map(c => 
          c.id === courseId 
            ? { ...c, videos: [...(c.videos || []), result.data!] }
            : c
        ),
        error: null
      }))
    }
  },

  setCurrentCourse: (course: Course | null) => {
    set({ currentCourse: course })
  },

  deleteCourse: async (courseId: string) => {
    // Store current state for rollback
    const previousCourses = get().instructorCourses
    
    // Optimistic update - remove immediately
    set((state) => ({
      instructorCourses: state.instructorCourses.filter(c => c.id !== courseId),
      loading: false,
      successMessage: 'Course deleted successfully'
    }))
    
    // API call
    const result = await instructorCourseService.deleteCourse(courseId)
    
    // Rollback on error
    if (result.error) {
      set({ 
        instructorCourses: previousCourses,
        error: result.error,
        loading: false,
        successMessage: null
      })
    }
  },

  duplicateCourse: async (courseId: string) => {
    set({ loading: true, error: null })
    
    const result = await instructorCourseService.duplicateCourse(courseId)
    
    if (result.error) {
      set({ loading: false, error: result.error })
    } else if (result.data) {
      // Add duplicated course to the list
      set((state) => ({
        loading: false,
        instructorCourses: [...state.instructorCourses, result.data!],
        error: null,
        successMessage: 'Course duplicated successfully'
      }))
    }
  },

  clearMessages: () => {
    set({ error: null, successMessage: null })
  },
})