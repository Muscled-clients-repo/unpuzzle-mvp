"use client"

import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react"
import { useAppStore } from "@/stores/app-store"
import { cn } from "@/lib/utils"
import { VideoEngine, VideoEngineRef } from "../shared/VideoEngine"
import { VideoControls } from "../shared/VideoControls"
import { VideoSeeker } from "../shared/VideoSeeker"
import { TranscriptPanel } from "../shared/TranscriptPanel"
import { useDocumentEventListener } from "@/hooks/useTrackedEventListener"
import { raceConditionGuard } from "@/lib/video-state/RaceConditionGuard"
import { isFeatureEnabled } from "@/utils/feature-flags"
import { getServiceWithFallback } from "@/lib/dependency-injection/helpers"

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
  initialTime?: number // Starting time in seconds for resume functionality
  autoplay?: boolean // Auto-play video when loaded
  onTimeUpdate?: (time: number) => void
  onPause?: (time: number) => void
  onPlay?: () => void
  onEnded?: () => void
  // Nuclear segment props
  onSetInPoint?: () => void
  onSetOutPoint?: () => void
  onSendToChat?: () => void
  onClearSelection?: () => void
  onUpdateSegment?: (inPoint: number, outPoint: number) => void
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
  initialTime = 0,
  autoplay = true,
  onTimeUpdate,
  onPause,
  onPlay,
  onEnded,
  onSetInPoint: onSetInPointProp,
  onSetOutPoint: onSetOutPointProp,
  onSendToChat: onSendToChatProp,
  onClearSelection: onClearSelectionProp,
  onUpdateSegment: onUpdateSegmentProp,
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
      // State will be set by VideoEngine's onPause event
    },
    play: () => {
      videoEngineRef.current?.play()
      // State will be set by VideoEngine's onPlay event
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

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [])

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

  // Simple debounce for spacebar to prevent rapid play/pause
  const lastSpacebarTime = useRef(0)

  // Keyboard shortcuts with tracked listener
  const handleKeyDown = (e: KeyboardEvent) => {
    const isInInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)
    if (isInInput) return

    switch (e.key) {
      case ' ':
        e.preventDefault()
        const now = Date.now()
        if (now - lastSpacebarTime.current > 300) { // 300ms debounce
          lastSpacebarTime.current = now
          handlePlayPause()
        }
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
  
  // Use tracked event listener that will be automatically cleaned up
  useDocumentEventListener('keydown', handleKeyDown, undefined, 'StudentVideoPlayer')

  const handlePlayPause = async () => {
    if (!videoEngineRef.current) return
    
    // Prevent rapid play/pause clicks
    if (isFeatureEnabled('USE_SINGLE_SOURCE_TRUTH')) {
      const operationId = `play-pause-${Date.now()}`
      const canProceed = raceConditionGuard.startOperation(operationId, 'play-pause')
      
      if (!canProceed) {
        console.log('Play/pause operation blocked - another in progress')
        return
      }
      
      try {
        await executePlayPause()
      } finally {
        raceConditionGuard.completeOperation(operationId)
      }
    } else {
      await executePlayPause()
    }
  }
  
  const executePlayPause = async () => {
    if (isPlaying) {
      // Clear timeout BEFORE pausing to prevent race condition
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
        controlsTimeoutRef.current = null
      }
      
      videoEngineRef.current!.pause()
      // Don't set state here - VideoEngine's onPause will handle it
      onPause?.(currentTime)
      // Show controls when paused
      setShowControls(true)
    } else {
      videoEngineRef.current!.play()
      // Don't set state here - VideoEngine's onPlay will handle it
      onPlay?.()
      // Show controls for 3 seconds when resuming
      setShowControls(true)
      
      // Cancel any existing timeout before setting new one
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
      
      // Use a unique ID for this timeout to detect if it's been replaced
      const timeoutId = setTimeout(() => {
        // Only hide if this is still the active timeout
        if (controlsTimeoutRef.current === timeoutId) {
          setShowControls(false)
        }
      }, 3000)
      
      controlsTimeoutRef.current = timeoutId
    }
  }

  const handleSeek = async (time: number) => {
    if (!videoEngineRef.current) return
    
    // Prevent seeking during play/pause transitions
    if (isFeatureEnabled('USE_SINGLE_SOURCE_TRUTH')) {
      if (raceConditionGuard.isOperationInProgress('play-pause')) {
        console.log('Seek blocked - play/pause in progress')
        return
      }
      
      const operationId = `seek-${Date.now()}`
      const canProceed = raceConditionGuard.startOperation(operationId, 'seek')
      
      if (!canProceed) {
        console.log('Seek operation blocked - another seek in progress')
        return
      }
      
      try {
        videoEngineRef.current.seek(time)
        setCurrentTime(time)
      } finally {
        raceConditionGuard.completeOperation(operationId)
      }
    } else {
      videoEngineRef.current.seek(time)
      setCurrentTime(time)
    }
  }

  const handleSkip = async (seconds: number) => {
    if (!videoEngineRef.current) return
    
    // Get the actual video element to read current time directly
    const videoElement = videoEngineRef.current.getVideoElement?.()
    const actualCurrentTime = videoElement?.currentTime ?? currentTime
    
    // Use videoDuration from local state first, then store, then video element
    const actualDuration = videoDuration || duration || videoElement?.duration || 0
    
    // If we still don't have a duration, just skip by the seconds without limit
    const newTime = actualDuration > 0 
      ? Math.max(0, Math.min(actualCurrentTime + seconds, actualDuration))
      : Math.max(0, actualCurrentTime + seconds)
    
    // Use handleSeek which has race condition protection
    await handleSeek(newTime)
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

  const handleFullscreen = async () => {
    const domService = getServiceWithFallback('domService', () => ({
      isFullscreen: () => !!document.fullscreenElement,
      requestFullscreen: (el: Element) => el.requestFullscreen(),
      exitFullscreen: () => document.exitFullscreen()
    }))
    
    if (!domService.isFullscreen()) {
      if (containerRef.current) {
        await domService.requestFullscreen(containerRef.current)
      }
    } else {
      await domService.exitFullscreen()
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

    // Seek to initial time if specified (for resume functionality)
    if (initialTime > 0 && videoEngineRef.current) {
      console.log(`🎯 Video loaded, seeking to initial time: ${initialTime}s`)
      videoEngineRef.current.seek(initialTime)
    }

    // Try autoplay with sound - will only work after user interaction
    if (autoplay && videoEngineRef.current) {
      console.log(`▶️ Starting autoplay with sound`)
      // Small delay to ensure seek completes before playing
      setTimeout(() => {
        videoEngineRef.current?.play()
          .then(() => {
            console.log('✅ Autoplay successful - video is playing with sound')
          })
          .catch(() => {
            console.log('ℹ️ Autoplay blocked by browser - user interaction required')
            // This is expected behavior, user will need to click play
          })
      }, initialTime > 0 ? 500 : 100) // Longer delay if we're seeking
    }
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
          videoId={videoId || 'unknown'}
          onClose={() => setShowLiveTranscript(false)}
          onSeek={handleSeek}
          onUpdateSegment={onUpdateSegmentProp}
        />
      )}
    </div>
  )
})

StudentVideoPlayer.displayName = 'StudentVideoPlayer'