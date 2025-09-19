import { useState, useEffect, useCallback } from 'react'
import { VideoAgentStateMachine } from '../core/StateMachine'
import { SystemContext, SystemState, Action } from '../types/states'
import { VideoRef, VideoRefLike } from '../core/VideoController'
import { discoveryLogger } from '@/utils/discovery-logger'
import { isFeatureEnabled } from '@/utils/feature-flags'
import { getGlobalCompatibilityInstance, StateMachineManager } from '../core/ManagedStateMachine'

let globalStateMachine: VideoAgentStateMachine | null = null

interface UseVideoAgentSystemOptions {
  reflectionMutation?: (data: any) => Promise<any>
}

export function useVideoAgentSystem(options?: UseVideoAgentSystemOptions) {
  const [context, setContext] = useState<SystemContext | null>(null)
  
  useEffect(() => {
    // Use managed instance if feature flag is enabled
    if (isFeatureEnabled('USE_INSTANCE_STATE_MACHINE')) {
      console.log('🔄 Using managed state machine instance')
      globalStateMachine = getGlobalCompatibilityInstance()
      discoveryLogger.logSingletonAccess('ManagedStateMachine', globalStateMachine)
    } else {
      // Original implementation: Create singleton state machine
      discoveryLogger.logSingletonAccess('VideoAgentStateMachine', globalStateMachine)
      if (!globalStateMachine) {
        globalStateMachine = new VideoAgentStateMachine()
        discoveryLogger.logSingletonAccess('VideoAgentStateMachine-Created', globalStateMachine)
      }
    }

    // Set reflection mutation if provided
    if (options?.reflectionMutation) {
      globalStateMachine.setReflectionMutation(options.reflectionMutation)
    }
    
    // Subscribe to updates
    const unsubscribe = globalStateMachine.subscribe(setContext)
    
    // Get initial state
    setContext(globalStateMachine.getContext())
    
    return () => {
      unsubscribe()
      // Note: We don't destroy the global instance here since it might be used by other components
    }
  }, [])
  
  const dispatch = useCallback((action: Action) => {
    globalStateMachine?.dispatch(action)
  }, [])
  
  const setVideoRef = useCallback((ref: VideoRefLike) => {
    console.log('[useVideoAgentSystem] setVideoRef called with:', ref)
    globalStateMachine?.setVideoRef(ref)
  }, [])

  const setVideoId = useCallback((videoId: string | null) => {
    globalStateMachine?.setVideoId(videoId)
  }, [])

  const loadInitialMessages = useCallback((messages: any[]) => {
    globalStateMachine?.loadInitialMessages(messages)
  }, [])

  const clearAudioMessages = useCallback(() => {
    globalStateMachine?.clearAudioMessages()
  }, [])

  return {
    context: context || {
      state: SystemState.VIDEO_PAUSED,
      videoState: { isPlaying: false, currentTime: 0, duration: 0 },
      agentState: { currentUnactivatedId: null, currentSystemMessageId: null, activeType: null },
      aiState: { isGenerating: false, generatingType: null, streamedContent: '', error: null },
      segmentState: { inPoint: null, outPoint: null, isComplete: false, sentToChat: false },
      recordingState: { isRecording: false, isPaused: false },
      messages: [],
      errors: []
    },
    dispatch,
    setVideoRef,
    setVideoId,
    loadInitialMessages,
    clearAudioMessages
  }
}