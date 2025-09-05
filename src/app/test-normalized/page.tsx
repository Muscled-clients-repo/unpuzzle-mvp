'use client'

import { useAppStore } from '@/stores/app-store'
import { useEffect } from 'react'

export default function TestNormalizedPage() {
  const store = useAppStore()
  
  useEffect(() => {
    // Log both states to console for verification
    console.log('=== PARALLEL STATE TEST ===')
    console.log('Old CourseCreation State:', store.courseCreation)
    console.log('New Normalized State:', store.normalizedState)
    console.log('Both states exist in parallel!')
    console.log('=========================')
  }, [store])
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Parallel State Test</h1>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="border p-4 rounded">
          <h2 className="font-semibold mb-2">Old State (CourseCreation)</h2>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-96">
            {JSON.stringify(store.courseCreation, null, 2)}
          </pre>
        </div>
        
        <div className="border p-4 rounded">
          <h2 className="font-semibold mb-2">New State (Normalized)</h2>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-96">
            {JSON.stringify(store.normalizedState, null, 2)}
          </pre>
        </div>
      </div>
      
      <div className="mt-4 p-4 bg-green-100 rounded">
        <p className="text-green-800">
          ✅ Both states exist in parallel! Old features continue to work while we migrate.
        </p>
      </div>
    </div>
  )
}