import { StateCreator } from 'zustand'
import { CourseState, CourseActions, Course } from '@/types/app-types'

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