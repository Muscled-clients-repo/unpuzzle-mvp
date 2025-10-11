import { SystemContext, SystemState, MessageState, Message, Action, QuizQuestion, QuizState } from '../types/states'
import { Command, CommandType } from '../types/commands'
import { CommandQueue } from './CommandQueue'
import { VideoController, VideoRef, VideoRefLike } from './VideoController'
import { MessageManager } from './MessageManager'
import { videoStateCoordinator } from '@/lib/video-state/VideoStateCoordinator'
import { isFeatureEnabled } from '@/utils/feature-flags'
import { getTranscriptContextForAI, extractTranscriptSegments } from '@/hooks/use-transcript-queries'

export class VideoAgentStateMachine {
  private context: SystemContext
  private commandQueue: CommandQueue
  private videoController: VideoController
  private messageManager: MessageManager
  private subscribers: Set<(context: SystemContext) => void> = new Set()
  private videoId: string | null = null
  private courseId: string | null = null
  private reflectionMutation: ((data: any) => Promise<any>) | null = null
  private quizAttemptMutation: ((data: any) => Promise<any>) | null = null
  private lastFrozenContext: Readonly<SystemContext> | null = null

  constructor() {
    this.context = {
      state: SystemState.VIDEO_PAUSED,
      videoState: {
        isPlaying: false,
        currentTime: 0,
        duration: 0
      },
      agentState: {
        currentUnactivatedId: null,
        currentSystemMessageId: null,
        activeType: null
      },
      aiState: {
        isGenerating: false,
        generatingType: null,
        streamedContent: '',
        error: null
      },
      segmentState: {
        inPoint: null,
        outPoint: null,
        isComplete: false,
        sentToChat: false
      },
      recordingState: {
        isRecording: false,
        isPaused: false
      },
      messages: [],
      errors: []
    }
    
    this.commandQueue = new CommandQueue()
    
    // Check if DI is available at runtime
    if (isFeatureEnabled('USE_DEPENDENCY_INJECTION') && typeof window !== 'undefined') {
      // Try to get from DI at runtime only
      try {
        const { getService } = require('@/lib/dependency-injection/ServiceContainer')
        const diVideoController = getService('videoController')
        this.videoController = diVideoController || new VideoController()
      } catch {
        this.videoController = new VideoController()
      }
    } else {
      this.videoController = new VideoController()
    }
    
    this.messageManager = new MessageManager()
    
    // Connect command queue to state machine
    this.commandQueue.executeCommand = this.executeCommand.bind(this)
    
    // Register as state source if coordinator is enabled
    if (isFeatureEnabled('USE_STATE_COORDINATOR')) {
      // Just use direct import for now
      videoStateCoordinator.registerSource({
        name: 'agent-state-machine',
        priority: 2, // Lower priority than Zustand but higher than video element
        isWritable: false, // Read-only - state machine has its own state
        getState: () => ({
          isPlaying: this.context.videoState.isPlaying,
          currentTime: this.context.videoState.currentTime,
          duration: this.context.videoState.duration
        })
      })
    }
    
    if (process.env.NODE_ENV === 'development') {
    }
  }
  
  // Public API - The ONLY way to interact with the system
  public dispatch(action: Action) {
    // Issue #2 FIXED: Immediate feedback for agent actions
    const command = this.createCommand(action)
    this.commandQueue.enqueue(command)
  }
  
  public subscribe(callback: (context: SystemContext) => void) {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }
  
  public getContext(): Readonly<SystemContext> {
    // Return cached context if available (no changes since last freeze)
    if (this.lastFrozenContext) {
      return this.lastFrozenContext
    }

    // Create and cache new frozen context
    this.lastFrozenContext = Object.freeze(JSON.parse(JSON.stringify(this.context)))
    return this.lastFrozenContext
  }
  
  public setVideoRef(ref: VideoRefLike) {
    this.videoController.setVideoRef(ref)
  }

  public setVideoId(videoId: string | null) {
    this.videoId = videoId
  }

  public setCourseId(courseId: string | null) {
    this.courseId = courseId
  }

  public loadInitialMessages(messages: Message[]) {
    this.updateContext({
      ...this.context,
      messages: [...this.context.messages, ...messages]
    })
  }

  public clearAudioMessages() {
    const filteredMessages = this.context.messages.filter(msg => msg.type !== 'audio')
    this.updateContext({
      ...this.context,
      messages: filteredMessages
    })
  }

  public addMessage(message: Message) {
    this.updateContext({
      ...this.context,
      messages: this.messageManager.addMessage(this.context.messages, message)
    })
  }

  public addOrUpdateMessage(message: Message) {
    this.updateContext({
      ...this.context,
      messages: this.messageManager.addOrUpdateMessage(this.context.messages, message)
    })
  }

  public setReflectionMutation(mutation: (data: any) => Promise<any>) {
    this.reflectionMutation = mutation
  }

  public setQuizAttemptMutation(mutation: (data: any) => Promise<any>) {
    this.quizAttemptMutation = mutation
  }

  private getVideoId(): string | null {
    return this.videoId
  }
  
