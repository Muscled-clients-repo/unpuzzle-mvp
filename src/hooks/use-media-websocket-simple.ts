import { useWebSocketConnection } from './use-websocket-connection'
import { useAppStore } from '@/stores/app-store'

/**
 * Simplified Media WebSocket Hook
 * 
 * Matches the pattern of useCourseWebSocketSimple to ensure consistency.
 * It only provides:
 * 1. Connection status
 * 2. Operation ID generation utility
 * 
 * NO direct cache invalidation - that's handled by the Observer pattern.
 */
export function useMediaWebSocketSimple() {
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
    generateOperationId: () => `media_upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}