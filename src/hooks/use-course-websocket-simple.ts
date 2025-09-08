import { useWebSocketConnection } from './use-websocket-connection'
import { useAppStore } from '@/stores/app-store'
import { generateOperationId } from '@/lib/websocket-operations'

/**
 * Simplified Course WebSocket Hook
 * 
 * This replaces the complex useCourseWebSocket hook that caused infinite loops.
 * It only provides:
 * 1. Connection status
 * 2. Operation ID generation utility
 * 
 * NO direct cache invalidation - that's handled by the Observer pattern.
 */
export function useCourseWebSocketSimple(courseId: string) {
  // Use stable user ID selector to prevent infinite re-renders  
  const userId = useAppStore((state) => state.user?.id)
  const websocket = useWebSocketConnection(userId || '')

  // WebSocket connection already emits to Observer via use-websocket-connection.ts
  // No event handlers needed here - Observer pattern handles everything

  return {
    // Connection state only
    isConnected: websocket.isConnected,
    isReconnecting: websocket.isReconnecting,
    error: websocket.error,
    
    // Manual reconnect
    reconnect: websocket.reconnect,
    
    // Utility for generating operation IDs
    generateOperationId: () => `${courseId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}