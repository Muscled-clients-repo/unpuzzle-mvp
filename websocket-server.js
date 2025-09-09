/**
 * Standalone WebSocket Server Runner
 * 
 * Run this separately from Next.js: node websocket-server.js
 */

const WebSocket = require('ws')
const http = require('http')

console.log('🚀 Starting Unpuzzle WebSocket Server...')

// Create HTTP server for both WebSocket and REST endpoints
const server = http.createServer((req, res) => {
  console.log(`🌐 HTTP ${req.method} ${req.url} from ${req.headers.origin || 'unknown'}`)
  
  // CORS headers for Next.js and Server Actions
  res.setHeader('Access-Control-Allow-Origin', '*') // Allow server-side requests
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }
  
  if (req.method === 'POST' && req.url === '/broadcast') {
    let body = ''
    req.on('data', chunk => {
      body += chunk.toString()
    })
    req.on('end', () => {
      try {
        const message = JSON.parse(body)
        console.log('📤 HTTP broadcast request:', message.type)
        broadcast(message)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true }))
      } catch (error) {
        console.error('❌ HTTP broadcast error:', error)
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON' }))
      }
    })
    return
  }
  
  res.writeHead(404)
  res.end('Not found')
})

const wss = new WebSocket.Server({ server })

// Store connected clients
const clients = new Map()

wss.on('connection', (ws, request) => {
  const url = new URL(request.url || '', 'http://localhost:8080')
  const userId = url.searchParams.get('userId') || 'anonymous'
  
  console.log(`🔗 WebSocket client connected: ${userId}`)
  clients.set(userId, ws)

  ws.on('message', (message) => {
    try {
      const parsedMessage = JSON.parse(message.toString())
      console.log(`📨 WebSocket message from ${userId}:`, parsedMessage.type)
    } catch (error) {
      console.error('❌ WebSocket message parse error:', error)
    }
  })

  ws.on('close', () => {
    console.log(`🔌 WebSocket client disconnected: ${userId}`)
    clients.delete(userId)
  })

  ws.on('error', (error) => {
    console.error(`❌ WebSocket client error for ${userId}:`, error)
    clients.delete(userId)
  })
})

// Broadcast function for server actions to use
function broadcast(message) {
  const messageString = JSON.stringify(message)
  let sentCount = 0

  console.log(`🔍 DEBUG: Broadcasting to ${clients.size} registered clients`)
  clients.forEach((client, userId) => {
    console.log(`🔍 DEBUG: Client ${userId} state: ${client.readyState} (OPEN=${WebSocket.OPEN})`)
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageString)
      sentCount++
      console.log(`✅ Sent to client ${userId}`)
    } else {
      console.log(`❌ Removing stale client ${userId}`)
      clients.delete(userId)
    }
  })

  if (sentCount > 0) {
    console.log(`📡 Broadcast sent to ${sentCount} clients:`, message.type)
  } else {
    console.log(`⚠️ No clients available for broadcast:`, message.type)
  }
}

// Export for server actions to use
global.broadcastWebSocket = broadcast

// Start server
server.listen(8080, () => {
  console.log('✅ WebSocket server running on ws://localhost:8080')
  console.log('✅ HTTP broadcast endpoint: http://localhost:8080/broadcast')
  console.log('👀 Waiting for client connections...')
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔌 Shutting down WebSocket server...')
  wss.close()
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('🔌 Shutting down WebSocket server...')
  wss.close()
  process.exit(0)
})