# State Machine & 3-Layer SSOT Implementation Analysis

## 🎯 Architecture Overview

The video learning platform implements a sophisticated **3-Layer Single Source of Truth (SSOT)** architecture coordinated by a centralized **VideoAgentStateMachine**. This analysis documents the actual working implementation for quiz, hint, and voice memo functionality.

## 🏗️ 3-Layer SSOT Architecture

### Layer 1: Server State (TanStack Query)
**Location**: `src/hooks/use-*-query.ts` and `src/hooks/use-*-mutation.ts`

**Actual Implementation**:
```typescript
// src/hooks/use-reflection-mutation.ts (Lines 15-71)
export function useReflectionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ReflectionMutationData) => {
      // Convert data to FormData for file upload
      const formData = new FormData()
      formData.append('type', data.type)
      formData.append('videoId', data.videoId)
      formData.append('courseId', data.courseId)
      formData.append('videoTimestamp', data.videoTimestamp.toString())

      if (data.file) {
        formData.append('file', data.file) // File object for voice memos
      }

      const result = await submitReflectionAction(formData)
      if (!result.success) {
        throw new Error(result.error || 'Failed to submit reflection')
      }
      return result.data
    },
    onSuccess: (data, variables) => {
      // Invalidate queries to refetch updated server state
      queryClient.invalidateQueries({
        queryKey: reflectionKeys.list(variables.videoId, variables.courseId)
      })
    }
  })
}
```

**Purpose**: Manages server state synchronization, file uploads, and data persistence.

### Layer 2: Form State (React State)
**Location**: Component-level state in `AIChatSidebarV2.tsx`

**Actual Implementation**:
```typescript
// Recording state management (Lines 44-47 in recordingState context)
recordingState: {
  isRecording: boolean
  isPaused: boolean
}

// Form data for voice memo recording
const startRecording = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  })

  // Real MediaRecorder implementation
  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus' : 'audio/mp4'
  const recorder = new MediaRecorder(stream, { mimeType })
}
```

**Purpose**: Handles user input state, form validation, and temporary UI state.

### Layer 3: UI State (State Machine)
**Location**: `src/lib/video-agent-system/core/StateMachine.ts`

**Actual Implementation**:
```typescript
// SystemContext interface (Lines 94-124 in types/states.ts)
export interface SystemContext {
  state: SystemState
  videoState: { isPlaying: boolean, currentTime: number, duration: number }
  agentState: {
    currentUnactivatedId: string | null
    currentSystemMessageId: string | null
    activeType: 'hint' | 'quiz' | 'reflect' | 'path' | null
  }
  aiState: {
    isGenerating: boolean
    generatingType: 'hint' | 'quiz' | null
    streamedContent: string
    error: string | null
  }
  recordingState: { isRecording: boolean, isPaused: boolean }
  messages: Message[]
  errors: Error[]
}
```

**Purpose**: Coordinates complex UI state, message flow, and inter-component communication.

## 🤖 Quiz Implementation

### State Machine Integration
**File**: `src/lib/video-agent-system/core/StateMachine.ts`

```typescript
// Quiz generation (Lines ~1050-1100)
private async generateQuizQuestions(videoId?: string, timestamp?: number): Promise<QuizQuestion[]> {
  if (!videoId || timestamp === undefined) {
    throw new Error('Video ID and timestamp required for quiz generation')
  }

  // Set loading state in aiState
  this.updateContext({
    ...this.context,
    aiState: {
      isGenerating: true,
      generatingType: 'quiz',
      streamedContent: '',
      error: null
    }
  })

  // Get transcript context for AI generation
  const transcriptSegment = await getTranscriptContextForAI(videoId, timestamp)

  // Call AI API endpoint
  const response = await fetch('/api/ai/quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoId,
      timestamp,
      transcriptSegment
    })
  })

  // Stream processing for real-time updates
  const reader = response.body?.getReader()
  let buffer = ''
  let streamedContent = ''

  while (true) {
    const { done, value } = await reader!.read()
    if (done) break

    buffer += new TextDecoder().decode(value)
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6))
        if (data.type === 'chunk') {
          streamedContent += data.content
          // Update streaming state in real-time
          this.updateContext({
            ...this.context,
            aiState: { ...this.context.aiState, streamedContent }
          })
        }
      }
    }
  }
}
```

