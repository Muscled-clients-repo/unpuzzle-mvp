'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Pause, Volume2 } from 'lucide-react'
import { useReflectionPlaybackStore } from '@/stores/reflection-playback-store'
import { useReflectionCDN } from '@/hooks/use-reflection-cdn'
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

  // Use HMAC CDN token (replaces old useSignedUrl)
  const cdnResult = useReflectionCDN(reflectionId)

  const {
    currentlyPlaying,
    isPlaying,
    startPlayback,
    stopPlayback
  } = useReflectionPlaybackStore()

  const isThisPlaying = currentlyPlaying === reflectionId && isPlaying

  // Set audio source when CDN URL is available (only once)
  useEffect(() => {
    if (cdnResult.url && audioRef.current) {
      // Only set src if it's different (prevent reload during playback)
      if (audioRef.current.src !== cdnResult.url) {
        audioRef.current.src = cdnResult.url
        audioRef.current.preload = 'metadata'
      }

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
  }, [cdnResult.url, propDuration, audioDuration])

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

      // Check if we have a CDN URL ready
      if (!cdnResult.url) {
        console.error('No CDN URL available for audio playback')
        return
      }

      // Start playback
      if (audioRef.current) {
        try {
          // Ensure src is set before playing
          if (audioRef.current.src !== cdnResult.url) {
            audioRef.current.src = cdnResult.url
            // Wait for canplay event before starting
            await new Promise<void>((resolve, reject) => {
              const handleCanPlay = () => {
                audioRef.current?.removeEventListener('canplay', handleCanPlay)
                audioRef.current?.removeEventListener('error', handleError)
                resolve()
              }
              const handleError = (e: Event) => {
                audioRef.current?.removeEventListener('canplay', handleCanPlay)
                audioRef.current?.removeEventListener('error', handleError)
                reject(e)
              }
              audioRef.current?.addEventListener('canplay', handleCanPlay)
              audioRef.current?.addEventListener('error', handleError)

              // Timeout after 5 seconds
              setTimeout(() => {
                audioRef.current?.removeEventListener('canplay', handleCanPlay)
                audioRef.current?.removeEventListener('error', handleError)
                reject(new Error('Audio load timeout'))
              }, 5000)
            })
          }

          // Call play() - the 'play' event listener will update the state
          await audioRef.current.play()
        } catch (error) {
          console.error('Failed to play audio:', error)
          // Make sure state is reset on error
          stopPlayback()
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

    const handlePlay = () => {
      // Sync state when audio actually starts playing
      startPlayback(reflectionId)
    }

    const handlePause = () => {
      // Sync state when audio pauses
      if (currentlyPlaying === reflectionId) {
        stopPlayback()
      }
    }

    const handleEnded = () => {
      stopPlayback()
      setCurrentTime(0)
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [stopPlayback, isThisPlaying, startPlayback, reflectionId, currentlyPlaying])


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
            ? "hover:bg-blue-500/20 text-blue-600 dark:text-blue-400"
            : "hover:bg-gray-200 dark:hover:bg-gray-700"
        )}
        onClick={handlePlayPause}
        disabled={cdnResult.isLoading || !cdnResult.url}
      >
        {cdnResult.isLoading ? (
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
          className="relative h-6 cursor-pointer flex-1 bg-gray-200 dark:bg-gray-700 rounded"
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

              // Use brighter blues in dark mode for better contrast
              const playedColor = isOwn ? "rgb(96 165 250)" : "rgb(147 197 253)" // blue-400 : blue-300
              const unplayedColor = isOwn ? "rgb(156 163 175)" : "rgb(107 114 128)" // gray-400 : gray-500 - solid colors for better visibility

              // Use more visible height for timeline
              const scaledHeight = Math.max(4, height * 0.8)

              return (
                <div
                  key={i}
                  className="w-0.5 rounded-full transition-all duration-100 ease-out"
                  style={{
                    height: `${scaledHeight}px`,
                    background: fillPercent > 0
                      ? fillPercent >= 100
                        ? playedColor
                        : `linear-gradient(to bottom, ${playedColor} ${fillPercent}%, ${unplayedColor} ${fillPercent}%)`
                      : unplayedColor,
                    transform: isThisPlaying && fillPercent > 0 && fillPercent < 100 ? 'scaleY(1.1)' : 'scaleY(1)',
                    opacity: 1
                  }}
                />
              )
            })}
          </div>
        </div>

        {/* Time Display */}
        <span className={cn(
          "text-[10px] font-mono flex-shrink-0",
          isOwn ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"
        )}>
          {formatTime(currentTime)}/{formatTime(audioDuration)}
        </span>
      </div>

      <audio ref={audioRef} className="hidden" />
    </div>
  )
}