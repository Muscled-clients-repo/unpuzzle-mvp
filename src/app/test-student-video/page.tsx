"use client"

import { useState } from "react"
import { StudentVideoPlayer } from "@/components/video/student/StudentVideoPlayer"
import { useAppStore } from "@/stores/app-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function TestStudentVideoPage() {
  const [testVideoId] = useState('video-1')
  
  // Monitor the new student video store state
  const {
    currentVideo,
    selectedSegment,
    reflections,
    inPoint,
    outPoint,
  } = useAppStore()
  
  // Monitor old video store state for comparison
  const {
    currentTime,
    isPlaying,
    duration,
  } = useAppStore()
  
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Test Migrated StudentVideoPlayer</h1>
      
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Video Player */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Student Video Player (Migrated)
                <Badge variant="outline">Phase 5b</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StudentVideoPlayer
                videoUrl="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
                title="Test Video - React Hooks Deep Dive"
                videoId={testVideoId}
                onTimeUpdate={(time) => console.log('Time update:', time)}
                onPause={(time) => console.log('Paused at:', time)}
                onPlay={() => console.log('Playing')}
                onEnded={() => console.log('Ended')}
              />
            </CardContent>
          </Card>
        </div>
        
        {/* New Store State */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              New Student Video Store
              <Badge variant="secondary">NEW</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <strong>Current Video:</strong> {currentVideo ? currentVideo.title : 'None'}
            </div>
            <div className="text-sm">
              <strong>Selected Segment:</strong> {
                selectedSegment 
                  ? `${selectedSegment.inPoint}s - ${selectedSegment.outPoint}s`
                  : 'None'
              }
            </div>
            <div className="text-sm">
              <strong>In/Out Points:</strong> {
                inPoint !== null && outPoint !== null
                  ? `${inPoint}s - ${outPoint}s`
                  : 'Not set'
              }
            </div>
            <div className="text-sm">
              <strong>Reflections:</strong> {reflections.length} stored
            </div>
            {reflections.length > 0 && (
              <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                Latest: {reflections[reflections.length - 1]?.content}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Old Store State (for comparison) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Old Video Store (Generic)
              <Badge variant="outline">OLD</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <strong>Current Time:</strong> {currentTime.toFixed(1)}s
            </div>
            <div className="text-sm">
              <strong>Duration:</strong> {duration.toFixed(1)}s
            </div>
            <div className="text-sm">
              <strong>Is Playing:</strong> {isPlaying ? 'Yes' : 'No'}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Test Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Play the video and verify time updates work</li>
              <li>Press 'I' to set in-point, 'O' to set out-point</li>
              <li>Check that segment selection appears in "New Store State"</li>
              <li>Use video controls to set in/out points via buttons</li>
              <li>Use "Send to Chat" to create transcript reference</li>
              <li>Check browser console for any errors</li>
              <li>Verify Redux DevTools shows clean state updates</li>
            </ol>
            
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Success Criteria:</strong> Video plays normally, segment selection works, 
                new store state updates properly, no console errors.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-6 flex gap-4">
        <Button asChild>
          <a href="/test-stores">Back to Store Tests</a>
        </Button>
        <Button asChild variant="outline">
          <a href="/student/course/course-1/video/1">Test Real Route</a>
        </Button>
        <Button asChild variant="outline">
          <a href="/instructor">Back to Dashboard</a>
        </Button>
      </div>
    </div>
  )
}