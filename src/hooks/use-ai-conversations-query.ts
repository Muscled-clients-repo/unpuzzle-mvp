import { useQuery } from '@tanstack/react-query'
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
      console.log('[useAIConversationsQuery] Loaded conversations:', result.success ? `${result.conversations?.length || 0} conversations` : 'Failed')
      return result
    },
    enabled: !!mediaFileId,
    staleTime: 30 * 1000, // 30 seconds - conversations don't change often
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
