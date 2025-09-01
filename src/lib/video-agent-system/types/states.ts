// Every possible state the system can be in
export enum SystemState {
  // Video states
  VIDEO_PLAYING = 'VIDEO_PLAYING',
  VIDEO_PAUSED = 'VIDEO_PAUSED',
  VIDEO_PAUSING = 'VIDEO_PAUSING',
  VIDEO_RESUMING = 'VIDEO_RESUMING',
  
  // Agent states
  AGENT_NONE = 'AGENT_NONE',
  AGENT_SHOWING_UNACTIVATED = 'AGENT_SHOWING_UNACTIVATED',
  AGENT_ACTIVATED = 'AGENT_ACTIVATED',
  AGENT_REJECTED = 'AGENT_REJECTED',
  AGENT_SWITCHING = 'AGENT_SWITCHING',
  
  // Error states
  ERROR_VIDEO_CONTROL = 'ERROR_VIDEO_CONTROL',
  ERROR_RECOVERY = 'ERROR_RECOVERY'
}

export enum MessageState {
  UNACTIVATED = 'unactivated',
  ACTIVATED = 'activated',
  REJECTED = 'rejected',
  PERMANENT = 'permanent'
}

export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
}

export interface QuizState {
  questions: QuizQuestion[]
  currentQuestionIndex: number
  userAnswers: (number | null)[]
  score: number
  isComplete: boolean
}

export interface ReflectionData {
  type: 'voice' | 'screenshot' | 'loom'
  content?: string  // URL or base64 data
  duration?: number // For voice memos
  transcript?: string // For voice transcription
  videoTimestamp?: number // Video timestamp when reflection was made
}

export interface QuizResultData {
  score: number
  total: number
  percentage: number
  completedAt: number
  questions: {
    questionId: string
    question: string
    userAnswer: number
    correctAnswer: number
    isCorrect: boolean
    explanation: string
    options: string[]
  }[]
}

export interface Message {
  id: string
  type: 'system' | 'agent-prompt' | 'ai' | 'user' | 'quiz-question' | 'quiz-result' | 'reflection-options' | 'reflection-complete' | 'ai-loading'
  agentType?: 'hint' | 'quiz' | 'reflect' | 'path'
  state: MessageState
  message: string
  timestamp: number
  linkedMessageId?: string
  quizData?: QuizQuestion
  quizState?: QuizState
  reflectionData?: ReflectionData
  quizResult?: QuizResultData  // For quiz completion messages
  actions?: {
    onAccept?: () => void
    onReject?: () => void
  }
}

export interface SystemError {
  id: string
  type: 'upgrade_required' | 'network_error' | 'video_error' | 'ai_error'
  message: string
  timestamp: number
}

export interface SystemContext {
  state: SystemState
  videoState: {
    isPlaying: boolean
    currentTime: number
    duration: number
    videoId?: string
    courseId?: string
  }
  agentState: {
    currentUnactivatedId: string | null
    currentSystemMessageId: string | null
    activeType: 'hint' | 'quiz' | 'reflect' | 'path' | null
  }
  segmentState: {
    inPoint: number | null
    outPoint: number | null
    isComplete: boolean
    sentToChat: boolean  // Track if segment has been sent as context
  }
  recordingState: {
    isRecording: boolean
    isPaused: boolean
  }
  messages: Message[]
  errors: SystemError[]
}

export interface Action {
  type: 'AGENT_BUTTON_CLICKED' | 'VIDEO_MANUALLY_PAUSED' | 'VIDEO_PLAYED' | 'ACCEPT_AGENT' | 'REJECT_AGENT' | 'QUIZ_ANSWER_SELECTED' | 'REFLECTION_SUBMITTED' | 'REFLECTION_TYPE_CHOSEN' | 'REFLECTION_CANCELLED' | 'SET_IN_POINT' | 'SET_OUT_POINT' | 'CLEAR_SEGMENT' | 'SEND_SEGMENT_TO_CHAT' | 'RECORDING_STARTED' | 'RECORDING_PAUSED' | 'RECORDING_RESUMED' | 'RECORDING_STOPPED'
  payload: any
}