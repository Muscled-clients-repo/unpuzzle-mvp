import { useMutation, useQueryClient } from '@tanstack/react-query'
import { submitQuizAttemptAction, QuizAttemptData } from '@/app/actions/quiz-actions'
import { quizAttemptKeys } from './use-quiz-attempts-query'

export function useQuizAttemptMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: QuizAttemptData) => {
      console.log('[QuizAttemptMutation] Submitting quiz attempt:', {
        videoId: data.videoId,
        courseId: data.courseId,
        score: data.score,
        totalQuestions: data.totalQuestions,
        percentage: data.percentage
      })

      const result = await submitQuizAttemptAction(data)

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit quiz attempt')
      }

      return result.data
    },
    onSuccess: (data, variables) => {
      console.log('[QuizAttemptMutation] Successfully submitted quiz attempt:', data)

      // Invalidate and force refetch quiz attempts query immediately
      queryClient.invalidateQueries({
        queryKey: quizAttemptKeys.list(variables.videoId, variables.courseId),
        refetchType: 'active'
      })

      // Also invalidate the general quiz attempts cache
      queryClient.invalidateQueries({
        queryKey: quizAttemptKeys.all,
        refetchType: 'active'
      })

      // Force immediate refetch for the specific query
      queryClient.refetchQueries({
        queryKey: quizAttemptKeys.list(variables.videoId, variables.courseId)
      })
    },
    onError: (error) => {
      console.error('[QuizAttemptMutation] Failed to submit quiz attempt:', error)
    }
  })
}