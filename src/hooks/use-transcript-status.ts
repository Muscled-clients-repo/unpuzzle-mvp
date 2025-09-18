import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'

interface TranscriptStatus {
  hasTranscript: boolean
  isUploading: boolean
  transcriptCreatedAt?: string
  confidenceScore?: number
  wordCount?: number
}

export function useTranscriptStatus(courseId: string) {
  const [uploadingVideos, setUploadingVideos] = useState<Set<string>>(new Set())

  const {
    data: statusData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['transcript-status', courseId],
    queryFn: async () => {
      const response = await fetch(`/api/transcription/status?courseId=${courseId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch transcript status')
      }
      return response.json()
    },
    enabled: !!courseId,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false
  })

  // Create status map for easy lookup
  const transcriptStatuses = new Map<string, TranscriptStatus>()

  if (statusData?.statuses) {
    statusData.statuses.forEach((status: any) => {
      transcriptStatuses.set(status.videoId, {
        hasTranscript: status.hasTranscript,
        isUploading: uploadingVideos.has(status.videoId),
        transcriptCreatedAt: status.transcriptCreatedAt,
        confidenceScore: status.confidenceScore,
        wordCount: status.wordCount
      })
    })
  }

  // Add uploading status for videos not in the response
  uploadingVideos.forEach(videoId => {
    if (!transcriptStatuses.has(videoId)) {
      transcriptStatuses.set(videoId, {
        hasTranscript: false,
        isUploading: true
      })
    }
  })

  const setVideoUploading = (videoId: string, isUploading: boolean) => {
    setUploadingVideos(prev => {
      const newSet = new Set(prev)
      if (isUploading) {
        newSet.add(videoId)
      } else {
        newSet.delete(videoId)
      }
      return newSet
    })
  }

  const refreshStatus = () => {
    refetch()
  }

  return {
    transcriptStatuses,
    isLoading,
    error,
    setVideoUploading,
    refreshStatus
  }
}