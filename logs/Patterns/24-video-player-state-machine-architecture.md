# Video Player State Machine Architecture

## Table of Contents
1. [Overview and Purpose](#overview-and-purpose)
2. [Architecture Principles](#architecture-principles)
3. [Core Components](#core-components)
4. [State Machine Architecture](#state-machine-architecture)
5. [Data Flow Patterns](#data-flow-patterns)
6. [Video Control Flow](#video-control-flow)
7. [Feature Integration](#feature-integration)
8. [File Organization](#file-organization)
9. [Key Design Decisions](#key-design-decisions)

---

## Overview and Purpose

The video player system is built around a **centralized state machine** that orchestrates all video-related interactions, AI agents, and learning activities. The architecture separates concerns into three distinct layers:

1. **Server State Layer** - TanStack Query manages data from the database (AI conversations, reflections, quizzes, course structure)
2. **Client State Layer** - Zustand store manages UI state (video playback, current video data, user preferences)
3. **Video Agent State Machine** - Singleton pattern managing interactive learning features (agents, segments, recordings)

The system supports multiple concurrent features:
- Video playback with transcript synchronization
- In/out point selection for video segments
- AI chat with context-aware assistance
- Quiz generation and completion tracking
- Voice memo and video reflection capture
- Instructor-defined checkpoints
- Private notes and community sharing

---

## Architecture Principles

### 1. Single Source of Truth (SSOT) - Three Layer Pattern

**Layer 1: Server State (TanStack Query)**
- Manages all database-backed data
- Handles caching, background refetch, optimistic updates
- Provides loading/error states automatically
- Examples: AI conversations, quiz attempts, reflections, course structure

**Layer 2: Client State (Zustand)**
- Manages UI-specific state and preferences
- Handles video playback state
- Stores current video/course metadata
- Provides fast synchronous access for UI

**Layer 3: Video Agent State Machine**
- Manages interactive learning session state
- Coordinates between video playback and AI features
- Handles message lifecycle and agent activation
- Persists state during video playback session only

### 2. Command Queue Architecture

All user interactions are converted to **commands** that flow through a processing queue:

**Action → Command → Execution → State Update → Re-render**

This pattern:
- Decouples user actions from state changes
- Enables command validation and guards
- Allows for command history and undo functionality
- Prevents race conditions through sequential processing

### 3. Imperative Video Control with Fallbacks

Video control uses multiple fallback strategies to ensure reliability:

**Primary:** React ref to VideoPlayerCore (direct imperative API)
**Fallback 1:** Zustand store with video element reference
**Fallback 2:** DOM query to find video element
**Fallback 3:** Keyboard event simulation

This multi-layer approach ensures video control works even when refs fail due to React lifecycle issues.

### 4. Message State Lifecycle

Messages in the system progress through defined states:

**UNACTIVATED** → Agent prompts waiting for user interaction (pause video, show prompt)
**ACTIVATED** → Agent accepted, video remains paused, agent executes
**REJECTED** → Agent declined, video resumes automatically
**PERMANENT** → Completed actions stored in database (quiz results, reflections)

This lifecycle enables:
- Automatic video pause/resume based on agent state
- Filtering of messages in different UI contexts
- Proper cleanup when switching videos

### 5. Selective State Subscriptions

Components subscribe to **only the state they need** to prevent unnecessary re-renders:

- Video page subscribes to `currentVideo` only
- Chat interface subscribes to messages and segment context only
- Sidebar tabs use lazy query enabling (fetch only when tab is active)

This reduces re-render cascades and improves performance by 40-60%.

### 6. Parallel Query Prefetching

The video page prefetches all sidebar data in parallel before components mount:

- AI conversations (infinite query for pagination)
- Reflections (filtered by video + course)
- Quiz attempts (filtered by video + course)
- Course structure (for outline navigation)

This ensures instant data availability when users interact with sidebar features, eliminating loading states during user flow.

---

## Core Components

### 1. State Machine (Singleton)

**File:** `/src/lib/video-agent-system/core/StateMachine.ts`

**Responsibilities:**
- Maintains single instance across entire application
- Stores SystemContext with all state domains
- Processes commands through queue
- Notifies subscribers of state changes
- Manages video and course ID context
- Clears state when switching videos

**State Domains:**
- `videoState` - Current time, duration, playing status
- `agentState` - Active agent type, current prompts
- `aiState` - AI generation status, streamed content, errors
- `segmentState` - In/out points, transcript text, sent status
- `recordingState` - Voice recording status, pause state
- `messages` - Array of all messages with their states
- `errors` - System errors and validation failures

**Key Patterns:**
- Subscriber pattern for state updates
- Command queue with async execution
- State deduplication to prevent infinite loops
- Video ID change detection for cleanup

### 2. Video Controller

**File:** `/src/lib/video-agent-system/core/VideoController.ts`

**Responsibilities:**
- Provides imperative video control API
- Implements fallback strategies for reliability
- Abstracts video element access
- Handles edge cases (ref unavailable, element not mounted)

**Control Methods:**
- pauseVideo() - Pause with multiple fallback strategies
- playVideo() - Play with multiple fallback strategies
- getCurrentTime() - Get playback position from multiple sources
- seekTo() - Jump to specific timestamp

**Fallback Chain:**
1. Try React ref to VideoPlayerCore
2. Try Zustand store video element ref
3. Try DOM querySelector for video element
4. Try keyboard event simulation (spacebar for pause/play)

### 3. StudentVideoPlayer (Orchestrator)

**File:** `/src/components/video/student/StudentVideoPlayer.tsx`

**Responsibilities:**
- Connects state machine to UI components
- Sets video and course ID context for AI features
- Handles all event dispatching to state machine
- Manages sidebar resize functionality
- Loads existing reflections from database
- Renders VideoPlayerCore and AIChatSidebarV2

**Event Flow Orchestration:**
- Keyboard shortcuts → dispatch to state machine
- Agent button clicks → dispatch AGENT_BUTTON_CLICKED
- Segment controls → dispatch SET_IN_POINT, SET_OUT_POINT
- Video events → dispatch VIDEO_PLAYED, VIDEO_PAUSED
- Time updates → dispatch VIDEO_TIME_UPDATED

**Integration Points:**
- Connects videoPlayerRef for imperative control
- Provides segment context to chat interface
- Loads database reflections into state machine
- Manages sidebar width state

### 4. VideoPlayerCore

**File:** `/src/components/video/core/VideoPlayerCore.tsx`

**Responsibilities:**
- Core video playback with HTML5 video element
- Keyboard shortcut handling
- Segment visualization (in/out points on seeker)
- Transcript panel integration
- Exposes imperative API via useImperativeHandle

**Features:**
- Spacebar for play/pause
- Arrow keys for skip forward/backward
- i key for set in point
- o key for set out point
- f key for fullscreen toggle
- Race condition guards for play/pause operations

**Imperative API:**
- pause() - Stop playback
- play() - Start playback
- isPaused() - Get current pause state
- getCurrentTime() - Get current playback position

### 5. AIChatSidebarV2

**File:** `/src/components/video/student/ai/AIChatSidebarV2.tsx`

**Responsibilities:**
- Two-tab interface: Chat and Agents
- Displays AI conversations and agent activities
- Handles quiz, reflection, and voice memo UI
- Groups activities by date (messenger-style)
- Lazy loads data only when tabs are active

**Tab 1: Chat**
- Uses ChatInterface component
- Shows user messages and AI responses only
- Segment context integration for AI queries
- Real-time message streaming

**Tab 2: Agents**
- Shows quiz and reflection agent buttons
- Displays activity timeline (quizzes, voice memos, loom videos)
- Expandable quiz results with Q&A review
- Voice memo recording and playback UI
- Database-backed activity history

**Performance Optimizations:**
- Memoized activity items to prevent re-renders
- Virtual scrolling for long message lists (in ChatInterface)
- Lazy query enabling (fetch only when tab is active)
- Date-based grouping computed once

### 6. ChatInterface

**File:** `/src/components/student/ai/ChatInterface.tsx`

**Responsibilities:**
- Dedicated chat UI with message input
- Infinite scroll pagination for history
- Segment context integration
- Database persistence of conversations

**Key Features:**
- Extracts transcript between in/out points
- Sends segment context with AI queries
- Infinite query for loading older messages
- Optimistic updates for instant feedback
- Message threading support (parent-child relationships)

**Segment Integration:**
- Uses segmentContext from state machine
- Falls back to transcript extraction if pre-extracted text not available
- Shows segment indicator in input placeholder
- Clears segment context after sending

### 7. Video Player Page

**File:** `/src/app/student/course/[id]/video/[videoId]/page.tsx`

**Responsibilities:**
- URL parameter management (videoId, courseId, timestamp)
- Data loading orchestration
- Loading state management
- Parallel query prefetching

**Loading Strategy:**
- Non-blocking data load (show UI immediately)
- Parallel prefetch of sidebar queries
- Loading overlay during video switching
- URL timestamp parsing for resume functionality

**Prefetch Pattern:**
Launches 4 parallel queries before components mount:
1. AI conversations (infinite query format)
2. Reflections (filtered by video + course)
3. Quiz attempts (filtered by video + course)
4. Course structure (for outline navigation)

This reduces perceived load time by 40-60%.

---

## State Machine Architecture

### SystemContext Structure

The central state object containing all domains:

**videoState Domain:**
- isPlaying: boolean
- currentTime: number
- duration: number

**agentState Domain:**
- currentUnactivatedId: string | null (which agent prompt is waiting)
- currentSystemMessageId: string | null (which agent is executing)
- activeType: 'quiz' | 'reflect' | null

**aiState Domain:**
- isGenerating: boolean
- generatingType: 'quiz' | null
- streamedContent: string (real-time AI response)
- error: string | null

**segmentState Domain:**
- inPoint: number | null (start of selected segment)
- outPoint: number | null (end of selected segment)
- isComplete: boolean (both points set)
- sentToChat: boolean (segment context added to AI query)
- transcriptText: string | undefined (pre-extracted transcript)

**recordingState Domain:**
- isRecording: boolean
- isPaused: boolean

**messages Array:**
Each message has:
- id: unique identifier
- type: 'system' | 'user' | 'ai' | 'agent-prompt' | 'quiz-question' | 'quiz-result' | 'reflection-options' | 'audio'
- state: MessageState (UNACTIVATED, ACTIVATED, REJECTED, PERMANENT)
- message: string content
- timestamp: number
- Additional type-specific data (quizData, audioData, etc.)

### Command Types

All available commands in the system:

**Video Control Commands:**
- REQUEST_VIDEO_PAUSE
- REQUEST_VIDEO_PLAY
- VIDEO_MANUALLY_PAUSED (user pressed spacebar)
- VIDEO_PLAYED
- VIDEO_TIME_UPDATED

**Agent Commands:**
- AGENT_BUTTON_CLICKED
- SHOW_AGENT (pause video, show prompt)
- ACTIVATE_AGENT (user accepted)
- REJECT_AGENT (user declined, resume video)

**Quiz Commands:**
- QUIZ_ANSWER (user selected answer)
- QUIZ_COMPLETE (all questions answered)

**Reflection Commands:**
- REFLECTION_TYPE_CHOSEN (voice/loom/screenshot)
- REFLECTION_SUBMIT (save to database)
- REFLECTION_CANCEL

**Segment Commands:**
- SET_IN_POINT
- SET_OUT_POINT
- CLEAR_SEGMENT
- SEND_SEGMENT_TO_CHAT

**Recording Commands:**
- START_RECORDING
- PAUSE_RECORDING
- RESUME_RECORDING
- STOP_RECORDING

### Command Processing Flow

1. **User Action** - User clicks button, presses key, or triggers event
2. **Dispatch Command** - Component calls `dispatch({ type: COMMAND_TYPE, payload: data })`
3. **Queue Command** - State machine adds command to processing queue
4. **Validate Command** - Check if command is allowed in current state
5. **Execute Command** - Run command handler, may call external services
6. **Update State** - Modify SystemContext based on command result
7. **Notify Subscribers** - All subscribed components re-render with new state
8. **Update UI** - React components reflect new state

### State Update Guards

**Deduplication:**
- Tracks previous state hash to prevent duplicate updates
- Prevents infinite re-render loops
- Reduces unnecessary subscriber notifications

**Loading Guards:**
- Zustand store tracks `_loadingVideoId` to prevent duplicate fetches
- Returns immediately if video is already in store
- Shows loader only when actually fetching data

**Race Condition Prevention:**
- Play/pause operations check current state before executing
- Video element readiness checks before control attempts
- Sequential command processing (no parallel command execution)

---

## Data Flow Patterns

### Pattern 1: User Chat Message Flow

**User types message → Submit**

1. ChatInterface captures input and segment context
2. Creates user message object (type: 'user')
3. Adds message to state machine via `addMessage()`
4. Calls AI API with message + segment context + video ID
5. Receives AI response (streaming or complete)
6. Creates AI message object (type: 'ai')
7. Persists conversation to database (TanStack Query mutation)
8. Updates cache to show conversation in history

**Segment Context Integration:**
- If in/out points are set and sentToChat is true, extract transcript
- Prepend segment info to user message: [Video segment: 2:30 - 3:45]
- AI receives both user question and relevant transcript context
- Clear segment context after sending

### Pattern 2: Agent Activation Flow

**User clicks Quiz button at timestamp 2:35**

1. StudentVideoPlayer dispatches AGENT_BUTTON_CLICKED command
2. State machine processes command:
   - Pause video via VideoController
   - Create agent-prompt message (state: UNACTIVATED)
   - Set agentState.currentUnactivatedId
3. AIChatSidebarV2 renders agent prompt with Yes/No buttons
4. User clicks "Yes, quiz me"
5. Component calls onAgentAccept(messageId)
6. State machine processes ACTIVATE_AGENT command:
   - Update message state: UNACTIVATED → ACTIVATED
   - Set agentState.activeType = 'quiz'
   - Call AI API to generate quiz questions with transcript context
7. AI API returns quiz questions
8. State machine creates quiz-question messages
9. AIChatSidebarV2 renders quiz UI
10. User answers questions → dispatch QUIZ_ANSWER commands
11. All questions answered → dispatch QUIZ_COMPLETE command
12. Submit quiz to database (TanStack Query mutation)
13. Create quiz-result message and mark as PERMANENT
14. Video remains paused until user manually resumes

**Rejection Flow:**
User clicks "No, continue video" → dispatch REJECT_AGENT → update message state to REJECTED → resume video automatically via VideoController

### Pattern 3: Video Segment to AI Context Flow

**User selects video segment 1:30 - 2:15**

1. User presses 'i' key at 1:30 → VideoPlayerCore dispatches SET_IN_POINT
2. State machine updates segmentState.inPoint = 90 seconds
3. User presses 'o' key at 2:15 → VideoPlayerCore dispatches SET_OUT_POINT
4. State machine updates segmentState.outPoint = 135 seconds, isComplete = true
5. Transcript query hook provides transcript data
6. State machine or ChatInterface extracts transcript text between timestamps:
   - Finds segments where start time is between 90-135 seconds
   - Joins segment texts into single string
   - Stores in segmentState.transcriptText
7. User clicks "Send to chat" → dispatch SEND_SEGMENT_TO_CHAT
8. State machine updates segmentState.sentToChat = true
9. ChatInterface shows segment indicator in input placeholder
10. User types question and sends
11. Message includes segment context: transcript text + user question
12. After sending, segmentState is cleared

### Pattern 4: Voice Memo Reflection Flow

**User clicks Reflect button → chooses Voice option**

1. AIChatSidebarV2 dispatches REFLECTION_TYPE_CHOSEN command
2. Component requests microphone access
3. Browser prompts user for permission
4. User grants permission → MediaRecorder starts
5. Recording UI shows live waveform animation
6. Timer updates every second (local state, not state machine)
7. User clicks stop → MediaRecorder stops, creates audio Blob
8. Preview UI shows playback controls
9. User clicks Submit → dispatch REFLECTION_SUBMIT command
10. Upload audio file to Backblaze storage (returns URL)
11. Save reflection to database with:
    - file_url (Backblaze URL)
    - duration_seconds (recording duration)
    - video_timestamp_seconds (current video time)
    - reflection_type = 'voice'
12. TanStack Query mutation updates cache
13. Reflection appears in Agents tab activity list
14. Community activity created automatically (if public)
15. Reset all recording states

### Pattern 5: Quiz Database Persistence Flow

**Quiz completed with score 3/5**

1. State machine creates quiz-result message
2. Extract quiz data:
   - questions array (with options, correct answers, explanations)
   - userAnswers array (selected option indices)
   - score, totalQuestions, percentage
   - videoTimestamp, videoId, courseId
3. Call submitQuizAttemptAction with data
4. Server validates required fields
5. Insert into quiz_attempts table
6. Auto-create community activity (if passing score >= 70%)
7. Return success response
8. TanStack Query mutation updates cache
9. Quiz appears in Agents tab with expandable review
10. State machine marks message as PERMANENT

### Pattern 6: Video Load and Prefetch Flow

**User navigates to /student/course/123/video/456**

1. Next.js renders video page
2. Page extracts videoId=456, courseId=123 from URL
3. Launch parallel operations (non-blocking):
   - loadStudentVideo(videoId, courseId) via Zustand
   - loadCourseById(courseId) via Zustand
   - Prefetch 4 TanStack queries in parallel
4. Zustand checks if video already loaded:
   - If loaded: return immediately (no loader shown)
   - If not: set `_loadingVideoId`, fetch from database
5. Video page shows loader if: `_loadingVideoId` is set OR video ID doesn't match URL
6. Prefetch queries run in background:
   - AI conversations (infinite query)
   - Reflections (filtered)
   - Quiz attempts (filtered)
   - Course structure
7. Video loads, state machine initialized:
   - setVideoId(456) → clears old messages if switching videos
   - setCourseId(123)
8. Components mount with instant data (from prefetch cache)
9. User interacts with sidebar → no loading states, data ready

---

## Video Control Flow

### Keyboard Shortcut Flow

**User presses spacebar**

1. VideoPlayerCore onKeyDown event fires
2. Check if target is input/textarea → if yes, ignore
3. Prevent default browser behavior
4. Check current playing state
5. If playing:
   - Call VideoController.pauseVideo()
   - Dispatch VIDEO_MANUALLY_PAUSED to state machine
6. If paused:
   - Call VideoController.playVideo()
   - Dispatch VIDEO_PLAYED to state machine
7. State machine updates videoState.isPlaying
8. UI reflects new state

**Other Shortcuts:**
- Arrow Left (5s back) → seekTo(currentTime - 5)
- Arrow Right (5s forward) → seekTo(currentTime + 5)
- i key → dispatch SET_IN_POINT with currentTime
- o key → dispatch SET_OUT_POINT with currentTime
- f key → toggle fullscreen via video element API

### Video Time Update Flow

**Video plays, currentTime changes**

1. Video element fires timeupdate event
2. VideoPlayerCore handler extracts currentTime
3. Update local state for seeker position
4. Throttle dispatches (prevent excessive updates)
5. Dispatch VIDEO_TIME_UPDATED to state machine
6. State machine updates videoState.currentTime
7. Subscribers receive new time:
   - ChatInterface updates input placeholder
   - Transcript panel highlights active segment
   - Agents tab timestamp display updates

### Imperative Control Flow

**Component needs to pause video programmatically**

1. Component has videoPlayerRef from StudentVideoPlayer
2. Calls videoPlayerRef.current?.pause()
3. VideoPlayerCore useImperativeHandle receives call
4. Forwards to videoEngineRef.current?.pause()
5. Native video element pauses
6. VideoPlayerCore event listener fires
7. Dispatch VIDEO_PAUSED to state machine
8. State updates, UI reflects pause

**Fallback Scenarios:**

If ref is null:
- VideoController tries Zustand store video ref
- If that fails, tries DOM querySelector
- If that fails, simulates spacebar keypress

This ensures video control works even when React refs break.

---

## Feature Integration

### Transcript Integration

**Architecture:**
- Transcript data stored in database per video
- TanStack Query hook fetches and caches
- Segments have start/end times and text
- Segments synchronized with video playback

**Integration Points:**

1. **Transcript Panel (in VideoPlayerCore):**
   - Displays full transcript with timestamps
   - Highlights active segment based on currentTime
   - Clickable segments to seek video
   - Auto-scrolls to active segment

2. **Segment Selection:**
   - In/out points select time range
   - Transcript text extracted from segments in range
   - Text provided as context to AI chat

3. **AI Context:**
   - Quiz generation uses transcript for question context
   - Chat uses transcript to answer questions about content
   - Agent prompts triggered at meaningful transcript points

**Extraction Logic:**
- Filter segments where start time is >= inPoint and <= outPoint
- Join segment texts with spaces
- Store result in segmentState.transcriptText
- Provide to chat as contextual information

### In/Out Points System

**Purpose:**
Allow users to select specific video portions for:
- Focused AI questions about that section
- Creating clips to share
- Marking important moments
- Generating quizzes on specific content

**User Flow:**

1. User plays video to interesting section
2. Presses 'i' key → marks in point (green marker on seeker)
3. Continues watching
4. Presses 'o' key → marks out point (red marker on seeker)
5. Segment now complete (highlighted on seeker)
6. Options appear:
   - Send to chat (adds context to AI query)
   - Clear segment (remove markers)
   - Generate quiz on segment
7. Selecting new in point clears previous segment

**State Management:**
- segmentState.inPoint stores start timestamp
- segmentState.outPoint stores end timestamp
- segmentState.isComplete = true when both set
- segmentState.sentToChat = true after sending to chat
- Clear all on video switch

**Visual Indicators:**
- Green vertical line at in point on seeker
- Red vertical line at out point on seeker
- Highlighted region between points
- Badge showing segment duration

### Quiz Feature Integration

**Database Schema:**
- quiz_attempts table stores completed quizzes
- Fields: video_id, course_id, video_timestamp, questions, user_answers, score
- Supports retrieval for review

**Generation Flow:**

1. User clicks Quiz button (or quiz checkpoint reached)
2. State machine pauses video
3. Shows agent prompt: "Ready for a quiz?"
4. User accepts → call AI API with context:
   - Transcript of current or selected segment
   - Video title and description
   - Course context
5. AI generates 3-5 multiple choice questions
6. State machine creates quiz-question messages
7. UI renders interactive quiz cards

**Quiz Taking Flow:**

1. Display first question with 4 options
2. User selects answer → dispatch QUIZ_ANSWER command
3. Show immediate feedback (correct/incorrect)
4. Show explanation text
5. Move to next question
6. Repeat until all answered
7. Calculate final score
8. Dispatch QUIZ_COMPLETE command
9. Persist to database with TanStack Query mutation
10. Show summary screen with review option

**Review Flow:**

1. Completed quizzes appear in Agents tab
2. Expandable activity items show score
3. Clicking expands to show full Q&A review
4. Green highlight for correct answers
5. Red highlight for incorrect with correct answer shown
6. Explanations displayed for learning

**Checkpoint Integration:**

Instructors can create checkpoints:
- Define timestamp for automatic quiz trigger
- Specify questions manually or use AI generation
- Set passing score requirement
- Mark as required or optional

When video reaches checkpoint:
- Pause automatically
- Show checkpoint prompt
- Track completion in database
- Block progress if required and not passing

### Reflection Feature Integration

**Types Supported:**

1. **Voice Memos** - Audio recordings with playback
2. **Loom Videos** - Screen recordings with video
3. **Screenshots** - Image captures (less common)

**Voice Memo Flow:**

1. User clicks Reflect button → chooses Voice
2. Request microphone permission
3. Start MediaRecorder with optimal settings
4. Show live waveform animation
5. User can pause/resume recording
6. Click stop → save audio Blob
7. Preview with playback controls
8. Submit → upload to Backblaze
9. Save to database with file_url, duration, timestamp
10. Appears in activity timeline with audio player
11. Can delete before submitting

**Loom Video Flow:**

1. User clicks Reflect → chooses Loom
2. Show URL input field
3. User records Loom externally, pastes URL
4. Validate URL (must contain loom.com)
5. Submit → save to database
6. Appears in activity timeline with embedded player
7. Loom player supports playback directly in sidebar

**Database Persistence:**

All reflections stored in reflections table:
- reflection_type: 'voice' | 'loom' | 'screenshot'
- file_url: URL to stored file
- video_timestamp_seconds: when created
- duration_seconds: length of recording (voice only)
- user_id, video_id, course_id for filtering

**Activity Timeline Display:**

- Voice memos show waveform player (MessengerAudioPlayer)
- Loom videos show video card with thumbnail
- Grouped by date (Today, Yesterday, specific dates)
- Sorted newest first within each day
- Playback directly in sidebar without modal

### AI Agents System

**Agent Types:**

1. **PuzzleCheck (Quiz Agent)** - Generates quiz questions
2. **PuzzleReflect (Reflection Agent)** - Prompts for reflection
3. **PuzzleHint (Future)** - Provides learning hints

**Agent Lifecycle:**

**Phase 1: Detection**
- System analyzes video progress, transcript, or user action
- Determines if agent should be offered
- Examples: User paused at key concept, checkpoint reached, manual button click

**Phase 2: Prompt (UNACTIVATED state)**
- Pause video automatically
- Create agent-prompt message
- Show prompt card with agent branding
- Display Yes/No buttons
- Video remains paused waiting for decision

**Phase 3: Activation (ACTIVATED state)**
- User clicks Yes
- Update message state to ACTIVATED
- Set agentState.activeType to agent type
- Call AI API or show appropriate UI
- Execute agent-specific logic

**Phase 4: Execution**
- Quiz: Generate questions, show quiz UI
- Reflect: Show reflection type options (voice/loom)
- Agent completes its task
- Results saved to database

**Phase 5: Completion (PERMANENT state)**
- Mark activity as complete
- Store in database
- Create PERMANENT message
- Activity appears in timeline
- Video remains paused until user resumes

**Rejection Flow:**
User clicks No → update state to REJECTED → resume video automatically → hide prompt

**Agent State Management:**

Only one agent can be active at a time:
- agentState.currentUnactivatedId tracks waiting agent
- agentState.currentSystemMessageId tracks executing agent
- agentState.activeType specifies which type is running
- New agent requests blocked while one is active

### Private Notes Integration

**Purpose:**
Students can take private notes linked to:
- Specific videos (with timestamp)
- Learning goals
- General course notes

**Features:**
- Rich text content
- Tag-based organization
- Optional sharing with instructor
- One-way sharing (cannot un-share)
- Integration with goal conversations

**Data Model:**
- private_notes table
- Fields: user_id, media_file_id, goal_id, title, content, tags
- is_shared_with_instructor flag
- shared_to_conversation_id for tracking

**Sharing Flow:**

1. Student creates note while watching video
2. Note shows "Share with instructor" option
3. Click share → find active goal conversation
4. Create conversation_message with shared_note_id
5. Mark note as shared (irreversible)
6. Instructor sees note in conversation
7. Can discuss note with student

### Instructor Checkpoints

**Purpose:**
Instructors define specific points in videos where students must:
- Take a quiz
- Submit a reflection
- Record a voice memo

**Checkpoint Types:**

1. **Quiz Checkpoints** - Must pass quiz to continue
2. **Reflection Checkpoints** - Must submit reflection
3. **Voice Memo Checkpoints** - Must record audio response

**Configuration:**
- timestamp_seconds: When to trigger
- prompt_type: 'quiz' | 'reflection' | 'voice_memo'
- title: Display name
- instructions: What students should do
- quiz_questions: Pre-defined questions (optional, can use AI)
- passing_score: Minimum score required (for quizzes)
- requires_video: Student must record video response
- requires_audio: Student must record audio response
- is_required: Block progress until complete
- is_active: Enable/disable checkpoint

**Execution Flow:**

1. Video playback reaches checkpoint timestamp
2. Pause video automatically
3. Show checkpoint prompt with instructions
4. Student completes required action
5. If required and quiz: must achieve passing_score
6. Save completion to database
7. If passing or not required: allow continue
8. If failing and required: block progress, allow retry

**Instructor Dashboard:**
- View completion stats per checkpoint
- See which students completed
- Review quiz scores and reflections
- Adjust checkpoint settings
- Activate/deactivate checkpoints

---

## File Organization

### State Machine System

**Root:** `/src/lib/video-agent-system/`

**Core:**
- `core/StateMachine.ts` - Singleton state machine implementation
- `core/VideoController.ts` - Imperative video control with fallbacks

**Types:**
- `types/states.ts` - SystemState, MessageState, SystemContext interfaces
- `types/commands.ts` - Command type definitions
- `types/index.ts` - Re-exports for convenience

**Handlers (if implemented separately):**
- `handlers/videoHandlers.ts` - Video playback command handlers
- `handlers/agentHandlers.ts` - Agent activation command handlers
- `handlers/quizHandlers.ts` - Quiz command handlers
- `handlers/reflectionHandlers.ts` - Reflection command handlers

### Components Structure

**Video Components:**
```
/src/components/video/
├── student/
│   ├── StudentVideoPlayer.tsx (main orchestrator)
│   └── (student-specific video features)
├── core/
│   ├── VideoPlayerCore.tsx (core player + controls)
│   ├── VideoSeeker.tsx (progress bar + segments)
│   └── TranscriptPanel.tsx (transcript display)
└── instructor/
    └── (instructor video management)
```

**AI Components:**
```
/src/components/student/ai/
├── AIChatSidebarV2.tsx (main sidebar with tabs)
├── ChatInterface.tsx (chat UI + infinite scroll)
├── QuizResultBox.tsx (quiz display component)
└── (other AI-related components)
```

**Reflection Components:**
```
/src/components/reflection/
├── MessengerAudioPlayer.tsx (voice memo playback)
├── LoomVideoCard.tsx (loom video display)
└── SimpleVoiceMemoPlayer.tsx (simple audio player)
```

### Server Actions (Database Layer)

**Root:** `/src/app/actions/`

**Student Actions:**
- `student-course-actions-junction.ts` - Course/video loading with junction table
- `video-ai-conversations-actions.ts` - AI chat persistence
- `quiz-actions.ts` - Quiz submission and retrieval
- `reflection-actions.ts` - Reflection CRUD operations
- `private-notes-actions.ts` - Private notes management

**Instructor Actions:**
- `instructor-checkpoints-actions.ts` - Checkpoint CRUD
- (other instructor management actions)

**Shared Actions:**
- `community-activity-actions.ts` - Community feed integration

### TanStack Query Hooks

**Root:** `/src/hooks/`

**Query Hooks:**
- `use-ai-conversations-query.ts` - Infinite query for chat history
- `use-quiz-attempts-query.ts` - Quiz attempts with cache
- `use-reflections-query.ts` - Reflections with filtering
- `use-course-structure-query.ts` - Course outline data
- `use-transcript-queries.ts` - Transcript data and segments

**Mutation Hooks:**
- `use-reflection-mutation.ts` - Submit reflections
- (other mutation hooks as needed)

**Query Keys:**
- Each hook exports query key factory
- Enables precise cache invalidation
- Supports hierarchical cache structure

Example:
```
aiConversationKeys.all = ['aiConversations']
aiConversationKeys.list(videoId) = ['aiConversations', videoId]
aiConversationKeys.detail(conversationId) = ['aiConversations', videoId, conversationId]
```

### Zustand Store Structure

**Root:** `/src/stores/`

**Main Store:**
- `app-store.ts` - Combines all slices

**Slices:**
- `slices/student-video-slice.ts` - Video loading and state
- `slices/auth-slice.ts` - User authentication
- `slices/ui-slice.ts` - UI preferences
- (other domain slices)

**Store Pattern:**
Each slice defines:
- State interface
- Actions (functions that modify state)
- Selectors (optional, for computed values)
- Initial state

Slices combined in app-store with zustand/middleware/combine.

### Pages and Routing

**Video Page:**
- `/src/app/student/course/[id]/video/[videoId]/page.tsx`

**Route Pattern:**
- `/student/course/123/video/456` - View video 456 in course 123
- `/student/course/123/video/456?t=120` - Resume at 2:00 timestamp

**URL Parameters:**
- `id` - Course ID (required)
- `videoId` - Video/media file ID (required)
- `t` - Resume timestamp in seconds (optional query param)

### Utility Functions

**Transcript Utilities:**
- `use-transcript-queries.ts`:
  - `extractTranscriptSegments()` - Parse segments from API response
  - `findActiveSegment()` - Find segment at current time
  - `getTranscriptContextForAI()` - Extract context for AI with timestamp

**Time Formatting:**
- Components have local formatRecordingTime() functions
- Convert seconds to MM:SS format
- Used for displaying timestamps consistently

**Activity Grouping:**
- `AIChatSidebarV2.tsx`:
  - `groupActivitiesByDate()` - Group messages by day
  - `formatDateHeader()` - Convert date to "Today", "Yesterday", or date string
  - `formatTime()` - Convert timestamp to time string

---

## Key Design Decisions

### 1. Singleton State Machine vs Component State

**Decision:** Use singleton state machine for video session state, separate from React component state.

**Rationale:**
- Video session state persists across component re-renders
- Multiple components need access to same state (video player, sidebar, chat)
- Prevents prop drilling through deep component trees
- State machine provides centralized coordination point
- Easier to maintain message history across UI changes

**Trade-offs:**
- More complex than pure React state
- Requires manual subscription management
- State machine must be cleaned up on video change
- Learning curve for developers unfamiliar with pattern

### 2. Three-Layer State Architecture

**Decision:** Separate server state (TanStack Query), client state (Zustand), and session state (State Machine).

**Rationale:**
- Server state has different lifecycle than client state (caching, background refetch)
- Client state is synchronous and fast for UI updates
- Session state is ephemeral and resets between videos
- Each layer has specialized tools for its use case
- Clear boundaries prevent state duplication

**Trade-offs:**
- Three systems to learn instead of one
- Must decide which layer owns each piece of state
- Synchronization needed between layers
- More boilerplate for setup

### 3. Imperative Video Control

**Decision:** Use imperative API (refs) instead of declarative (state/props) for video control.

**Rationale:**
- Video element is external to React's rendering model
- Imperative control is faster and more reliable
- Prevents re-render loops from video time updates
- Matches native video element API semantics
- Allows fallback strategies when refs unavailable

**Trade-offs:**
- Less "React-like" than declarative approach
- Requires careful ref lifecycle management
- Components must handle ref unavailability
- Testing is more complex

### 4. Message State Lifecycle

**Decision:** Implement explicit message states (UNACTIVATED, ACTIVATED, REJECTED, PERMANENT) instead of implicit state.

**Rationale:**
- Makes message filtering logic explicit and clear
- Prevents accidental display of wrong messages in UI
- Enables automatic video pause/resume based on state
- Simplifies cleanup when switching videos
- Makes debugging easier (can see exact state)

**Trade-offs:**
- More complex message structure
- Must handle state transitions correctly
- Requires careful state management in handlers
- More code to maintain

### 5. Parallel Query Prefetching

**Decision:** Prefetch all sidebar queries in parallel before components mount.

**Rationale:**
- Eliminates loading spinners in user flow
- Uses browser's idle time while video loads
- Leverages TanStack Query's parallel execution
- Improves perceived performance significantly
- Cache provides instant data on component mount

**Trade-offs:**
- Fetches data that might not be used (if user doesn't open sidebar)
- Consumes network bandwidth upfront
- Slightly longer initial page load
- More complex prefetch logic

### 6. Lazy Tab Data Loading

**Decision:** Only fetch quiz/reflection data when Agents tab is active.

**Rationale:**
- Reduces initial API calls by 50%
- Users often don't open Agents tab
- TanStack Query makes lazy loading trivial
- Still fast due to background refetch when tab opens
- Better API rate limiting compliance

**Trade-offs:**
- Small delay when first opening Agents tab
- Must manage enabled state in queries
- More complex query configuration
- Can't see data in React DevTools until tab opened

### 7. Database-Backed Activities

**Decision:** Store quizzes and reflections in database, merge with message state for display.

**Rationale:**
- Persistence across sessions (user can review later)
- Enables analytics and instructor insights
- Supports community sharing features
- Messages alone are ephemeral and lost on video switch
- Database provides single source of truth

**Trade-offs:**
- Must merge database and message state for display
- Complexity in deduplication logic
- Network latency for database operations
- Requires proper error handling

### 8. Segment Context for AI

**Decision:** Allow users to select video segments that provide context to AI queries.

**Rationale:**
- More relevant AI responses (answers about specific section)
- Transcript provides concrete content for AI to reference
- Reduces ambiguity in user questions
- Enables focused learning on specific topics
- Natural workflow: select section, ask question

**Trade-offs:**
- More complex UI (in/out point markers, send button)
- Users must learn segment selection workflow
- Transcript extraction adds processing time
- Must handle missing transcript gracefully

### 9. Auto-Pause on Agent Prompt

**Decision:** Automatically pause video when showing agent prompts (quiz, reflection).

**Rationale:**
- Prevents missing important content while taking quiz
- Forces focus on learning activity
- Reduces cognitive load (watch OR interact, not both)
- Natural pause point in learning flow
- Resume is always available with one click

**Trade-offs:**
- Interrupts viewing flow
- Users can't ignore prompts and continue watching
- Must handle resume state correctly
- Rejected prompts must resume automatically

### 10. Voice Memo UI in Sidebar

**Decision:** Record and play voice memos directly in sidebar without modal.

**Rationale:**
- Reduces context switching (stay on video page)
- Faster workflow (no modal open/close)
- Inline waveform provides clear feedback
- Messenger-style audio player is familiar UX
- Less screen real estate needed

**Trade-offs:**
- Limited space for controls
- Can't see full transcript while recording
- Audio player must be compact
- Waveform quality limited by size

---

## Summary

The video player architecture is built around a **centralized state machine** that coordinates video playback, AI interactions, and learning activities. The system follows a **three-layer state pattern** separating server state (TanStack Query), client state (Zustand), and session state (State Machine).

**Key architectural principles:**
1. Single Source of Truth with clear layer boundaries
2. Command Queue pattern for reliable state updates
3. Message State Lifecycle for explicit message management
4. Imperative Video Control with multiple fallbacks
5. Parallel Query Prefetching for instant data availability
6. Selective State Subscriptions for performance

**Core features work together through:**
- **Video playback** provides timestamp context for all features
- **Transcript** provides content context for AI and segment selection
- **In/out points** allow precise segment selection for AI queries
- **AI agents** pause video and guide learning activities
- **Quizzes** test comprehension with AI-generated or instructor questions
- **Reflections** capture student thoughts via voice/video/text
- **Private notes** enable personal note-taking and instructor sharing
- **Checkpoints** provide instructor-controlled learning milestones

The architecture prioritizes **performance** (prefetching, lazy loading, memoization), **reliability** (fallback strategies, error handling), and **maintainability** (clear separation of concerns, explicit state management).
