"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  Play,
  Clock
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useWebSocketConnection } from "@/hooks/use-websocket-connection"
import type { Video } from "@/types/course"

interface VideoTranscriptionManagerProps {
  videos: Video[]
  courseId: string
  userId: string
  className?: string
}

interface TranscriptionStatus {
  hasTranscript: boolean
  isProcessing: boolean
  progress: number
  error?: string
}

interface JobProgress {
  jobId: string
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'
  progress: number
  videoCount: number
  error?: string
}

export function VideoTranscriptionManager({
  videos,
  courseId,
  userId,
  className
}: VideoTranscriptionManagerProps) {
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set())
  const [transcriptionStatuses, setTranscriptionStatuses] = useState<Map<string, TranscriptionStatus>>(new Map())
  const [currentJob, setCurrentJob] = useState<JobProgress | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  // WebSocket connection for real-time updates
  const {
    isConnected,
    sendMessage,
    lastMessage,
    connectionStatus
  } = useWebSocketConnection(userId)

  // Handle WebSocket messages
  useEffect(() => {
    if (!lastMessage) return

    const message = lastMessage

    switch (message.type) {
      case 'JOB_CREATED':
        setCurrentJob({
          jobId: message.jobId,
          status: 'queued',
          progress: 0,
          videoCount: message.videoCount
        })
        setIsGenerating(true)
        break

      case 'JOB_PROGRESS':
        if (currentJob?.jobId === message.jobId) {
          setCurrentJob(prev => prev ? {
            ...prev,
            status: message.status,
            progress: message.progress,
            error: message.error
          } : null)
        }
        break

      case 'JOB_STATUS':
        if (message.status === 'completed') {
          setIsGenerating(false)
          setSelectedVideos(new Set())
          // Refresh transcription statuses
          fetchTranscriptionStatuses()
        } else if (message.status === 'failed') {
          setIsGenerating(false)
          setCurrentJob(prev => prev ? {
            ...prev,
            error: message.error
          } : null)
        }
        break
    }
  }, [lastMessage, currentJob])

  // Fetch current transcription statuses
  const fetchTranscriptionStatuses = async () => {
    try {
      const response = await fetch(`/api/transcription/status?courseId=${courseId}`)
      const data = await response.json()

      const statusMap = new Map<string, TranscriptionStatus>()
      videos.forEach(video => {
        const status = data.statuses?.find((s: any) => s.videoId === video.id)
        statusMap.set(video.id, {
          hasTranscript: status?.hasTranscript || false,
          isProcessing: status?.isProcessing || false,
          progress: status?.progress || 0,
          error: status?.error
        })
      })

      setTranscriptionStatuses(statusMap)
    } catch (error) {
      console.error('Failed to fetch transcription statuses:', error)
    }
  }

  // Load statuses on mount
  useEffect(() => {
    fetchTranscriptionStatuses()
  }, [courseId, videos])

  const handleVideoSelect = (videoId: string, checked: boolean) => {
    const newSelected = new Set(selectedVideos)
    if (checked) {
      newSelected.add(videoId)
    } else {
      newSelected.delete(videoId)
    }
    setSelectedVideos(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const unprocessedVideos = videos
        .filter(video => !transcriptionStatuses.get(video.id)?.hasTranscript)
        .map(video => video.id)
      setSelectedVideos(new Set(unprocessedVideos))
    } else {
      setSelectedVideos(new Set())
    }
  }

  const handleGenerateTranscripts = async () => {
    if (selectedVideos.size === 0 || !isConnected) return

    setIsGenerating(true)

    try {
      // Send transcription request via WebSocket
      sendMessage({
        type: 'TRANSCRIPTION_REQUEST',
        videoIds: Array.from(selectedVideos),
        courseId
      })
    } catch (error) {
      console.error('Failed to start transcription:', error)
      setIsGenerating(false)
    }
  }

  const unprocessedVideos = videos.filter(video =>
    !transcriptionStatuses.get(video.id)?.hasTranscript
  )

  const selectedCount = selectedVideos.size
  const allUnprocessedSelected = unprocessedVideos.length > 0 &&
    unprocessedVideos.every(video => selectedVideos.has(video.id))

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <CardTitle className="text-lg">Video Transcription</CardTitle>
            {!isConnected && (
              <Badge variant="destructive" className="text-xs">
                {connectionStatus}
              </Badge>
            )}
          </div>

          {selectedCount > 0 && (
            <Button
              onClick={handleGenerateTranscripts}
              disabled={!isConnected || isGenerating}
              className="flex items-center gap-2"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Generate Transcripts ({selectedCount})
            </Button>
          )}
        </div>

        {currentJob && isGenerating && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Processing {currentJob.videoCount} videos...</span>
              <span>{currentJob.progress}%</span>
            </div>
            <Progress value={currentJob.progress} className="h-2" />
            {currentJob.error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {currentJob.error}
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {videos.length > 0 && (
          <div className="flex items-center gap-2 pb-2 border-b">
            <Checkbox
              checked={allUnprocessedSelected}
              onCheckedChange={handleSelectAll}
              disabled={isGenerating || unprocessedVideos.length === 0}
            />
            <span className="text-sm font-medium">
              Select all ({unprocessedVideos.length} videos need transcription)
            </span>
          </div>
        )}

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {videos.map((video) => {
            const status = transcriptionStatuses.get(video.id)
            const isSelected = selectedVideos.has(video.id)
            const hasTranscript = status?.hasTranscript || false
            const isProcessing = status?.isProcessing || false

            return (
              <div
                key={video.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border",
                  hasTranscript ? "bg-green-50 border-green-200" : "bg-gray-50",
                  isProcessing && "bg-blue-50 border-blue-200"
                )}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => handleVideoSelect(video.id, checked as boolean)}
                  disabled={hasTranscript || isProcessing || isGenerating}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{video.title}</span>

                    {hasTranscript && (
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Transcribed
                      </Badge>
                    )}

                    {isProcessing && (
                      <Badge variant="outline" className="text-xs">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Processing
                      </Badge>
                    )}
                  </div>

                  {video.duration_minutes && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3" />
                      {video.duration_minutes} min
                    </div>
                  )}

                  {status?.error && (
                    <div className="flex items-center gap-1 text-xs text-destructive mt-1">
                      <AlertCircle className="h-3 w-3" />
                      {status.error}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {videos.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No videos found in this course</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}