### Quiz State Management
```typescript
// Quiz state structure (Lines 36-42 in types/states.ts)
export interface QuizState {
  questions: QuizQuestion[]
  currentQuestionIndex: number
  userAnswers: (number | null)[]
  score: number
  isComplete: boolean
}

// Quiz message creation (Lines ~1120-1140)
const quizState: QuizState = {
  questions,
  currentQuestionIndex: 0,
  userAnswers: new Array(questions.length).fill(null),
  score: 0,
  isComplete: false
}

const firstQuestion: Message = {
  id: `quiz-${Date.now()}`,
  type: 'quiz-question' as const,
  state: MessageState.PERMANENT,
  message: `Question 1 of ${questions.length}`,
  quizData: questions[0],
  quizState,
  timestamp: Date.now()
}
```

### Answer Processing
```typescript
// Quiz answer handling (Lines ~1200-1250)
private async handleQuizAnswer(payload: { questionIndex: number, selectedAnswer: number }) {
  const currentMessage = this.context.messages.find(msg => msg.type === 'quiz-question')
  if (!currentMessage?.quizState) return

  const { quizState, quizData } = currentMessage
  const newUserAnswers = [...quizState.userAnswers]
  newUserAnswers[payload.questionIndex] = payload.selectedAnswer

  // Calculate score
  const newScore = newUserAnswers.reduce((score, answer, index) => {
    if (answer === quizState.questions[index].correctAnswer) score++
    return score
  }, 0)

  const nextQuestionIndex = quizState.currentQuestionIndex + 1
  const isComplete = nextQuestionIndex >= quizState.questions.length

  // Update quiz state and create next question or completion
  if (isComplete) {
    // Create quiz completion message with results
    const completionMessage: Message = {
      id: `quiz-complete-${Date.now()}`,
      type: 'quiz-result' as const,
      state: MessageState.PERMANENT,
      message: `Quiz Complete! You scored ${newScore}/${quizState.questions.length}`,
      quizResult: {
        score: newScore,
        total: quizState.questions.length,
        percentage: Math.round((newScore / quizState.questions.length) * 100),
        completedAt: Date.now(),
        questions: quizState.questions.map((q, i) => ({
          questionId: q.id,
          question: q.question,
          userAnswer: newUserAnswers[i] || 0,
          correctAnswer: q.correctAnswer,
          isCorrect: newUserAnswers[i] === q.correctAnswer,
          explanation: q.explanation,
          options: q.options
        }))
      },
      timestamp: Date.now()
    }
  }
}
```

## 💡 Hint Implementation

### AI Hint Generation
**File**: `src/lib/video-agent-system/core/StateMachine.ts`

```typescript
// Hint generation (Lines ~980-1040)
private async generateAIHint(videoId?: string, timestamp?: number): Promise<string> {
  if (!videoId || timestamp === undefined) {
    throw new Error('Video ID and timestamp required for hint generation')
  }

  // Set loading state
  this.updateContext({
    ...this.context,
    aiState: {
      isGenerating: true,
      generatingType: 'hint',
      streamedContent: '',
      error: null
    }
  })

  // Get video transcript context for AI
  const transcriptSegment = await getTranscriptContextForAI(videoId, timestamp)

  // Call streaming AI hint API
  const response = await fetch('/api/ai/hint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoId,
      timestamp,
      transcriptSegment
    })
  })

  // Process streaming response
  const reader = response.body?.getReader()
  let buffer = ''
  let streamedContent = ''

  while (true) {
    const { done, value } = await reader!.read()
    if (done) break

    buffer += new TextDecoder().decode(value)
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6))
        if (data.type === 'chunk') {
          streamedContent += data.content
          // Real-time streaming update
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
          return streamedContent
        }
      }
    }
  }
}
```

### Video Coordination
```typescript
// Hint trigger with video pause (Lines ~550-600)
private async handleShowAgent(payload: any) {
  const agentType = typeof payload === 'string' ? payload : payload.agentType

  // NUCLEAR PRINCIPLE: Pause video first
  try {
    await this.videoController.pauseVideo()
  } catch (error) {
    console.error('Failed to pause video:', error)
  }

  // Generate AI response based on agent type
  if (agentType === 'hint') {
    const videoId = this.getVideoId()
    const currentTime = this.videoController.getCurrentTime()
    const aiMessage = await this.generateAIHint(videoId, currentTime)

    const aiResponse: Message = {
      id: `ai-${Date.now()}`,
      type: 'ai' as const,
      state: MessageState.PERMANENT,
      message: aiMessage,
      timestamp: Date.now()
    }
  }
}
```

