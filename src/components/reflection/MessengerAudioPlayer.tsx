'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Pause, Volume2 } from 'lucide-react'
import { useReflectionPlaybackStore } from '@/stores/reflection-playback-store'
import { useSignedUrl } from '@/hooks/use-signed-url'
import { cn } from '@/lib/utils'

interface MessengerAudioPlayerProps {
  reflectionId: string
  fileUrl: string
  duration?: number
  timestamp: number
  isOwn?: boolean // If this is the user's own message
}

export function MessengerAudioPlayer({
  reflectionId,
  fileUrl,
  duration: propDuration,
  timestamp,
  isOwn = true
}: MessengerAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(propDuration || 0)

  // Use the same signed URL hook as video player
  const signedUrl = useSignedUrl(fileUrl, 30)

  const {
    currentlyPlaying,
    isPlaying,
    startPlayback,
    stopPlayback
  } = useReflectionPlaybackStore()

  const isThisPlaying = currentlyPlaying === reflectionId && isPlaying

  // Set audio source when signed URL is available
  useEffect(() => {
    if (signedUrl.url && audioRef.current) {
      audioRef.current.src = signedUrl.url
      audioRef.current.preload = 'metadata'

      // Fallback: if metadata doesn't load within 2 seconds, use prop duration
      const fallbackTimer = setTimeout(() => {
        if (propDuration && propDuration > 0 && (!audioDuration || audioDuration === 0)) {
          console.log('[MessengerAudioPlayer] Using fallback duration:', propDuration)
          setAudioDuration(propDuration)
        }
      }, 2000)

      return () => clearTimeout(fallbackTimer)
    }
  }, [signedUrl.url, propDuration, audioDuration])

  // Format time display
  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds)) {
      return '0:00'
    }
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
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

      // Check if we have a signed URL ready
      if (!signedUrl.url) {
        console.error('No signed URL available for audio playback')
        return
      }

      // Start playback
      if (audioRef.current) {
        // Source should already be set, just play
        try {
          await audioRef.current.play()
          startPlayback(reflectionId)
        } catch (error) {
          console.error('Failed to play audio:', error)
        }
      }
    }
  }

  // Handle scrubber change
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !audioDuration) return

    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    const newTime = percentage * audioDuration

    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handleLoadedMetadata = () => {
      const metadataDuration = audio.duration
      // Use metadata duration if valid, otherwise fallback to prop duration
      if (metadataDuration && !isNaN(metadataDuration) && isFinite(metadataDuration)) {
        setAudioDuration(metadataDuration)
      } else if (propDuration && propDuration > 0) {
        setAudioDuration(propDuration)
      }
      console.log('[MessengerAudioPlayer] Duration set:', {
        metadataDuration,
        propDuration,
        finalDuration: audioDuration
      })
    }

    const handleEnded = () => {
      stopPlayback()
      setCurrentTime(0)
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [stopPlayback])

  // Stop playback when component unmounts
  useEffect(() => {
    return () => {
      if (currentlyPlaying === reflectionId) {
        stopPlayback()
      }
    }
  }, [currentlyPlaying, reflectionId, stopPlayback])

  if (!fileUrl) return null

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-2xl max-w-xs",
      isOwn
        ? "bg-blue-500 text-white ml-auto"
        : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
    )}>
      {/* Play/Pause Button */}
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 w-8 p-0 rounded-full",
          isOwn
            ? "hover:bg-blue-600 text-white"
            : "hover:bg-gray-200 dark:hover:bg-gray-700"
        )}
        onClick={handlePlayPause}
        disabled={signedUrl.isLoading || !signedUrl.url}
      >
        {signedUrl.isLoading ? (
          <div className="h-4 w-4 animate-spin rounded-full border border-current border-t-transparent" />
        ) : isThisPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 ml-0.5" />
        )}
      </Button>

      {/* Audio Controls */}
      <div className="flex-1 min-w-0">
        {/* Waveform/Progress Bar */}
        <div
          className="relative h-6 cursor-pointer mb-1"
          onClick={handleSeek}
        >
          {/* Background track */}
          <div className={cn(
            "absolute top-1/2 left-0 right-0 h-1 rounded-full -translate-y-1/2",
            isOwn ? "bg-blue-300" : "bg-gray-300 dark:bg-gray-600"
          )} />

          {/* Progress track */}
          <div
            className={cn(
              "absolute top-1/2 left-0 h-1 rounded-full -translate-y-1/2 transition-all",
              isOwn ? "bg-white" : "bg-blue-500"
            )}
            style={{ width: `${progress}%` }}
          />

          {/* Playhead */}
          {isThisPlaying && (
            <div
              className={cn(
                "absolute top-1/2 w-3 h-3 rounded-full -translate-y-1/2 -translate-x-1/2",
                isOwn ? "bg-white" : "bg-blue-500"
              )}
              style={{ left: `${progress}%` }}
            />
          )}

          {/* Simplified waveform visualization */}
          <div className="absolute inset-0 flex items-center justify-around px-1">
            {Array.from({ length: 20 }, (_, i) => (
              <div
                key={i}
                className={cn(
                  "w-0.5 rounded-full opacity-40",
                  isOwn ? "bg-white" : "bg-gray-500"
                )}
                style={{
                  height: `${Math.random() * 16 + 4}px`
                }}
              />
            ))}
          </div>
        </div>

        {/* Time Display */}
        <div className="flex items-center justify-between text-xs">
          <Volume2 className="h-3 w-3" />
          <span className="font-mono">
            {formatTime(currentTime)} / {formatTime(audioDuration)}
          </span>
        </div>
      </div>

      <audio ref={audioRef} className="hidden" />
    </div>
  )
}