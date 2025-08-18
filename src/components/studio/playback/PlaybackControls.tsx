'use client'

// ARCHITECTURE: Following Principle 5 - Pure Component Pattern
// Pure component for playback controls, container handles state

import { Button } from '@/components/ui/button'
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react'
import { useVideoEditor } from '@/lib/video-editor'
import { useEffect, useReducer } from 'react'

// Pure component - only renders UI
interface PlaybackControlsProps {
  isPlaying: boolean
  currentTime: number
  duration: number
  hasVideo: boolean
  onPlayPause: () => void
  onSeekBackward: () => void
  onSeekForward: () => void
}

function formatTime(time: number): string {
  const minutes = Math.floor(time / 60)
  const seconds = Math.floor(time % 60)
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export function PlaybackControlsPure({
  isPlaying,
  currentTime,
  duration,
  hasVideo,
  onPlayPause,
  onSeekBackward,
  onSeekForward
}: PlaybackControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <Button 
          size="sm" 
          variant="ghost" 
          className="h-8 w-8 p-0"
          onClick={onSeekBackward}
          disabled={!hasVideo}
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button 
          size="sm" 
          variant="ghost" 
          className="h-8 w-8 p-0"
          onClick={onPlayPause}
          disabled={!hasVideo}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        <Button 
          size="sm" 
          variant="ghost" 
          className="h-8 w-8 p-0"
          onClick={onSeekForward}
          disabled={!hasVideo}
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>
      <div className="ml-4 text-xs text-gray-400 font-mono tabular-nums">
        <span>{formatTime(currentTime)}</span>
        <span className="mx-2">/</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  )
}

// UI State for playback controls
interface PlaybackUIState {
  isPlaying: boolean
  currentTime: number
  duration: number
  hasVideo: boolean
}

// Reducer for batch updates
function playbackReducer(_state: PlaybackUIState, newState: PlaybackUIState): PlaybackUIState {
  return newState
}

// Container component - connects to state machine
export function PlaybackControls() {
  const { commands, queries } = useVideoEditor()
  
  // Use reducer for efficient batch updates
  const [uiState, updateUIState] = useReducer(playbackReducer, {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    hasVideo: false
  })

  // Poll for state updates
  useEffect(() => {
    const updateState = () => {
      const segments = queries.getSegments()
      const clips = queries.getTimelineClips()
      const duration = queries.getDuration()
      
      updateUIState({
        isPlaying: queries.isPlaying(),
        currentTime: queries.getCurrentTime(),
        duration: duration,
        hasVideo: segments.length > 0 || clips.length > 0 || duration > 0
      })
    }
    
    // Initial update
    updateState()
    
    // Poll for updates
    const interval = setInterval(updateState, 100)

    return () => clearInterval(interval)
  }, [queries])

  const handlePlayPause = () => {
    try {
      if (uiState.isPlaying) {
        commands.execute('PLAYBACK.PAUSE')
      } else {
        commands.execute('PLAYBACK.PLAY')
      }
    } catch (error) {
      console.error('Playback control error:', error)
    }
  }

  const handleSeekBackward = () => {
    const newTime = Math.max(0, uiState.currentTime - 5)
    commands.execute('PLAYBACK.SEEK', { time: newTime })
  }

  const handleSeekForward = () => {
    const newTime = Math.min(uiState.duration, uiState.currentTime + 5)
    commands.execute('PLAYBACK.SEEK', { time: newTime })
  }

  return (
    <PlaybackControlsPure
      isPlaying={uiState.isPlaying}
      currentTime={uiState.currentTime}
      duration={uiState.duration}
      hasVideo={uiState.hasVideo}
      onPlayPause={handlePlayPause}
      onSeekBackward={handleSeekBackward}
      onSeekForward={handleSeekForward}
    />
  )
}