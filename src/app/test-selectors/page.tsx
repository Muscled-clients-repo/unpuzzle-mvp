'use client'

import { useAppStore } from '@/stores/app-store'
import { useEffect, useState } from 'react'
import {
  getAllVideosOrdered,
  getChapterWithVideos,
  getCourseWithChapters,
  hasNormalizedData,
} from '@/stores/selectors/course-selectors'

export default function TestSelectorsPage() {
  const store = useAppStore()
  const [testResults, setTestResults] = useState<any>({})
  
  useEffect(() => {
    // Test selectors with mock data
    console.log('=== TESTING SELECTORS ===')
    
    // Check if we already have test data
    const currentData = store.normalizedState
    if (currentData.videos['video-1'] && currentData.videos['video-2']) {
      // Data exists, just update results
      const results = {
        hasData: hasNormalizedData(currentData),
        allVideosOrdered: getAllVideosOrdered(currentData),
        chapterWithVideos: getChapterWithVideos(currentData, 'chapter-1'),
        courseWithChapters: getCourseWithChapters(currentData, 'course-1'),
      }
      setTestResults(results)
      return
    }
    
    // Add some test data to normalized state (only once)
    const testVideo1 = {
      id: 'video-1',
      title: 'Test Video 1',
      order: 2, // Intentionally out of sequence
      chapterId: 'chapter-1',
      courseId: 'course-1',
      status: 'ready' as const,
    }
    
    const testVideo2 = {
      id: 'video-2',
      title: 'Test Video 2',
      order: 1, // Should come first when sorted
      chapterId: 'chapter-1',
      courseId: 'course-1',
      status: 'ready' as const,
    }
    
    // Add test data
    store.addNormalizedVideo(testVideo1)
    store.addNormalizedVideo(testVideo2)
    
    store.addNormalizedChapter({
      id: 'chapter-1',
      title: 'Test Chapter',
      courseId: 'course-1',
      videoIds: ['video-1', 'video-2'],
      order: 0,
    })
    
    store.setNormalizedCourse({
      id: 'course-1',
      title: 'Test Course',
      instructorId: 'instructor-1',
      chapterIds: ['chapter-1'],
      status: 'draft',
    })
    
    // Test selectors
    const results = {
      hasData: hasNormalizedData(store.normalizedState),
      allVideosOrdered: getAllVideosOrdered(store.normalizedState),
      chapterWithVideos: getChapterWithVideos(store.normalizedState, 'chapter-1'),
      courseWithChapters: getCourseWithChapters(store.normalizedState, 'course-1'),
    }
    
    console.log('Selector Results:', results)
    setTestResults(results)
    
    // Verify ordering works
    const ordered = results.allVideosOrdered
    if (ordered.length === 2) {
      console.log('✅ Videos sorted correctly:', 
        ordered[0].title === 'Test Video 2', // Should be first (order: 1)
        ordered[1].title === 'Test Video 1'  // Should be second (order: 2)
      )
    }
    
    console.log('=========================')
  }, [store.normalizedState]) // Only re-run when normalized state changes
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Selector Test</h1>
      
      <div className="space-y-4">
        <div className="border p-4 rounded">
          <h2 className="font-semibold mb-2 text-black">Has Normalized Data?</h2>
          <p className={testResults.hasData ? 'text-green-600' : 'text-red-600'}>
            {testResults.hasData ? '✅ Yes' : '❌ No'}
          </p>
        </div>
        
        <div className="border p-4 rounded">
          <h2 className="font-semibold mb-2 text-black">All Videos Ordered (By order field)</h2>
          <div className="space-y-2">
            {testResults.allVideosOrdered?.map((video: any) => (
              <div key={video.id} className="bg-gray-100 p-2 rounded">
                <span className="font-mono text-black">{video.title}</span>
                <span className="ml-2 text-sm text-gray-600">(order: {video.order})</span>
              </div>
            ))}
          </div>
          {testResults.allVideosOrdered?.length === 2 && 
           testResults.allVideosOrdered[0].order < testResults.allVideosOrdered[1].order && (
            <p className="mt-2 text-green-600">✅ Correctly sorted by order field!</p>
          )}
        </div>
        
        <div className="border p-4 rounded">
          <h2 className="font-semibold mb-2 text-black">Chapter With Videos (Denormalized)</h2>
          <pre className="text-xs text-black bg-gray-100 p-2 rounded overflow-auto">
            {JSON.stringify(testResults.chapterWithVideos, null, 2)}
          </pre>
        </div>
        
        <div className="border p-4 rounded">
          <h2 className="font-semibold mb-2 text-black">Course With Chapters (Full Denormalized)</h2>
          <pre className="text-xs text-black bg-gray-100 p-2 rounded overflow-auto max-h-96">
            {JSON.stringify(testResults.courseWithChapters, null, 2)}
          </pre>
        </div>
      </div>
      
      <div className="mt-4 p-4 bg-green-100 rounded">
        <p className="text-green-800">
          ✅ Selectors transform normalized state into UI-friendly shapes!
        </p>
        <p className="text-green-800 mt-1">
          ✅ Videos are sorted by the order field (single source of truth)
        </p>
      </div>
    </div>
  )
}