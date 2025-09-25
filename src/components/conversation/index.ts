// Active conversation system components
export { ConversationIntegrationV2 } from './ConversationIntegrationV2'
export { DailyGoalTrackerV2 } from './DailyGoalTrackerV2'
export { InlineMessageComposer } from './InlineMessageComposer'

// Re-export types for convenience
export type {
  Conversation,
  ConversationMessage,
  ConversationAttachment,
  ConversationData,
  CreateMessageRequest,
  MessageFormData
} from '@/lib/types/conversation-types'