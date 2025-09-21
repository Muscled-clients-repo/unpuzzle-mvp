import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getLearningActivitiesAction,
  createLearningActivityAction,
  updateLearningActivityAction,
  deleteLearningActivityAction,
  type LearningActivityData,
  type LearningActivityUpdate
} from '@/app/actions/learning-activity-actions'

export interface LearningActivity {
  id: string
  user_id: string
  course_id: string
  video_id?: string
  activity_type: 'quiz' | 'reflection' | 'checkpoint' | 'prompt'
  activity_subtype?: string
  title: string
  content?: any // JSONB content
  state: 'pending' | 'active' | 'completed'
  triggered_at_timestamp?: number
  completed_at?: string
  created_at: string
  updated_at: string
}

// Query hook for fetching learning activities
export function useLearningActivitiesQuery(courseId: string, videoId?: string) {
  return useQuery({
    queryKey: learningActivityKeys.list(courseId, videoId),
    queryFn: () => getLearningActivitiesAction(courseId, videoId),
    enabled: !!courseId,
    staleTime: 30 * 1000, // 30 seconds
  })
}

// Mutation hook for creating learning activities
export function useCreateLearningActivityMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: LearningActivityData) => createLearningActivityAction(data),
    onSuccess: (result, variables) => {
      // Invalidate and refetch activities for the affected course/video
      queryClient.invalidateQueries({
        queryKey: learningActivityKeys.lists()
      })

      // Specifically invalidate the list this activity belongs to
      queryClient.invalidateQueries({
        queryKey: learningActivityKeys.list(variables.courseId, variables.videoId)
      })
    },
  })
}

// Mutation hook for updating learning activities
export function useUpdateLearningActivityMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: LearningActivityUpdate) => updateLearningActivityAction(data),
    onSuccess: () => {
      // Invalidate all activity lists to ensure UI consistency
      queryClient.invalidateQueries({
        queryKey: learningActivityKeys.lists()
      })
    },
  })
}

// Mutation hook for deleting learning activities
export function useDeleteLearningActivityMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (activityId: string) => deleteLearningActivityAction(activityId),
    onSuccess: () => {
      // Invalidate all activity lists
      queryClient.invalidateQueries({
        queryKey: learningActivityKeys.lists()
      })
    },
  })
}

// Query key factory for consistency (follows 3-Layer SSOT pattern)
export const learningActivityKeys = {
  all: ['learning-activities'] as const,
  lists: () => [...learningActivityKeys.all, 'list'] as const,
  list: (courseId: string, videoId?: string) => {
    if (videoId) {
      return [...learningActivityKeys.lists(), courseId, videoId] as const
    }
    return [...learningActivityKeys.lists(), courseId] as const
  },
  details: () => [...learningActivityKeys.all, 'detail'] as const,
  detail: (id: string) => [...learningActivityKeys.details(), id] as const,
}

// Helper hook for activity state management (UI orchestration)
export function useActivityStateHelpers() {
  const updateMutation = useUpdateLearningActivityMutation()

  const activateActivity = (activityId: string) => {
    return updateMutation.mutateAsync({
      id: activityId,
      state: 'active'
    })
  }

  const completeActivity = (activityId: string, content?: any) => {
    return updateMutation.mutateAsync({
      id: activityId,
      state: 'completed',
      content,
      completedAt: new Date().toISOString()
    })
  }

  const resetActivity = (activityId: string) => {
    return updateMutation.mutateAsync({
      id: activityId,
      state: 'pending'
    })
  }

  return {
    activateActivity,
    completeActivity,
    resetActivity,
    isUpdating: updateMutation.isPending
  }
}