  private createCommand(action: Action): Command {
    switch (action.type) {
      case 'AGENT_BUTTON_CLICKED':
        return {
          id: `cmd-${Date.now()}`,
          type: CommandType.SHOW_AGENT,
          payload: action.payload,
          timestamp: Date.now(),
          attempts: 0,
          maxAttempts: 3,
          status: 'pending'
        }
      case 'VIDEO_MANUALLY_PAUSED':
        return {
          id: `cmd-${Date.now()}`,
          type: CommandType.MANUAL_PAUSE,
          payload: action.payload,
          timestamp: Date.now(),
          attempts: 0,
          maxAttempts: 1,
          status: 'pending'
        }
      case 'VIDEO_PLAYED':
        return {
          id: `cmd-${Date.now()}`,
          type: CommandType.VIDEO_RESUME,
          payload: action.payload,
          timestamp: Date.now(),
          attempts: 0,
          maxAttempts: 1,
          status: 'pending'
        }
      case 'ACCEPT_AGENT':
        return {
          id: `cmd-${Date.now()}`,
          type: CommandType.ACTIVATE_AGENT,
          payload: action.payload,
          timestamp: Date.now(),
          attempts: 0,
          maxAttempts: 1,
          status: 'pending'
        }
      case 'REJECT_AGENT':
        return {
          id: `cmd-${Date.now()}`,
          type: CommandType.REJECT_AGENT,
          payload: action.payload,
          timestamp: Date.now(),
          attempts: 0,
          maxAttempts: 1,
          status: 'pending'
        }
      case 'QUIZ_ANSWER_SELECTED':
        return {
          id: `cmd-${Date.now()}`,
          type: CommandType.QUIZ_ANSWER,
          payload: action.payload,
          timestamp: Date.now(),
          attempts: 0,
          maxAttempts: 1,
          status: 'pending'
        }
      case 'REFLECTION_SUBMITTED':
        return {
          id: `cmd-${Date.now()}`,
          type: CommandType.REFLECTION_SUBMIT,
          payload: action.payload,
          timestamp: Date.now(),
          attempts: 0,
          maxAttempts: 1,
          status: 'pending'
        }
      case 'REFLECTION_TYPE_CHOSEN':
        return {
          id: `cmd-${Date.now()}`,
          type: CommandType.REFLECTION_TYPE_CHOSEN,
          payload: action.payload,
          timestamp: Date.now(),
          attempts: 0,
          maxAttempts: 1,
          status: 'pending'
        }
      case 'REFLECTION_CANCELLED':
        return {
          id: `cmd-${Date.now()}`,
          type: CommandType.REFLECTION_CANCEL,
          payload: action.payload,
          timestamp: Date.now(),
          attempts: 0,
          maxAttempts: 1,
          status: 'pending'
        }
      case 'SET_IN_POINT':
        return {
          id: `cmd-${Date.now()}`,
          type: CommandType.SET_IN_POINT,
          payload: action.payload,
          timestamp: Date.now(),
          attempts: 0,
          maxAttempts: 3,  // Allow retries for robustness
          status: 'pending'
        }
      case 'SET_OUT_POINT':
        return {
          id: `cmd-${Date.now()}`,
          type: CommandType.SET_OUT_POINT,
          payload: action.payload,
          timestamp: Date.now(),
          attempts: 0,
          maxAttempts: 3,  // Allow retries for robustness
          status: 'pending'
        }
      case 'CLEAR_SEGMENT':
        return {
          id: `cmd-${Date.now()}`,
          type: CommandType.CLEAR_SEGMENT,
          payload: action.payload,
          timestamp: Date.now(),
          attempts: 0,
          maxAttempts: 1,
          status: 'pending'
        }
      case 'UPDATE_SEGMENT':
        return {
          id: `cmd-${Date.now()}`,
          type: CommandType.UPDATE_SEGMENT,
          payload: action.payload,
          timestamp: Date.now(),
          attempts: 0,
          maxAttempts: 1,
          status: 'pending'
        }
      case 'SEND_SEGMENT_TO_CHAT':
        return {
          id: `cmd-${Date.now()}`,
          type: CommandType.SEND_SEGMENT_TO_CHAT,
          payload: action.payload,
          timestamp: Date.now(),
          attempts: 0,
          maxAttempts: 1,
          status: 'pending'
        }
      case 'RECORDING_STARTED':
        return {
          id: `cmd-${Date.now()}`,
          type: CommandType.RECORDING_STARTED,
          payload: action.payload,
          timestamp: Date.now(),
          attempts: 0,
          maxAttempts: 1,
          status: 'pending'
        }
      case 'RECORDING_PAUSED':
        return {
          id: `cmd-${Date.now()}`,
          type: CommandType.RECORDING_PAUSED,
          payload: action.payload,
          timestamp: Date.now(),
          attempts: 0,
          maxAttempts: 1,
          status: 'pending'
        }
      case 'RECORDING_RESUMED':
        return {
          id: `cmd-${Date.now()}`,
          type: CommandType.RECORDING_RESUMED,
          payload: action.payload,
          timestamp: Date.now(),
          attempts: 0,
          maxAttempts: 1,
          status: 'pending'
        }
      case 'RECORDING_STOPPED':
        return {
          id: `cmd-${Date.now()}`,
          type: CommandType.RECORDING_STOPPED,
          payload: action.payload,
          timestamp: Date.now(),
          attempts: 0,
          maxAttempts: 1,
          status: 'pending'
        }
      default:
        throw new Error(`Unknown action type: ${(action as any).type}`)
    }
  }
  
  private async executeCommand(command: Command): Promise<void> {
    switch (command.type) {
      case CommandType.SHOW_AGENT:
        await this.handleShowAgent(command.payload)
        break
      case CommandType.MANUAL_PAUSE:
        await this.handleManualPause(command.payload.time)
        break
      case CommandType.VIDEO_RESUME:
        await this.handleVideoResume()
        break
      case CommandType.ACTIVATE_AGENT:
        await this.handleAcceptAgent(command.payload)
        break
      case CommandType.REJECT_AGENT:
        await this.handleRejectAgent(command.payload)
        break
      case CommandType.REQUEST_VIDEO_PAUSE:
        await this.videoController.pauseVideo()
        break
      case CommandType.QUIZ_ANSWER:
        await this.handleQuizAnswer(command.payload)
        break
      case CommandType.REFLECTION_SUBMIT:
        await this.handleReflectionSubmit(command.payload)
        break
      case CommandType.REFLECTION_TYPE_CHOSEN:
        await this.handleReflectionTypeChosen(command.payload)
        break
      case CommandType.REFLECTION_CANCEL:
        await this.handleReflectionCancel()
        break
      case CommandType.SET_IN_POINT:
        await this.handleSetInPoint()
        break
      case CommandType.SET_OUT_POINT:
        await this.handleSetOutPoint()
        break
      case CommandType.CLEAR_SEGMENT:
        await this.handleClearSegment()
        break
      case CommandType.UPDATE_SEGMENT:
        await this.handleUpdateSegment(command)
        break
      case CommandType.SEND_SEGMENT_TO_CHAT:
        await this.handleSendSegmentToChat()
        break
      case CommandType.RECORDING_STARTED:
        await this.handleRecordingStarted()
        break
      case CommandType.RECORDING_PAUSED:
        await this.handleRecordingPaused()
        break
      case CommandType.RECORDING_RESUMED:
        await this.handleRecordingResumed()
        break
      case CommandType.RECORDING_STOPPED:
        await this.handleRecordingStopped()
        break
    }
  }
  
  private async handleShowAgent(payload: any) {
    // Handle both old string format and new object format
    const agentType = typeof payload === 'string' ? payload : payload.agentType
    const passedTime = typeof payload === 'object' ? payload.time : null

    
    // NUCLEAR PRINCIPLE: Pause video first
    // Don't use pausingForAgent flag - it's causing issues
    // The video pause is handled properly by the controller
    try {
      await this.videoController.pauseVideo()
    } catch (error) {
      console.error('Failed to pause video:', error)
    }
    
    // NUCLEAR PRINCIPLE: Clean message filtering in one place
    // Flow 3 & 4: When showing new agent, remove unactivated content
    const currentMessages = this.context.messages.filter(msg => {
      // Remove unactivated messages (old agent prompts)
      if (msg.state === MessageState.UNACTIVATED) return false
      // Remove reflection options (transient UI)
      if (msg.type === 'reflection-options') return false
      // Keep everything else
      return true
    })
    
    // Use passed time if available, otherwise get from video controller
    let currentVideoTime = passedTime
    if (currentVideoTime === null || currentVideoTime === undefined) {
      currentVideoTime = this.videoController.getCurrentTime()
    }
    
    // 3. Add system message with proper typing using actual video time
    const systemMessage: Message = {
      id: `sys-${Date.now()}`,
      type: 'system' as const,
      state: MessageState.UNACTIVATED,
      message: this.context.recordingState.isRecording ? `Recording paused at ${this.formatTime(currentVideoTime)}` : `Paused at ${this.formatTime(currentVideoTime)}`,
      timestamp: Date.now()
    }
    
    // 4. Add agent message with proper typing
    const agentMessage: Message = {
      id: `agent-${Date.now()}`,
      type: 'agent-prompt' as const,
      agentType: agentType as 'quiz' | 'reflect',
      state: MessageState.UNACTIVATED,
      message: this.getAgentPrompt(agentType, currentVideoTime),
      timestamp: Date.now(),
      linkedMessageId: systemMessage.id
    }

    // 5. Update context atomically - ensure video state is paused

    this.updateContext({
      ...this.context,
      state: SystemState.AGENT_SHOWING_UNACTIVATED,
      videoState: {
        ...this.context.videoState,
        isPlaying: false  // Ensure video state reflects that it's paused
      },
      agentState: {
        currentUnactivatedId: agentMessage.id,
        currentSystemMessageId: systemMessage.id,
        activeType: null  // Don't set active until agent is accepted
      },
      messages: [
        ...currentMessages,  // Use filtered messages
        systemMessage,
        agentMessage
      ]
    })


    // 6. For quiz agents, contextual enhancement is disabled for now
    // if (agentType === 'quiz') {
    //   try {
    //     const videoId = this.getVideoId()
    //     const contextualPrompt = await this.getContextualAgentPrompt(agentType, videoId, currentVideoTime)
    //     this.updateAgentMessage(agentMessage.id, contextualPrompt)
    //   } catch (error) {
    //     console.error('Failed to load contextual prompt:', error)
    //   }
    // }
  }
  
