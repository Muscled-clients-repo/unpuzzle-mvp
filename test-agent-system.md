# Testing the Nuclear AI Agent System

## Test URL
http://localhost:3003/demo/video-v2

## Test Checklist

### ✅ Phase 1: Infrastructure Tests
- [x] State machine created successfully
- [x] Video controller created with 4 fallback methods
- [x] Command queue for sequential processing
- [x] Message manager for state transitions

### ✅ Phase 2: Component Integration
- [x] StudentVideoPlayer accepts forwardRef
- [x] Imperative methods exposed (pause, play, isPaused, getCurrentTime)
- [x] StudentVideoPlayerV2 uses state machine
- [x] AIChatSidebarV2 renders messages from context

### 🧪 Phase 3: Flow Testing

#### Flow 1: Manual Video Pause
1. [ ] Play video
2. [ ] Click on video to pause
3. [ ] Verify: PuzzleHint appears with "Paused at X:XX"
4. [ ] Verify: Shows "Do you want a hint?" prompt
5. [ ] Resume without answering
6. [ ] Verify: Hint disappears completely

#### Flow 2: Agent Button While Playing
1. [ ] Ensure video is playing
2. [ ] Click Quiz button in sidebar
3. [ ] Verify: Video pauses automatically
4. [ ] Verify: Quiz prompt appears immediately

#### Flow 3: Agent Button While Paused
1. [ ] Pause video (Hint appears)
2. [ ] Click Quiz button
3. [ ] Verify: Hint disappears
4. [ ] Verify: Quiz appears

#### Flow 4: Agent Switching
1. [ ] Show Quiz (don't click Yes/No)
2. [ ] Click Reflect button
3. [ ] Verify: Quiz disappears
4. [ ] Verify: Reflect appears
5. [ ] Verify: No duplicate messages

#### Flow 5: Video Resume
1. [ ] Pause, get Hint prompt
2. [ ] Resume without clicking Yes/No
3. [ ] Verify: Hint and "Paused at" message disappear
4. [ ] Verify: Chat returns to initial state

#### Flow 6: Agent Acceptance
1. [ ] Click "Yes" on any agent
2. [ ] Verify: Agent prompt stays in chat
3. [ ] Verify: AI response appears
4. [ ] Resume video
5. [ ] Verify: Conversation persists

#### Flow 7: Agent Rejection
1. [ ] Click "No thanks" on agent
2. [ ] Verify: Agent prompt stays but buttons removed
3. [ ] Verify: Shows "(Declined)" label
4. [ ] Verify: No AI response
5. [ ] Resume video
6. [ ] Verify: Rejected agent persists

## Console Commands for Testing

Open browser console and check:
```javascript
// Check state machine context
console.log('[TEST] Checking state machine...')

// Monitor state changes
window.addEventListener('click', (e) => {
  if (e.target.textContent?.includes('Hint') || 
      e.target.textContent?.includes('Quiz') ||
      e.target.textContent?.includes('Reflect') ||
      e.target.textContent?.includes('Path')) {
    console.log('[AGENT CLICKED]', e.target.textContent)
  }
})
```

## Expected Console Output

When working correctly, you should see:
```
[SM] State Machine initialized
[SM] Manual pause at X
[SM] Showing agent: quiz
[SM] Agent accepted: agent-XXX
[SM] Agent rejected: agent-XXX
[SM] Video resumed
```

## Known Issues to Watch For

1. **Video doesn't pause**: Check VideoController fallback methods
2. **Agents don't appear**: Check command queue processing
3. **Messages disappear incorrectly**: Check MessageState filtering
4. **Race conditions**: Check sequential command processing

## Success Criteria

✅ All 7 flows work as documented
✅ No infinite loops or console errors
✅ Smooth transitions between states
✅ Proper message persistence
✅ Video control synchronized with UI