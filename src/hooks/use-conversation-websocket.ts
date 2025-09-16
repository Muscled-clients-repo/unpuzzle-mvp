/**
 * Conversation WebSocket Hook
 *
 * Architecture Compliance:
 * - WebSocket → Observer → TanStack pattern
 * - Real-time conversation updates without polling
 * - Follows established upload progress WebSocket pattern
 */

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useWebSocketConnection } from './use-websocket-connection'
import {
  courseEventObserver,
  CONVERSATION_EVENTS,
  ConversationMessageCreatedEvent,
  ConversationMessageUpdatedEvent,
  ConversationMessageDeletedEvent
} from '@/lib/course-event-observer'

interface ConversationWebSocketMessage {
  type: string
  data: any
  timestamp: number
}

export function useConversationWebSocket(studentId: string, userId?: string) {
  const queryClient = useQueryClient()
  const { isConnected } = useWebSocketConnection(userId || studentId)

  useEffect(() => {
    if (!isConnected || !studentId) return

    console.log(`🔗 [CONVERSATION-WS] Setting up listeners for student: ${studentId}`)

    // Subscribe to conversation events via Observer
    const unsubscribeMessageCreated = courseEventObserver.subscribe(
      CONVERSATION_EVENTS.MESSAGE_CREATED,
      (event) => {
        const data = event.data as ConversationMessageCreatedEvent

        // Only update cache for conversations involving this student
        if (data.studentId === studentId) {
          console.log(`🔄 [CONVERSATION-WS] Message created for student ${studentId}:`, data.messageId)

          // Invalidate conversation queries for immediate updates
          queryClient.invalidateQueries({
            predicate: (query) => {
              return query.queryKey[0] === 'conversation' && query.queryKey[1] === studentId
            }
          })
        }
      }
    )

    const unsubscribeMessageUpdated = courseEventObserver.subscribe(
      CONVERSATION_EVENTS.MESSAGE_UPDATED,
      (event) => {
        const data = event.data as ConversationMessageUpdatedEvent

        if (data.studentId === studentId) {
          console.log(`🔄 [CONVERSATION-WS] Message updated for student ${studentId}:`, data.messageId)

          // Invalidate conversation queries
          queryClient.invalidateQueries({
            predicate: (query) => {
              return query.queryKey[0] === 'conversation' && query.queryKey[1] === studentId
            }
          })
        }
      }
    )

    const unsubscribeMessageDeleted = courseEventObserver.subscribe(
      CONVERSATION_EVENTS.MESSAGE_DELETED,
      (event) => {
        const data = event.data as ConversationMessageDeletedEvent

        if (data.studentId === studentId) {
          console.log(`🔄 [CONVERSATION-WS] Message deleted for student ${studentId}:`, data.messageId)

          // Invalidate conversation queries
          queryClient.invalidateQueries({
            predicate: (query) => {
              return query.queryKey[0] === 'conversation' && query.queryKey[1] === studentId
            }
          })
        }
      }
    )

    // Cleanup subscriptions
    return () => {
      console.log(`🔌 [CONVERSATION-WS] Cleaning up listeners for student: ${studentId}`)
      unsubscribeMessageCreated()
      unsubscribeMessageUpdated()
      unsubscribeMessageDeleted()
    }
  }, [isConnected, studentId, queryClient])

  return {
    isConnected
  }
}