## 🎤 Voice Memo Implementation

### Recording Infrastructure
**File**: `src/components/student/ai/AIChatSidebarV2.tsx`

```typescript
// Real MediaRecorder implementation (Lines ~650-750)
const startRecording = async () => {
  try {
    // Get user media with optimized audio settings
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 44100,
        channelCount: 1
      }
    })

    // Detect best supported format
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : MediaRecorder.isTypeSupported('audio/mp4')
      ? 'audio/mp4'
      : 'audio/webm' // Fallback

    console.log('[RECORDING] Using MIME type:', mimeType)

    // Create MediaRecorder with optimized settings
    const recorder = new MediaRecorder(stream, {
      mimeType,
      audioBitsPerSecond: 128000
    })

    // Collect audio chunks
    const chunks: Blob[] = []
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data)
      }
    }

    // Handle recording completion
    recorder.onstop = () => {
      const audioBlob = new Blob(chunks, { type: mimeType })
      console.log('[RECORDING] Audio blob created:', {
        size: audioBlob.size,
        type: audioBlob.type
      })

      // Convert blob to File for FormData upload
      const audioFile = new File([audioBlob], 'voice-memo.webm', {
        type: audioBlob.type || 'audio/webm'
      })

      // Submit via state machine
      dispatch({
        type: 'REFLECTION_SUBMITTED',
        payload: {
          type: 'voice',
          data: {
            file: audioFile,
            duration: recordingDuration,
            audioBlob
          }
        }
      })
    }
  }
}
```

### File Upload & Storage
**File**: `src/app/actions/reflection-actions.ts`

```typescript
// Reflection submission with file upload (Lines 87-165)
export async function submitReflectionAction(formData: FormData) {
  try {
    const user = await requireAuth()

    // Extract form data
    const type = formData.get('type') as string
    const videoId = formData.get('videoId') as string
    const courseId = formData.get('courseId') as string
    const videoTimestampStr = formData.get('videoTimestamp') as string
    const file = formData.get('file') as File | null
    const durationStr = formData.get('duration') as string | null

    const videoTimestamp = parseFloat(videoTimestampStr)
    const duration = durationStr ? parseFloat(durationStr) : undefined

    let contentUrl = null

    // Handle file upload for voice memos
    if (type === 'voice' && file) {
      // Validate file type
      if (!file.type.startsWith('audio/')) {
        return { success: false, error: 'Invalid file type for voice memo. Must be audio file.' }
      }

      // Upload to Backblaze B2 storage
      try {
        const fileName = `reflections/${user.id}/${Date.now()}-${file.name}`
        const uploadResult = await backblazeService.uploadVideo(file, fileName)
        contentUrl = uploadResult.fileUrl
      } catch (uploadError) {
        console.error('File upload failed:', uploadError)
        return { success: false, error: 'File upload failed' }
      }
    }

    // Prepare reflection text with metadata
    let reflectionText = `${type} reflection captured at ${videoTimestamp}s`
    if (contentUrl) {
      reflectionText += `\n\nFile URL: ${contentUrl}`
    }
    if (duration) {
      reflectionText += `\nDuration: ${duration}s`
    }

    // Save to database
    const { data: reflection, error: insertError } = await supabase
      .from('reflections')
      .insert({
        user_id: user.id,
        video_id: videoId,
        course_id: courseId,
        reflection_type: type,
        reflection_text: reflectionText,
        reflection_prompt: `Captured ${type} reflection at video timestamp ${videoTimestamp}`,
      })
      .select()
      .single()

    return {
      success: true,
      data: {
        ...reflection,
        fileUrl: contentUrl // Include URL for playback
      }
    }
  } catch (error) {
    console.error('Reflection submission error:', error)
    return { success: false, error: 'Internal server error' }
  }
}
```

### Signed URL System
**File**: `src/hooks/use-signed-url.ts`

