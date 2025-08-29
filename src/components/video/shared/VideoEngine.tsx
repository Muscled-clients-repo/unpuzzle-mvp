"use client"

import { forwardRef, useImperativeHandle, useRef, useEffect, useState } from "react"

// Declare YouTube types
declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

export interface VideoEngineRef {
  play: () => void
  pause: () => void
  seek: (time: number) => void
  setVolume: (volume: number) => void
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
        const tag = document.createElement('script')
        tag.src = 'https://www.youtube.com/iframe_api'
        const firstScriptTag = document.getElementsByTagName('script')[0]
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
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
    }, [isYouTube, youtubeId, onLoadedMetadata, onTimeUpdate, onPlay, onPause, onEnded])

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
        } else {
          const video = videoRef.current
          if (video) {
            video.play()
            onPlay?.()
          }
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

    // If no video URL is provided, show "Video not found" message
    if (!videoUrl || videoUrl.trim() === '') {
      return (
        <div className="w-full h-full flex items-center justify-center bg-black">
          <div className="text-center text-white">
            <div className="text-xl font-medium mb-2">Video not found</div>
            <div className="text-sm text-white/70">This video is not available</div>
          </div>
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
        playsInline
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={onEnded}
        onPlay={onPlay}
        onPause={onPause}
      />
    )
  }
)

VideoEngine.displayName = "VideoEngine"