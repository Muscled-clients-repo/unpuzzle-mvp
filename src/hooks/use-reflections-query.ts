import { useQuery } from '@tanstack/react-query'
import { getReflectionsAction } from '@/app/actions/reflection-actions'

export interface Reflection {
  id: string
  user_id: string
  video_id: string
  course_id: string
  reflection_type: 'voice' | 'screenshot' | 'loom' | 'text'
  reflection_text: string
  reflection_prompt: string
  created_at: string
  updated_at: string
  // Industry standard columns for voice memos
  file_url?: string
  duration_seconds?: number
  video_timestamp_seconds?: number
}

export function useReflectionsQuery(
  videoId: string,
  courseId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: reflectionKeys.list(videoId, courseId), // Use consistent query key factory
    queryFn: () => getReflectionsAction(videoId, courseId),
    enabled: options?.enabled !== undefined ? (options.enabled && !!videoId && !!courseId) : (!!videoId && !!courseId),
    // PERFORMANCE P1: Stale-While-Revalidate pattern
    staleTime: 2 * 60 * 1000, // 2 minutes - data is considered fresh
    cacheTime: 30 * 60 * 1000, // 30 minutes - keep in cache
    refetchOnMount: 'always', // Always fetch on mount, but serve stale data first
    refetchOnWindowFocus: false, // Don't refetch on tab switch (reduce API calls)
    refetchOnReconnect: true, // Refetch on reconnect
  })
}

// Query key factory for consistency
export const reflectionKeys = {
  all: ['reflections'] as const,
  lists: () => [...reflectionKeys.all, 'list'] as const,
  list: (videoId: string, courseId: string) => [...reflectionKeys.lists(), videoId, courseId] as const,
  details: () => [...reflectionKeys.all, 'detail'] as const,
  detail: (id: string) => [...reflectionKeys.details(), id] as const,
}