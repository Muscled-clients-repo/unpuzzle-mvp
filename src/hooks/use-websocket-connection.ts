import { useEffect, useRef, useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { courseEventObserver, COURSE_EVENTS } from '@/lib/course-event-observer'

interface WebSocketMessage {
  type: string
  data: any
  timestamp: number
}

interface WebSocketConnectionState {
  isConnected: boolean
  isReconnecting: boolean
  error: string | null
  lastReconnectAttempt: number | null
}

export function useWebSocketConnection(userId: string) {
  const [connectionState, setConnectionState] = useState<WebSocketConnectionState>({
    isConnected: false,
    isReconnecting: false,
    error: null,
    lastReconnectAttempt: null
  })
  
  const ws = useRef<WebSocket | null>(null)
  const messageListeners = useRef<Map<string, Set<(data: any) => void>>>(new Map())
  const queryClient = useQueryClient()
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (ws.current) {
        ws.current.close(1000, 'Component unmounting')
      }
    }
  }, [])

  // Simple connection effect - no circular dependencies
  useEffect(() => {
    if (!userId) return
    
    // Only connect if not already connected or connecting
    if (connectionState.isConnected || connectionState.isReconnecting || ws.current) return
    
    // Skip WebSocket connection if no server URL configured
    if (!process.env.NEXT_PUBLIC_WEBSOCKET_URL) {
      console.log('⚠️ WebSocket URL not configured, skipping connection')
      setConnectionState(prev => ({ 
        ...prev, 
        error: 'WebSocket server not configured',
        isReconnecting: false 
      }))
      return
    }
    
    console.log('🔄 Connecting to WebSocket...')
    setConnectionState(prev => ({ ...prev, isReconnecting: true, error: null }))
    
    try {
      const wsConnection = new WebSocket(`${process.env.NEXT_PUBLIC_WEBSOCKET_URL}?userId=${userId}`)
      ws.current = wsConnection
      
      wsConnection.onopen = () => {
        console.log('🔗 WebSocket connected successfully')
        setConnectionState({
          isConnected: true,
          isReconnecting: false,
          error: null,
          lastReconnectAttempt: null
        })
      }
      
      wsConnection.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          console.log('📨 [WEBSOCKET] Message received:', message.type, message)
          
          // Map WebSocket message types to Observer events
          const eventTypeMapping: Record<string, string> = {
            'upload-progress': COURSE_EVENTS.UPLOAD_PROGRESS,
            'upload-complete': COURSE_EVENTS.UPLOAD_COMPLETE,
            'video-update-complete': COURSE_EVENTS.VIDEO_UPDATE_COMPLETE,
            'chapter-update-complete': COURSE_EVENTS.CHAPTER_UPDATE_COMPLETE
          }
          
          const observerEventType = eventTypeMapping[message.type]
          if (observerEventType && message.data?.courseId) {
            console.log(`📨 [WEBSOCKET] Emitting to Observer: ${observerEventType}`, message.data)
            courseEventObserver.emit(
              observerEventType,
              message.data.courseId,
              message.data,
              message.data.operationId
            )
          } else {
            console.log(`📨 [WEBSOCKET] Message not mapped to Observer:`, { 
              messageType: message.type, 
              hasMapping: !!eventTypeMapping[message.type],
              hasCourseId: !!message.data?.courseId
            })
          }
          
          // Keep existing listener system for backward compatibility during migration
          const listeners = messageListeners.current.get(message.type)
          if (listeners) {
            listeners.forEach(callback => callback(message.data))
          }
          
        } catch (error) {
          console.error('❌ Failed to parse WebSocket message:', error)
        }
      }
      
      wsConnection.onerror = (error) => {
        console.warn('⚠️ WebSocket connection failed (server may not be running):', error)
        setConnectionState(prev => ({ 
          ...prev, 
          error: 'WebSocket server unavailable',
          isReconnecting: false 
        }))
      }
      
      wsConnection.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason)
        ws.current = null
        setConnectionState(prev => ({ 
          ...prev, 
          isConnected: false,
          isReconnecting: false 
        }))
      }
      
    } catch (error) {
      console.error('❌ Failed to connect to WebSocket:', error)
      setConnectionState(prev => ({ 
        ...prev, 
        error: 'Failed to connect to WebSocket',
        isReconnecting: false 
      }))
    }
  }, [userId]) // Only depend on userId - simple and stable

  // Subscribe to message types
  const subscribe = useCallback((messageType: string, callback: (data: any) => void) => {
    if (!messageListeners.current.has(messageType)) {
      messageListeners.current.set(messageType, new Set())
    }
    messageListeners.current.get(messageType)!.add(callback)
    
    // Return unsubscribe function
    return () => {
      const listeners = messageListeners.current.get(messageType)
      if (listeners) {
        listeners.delete(callback)
        if (listeners.size === 0) {
          messageListeners.current.delete(messageType)
        }
      }
    }
  }, [])

  // Send message through WebSocket
  const sendMessage = useCallback((type: string, data: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type,
        data,
        timestamp: Date.now()
      }
      ws.current.send(JSON.stringify(message))
    } else {
      console.warn('⚠️ WebSocket not connected, cannot send message:', type, data)
    }
  }, [])

  // Manual reconnect function
  const reconnect = useCallback(() => {
    if (ws.current) {
      ws.current.close()
    }
    // The useEffect will handle reconnection when the connection state updates
    setConnectionState({
      isConnected: false,
      isReconnecting: false,
      error: null,
      lastReconnectAttempt: null
    })
  }, [])

  return {
    isConnected: connectionState.isConnected,
    isReconnecting: connectionState.isReconnecting,
    error: connectionState.error,
    subscribe,
    sendMessage,
    reconnect
  }
}