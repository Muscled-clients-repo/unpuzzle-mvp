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
    if ((e.target as HTMLElement).classList.contains('ruler-container') || 
        (e.target as HTMLElement).classList.contains('ruler-corner')) {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left - 70 // Adjust for track labels
      
      // If clicking in the corner area (x < 0), treat it as clicking at position 0
      const clickPosition = Math.max(0, x)
      const frame = Math.round((clickPosition / pixelsPerSecond) * 30) // Assuming 30 FPS
      onRulerClick(frame)
    }
  }
  
  return (
    <div 
      className="h-8 bg-gray-900 border-b border-gray-800 relative sticky top-0 z-[15] cursor-pointer ruler-container"
      onMouseDown={onRulerMouseDown}
      onClick={handleClick}
    >
      {/* Corner area - clickable to jump to 0:00 */}
      <div 
        className="absolute left-0 top-0 w-[70px] h-full bg-gray-900 border-r border-gray-800 cursor-pointer ruler-corner"
        style={{ zIndex: 1 }}
      />
      
      {/* Time markers */}
      {Array.from({ length: Math.floor(visibleTimelineSeconds / interval) + 1 }, (_, i) => i * interval).map(seconds => (
        <div key={seconds} className="absolute pointer-events-none" style={{ left: seconds * pixelsPerSecond + 70 }}>
          <div className="h-1.5 w-px bg-gray-600" />
          <span 
            className="absolute top-1.5 left-0 text-[10px] text-gray-400 transform -translate-x-1/2" 
            style={{ 
              minWidth: '35px',
              // Adjust the first marker (0:00) to not be cut off
              ...(seconds === 0 ? { transform: 'translateX(0)', left: '2px' } : {})
            }}
          >
            {formatTime(seconds)}
          </span>
        </div>
      ))}
    </div>
  )
}