import { SystemContext, SystemState, MessageState, Message, Action, QuizQuestion, QuizState, SystemError } from '../types/states'
import { Command, CommandType } from '../types/commands'
import { CommandQueue } from './CommandQueue'
import { VideoController, VideoRef } from './VideoController'
import { MessageManager } from './MessageManager'

export class VideoAgentStateMachine {
  private context: SystemContext
  private commandQueue: CommandQueue
  private videoController: VideoController
  private messageManager: MessageManager
  private subscribers: Set<(context: SystemContext) => void> = new Set()
  
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
    this.videoController = new VideoController()
    this.messageManager = new MessageManager()
    
    // Connect command queue to state machine
    this.commandQueue.executeCommand = this.executeCommand.bind(this)
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[SM] State Machine initialized', this.context)
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
    return Object.freeze(JSON.parse(JSON.stringify(this.context)))
  }
  
  public setVideoRef(ref: VideoRef, videoId?: string, courseId?: string) {
    this.videoController.setVideoRef(ref)
    // Update video context with IDs
    if (videoId || courseId) {
      this.updateContext({
        ...this.context,
        videoState: {
          ...this.context.videoState,
          videoId: videoId || this.context.videoState.videoId,
          courseId: courseId || this.context.videoState.courseId
        }
      })
    }
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
    
    console.log(`[SM] Showing agent: ${agentType}, passed time: ${passedTime}`)
    
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
    console.log(`[SM] Using video time: ${currentVideoTime}`)
    
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
      agentType: agentType as 'hint' | 'quiz' | 'reflect' | 'path',
      state: MessageState.UNACTIVATED,
      message: this.getAgentPrompt(agentType),
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
  }
  
  private async handleManualPause(time: number) {
    console.log(`[SM] Manual pause at ${time}`)
    console.log('[SM] Current agent state:', JSON.stringify(this.context.agentState))
    console.log('[SM] Current system state:', this.context.state)
    console.log('[SM] Active agent type:', this.context.agentState.activeType)
    
    // NUCLEAR PRINCIPLE: Use agent state as single source of truth
    // If there's an active agent, don't show hint
    if (this.context.agentState.activeType) {
      console.log(`[SM] Agent ${this.context.agentState.activeType} is active - not showing hint`)
      this.updateContext({
        ...this.context,
        state: SystemState.VIDEO_PAUSED,
        videoState: {
          ...this.context.videoState,
          isPlaying: false
        }
      })
      return
    }
    
    // NUCLEAR PRINCIPLE: Simple, deterministic behavior
    // No agent active? Show hint. That's it.
    const currentMessages = this.context.messages.filter(msg => {
      // Remove any unactivated messages from before
      if (msg.state === MessageState.UNACTIVATED) return false
      // Remove transient UI
      if (msg.type === 'reflection-options') return false
      return true
    })
    
    const systemMessage: Message = {
      id: `sys-${Date.now()}`,
      type: 'system' as const,
      state: MessageState.UNACTIVATED,
      message: this.context.recordingState.isRecording ? `Recording paused at ${this.formatTime(time)}` : `Paused at ${this.formatTime(time)}`,
      timestamp: Date.now()
    }
    
    const hintMessage: Message = {
      id: `agent-${Date.now()}`,
      type: 'agent-prompt' as const,
      agentType: 'hint' as const,
      state: MessageState.UNACTIVATED,
      message: 'Do you want a hint about what\'s happening at this timestamp?',
      timestamp: Date.now(),
      linkedMessageId: systemMessage.id
    }
    
    this.updateContext({
      ...this.context,
      state: SystemState.AGENT_SHOWING_UNACTIVATED,
      agentState: {
        currentUnactivatedId: hintMessage.id,
        currentSystemMessageId: systemMessage.id,
        activeType: null  // Don't set active until hint is accepted
      },
      messages: [...currentMessages, systemMessage, hintMessage]  // Use filtered messages
    })
  }
  
  private async handleVideoResume() {
    console.log('[SM] Video resumed')
    console.log('[SM] Current agent state:', JSON.stringify(this.context.agentState))
    console.log('[SM] Current system state:', this.context.state)
    
    // NUCLEAR PRINCIPLE: Use agent state as single source of truth
    // Special handling for active agents
    if (this.context.agentState.activeType === 'quiz') {
      console.log('[SM] Quiz in progress - keeping quiz UI while video plays')
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
        console.log('[SM] Reflection committed - keeping UI while video plays')
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
        console.log('[SM] Reflection not committed - will clear')
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
    console.log(`[SM] Agent accepted: ${agentId}`)
    
    // Check if this agent has already been processed (no longer UNACTIVATED)
    const agentMessage = this.context.messages.find(msg => msg.id === agentId)
    if (!agentMessage || agentMessage.state !== MessageState.UNACTIVATED) {
      console.log(`[SM] Agent ${agentId} already processed, ignoring duplicate accept`)
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
        case 'hint': return 'PuzzleHint'
        case 'quiz': return 'PuzzleCheck'
        case 'reflect': return 'PuzzleReflect'
        case 'path': return 'PuzzlePath'
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
    
    // Add loading message immediately
    const loadingMessage: Message = {
      id: `loading-${Date.now()}`,
      type: 'ai-loading' as const,
      state: MessageState.PERMANENT,
      message: 'Generating response...',
      timestamp: Date.now()
    }
    
    // Update context with loading message immediately
    this.updateContext({
      ...this.context,
      state: SystemState.AGENT_ACTIVATED,
      messages: [...messagesWithActivation, loadingMessage],
      agentState: {
        ...this.context.agentState,
        currentUnactivatedId: null,
        activeType: agentType as 'hint' | 'quiz' | 'reflect' | 'path' | null
      }
    })
    
    // Generate AI response asynchronously
    const aiResponseText = await this.generateAIResponse(agentType)
    
    // Check if upgrade is required
    if (aiResponseText === '__UPGRADE_REQUIRED__') {
      console.log('🚫 Upgrade required - removing loading message and keeping error in context')
      // Remove loading message since we can't provide AI response
      const updatedMessagesWithoutLoading = this.context.messages.filter(msg => 
        msg.id !== loadingMessage.id
      )
      
      this.updateContext({
        ...this.context,
        state: SystemState.AGENT_REJECTED, // Reset to rejected state
        messages: updatedMessagesWithoutLoading,
        agentState: {
          ...this.context.agentState,
          currentUnactivatedId: null,
          activeType: null
        }
      })
      return
    }
    
    // Replace loading message with actual AI response
    const aiResponse: Message = {
      id: `ai-${Date.now()}`,
      type: 'ai' as const,
      state: MessageState.PERMANENT,
      message: aiResponseText,
      timestamp: Date.now()
    }
    
    // Update messages by replacing loading message with AI response
    const updatedMessagesWithResponse = this.context.messages.map(msg => 
      msg.id === loadingMessage.id ? aiResponse : msg
    )
    
    this.updateContext({
      ...this.context,
      state: SystemState.AGENT_ACTIVATED,
      messages: updatedMessagesWithResponse,
      agentState: {
        ...this.context.agentState,
        currentUnactivatedId: null,
        activeType: null // Clear active type for hint/path agents
      }
    })
  }
  
  private async handleRejectAgent(agentId: string) {
    console.log(`[SM] Agent rejected: ${agentId}`)
    
    // Check if this agent has already been processed (no longer UNACTIVATED)
    const agentMessage = this.context.messages.find(msg => msg.id === agentId)
    if (!agentMessage || agentMessage.state !== MessageState.UNACTIVATED) {
      console.log(`[SM] Agent ${agentId} already processed, ignoring duplicate reject`)
      return
    }
    
    // Flow 7: Agent Rejection
    const updatedMessages = this.context.messages.map(msg => {
      if (msg.id === agentId) {
        // Change state to rejected, remove buttons
        return { ...msg, state: MessageState.REJECTED, actions: undefined }
      }
      // Also mark the linked system message as permanent
      if (msg.id === this.context.agentState.currentSystemMessageId) {
        return { ...msg, state: MessageState.PERMANENT }
      }
      return msg
    })
    
    this.updateContext({
      ...this.context,
      state: SystemState.AGENT_REJECTED,
      messages: updatedMessages,
      agentState: {
        ...this.context.agentState,
        currentUnactivatedId: null // No longer unactivated
      }
    })
  }
  
  // REMOVED: clearUnactivatedMessages and clearReflectionOptions
  // NUCLEAR PRINCIPLE: All message filtering happens inline in the handlers
  // No separate methods that do their own updateContext calls
  
  private updateContext(newContext: SystemContext) {
    const prevActiveType = this.context.agentState.activeType
    this.context = newContext
    const newActiveType = this.context.agentState.activeType
    
    if (prevActiveType !== newActiveType) {
      console.log(`[SM] ActiveType changed: ${prevActiveType} -> ${newActiveType}`)
    }
    
    this.notifySubscribers()
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
  
  private getAgentPrompt(type: string): string {
    switch (type) {
      case 'hint': return 'Do you want a hint about what\'s happening at this timestamp?'
      case 'quiz': return 'Do you want to be quizzed about what you\'ve learned?'
      case 'reflect': return 'Would you like to reflect on what you\'ve learned?'
      case 'path': return 'Want a personalized learning path based on your progress?'
      default: return 'How can I help you?'
    }
  }
  
  private async generateAIResponse(agentType: string | null): Promise<string> {
    try {
      // Import the AI service
      const { aiService } = await import('@/services/ai-service')
      
      // Get proper video context with all required fields
      const currentTime = this.videoController?.getCurrentTime() || 0
      const videoContext = {
        videoId: this.context.videoState?.videoId || 'video-unknown',
        timestamp: currentTime,
        courseId: this.context.videoState?.courseId || undefined
      }
      
      console.log('[AI] Generating response with context:', videoContext)
      
      // Generate specialized prompts based on agent type for hints
      let prompt = ''
      switch (agentType) {
        case 'hint':
          // More specific hint prompt that tells AI to analyze video content
          prompt = `Based on the video content at timestamp ${Math.round(currentTime)} seconds (${this.formatTime(currentTime)}), provide a helpful hint about the key concept being discussed. The hint should guide the learner without giving away the complete answer. Focus on the learning objective at this point in the video.`
          break
        case 'quiz':
          prompt = `Based on the video content up to timestamp ${Math.round(currentTime)} seconds (${this.formatTime(currentTime)}), create an engaging multiple-choice quiz question that tests understanding of the key concept just covered.`
          break
        case 'reflect':
          prompt = `Based on what was just covered in the video at timestamp ${Math.round(currentTime)} seconds (${this.formatTime(currentTime)}), generate thought-provoking reflection questions that help the learner connect this concept to their existing knowledge.`
          break
        case 'path':
          prompt = `Based on the learner's progress at timestamp ${Math.round(currentTime)} seconds (${this.formatTime(currentTime)}) in this video, suggest a personalized learning path with next steps and recommended topics to explore.`
          break
        default:
          prompt = `Help the learner understand the concept being discussed at timestamp ${Math.round(currentTime)} seconds in this educational video.`
      }
      
      // Call AI service with proper context
      const result = await aiService.sendChatMessage(prompt, videoContext)
      
      console.log('[AI] Response received:', result)
      
      if (result.error) {
        console.error('AI Service Error:', result.error)
        
        // Check for rate limit error and trigger upgrade widget
        console.log('🔍 StateMachine checking result:', { 
          error: result.error, 
          upgrade_required: result.upgrade_required,
          upgrade_message: result.upgrade_message 
        })
        if (result.error === 'rate_limit_exceeded' && result.upgrade_required) {
          console.log('🚫🚫🚫 NEW STATEMACHINE CODE: Rate limit exceeded, triggering upgrade widget! 🚫🚫🚫')
          // Add upgrade message to system context
          this.addUpgradeMessage(result.upgrade_message || 'Daily AI limit reached. Upgrade to Premium for unlimited AI help!')
          // Return special indicator to signal upgrade required
          return '__UPGRADE_REQUIRED__'
        }
        
        // Fallback to default responses for other errors
        return this.getDefaultResponse(agentType)
      }
      
      // Extract the actual message content
      const responseContent = result.data?.content || ''
      
      if (!responseContent) {
        console.warn('[AI] Empty response received, using fallback')
        return this.getDefaultResponse(agentType)
      }
      
      return responseContent
      
    } catch (error) {
      console.error('Failed to generate AI response:', error)
      // Fallback to default responses
      return this.getDefaultResponse(agentType)
    }
  }
  
  private addUpgradeMessage(message: string) {
    // Add upgrade message to context - this can be handled by the UI
    const upgradeError: SystemError = {
      id: `upgrade-${Date.now()}`,
      type: 'upgrade_required',
      message,
      timestamp: Date.now()
    }
    
    this.updateContext({
      ...this.context,
      errors: [...this.context.errors, upgradeError]
    })
  }

  private getDefaultResponse(agentType: string | null): string {
    switch (agentType) {
      case 'hint':
        return 'Here\'s a hint: Pay attention to how the state is being managed in this section. The pattern used here will be important for the upcoming exercises.'
      case 'quiz':
        return 'Starting your quiz now! Answer each question to the best of your ability.'
      case 'reflect':
        return 'Let\'s reflect on what you\'ve learned:\n\n• What was the most important concept?\n• How does this connect to what you already know?\n• Where could you apply this knowledge?\n\nTake a moment to think about these questions.'
      case 'path':
        return 'Based on your progress, here\'s your personalized learning path:\n\n✅ Completed: Introduction to React\n📍 Current: React Hooks\n🔜 Next: State Management\n\nRecommended next steps:\n1. Practice with useState (15 min)\n2. Learn useEffect (20 min)\n3. Build a mini project (30 min)'
      default:
        return 'I\'m here to help you learn. Feel free to ask any questions!'
    }
  }

  private async generateQuizQuestions(): Promise<QuizQuestion[]> {
    try {
      // Import the API client
      const { apiClient } = await import('@/lib/api-client')
      
      // Get video context
      const currentTime = this.videoController?.getCurrentTime() || 0
      const videoId = this.context.videoState?.videoId || 'video-unknown'
      
      // Generate multiple quiz questions
      const questions: QuizQuestion[] = []
      const numQuestions = 3 // Generate 3 questions
      
      for (let i = 0; i < numQuestions; i++) {
        const payload = {
          video_id: videoId,
          difficulty_level: 'medium',
          timestamp: currentTime // Use current timestamp for context
        }
        
        console.log(`[Quiz] Generating question ${i + 1}/${numQuestions}:`, payload)
        
        const response = await apiClient.post('/api/v1/ai-assistant/agents/quiz/', payload)
        
        if (response.error) {
          console.error(`Failed to generate quiz question ${i + 1}:`, response.error)
          continue
        }
        
        // Map API response to QuizQuestion format
        const questionData = response.data as {
          question: string
          options: string[]
          correctAnswer: number
          explanation: string
        }
        questions.push({
          id: `q${i + 1}`,
          question: questionData.question,
          options: questionData.options,
          correctAnswer: questionData.correctAnswer,
          explanation: questionData.explanation
        })
      }
      
      // If API fails, fallback to default questions
      if (questions.length === 0) {
        console.warn('[Quiz] API failed, using fallback questions')
        return this.getFallbackQuizQuestions()
      }
      
      return questions
    } catch (error) {
      console.error('[Quiz] Failed to generate questions:', error)
      return this.getFallbackQuizQuestions()
    }
  }
  
  private getFallbackQuizQuestions(): QuizQuestion[] {
    // Fallback questions if API fails
    return [
      {
        id: 'q1',
        question: 'What concept was just discussed in the video?',
        options: [
          'Review the video content',
          'Pay attention to key terms',
          'Focus on the main topic',
          'Consider the examples shown'
        ],
        correctAnswer: 2,
        explanation: 'Focus on understanding the main topic that was covered in this section.'
      }
    ]
  }

  private async startQuiz(updatedMessages: Message[]) {
    console.log('[SM] Starting quiz')
    
    // Show loading message while generating questions
    const loadingMessage: Message = {
      id: `loading-${Date.now()}`,
      type: 'ai-loading' as const,
      state: MessageState.PERMANENT,
      message: 'Generating quiz questions based on the video content...',
      timestamp: Date.now()
    }
    
    this.updateContext({
      ...this.context,
      messages: [...updatedMessages, loadingMessage],
      agentState: {
        ...this.context.agentState,
        activeType: 'quiz'
      }
    })
    
    // Generate questions from API
    const questions = await this.generateQuizQuestions()
    
    // Remove loading message and add quiz
    const messagesWithoutLoading = this.context.messages.filter(msg => msg.id !== loadingMessage.id)
    
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
      messages: [...messagesWithoutLoading, aiIntro, firstQuestion],
      agentState: {
        ...this.context.agentState,
        currentUnactivatedId: null,
        activeType: 'quiz'  // Keep quiz as active agent
      }
    })
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
        console.log('[SM] Countdown complete - dispatching state clear')
        
        // First clear the countdown message
        const updatedMessages = this.context.messages.filter(msg => msg.id !== countdownMessageId)
        
        // CRITICAL: Must clear activeType for manual pause to show hint
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
        console.log('[SM] State after countdown reset:')
        console.log('[SM] - activeType:', this.context.agentState.activeType, '(should be null)')
        console.log('[SM] - state:', this.context.state)
        
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
    console.log('[SM] Quiz answer selected:', payload)
    console.log('[SM] Current activeType before processing:', this.context.agentState.activeType)
    
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
      
      console.log('[SM] Quiz complete - starting countdown with quiz still active')
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
    console.log('[SM] Starting reflection')
    
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
    console.log('[SM] Reflection type chosen:', payload.reflectionType)
    
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
    console.log('[SM] Reflection cancelled')
    
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
  private async handleSetInPoint() {
    console.log('[SM] Setting in point')
    
    // NUCLEAR PRINCIPLE: Pause video properly using the async method
    try {
      await this.videoController.pauseVideo()
      console.log('[SM] Video paused for in point')
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
      console.log('[SM] In point >= out point, clearing out point')
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
    
    console.log(`[SM] In point set to ${this.formatTime(currentTime)}`)
  }
  
  private async handleSetOutPoint() {
    console.log('[SM] Setting out point')
    
    // NUCLEAR PRINCIPLE: Pause video properly using the async method
    try {
      await this.videoController.pauseVideo()
      console.log('[SM] Video paused for out point')
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
      console.log('[SM] Out point <= in point, clearing in point')
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
    
    console.log(`[SM] Out point set to ${this.formatTime(currentTime)}`)
  }
  
  private async handleClearSegment() {
    console.log('[SM] Clearing segment')
    
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
  
  private async handleSendSegmentToChat() {
    const { inPoint, outPoint, isComplete } = this.context.segmentState
    
    if (!isComplete || inPoint === null || outPoint === null) {
      console.error('[SM] Cannot send incomplete segment to chat')
      return
    }
    
    console.log(`[SM] Setting segment as chat context: ${this.formatTime(inPoint)} - ${this.formatTime(outPoint)}`)
    
    // NUCLEAR PRINCIPLE: Mark segment as sent to chat (as context, not message)
    // The segment stays active as context for the next message
    this.updateContext({
      ...this.context,
      segmentState: {
        ...this.context.segmentState,
        sentToChat: true  // Mark as sent but keep the segment active
      }
    })
    
    console.log('[SM] Segment set as chat context')
  }

  private async handleReflectionSubmit(payload: { type: string, data: any }) {
    console.log('[SM] Reflection submitted:', payload)
    
    // Get current video timestamp and context
    const currentVideoTime = this.videoController.getCurrentTime()
    const formattedTime = this.formatTime(currentVideoTime)
    const videoId = payload.data?.videoId
    const courseId = payload.data?.courseId
    
    // Show loading message immediately
    const loadingMessage: Message = {
      id: `loading-reflection-${Date.now()}`,
      type: 'ai-loading' as const,
      state: MessageState.PERMANENT,
      message: 'Saving your reflection...',
      timestamp: Date.now()
    }
    
    // Clean up messages and add loading
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
      // Remove the "Paused at X:XX" system message
      if (msg.id === this.context.agentState.currentSystemMessageId && msg.type === 'system') {
        return false
      }
      return true
    })
    
    // Update context with loading state
    this.updateContext({
      ...this.context,
      messages: [...filteredMessages, loadingMessage]
    })
    
    try {
      // Validate we have a video ID
      if (!videoId) {
        throw new Error('Video ID is required to save reflection. Please ensure a video is loaded.')
      }
      
      // Call API to save reflection
      const reflection = await this.saveReflectionToAPI(payload, {
        videoId,
        courseId,
        timestamp: currentVideoTime
      })
      
      // Remove loading message and show success
      const messagesWithoutLoading = this.context.messages.filter(msg => msg.id !== loadingMessage.id)
      
      let systemMessage = ''
      let aiMessage = ''
      let reflectionData: any = {
        type: payload.type,
        videoTimestamp: currentVideoTime,
        reflectionId: reflection.id,
        mediaUrl: reflection.media_url
      }

      // Add reflection type-specific messages with PuzzleReflect prefix
      switch (payload.type) {
        case 'voice':
          systemMessage = `📍 PuzzleReflect • Voice Memo at ${formattedTime}`
          aiMessage = `Perfect! I've saved your ${payload.data.duration}s voice memo. This audio reflection will help reinforce what you're learning at this point in the video.`
          reflectionData.duration = payload.data.duration
          reflectionData.content = reflection.media_url || payload.data.audioUrl
          break
        case 'screenshot':
          systemMessage = `📍 PuzzleReflect • Screenshot at ${formattedTime}`
          aiMessage = `Great! I've captured your screenshot. Visual notes like this are excellent for remembering key concepts.`
          reflectionData.content = reflection.media_url || payload.data.imageUrl
          reflectionData.thumbnail = reflection.media_thumbnail
          break
        case 'loom':
          systemMessage = `📍 PuzzleReflect • Loom Video at ${formattedTime}`
          aiMessage = `Excellent! I've linked your Loom video reflection. Recording your thoughts helps deepen understanding.`
          reflectionData.content = reflection.loom_link || payload.data.loomUrl
          break
        default:
          systemMessage = `📍 PuzzleReflect • Reflection at ${formattedTime}`
          aiMessage = `I've saved your reflection. Taking time to reflect helps solidify your learning.`
      }

      // Add system message for activity tracking
      const timestampMessage: Message = {
        id: `sys-reflection-${Date.now()}`,
        type: 'system' as const,
        state: MessageState.PERMANENT,
        message: systemMessage,
        timestamp: Date.now()
      }

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
      
      const newMessages = [...messagesWithoutLoading, timestampMessage, aiResponse, countdownMessage]
      
      this.updateContext({
        ...this.context,
        messages: newMessages
      })

      // Start countdown to resume video
      this.startVideoCountdown(countdownId)
      
    } catch (error) {
      console.error('[SM] Reflection submission failed:', error)
      
      // Remove loading message and show error
      const messagesWithoutLoading = this.context.messages.filter(msg => msg.id !== loadingMessage.id)
      
      const errorMessage: Message = {
        id: `error-reflection-${Date.now()}`,
        type: 'ai' as const,
        state: MessageState.PERMANENT,
        message: `❌ Failed to save reflection: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: Date.now()
      }
      
      this.updateContext({
        ...this.context,
        messages: [...messagesWithoutLoading, errorMessage]
      })
      
      // Don't start countdown on error - let user retry
    }
  }
  
  /**
   * Save reflection to API with proper error handling
   * Submits directly to /api/v1/reflections/ with file support
   */
  private async saveReflectionToAPI(payload: { type: string, data: any }, context: { videoId: string, courseId?: string, timestamp: number }) {
    // Import reflection service
    const { reflectionService } = await import('@/services/reflection-service')
    
    try {
      // Debug: Check what data we received
      console.log('[SM] Received payload.data:', payload.data)
      
      // Prepare reflection data based on type - map frontend fields to API fields
      const reflectionData: any = {
        video_id: payload.data.videoId || context.videoId,  // Server expects 'video_id'
        course: payload.data.courseId || context.courseId,  // API expects 'course' not 'course_id'
        video_timestamp: payload.data.videoTimestamp || context.timestamp,  // Use from payload first
        reflection_type: payload.data.type || payload.type,  // Use from payload.data.type first
        title: payload.data.title || undefined, // Let service generate if not provided
        notes: payload.data.notes || undefined
      }
      
      // Handle type-specific data
      if (payload.type === 'voice' && payload.data.content) {
        // For voice, convert blob URL to File for upload
        const blobUrl = payload.data.content
        console.log('[SM] Fetching blob from URL:', blobUrl)
        
        const response = await fetch(blobUrl)
        console.log('[SM] Blob fetch response:', response.status, response.type)
        
        const audioBlob = await response.blob()
        console.log('[SM] Audio blob:', audioBlob.size, 'bytes, type:', audioBlob.type)
        
        const audioFile = new File([audioBlob], `voice-memo-${Date.now()}.webm`, {
          type: 'audio/webm'
        })
        console.log('[SM] Created audio file:', audioFile.name, audioFile.size, 'bytes, type:', audioFile.type)
        
        reflectionData.media_file = audioFile
        reflectionData.duration = payload.data.duration
        // Add text content for voice notes - use content as text if no notes provided
        reflectionData.text_content = payload.data.notes || payload.data.textContent || `Voice memo recorded at ${this.formatTime(context.timestamp)}`
        
      } else if (payload.type === 'screenshot' && payload.data.imageFile) {
        // For screenshot, include the file
        reflectionData.media_file = payload.data.imageFile
        // Add text content for screenshot notes  
        reflectionData.text_content = payload.data.notes || `Screenshot captured at ${this.formatTime(context.timestamp)}`
      } else if (payload.type === 'loom') {
        // For Loom, include the URL with correct field name
        reflectionData.loom_link = payload.data.loomUrl
        reflectionData.text_content = payload.data.notes || `Loom video shared at ${this.formatTime(context.timestamp)}`
      }

      console.log("reflectionData: ", reflectionData)
      
      // Submit to API with retry logic
      const result = await reflectionService.submitWithRetry(reflectionData, 2)
      
      if (result.error) {
        throw new Error(`Reflection creation failed: ${result.error}`)
      }
      
      console.log('[SM] Reflection saved successfully:', result.data?.id)
      return result.data!
      
    } catch (error) {
      console.error('[SM] saveReflectionToAPI error:', error)
      throw error
    }
  }

  // Recording state handlers
  private async handleRecordingStarted() {
    console.log('[SM] Recording started')
    this.updateContext({
      ...this.context,
      recordingState: {
        isRecording: true,
        isPaused: false
      }
    })
  }

  private async handleRecordingPaused() {
    console.log('[SM] Recording paused')
    this.updateContext({
      ...this.context,
      recordingState: {
        ...this.context.recordingState,
        isPaused: true
      }
    })
  }

  private async handleRecordingResumed() {
    console.log('[SM] Recording resumed')
    this.updateContext({
      ...this.context,
      recordingState: {
        ...this.context.recordingState,
        isPaused: false
      }
    })
  }

  private async handleRecordingStopped() {
    console.log('[SM] Recording stopped')
    this.updateContext({
      ...this.context,
      recordingState: {
        isRecording: false,
        isPaused: false
      }
    })
  }
}