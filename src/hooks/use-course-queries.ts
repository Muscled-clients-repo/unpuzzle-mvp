import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { 
  getCourseAction,
  getCoursesAction
} from '@/app/actions/course-actions'
import { getChaptersForCourseAction } from '@/app/actions/chapter-actions'

/**
 * Query hook to fetch a single course with videos
 */
export function useCourse(courseId: string) {
  return useQuery({
    queryKey: ['course', courseId],
    queryFn: () => getCourseAction(courseId),
    enabled: !!courseId,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  })
}

/**
 * Query hook to fetch all courses for the current user
 */
export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: () => getCoursesAction(),
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
  })
}

/**
 * Query hook to fetch virtual chapters for a course
 */
export function useChapters(courseId: string) {
  return useQuery({
    queryKey: ['chapters', courseId],
    queryFn: () => getChaptersForCourseAction(courseId),
    enabled: !!courseId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Prefetch a course (useful for hover preloading)
 */
export function useCoursePrefetch() {
  const queryClient = useQueryClient()
  
  const prefetchCourse = useCallback((courseId: string) => {
    return queryClient.prefetchQuery({
      queryKey: ['course', courseId],
      queryFn: () => getCourseAction(courseId),
      staleTime: 5 * 60 * 1000,
    })
  }, [queryClient])
  
  return { prefetchCourse }
}