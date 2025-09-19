'use client'

import { useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Pause, Download } from 'lucide-react'
import { useReflectionPlaybackStore } from '@/stores/reflection-playback-store'
import { useSignedUrl } from '@/hooks/use-signed-url'

interface SimpleVoiceMemoPlayerProps {
  messageId: string
  fileUrl: string
  duration?: number
}

export function SimpleVoiceMemoPlayer({
  messageId,
  fileUrl,
  duration: propDuration
}: SimpleVoiceMemoPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)

  // Use the same signed URL hook as video player
  const signedUrl = useSignedUrl(fileUrl, 30) // 30 minutes refresh before expiry

  // Debug signed URL state
  useEffect(() => {
    console.log('[VoiceMemoPlayer] SignedURL state changed:', {
      url: signedUrl.url ? 'SET' : 'NULL',
      isLoading: signedUrl.isLoading,
      error: signedUrl.error,
      originalFileUrl: fileUrl
    })

    // Test audio format support
    if (audioRef.current) {
      const audio = audioRef.current
      console.log('[VoiceMemoPlayer] Audio format support:', {
        'audio/webm': audio.canPlayType('audio/webm'),
        'audio/webm;codecs=opus': audio.canPlayType('audio/webm;codecs=opus'),
        'audio/ogg': audio.canPlayType('audio/ogg'),
        'audio/mp4': audio.canPlayType('audio/mp4'),
        'audio/mpeg': audio.canPlayType('audio/mpeg')
      })
    }
  }, [signedUrl.url, signedUrl.isLoading, signedUrl.error, fileUrl])

  const {
    currentlyPlaying,
    isPlaying,
    startPlayback,
    stopPlayback
  } = useReflectionPlaybackStore()

  const isThisPlaying = currentlyPlaying === messageId && isPlaying

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

      console.log('[VoiceMemoPlayer] Playing audio with URL:', signedUrl.url)
      console.log('[VoiceMemoPlayer] Original fileUrl:', fileUrl)

      // Start playback
      if (audioRef.current) {
        audioRef.current.src = signedUrl.url
        try {
          await audioRef.current.play()
          startPlayback(messageId)
        } catch (error) {
          console.error('Failed to play audio:', error)
          console.error('Audio src:', audioRef.current.src)
          console.error('Audio readyState:', audioRef.current.readyState)
          console.error('Audio networkState:', audioRef.current.networkState)
        }
      }
    }
  }

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleEnded = () => {
      stopPlayback()
    }

    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('ended', handleEnded)
    }
  }, [stopPlayback])

  // Stop playback when component unmounts
  useEffect(() => {
    return () => {
      if (currentlyPlaying === messageId) {
        stopPlayback()
      }
    }
  }, [currentlyPlaying, messageId, stopPlayback])

  if (!fileUrl) return null

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-5 w-5 p-0 ml-2"
      onClick={handlePlayPause}
      disabled={signedUrl.isLoading || !signedUrl.url}
      title={
        signedUrl.isLoading ? 'Loading audio...' :
        signedUrl.error ? `Error: ${signedUrl.error}` :
        isThisPlaying ? 'Pause voice memo' : 'Play voice memo'
      }
    >
      {signedUrl.isLoading ? (
        <div className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
      ) : isThisPlaying ? (
        <Pause className="h-3 w-3" />
      ) : (
        <Play className="h-3 w-3" />
      )}
      <audio
        ref={audioRef}
        className="hidden"
        preload="metadata"
      />
    </Button>
  )
}