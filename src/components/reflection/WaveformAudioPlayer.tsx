'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Pause } from 'lucide-react'
import { useReflectionPlaybackStore } from '@/stores/reflection-playback-store'
import { useSignedUrl } from '@/hooks/use-signed-url'
import { cn } from '@/lib/utils'
import WaveSurfer from 'wavesurfer.js'

interface WaveformAudioPlayerProps {
  reflectionId: string
  fileUrl: string
  duration?: number
  timestamp: number
  isOwn?: boolean
}

export function WaveformAudioPlayer({
  reflectionId,
  fileUrl,
  duration: propDuration,
  timestamp,
  isOwn = true
}: WaveformAudioPlayerProps) {
  const waveformRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(propDuration || 0)
  const [isWaveformReady, setIsWaveformReady] = useState(false)

  // Use the same signed URL hook as video player
  const signedUrl = useSignedUrl(fileUrl, 30)

  const {
    currentlyPlaying,
    isPlaying,
    startPlayback,
    stopPlayback
  } = useReflectionPlaybackStore()

  const isThisPlaying = currentlyPlaying === reflectionId && isPlaying

  // Initialize WaveSurfer - Wait for signed URL to be ready
  useEffect(() => {
    if (!waveformRef.current || !signedUrl.url || signedUrl.isLoading) return

    // Clean up previous instance
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy()
    }

    // Create new WaveSurfer instance with modern styling
    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: isOwn
        ? 'rgba(59, 130, 246, 0.3)' // blue-500/30
        : 'rgba(156, 163, 175, 0.5)', // gray-400/50
      progressColor: isOwn
        ? 'rgb(37, 99, 235)' // blue-600
        : 'rgb(59, 130, 246)', // blue-500
      cursorColor: 'transparent',
      barWidth: 2,
      barGap: 1,
      height: 32,
      normalize: true,
      backend: 'WebAudio',
      responsive: true,
      fillParent: true
    })

    wavesurferRef.current = wavesurfer

    // Load audio
    wavesurfer.load(signedUrl.url)

    // Event listeners
    wavesurfer.on('ready', () => {
      setIsWaveformReady(true)
      const duration = wavesurfer.getDuration()
      if (duration > 0) {
        setAudioDuration(duration)
      } else if (propDuration && propDuration > 0) {
        setAudioDuration(propDuration)
      }
    })

    wavesurfer.on('error', (error) => {
      // Fallback: set ready state and use prop duration
      setIsWaveformReady(true)
      if (propDuration && propDuration > 0) {
        setAudioDuration(propDuration)
      }
    })

    wavesurfer.on('audioprocess', () => {
      setCurrentTime(wavesurfer.getCurrentTime())
    })

    wavesurfer.on('seek', () => {
      setCurrentTime(wavesurfer.getCurrentTime())
    })

    wavesurfer.on('finish', () => {
      stopPlayback()
      setCurrentTime(0)
      wavesurfer.seekTo(0)
    })

    return () => {
      if (wavesurfer) {
        wavesurfer.destroy()
      }
    }
  }, [signedUrl.url, signedUrl.isLoading, isOwn, propDuration, stopPlayback])

  // Sync playback state with WaveSurfer
  useEffect(() => {
    if (!wavesurferRef.current || !isWaveformReady) return

    if (isThisPlaying && wavesurferRef.current.isReady) {
      if (!wavesurferRef.current.isPlaying()) {
        wavesurferRef.current.play()
      }
    } else {
      if (wavesurferRef.current.isPlaying()) {
        wavesurferRef.current.pause()
      }
    }
  }, [isThisPlaying, isWaveformReady])

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
    if (!wavesurferRef.current || !isWaveformReady) return

    if (isThisPlaying) {
      wavesurferRef.current.pause()
      stopPlayback()
    } else {
      // Stop any other playing audio
      if (currentlyPlaying) {
        stopPlayback()
      }

      // Start playback
      try {
        wavesurferRef.current.play()
        startPlayback(reflectionId)
      } catch (error) {
        console.error('Failed to play audio:', error)
      }
    }
  }

  // Stop playback when component unmounts
  useEffect(() => {
    return () => {
      if (currentlyPlaying === reflectionId) {
        stopPlayback()
      }
    }
  }, [currentlyPlaying, reflectionId, stopPlayback])

  if (!fileUrl) return null

  return (
    <div className={cn(
      "flex items-center gap-3 p-2 rounded-lg max-w-sm w-full",
      isOwn
        ? "bg-blue-500/10 border border-blue-500/20 ml-auto"
        : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
    )}>
      {/* Play/Pause Button */}
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-7 w-7 p-0 rounded-full flex-shrink-0",
          isOwn
            ? "hover:bg-blue-500/20 text-blue-600"
            : "hover:bg-gray-200 dark:hover:bg-gray-700"
        )}
        onClick={handlePlayPause}
        disabled={signedUrl.isLoading || !signedUrl.url || !isWaveformReady}
      >
        {signedUrl.isLoading || !isWaveformReady ? (
          <div className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
        ) : isThisPlaying ? (
          <Pause className="h-3 w-3" />
        ) : (
          <Play className="h-3 w-3 ml-0.5" />
        )}
      </Button>

      {/* Waveform and Time Display */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Dynamic waveform visualization */}
        <div
          ref={waveformRef}
          className="flex-1 h-8 cursor-pointer"
          style={{ minWidth: '150px' }}
        />

        {/* Time Display */}
        <span className={cn(
          "text-xs font-mono flex-shrink-0",
          isOwn ? "text-blue-600" : "text-gray-600 dark:text-gray-400"
        )}>
          {formatTime(currentTime)}/{formatTime(audioDuration)}
        </span>
      </div>
    </div>
  )
}