# Video Page User Flows

**Date**: September 21, 2025
**Purpose**: Concise documentation of all user interaction flows in the video page
**Scope**: Student video learning experience with AI agents

---

## Core User Flows

### **1. Basic Video Watching**
1. User navigates to video page
2. Video loads and begins playback
3. User controls: play/pause, seek, volume, fullscreen

### **2. Quiz Agent Interaction**
1. User clicks "Quiz" button during video
2. Agent appears in Agent tab with quiz prompt
3. User answers multiple choice questions
4. System calculates score and saves to database
5. AI provides feedback for incorrect answers in Agent tab
6. Quiz results appear in Agent tab dropdown
7. System message shows "Video continues in 3, 2, 1..." countdown
8. Video automatically resumes playback

### **3. Voice Memo Reflection**
1. User clicks "Reflect" button during video
2. Agent prompts for voice reflection in Agent tab
3. User records voice memo (browser mic access)
4. Audio uploads to Backblaze storage
5. Reflection saved with video timestamp
6. Voice memo appears in Agent tab dropdown with player

### **4. Agent Tab Management**
1. User switches between Chat and Agent tabs
2. Agent tab shows chronological activities:
   - Voice memo players with waveforms
   - Quiz attempt results and scores
   - System messages and agent responses
3. User can replay voice memos
4. User can review quiz attempts
5. Empty states shown when no activities exist

---

## Technical Data Flows


### **Quiz Submission**
- **Trigger**: User submits quiz answers
- **Validation**: Check required fields, video context
- **Storage**: Questions, answers, score, timestamp
- **Foreign Keys**: user_id, video_id, course_id (UUID)

### **Voice Memo Creation**
- **Trigger**: User stops voice recording
- **Upload**: Audio file to Backblaze storage
- **Storage**: file_url, duration_seconds, video_timestamp_seconds
- **Foreign Keys**: user_id, video_id, course_id (UUID)

### **Activity Retrieval**
- **Trigger**: Page load, tab switch to Agent
- **Query**: Get user activities for current video
- **Display**: Chronological list with proper components
- **Caching**: TanStack Query with 5-minute stale time

---

## State Management Flow

### **3-Layer Architecture**
- **TanStack Query**: Server data (video, activities)
- **Form State**: Input handling (quiz answers, recording controls)
- **Zustand**: UI state (tab selection, modals, playback state)

### **Message Lifecycle**
1. **UNACTIVATED**: Message created but not shown to user
2. **ACTIVATED**: Message visible and interactive
3. **PERMANENT**: Message saved to database, always visible

### **Component Coordination**
- **Video Player**: Manages playback, user controls
- **Sidebar**: Handles agent interactions, activity display
- **Agent System**: Processes user input, generates responses

---

## Error Handling Flows

### **Network Failures**
- Offline detection with user notification
- Automatic retry for failed uploads
- Graceful degradation when features unavailable

### **Recording Failures**
- Microphone permission handling
- Audio format compatibility checks
- Upload failure retry mechanisms
- User feedback for technical issues

### **Data Integrity**
- Database foreign key constraint enforcement
- Automatic cleanup of orphaned records
- Transaction rollback on partial failures
- Consistent error messaging across features

---

## Performance Optimization Flows

### **Lazy Loading**
- Components load on-demand based on user interaction
- Agent tab content loads when first accessed
- Voice memo audio loads when playback requested
- Quiz data fetched when agent activated

### **Caching Strategy**
- Video metadata cached aggressively (10 minutes)
- User activities cached with background updates
- Signed URLs cached with automatic refresh
- Form state isolated to prevent UI pollution

### **Database Optimization**
- Indexed queries for video page activities
- Single query for related data (joins)
- Optimistic updates for immediate feedback
- Batch operations for bulk changes

---

## User Experience Patterns

### **Immediate Feedback**
- Visual feedback within 100ms of user actions
- Optimistic updates for form submissions
- Loading states for async operations
- Error boundaries for graceful failure handling

### **Context Preservation**
- Agent conversation history preserved
- Form state survives component re-renders
- Deep linking to specific video timestamps

### **Progressive Enhancement**
- Core video functionality works without JavaScript
- Advanced features enhance basic experience
- Graceful fallbacks for unsupported browsers
- Accessibility features for screen readers

---

## Integration Points

### **External Services**
- **Backblaze**: File storage for voice memos
- **Supabase**: Database operations and auth
- **WebSocket**: Real-time updates
- **Browser APIs**: MediaRecorder, video controls

### **Cross-Page Navigation**
- Course overview integration
- Lesson progression logic
- Breadcrumb navigation

### **Analytics & Tracking**
- Learning engagement metrics
- Agent interaction patterns
- Performance monitoring data

---

## Cleanup Required

### **Video Progress Tracking - Remove Entirely**
**Issue**: Half-implemented video progress functionality exists but doesn't work properly
**Files to clean up**:
- `video_progress` table in database (remove)
- `updateVideoProgress` server actions in `student-course-actions.ts` and `student-learning-actions.ts` (remove)
- `onTimeUpdate` progress tracking code in video components (remove)
- Progress-related queries and references (remove)

**Reason**: Incomplete features create assumptions and debugging confusion. Either implement fully or remove completely.