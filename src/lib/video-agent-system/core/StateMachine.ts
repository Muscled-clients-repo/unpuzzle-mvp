import { SystemContext, SystemState, MessageState, Message, Action } from '../types/states'
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
  
  public setVideoRef(ref: VideoRef) {
    this.videoController.setVideoRef(ref)
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
    }
  }
  
  private async handleShowAgent(agentType: string) {
    console.log(`[SM] Showing agent: ${agentType}`)
    
    // Flow 3 & 4: Clear ONLY unactivated agents (keep activated/rejected)
    this.clearUnactivatedMessages()
    
    // Flow 2: Pause video if playing (Issue #1 FIXED)
    if (this.context.videoState.isPlaying) {
      try {
        await this.videoController.pauseVideo()
        // Video controller already updates Zustand, no need to update here
      } catch (error) {
        console.error('Failed to pause video:', error)
        // Still show agent even if pause fails - user experience is priority
      }
    }
    
    // 3. Add system message with proper typing
    const systemMessage: Message = {
      id: `sys-${Date.now()}`,
      type: 'system' as const,
      state: MessageState.UNACTIVATED,
      message: `Paused at ${this.formatTime(this.context.videoState.currentTime)}`,
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
    
    // 5. Update context atomically
    this.updateContext({
      ...this.context,
      state: SystemState.AGENT_SHOWING_UNACTIVATED,
      agentState: {
        currentUnactivatedId: agentMessage.id,
        currentSystemMessageId: systemMessage.id,
        activeType: agentType as 'hint' | 'quiz' | 'reflect' | 'path'
      },
      messages: [
        ...this.context.messages,
        systemMessage,
        agentMessage
      ]
    })
  }
  
  private async handleManualPause(time: number) {
    console.log(`[SM] Manual pause at ${time}`)
    
    // Flow 1: Manual pause always shows Hint agent
    this.clearUnactivatedMessages()
    
    const systemMessage: Message = {
      id: `sys-${Date.now()}`,
      type: 'system' as const,
      state: MessageState.UNACTIVATED,
      message: `Paused at ${this.formatTime(time)}`,
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
        activeType: 'hint'
      },
      messages: [...this.context.messages, systemMessage, hintMessage]
    })
  }
  
  private async handleVideoResume() {
    console.log('[SM] Video resumed')
    
    // Flow 5: Remove ONLY unactivated messages
    // Flow 5b: Keep activated/rejected messages
    const filteredMessages = this.context.messages.filter(msg => {
      // Keep if activated or rejected or permanent
      if (msg.state === MessageState.ACTIVATED || 
          msg.state === MessageState.REJECTED ||
          msg.state === MessageState.PERMANENT) {
        return true
      }
      // Remove if unactivated
      return false
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
        activeType: null
      },
      messages: filteredMessages
    })
  }
  
  private async handleAcceptAgent(agentId: string) {
    console.log(`[SM] Agent accepted: ${agentId}`)
    
    // Flow 6: Agent Acceptance
    const updatedMessages = this.context.messages.map(msg => {
      if (msg.id === agentId) {
        // Change state to activated, remove buttons
        return { ...msg, state: MessageState.ACTIVATED, actions: undefined }
      }
      // Also mark the linked system message as permanent
      if (msg.id === this.context.agentState.currentSystemMessageId) {
        return { ...msg, state: MessageState.PERMANENT }
      }
      return msg
    })
    
    // Generate AI response
    const agentType = this.context.agentState.activeType
    const aiResponse: Message = {
      id: `ai-${Date.now()}`,
      type: 'ai' as const,
      state: MessageState.PERMANENT,
      message: this.generateAIResponse(agentType),
      timestamp: Date.now()
    }
    
    this.updateContext({
      ...this.context,
      state: SystemState.AGENT_ACTIVATED,
      messages: [...updatedMessages, aiResponse],
      agentState: {
        ...this.context.agentState,
        currentUnactivatedId: null // No longer unactivated
      }
    })
  }
  
  private async handleRejectAgent(agentId: string) {
    console.log(`[SM] Agent rejected: ${agentId}`)
    
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
  
  private clearUnactivatedMessages() {
    // Issue #3 FIXED: Only update if there are unactivated messages
    const hasUnactivated = this.context.messages.some(
      msg => msg.state === MessageState.UNACTIVATED
    )
    
    if (!hasUnactivated) return // Avoid unnecessary updates
    
    const filtered = this.context.messages.filter(
      msg => msg.state !== MessageState.UNACTIVATED
    )
    this.updateContext({
      ...this.context,
      messages: filtered,
      agentState: {
        ...this.context.agentState,
        currentUnactivatedId: null,
        currentSystemMessageId: null
      }
    })
  }
  
  private updateContext(newContext: SystemContext) {
    this.context = newContext
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
  
  private generateAIResponse(agentType: string | null): string {
    switch (agentType) {
      case 'hint':
        return 'Here\'s a hint: Pay attention to how the state is being managed in this section. The pattern used here will be important for the upcoming exercises.'
      case 'quiz':
        return 'Quiz Time! Based on what you\'ve watched, what is the primary purpose of the useState hook?\n\n1. To fetch data from an API\n2. To manage local component state\n3. To handle side effects\n4. To optimize performance\n\nType the number of your answer!'
      case 'reflect':
        return 'Let\'s reflect on what you\'ve learned:\n\n• What was the most important concept?\n• How does this connect to what you already know?\n• Where could you apply this knowledge?\n\nTake a moment to think about these questions.'
      case 'path':
        return 'Based on your progress, here\'s your personalized learning path:\n\n✅ Completed: Introduction to React\n📍 Current: React Hooks\n🔜 Next: State Management\n\nRecommended next steps:\n1. Practice with useState (15 min)\n2. Learn useEffect (20 min)\n3. Build a mini project (30 min)'
      default:
        return 'I\'m here to help you learn. Feel free to ask any questions!'
    }
  }
}