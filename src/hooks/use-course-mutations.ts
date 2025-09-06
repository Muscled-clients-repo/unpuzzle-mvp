import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { 
  createCourseAction,
  updateCourse,
  deleteCourse,
  saveCourseAsDraftAction,
  publishCourseAction,
  unpublishCourseAction
} from '@/app/actions/course-actions'

/**
 * Mutation hooks for course operations
 */
export function useCourseMutations() {
  const queryClient = useQueryClient()
  const router = useRouter()
  
  // Create course mutation
  const createCourse = useMutation({
    mutationFn: createCourseAction,
    onSuccess: (result) => {
      if (result.success && result.data) {
        // Invalidate courses list
        queryClient.invalidateQueries({ queryKey: ['courses'] })
        // Add new course to cache
        queryClient.setQueryData(['course', result.data.id], result.data)
        toast.success('Course created successfully')
        // Navigate to edit page
        router.push(`/instructor/course/${result.data.id}/edit`)
      } else {
        toast.error(result.error || 'Failed to create course')
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create course')
    }
  })
  
  // Update course mutation
  const updateCourseMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => 
      updateCourse(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['course', id] })
      
      // Snapshot previous value
      const previousCourse = queryClient.getQueryData(['course', id])
      
      // Optimistically update
      queryClient.setQueryData(['course', id], (old: any) => ({
        ...old,
        ...data,
        updated_at: new Date().toISOString()
      }))
      
      return { previousCourse }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousCourse) {
        queryClient.setQueryData(['course', variables.id], context.previousCourse)
      }
      toast.error('Failed to update course')
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      queryClient.invalidateQueries({ queryKey: ['course', variables.id] })
      toast.success('Course updated successfully')
    }
  })
  
  // Delete course mutation
  const deleteCourseMutation = useMutation({
    mutationFn: deleteCourse,
    onMutate: async (courseId) => {
      // Cancel queries
      await queryClient.cancelQueries({ queryKey: ['courses'] })
      await queryClient.cancelQueries({ queryKey: ['course', courseId] })
      
      // Optimistically remove from list
      queryClient.setQueryData(['courses'], (old: any[]) => 
        old?.filter(course => course.id !== courseId) || []
      )
      
      return { courseId }
    },
    onSuccess: (result, courseId) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['courses'] })
        queryClient.removeQueries({ queryKey: ['course', courseId] })
        toast.success(result.message || 'Course deleted successfully')
        router.push('/instructor/courses')
      } else {
        toast.error(result.error || 'Failed to delete course')
      }
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      toast.error('Failed to delete course')
    }
  })
  
  // Save draft mutation (for auto-save)
  const saveDraft = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) =>
      saveCourseAsDraftAction(id, data),
    onSuccess: (result) => {
      if (!result.success) {
        console.error('Draft save failed:', result.error)
      }
      // Don't show toast for auto-save to avoid spam
    },
    onError: (error) => {
      console.error('Draft save error:', error)
    }
  })
  
  // Publish course mutation
  const publishCourse = useMutation({
    mutationFn: publishCourseAction,
    onSuccess: (result, courseId) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['course', courseId] })
        queryClient.invalidateQueries({ queryKey: ['courses'] })
        toast.success('Course published successfully')
      } else {
        toast.error(result.error || 'Failed to publish course')
      }
    },
    onError: (error) => {
      toast.error('Failed to publish course')
    }
  })
  
  // Unpublish course mutation
  const unpublishCourse = useMutation({
    mutationFn: unpublishCourseAction,
    onSuccess: (result, courseId) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['course', courseId] })
        queryClient.invalidateQueries({ queryKey: ['courses'] })
        toast.success('Course unpublished successfully')
      } else {
        toast.error(result.error || 'Failed to unpublish course')
      }
    },
    onError: (error) => {
      toast.error('Failed to unpublish course')
    }
  })
  
  return {
    createCourse,
    updateCourse: updateCourseMutation,
    deleteCourse: deleteCourseMutation,
    saveDraft,
    publishCourse,
    unpublishCourse
  }
}