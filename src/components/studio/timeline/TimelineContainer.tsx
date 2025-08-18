'use client'

// Following Principle 5: Pure Component Pattern
// Container component that orchestrates pure components

import { useVideoEditor } from '@/lib/video-editor'
import { TimelineNew } from '../timeline-new/TimelineNew'
import { useEffect, useReducer } from 'react'
import type { TimelineClip, Track } from '@/lib/video-editor/state-machine/VideoEditorMachineV5'

// Local state for UI updates only - business state comes from queries
interface TimelineUIState {
  clips: TimelineClip[]
  tracks: Track[]
  scrubberPosition: number
  totalDuration: number
  isDraggingScrubber: boolean
}

// Reducer to batch updates efficiently
function timelineReducer(_state: TimelineUIState, newState: TimelineUIState): TimelineUIState {
  return newState
}

export function TimelineContainer() {
  const { queries, commands } = useVideoEditor()
  
  // Use reducer for efficient batch updates
  const [uiState, updateUIState] = useReducer(timelineReducer, {
    clips: [],
    tracks: [],
    scrubberPosition: 0,
    totalDuration: 0,
    isDraggingScrubber: false
  })
  
  // Poll for state updates - this is temporary until we have proper subscriptions
  useEffect(() => {
    const updateState = () => {
      updateUIState({
        clips: queries.getTimelineClips(),
        tracks: queries.getTimelineTracks(),
        scrubberPosition: queries.getScrubberPosition(),
        totalDuration: queries.getTotalDuration(),
        isDraggingScrubber: queries.isDraggingScrubber()
      })
    }
    
    // Initial update
    updateState()
    
    // Poll for updates
    const interval = setInterval(updateState, 100)
    
    return () => clearInterval(interval)
  }, [queries])
  
  const handleScrubberClick = (position: number) => {
    commands.execute('SCRUBBER.CLICK', { position })
  }
  
  const handleScrubberDragStart = () => {
    commands.execute('SCRUBBER.START_DRAG', {})
  }
  
  const handleScrubberDrag = (position: number) => {
    commands.execute('SCRUBBER.DRAG', { position })
  }
  
  const handleScrubberDragEnd = () => {
    commands.execute('SCRUBBER.END_DRAG', {})
  }
  
  const handleClipSelect = (clipId: string) => {
    commands.execute('TIMELINE.CLIP_SELECTED', { clipId })
  }
  
  return (
    <div className="h-full flex flex-col bg-gray-900">
      <div className="h-8 bg-gray-800 border-b border-gray-700 flex items-center px-2">
        <span className="text-xs text-gray-400">Timeline ({uiState.clips.length} clips, {uiState.tracks.length} tracks)</span>
      </div>
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        {uiState.tracks.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            <div className="text-center">
              <p>Loading timeline...</p>
            </div>
          </div>
        ) : (
          <TimelineNew
            clips={uiState.clips}
            tracks={uiState.tracks}
            scrubberPosition={uiState.scrubberPosition}
            totalDuration={uiState.totalDuration}
            isDraggingScrubber={uiState.isDraggingScrubber}
            onScrubberClick={handleScrubberClick}
            onScrubberDragStart={handleScrubberDragStart}
            onScrubberDrag={handleScrubberDrag}
            onScrubberDragEnd={handleScrubberDragEnd}
            onClipSelect={handleClipSelect}
          />
        )}
      </div>
    </div>
  )
}