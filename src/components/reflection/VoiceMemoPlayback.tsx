'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Pause, Volume2 } from 'lucide-react'
import { useReflectionPlaybackStore } from '@/stores/reflection-playback-store'
import { backblazeService } from '@/services/video/backblaze-service'

interface VoiceMemoPlaybackProps {
  reflectionId: string
  fileUrl: string // The private:fileId:fileName format from Backblaze
  duration?: number
  timestamp: number
}

export function VoiceMemoPlayback({
  reflectionId,
  fileUrl,
  duration: propDuration,
  timestamp
}: VoiceMemoPlaybackProps) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isLoadingUrl, setIsLoadingUrl] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const {
    currentlyPlaying,
    isPlaying,
    currentTime,
    duration,
    startPlayback,
    stopPlayback,
    setPlaybackTime,
    setDuration
  } = useReflectionPlaybackStore()

  const isThisPlaying = currentlyPlaying === reflectionId && isPlaying

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Get signed URL when needed
  const getSignedUrl = async () => {
    if (!fileUrl.startsWith('private:')) return fileUrl

    setIsLoadingUrl(true)
    try {
      // Extract fileId and fileName from private URL format
      const [, fileId, fileName] = fileUrl.split(':')
      const signedUrlResult = await backblazeService.generateSignedUrl(fileId, fileName, 1) // 1 hour expiry
      setAudioUrl(signedUrlResult.url)
      return signedUrlResult.url
    } catch (error) {
      console.error('Failed to get signed URL for voice memo:', error)
      return null
    } finally {
      setIsLoadingUrl(false)
    }
  }

  // Handle play/pause
  const handlePlayPause = async () => {
    if (isThisPlaying) {
      audioRef.current?.pause()
      stopPlayback()
    } else {
      // Stop any other playing audio
      if (currentlyPlaying) {
        stopPlayback()
      }

      // Get audio URL if needed
      let urlToPlay = audioUrl
      if (!urlToPlay) {
        urlToPlay = await getSignedUrl()
        if (!urlToPlay) return
      }

      // Start playback
      if (audioRef.current) {
        audioRef.current.src = urlToPlay
        try {
          await audioRef.current.play()
          startPlayback(reflectionId)
        } catch (error) {
          console.error('Failed to play audio:', error)
        }
      }
    }
  }

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      setPlaybackTime(audio.currentTime)
    }

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
    }

    const handleEnded = () => {
      stopPlayback()
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [setPlaybackTime, setDuration, stopPlayback])

  // Stop playback when component unmounts or reflection changes
  useEffect(() => {
    return () => {
      if (currentlyPlaying === reflectionId) {
        stopPlayback()
      }
    }
  }, [currentlyPlaying, reflectionId, stopPlayback])

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0"
        onClick={handlePlayPause}
        disabled={isLoadingUrl}
      >
        {isLoadingUrl ? (
          <div className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
        ) : isThisPlaying ? (
          <Pause className="h-3 w-3" />
        ) : (
          <Play className="h-3 w-3" />
        )}
      </Button>

      <Volume2 className="h-3 w-3" />

      <span className="font-mono">
        {isThisPlaying
          ? `${formatTime(currentTime)} / ${formatTime(duration || propDuration || 0)}`
          : `${formatTime(propDuration || 0)}`
        }
      </span>

      <span className="text-muted-foreground/70">
        at {formatTime(timestamp)}
      </span>

      <audio ref={audioRef} className="hidden" />
    </div>
  )
}