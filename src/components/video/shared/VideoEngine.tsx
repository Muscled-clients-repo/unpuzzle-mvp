"use client"

import { forwardRef, useImperativeHandle, useRef, useEffect, useState } from "react"
import { videoStateCoordinator } from "@/lib/video-state/VideoStateCoordinator"
import { isFeatureEnabled } from "@/utils/feature-flags"
import { getServiceWithFallback } from "@/lib/dependency-injection/helpers"

// Declare YouTube types
declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

export interface VideoEngineRef {
  play: () => Promise<void>
  pause: () => void
  seek: (time: number) => void
  setVolume: (volume: number) => void
  setMuted: (muted: boolean) => void
  setPlaybackRate: (rate: number) => void
  getVideoElement: () => HTMLVideoElement | null
}

interface VideoEngineProps {
  videoUrl: string
  onTimeUpdate?: (time: number) => void
  onLoadedMetadata?: (duration: number) => void
  onEnded?: () => void
  onPlay?: () => void
  onPause?: () => void
}

export const VideoEngine = forwardRef<VideoEngineRef, VideoEngineProps>(
  ({ videoUrl, onTimeUpdate, onLoadedMetadata, onEnded, onPlay, onPause }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null)
    const youtubePlayerRef = useRef<any>(null)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const [isYouTubeReady, setIsYouTubeReady] = useState(false)
    const [isPlaying, setIsPlaying] = useState(false)
    
    // Check if it's a YouTube URL
    const isYouTube = videoUrl?.includes('youtube.com') || videoUrl?.includes('youtu.be')
    
    // Extract YouTube video ID
    const getYouTubeId = (url: string) => {
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
      return match ? match[1] : null
    }
    
    const youtubeId = isYouTube ? getYouTubeId(videoUrl) : null

    // Load YouTube iframe API
    useEffect(() => {
      if (!isYouTube || !youtubeId) return

      // Load the YouTube iframe API script
      if (!window.YT) {
        // Use DOM service to inject script
        const domService = getServiceWithFallback('domService', () => ({
          injectScript: async (src: string) => {
            const tag = document.createElement('script')
            tag.src = src
            const firstScriptTag = document.getElementsByTagName('script')[0]
            firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
          }
        }))
        
        // Note: We don't await here because YouTube API loads asynchronously
        domService.injectScript('https://www.youtube.com/iframe_api')
      }

      // Create player when API is ready
      const initPlayer = () => {
        if (window.YT && window.YT.Player) {
          youtubePlayerRef.current = new window.YT.Player('youtube-player', {
            height: '100%',
            width: '100%',
            videoId: youtubeId,
            playerVars: {
              autoplay: 0,
              controls: 0,
              modestbranding: 1,
              rel: 0,
              showinfo: 0,
              iv_load_policy: 3,
              disablekb: 1,
              fs: 0,
              playsinline: 1,
              enablejsapi: 1,
              cc_load_policy: 0,
              origin: window.location.origin,
              widget_referrer: window.location.href,
              end: 999999,  // Prevents end screen from showing
            },
            events: {
              onReady: () => {
                setIsYouTubeReady(true)
                if (onLoadedMetadata) {
                  onLoadedMetadata(youtubePlayerRef.current.getDuration())
                }
              },
              onStateChange: (event: any) => {
                if (event.data === window.YT.PlayerState.PLAYING) {
                  setIsPlaying(true)
                  // Start time update interval when playing
                  if (!intervalRef.current) {
                    intervalRef.current = setInterval(() => {
                      if (youtubePlayerRef.current && youtubePlayerRef.current.getCurrentTime) {
                        onTimeUpdate?.(youtubePlayerRef.current.getCurrentTime())
                      }
                    }, 500)
                  }
                  onPlay?.()
                } else if (event.data === window.YT.PlayerState.PAUSED) {
                  setIsPlaying(false)
                  // Stop time update interval when paused
                  if (intervalRef.current) {
                    clearInterval(intervalRef.current)
                    intervalRef.current = null
                  }
                  onPause?.()
                } else if (event.data === window.YT.PlayerState.ENDED) {
                  setIsPlaying(false)
                  // Stop time update interval when ended
                  if (intervalRef.current) {
                    clearInterval(intervalRef.current)
                    intervalRef.current = null
                  }
                  onEnded?.()
                }
              }
            }
          })
        }
      }

      // Check if YT is already loaded
      if (window.YT && window.YT.Player) {
        initPlayer()
      } else {
        // Wait for YT to load
        window.onYouTubeIframeAPIReady = initPlayer
      }
    }, [isYouTube, youtubeId])

    // Register video element as state source
    useEffect(() => {
      if (isFeatureEnabled('USE_STATE_COORDINATOR')) {
        // Get coordinator from DI or use direct import
        const coordinator = getServiceWithFallback(
          'videoStateCoordinator',
          () => videoStateCoordinator
        )
        
        // Register HTML video element as a read-only state source
        if (!isYouTube && videoRef.current) {
          coordinator.registerSource({
            name: 'html-video-element',
            priority: 3, // Lower priority than Zustand
            isWritable: false, // Read-only
            getState: () => {
              const video = videoRef.current
              if (!video) return {}
              return {
                isPlaying: !video.paused,
                currentTime: video.currentTime,
                duration: video.duration || 0,
                volume: video.volume,
                isMuted: video.muted,
                playbackRate: video.playbackRate
              }
            }
          })
        }
        
        // Register YouTube player as a read-only state source
        if (isYouTube && youtubePlayerRef.current && isYouTubeReady) {
          coordinator.registerSource({
            name: 'youtube-player',
            priority: 3, // Lower priority than Zustand
            isWritable: false, // Read-only
            getState: () => {
              const player = youtubePlayerRef.current
              if (!player) return {}
              return {
                isPlaying: player.getPlayerState?.() === 1, // 1 = playing
                currentTime: player.getCurrentTime?.() || 0,
                duration: player.getDuration?.() || 0,
                volume: (player.getVolume?.() || 100) / 100,
                isMuted: player.isMuted?.() || false,
                playbackRate: player.getPlaybackRate?.() || 1
              }
            }
          })
        }
      }
      
      return () => {
        // Cleanup: unregister sources
        if (isFeatureEnabled('USE_STATE_COORDINATOR')) {
          videoStateCoordinator.unregisterSource('html-video-element')
          videoStateCoordinator.unregisterSource('youtube-player')
        }
      }
    }, [isYouTube, isYouTubeReady])
    
    // Cleanup interval on unmount
    useEffect(() => {
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    }, [])

    useImperativeHandle(ref, () => ({
      play: () => {
        if (isYouTube && youtubePlayerRef.current) {
          youtubePlayerRef.current.playVideo()
          onPlay?.()
          return Promise.resolve()
        } else {
          const video = videoRef.current
          if (video) {
            const playPromise = video.play()
            onPlay?.()
            return playPromise
          }
          return Promise.resolve()
        }
      },
      pause: () => {
        if (isYouTube && youtubePlayerRef.current) {
          youtubePlayerRef.current.pauseVideo()
          onPause?.()
        } else {
          const video = videoRef.current
          if (video) {
            video.pause()
            onPause?.()
          }
        }
      },
      seek: (time: number) => {
        if (isYouTube && youtubePlayerRef.current) {
          youtubePlayerRef.current.seekTo(time, true)
        } else {
          const video = videoRef.current
          if (video) {
            video.currentTime = time
          }
        }
      },
      setVolume: (volume: number) => {
        if (isYouTube && youtubePlayerRef.current) {
          youtubePlayerRef.current.setVolume(volume * 100)
        } else {
          const video = videoRef.current
          if (video) {
            video.volume = Math.max(0, Math.min(1, volume))
          }
        }
      },
      setMuted: (muted: boolean) => {
        if (isYouTube && youtubePlayerRef.current) {
          if (muted) {
            youtubePlayerRef.current.mute()
          } else {
            youtubePlayerRef.current.unMute()
          }
        } else {
          const video = videoRef.current
          if (video) {
            video.muted = muted
          }
        }
      },
      setPlaybackRate: (rate: number) => {
        if (isYouTube && youtubePlayerRef.current) {
          youtubePlayerRef.current.setPlaybackRate(rate)
        } else {
          const video = videoRef.current
          if (video) {
            video.playbackRate = rate
          }
        }
      },
      getVideoElement: () => videoRef.current,
    }))

    const handleTimeUpdate = () => {
      const video = videoRef.current
      if (video && onTimeUpdate) {
        onTimeUpdate(video.currentTime)
      }
    }

    const handleLoadedMetadata = () => {
      const video = videoRef.current
      if (video && onLoadedMetadata) {
        onLoadedMetadata(video.duration)
      }
    }

    // If it's a YouTube URL, render a div for the YouTube player
    if (isYouTube && youtubeId) {
      return (
        <div className="w-full h-full relative bg-black overflow-hidden">
          <div 
            id="youtube-player" 
            className="absolute inset-0"
            style={{ 
              pointerEvents: 'none',
            }}
          />
          {/* Overlay to hide YouTube's UI elements */}
          <style jsx>{`
            #youtube-player iframe {
              pointer-events: none !important;
            }
            /* Hide YouTube's pause overlay */
            .ytp-pause-overlay {
              display: none !important;
            }
          `}</style>
        </div>
      )
    }

    // Otherwise render a regular video element
    return (
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full pointer-events-none object-cover"
        style={{ margin: 0, padding: 0 }}
        preload="auto"
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={() => {
          // Video has enough data to start playing
          const video = videoRef.current
          if (video && video.currentTime === 0 && video.duration > 0) {
            // Seek to 0.1s to avoid black frame at start
            video.currentTime = 0.1
          }
        }}
        onWaiting={() => {
          // Video is waiting for more data
        }}
        onEnded={onEnded}
        onPlay={onPlay}
        onPause={onPause}
      />
    )
  }
)

VideoEngine.displayName = "VideoEngine"