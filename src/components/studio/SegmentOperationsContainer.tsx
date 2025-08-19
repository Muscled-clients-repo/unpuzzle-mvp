'use client'

// NEW: Container for segment operations with keyboard shortcuts (3c plan)
import { useEffect } from 'react'
import { useVideoEditor } from '@/lib/video-editor'

export function SegmentOperationsContainer() {
  const { commands } = useVideoEditor()
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Delete key - delete selected segment
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        commands.deleteSelectedSegment()
      }
      
      // Cmd+K or Ctrl+K - split segment at playhead
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        commands.splitSegmentAtPlayhead()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [commands])
  
  // Pure component - no visual output, just keyboard handling
  return null
}