"use client"

import { useRef } from "react"
import { useVideoPlayer } from "@/hooks/useVideoPlayer"
import { useKeyboardShortcuts, createVideoPlayerShortcuts } from "@/hooks/useKeyboardShortcuts"
import { useAppStore } from "@/stores/app-store"
import { cn } from "@/lib/utils"
import { VideoControls } from "./components/VideoControls"
import { VideoSeeker } from "./components/VideoSeeker"
import { TranscriptPanel } from "./components/TranscriptPanel"

interface VideoPlayerWithHooksProps {
  videoUrl: string
  title?: string
  onTimeUpdate?: (time: number) => void
  onPause?: (time: number) => void
  onPlay?: () => void
  onEnded?: () => void
}

/**
 * Example video player component using the new custom hooks
 * This demonstrates how to use useVideoPlayer and useKeyboardShortcuts
 */
export function VideoPlayerWithHooks({
  videoUrl,
  title,
  onTimeUpdate,
  onPause,
  onPlay,
  onEnded,
}: VideoPlayerWithHooksProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  
  // Use our custom video player hook
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    inPoint,
    outPoint,
    play,
    pause,
    togglePlayPause,
    seek,
    skip,
    changeVolume,
    toggleMute,
    changePlaybackRate,
    setInPoint,
    setOutPoint,
    clearSelection,
  } = useVideoPlayer({
    videoRef,
    onPlay,
    onPause,
    onTimeUpdate,
    onEnded,
  })

  // Get additional state from store
  const showControls = useAppStore((state) => state.showControls)
  const showLiveTranscript = useAppStore((state) => state.showLiveTranscript)
  const setShowControls = useAppStore((state) => state.setShowControls)
  const setShowLiveTranscript = useAppStore((state) => state.setShowLiveTranscript)
  const addTranscriptReference = useAppStore((state) => state.addTranscriptReference)

  // Fullscreen handler
  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  // Send to chat handler
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

  // Use keyboard shortcuts hook
  const shortcuts = createVideoPlayerShortcuts({
    onPlayPause: togglePlayPause,
    onSkipBackward: () => skip(-5),
    onSkipForward: () => skip(5),
    onMute: toggleMute,
    onFullscreen: handleFullscreen,
    onSetInPoint: setInPoint,
    onSetOutPoint: setOutPoint,
    onClearSelection: clearSelection,
  })

  useKeyboardShortcuts(shortcuts)

  // Mouse move handler for controls visibility
  const handleMouseMove = () => {
    setShowControls(true)
    // Could add timeout logic here if needed
  }

  return (
    <div
      ref={containerRef}
      className="relative aspect-video bg-black rounded-lg overflow-hidden group focus:outline-none focus:ring-2 focus:ring-primary/20"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onClick={togglePlayPause}
      tabIndex={0}
      role="button"
      aria-label="Video player - Click to play/pause, use keyboard shortcuts for controls"
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-cover"
      />

      {/* Controls overlay */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        {title && (
          <div className="absolute top-0 left-0 right-0 p-4">
            <h3 className="text-white text-lg font-medium">{title}</h3>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 px-4 pb-2 pt-4">
          <div className="mb-2">
            <VideoSeeker
              currentTime={currentTime}
              duration={duration}
              onSeek={seek}
              videoRef={videoRef.current}
            />
          </div>

          <VideoControls
            isPlaying={isPlaying}
            volume={volume}
            isMuted={isMuted}
            playbackRate={playbackRate}
            currentTime={currentTime}
            duration={duration}
            showLiveTranscript={showLiveTranscript}
            onPlayPause={togglePlayPause}
            onVolumeChange={changeVolume}
            onMuteToggle={toggleMute}
            onPlaybackRateChange={changePlaybackRate}
            onSkip={skip}
            onFullscreen={handleFullscreen}
            onTranscriptToggle={() => setShowLiveTranscript(!showLiveTranscript)}
            onSetInPoint={setInPoint}
            onSetOutPoint={setOutPoint}
            onSendToChat={handleSendToChat}
            onClearSelection={clearSelection}
          />
        </div>
      </div>

      {/* Transcript panel */}
      {showLiveTranscript && (
        <TranscriptPanel
          currentTime={currentTime}
          videoUrl={videoUrl}
          onClose={() => setShowLiveTranscript(false)}
          onSeek={seek}
        />
      )}
    </div>
  )
}