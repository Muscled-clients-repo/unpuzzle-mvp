import { useInfiniteQuery } from '@tanstack/react-query'
import { getInstructorAIConversations, type AIConversation } from '@/app/actions/instructor-ai-chat-actions'

/**
 * Infinite query hook for instructor to view student AI chat conversations
 *
 * Features:
 * - Pagination with "Load More" button
 * - Filters by video, course, and optionally by student
 * - Includes user messages and AI responses
 * - Authorization enforced at action level
 * - Automatic cache management
 *
 * @param videoId - Video/Media File ID to filter by
 * @param courseId - Course ID (instructor must own this course)
 * @param userId - Optional: Student ID to filter (null = all students)
 * @param options - Query configuration options
 */
export function useInfiniteAIChatQuery(
  videoId: string,
  courseId: string,
  userId?: string | null,
  options?: { enabled?: boolean; pageSize?: number }
) {
  const pageSize = options?.pageSize || 20

  return useInfiniteQuery({
    queryKey: instructorAIChatKeys.list(videoId, courseId, userId),
    queryFn: async ({ pageParam = 0 }) => {
      const result = await getInstructorAIConversations(
        videoId,
        courseId,
        userId,
        pageSize,
        pageParam
      )

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch AI conversations')
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
    staleTime: 2 * 60 * 1000, // 2 minutes - AI chats don't change frequently
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache (renamed from cacheTime in v5)
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })
}

// Query key factory for consistency and easy invalidation
export const instructorAIChatKeys = {
  all: ['instructor-ai-chat'] as const,
  lists: () => [...instructorAIChatKeys.all, 'list'] as const,
  list: (videoId: string, courseId: string, userId?: string | null) =>
    [...instructorAIChatKeys.lists(), videoId, courseId, userId ?? 'all'] as const,
}

// Helper to flatten all pages into single array (for rendering)
export function flattenAIConversations(
  data: { pages: { data: AIConversation[] }[] } | undefined
): AIConversation[] {
  if (!data?.pages) return []
  return data.pages.flatMap(page => page.data)
}
