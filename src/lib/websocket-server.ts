/**
 * WebSocket Server for Real-Time Upload Progress
 * 
 * Handles real-time communication between server actions and client components
 * for upload progress, course updates, and other real-time features.
 */

import WebSocket from 'ws'

// Types for WebSocket messages
export interface WebSocketMessage {
  type: string
  data: any
  courseId?: string
  operationId?: string
  timestamp: number
}

class UnpuzzleWebSocketServer {
  private wss: WebSocket.Server | null = null
  private clients = new Map<string, WebSocket>()

  initialize(port = 8080) {
    if (this.wss) return // Already initialized

    console.log(`🔗 Starting WebSocket server on port ${port}`)
    
    this.wss = new WebSocket.Server({ port })

    this.wss.on('connection', (ws, request) => {
      const url = new URL(request.url || '', `http://localhost:${port}`)
      const userId = url.searchParams.get('userId') || 'anonymous'
      
      console.log(`🔗 WebSocket client connected: ${userId}`)
      this.clients.set(userId, ws)

      ws.on('message', (message) => {
        try {
          const parsedMessage: WebSocketMessage = JSON.parse(message.toString())
          console.log(`📨 WebSocket message from ${userId}:`, parsedMessage.type)
          
          // Handle client messages if needed
          this.handleClientMessage(userId, parsedMessage)
        } catch (error) {
          console.error('❌ WebSocket message parse error:', error)
        }
      })

      ws.on('close', () => {
        console.log(`🔌 WebSocket client disconnected: ${userId}`)
        this.clients.delete(userId)
      })

      ws.on('error', (error) => {
        console.error(`❌ WebSocket client error for ${userId}:`, error)
        this.clients.delete(userId)
      })
    })

    this.wss.on('error', (error) => {
      console.error('❌ WebSocket server error:', error)
    })

    console.log(`✅ WebSocket server started on ws://localhost:${port}`)
  }

  /**
   * Broadcast upload progress to all connected clients
   */
  broadcastUploadProgress(operationId: string, courseId: string, progress: {
    progress: number
    loaded: number
    total: number
  }) {
    const message: WebSocketMessage = {
      type: 'upload-progress',
      courseId,
      operationId,
      data: {
        operationId,
        courseId,
        progress: progress.progress,
        loaded: progress.loaded,
        total: progress.total
      },
      timestamp: Date.now()
    }

    this.broadcast(message)
    console.log(`📈 WebSocket broadcast: upload progress ${progress.progress}% for ${operationId}`)
  }

  /**
   * Broadcast upload completion to all connected clients
   */
  broadcastUploadComplete(operationId: string, courseId: string, videoId: string) {
    const message: WebSocketMessage = {
      type: 'upload-complete',
      courseId,
      operationId,
      data: {
        operationId,
        courseId,
        videoId
      },
      timestamp: Date.now()
    }

    this.broadcast(message)
    console.log(`✅ WebSocket broadcast: upload complete for ${operationId}`)
  }

  /**
   * Broadcast video update completion
   */
  broadcastVideoUpdateComplete(operationId: string, courseId: string, data?: any) {
    const message: WebSocketMessage = {
      type: 'video-update-complete',
      courseId,
      operationId,
      data: {
        operationId,
        courseId,
        ...data
      },
      timestamp: Date.now()
    }

    this.broadcast(message)
    console.log(`🎬 WebSocket broadcast: video update complete for ${operationId}`)
  }

  /**
   * Broadcast chapter update completion
   */
  broadcastChapterUpdateComplete(operationId: string, courseId: string, data?: any) {
    const message: WebSocketMessage = {
      type: 'chapter-update-complete',
      courseId,
      operationId,
      data: {
        operationId,
        courseId,
        ...data
      },
      timestamp: Date.now()
    }

    this.broadcast(message)
    console.log(`📚 WebSocket broadcast: chapter update complete for ${operationId}`)
  }

  /**
   * Broadcast message to all connected clients
   */
  private broadcast(message: WebSocketMessage) {
    if (!this.wss) return

    const messageString = JSON.stringify(message)
    let sentCount = 0

    this.clients.forEach((client, userId) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageString)
        sentCount++
      } else {
        // Clean up disconnected clients
        this.clients.delete(userId)
      }
    })

    if (sentCount === 0) {
      console.log('📡 No WebSocket clients connected to receive broadcast')
    }
  }

  /**
   * Handle messages from clients
   */
  private handleClientMessage(userId: string, message: WebSocketMessage) {
    // Add client message handling logic here if needed
    console.log(`📨 Received from ${userId}:`, message.type)
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isRunning: !!this.wss,
      clientCount: this.clients.size,
      port: this.wss ? 8080 : null
    }
  }

  /**
   * Shutdown the WebSocket server
   */
  shutdown() {
    if (this.wss) {
      console.log('🔌 Shutting down WebSocket server...')
      this.wss.close()
      this.clients.clear()
      this.wss = null
    }
  }
}

// Export singleton instance
export const webSocketServer = new UnpuzzleWebSocketServer()

// Auto-initialize in development
if (process.env.NODE_ENV === 'development') {
  webSocketServer.initialize()
}