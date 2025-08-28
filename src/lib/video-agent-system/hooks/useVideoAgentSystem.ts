import { useState, useEffect, useCallback } from 'react'
import { VideoAgentStateMachine } from '../core/StateMachine'
import { SystemContext, SystemState, Action } from '../types/states'
import { VideoRef } from '../core/VideoController'

let globalStateMachine: VideoAgentStateMachine | null = null

export function useVideoAgentSystem() {
  const [context, setContext] = useState<SystemContext | null>(null)
  
  useEffect(() => {
    // Create singleton state machine
    if (!globalStateMachine) {
      globalStateMachine = new VideoAgentStateMachine()
    }
    
    // Subscribe to updates
    const unsubscribe = globalStateMachine.subscribe(setContext)
    
    // Get initial state
    setContext(globalStateMachine.getContext())
    
    return () => {
      unsubscribe()
    }
  }, [])
  
  const dispatch = useCallback((action: Action) => {
    globalStateMachine?.dispatch(action)
  }, [])
  
  const setVideoRef = useCallback((ref: VideoRef, videoId?: string, courseId?: string) => {
    globalStateMachine?.setVideoRef(ref, videoId, courseId)
  }, [])
  
  return {
    context: context || {
      state: SystemState.VIDEO_PAUSED,
      videoState: { isPlaying: false, currentTime: 0, duration: 0 },
      agentState: { currentUnactivatedId: null, currentSystemMessageId: null, activeType: null },
      segmentState: { inPoint: null, outPoint: null, isComplete: false, sentToChat: false },
      recordingState: { isRecording: false, isPaused: false },
      messages: [],
      errors: []
    },
    dispatch,
    setVideoRef
  }
}