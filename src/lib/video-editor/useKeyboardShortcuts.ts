import { useEffect } from 'react'
import { Clip } from './types'

interface UseKeyboardShortcutsProps {
  // Playback controls
  isPlaying: boolean
  play: () => void
  pause: () => void
  
  // Frame navigation
  currentFrame?: number
  seekToFrame?: (frame: number) => void
  
  // Clip operations
  clips?: Clip[]
  selectedClipId?: string | null
  splitClip?: (clipId: string, splitFrame: number) => void
  trimClipLeft?: (clipId: string, currentFrame: number) => void
  trimClipRight?: (clipId: string, currentFrame: number) => void
  deleteClip?: (clipId: string) => void
  
  // History controls
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
}

/**
 * Consolidated keyboard shortcuts hook for the video editor
 * Handles all keyboard interactions including playback, editing, and history
 */
export function useKeyboardShortcuts({
  // Required props
  isPlaying,
  play,
  pause,
  undo,
  redo,
  canUndo,
  canRedo,
  
  // Optional timeline-specific props
  currentFrame,
  seekToFrame,
  clips = [],
  selectedClipId,
  splitClip,
  trimClipLeft,
  trimClipRight,
  deleteClip,
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent shortcuts when typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      
      // ===============================
      // History Controls (Undo/Redo)
      // ===============================
      
      // Cmd/Ctrl + Z = Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (canUndo()) {
          undo()
        }
        return
      }
      
      // Cmd/Ctrl + Shift + Z = Redo
      // Or Cmd/Ctrl + Y = Redo (Windows style)
      if (((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') ||
          ((e.metaKey || e.ctrlKey) && e.key === 'y')) {
        e.preventDefault()
        if (canRedo()) {
          redo()
        }
        return
      }
      
      // ===============================
      // Playback Controls
      // ===============================
      
      // Spacebar = Play/Pause
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault() // Prevent page scroll
        if (isPlaying) {
          pause()
        } else {
          play()
        }
        return
      }
      
      // ===============================
      // Timeline-Specific Shortcuts
      // ===============================
      
      // Only process timeline shortcuts if timeline data is available
      if (!clips || !currentFrame === undefined) {
        return
      }
      
      // Helper function to find the topmost clip at playhead position
      const getTopmostClipAtPlayhead = () => {
        const clipsAtPlayhead = clips.filter(clip => 
          currentFrame >= clip.startFrame && 
          currentFrame < clip.startFrame + clip.durationFrames
        )
        
        // Return clip with lowest track index (topmost visually)
        return clipsAtPlayhead.reduce((topClip, currentClip) => {
          if (!topClip || currentClip.trackIndex < topClip.trackIndex) {
            return currentClip
          }
          return topClip
        }, null as Clip | null)
      }
      
      // W key for split/trim at playhead
      if ((e.key === 'w' || e.key === 'W') && splitClip) {
        e.preventDefault()
        const clipAtPlayhead = getTopmostClipAtPlayhead()
        
        if (clipAtPlayhead) {
          console.log('Splitting clip:', clipAtPlayhead.id, 'at frame:', currentFrame)
          splitClip(clipAtPlayhead.id, currentFrame)
        }
        return
      }
      
      // Q key for trim left side of clip at playhead (remove everything before current frame)
      if ((e.key === 'q' || e.key === 'Q') && trimClipLeft) {
        e.preventDefault()
        const clipAtPlayhead = getTopmostClipAtPlayhead()
        
        if (clipAtPlayhead) {
          trimClipLeft(clipAtPlayhead.id, currentFrame)
        }
        return
      }
      
      // E key for trim right side of clip at playhead (remove everything after current frame)
      if ((e.key === 'e' || e.key === 'E') && trimClipRight) {
        e.preventDefault()
        const clipAtPlayhead = getTopmostClipAtPlayhead()
        
        if (clipAtPlayhead) {
          trimClipRight(clipAtPlayhead.id, currentFrame)
        }
        return
      }
      
      // Delete key for deleting selected clip
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedClipId && deleteClip) {
        e.preventDefault()
        deleteClip(selectedClipId)
        return
      }
      
      // ===============================
      // Frame Navigation
      // ===============================
      
      if (!seekToFrame) {
        return
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
        return
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
        return
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    isPlaying,
    play,
    pause,
    currentFrame,
    clips,
    splitClip,
    trimClipLeft,
    trimClipRight,
    seekToFrame,
    selectedClipId,
    deleteClip,
    undo,
    redo,
    canUndo,
    canRedo
  ])
}

/**
 * Keyboard Shortcuts Reference:
 * 
 * PLAYBACK:
 * - Space: Play/Pause
 * 
 * HISTORY:
 * - Cmd/Ctrl + Z: Undo
 * - Cmd/Ctrl + Shift + Z: Redo
 * - Cmd/Ctrl + Y: Redo (Windows style)
 * 
 * TIMELINE EDITING:
 * - W: Split clip at playhead
 * - Q: Trim left (remove before playhead)
 * - E: Trim right (remove after playhead)
 * - Delete/Backspace: Delete selected clip
 * 
 * NAVIGATION:
 * - Left Arrow: Previous frame
 * - Right Arrow: Next frame
 * - Shift + Left: Jump 10 frames back
 * - Shift + Right: Jump 10 frames forward
 */