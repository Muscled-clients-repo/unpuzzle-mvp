import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useEffect } from 'react'
import { 
  createCourseAction, 
  updateCourseAction, 
  getCourseAction,
  getCoursesAction 
} from '@/app/actions/course-actions'
import { courseEventObserver, MEDIA_EVENTS } from '@/lib/course-event-observer'
import type { Course, CreateCourseRequest, ApiResponse } from '@/types'

// ===== QUERY KEYS =====
export const courseKeys = {
  all: ['courses'] as const,
  lists: () => [...courseKeys.all, 'list'] as const,
  list: (filters: any) => [...courseKeys.lists(), filters] as const,
  details: () => [...courseKeys.all, 'detail'] as const,
  detail: (id: string) => [...courseKeys.details(), id] as const,
  creation: () => [...courseKeys.all, 'creation'] as const,
}

// ===== COURSE CREATION HOOK =====
export function useCourseCreation() {
  const queryClient = useQueryClient()
  
  const createMutation = useMutation({
    mutationFn: (data: CreateCourseRequest) => createCourseAction(data),
    
    onMutate: async (newCourse) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: courseKeys.lists() })
      
      // Snapshot previous value
      const previousCourses = queryClient.getQueryData(courseKeys.lists())
      
      // Optimistic update - add course to list immediately
      queryClient.setQueryData(courseKeys.lists(), (old: Course[] = []) => [
        {
          id: `temp-${Date.now()}`, // Temporary ID
          ...newCourse,
          status: 'draft' as const,
          instructor_id: 'current-user', // Will be set by server
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        ...old
      ])
      
      return { previousCourses }
    },
    
    onSuccess: (result, variables, context) => {
      if (result.success && result.data) {
        // CRITICAL: Set course detail cache FIRST to prevent "Course not found" on navigation
        queryClient.setQueryData(
          courseKeys.detail(result.data.id), 
          result.data
        )
        
        // Update the list to replace temp course with real one
        queryClient.setQueryData(courseKeys.lists(), (old: Course[] = []) => 
          old.map(course => 
            course.id.startsWith('temp-') ? result.data! : course
          )
        )
        
        // Pre-fetch to ensure data is available
        queryClient.prefetchQuery({
          queryKey: courseKeys.detail(result.data.id),
          queryFn: () => getCourseAction(result.data!.id)
        })
        
        toast.success('Course created successfully!')
      } else {
        toast.error(result.error || 'Failed to create course')
      }
    },
    
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousCourses) {
        queryClient.setQueryData(courseKeys.lists(), context.previousCourses)
      }
      toast.error('Failed to create course')
    }
  })
  
  return {
    createCourse: createMutation.mutate,
    createCourseAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    error: createMutation.error
  }
}

// ===== COURSE EDIT HOOK =====
export function useCourseEdit(courseId: string) {
  const queryClient = useQueryClient()
  
  // Query for course data
  const courseQuery = useQuery({
    queryKey: courseKeys.detail(courseId),
    queryFn: async () => {
      console.log('🔍 [COURSE QUERY] Fetching course:', courseId)
      const result = await getCourseAction(courseId)
      console.log('🔍 [COURSE QUERY] Result:', result)
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch course')
      }
      return result.data
    },
    enabled: !!courseId
  })
  
  // Update mutation with optimistic updates
  const updateMutation = useMutation({
    mutationFn: (updates: Partial<Course>) => updateCourseAction(courseId, updates),
    
    onMutate: async (updates) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: courseKeys.detail(courseId) })
      
      // Snapshot previous value
      const previousCourse = queryClient.getQueryData(courseKeys.detail(courseId))
      
      // Optimistic update
      queryClient.setQueryData(courseKeys.detail(courseId), (old: Course) => ({
        ...old,
        ...updates,
        updated_at: new Date().toISOString()
      }))
      
      // Also update in lists cache if it exists
      queryClient.setQueryData(courseKeys.lists(), (old: Course[] = []) =>
        old.map(course => 
          course.id === courseId 
            ? { ...course, ...updates, updated_at: new Date().toISOString() }
            : course
        )
      )
      
      return { previousCourse }
    },
    
    onSuccess: (result) => {
      if (result.success) {
        // Background refetch for consistency
        setTimeout(() => {
          queryClient.refetchQueries({ queryKey: courseKeys.detail(courseId) })
        }, 2000)
        
        // Don't show individual toast - consolidated toast is handled by the edit page
      } else {
        toast.error(result.error || 'Failed to update course')
      }
    },
    
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousCourse) {
        queryClient.setQueryData(courseKeys.detail(courseId), context.previousCourse)
      }
      toast.error('Failed to update course')
    }
  })
  
  // Note: Media-linked observer moved to use-chapter-queries.ts since ChapterManager uses chapters data
  
  return {
    course: courseQuery.data, // Course data is directly available since queryFn returns result.data
    isLoading: courseQuery.isLoading,
    error: courseQuery.error,
    updateCourse: updateMutation.mutate,
    updateCourseAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending
  }
}

// ===== COURSES LIST HOOK =====
export function useCoursesList(filters: any = {}) {
  return useQuery({
    queryKey: courseKeys.list(filters),
    queryFn: () => getCoursesAction(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

// ===== COURSE PREFETCH HOOK =====
export function useCoursePrefetch() {
  const queryClient = useQueryClient()
  
  const prefetchCourse = (courseId: string) => {
    queryClient.prefetchQuery({
      queryKey: courseKeys.detail(courseId),
      queryFn: () => getCourseAction(courseId),
      staleTime: 5 * 60 * 1000, // 5 minutes
    })
  }
  
  return {
    prefetchCourse
  }
}