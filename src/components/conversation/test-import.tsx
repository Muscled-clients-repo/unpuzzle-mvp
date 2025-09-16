'use client'

import React from 'react'
import { useAppStore } from '@/stores/app-store'

// Test if the conversation imports work
export function ConversationImportTest() {
  const { user } = useAppStore()

  try {
    // Test importing the actual ConversationIntegration
    const { ConversationIntegration } = require('@/components/conversation')

    console.log('ConversationIntegration component loaded successfully')
    console.log('Current user:', user)

    if (!user?.id) {
      return (
        <div className="p-4 border border-yellow-500 bg-yellow-50">
          <h3 className="text-lg font-semibold mb-2">⚠️ No User Logged In</h3>
          <p className="text-sm text-gray-600">
            Need to be logged in to test the conversation system.
          </p>
          <div className="text-xs text-gray-500 mt-2">
            User object: {JSON.stringify(user, null, 2)}
          </div>
        </div>
      )
    }

    return (
      <div className="p-4 border border-blue-500 bg-blue-50">
        <h3 className="text-lg font-semibold mb-2">🧪 Testing Full Unified System</h3>
        <div className="text-sm text-gray-600 mb-4">
          Testing with logged-in user: {user.email || user.id}
        </div>

        <div className="border border-gray-300 rounded p-2">
          <ConversationIntegration
            studentId={user.id}
            isInstructorView={false}
            enableUnifiedSystem={true}
            showMigrationPrompt={false}
          />
        </div>
      </div>
    )
  } catch (error) {
    console.error('Conversation import error:', error)
    return (
      <div className="p-4 border border-red-500 bg-red-50">
        <h3 className="text-lg font-semibold mb-2">❌ Import Error</h3>
        <p className="text-sm text-gray-600">
          Error: {error instanceof Error ? error.message : String(error)}
        </p>
        <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
          {error instanceof Error ? error.stack : 'No stack trace available'}
        </pre>
      </div>
    )
  }
}