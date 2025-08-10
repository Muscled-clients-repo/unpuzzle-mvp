import { useRef, useEffect, MutableRefObject } from 'react'
import { useAppStore } from '@/stores/app-store'

interface UseVideoPlayerProps {
  videoRef: MutableRefObject<HTMLVideoElement | null>
  onPlay?: () => void
  onPause?: (time: number) => void
  onTimeUpdate?: (time: number) => void
  onEnded?: () => void
}

export function useVideoPlayer({ 
  videoRef, 
  onPlay, 
  onPause, 
  onTimeUpdate,
  onEnded 
}: UseVideoPlayerProps) {
  // Get state and actions from store
  const isPlaying = useAppStore((state) => state.isPlaying)
  const currentTime = useAppStore((state) => state.currentTime)
  const duration = useAppStore((state) => state.duration)
  const volume = useAppStore((state) => state.volume)
  const isMuted = useAppStore((state) => state.isMuted)
  const playbackRate = useAppStore((state) => state.playbackRate)
  const inPoint = useAppStore((state) => state.inPoint)
  const outPoint = useAppStore((state) => state.outPoint)
  
  const setIsPlaying = useAppStore((state) => state.setIsPlaying)
  const setCurrentTime = useAppStore((state) => state.setCurrentTime)
  const setDuration = useAppStore((state) => state.setDuration)
  const setVolume = useAppStore((state) => state.setVolume)
  const setIsMuted = useAppStore((state) => state.setIsMuted)
  const setPlaybackRate = useAppStore((state) => state.setPlaybackRate)
  const setInOutPoints = useAppStore((state) => state.setInOutPoints)
  const clearSelection = useAppStore((state) => state.clearSelection)

  // Core video control functions
  const play = () => {
    const video = videoRef.current
    if (video) {
      video.play()
      setIsPlaying(true)
      onPlay?.()
    }
  }

  const pause = () => {
    const video = videoRef.current
    if (video) {
      video.pause()
      setIsPlaying(false)
      onPause?.(currentTime)
    }
  }

  const togglePlayPause = () => {
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }

  const seek = (time: number) => {
    const video = videoRef.current
    if (video) {
      const clampedTime = Math.max(0, Math.min(time, duration))
      video.currentTime = clampedTime
      setCurrentTime(clampedTime)
    }
  }

  const skip = (seconds: number) => {
    const video = videoRef.current
    if (!video) return
    
    const videoDuration = duration || video.duration || 0
    const newTime = Math.max(0, Math.min(currentTime + seconds, videoDuration))
    seek(newTime)
  }

  const changeVolume = (newVolume: number) => {
    const video = videoRef.current
    if (video) {
      const clampedVolume = Math.max(0, Math.min(1, newVolume))
      video.volume = clampedVolume
      setVolume(clampedVolume)
      setIsMuted(clampedVolume === 0)
    }
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    
    if (isMuted) {
      video.muted = false
      setIsMuted(false)
    } else {
      video.muted = true
      setIsMuted(true)
    }
  }

  const changePlaybackRate = (rate: number) => {
    const video = videoRef.current
    if (video) {
      video.playbackRate = rate
      setPlaybackRate(rate)
    }
  }

  const setInPoint = () => {
    setInOutPoints(currentTime, outPoint !== null ? outPoint : currentTime)
  }

  const setOutPoint = () => {
    setInOutPoints(inPoint !== null ? inPoint : 0, currentTime)
  }

  // Handle video element events
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      onTimeUpdate?.(video.currentTime)
    }

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      onEnded?.()
    }

    const handlePlay = () => {
      setIsPlaying(true)
    }

    const handlePause = () => {
      setIsPlaying(false)
    }

    // Add event listeners
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)

    // Apply initial settings
    video.volume = volume
    video.muted = isMuted
    video.playbackRate = playbackRate

    // Cleanup
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
    }
  }, [videoRef.current])

  return {
    // State
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    inPoint,
    outPoint,
    
    // Actions
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
  }
}