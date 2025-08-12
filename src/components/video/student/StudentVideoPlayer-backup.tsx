"use client"

import { useRef, useEffect, useState } from "react"
import { useAppStore } from "@/stores/app-store"
import { cn } from "@/lib/utils"
import { VideoEngine, VideoEngineRef } from "../shared/VideoEngine"
import { VideoControls } from "../shared/VideoControls"
import { VideoSeeker } from "../shared/VideoSeeker"
import { TranscriptPanel } from "../shared/TranscriptPanel"

interface StudentVideoPlayerProps {
  videoUrl: string
  title?: string
  transcript?: string
  onTimeUpdate?: (time: number) => void
  onPause?: (time: number) => void
  onPlay?: () => void
  onEnded?: () => void
}

export function StudentVideoPlayer({
  videoUrl,
  title,
  transcript,
  onTimeUpdate,
  onPause,
  onPlay,
  onEnded,
}: StudentVideoPlayerProps) {
  // console.log('📹 StudentVideoPlayer rendering with:', { videoUrl, title })
  
  const containerRef = useRef<HTMLDivElement>(null)
  const videoEngineRef = useRef<VideoEngineRef>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [videoDuration, setVideoDuration] = useState(0)

  // Get state and actions from Zustand store using individual selectors
  const isPlaying = useAppStore((state) => state.isPlaying)
  const currentTime = useAppStore((state) => state.currentTime)
  const duration = useAppStore((state) => state.duration)
  const volume = useAppStore((state) => state.volume)
  const isMuted = useAppStore((state) => state.isMuted)
  const playbackRate = useAppStore((state) => state.playbackRate)
  const showControls = useAppStore((state) => state.showControls)
  const showLiveTranscript = useAppStore((state) => state.showLiveTranscript)
  const inPoint = useAppStore((state) => state.inPoint)
  const outPoint = useAppStore((state) => state.outPoint)
  
  const setIsPlaying = useAppStore((state) => state.setIsPlaying)
  const setCurrentTime = useAppStore((state) => state.setCurrentTime)
  const setDuration = useAppStore((state) => state.setDuration)
  const setVolume = useAppStore((state) => state.setVolume)
  const setIsMuted = useAppStore((state) => state.setIsMuted)
  const setPlaybackRate = useAppStore((state) => state.setPlaybackRate)
  const setShowControls = useAppStore((state) => state.setShowControls)
  const setShowLiveTranscript = useAppStore((state) => state.setShowLiveTranscript)
  const setInOutPoints = useAppStore((state) => state.setInOutPoints)
  const clearSelection = useAppStore((state) => state.clearSelection)
  const addTranscriptReference = useAppStore((state) => state.addTranscriptReference)

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
    } else {
      videoEngineRef.current.play()
      setIsPlaying(true)
      onPlay?.()
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

  const handleSetInPoint = () => {
    // Set in point at current time, keep out point as is or set to current time if not set
    setInOutPoints(currentTime, outPoint !== null ? outPoint : currentTime)
  }

  const handleSetOutPoint = () => {
    // Set out point at current time, keep in point as is or set to 0 if not set
    setInOutPoints(inPoint !== null ? inPoint : 0, currentTime)
  }

  const handleSendToChat = () => {
    if (inPoint !== null && outPoint !== null) {
      const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60)
        const seconds = Math.floor(time % 60)
        return `${minutes}:${seconds.toString().padStart(2, "0")}`
      }
      
      addTranscriptReference({
        text: `[Video clip from ${formatTime(inPoint)} to ${formatTime(outPoint)}]`,
        startTime: inPoint,
        endTime: outPoint,
        videoId: videoUrl,
      })
    }
  }

  const handleMouseMove = () => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false)
    }, 3000)
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
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
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
        {title && (
          <div className="absolute top-0 left-0 right-0 p-4 pointer-events-none">
            <h3 className="text-white text-lg font-medium">{title}</h3>
          </div>
        )}

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
            onClearSelection={clearSelection}
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
}