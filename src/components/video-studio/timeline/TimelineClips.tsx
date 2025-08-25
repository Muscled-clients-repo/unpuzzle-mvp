'use client'

import { useState, useRef } from 'react'
import { FPS } from '@/lib/video-editor/types'

interface Clip {
  id: string
  startFrame: number
  durationFrames: number
}

interface TimelineClipsProps {
  clips: Clip[]
  pixelsPerSecond: number
  selectedClipId: string | null
  onSelectClip: (clipId: string | null) => void
  onMoveClip?: (clipId: string, newStartFrame: number) => void
}

export function TimelineClips({ 
  clips, 
  pixelsPerSecond,
  selectedClipId,
  onSelectClip,
  onMoveClip
}: TimelineClipsProps) {
  const [draggedClipId, setDraggedClipId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState(0)
  const dragStartPosRef = useRef<{x: number, y: number} | null>(null)
  
  const handleClipPointerDown = (clip: Clip, e: React.PointerEvent) => {
    e.stopPropagation()
    
    // Record start position to detect drag vs click
    dragStartPosRef.current = { x: e.clientX, y: e.clientY }
    
    // Setup for potential dragging
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    setDragOffset(clickX)
    setDraggedClipId(clip.id)
    
    // Capture pointer for drag
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  
  const handleClipPointerUp = (clipId: string, e: React.PointerEvent) => {
    e.stopPropagation()
    
    // Check if it was a click (minimal movement) or drag
    const dragThreshold = 5 // pixels
    const startPos = dragStartPosRef.current
    const wasDrag = startPos && (
      Math.abs(e.clientX - startPos.x) > dragThreshold ||
      Math.abs(e.clientY - startPos.y) > dragThreshold
    )
    
    if (!wasDrag) {
      // It was a click - toggle selection
      onSelectClip(clipId === selectedClipId ? null : clipId)
    }
    
    // Clean up
    dragStartPosRef.current = null
    setDraggedClipId(null)
  }
  
  const handleClipPointerMove = (clipId: string, e: React.PointerEvent) => {
    if (draggedClipId === clipId && onMoveClip) {
      const rect = e.currentTarget.parentElement!.getBoundingClientRect()
      const x = e.clientX - rect.left - dragOffset - 70
      const newStartFrame = Math.round(Math.max(0, x / pixelsPerSecond) * FPS)
      onMoveClip(clipId, newStartFrame)
    }
  }
  
  return (
    <div className="relative" style={{ height: 'calc(100% - 40px)' }}>
      {/* Video Track 1 */}
      <div className="h-20 border-b border-gray-800 relative flex items-center">
        <div className="absolute left-2 text-xs text-gray-400 z-10" style={{ width: '60px' }}>
          Video 1
        </div>
        
        {/* Render clips */}
        {clips.map((clip) => {
          const isSelected = clip.id === selectedClipId
          const clipX = (clip.startFrame / FPS) * pixelsPerSecond
          const clipWidth = (clip.durationFrames / FPS) * pixelsPerSecond
          
          return (
            <div
              key={clip.id}
              className={`absolute h-16 rounded cursor-move transition-all ${
                isSelected 
                  ? 'ring-2 ring-blue-500 shadow-lg z-20' 
                  : 'hover:ring-1 hover:ring-gray-400'
              } ${draggedClipId === clip.id ? 'opacity-50' : ''}`}
              style={{
                left: clipX + 70,
                width: clipWidth,
                background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
                top: '50%',
                transform: 'translateY(-50%)'
              }}
              onPointerDown={(e) => handleClipPointerDown(clip, e)}
              onPointerUp={(e) => handleClipPointerUp(clip.id, e)}
              onPointerMove={(e) => handleClipPointerMove(clip.id, e)}
            >
              <div className="p-1 text-xs text-white truncate select-none">
                Clip {clips.indexOf(clip) + 1}
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Video Track 2 - Empty for now */}
      <div className="h-20 border-b border-gray-800 relative flex items-center">
        <div className="absolute left-2 text-xs text-gray-400 z-10" style={{ width: '60px' }}>
          Video 2
        </div>
      </div>
      
      {/* Audio Track - Empty for now */}
      <div className="h-16 border-b border-gray-800 relative flex items-center">
        <div className="absolute left-2 text-xs text-gray-400 z-10" style={{ width: '60px' }}>
          Audio
        </div>
      </div>
    </div>
  )
}