"use client"

import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react"
import { useAppStore } from "@/stores/app-store"
import { cn } from "@/lib/utils"
import { VideoEngine, VideoEngineRef } from "../shared/VideoEngine"
import { VideoControls } from "../shared/VideoControls"
import { VideoSeeker } from "../shared/VideoSeeker"
import { TranscriptPanel } from "../shared/TranscriptPanel"

export interface StudentVideoPlayerRef {
  pause: () => void
  play: () => void
  isPaused: () => boolean
  getCurrentTime: () => number
}

interface StudentVideoPlayerProps {
  videoUrl: string
  title?: string
  transcript?: string
  videoId?: string // Optional: for loading student-specific data
  onTimeUpdate?: (time: number) => void
  onPause?: (time: number) => void
  onPlay?: () => void
  onEnded?: () => void
  // Nuclear segment props
  onSetInPoint?: () => void
  onSetOutPoint?: () => void
  onSendToChat?: () => void
  onClearSelection?: () => void
  inPoint?: number | null
  outPoint?: number | null
}

export const StudentVideoPlayer = forwardRef<
  StudentVideoPlayerRef,
  StudentVideoPlayerProps
>(({
  videoUrl,
  title,
  transcript,
  videoId,
  onTimeUpdate,
  onPause,
  onPlay,
  onEnded,
  onSetInPoint: onSetInPointProp,
  onSetOutPoint: onSetOutPointProp,
  onSendToChat: onSendToChatProp,
  onClearSelection: onClearSelectionProp,
  inPoint: inPointProp,
  outPoint: outPointProp,
}, ref) => {
  // console.log('📹 StudentVideoPlayer rendering with:', { videoUrl, title })
  
  const containerRef = useRef<HTMLDivElement>(null)
  const videoEngineRef = useRef<VideoEngineRef>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [videoDuration, setVideoDuration] = useState(0)

  // Get state and actions from Zustand store using individual selectors
  // Generic video state (still needed for basic playback)
  const isPlaying = useAppStore((state) => state.isPlaying)
  const currentTime = useAppStore((state) => state.currentTime)
  const duration = useAppStore((state) => state.duration)
  const volume = useAppStore((state) => state.volume)
  const isMuted = useAppStore((state) => state.isMuted)
  const playbackRate = useAppStore((state) => state.playbackRate)
  const showControls = useAppStore((state) => state.showControls)
  const showLiveTranscript = useAppStore((state) => state.showLiveTranscript)
  
  // Generic video actions
  const setIsPlaying = useAppStore((state) => state.setIsPlaying)
  const setCurrentTime = useAppStore((state) => state.setCurrentTime)
  const setDuration = useAppStore((state) => state.setDuration)
  const setVolume = useAppStore((state) => state.setVolume)
  const setIsMuted = useAppStore((state) => state.setIsMuted)
  const setPlaybackRate = useAppStore((state) => state.setPlaybackRate)
  const setShowControls = useAppStore((state) => state.setShowControls)
  const setShowLiveTranscript = useAppStore((state) => state.setShowLiveTranscript)
  
  // Student-specific video actions
  const loadStudentVideo = useAppStore((state) => state.loadStudentVideo)
  
  // Expose imperative API for parent components
  useImperativeHandle(ref, () => ({
    pause: () => {
      videoEngineRef.current?.pause()
      setIsPlaying(false)
    },
    play: () => {
      videoEngineRef.current?.play()
      setIsPlaying(true)
    },
    isPaused: () => !isPlaying,
    getCurrentTime: () => currentTime
  }), [isPlaying, currentTime, setIsPlaying])

  // Load student-specific video data when component mounts
  useEffect(() => {
    if (videoId) {
      loadStudentVideo(videoId)
    }
  }, [videoId, loadStudentVideo])

  // Effect to manage controls visibility based on play state
  useEffect(() => {
    if (!isPlaying) {
      // Always show controls when paused
      setShowControls(true)
      // Clear any existing timeout
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
        controlsTimeoutRef.current = null
      }
    }
  }, [isPlaying, setShowControls])

  // Load student-specific video data when component mounts
  // Removed the video sync effect since it was causing issues

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)
      if (isInInput) return

      switch (e.key) {
        case ' ':
          e.preventDefault()
          handlePlayPause()
          break
        case 'ArrowLeft':
          e.preventDefault()
          handleSkip(-5)
          break
        case 'ArrowRight':
          e.preventDefault()
          handleSkip(5)
          break
        case 'm':
        case 'M':
          e.preventDefault()
          handleMuteToggle()
          break
        case 'i':
        case 'I':
          e.preventDefault()
          handleSetInPoint()
          break
        case 'o':
        case 'O':
          e.preventDefault()
          handleSetOutPoint()
          break
        case 'f':
        case 'F':
          e.preventDefault()
          handleFullscreen()
          break
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  })

  const handlePlayPause = () => {
    if (!videoEngineRef.current) return
    
    if (isPlaying) {
      videoEngineRef.current.pause()
      setIsPlaying(false)
      onPause?.(currentTime)
      // Show controls when paused
      setShowControls(true)
      // Clear any existing timeout
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
        controlsTimeoutRef.current = null
      }
    } else {
      videoEngineRef.current.play()
      setIsPlaying(true)
      onPlay?.()
      // Show controls for 3 seconds when resuming
      setShowControls(true)
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }
  }

  const handleSeek = (time: number) => {
    videoEngineRef.current?.seek(time)
    setCurrentTime(time)
  }

  const handleSkip = (seconds: number) => {
    if (!videoEngineRef.current) return
    
    const videoDuration = duration || 0
    const newTime = Math.max(0, Math.min(currentTime + seconds, videoDuration))
    
    videoEngineRef.current.seek(newTime)
    setCurrentTime(newTime)
  }

  const handleVolumeChange = (newVolume: number) => {
    videoEngineRef.current?.setVolume(newVolume)
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const handleMuteToggle = () => {
    if (!videoEngineRef.current) return
    
    if (isMuted) {
      videoEngineRef.current.setVolume(volume)
      setIsMuted(false)
    } else {
      videoEngineRef.current.setVolume(0)
      setIsMuted(true)
    }
  }

  const handlePlaybackRateChange = (rate: number) => {
    videoEngineRef.current?.setPlaybackRate(rate)
    setPlaybackRate(rate)
  }

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  // Use nuclear segment handlers from props if provided
  const handleSetInPoint = onSetInPointProp || (() => {
    console.log('Set in point - no handler provided')
  })

  const handleSetOutPoint = onSetOutPointProp || (() => {
    console.log('Set out point - no handler provided')
  })

  const handleSendToChat = onSendToChatProp || (() => {
    console.log('Send to chat - no handler provided')
  })
  
  const handleClearSelection = onClearSelectionProp || (() => {
    console.log('Clear selection - no handler provided')
  })

  const handleMouseMove = () => {
    // Only call setShowControls if controls are not already showing
    if (!showControls) {
      setShowControls(true)
    }
    // Only set timeout to hide controls if video is playing
    if (isPlaying) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }
  }

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time)
    onTimeUpdate?.(time)
  }

  const handleLoadedMetadata = (duration: number) => {
    setDuration(duration)
    setVideoDuration(duration)
  }

  return (
    <div
      ref={containerRef}
      className="relative aspect-video bg-black rounded-lg overflow-hidden group focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-default"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => !showControls && setShowControls(true)}
      onMouseLeave={() => {
        // Only hide on mouse leave if video is playing
        if (isPlaying && showControls) {
          setShowControls(false)
        }
      }}
      tabIndex={0}
      aria-label="Video player - Click to play/pause, use keyboard shortcuts for controls"
    >
      <VideoEngine
        ref={videoEngineRef}
        videoUrl={videoUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={onEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Click area for play/pause - covers the video area except controls */}
      <div 
        className="absolute inset-x-0 top-0 bottom-20 z-20 cursor-default" 
        onClick={handlePlayPause}
        aria-hidden="true"
      />

      {/* Gradient overlay - no pointer events */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent transition-opacity duration-300 pointer-events-none z-10",
          showControls ? "opacity-100" : "opacity-0"
        )}
      >
        <div 
          className="absolute bottom-0 left-0 right-0 px-4 pb-2 pt-4 pointer-events-auto z-30"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-2">
            <VideoSeeker
              currentTime={currentTime}
              duration={videoDuration || duration}
              onSeek={handleSeek}
              videoRef={videoEngineRef.current?.getVideoElement()}
              inPoint={inPointProp}
              outPoint={outPointProp}
            />
          </div>

          <VideoControls
            isPlaying={isPlaying}
            volume={volume}
            isMuted={isMuted}
            playbackRate={playbackRate}
            currentTime={currentTime}
            duration={videoDuration || duration}
            showLiveTranscript={showLiveTranscript}
            onPlayPause={handlePlayPause}
            onVolumeChange={handleVolumeChange}
            onMuteToggle={handleMuteToggle}
            onPlaybackRateChange={handlePlaybackRateChange}
            onSkip={handleSkip}
            onFullscreen={handleFullscreen}
            onTranscriptToggle={() => setShowLiveTranscript(!showLiveTranscript)}
            onSetInPoint={handleSetInPoint}
            onSetOutPoint={handleSetOutPoint}
            onSendToChat={handleSendToChat}
            onClearSelection={handleClearSelection}
            inPoint={inPointProp}
            outPoint={outPointProp}
          />
        </div>
      </div>

      {showLiveTranscript && (
        <TranscriptPanel
          currentTime={currentTime}
          videoUrl={videoUrl}
          onClose={() => setShowLiveTranscript(false)}
          onSeek={handleSeek}
        />
      )}
    </div>
  )
})

StudentVideoPlayer.displayName = 'StudentVideoPlayer'