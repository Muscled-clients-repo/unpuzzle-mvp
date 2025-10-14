import { useInfiniteQuery } from '@tanstack/react-query'
import { getInstructorQuizAttempts, type QuizAttempt } from '@/app/actions/instructor-quiz-actions'

/**
 * Infinite query hook for instructor to view student quiz attempts
 *
 * Features:
 * - Pagination with "Load More" button
 * - Filters by video, course, and optionally by student
 * - Authorization enforced at action level
 * - Automatic cache management
 *
 * @param videoId - Video ID to filter by
 * @param courseId - Course ID (instructor must own this course)
 * @param userId - Optional: Student ID to filter (null = all students)
 * @param options - Query configuration options
 */
export function useInfiniteQuizAttemptsQuery(
  videoId: string,
  courseId: string,
  userId?: string | null,
  options?: { enabled?: boolean; pageSize?: number }
) {
  const pageSize = options?.pageSize || 20

  return useInfiniteQuery({
    queryKey: instructorQuizAttemptKeys.list(videoId, courseId, userId),
    queryFn: async ({ pageParam = 0 }) => {
      const result = await getInstructorQuizAttempts(
        videoId,
        courseId,
        userId,
        pageSize,
        pageParam
      )

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch quiz attempts')
      }

      return {
        data: result.data || [],
        nextOffset: result.nextOffset,
        hasMore: result.hasMore || false
      }
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.nextOffset : undefined
    },
    enabled: options?.enabled !== undefined
      ? (options.enabled && !!videoId && !!courseId)
      : (!!videoId && !!courseId),
    staleTime: 2 * 60 * 1000, // 2 minutes - quiz attempts don't change frequently
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache (renamed from cacheTime in v5)
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })
}

// Query key factory for consistency and easy invalidation
export const instructorQuizAttemptKeys = {
  all: ['instructor-quiz-attempts'] as const,
  lists: () => [...instructorQuizAttemptKeys.all, 'list'] as const,
  list: (videoId: string, courseId: string, userId?: string | null) =>
    [...instructorQuizAttemptKeys.lists(), videoId, courseId, userId ?? 'all'] as const,
}

// Helper to flatten all pages into single array (for rendering)
export function flattenQuizAttempts(
  data: { pages: { data: QuizAttempt[] }[] } | undefined
): QuizAttempt[] {
  if (!data?.pages) return []
  return data.pages.flatMap(page => page.data)
}
