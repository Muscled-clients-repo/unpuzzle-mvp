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

      // Immediate fallback for prop duration if we have it
      if (propDuration && propDuration > 0) {
        setAudioDuration(propDuration)
      }

      // Fallback: if metadata doesn't load within 3 seconds, use prop duration
      const fallbackTimer = setTimeout(() => {
        if (propDuration && propDuration > 0 && (!audioDuration || audioDuration === 0 || !isFinite(audioDuration))) {
          setAudioDuration(propDuration)
        }
      }, 3000)

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

  // High-frequency animation frame for smooth progress
  useEffect(() => {
    let animationFrame: number

    const updateProgress = () => {
      if (audioRef.current && isThisPlaying) {
        setCurrentTime(audioRef.current.currentTime)
        animationFrame = requestAnimationFrame(updateProgress)
      }
    }

    if (isThisPlaying) {
      animationFrame = requestAnimationFrame(updateProgress)
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
    }
  }, [isThisPlaying])

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      // Fallback for when requestAnimationFrame isn't running
      if (!isThisPlaying) {
        setCurrentTime(audio.currentTime)
      }
    }

    const handleLoadedMetadata = () => {
      const metadataDuration = audio.duration
      // Use metadata duration if valid, otherwise fallback to prop duration
      if (metadataDuration && !isNaN(metadataDuration) && isFinite(metadataDuration) && metadataDuration > 0) {
        setAudioDuration(metadataDuration)
      } else if (propDuration && propDuration > 0) {
        setAudioDuration(propDuration)
      }
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
  }, [stopPlayback, isThisPlaying])


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

  // Generate realistic waveform heights based on duration and common voice patterns
  const getWaveformHeights = () => {
    const baseHeights = [
      4, 8, 12, 16, 22, 18, 14, 24, 20, 12,
      8, 16, 20, 28, 24, 16, 12, 8, 14, 18,
      22, 26, 20, 14, 10, 16, 24, 28, 22, 16,
      12, 8, 6, 10, 14, 18, 12, 8, 6, 4,
      8, 12, 16, 20, 14, 10, 6, 12, 16, 20,
      24, 18, 12, 8, 14, 18, 22, 16, 10, 6
    ]

    // Vary heights slightly based on reflection ID for uniqueness
    const seed = parseInt(reflectionId.slice(-4), 16) || 1000
    return baseHeights.map((height, i) => {
      const variation = ((seed * (i + 1)) % 8) - 4 // -4 to +4 variation
      return Math.max(4, Math.min(32, height + variation))
    })
  }

  return (
    <div className="flex items-center w-full gap-2 p-1">
      {/* Play/Pause Button */}
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-5 w-5 p-0 rounded-full flex-shrink-0",
          isOwn
            ? "hover:bg-blue-500/20 text-blue-600"
            : "hover:bg-gray-200 dark:hover:bg-gray-700"
        )}
        onClick={handlePlayPause}
        disabled={signedUrl.isLoading || !signedUrl.url}
      >
        {signedUrl.isLoading ? (
          <div className="h-2 w-2 animate-spin rounded-full border border-current border-t-transparent" />
        ) : isThisPlaying ? (
          <Pause className="h-2 w-2" />
        ) : (
          <Play className="h-2 w-2" />
        )}
      </Button>

      {/* Waveform and Time Display */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Static waveform visualization */}
        <div
          className="relative h-4 cursor-pointer flex-1"
          onClick={handleSeek}
        >
          {/* Waveform bars */}
          <div className="absolute inset-0 flex items-center justify-between px-1">
            {getWaveformHeights().map((height, i) => {
              const totalBars = getWaveformHeights().length
              const barStartPercent = (i / totalBars) * 100
              const barEndPercent = ((i + 1) / totalBars) * 100

              // Calculate how much of this bar should be colored
              let fillPercent = 0
              if (progress >= barEndPercent) {
                // Bar is fully played
                fillPercent = 100
              } else if (progress > barStartPercent) {
                // Bar is partially played - smooth transition
                fillPercent = ((progress - barStartPercent) / (barEndPercent - barStartPercent)) * 100
              }
              // else fillPercent stays 0 (not played)

              const playedColor = isOwn ? "rgb(37 99 235)" : "rgb(59 130 246)" // blue-600 : blue-500
              const unplayedColor = isOwn ? "rgba(59 130 246, 0.3)" : "rgba(156 163 175, 0.5)" // blue-500/30 : gray-400/50

              // Always use small height for timeline
              const scaledHeight = Math.max(2, height * 0.5)

              return (
                <div
                  key={i}
                  className="w-1 rounded-full transition-all duration-100 ease-out"
                  style={{
                    height: `${scaledHeight}px`,
                    background: fillPercent > 0
                      ? fillPercent >= 100
                        ? playedColor
                        : `linear-gradient(to bottom, ${playedColor} ${fillPercent}%, ${unplayedColor} ${fillPercent}%)`
                      : unplayedColor,
                    transform: isThisPlaying && fillPercent > 0 && fillPercent < 100 ? 'scaleY(1.1)' : 'scaleY(1)',
                    opacity: fillPercent > 0 ? 1 : 0.7
                  }}
                />
              )
            })}
          </div>
        </div>

        {/* Time Display */}
        <span className={cn(
          "text-[10px] font-mono flex-shrink-0",
          isOwn ? "text-blue-600" : "text-gray-600 dark:text-gray-400"
        )}>
          {formatTime(currentTime)}/{formatTime(audioDuration)}
        </span>
      </div>

      <audio ref={audioRef} className="hidden" />
    </div>
  )
}