  private async handleManualPause(time: number) {

    // Simply pause the video
    this.updateContext({
      ...this.context,
      state: SystemState.VIDEO_PAUSED,
      videoState: {
        ...this.context.videoState,
        isPlaying: false
      }
    })
  }
  
  private async handleVideoResume() {
    
    // NUCLEAR PRINCIPLE: Use agent state as single source of truth
    // Special handling for active agents
    if (this.context.agentState.activeType === 'quiz') {
      this.updateContext({
        ...this.context,
        state: SystemState.VIDEO_PLAYING,
        videoState: {
          ...this.context.videoState,
          isPlaying: true
        }
      })
      return
    }
    
    if (this.context.agentState.activeType === 'reflect') {
      // Check if reflection is committed
      const reflectionOptions = this.context.messages.find(msg => msg.type === 'reflection-options')
      const isCommitted = reflectionOptions && (reflectionOptions as any).reflectionCommitted === true
      
      if (isCommitted) {
        this.updateContext({
          ...this.context,
          state: SystemState.VIDEO_PLAYING,
          videoState: {
            ...this.context.videoState,
            isPlaying: true
          }
        })
        return
      } else {
        // Clear the agent state since reflection wasn't committed
        // Continue to normal clearing logic below
      }
    }
    
    // NUCLEAR PRINCIPLE: Clear, deterministic filtering based on state
    // Flow 5: Remove ALL unactivated content when video resumes (only if not reflecting)
    const filteredMessages = this.context.messages.filter(msg => {
      // Rule 1: Remove ALL unactivated messages (including system messages)
      if (msg.state === MessageState.UNACTIVATED) {
        return false
      }
      
      // Rule 2: Remove reflection-options (they're transient UI) - but we won't get here if reflecting
      if (msg.type === 'reflection-options') {
        return false
      }
      
      // Rule 3: Keep everything else (ACTIVATED, REJECTED, PERMANENT)
      return true
    })
    
    this.updateContext({
      ...this.context,
      state: SystemState.VIDEO_PLAYING,
      videoState: {
        ...this.context.videoState,
        isPlaying: true
      },
      agentState: {
        currentUnactivatedId: null,
        currentSystemMessageId: null,
        activeType: null  // Clear any active agent when resuming
      },
      messages: filteredMessages
    })
  }
  
  private async handleAcceptAgent(agentId: string) {
    
    // Check if this agent has already been processed (no longer UNACTIVATED)
    const agentMessage = this.context.messages.find(msg => msg.id === agentId)
    if (!agentMessage || agentMessage.state !== MessageState.UNACTIVATED) {
      return
    }
    
    // Get agent type from the message itself
    const agentType = (agentMessage as any).agentType
    
    // Flow 6: Agent Acceptance
    const updatedMessages = this.context.messages.map(msg => {
      if (msg.id === agentId) {
        // Remove the buttons/actions regardless of agent type
        // For reflect agent, keep as UNACTIVATED so it can be cleaned up if abandoned
        // But remove the actions so buttons disappear
        if (agentType === 'reflect') {
          return { ...msg, state: MessageState.UNACTIVATED, actions: undefined, accepted: true }
        }
        // For other agents, change to ACTIVATED
        return { ...msg, state: MessageState.ACTIVATED, actions: undefined }
      }
      // For reflect agent, keep system message as UNACTIVATED too
      if (msg.id === this.context.agentState.currentSystemMessageId) {
        if (agentType === 'reflect') {
          return { ...msg, state: MessageState.UNACTIVATED }
        }
        return { ...msg, state: MessageState.PERMANENT }
      }
      return msg
    })
    
    const currentTime = this.videoController.getCurrentTime()
    const formattedTime = this.formatTime(currentTime)
    
    // Add system message for agent activation
    const getAgentLabel = (type: string | null) => {
      switch (type) {
        case 'quiz': return 'PuzzleCheck'
        case 'reflect': return 'PuzzleReflect'
        default: return 'Agent'
      }
    }
    
    // For reflection and quiz, don't add permanent activation message yet
    // Reflection can be abandoned, quiz will add its own completion message
    let messagesWithActivation = updatedMessages
    
    if (agentType !== 'reflect' && agentType !== 'quiz') {
      const activationMessage: Message = {
        id: `sys-activate-${Date.now()}`,
        type: 'system' as const,
        state: MessageState.PERMANENT,
        message: `📍 ${getAgentLabel(agentType)} activated at ${formattedTime}`,
        timestamp: Date.now()
      }
      messagesWithActivation = [...updatedMessages, activationMessage]
    }
    
    // Special handling for quiz agent
    if (agentType === 'quiz') {
      await this.startQuiz(messagesWithActivation)
      return
    }
    
    // Special handling for reflect agent - don't add activation message yet
    if (agentType === 'reflect') {
      await this.startReflection(messagesWithActivation)
      return
    }
    
    // Generate AI response for other agents
    const videoId = this.getVideoId()
    const aiMessage = await this.generateAIResponse(agentType, videoId, currentTime)

    const aiResponse: Message = {
      id: `ai-${Date.now()}`,
      type: 'ai' as const,
      state: MessageState.PERMANENT,
      message: aiMessage,
      timestamp: Date.now()
    }

    this.updateContext({
      ...this.context,
      state: SystemState.AGENT_ACTIVATED,
      messages: [...messagesWithActivation, aiResponse],
      agentState: {
        ...this.context.agentState,
        currentUnactivatedId: null, // No longer unactivated
        activeType: null // Clear active type
      }
    })
  }
  
  private async handleRejectAgent(agentId: string) {

    // Check if this agent has already been processed (no longer UNACTIVATED)
    const agentMessage = this.context.messages.find(msg => msg.id === agentId)
    if (!agentMessage || agentMessage.state !== MessageState.UNACTIVATED) {
      return
    }

    // Remove the agent and system message immediately
    const updatedMessages = this.context.messages.filter(msg => {
      // Remove the rejected agent message
      if (msg.id === agentId) return false
      // Remove the linked system message
      if (msg.id === this.context.agentState.currentSystemMessageId) return false
      return true
    })

    // Update context to clear agent state and resume video
    this.updateContext({
      ...this.context,
      state: SystemState.VIDEO_PLAYING,
      videoState: {
        ...this.context.videoState,
        isPlaying: true
      },
      messages: updatedMessages,
      agentState: {
        currentUnactivatedId: null,
        currentSystemMessageId: null,
        activeType: null
      }
    })

    // Resume video playback with small delay to prevent race condition
    setTimeout(async () => {
      try {
        await this.videoController.playVideo()
      } catch (error) {
        console.error('[SM] Failed to resume video:', error)
      }
    }, 50) // Small delay to ensure state is fully updated
  }
  
