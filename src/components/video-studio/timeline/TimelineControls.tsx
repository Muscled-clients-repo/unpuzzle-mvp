'use client'

import { Minus, Plus, Layers, Film, Music } from 'lucide-react'

interface TimelineControlsProps {
  zoomLevel: number
  minZoom: number
  maxZoom: number
  onZoomChange: (zoom: number) => void
  clipCount: number
  trackCount?: number
  onAddTrack?: (type: 'video' | 'audio', position?: 'above' | 'between' | 'below') => void
}

export function TimelineControls({ 
  zoomLevel, 
  minZoom, 
  maxZoom, 
  onZoomChange,
  clipCount,
  trackCount = 2,
  onAddTrack
}: TimelineControlsProps) {
  const handleZoomIn = () => {
    onZoomChange(Math.min(maxZoom, zoomLevel + 0.1))
  }
  
  const handleZoomOut = () => {
    onZoomChange(Math.max(minZoom, zoomLevel - 0.1))
  }
  
  const zoomPercentage = ((zoomLevel * 100 - minZoom * 100) / (maxZoom * 100 - minZoom * 100)) * 100
  
  return (
    <div className="h-8 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-2">
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400">Timeline ({clipCount} clips)</span>
        <div className="flex items-center gap-1">
          <Layers className="h-3 w-3 text-gray-400" />
          <span className="text-xs text-gray-400">{trackCount} tracks</span>
          {onAddTrack && (
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={() => onAddTrack('video')}
                className="text-gray-400 hover:text-white p-0.5 rounded hover:bg-gray-700 flex items-center gap-1"
                title="Add video track"
              >
                <Plus className="h-3 w-3" />
                <Film className="h-3 w-3" />
              </button>
              <button
                onClick={() => onAddTrack('audio')}
                className="text-gray-400 hover:text-white p-0.5 rounded hover:bg-gray-700 flex items-center gap-1"
                title="Add audio track"
              >
                <Plus className="h-3 w-3" />
                <Music className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={handleZoomOut}
          className="text-gray-400 hover:text-white p-0.5"
          disabled={zoomLevel <= minZoom}
        >
          <Minus className="h-3 w-3" />
        </button>
        <input 
          type="range"
          min={minZoom * 100}
          max={maxZoom * 100}
          value={zoomLevel * 100}
          onChange={(e) => onZoomChange(parseInt(e.target.value) / 100)}
          className="w-24 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          style={{
            background: `linear-gradient(to right, #ffffff 0%, #ffffff ${zoomPercentage}%, #374151 ${zoomPercentage}%, #374151 100%)`
          }}
        />
        <button 
          onClick={handleZoomIn}
          className="text-gray-400 hover:text-white p-0.5"
          disabled={zoomLevel >= maxZoom}
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}