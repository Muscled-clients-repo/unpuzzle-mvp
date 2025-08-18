'use client'

// ARCHITECTURE: Following Principle 5 - Pure Component Pattern (lines 30-33)
// React components only render, never manage state
// Implementation from lines 849-908 of BULLETPROOF-VIDEO-EDITOR-ARCHITECTURE.md

import { useVideoEditor } from '@/lib/video-editor'
import { Button } from '@/components/ui/button'
import { Square, Circle } from 'lucide-react'
import { useEffect, useReducer } from 'react'

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// PURE COMPONENT - Only receives props, no state management
interface RecordingControlsProps {
  isRecording: boolean
  duration: number
  canStartRecording: boolean
  canStopRecording: boolean
  onStartRecording: (mode: string) => void
  onStopRecording: () => void
}

export function RecordingControls({
  isRecording,
  duration,
  canStartRecording,
  canStopRecording,
  onStartRecording,
  onStopRecording
}: RecordingControlsProps) {
  return (
    <div className="flex items-center gap-2">
      {isRecording ? (
        <>
          <div className="flex items-center gap-2 px-3 py-1 bg-red-600/20 rounded-lg">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-red-400">
              Recording: {formatDuration(duration)}
            </span>
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={onStopRecording}
            disabled={!canStopRecording}
            className="gap-2"
          >
            <Square className="h-3 w-3" />
            Stop Recording
          </Button>
        </>
      ) : (
        <Button
          size="sm"
          onClick={() => onStartRecording('screen')}
          disabled={!canStartRecording}
          className="gap-2 bg-red-600 hover:bg-red-700"
        >
          <Circle className="h-3 w-3" />
          Start Recording
        </Button>
      )}
    </div>
  )
}

// UI State for recording controls
interface RecordingUIState {
  duration: number
  isRecording: boolean
  canStart: boolean
  canStop: boolean
}

// Reducer for batch updates
function recordingReducer(_state: RecordingUIState, newState: RecordingUIState): RecordingUIState {
  return newState
}

// Container component that connects to services
export function RecordingControlsContainer() {
  const { commands, queries } = useVideoEditor()
  
  // Use reducer for efficient batch updates
  const [uiState, updateUIState] = useReducer(recordingReducer, {
    duration: 0,
    isRecording: false,
    canStart: false,
    canStop: false
  })

  // Poll for recording state (temporary until we have reactive state)
  useEffect(() => {
    const updateState = () => {
      const recording = queries.isRecording()
      const startAllowed = queries.canExecuteCommand('RECORDING.START')
      const stopAllowed = queries.canExecuteCommand('RECORDING.STOP')
      
      updateUIState({
        isRecording: recording,
        canStart: startAllowed,
        canStop: stopAllowed,
        duration: recording ? queries.getRecordingDuration() : 0
      })
    }
    
    // Initial update
    updateState()
    
    // Poll for updates
    const interval = setInterval(updateState, 100)

    return () => clearInterval(interval)
  }, [queries])

  const handleStartRecording = async (mode: string) => {
    try {
      await commands.startRecording(mode as 'screen' | 'camera' | 'audio')
    } catch (error) {
      console.error('Failed to start recording:', error)
    }
  }

  const handleStopRecording = async () => {
    try {
      const result = await commands.stopRecording()
      console.log('Recording stopped, duration:', result.duration)
    } catch (error) {
      console.error('Failed to stop recording:', error)
    }
  }
  
  return (
    <RecordingControls
      isRecording={uiState.isRecording}
      duration={uiState.duration}
      canStartRecording={uiState.canStart}
      canStopRecording={uiState.canStop}
      onStartRecording={handleStartRecording}
      onStopRecording={handleStopRecording}
    />
  )
}