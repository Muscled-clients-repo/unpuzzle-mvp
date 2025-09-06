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
  const queryClient = useQueryClient()
  
  return useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const result = await getCourseAction(courseId)
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch course')
      }
      return result.data
    },
    enabled: !!courseId,
    staleTime: 10 * 60 * 1000, // Consider data fresh for 10 minutes
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
    retry: 1, // Only retry once to avoid long delays
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    refetchOnMount: false, // Don't refetch when component mounts if data exists
    networkMode: 'offlineFirst', // Use cache first, then network
    placeholderData: () => {
      // Try to get initial data from courses list cache
      const coursesData = queryClient.getQueryData(['courses'])
      if (coursesData && Array.isArray(coursesData)) {
        const course = coursesData.find((c: any) => c.id === courseId)
        if (course) {
          return { ...course, videos: [] } // Basic course data without videos
        }
      }
      return undefined
    }
  })
}

/**
 * Query hook to fetch all courses for the current user
 */
export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const result = await getCoursesAction()
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch courses')
      }
      return result.data
    },
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
  })
}

/**
 * Query hook to fetch virtual chapters for a course
 */
export function useChapters(courseId: string) {
  return useQuery({
    queryKey: ['chapters', courseId],
    queryFn: async () => {
      const chapters = await getChaptersForCourseAction(courseId)
      return chapters
    },
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
      queryFn: async () => {
        const result = await getCourseAction(courseId)
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch course')
        }
        return result.data
      },
      staleTime: 5 * 60 * 1000,
    })
  }, [queryClient])
  
  return { prefetchCourse }
}