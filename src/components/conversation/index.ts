// Unified conversation system components
export { UnifiedConversationContainer } from './UnifiedConversationContainer'
export { ConversationIntegration } from './ConversationIntegration'
export { ConversationIntegrationV2 } from './ConversationIntegrationV2'
export { DailyGoalTrackerV2 } from './DailyGoalTrackerV2'
export { MessageList } from './MessageList'
export { MessageCard } from './MessageCard'
export { MessageComposer } from './MessageComposer'
export { ConversationHeader } from './ConversationHeader'
export { ImageViewerModal } from './ImageViewerModal'
export { MessageAttachments } from './MessageAttachments'

// Re-export types for convenience
export type {
  Conversation,
  ConversationMessage,
  MessageAttachment,
  ConversationData,
  CreateMessageRequest,
  MessageFormData
} from '@/lib/types/conversation-types'