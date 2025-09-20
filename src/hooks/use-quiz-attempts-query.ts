import { useQuery } from '@tanstack/react-query'
import { getQuizAttemptsAction, getQuizAttemptByIdAction } from '@/app/actions/quiz-actions'

export interface QuizAttempt {
  id: string
  user_id: string
  video_id: string
  course_id: string
  video_timestamp: number
  questions: any[] // Array of question objects with options, correct answers, explanations
  user_answers: number[] // Array of user's selected answers (indices)
  score: number
  total_questions: number
  percentage: number
  quiz_duration_seconds: number | null
  created_at: string
  updated_at: string
}

export function useQuizAttemptsQuery(videoId: string, courseId: string) {
  return useQuery({
    queryKey: quizAttemptKeys.list(videoId, courseId),
    queryFn: () => getQuizAttemptsAction(videoId, courseId),
    enabled: !!videoId && !!courseId,
    staleTime: 30 * 1000, // 30 seconds
  })
}

export function useQuizAttemptQuery(attemptId: string) {
  return useQuery({
    queryKey: quizAttemptKeys.detail(attemptId),
    queryFn: () => getQuizAttemptByIdAction(attemptId),
    enabled: !!attemptId,
    staleTime: 5 * 60 * 1000, // 5 minutes (quiz attempts don't change often)
  })
}

// Query key factory for consistency
export const quizAttemptKeys = {
  all: ['quiz-attempts'] as const,
  lists: () => [...quizAttemptKeys.all, 'list'] as const,
  list: (videoId: string, courseId: string) => [...quizAttemptKeys.lists(), videoId, courseId] as const,
  details: () => [...quizAttemptKeys.all, 'detail'] as const,
  detail: (id: string) => [...quizAttemptKeys.details(), id] as const,
}