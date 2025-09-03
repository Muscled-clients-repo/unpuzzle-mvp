# AI Agents Implementation Plan

## Overview
This plan addresses all issues in the current implementation and provides a clear path to make all user flows work flawlessly.

## Core Architecture Changes

### 1. Message State Architecture
Instead of managing agents separately from messages, we need to treat each message as having a state:

```typescript
interface ChatMessage {
  id: string
  type: "user" | "ai" | "agent-prompt" | "system"
  agentType?: "hint" | "quiz" | "reflect" | "path"
  state: "unactivated" | "activated" | "rejected" | "permanent"
  message: string
  timestamp: string
  linkedMessageId?: string // Links system messages to their agent
  actions?: {
    onAccept?: () => void
    onReject?: () => void
  }
}

// Track current unactivated agent and its system message
interface AgentTracker {
  agentMessageId: string | null
  systemMessageId: string | null
}
```

### 2. Video Control Architecture
Create a dedicated video control hook that properly syncs with the video element:

```typescript
// useVideoControl.ts
- Direct ref access to VideoEngine
- Imperative control methods
- State synchronization
- Debounced updates to prevent loops
```

### 3. Agent Management
Single source of truth for agent management:

```typescript
// Current scattered state (BAD):
- showPuzzleHint
- activeAgent  
- pauseReason
- activePuzzleHintId
- activeSystemMessageId

// New unified state (GOOD):
- currentUnactivatedAgentId: string | null
- messages: ChatMessage[]
```

## Implementation Steps

### Phase 1: Fix Video Control (Priority 1)
**Problem:** Video doesn't pause when agents clicked while playing

**Solution:**
1. Create `useVideoControl` hook in StudentVideoPlayerV2
2. Get direct ref to VideoEngine from StudentVideoPlayer
3. Implement imperative pause/play methods
4. Remove the effect-based sync (causes loops)

**Implementation:**
```
- Add forwardRef to StudentVideoPlayer
- Expose videoEngineRef through imperative handle
- In V2, use ref.current.pause() directly
- Remove all useEffect video sync attempts
```

### Phase 2: Message State Management (Priority 2)
**Problem:** Agents don't persist correctly

**Solution:**
1. Update ChatMessage interface with state field
2. Implement message state transitions:
   - Created as "unactivated"
   - On accept → "activated" (remove buttons, keep message)
   - On reject → "rejected" (remove buttons, keep message)
   - System/AI messages → "permanent"

3. State transition implementation:
```typescript
const handleAccept = (messageId: string) => {
  setMessages(prev => prev.map(msg => 
    msg.id === messageId 
      ? { ...msg, state: 'activated', actions: undefined }
      : msg
  ))
  // Generate AI response...
}

const handleReject = (messageId: string) => {
  setMessages(prev => prev.map(msg => 
    msg.id === messageId 
      ? { ...msg, state: 'rejected', actions: undefined }
      : msg
  ))
  // Mark system message as permanent too
  setMessages(prev => prev.map(msg => 
    msg.linkedMessageId === messageId 
      ? { ...msg, state: 'permanent' }
      : msg
  ))
}
```

### Phase 3: Agent Triggering (Priority 3)
**Problem:** Agents don't appear immediately, require multiple clicks

**Solution:**
1. Remove all delays and timeouts
2. Direct state updates:
```
handleAgentRequest(type) {
  // 1. Remove current unactivated agent
  removeUnactivatedMessages()
  
  // 2. Add new agent immediately
  const agentMessage = createAgentMessage(type)
  addMessage(agentMessage)
  setCurrentUnactivatedAgentId(agentMessage.id)
  
  // 3. Pause video if playing
  if (isPlaying) {
    videoRef.current.pause() // Direct control
  }
}
```

### Phase 4: Cleanup Logic (Priority 4)
**Problem:** Wrong messages disappear

**Solution:**
Implement proper cleanup based on message state:

```typescript
// When video resumes
const handleVideoPlay = () => {
  // Only remove unactivated messages AND their system messages
  setMessages(prev => prev.filter(msg => {
    // Keep if activated/rejected/permanent
    if (msg.state !== 'unactivated') return true
    // Also remove system messages linked to unactivated agents
    if (msg.type === 'system' && msg.id === currentSystemMessageId) return false
    return false
  }))
  setCurrentUnactivatedAgentId(null)
  setCurrentSystemMessageId(null)
}

// When switching agents
const handleAgentSwitch = (newType) => {
  // Remove only the current unactivated agent AND its system message
  if (currentUnactivatedAgentId) {
    setMessages(prev => prev.filter(msg => 
      msg.id !== currentUnactivatedAgentId &&
      msg.id !== currentSystemMessageId
    ))
  }
  // Add new agent...
}
```

