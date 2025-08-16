export enum CommandType {
  // Video commands
  REQUEST_VIDEO_PAUSE = 'REQUEST_VIDEO_PAUSE',
  REQUEST_VIDEO_PLAY = 'REQUEST_VIDEO_PLAY',
  CONFIRM_VIDEO_PAUSED = 'CONFIRM_VIDEO_PAUSED',
  CONFIRM_VIDEO_PLAYING = 'CONFIRM_VIDEO_PLAYING',
  MANUAL_PAUSE = 'MANUAL_PAUSE',
  VIDEO_RESUME = 'VIDEO_RESUME',
  
  // Agent commands
  SHOW_AGENT = 'SHOW_AGENT',
  ACTIVATE_AGENT = 'ACTIVATE_AGENT',
  REJECT_AGENT = 'REJECT_AGENT',
  CLEAR_UNACTIVATED = 'CLEAR_UNACTIVATED',
  
  // System commands
  VERIFY_STATE = 'VERIFY_STATE',
  RECOVER_FROM_ERROR = 'RECOVER_FROM_ERROR'
}

export interface Command {
  id: string
  type: CommandType
  payload: any
  timestamp: number
  attempts: number
  maxAttempts: number
  status: 'pending' | 'processing' | 'complete' | 'failed'
  error?: Error
}