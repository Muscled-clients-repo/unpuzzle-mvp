// src/stores/slices/instructor-course-slice.ts
import { StateCreator } from 'zustand'
import { Course, InstructorCourse, Video } from '@/types/domain'
import { instructorCourseService } from '@/services/instructor-course-service'

export interface InstructorCourseState {
  instructorCourses: InstructorCourse[]
  currentCourse: InstructorCourse | null
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
}

export interface InstructorCourseActions {
  loadInstructorCourses: (instructorId: string) => Promise<void>
  loadCourseAnalytics: (courseId: string) => Promise<void>
  createCourse: (course: Partial<InstructorCourse>) => Promise<void>
  updateCourse: (courseId: string, updates: Partial<InstructorCourse>) => Promise<void>
  publishCourse: (courseId: string) => Promise<void>
  unpublishCourse: (courseId: string) => Promise<void>
  addVideoToCourse: (courseId: string, video: Partial<Video>) => Promise<void>
  setCurrentCourse: (course: InstructorCourse | null) => void
}

export interface InstructorCourseSlice extends InstructorCourseState, InstructorCourseActions {}

const initialState: InstructorCourseState = {
  instructorCourses: [],
  currentCourse: null,
  currentCourseAnalytics: null,
  loading: false,
  error: null,
}

export const createInstructorCourseSlice: StateCreator<InstructorCourseSlice> = (set) => ({
  ...initialState,

  loadInstructorCourses: async (instructorId: string) => {
    set({ loading: true, error: null })
    
    const result = await instructorCourseService.getInstructorCourses(instructorId)
    
    if (result.error) {
      set({ loading: false, error: result.error })
    } else {
      set({ loading: false, instructorCourses: result.data || [], error: null })
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
    set({ loading: true, error: null })
    
    const result = await instructorCourseService.publishCourse(courseId)
    
    if (result.error) {
      set({ loading: false, error: result.error })
    } else {
      // Update course status
      set((state) => ({
        loading: false,
        instructorCourses: state.instructorCourses.map(c => 
          c.id === courseId ? { ...c, isPublished: true } : c
        ),
        error: null
      }))
    }
  },

  unpublishCourse: async (courseId: string) => {
    set({ loading: true, error: null })
    
    const result = await instructorCourseService.unpublishCourse(courseId)
    
    if (result.error) {
      set({ loading: false, error: result.error })
    } else {
      // Update course status
      set((state) => ({
        loading: false,
        instructorCourses: state.instructorCourses.map(c => 
          c.id === courseId ? { ...c, isPublished: false } : c
        ),
        error: null
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
})