  // REMOVED: clearUnactivatedMessages and clearReflectionOptions
  // NUCLEAR PRINCIPLE: All message filtering happens inline in the handlers
  // No separate methods that do their own updateContext calls
  
  private updateContext(newContext: SystemContext) {
    const prevActiveType = this.context.agentState.activeType

    // Check if context actually changed (shallow comparison of top-level keys)
    const contextChanged = this.hasContextChanged(this.context, newContext)

    this.context = newContext

    // Only clear cache if context actually changed
    if (contextChanged) {
      this.lastFrozenContext = null
    }

    const newActiveType = this.context.agentState.activeType

    if (prevActiveType !== newActiveType) {
    }

    this.notifySubscribers()
  }

  private hasContextChanged(oldContext: SystemContext, newContext: SystemContext): boolean {
    // Compare state enum
    if (oldContext.state !== newContext.state) return true

    // Compare videoState
    if (oldContext.videoState.isPlaying !== newContext.videoState.isPlaying) return true
    if (oldContext.videoState.currentTime !== newContext.videoState.currentTime) return true
    if (oldContext.videoState.duration !== newContext.videoState.duration) return true

    // Compare agentState
    if (oldContext.agentState.activeType !== newContext.agentState.activeType) return true
    if (oldContext.agentState.currentUnactivatedId !== newContext.agentState.currentUnactivatedId) return true
    if (oldContext.agentState.currentSystemMessageId !== newContext.agentState.currentSystemMessageId) return true

    // Compare aiState
    if (oldContext.aiState.isGenerating !== newContext.aiState.isGenerating) return true
    if (oldContext.aiState.generatingType !== newContext.aiState.generatingType) return true
    if (oldContext.aiState.streamedContent !== newContext.aiState.streamedContent) return true
    if (oldContext.aiState.error !== newContext.aiState.error) return true

    // Compare segmentState
    if (oldContext.segmentState.inPoint !== newContext.segmentState.inPoint) return true
    if (oldContext.segmentState.outPoint !== newContext.segmentState.outPoint) return true
    if (oldContext.segmentState.isComplete !== newContext.segmentState.isComplete) return true
    if (oldContext.segmentState.sentToChat !== newContext.segmentState.sentToChat) return true

    // Compare recordingState
    if (oldContext.recordingState.isRecording !== newContext.recordingState.isRecording) return true
    if (oldContext.recordingState.isPaused !== newContext.recordingState.isPaused) return true

    // Compare messages array (reference equality first, then length)
    if (oldContext.messages !== newContext.messages) {
      if (oldContext.messages.length !== newContext.messages.length) return true
      // If lengths are same but arrays are different references, check if content changed
      for (let i = 0; i < oldContext.messages.length; i++) {
        if (oldContext.messages[i] !== newContext.messages[i]) return true
      }
    }

    // Compare errors array
    if (oldContext.errors !== newContext.errors) {
      if (oldContext.errors.length !== newContext.errors.length) return true
    }

    return false
  }
  
  private notifySubscribers() {
    const frozenContext = this.getContext()
    this.subscribers.forEach(callback => callback(frozenContext))
  }
  
  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  private getAgentPrompt(type: string, currentTime?: number): string {
    switch (type) {
      case 'quiz':
        const timeFormatted = currentTime ? this.formatTime(currentTime) : '0:00'
        return `Want to take a quiz at ${timeFormatted}?`
      case 'reflect': return 'Would you like to reflect on what you\'ve learned?'
      default: return 'How can I help you?'
    }
  }

  private async getContextualAgentPrompt(type: string, videoId?: string, timestamp?: number): Promise<string> {
    if (type === 'quiz' && videoId && timestamp !== undefined) {
      try {
        // Get transcript context
        const transcriptSegment = await getTranscriptContextForAI(videoId, timestamp)

        // Get topic summary from Groq
        const response = await fetch('/api/ai/topic-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcriptSegment,
            timestamp
          })
        })

