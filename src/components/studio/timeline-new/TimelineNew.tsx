'use client'

// PURE COMPONENT - No state management, only rendering

interface Clip {
  id: string
  trackId: string
  startTime: number
  duration: number
  label: string
  isSelected?: boolean
}

interface Track {
  id: string
  type: 'video' | 'audio'
  index: number
  height: number
}

interface TimelineProps {
  clips: Clip[]
  tracks: Track[]
  scrubberPosition: number
  totalDuration: number
  isDraggingScrubber: boolean
  onScrubberClick: (position: number) => void
  onScrubberDragStart: () => void
  onScrubberDrag: (position: number) => void
  onScrubberDragEnd: () => void
  onClipSelect: (clipId: string) => void
}

export function TimelineNew({
  clips,
  tracks,
  scrubberPosition,
  totalDuration,
  isDraggingScrubber,
  onScrubberClick,
  onScrubberDragStart,
  onScrubberDrag,
  onScrubberDragEnd,
  onClipSelect
}: TimelineProps) {
  const pixelsPerSecond = 100 // Increased for better visibility
  const timelineWidth = Math.max((totalDuration + 10) * pixelsPerSecond, 2000)
  const trackLabelWidth = 120
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const frames = Math.floor((seconds % 1) * 30) // Assuming 30fps
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`
  }
  
  return (
    <div className="h-full flex">
      {/* Track Labels Panel */}
      <div className="flex-shrink-0 bg-gray-950 border-r border-gray-800" style={{ width: trackLabelWidth }}>
        {/* Time ruler spacer */}
        <div className="h-10 bg-gray-900 border-b border-gray-800 flex items-center px-3">
          <span className="text-xs text-gray-500">Tracks</span>
        </div>
        
        {/* Track labels */}
        {tracks.map((track) => (
          <div
            key={track.id}
            className="border-b border-gray-800 flex items-center px-3 bg-gray-900 hover:bg-gray-850 transition-colors"
            style={{ height: track.height }}
          >
            <div className="flex items-center gap-2">
              {track.type === 'video' ? (
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              )}
              <span className="text-xs font-medium text-gray-300">
                {track.type === 'video' ? `V${track.index + 1}` : `A${track.index + 1}`}
              </span>
            </div>
          </div>
        ))}
      </div>
      
      {/* Timeline Scrollable Area */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden bg-gray-950">
        <div 
          className="relative select-none" 
          style={{ 
            width: timelineWidth,
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none'
          }}>
          {/* Time Ruler */}
          <div className="h-10 bg-gray-900 border-b border-gray-800 relative sticky top-0 z-10">
            {/* Major time marks every second */}
            {Array.from({ length: Math.ceil(totalDuration) + 10 }).map((_, i) => (
              <div key={i} className="absolute" style={{ left: i * pixelsPerSecond }}>
                <div className="h-2 w-px bg-gray-600" />
                <span className="absolute top-2 left-0 text-xs text-gray-400 transform -translate-x-1/2">
                  {formatTime(i)}
                </span>
                
                {/* Minor marks every 0.1 second */}
                {Array.from({ length: 10 }).map((_, j) => (
                  j !== 0 && (
                    <div
                      key={j}
                      className="absolute h-1 w-px bg-gray-700"
                      style={{ left: j * (pixelsPerSecond / 10) }}
                    />
                  )
                ))}
              </div>
            ))}
          </div>
          
          {/* Tracks */}
          {tracks.map((track) => (
            <div
              key={track.id}
              className="relative border-b border-gray-800 bg-gray-900"
              style={{ height: track.height }}
            >
              {/* Track background pattern */}
              <div className="absolute inset-0 opacity-5">
                {Array.from({ length: Math.ceil(timelineWidth / 50) }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 w-px bg-gray-500"
                    style={{ left: i * 50 }}
                  />
                ))}
              </div>
              
              {/* Render clips for this track */}
              {clips
                .filter(clip => clip.trackId === track.id)
                .map(clip => (
                  <div
                    key={clip.id}
                    className={`absolute rounded-md cursor-pointer transition-all transform hover:scale-y-105 overflow-hidden ${
                      clip.isSelected 
                        ? 'ring-2 ring-yellow-400 shadow-lg z-20' 
                        : 'hover:ring-1 hover:ring-blue-400'
                    }`}
                    style={{
                      left: clip.startTime * pixelsPerSecond,
                      width: clip.duration * pixelsPerSecond,
                      top: 4,
                      bottom: 4,
                      zIndex: 10  // Ensure clips are above timeline click area
                    }}
                    onClick={(e) => {
                      e.stopPropagation()  // Prevent scrubber movement
                      onClipSelect(clip.id)
                    }}
                  >
                    {/* Thumbnail background */}
                    <div 
                      className="absolute inset-0 opacity-40"
                      style={{
                        background: track.type === 'video' 
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : 'linear-gradient(135deg, #667eea 0%, #48bb78 100%)'
                      }}
                    />
                    
                    {/* Video thumbnail background - full coverage */}
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-blue-600/20" />
                    
                    {/* Content overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    
                    <div className="relative h-full flex flex-col justify-between p-2 z-10">
                      <div>
                        <div className="text-xs font-medium text-white truncate drop-shadow-md">
                          {clip.label}
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <div className="text-xs text-white font-mono drop-shadow-md">
                          {clip.duration.toFixed(2)}s
                        </div>
                      </div>
                    </div>
                    
                    {/* Resize handles */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/20 hover:bg-white/40 cursor-ew-resize rounded-l-md z-20" />
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/20 hover:bg-white/40 cursor-ew-resize rounded-r-md z-20" />
                  </div>
                ))}
            </div>
          ))}
          
          {/* Clickable timeline area for scrubber - only on empty areas */}
          <div
            className="absolute top-0 left-0 right-0 bottom-0 cursor-pointer z-5"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const x = e.clientX - rect.left
              const position = x / pixelsPerSecond
              onScrubberClick(Math.max(0, Math.min(position, totalDuration)))
            }}
          />
          
          {/* Playhead/Scrubber */}
          <div
            className="absolute top-0 w-0.5 bg-red-500 z-30"
            style={{ 
              left: scrubberPosition * pixelsPerSecond,
              height: '100%',
              cursor: 'ew-resize'
            }}
            onMouseDown={(e) => {
              e.stopPropagation()
              e.preventDefault() // Prevent text selection
              onScrubberDragStart()
              
              // Disable text selection during drag
              document.body.style.userSelect = 'none'
              document.body.style.webkitUserSelect = 'none'
              
              // Get the timeline container element (the scrollable area)
              const timelineContainer = e.currentTarget.parentElement as HTMLElement
              const rect = timelineContainer.getBoundingClientRect()
              
              const handleMouseMove = (moveEvent: MouseEvent) => {
                moveEvent.preventDefault() // Prevent selection during drag
                const x = moveEvent.clientX - rect.left + timelineContainer.parentElement!.scrollLeft
                const position = x / pixelsPerSecond
                onScrubberDrag(Math.max(0, Math.min(position, totalDuration)))
              }
              
              const handleMouseUp = () => {
                onScrubberDragEnd()
                // Re-enable text selection
                document.body.style.userSelect = ''
                document.body.style.webkitUserSelect = ''
                document.removeEventListener('mousemove', handleMouseMove)
                document.removeEventListener('mouseup', handleMouseUp)
              }
              
              document.addEventListener('mousemove', handleMouseMove)
              document.addEventListener('mouseup', handleMouseUp)
            }}
          >
            {/* Scrubber head - now interactive */}
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 pointer-events-none">
              <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-red-500" />
            </div>
            {/* Vertical line with glow effect */}
            <div className="w-full h-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  )
}