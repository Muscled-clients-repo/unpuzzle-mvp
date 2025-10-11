import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { getVideoAIConversations } from '@/app/actions/video-ai-conversations-actions'

export interface AIConversation {
  id: string
  user_id: string
  media_file_id: string
  parent_message_id: string | null
  video_timestamp: number
  conversation_context: string | null
  user_message: string
  ai_response: string
  model_used: string | null
  created_at: string
  updated_at: string
}

export function useAIConversationsQuery(mediaFileId: string) {
  return useQuery({
    queryKey: aiConversationKeys.list(mediaFileId),
    queryFn: async () => {
      const result = await getVideoAIConversations(mediaFileId)
      return result
    },
    enabled: !!mediaFileId,
    // PERFORMANCE P1: Stale-While-Revalidate pattern
    staleTime: 2 * 60 * 1000, // 2 minutes - data is considered fresh
    cacheTime: 30 * 60 * 1000, // 30 minutes - keep in cache
    refetchOnMount: 'always', // Always fetch on mount, but serve stale data first
    refetchOnWindowFocus: false, // Don't refetch on tab switch (reduce API calls)
    refetchOnReconnect: true, // Refetch on reconnect
  })
}

// PERFORMANCE P0: Infinite query for message pagination
export function useInfiniteAIConversations(mediaFileId: string, pageSize: number = 20) {
  return useInfiniteQuery({
    queryKey: [...aiConversationKeys.list(mediaFileId), 'infinite'],
    queryFn: async ({ pageParam = 0 }) => {
      // TODO: Update getVideoAIConversations to accept limit/offset
      // For now, we'll fetch all and slice client-side
      const result = await getVideoAIConversations(mediaFileId)

      if (!result.success || !result.conversations) {
        return { conversations: [], hasMore: false }
      }

      const allConversations = result.conversations
      const start = pageParam
      const end = start + pageSize
      const conversations = allConversations.slice(start, end)
      const hasMore = end < allConversations.length

      return { conversations, hasMore, total: allConversations.length }
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined
      return allPages.reduce((acc, page) => acc + page.conversations.length, 0)
    },
    enabled: !!mediaFileId,
    // PERFORMANCE P1: Same caching strategy
    staleTime: 2 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    initialPageParam: 0,
  })
}

// Query key factory for consistency
export const aiConversationKeys = {
  all: ['ai-conversations'] as const,
  lists: () => [...aiConversationKeys.all, 'list'] as const,
  list: (mediaFileId: string) => [...aiConversationKeys.lists(), mediaFileId] as const,
  details: () => [...aiConversationKeys.all, 'detail'] as const,
  detail: (id: string) => [...aiConversationKeys.details(), id] as const,
}
