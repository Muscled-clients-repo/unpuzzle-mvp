import { useEffect } from 'react'
import { Clip } from '@/lib/video-editor/types'

interface UseKeyboardShortcutsProps {
  isPlaying: boolean
  play: () => void
  pause: () => void
  currentFrame: number
  clips: Clip[]
  splitClip: (clipId: string, splitFrame: number) => void
  seekToFrame: (frame: number) => void
}

export function useKeyboardShortcuts({
  isPlaying,
  play,
  pause,
  currentFrame,
  clips,
  splitClip,
  seekToFrame
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Spacebar for play/pause
      if (e.code === 'Space') {
        e.preventDefault() // Prevent page scroll
        if (isPlaying) {
          pause()
        } else {
          play()
        }
      }
      
      // T key for split/trim at playhead
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault()
        const clipAtPlayhead = clips.find(clip => 
          currentFrame >= clip.startFrame && 
          currentFrame < clip.startFrame + clip.durationFrames
        )
        
        if (clipAtPlayhead) {
          splitClip(clipAtPlayhead.id, currentFrame)
        }
      }
      
      // Arrow keys for frame navigation
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (e.shiftKey) {
          // Shift + Left: 10 frames back
          seekToFrame(Math.max(0, currentFrame - 10))
        } else {
          // Left: 1 frame back
          seekToFrame(Math.max(0, currentFrame - 1))
        }
      }
      
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (e.shiftKey) {
          // Shift + Right: 10 frames forward
          seekToFrame(currentFrame + 10)
        } else {
          // Right: 1 frame forward
          seekToFrame(currentFrame + 1)
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isPlaying, play, pause, currentFrame, clips, splitClip, seekToFrame])
}