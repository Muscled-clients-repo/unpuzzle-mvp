'use client'

import { formatTime } from '../formatters'

interface TimelineRulerProps {
  pixelsPerSecond: number
  timelineWidth: number
  zoomLevel: number
  onRulerClick: (frame: number) => void
  onRulerMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void
}

export function TimelineRuler({ 
  pixelsPerSecond, 
  timelineWidth,
  zoomLevel,
  onRulerClick,
  onRulerMouseDown
}: TimelineRulerProps) {
  
  // Calculate interval between markers based on zoom level
  const getMarkerInterval = () => {
    if (zoomLevel < 0.5) return 10 // Show every 10 seconds when zoomed out a lot
    if (zoomLevel < 0.75) return 5 // Show every 5 seconds when moderately zoomed out
    if (zoomLevel < 1) return 2 // Show every 2 seconds when slightly zoomed out
    return 1 // Default 1 second
  }
  
  const interval = getMarkerInterval()
  const visibleTimelineSeconds = Math.ceil(timelineWidth / pixelsPerSecond)
  
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).classList.contains('ruler-container')) {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left - 70 // Adjust for track labels
      if (x >= 0) {
        const frame = Math.round((x / pixelsPerSecond) * 30) // Assuming 30 FPS
        onRulerClick(frame)
      }
    }
  }
  
  return (
    <div 
      className="h-10 bg-gray-900 border-b border-gray-800 relative sticky top-0 z-10 cursor-pointer ruler-container"
      onMouseDown={onRulerMouseDown}
      onClick={handleClick}
    >
      {/* Time markers */}
      {Array.from({ length: Math.floor(visibleTimelineSeconds / interval) + 1 }, (_, i) => i * interval).map(seconds => (
        <div key={seconds} className="absolute pointer-events-none" style={{ left: seconds * pixelsPerSecond + 70 }}>
          <div className="h-2 w-px bg-gray-600" />
          <span className="absolute top-2 left-0 text-xs text-gray-400 transform -translate-x-1/2" style={{ minWidth: '40px' }}>
            {formatTime(seconds)}
          </span>
        </div>
      ))}
    </div>
  )
}