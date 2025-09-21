"use client"

import { useState, useRef, useEffect } from "react"
import { SimpleModal } from "../media/SimpleModal"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { useSignedUrl } from "@/hooks/use-signed-url"
import { useTranscriptQuery, useTranscriptUpdate } from "@/hooks/use-transcript-queries"
import { Loader2, AlertCircle, RefreshCw, Maximize, Minimize, Save, FileText, X, Clock, Edit2 } from "lucide-react"
import { toast } from "sonner"

// Helper function to extract filename from full path
const extractFilename = (path: string | undefined): string | undefined => {
  if (!path) return undefined
  return path.split('/').pop() // Get the last part after the last slash
}

interface SimpleVideoPreviewProps {
  video: {
    id?: string
    name?: string
    title?: string
    filename?: string
    originalFilename?: string
    video_url?: string
    url?: string
    backblaze_url?: string
  } | null
  isOpen: boolean
  onClose: () => void
  title?: string
  autoPlay?: boolean
}

export function SimpleVideoPreview({ video, isOpen, onClose, title, autoPlay = true }: SimpleVideoPreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isVideoReady, setIsVideoReady] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)
  const [transcriptText, setTranscriptText] = useState('')
  const [hasChanges, setHasChanges] = useState(false)
  const [originalSegments, setOriginalSegments] = useState<any[]>([])
  const [editingSegment, setEditingSegment] = useState<number | null>(null)
  const [segments, setSegments] = useState<any[]>([])
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Get signed URL for private video access
  const videoUrl = video?.video_url || video?.url || video?.backblaze_url
  const signedUrl = useSignedUrl(videoUrl || null, 30)

  // Get transcript data
  const { data: transcriptData, isLoading: transcriptLoading } = useTranscriptQuery(video?.id || '')
  const transcriptMutation = useTranscriptUpdate(video?.id || '')
  
  console.log('[VIDEO PREVIEW] Video URL format:', videoUrl)
  console.log('[VIDEO PREVIEW] Video data for title:', video)
  console.log('[VIDEO PREVIEW] SignedUrl state:', {
    isLoading: signedUrl.isLoading,
    error: signedUrl.error,
    data: signedUrl.data,
    hasData: !!signedUrl.data
  })

  // Initialize transcript text and segments when data loads
  useEffect(() => {
    if (transcriptData?.hasTranscript && transcriptData.transcript?.text) {
      setTranscriptText(transcriptData.transcript.text)
      setHasChanges(false)

      // Extract segments if available
      if (transcriptData.transcript.segments) {
        let segmentArray = []

        // Handle different segment structures
        if (Array.isArray(transcriptData.transcript.segments)) {
          segmentArray = transcriptData.transcript.segments
        } else if (transcriptData.transcript.segments.segments && Array.isArray(transcriptData.transcript.segments.segments)) {
          segmentArray = transcriptData.transcript.segments.segments
        }

        setSegments(segmentArray || [])
        setOriginalSegments(segmentArray || []) // Keep original for comparison
      }
    }
  }, [transcriptData])

  // Handle transcript text changes
  const handleTranscriptChange = (newText: string) => {
    setTranscriptText(newText)
    setHasChanges(newText !== (transcriptData?.transcript?.text || ''))
  }

  // Format timestamp for display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Handle clicking on a timestamp to seek video
  const handleTimestampClick = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds
    }
  }

  // Handle segment text editing
  const handleSegmentEdit = (index: number, newText: string) => {
    const updatedSegments = segments.map((segment, i) =>
      i === index ? { ...segment, text: newText } : segment
    )
    setSegments(updatedSegments)

    // Update full transcript text
    const newFullText = updatedSegments.map(s => s.text).join(' ')
    setTranscriptText(newFullText)

    // Check if any segment has changed from original
    const hasSegmentChanges = updatedSegments.some((segment, i) =>
      !originalSegments[i] || segment.text !== originalSegments[i].text
    )
    setHasChanges(hasSegmentChanges)
  }

  // Save transcript changes
  const handleSaveTranscript = async () => {
    if (!hasChanges || !transcriptText.trim()) return

    try {
      await transcriptMutation.mutateAsync({
        text: transcriptText.trim(),
        segments: segments.length > 0 ? segments : undefined
      })
      setHasChanges(false)
      setOriginalSegments([...segments]) // Update original to current after save
      toast.success('Transcript updated successfully')
    } catch (error) {
      toast.error(`Failed to update transcript: ${error.message}`)
    }
  }

  const handleFullscreen = async () => {
    if (!containerRef.current) return
    
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (error) {
      console.error('Fullscreen error:', error)
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  // Reset video ready state when modal opens/closes or URL changes
  useEffect(() => {
    if (isOpen && signedUrl.url) {
      setIsVideoReady(false)
    }
  }, [isOpen, signedUrl.url])

  if (!video || !videoUrl) {
    return null
  }

  return (
    <SimpleModal
      isOpen={isOpen}
      onClose={onClose}
      title={title || video?.name || video?.title || video?.originalFilename || video?.filename || extractFilename(video?.filename) || video?.fileName || video?.file_name || video?.originalName || "Video Preview"}
      maxWidth={showTranscript ? "max-w-7xl" : "max-w-4xl"}
    >
      <div className="p-0">
        <div className={`flex ${showTranscript ? 'gap-4' : ''}`}>
          {/* Video Section */}
          <div className={showTranscript ? 'flex-1' : 'w-full'}>
            <div ref={containerRef} className="relative bg-black" style={{ minHeight: '480px', aspectRatio: '16/9' }}>
          {signedUrl.error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p className="mb-2">Failed to load video</p>
              <p className="text-sm text-gray-300 mb-4">Error: {signedUrl.error?.message || 'Unknown error'}</p>
              <p className="text-xs text-gray-400 mb-4">Original URL: {videoUrl}</p>
              <Button 
                onClick={() => signedUrl.refetch()} 
                variant="outline"
                className="text-black"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : signedUrl.url ? (
            <>
              <video
                ref={videoRef}
                src={signedUrl.url}
                controls
                className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 ${
                  isVideoReady ? 'opacity-100' : 'opacity-0'
                }`}
                autoPlay={autoPlay}
                muted={autoPlay}
                preload="auto"
                poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400'%3E%3Crect width='100%25' height='100%25' fill='%23000'/%3E%3C/svg%3E"
                onCanPlayThrough={() => {
                  setIsVideoReady(true)
                  if (autoPlay && videoRef.current) {
                    videoRef.current.play()
                  }
                }}
                onError={(e) => {
                  console.error('Video playback error:', e)
                  const target = e.target as HTMLVideoElement
                  const error = target.error
                  if (error) {
                    console.error('Video error details:', {
                      code: error.code,
                      message: error.message,
                      url: target.src
                    })
                  }
                }}
              >
                Your browser does not support the video tag.
              </video>
              
              {/* Loading spinner overlay */}
              {!isVideoReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}
              
              {/* Fullscreen button */}
              <Button
                onClick={handleFullscreen}
                variant="ghost"
                size="sm"
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white z-10"
              >
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>

              {/* Transcript toggle button */}
              {transcriptData?.hasTranscript && (
                <Button
                  onClick={() => setShowTranscript(!showTranscript)}
                  variant="ghost"
                  size="sm"
                  className="absolute top-4 right-16 bg-black/50 hover:bg-black/70 text-white z-10"
                >
                  <FileText className="h-4 w-4" />
                </Button>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          )}
            </div>
          </div>

          {/* Transcript Sidebar */}
          {showTranscript && (
            <div className="w-80 border-l bg-background">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Transcript
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTranscript(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {transcriptLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : transcriptData?.hasTranscript ? (
                  <div className="space-y-4">
                    {/* Segments View */}
                    {segments.length > 0 ? (
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {segments.map((segment, index) => (
                          <div
                            key={index}
                            className="flex gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                          >
                            {/* Timestamp - Clickable */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto p-1 font-mono text-xs min-w-[60px]"
                              onClick={() => handleTimestampClick(segment.start)}
                              title={`Jump to ${formatTime(segment.start)}`}
                            >
                              {formatTime(segment.start)}
                            </Button>

                            {/* Segment Text - Editable */}
                            <div className="flex-1">
                              {editingSegment === index ? (
                                <Textarea
                                  value={segment.text}
                                  onChange={(e) => handleSegmentEdit(index, e.target.value)}
                                  onBlur={() => setEditingSegment(null)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.ctrlKey) {
                                      setEditingSegment(null)
                                    }
                                    if (e.key === 'Escape') {
                                      setEditingSegment(null)
                                    }
                                  }}
                                  className="text-sm min-h-[60px] resize-none"
                                  autoFocus
                                  rows={3}
                                />
                              ) : (
                                <p
                                  className="text-sm cursor-pointer hover:bg-primary/10 p-1 rounded whitespace-pre-wrap"
                                  onClick={() => setEditingSegment(index)}
                                  title="Click to edit this segment"
                                >
                                  {segment.text}
                                </p>
                              )}
                            </div>

                            {/* Edit Icon */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto p-1 opacity-0 group-hover:opacity-100"
                              onClick={() => setEditingSegment(index)}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No segments available</p>
                        <p className="text-sm">This transcript doesn't have timestamp segments</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        {transcriptData.transcript?.wordCount} words
                        {segments.length > 0 && ` • ${segments.length} segments`}
                      </div>
                      <Button
                        onClick={handleSaveTranscript}
                        disabled={!hasChanges || transcriptMutation.isPending}
                        size="sm"
                      >
                        {transcriptMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        {transcriptMutation.isPending ? 'Saving...' : hasChanges ? 'Save Changes' : 'Saved'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No transcript available</p>
                    <p className="text-sm">Upload a transcript file to edit it here</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </SimpleModal>
  )
}