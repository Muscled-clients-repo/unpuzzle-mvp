/**
 * Track Request WebSocket Hook
 *
 * Architecture Compliance:
 * - WebSocket → Observer → TanStack pattern
 * - Real-time track request updates without polling
 * - Follows established conversation WebSocket pattern
 */

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useWebSocketConnection } from './use-websocket-connection'
import {
  courseEventObserver,
  TRACK_REQUEST_EVENTS,
  TrackRequestSubmittedEvent,
  TrackRequestApprovedEvent
} from '@/lib/course-event-observer'
import { toast } from 'sonner'

export function useTrackRequestWebSocket(userId: string, userRole?: 'student' | 'instructor') {
  const queryClient = useQueryClient()

  // Only connect if userId exists
  const shouldConnect = Boolean(userId)
  const { isConnected } = useWebSocketConnection(shouldConnect ? userId : '')

  useEffect(() => {
    if (!shouldConnect || !isConnected || !userId) return

    console.log(`🔗 [TRACK-REQUEST-WS] Setting up listeners for user: ${userId}, role: ${userRole}`)

    // Subscribe to track request submission events (for instructors)
    const unsubscribeRequestSubmitted = courseEventObserver.subscribe(
      TRACK_REQUEST_EVENTS.REQUEST_SUBMITTED,
      (event) => {
        const data = event.data as TrackRequestSubmittedEvent

        console.log(`🔄 [TRACK-REQUEST-WS] Request submitted:`, data.requestId)

        // Instructors see toast notification for new requests
        if (userRole === 'instructor') {
          toast.info('New track change request submitted', {
            description: `Student requested ${data.trackName}`,
          })

          // Invalidate instructor request queries
          queryClient.invalidateQueries({
            queryKey: ['instructor-requests']
          })
          queryClient.invalidateQueries({
            queryKey: ['new-signup-requests']
          })
          queryClient.invalidateQueries({
            queryKey: ['track-change-requests']
          })
        }
      }
    )

    // Subscribe to track request approval events (for students)
    const unsubscribeRequestApproved = courseEventObserver.subscribe(
      TRACK_REQUEST_EVENTS.REQUEST_APPROVED,
      (event) => {
        const data = event.data as TrackRequestApprovedEvent

        // Only update for this specific user
        if (data.userId === userId) {
          console.log(`🔄 [TRACK-REQUEST-WS] Request approved for user ${userId}:`, data.requestId)

          // Students see success toast
          if (userRole === 'student') {
            toast.success('Track & Goal Assigned!', {
              description: `You've been assigned to ${data.trackName}`,
            })

            // Invalidate student track queries
            queryClient.invalidateQueries({
              queryKey: ['user-current-track']
            })
            queryClient.invalidateQueries({
              queryKey: ['student-track-change-status']
            })
            queryClient.invalidateQueries({
              queryKey: ['student-courses']
            })
          }

          // Instructors see confirmation
          if (userRole === 'instructor') {
            // Invalidate instructor request queries
            queryClient.invalidateQueries({
              queryKey: ['instructor-requests']
            })
            queryClient.invalidateQueries({
              queryKey: ['new-signup-requests']
            })
            queryClient.invalidateQueries({
              queryKey: ['track-change-requests']
            })
          }
        }
      }
    )

    // Cleanup subscriptions
    return () => {
      console.log(`🔌 [TRACK-REQUEST-WS] Cleaning up listeners for user: ${userId}`)
      unsubscribeRequestSubmitted()
      unsubscribeRequestApproved()
    }
  }, [shouldConnect, isConnected, userId, userRole, queryClient])

  return {
    isConnected
  }
}