        if (response.ok) {
          const { topicSummary } = await response.json()
          const timeFormatted = this.formatTime(timestamp)
          return `Want to quiz yourself at ${timeFormatted} on ${topicSummary}?`
        }
      } catch (error) {
        console.error('Failed to get contextual prompt:', error)
      }

      // Fallback
      const timeFormatted = this.formatTime(timestamp)
      return `Want to quiz yourself at ${timeFormatted}?`
    }

    return this.getAgentPrompt(type)
  }

  private getVideoId(): string | undefined {
    return this.videoId || undefined
  }

  private updateAgentMessage(messageId: string, newMessage: string) {
    const updatedMessages = this.context.messages.map(msg => {
      if (msg.id === messageId && msg.type === 'agent-prompt') {
        return {
          ...msg,
          message: newMessage,
          actions: {
            onAccept: () => this.enqueueCommand({ type: 'ACCEPT_AGENT', payload: { messageId } }),
            onReject: () => this.enqueueCommand({ type: 'REJECT_AGENT', payload: { messageId } })
          }
        }
      }
      return msg
    })

    this.updateContext({
      ...this.context,
      messages: updatedMessages
    })
  }
  
  private async generateAIResponse(agentType: string | null, videoId?: string, timestamp?: number): Promise<string> {
    switch (agentType) {
      case 'quiz':
        return 'Starting your quiz now! Answer each question to the best of your ability.'
      case 'reflect':
        return 'Choose how you\'d like to reflect on this moment in the video. You can record a voice memo, take a screenshot, or create a Loom video to capture your thoughts.'
      default:
        return 'I\'m here to help you learn. Feel free to ask any questions!'
    }
  }


  private async generateQuizQuestions(videoId?: string, timestamp?: number): Promise<QuizQuestion[]> {
    if (!videoId || timestamp === undefined) {
      throw new Error('Video ID and timestamp required for quiz generation')
    }

    try {
      // Set loading state
      this.updateContext({
        ...this.context,
        aiState: {
          isGenerating: true,
          generatingType: 'quiz',
          streamedContent: '',
          error: null
        }
      })

      // Use segment context transcript if available, otherwise get context for timestamp
      let transcriptSegment = ''
      if (this.context.segmentState.sentToChat && this.context.segmentState.transcriptText) {
        transcriptSegment = this.context.segmentState.transcriptText
        console.log('[SM] Using segment context for quiz:', this.context.segmentState.transcriptText.substring(0, 100) + '...')
      } else {
        transcriptSegment = await getTranscriptContextForAI(videoId, timestamp)
        console.log('[SM] Using timestamp context for quiz:', transcriptSegment.substring(0, 100) + '...')
      }

      const response = await fetch('/api/ai/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId,
          timestamp,
          transcriptSegment
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No reader available')
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let streamedContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'chunk') {
                streamedContent += data.content
                this.updateContext({
                  ...this.context,
                  aiState: {
                    ...this.context.aiState,
                    streamedContent
                  }
                })
              } else if (data.type === 'complete') {
                // Clear loading state and return result
                this.updateContext({
                  ...this.context,
                  aiState: {
                    isGenerating: false,
                    generatingType: null,
                    streamedContent: '',
                    error: null
                  }
                })

                if (data.quiz) {
                  return [data.quiz]
                }
              } else if (data.type === 'error') {
                throw new Error(data.error)
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', line)
            }
          }
        }
      }

      throw new Error('No quiz data received')
    } catch (error) {
      console.error('AI quiz generation failed:', error)

      // Clear loading state and set error
      this.updateContext({
        ...this.context,
        aiState: {
          isGenerating: false,
          generatingType: null,
          streamedContent: '',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })

      throw error // Don't return mock data, let it fail
    }
  }

  private async saveReflectionToDatabase(type: string, data: any, videoTimestamp: number): Promise<void> {
    const videoId = this.getVideoId()

    if (!videoId) {
      throw new Error('Video ID required for reflection storage')
    }

    if (!this.reflectionMutation) {
      throw new Error('Reflection mutation not available - ensure TanStack mutation is properly set')
    }

    try {
      // Prepare data for TanStack mutation (which calls server action)
      const reflectionData: any = {
        type,
        videoId,
        courseId: data.courseId || '',
        videoTimestamp,
      }

      // Handle different reflection types

      if (type === 'voice' && data.audioBlob) {

        // Convert blob to File for FormData compatibility
        const audioFile = new File([data.audioBlob], 'voice-memo.webm', {
          type: data.audioBlob.type || 'audio/webm'
        })

        reflectionData.file = audioFile
        if (data.duration) {
          reflectionData.duration = data.duration
        }
      } else if (type === 'screenshot' && data.imageBlob) {
        // Convert blob to File for FormData compatibility
        const imageFile = new File([data.imageBlob], 'screenshot.png', {
          type: data.imageBlob.type || 'image/png'
        })
        reflectionData.file = imageFile
      } else if (type === 'loom' && data.loomUrl) {
        reflectionData.loomUrl = data.loomUrl
      } else {
        console.error('[SM] No matching reflection type or missing data:', { type, hasAudioBlob: !!data.audioBlob, hasImageBlob: !!data.imageBlob, hasLoomUrl: !!data.loomUrl })
      }


      // Use TanStack mutation (which calls server action)
      const result = await this.reflectionMutation(reflectionData)

      // Return the result so we can use the file URL in the message
      return result

    } catch (error) {
      console.error('[SM] Failed to save reflection via TanStack:', error)
      throw error
    }
  }

  private getMockQuizQuestions(): QuizQuestion[] {
    return [
      {
        id: 'q1',
        question: 'What is the primary purpose of the useState hook in React?',
        options: [
          'To fetch data from an API',
          'To manage local component state',
          'To handle side effects',
          'To optimize performance'
        ],
        correctAnswer: 1,
        explanation: 'useState is used to add state to functional components, allowing them to store and update local data.'
      },
      {
        id: 'q2',
        question: 'When does the useEffect hook run by default?',
        options: [
          'Only when the component mounts',
          'Only when the component unmounts',
          'After every render',
          'Only when props change'
        ],
        correctAnswer: 2,
        explanation: 'useEffect runs after every render by default, including the initial render and after every update.'
      },
      {
        id: 'q3',
        question: 'What happens when you call setState in React?',
        options: [
          'The component re-renders immediately',
          'The component re-renders on the next event loop',
          'The component schedules a re-render',
          'Nothing happens until you refresh'
        ],
        correctAnswer: 2,
        explanation: 'setState schedules a re-render, which React processes asynchronously for performance optimization.'
      }
    ]
  }

  private async startQuiz(updatedMessages: Message[]) {

    try {
      const currentTime = this.videoController.getCurrentTime()
      const videoId = this.getVideoId()
      const questions = await this.generateQuizQuestions(videoId, currentTime)
      const quizState: QuizState = {
        questions,
        currentQuestionIndex: 0,
        userAnswers: new Array(questions.length).fill(null),
        score: 0,
        isComplete: false
      }

    // Add AI intro message
    const aiIntro: Message = {
      id: `ai-${Date.now()}`,
      type: 'ai' as const,
      state: MessageState.PERMANENT,
      message: 'Starting your quiz now! Answer each question to the best of your ability.',
      timestamp: Date.now()
    }

    // Add first quiz question
    const firstQuestion: Message = {
      id: `quiz-${Date.now()}`,
      type: 'quiz-question' as const,
      state: MessageState.PERMANENT,
      message: `Question 1 of ${questions.length}`,
      quizData: questions[0],
      quizState,
      timestamp: Date.now()
    }

    this.updateContext({
      ...this.context,
      state: SystemState.AGENT_ACTIVATED,
      messages: [...updatedMessages, aiIntro, firstQuestion],
      agentState: {
        ...this.context.agentState,
        currentUnactivatedId: null,
        activeType: 'quiz'  // Keep quiz as active agent
      }
    })
    } catch (error) {
      console.error('[SM] Quiz generation failed:', error)
      // Add error message instead of quiz
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        type: 'ai' as const,
        state: MessageState.PERMANENT,
        message: `Failed to generate quiz: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now()
      }

      this.updateContext({
        ...this.context,
        state: SystemState.AGENT_ACTIVATED,
        messages: [...updatedMessages, errorMessage],
        agentState: {
          ...this.context.agentState,
          currentUnactivatedId: null,
          activeType: null  // Clear active type on error
        }
      })
    }
  }

  private startVideoCountdown(countdownMessageId: string) {
    let countdown = 3
    
    const updateCountdown = () => {
      countdown--
      
      if (countdown > 0) {
        // Update countdown message - use arrow function to capture current context
        const updatedMessages = this.context.messages.map(msg => {
          if (msg.id === countdownMessageId) {
            return { ...msg, message: `Video continues in ${countdown}...` }
          }
          return msg
        })
        
        this.updateContext({
          ...this.context,
          messages: updatedMessages
        })
        
        // Continue countdown
        setTimeout(() => updateCountdown(), 1000)
      } else {
        // Countdown complete - Create a command to clear the state properly
        
        // First clear the countdown message
        const updatedMessages = this.context.messages.filter(msg => msg.id !== countdownMessageId)
        
        // Clear activeType for manual pause
        this.updateContext({
          ...this.context,
          state: SystemState.VIDEO_PLAYING,
          videoState: {
            ...this.context.videoState,
            isPlaying: true
          },
          agentState: {
            currentUnactivatedId: null,
            currentSystemMessageId: null,
            activeType: null  // THIS MUST BE NULL
          },
          messages: updatedMessages
        })
        
        // Verify the update worked
        
        // Resume video playback
        if (this.videoController && this.videoController.playVideo) {
          this.videoController.playVideo()
        }
      }
    }
    
    // Start countdown after 1 second delay
    setTimeout(() => updateCountdown(), 1000)
  }

  private async handleQuizAnswer(payload: { questionId: string, selectedAnswer: number }) {
    
    // Find the current quiz question message
    const quizMessages = this.context.messages.filter(msg => msg.type === 'quiz-question')
    const currentQuizMessage = quizMessages[quizMessages.length - 1]
    
    if (!currentQuizMessage?.quizState || !currentQuizMessage?.quizData) {
      console.error('No active quiz found')
      return
    }

    const { quizState, quizData } = currentQuizMessage
    const { selectedAnswer } = payload
    const isCorrect = selectedAnswer === quizData.correctAnswer

    // Update quiz state
    const newUserAnswers = [...quizState.userAnswers]
    newUserAnswers[quizState.currentQuestionIndex] = selectedAnswer
    
    const newScore = quizState.score + (isCorrect ? 1 : 0)
    const nextQuestionIndex = quizState.currentQuestionIndex + 1
    const isLastQuestion = nextQuestionIndex >= quizState.questions.length

    // Add feedback message
    const feedbackMessage: Message = {
      id: `feedback-${Date.now()}`,
      type: 'ai' as const,
      state: MessageState.PERMANENT,
      message: isCorrect 
        ? `✅ Correct! ${quizData.explanation}`
        : `❌ Incorrect. ${quizData.explanation}`,
      timestamp: Date.now()
    }

    let newMessages = [...this.context.messages, feedbackMessage]

    if (isLastQuestion) {
      // NUCLEAR PRINCIPLE: Atomic cleanup - remove ALL quiz-related messages
      // Build complete quiz data from all questions
      const allQuizFeedback: any[] = []
      quizState.questions.forEach((q, idx) => {
        const userAnswer = newUserAnswers[idx]
        const isAnswerCorrect = userAnswer === q.correctAnswer
        allQuizFeedback.push({
          questionId: q.id,
          question: q.question,
          userAnswer,
          correctAnswer: q.correctAnswer,
          isCorrect: isAnswerCorrect,
          explanation: q.explanation,
          options: q.options
        })
      })
      
      // NUCLEAR PRINCIPLE: Filter messages atomically
      newMessages = newMessages.filter(msg => {
        // Remove all quiz questions
        if (msg.type === 'quiz-question') return false
        // Remove all feedback messages
        if (msg.type === 'ai' && msg.message.includes('Correct!')) return false
        if (msg.type === 'ai' && msg.message.includes('Incorrect.')) return false
        // Remove the "Starting your quiz now!" message
        if (msg.type === 'ai' && msg.message.includes('Starting your quiz')) return false
        // Remove the "Paused at X:XX" system message linked to quiz
        if (msg.id === this.context.agentState.currentSystemMessageId) return false
        // Remove quiz agent prompt messages (activated)
        if (msg.type === 'agent-prompt' && msg.agentType === 'quiz' && msg.state === MessageState.ACTIVATED) return false
        // Keep everything else
        return true
      })
      
      // Add system message for quiz completion
      const currentTime = this.videoController.getCurrentTime()
      const formattedTime = this.formatTime(currentTime)
      const percentage = Math.round((newScore / quizState.questions.length) * 100)
      
      const quizCompleteSystemMsg: Message = {
        id: `sys-quiz-complete-${Date.now()}`,
        type: 'system' as const,
        state: MessageState.PERMANENT,
        message: `📍 PuzzleCheck • Quiz at ${formattedTime}`,
        timestamp: Date.now()
      }
      newMessages.push(quizCompleteSystemMsg)
      
      // Quiz complete - show results with ALL quiz data embedded
      const resultsMessage: Message = {
        id: `results-${Date.now()}`,
        type: 'ai' as const,  // Use 'ai' type so it appears in chat flow
        state: MessageState.PERMANENT,
        message: `Great job completing the quiz! You scored ${newScore} out of ${quizState.questions.length} (${percentage}%). Your understanding of the material is ${percentage >= 80 ? 'excellent' : percentage >= 60 ? 'good' : 'developing'}. Click below to review your answers.`,
        quizResult: {  // Embed complete quiz data
          score: newScore,
          total: quizState.questions.length,
          percentage,
          questions: allQuizFeedback,
          completedAt: currentTime
        },
        timestamp: Date.now()
      } as Message
      newMessages.push(resultsMessage)
      
      // Add countdown message
      const countdownId = `countdown-${Date.now()}`
      const countdownMessage: Message = {
        id: countdownId,
        type: 'system' as const,
        state: MessageState.PERMANENT,
        message: 'Video continues in 3...',
        timestamp: Date.now()
      }
      newMessages.push(countdownMessage)

      // Save quiz attempt to database
      if (this.quizAttemptMutation && this.videoId && this.courseId) {
        try {
          const quizAttemptData = {
            videoId: this.videoId,
            courseId: this.courseId,
            videoTimestamp: currentTime,
            questions: quizState.questions,
            userAnswers: newUserAnswers,
            score: newScore,
            totalQuestions: quizState.questions.length,
            percentage: percentage,
            quizDurationSeconds: null // TODO: Add duration tracking if needed
          }

          await this.quizAttemptMutation(quizAttemptData)
        } catch (error) {
          console.error('[SM] Failed to save quiz attempt:', error)
          // Don't block the UI flow if database save fails
        }
      } else {
        console.warn('[SM] Quiz mutation or IDs not available for database save')
      }

      // Update context first with quiz still active
      this.updateContext({
        ...this.context,
        messages: newMessages,
        agentState: {
          ...this.context.agentState,
          // Keep quiz as active during countdown - will be cleared by countdown completion
          activeType: 'quiz'
        }
      })
      
      // Start countdown to resume video with the countdown message ID
      this.startVideoCountdown(countdownId)
      return // Early return since we already updated context
    } else {
      // Show next question
      const nextQuestion = quizState.questions[nextQuestionIndex]
      const nextQuestionMessage: Message = {
        id: `quiz-${Date.now()}`,
        type: 'quiz-question' as const,
        state: MessageState.PERMANENT,
        message: `Question ${nextQuestionIndex + 1} of ${quizState.questions.length}`,
        quizData: nextQuestion,
        quizState: {
          ...quizState,
          currentQuestionIndex: nextQuestionIndex,
          userAnswers: newUserAnswers,
          score: newScore
        },
        timestamp: Date.now()
      }
      newMessages.push(nextQuestionMessage)
    }

    this.updateContext({
      ...this.context,
      messages: newMessages
    })
  }

  private async startReflection(updatedMessages: Message[]) {
    
    // Remove any existing reflection-options messages first
    const filteredMessages = updatedMessages.filter(msg => msg.type !== 'reflection-options')
    
    // Add intro message - make it UNACTIVATED so it gets removed if abandoned
    const introMessage: Message = {
      id: `ai-reflect-intro-${Date.now()}`,
      type: 'ai' as const,
      state: MessageState.UNACTIVATED,  // Will be removed if reflection abandoned
      message: 'Great! Let\'s capture your reflection on what you\'ve learned. Choose how you\'d like to reflect:',
      timestamp: Date.now(),
      reflectionIntro: true  // Mark this as reflection intro for identification
    }

    // Add reflection options with commitment tracking
    const reflectionOptions: Message = {
      id: `reflection-${Date.now()}`,
      type: 'reflection-options' as const,
      state: MessageState.PERMANENT,  // This is fine, we filter by type
      message: 'Select your preferred reflection method',
      timestamp: Date.now(),
      reflectionCommitted: false  // Track if user has chosen a type
    }

    this.updateContext({
      ...this.context,
      state: SystemState.AGENT_ACTIVATED,
      messages: [...filteredMessages, introMessage, reflectionOptions],
      agentState: {
        ...this.context.agentState,
        currentUnactivatedId: null,
        activeType: 'reflect'  // Keep reflect as active agent
      }
    })
  }

  private async handleReflectionTypeChosen(payload: { reflectionType: string }) {
    
    // Mark the reflection as committed
    const updatedMessages = this.context.messages.map(msg => {
      if (msg.type === 'reflection-options') {
        return { ...msg, reflectionCommitted: true }
      }
      return msg
    })
    
    this.updateContext({
      ...this.context,
      messages: updatedMessages
    })
  }

  private async handleReflectionCancel() {
    
    // Clear all reflection-related messages
    const filteredMessages = this.context.messages.filter(msg => {
      // Remove reflection options
      if (msg.type === 'reflection-options') return false
      // Remove unactivated messages (includes reflection intro)
      if (msg.state === MessageState.UNACTIVATED) return false
      // Remove reflection intro even if not unactivated
      if ((msg as any).reflectionIntro) return false
      return true
    })
    
    this.updateContext({
      ...this.context,
      messages: filteredMessages,
      agentState: {
        ...this.context.agentState,
        activeType: null  // Clear active agent
      }
    })
  }

  // Segment management handlers
  private async getTranscriptChunkBoundaries(videoId: string, timestamp: number): Promise<{ start: number; end: number } | null> {
    try {
      // FIXME: Students should not access instructor-only transcription API
      // This function is disabled for now to prevent 403 errors
      // Students get transcript data through video props, not direct API calls
      console.log('[SM] Transcript chunk boundaries disabled - students use video props for transcript data')
      return null

      /* COMMENTED OUT - CAUSES 403 FOR STUDENTS
      const response = await fetch(`/api/transcription/${videoId}`)
      if (!response.ok) return null

      const data = await response.json()
      if (!data?.hasTranscript || !data.transcript?.segments) return null

      let segments = data.transcript.segments
      // Handle nested structure if needed
      if (!Array.isArray(segments) && segments.segments && Array.isArray(segments.segments)) {
        segments = segments.segments
      }

      // Find the chunk that contains this timestamp
      const chunk = segments.find((segment: any) =>
        timestamp >= segment.start && timestamp <= segment.end
      )

      return chunk ? { start: chunk.start, end: chunk.end } : null
      */
    } catch (error) {
      console.error('[SM] Failed to get transcript chunk:', error)
      return null
    }
  }

  private async handleSetInPoint() {

    // NUCLEAR PRINCIPLE: Pause video properly using the async method
    try {
      await this.videoController.pauseVideo()
    } catch (error) {
      console.error('[SM] Failed to pause video for in point:', error)
      // Continue anyway - setting the point is more important than pausing
    }

    const currentTime = this.videoController.getCurrentTime()
    const currentOutPoint = this.context.segmentState.outPoint

    // NUCLEAR PRINCIPLE: Atomic update with validation
    // If new in point is after current out point, clear out point
    let newOutPoint = currentOutPoint
    if (currentOutPoint !== null && currentTime >= currentOutPoint) {
      newOutPoint = null
    }

    // NUCLEAR PRINCIPLE: Single atomic update
    this.updateContext({
      ...this.context,
      videoState: {
        ...this.context.videoState,
        isPlaying: false  // Reflect that video is paused
      },
      segmentState: {
        inPoint: currentTime,
        outPoint: newOutPoint,
        isComplete: newOutPoint !== null && currentTime < newOutPoint,
        sentToChat: false  // Reset when segment changes
      }
    })

  }
  
  private async handleSetOutPoint() {

    // NUCLEAR PRINCIPLE: Pause video properly using the async method
    try {
      await this.videoController.pauseVideo()
    } catch (error) {
      console.error('[SM] Failed to pause video for out point:', error)
      // Continue anyway - setting the point is more important than pausing
    }

    const currentTime = this.videoController.getCurrentTime()
    const currentInPoint = this.context.segmentState.inPoint

    // NUCLEAR PRINCIPLE: Atomic update with validation
    // If new out point is before current in point, clear in point
    let newInPoint = currentInPoint
    if (currentInPoint !== null && currentTime <= currentInPoint) {
      newInPoint = null
    }

    // If no in point was set, set it to 0
    if (newInPoint === null && currentInPoint === null) {
      newInPoint = 0
    }

    this.updateContext({
      ...this.context,
      videoState: {
        ...this.context.videoState,
        isPlaying: false
      },
      segmentState: {
        inPoint: newInPoint,
        outPoint: currentTime,
        isComplete: newInPoint !== null && newInPoint < currentTime,
        sentToChat: false  // Reset when segment changes
      }
    })
    
  }
  
  private async handleClearSegment() {

    // NUCLEAR PRINCIPLE: Reset to initial state
    this.updateContext({
      ...this.context,
      segmentState: {
        inPoint: null,
        outPoint: null,
        isComplete: false,
        sentToChat: false
      }
    })
  }

  private async handleUpdateSegment(command: Command) {

    // Update segment boundaries based on transcript chunk boundaries
    const { inPoint, outPoint } = command.payload

    this.updateContext({
      ...this.context,
      segmentState: {
        ...this.context.segmentState,
        inPoint,
        outPoint,
        isComplete: inPoint !== null && outPoint !== null && inPoint < outPoint
      }
    })
  }
  
  /**
   * Extract transcript text for a specific time range
   */
  private async getTranscriptSegmentText(videoId: string, startTime: number, endTime: number): Promise<string> {
    try {
      const response = await fetch(`/api/transcription/${videoId}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch transcript: ${response.status}`)
      }

      const data = await response.json()

      if (!data.success || !data.hasTranscript || !data.transcript) {
        return `No transcript available for segment ${this.formatTime(startTime)} - ${this.formatTime(endTime)}`
      }

      // If we have segments, extract text for the time range
      if (data.transcript.segments && Array.isArray(data.transcript.segments)) {
        const relevantSegments = data.transcript.segments.filter((segment: any) => {
          // Include segment if it overlaps with [startTime, endTime]
          return segment.start < endTime && segment.end > startTime
        })

        if (relevantSegments.length > 0) {
          // Sort by start time and extract text
          relevantSegments.sort((a: any, b: any) => a.start - b.start)
          const text = relevantSegments.map((segment: any) => segment.text.trim()).join(' ').trim()
          return text || `Segment ${this.formatTime(startTime)} - ${this.formatTime(endTime)}`
        }
      }

      // Fallback to full transcript text with time info
      return `Transcript segment ${this.formatTime(startTime)} - ${this.formatTime(endTime)}: ${data.transcript.text?.substring(0, 200) || 'No content available'}...`
    } catch (error) {
      console.error('Failed to get transcript segment text:', error)
      throw error
    }
  }

  private async handleSendSegmentToChat() {
    const { inPoint, outPoint, isComplete } = this.context.segmentState

    if (!isComplete || inPoint === null || outPoint === null) {
      console.error('[SM] Cannot send incomplete segment to chat')
      return
    }

    // Extract transcript text for the selected segment
    let transcriptText = ''
    if (this.videoId) {
      try {
        transcriptText = await this.getTranscriptSegmentText(this.videoId, inPoint, outPoint)
      } catch (error) {
        console.error('[SM] Failed to extract transcript segment:', error)
        transcriptText = `Segment ${this.formatTime(inPoint)} - ${this.formatTime(outPoint)}`
      }
    }

    console.log(`[SM] Sending segment to chat: ${this.formatTime(inPoint)} - ${this.formatTime(outPoint)}`)
    console.log(`[SM] Transcript text: "${transcriptText.substring(0, 100)}..."`)

    // NUCLEAR PRINCIPLE: Mark segment as sent to chat (as context, not message)
    // The segment stays active as context for the next message
    this.updateContext({
      ...this.context,
      segmentState: {
        ...this.context.segmentState,
        sentToChat: true,  // Mark as sent but keep the segment active
        transcriptText: transcriptText // Store the extracted text
      }
    })

  }

  private async handleReflectionSubmit(payload: { type: string, data: any }) {

    // Get current video timestamp
    const currentVideoTime = this.videoController.getCurrentTime()
    const formattedTime = this.formatTime(currentVideoTime)

    // Save reflection to database via API
    let reflectionResult: any = null
    try {
      reflectionResult = await this.saveReflectionToDatabase(payload.type, payload.data, currentVideoTime)
    } catch (error) {
      console.error('[SM] Failed to save reflection to database:', error)
      // Still show success message to user but log the error
    }
    
    // Now that reflection is submitted, clean up messages
    const filteredMessages = this.context.messages.map(msg => {
      // Mark the reflection agent prompt as PERMANENT
      if (msg.agentType === 'reflect' && msg.state === MessageState.UNACTIVATED) {
        return { ...msg, state: MessageState.PERMANENT }
      }
      return msg
    }).filter(msg => {
      // Remove the unactivated reflection intro
      if ((msg as any).reflectionIntro) return false
      // Remove reflection options
      if (msg.type === 'reflection-options') return false
      // Remove the "Paused at X:XX" system message since we'll have "PuzzleReflect • Voice Memo at X:XX"
      if (msg.id === this.context.agentState.currentSystemMessageId && msg.type === 'system') {
        return false
      }
      return true
    })
    
    let systemMessage = ''
    let aiMessage = ''
    const reflectionData: any = {
      type: payload.type,
      videoTimestamp: currentVideoTime
    }

    // Add reflection type-specific messages with PuzzleReflect prefix
    switch (payload.type) {
      case 'voice':
        systemMessage = `📍 PuzzleReflect • Voice Memo at ${formattedTime}`
        aiMessage = `Perfect! I've saved your ${payload.data.duration}s voice memo. This audio reflection will help reinforce what you're learning at this point in the video.`
        reflectionData.duration = payload.data.duration
        reflectionData.content = payload.data.audioUrl
        break
      case 'screenshot':
        systemMessage = `📍 PuzzleReflect • Screenshot at ${formattedTime}`
        aiMessage = `Great! I've captured your screenshot. Visual notes like this are excellent for remembering key concepts.`
        reflectionData.content = payload.data.imageUrl
        break
      case 'loom':
        systemMessage = `📍 PuzzleReflect • Loom Video at ${formattedTime}`
        aiMessage = `Excellent! I've linked your Loom video reflection. Recording your thoughts helps deepen understanding.`
        reflectionData.content = payload.data.loomUrl
        break
      default:
        systemMessage = `📍 PuzzleReflect • Reflection at ${formattedTime}`
        aiMessage = `I've saved your reflection. Taking time to reflect helps solidify your learning.`
    }

    // Add system message for activity tracking (now includes PuzzleReflect prefix)
    const timestampMessage: Message = {
      id: `sys-reflection-${Date.now()}`,
      type: 'system' as const,
      state: MessageState.PERMANENT,
      message: systemMessage,
      timestamp: Date.now(),
      // Add reflection metadata for playback functionality
      reflectionData: reflectionResult ? {
        type: payload.type,
        fileUrl: reflectionResult.fileUrl,
        duration: payload.data.duration,
        videoTimestamp: currentVideoTime
      } : undefined
    }

    // Audio message for voice memos (like WhatsApp/Messenger)
    const audioMessage: Message | null = payload.type === 'voice' && reflectionResult ? {
      id: `audio-${Date.now()}`,
      type: 'audio' as const,
      state: MessageState.PERMANENT,
      message: `Voice memo • ${formattedTime}`,
      timestamp: Date.now(),
      audioData: {
        fileUrl: reflectionResult.fileUrl,
        duration: payload.data.duration,
        videoTimestamp: currentVideoTime,
        reflectionId: reflectionResult.id
      }
    } : null

    // AI message with reflection data
    const aiResponse: Message = {
      id: `ai-${Date.now()}`,
      type: 'ai' as const,
      state: MessageState.PERMANENT,
      message: aiMessage,
      reflectionData, // Attach reflection data to AI message
      timestamp: Date.now()
    }

    // Add countdown message
    const countdownId = `countdown-${Date.now()}`
    const countdownMessage: Message = {
      id: countdownId,
      type: 'system' as const,
      state: MessageState.PERMANENT,
      message: 'Video continues in 3...',
      timestamp: Date.now()
    }
    
    // Build messages array conditionally
    const newMessages = [
      ...filteredMessages,
      timestampMessage,
      ...(audioMessage ? [audioMessage] : []), // Add audio message if it exists
      aiResponse,
      countdownMessage
    ]
    
    this.updateContext({
      ...this.context,
      messages: newMessages
    })

    // Start countdown to resume video
    this.startVideoCountdown(countdownId)
  }

  // Recording state handlers
  private async handleRecordingStarted() {
    this.updateContext({
      ...this.context,
      recordingState: {
        isRecording: true,
        isPaused: false
      }
    })
  }

  private async handleRecordingPaused() {
    this.updateContext({
      ...this.context,
      recordingState: {
        ...this.context.recordingState,
        isPaused: true
      }
    })
  }

  private async handleRecordingResumed() {
    this.updateContext({
      ...this.context,
      recordingState: {
        ...this.context.recordingState,
        isPaused: false
      }
    })
  }

  private async handleRecordingStopped() {
    this.updateContext({
      ...this.context,
      recordingState: {
        isRecording: false,
        isPaused: false
      }
    })
  }

  /**
   * Cleanup method for proper instance destruction
   * Added for Phase 1.2 - Instance-based state machine
   */
  destroy() {
    
    // Clear all subscribers
    this.subscribers.clear()
    
    // Clear command queue
    this.commandQueue.clear()
    
    // Reset context to initial state
    this.context = {
      state: SystemState.VIDEO_PAUSED,
      videoState: { isPlaying: false, currentTime: 0, duration: 0 },
      agentState: { currentUnactivatedId: null, currentSystemMessageId: null, activeType: null },
      aiState: { isGenerating: false, generatingType: null, streamedContent: '', error: null },
      segmentState: { inPoint: null, outPoint: null, isComplete: false, sentToChat: false },
      recordingState: { isRecording: false, isPaused: false },
      messages: [],
      errors: []
    }
    
    // Clear references
    this.videoController = null as any
    this.messageManager = null as any
    this.commandQueue = null as any
  }
}