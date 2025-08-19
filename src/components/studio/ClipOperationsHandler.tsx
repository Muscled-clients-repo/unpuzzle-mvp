'use client'

// Keyboard shortcut handler for clip operations
// Following bulletproof architecture - only handles keyboard input

import { useEffect } from 'react'
import { useVideoEditor } from '@/lib/video-editor'

export function ClipOperationsHandler() {
  const { commands, queries } = useVideoEditor()
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when not in input fields
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement) {
        return
      }
      
      // Cmd+K / Ctrl+K - Split at playhead
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        console.log('⌨️ Keyboard: Cmd+K pressed, executing split')
        const selectedClipId = queries.getSelectedClipId()
        console.log('⌨️ Keyboard: Current selectedClipId:', selectedClipId)
        commands.execute('CLIP.SPLIT')
        return
      }
      
      // Delete key - Delete selected clip
      if (event.key === 'Delete' || event.key === 'Backspace') {
        const selectedClipId = queries.getSelectedClipId()
        if (selectedClipId) {
          event.preventDefault()
          commands.execute('CLIP.DELETE')
        }
        return
      }
      
      // Escape - Deselect clip
      if (event.key === 'Escape') {
        const selectedClipId = queries.getSelectedClipId()
        if (selectedClipId) {
          commands.execute('CLIP.DESELECT')
        }
        return
      }
      
      // Arrow Keys - Frame navigation
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        const currentTime = queries.getCurrentTime()
        const frameRate = 30 // 30fps
        const frameTime = 1 / frameRate // ~0.033 seconds per frame
        const newTime = Math.max(0, currentTime - frameTime)
        console.log('⬅️ Frame backward:', { from: currentTime, to: newTime })
        commands.seek(newTime)
        return
      }
      
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        const currentTime = queries.getCurrentTime()
        const totalDuration = queries.getTotalDuration()
        const frameRate = 30 // 30fps  
        const frameTime = 1 / frameRate // ~0.033 seconds per frame
        const newTime = Math.min(totalDuration, currentTime + frameTime)
        console.log('➡️ Frame forward:', { from: currentTime, to: newTime })
        commands.seek(newTime)
        return
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [commands, queries])
  
  return null // No UI, just keyboard handling
}