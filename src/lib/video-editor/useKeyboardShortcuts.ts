import { useEffect } from 'react'

interface KeyboardShortcutsProps {
  undo: () => void
  redo: () => void
  play: () => void
  pause: () => void
  isPlaying: boolean
  canUndo: () => boolean
  canRedo: () => boolean
}

export function useKeyboardShortcuts({
  undo,
  redo,
  play,
  pause,
  isPlaying,
  canUndo,
  canRedo
}: KeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent shortcuts when typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      
      // Cmd/Ctrl + Z = Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (canUndo()) {
          undo()
        }
      }
      
      // Cmd/Ctrl + Shift + Z = Redo
      // Or Cmd/Ctrl + Y = Redo (Windows style)
      if (((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') ||
          ((e.metaKey || e.ctrlKey) && e.key === 'y')) {
        e.preventDefault()
        if (canRedo()) {
          redo()
        }
      }
      
      // Spacebar = Play/Pause
      if (e.key === ' ' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
        e.preventDefault()
        if (isPlaying) {
          pause()
        } else {
          play()
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, play, pause, isPlaying, canUndo, canRedo])
}