```typescript
// Secure file access with signed URLs (Lines 26-169)
export function useSignedUrl(
  privateUrl: string | null,
  refreshBeforeMinutes: number = 30
): UseSignedUrlReturn {
  const [state, setState] = useState<SignedUrlState>({
    url: null,
    isLoading: false,
    error: null,
    expiresAt: null
  })

  // Global cache for performance
  const signedUrlCache = new Map<string, { url: string, expiresAt: number }>()

  const generateUrl = useCallback(async (url: string) => {
    // Check cache first to prevent duplicate API calls
    const cached = signedUrlCache.get(url)
    const now = Date.now()

    if (cached && cached.expiresAt > now + (refreshBeforeMinutes * 60 * 1000)) {
      setState({
        url: cached.url,
        isLoading: false,
        error: null,
        expiresAt: cached.expiresAt
      })
      return
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Generate signed URL via server action
      const result = await generateSignedUrlAction(url)

      if (result.success && result.data) {
        // Cache for future use
        signedUrlCache.set(url, {
          url: result.data.url,
          expiresAt: result.data.expiresAt
        })

        setState({
          url: result.data.url,
          isLoading: false,
          error: null,
          expiresAt: result.data.expiresAt
        })
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
    }
  }, [])

  // Auto-refresh when near expiry
  useEffect(() => {
    if (isNearExpiry && !state.isLoading && privateUrl) {
      generateUrl(privateUrl)
    }
  }, [isNearExpiry, state.isLoading, privateUrl, generateUrl])
}
```

### Audio Playback System
**File**: `src/components/reflection/MessengerAudioPlayer.tsx`

```typescript
// Messenger-style audio player (Lines 18-224)
export function MessengerAudioPlayer({
  reflectionId,
  fileUrl,
  duration: propDuration,
  timestamp,
  isOwn = true
}: MessengerAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(propDuration || 0)

  // Get signed URL for secure playback
  const signedUrl = useSignedUrl(fileUrl, 30)

  // Global playback state management
  const {
    currentlyPlaying,
    isPlaying,
    startPlayback,
    stopPlayback
  } = useReflectionPlaybackStore()

  const isThisPlaying = currentlyPlaying === reflectionId && isPlaying

  // Set audio source when signed URL is available
  useEffect(() => {
    if (signedUrl.url && audioRef.current) {
      audioRef.current.src = signedUrl.url
      audioRef.current.preload = 'metadata'

      // Fallback timer for duration if metadata doesn't load
      const fallbackTimer = setTimeout(() => {
        if (propDuration && propDuration > 0 && (!audioDuration || audioDuration === 0)) {
          setAudioDuration(propDuration)
        }
      }, 2000)

      return () => clearTimeout(fallbackTimer)
    }
  }, [signedUrl.url, propDuration, audioDuration])

  // Handle playback with singleton pattern
  const handlePlayPause = async () => {
    if (isThisPlaying) {
      audioRef.current?.pause()
      stopPlayback()
    } else {
      // Stop any other playing audio (singleton playback)
      if (currentlyPlaying) {
        stopPlayback()
      }

      if (audioRef.current && signedUrl.url) {
        try {
          await audioRef.current.play()
          startPlayback(reflectionId)
        } catch (error) {
          console.error('Failed to play audio:', error)
        }
      }
    }
  }

  // Seekable progress bar
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !audioDuration) return

    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    const newTime = percentage * audioDuration

    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }
}
```

### State Machine Audio Integration
**File**: `src/lib/video-agent-system/core/StateMachine.ts`

```typescript
// Audio message creation (Lines 1650-1710)
private async handleReflectionSubmit(payload: { type: string, data: any }) {
  const currentVideoTime = this.videoController.getCurrentTime()
  const formattedTime = this.formatTime(currentVideoTime)

  // Save to database via mutation
  let reflectionResult: any = null
  try {
    reflectionResult = await this.saveReflectionToDatabase(payload.type, payload.data, currentVideoTime)
  } catch (error) {
    console.error('[SM] Failed to save reflection to database:', error)
  }

  // Create audio message for messenger-style UI
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

  // Add to messages array for persistence
  const newMessages = [
    ...filteredMessages,
    timestampMessage,
    ...(audioMessage ? [audioMessage] : []), // Conditionally add audio message
    aiResponse,
    countdownMessage
  ]

  this.updateContext({
    ...this.context,
    messages: newMessages
  })
}
```

### Persistence System
**File**: `src/components/video/student/StudentVideoPlayerV2.tsx`

