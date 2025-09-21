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

export function useReflectionsQuery(videoId: string, courseId: string) {
  return useQuery({
    queryKey: ['reflections', videoId, courseId],
    queryFn: () => getReflectionsAction(videoId, courseId),
    enabled: !!videoId && !!courseId,
    staleTime: 30 * 1000, // 30 seconds
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