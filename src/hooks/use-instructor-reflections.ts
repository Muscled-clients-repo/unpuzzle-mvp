import { useInfiniteQuery } from '@tanstack/react-query'
import { getInstructorReflections, type Reflection } from '@/app/actions/instructor-reflections-actions'

/**
 * Infinite query hook for instructor to view student reflections
 *
 * Features:
 * - Pagination with "Load More" button
 * - Filters by video, course, and optionally by student
 * - Includes voice memos, Loom videos, and screenshots
 * - Authorization enforced at action level
 * - Automatic cache management
 *
 * @param videoId - Video ID to filter by
 * @param courseId - Course ID (instructor must own this course)
 * @param userId - Optional: Student ID to filter (null = all students)
 * @param options - Query configuration options
 */
export function useInfiniteReflectionsQuery(
  videoId: string,
  courseId: string,
  userId?: string | null,
  options?: { enabled?: boolean; pageSize?: number }
) {
  const pageSize = options?.pageSize || 20

  return useInfiniteQuery({
    queryKey: instructorReflectionKeys.list(videoId, courseId, userId),
    queryFn: async ({ pageParam = 0 }) => {
      const result = await getInstructorReflections(
        videoId,
        courseId,
        userId,
        pageSize,
        pageParam
      )

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch reflections')
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
    staleTime: 2 * 60 * 1000, // 2 minutes - reflections don't change frequently
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache (renamed from cacheTime in v5)
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })
}

// Query key factory for consistency and easy invalidation
export const instructorReflectionKeys = {
  all: ['instructor-reflections'] as const,
  lists: () => [...instructorReflectionKeys.all, 'list'] as const,
  list: (videoId: string, courseId: string, userId?: string | null) =>
    [...instructorReflectionKeys.lists(), videoId, courseId, userId ?? 'all'] as const,
}

// Helper to flatten all pages into single array (for rendering)
export function flattenReflections(
  data: { pages: { data: Reflection[] }[] } | undefined
): Reflection[] {
  if (!data?.pages) return []
  return data.pages.flatMap(page => page.data)
}