```typescript
// Load existing reflections on page load (Lines 133-177)
useEffect(() => {
  if (reflectionsQuery.data?.success && reflectionsQuery.data.data) {
    const reflections = reflectionsQuery.data.data

    // Convert voice reflections to audio messages
    const audioMessages = reflections
      .filter(reflection => reflection.reflection_type === 'voice')
      .map(reflection => {
        // Parse metadata from reflection_text
        const fileUrlMatch = reflection.reflection_text.match(/File URL: (.+?)(?:\n|$)/)
        const durationMatch = reflection.reflection_text.match(/Duration: (\d+(?:\.\d+)?)s/)
        const timestampMatch = reflection.reflection_text.match(/captured at (\d+(?:\.\d+)?)s/)

        if (fileUrlMatch) {
          const fileUrl = fileUrlMatch[1]
          const duration = durationMatch ? parseFloat(durationMatch[1]) : 0
          const videoTimestamp = timestampMatch ? parseFloat(timestampMatch[1]) : 0

          return {
            id: `audio-${reflection.id}`,
            type: 'audio' as const,
            state: 'permanent' as const,
            message: `Voice memo • ${Math.floor(videoTimestamp / 60)}:${Math.floor(videoTimestamp % 60).toString().padStart(2, '0')}`,
            timestamp: new Date(reflection.created_at).getTime(),
            audioData: {
              fileUrl,
              duration,
              videoTimestamp,
              reflectionId: reflection.id
            }
          }
        }
        return null
      })
      .filter(Boolean)

    if (audioMessages.length > 0) {
      loadInitialMessages(audioMessages)
    }
  }
}, [reflectionsQuery.data, loadInitialMessages])
```

## 🔄 State Coordination Patterns

### Command/Action Flow
```typescript
// Action dispatch pattern (Lines 94-98 in StateMachine.ts)
public dispatch(action: Action) {
  const command = this.createCommand(action)
  this.commandQueue.enqueue(command)
}

// Command creation (Lines 200-250)
private createCommand(action: Action): Command {
  switch (action.type) {
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
  }
}
```

### Layer Synchronization
1. **UI Layer → State Machine**: User actions trigger commands
2. **State Machine → Server Layer**: Commands invoke mutations/queries
3. **Server Layer → UI Layer**: Query invalidation triggers re-renders
4. **State Machine → Components**: Context updates propagate via subscribers

### Error Handling
```typescript
// Multi-layer error handling (Lines 158-164 in reflection-actions.ts)
try {
  const uploadResult = await backblazeService.uploadVideo(file, fileName)
  contentUrl = uploadResult.fileUrl
} catch (uploadError) {
  console.error('File upload failed:', uploadError)
  return { success: false, error: 'File upload failed' }
}
```

## 📊 Performance Optimizations

### Signed URL Caching
- Global cache prevents duplicate API calls
- Automatic refresh before expiry
- Memory-efficient with expiration cleanup

### Audio Singleton Playback
- Global store ensures only one audio plays at a time
- Prevents resource conflicts
- Clean state management across components

### Streaming AI Responses
- Real-time content updates
- Reduced perceived latency
- Progressive enhancement of user experience

## 🔧 Integration Points

### Database Schema
```sql
-- Reflections table structure
CREATE TABLE reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  video_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  reflection_type TEXT CHECK (reflection_type IN ('voice', 'screenshot', 'loom', 'text')),
  reflection_text TEXT NOT NULL,
  reflection_prompt TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### File Storage
- **Backblaze B2**: Cloud storage for audio files
- **Signed URLs**: Temporary secure access
- **File naming**: `reflections/{userId}/{timestamp}-{filename}`

### API Endpoints
- `/api/ai/hint`: Streaming hint generation
- `/api/ai/quiz`: Streaming quiz generation
- Server actions: `submitReflectionAction`, `generateSignedUrlAction`

## 🎯 Conclusion

The implementation successfully achieves:
- **Clear separation of concerns** across 3 SSOT layers
- **Coordinated state management** via centralized state machine
- **Real-time streaming** for AI-generated content
- **Secure file handling** with signed URLs and validation
- **Persistent chat experience** with database synchronization
- **Error resilience** with comprehensive error handling at each layer

This architecture provides a scalable, maintainable foundation for complex video-learning interactions while maintaining performance and user experience standards.