## File Changes Required

### 1. `/src/components/student/ai/AIChatSidebarV2.tsx`
- Add message state to ChatMessage interface
- Update all message creation to include state
- Implement state transitions on accept/reject
- Fix cleanup logic to check state

### 2. `/src/components/video/student/StudentVideoPlayerV2.tsx`  
- Add ref to get VideoEngine
- Implement direct video control
- Remove effect-based sync
- Simplify agent request handling

### 3. `/src/components/video/student/StudentVideoPlayer.tsx`
- Add forwardRef
- Expose videoEngineRef through imperative handle
- Remove conflicting sync logic

## Testing Plan

### Test Case 1: Agent While Playing
1. Play video
2. Click Quiz button
3. ✓ Video pauses immediately
4. ✓ Quiz appears immediately

### Test Case 2: Agent Persistence
1. Pause video, Hint appears
2. Click "Yes" on Hint
3. Click Quiz button
4. ✓ Hint conversation stays
5. ✓ Quiz appears below

### Test Case 3: Resume with Unactivated
1. Pause video, Hint appears
2. Don't click Yes/No
3. Resume video
4. ✓ Hint disappears completely

### Test Case 4: Resume with Activated
1. Pause video, Hint appears
2. Click "Yes"
3. Resume video
4. ✓ Hint conversation stays

### Test Case 5: Rapid Switching
1. Click Hint
2. Click Quiz quickly
3. Click Reflect quickly
4. ✓ Only Reflect shows
5. ✓ No duplicate messages

### Test Case 6: Rejected Agent Persistence
1. Pause video, Hint appears
2. Click "No thanks"
3. Resume video
4. ✓ Hint stays with disabled buttons
5. ✓ System message stays

### Test Case 7: Manual Pause After Agent
1. Activate Quiz (click Yes)
2. Resume video
3. Manually pause video
4. ✓ Hint appears (default)
5. ✓ Quiz conversation still visible above

## Success Criteria
- [ ] Video pauses within 100ms of agent button click
- [ ] Agents appear within 50ms of trigger
- [ ] No infinite loops or console errors
- [ ] Activated agents never disappear
- [ ] Rejected agents never disappear  
- [ ] Unactivated agents always disappear on resume
- [ ] Clean agent switching with no artifacts

## Recommended Approach Order
1. **Fix video control first** - This is blocking everything else
2. **Then message states** - This fixes persistence
3. **Then cleanup logic** - This fixes switching
4. **Finally optimize timing** - Remove all delays

## Alternative Architecture (If Current Fails)
If the above doesn't work, consider:

### Option B: Command Pattern
- Create a command queue for video operations
- Process commands sequentially
- Prevents race conditions

### Option C: Full Zustand Migration  
- Move ALL state to Zustand
- Use computed values for derived state
- Single source of truth

### Option D: Separate Agent Manager
- Create dedicated AgentManager component
- Portal agents into sidebar
- Complete separation of concerns

## Critical Edge Cases to Handle

### Edge Case 1: Double-click Protection
- User rapidly clicks same agent button twice
- Solution: Debounce or check if agent already showing

### Edge Case 2: State During Transition
- User clicks agent while video is transitioning pause/play
- Solution: Queue operations or disable buttons during transition

### Edge Case 3: Message Order
- Multiple agents activated in quick succession
- Solution: Maintain insertion order, use timestamp sorting

### Edge Case 4: Accept/Reject After Switch
- User switches agent then clicks old agent's button
- Solution: Disable buttons on unactivated agents immediately

### Edge Case 5: Video Ends with Agent
- Video reaches end with unactivated agent showing
- Solution: Treat like resume - remove unactivated

## Notes
- Don't use useEffect for video sync (causes loops)
- Don't use timeouts for state updates (causes delays)
- Don't track agent state in multiple places (causes conflicts)
- Always update state atomically
- Test each phase before moving to next
- Consider race conditions in all async operations
- Ensure cleanup runs even if component unmounts