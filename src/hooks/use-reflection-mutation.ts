import { useMutation, useQueryClient } from '@tanstack/react-query'
import { submitReflectionAction } from '@/app/actions/reflection-actions'
import { reflectionKeys } from './use-reflections-query'

export interface ReflectionMutationData {
  type: 'voice' | 'screenshot' | 'loom'
  videoId: string
  courseId: string
  videoTimestamp: number
  duration?: number
  file?: File
  loomUrl?: string
}

export function useReflectionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ReflectionMutationData) => {
      console.log('[ReflectionMutation] Input data:', data)
      console.log('[ReflectionMutation] File object:', data.file)
      console.log('[ReflectionMutation] File type:', data.file?.type)
      console.log('[ReflectionMutation] File size:', data.file?.size)

      // Convert data to FormData
      const formData = new FormData()
      formData.append('type', data.type)
      formData.append('videoId', data.videoId)
      formData.append('courseId', data.courseId)
      formData.append('videoTimestamp', data.videoTimestamp.toString())

      if (data.file) {
        formData.append('file', data.file)
        console.log('[ReflectionMutation] File appended to FormData')
      } else {
        console.error('[ReflectionMutation] No file in data object!')
      }

      if (data.duration) {
        formData.append('duration', data.duration.toString())
      }
      if (data.loomUrl) {
        formData.append('loomUrl', data.loomUrl)
      }

      console.log('[ReflectionMutation] FormData entries:')
      for (const [key, value] of formData.entries()) {
        console.log(`  ${key}:`, value)
      }

      const result = await submitReflectionAction(formData)

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit reflection')
      }

      return result.data
    },
    onSuccess: (data, variables) => {
      console.log('[Reflection Mutation] Successfully submitted reflection:', data)

      // Invalidate reflections query to refetch updated data
      queryClient.invalidateQueries({
        queryKey: reflectionKeys.list(variables.videoId, variables.courseId)
      })
    },
    onError: (error) => {
      console.error('[Reflection Mutation] Failed to submit reflection:', error)
    }
  })
}