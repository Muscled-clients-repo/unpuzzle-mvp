// src/components/examples/service-usage-example.tsx
"use client"

import { useEffect, useState } from 'react'
import { studentVideoService } from '@/services/student-video-service'
import { StudentVideoData } from '@/types/domain'

export function ServiceUsageExample({ videoId }: { videoId: string }) {
  const [videoData, setVideoData] = useState<StudentVideoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadVideo() {
      setLoading(true)
      setError(null)
      
      const result = await studentVideoService.getVideoWithStudentData(videoId)
      
      if (result.error) {
        setError(result.error)
      } else if (result.data) {
        setVideoData(result.data)
      }
      
      setLoading(false)
    }

    loadVideo()
  }, [videoId])

  const handleSubmitReflection = async () => {
    if (!videoData) return

    const result = await studentVideoService.saveReflection({
      videoId: videoData.id,
      content: 'This is a test reflection',
      timestamp: 120,
      timeInSeconds: 120,
      type: 'text'
    })

    if (result.data) {
      console.log('Reflection saved:', result.data)
      // Update local state or refetch
    }
  }

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  if (!videoData) return <div>No video data</div>

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">{videoData.title}</h2>
      <p className="mb-2">{videoData.description}</p>
      
      {videoData.progress && (
        <div className="mb-4">
          <p>Progress: {videoData.progress.percentComplete}%</p>
          <p>Watched: {videoData.progress.watchedSeconds}s of {videoData.progress.totalSeconds}s</p>
        </div>
      )}

      <button 
        onClick={handleSubmitReflection}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Add Test Reflection
      </button>

      {videoData.reflections && videoData.reflections.length > 0 && (
        <div className="mt-4">
          <h3 className="font-semibold mb-2">Reflections:</h3>
          {videoData.reflections.map(reflection => (
            <div key={reflection.id} className="p-2 border rounded mb-2">
              <p>{reflection.content}</p>
              <p className="text-sm text-gray-500">
                At {reflection.timestamp}s - Status: {reflection.status}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}