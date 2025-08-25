'use client'

import { FPS } from '@/lib/video-editor/types'

interface TimelineScrubberProps {
  currentFrame: number
  pixelsPerSecond: number
  totalSeconds: number
}

export function TimelineScrubber({ 
  currentFrame, 
  pixelsPerSecond,
  totalSeconds 
}: TimelineScrubberProps) {
  const scrubberX = (currentFrame / FPS) * pixelsPerSecond
  const maxX = totalSeconds * pixelsPerSecond
  const clampedX = Math.min(scrubberX, maxX)
  
  return (
    <>
      {/* Scrubber line */}
      <div 
        className="absolute top-0 bottom-0 w-px bg-red-500 pointer-events-none z-30"
        style={{ left: clampedX + 70 }}
      >
        {/* Scrubber handle */}
        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-0 h-0 
          border-l-[6px] border-l-transparent
          border-r-[6px] border-r-transparent
          border-t-[8px] border-t-red-500" 
        />
      </div>
    </>
  )
}