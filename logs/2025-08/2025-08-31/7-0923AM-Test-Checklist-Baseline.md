# Test Checklist - Baseline Functionality
**Date**: 2025-08-31
**Time**: 09:23 AM EST
**Purpose**: Document current working behavior before any refactoring
**Server**: Running on http://localhost:3010

## Video Playback Core Functions

### HTML5 Video Tests
- [ ] Video loads successfully
- [ ] Play button starts video
- [ ] Pause button stops video
- [ ] Seek bar allows jumping to any position
- [ ] Volume control adjusts audio
- [ ] Mute/unmute works
- [ ] Fullscreen enters and exits properly
- [ ] Video time updates continuously
- [ ] Video ends properly and shows replay option

### YouTube Video Tests
- [ ] YouTube videos load in iframe
- [ ] Play/pause controls work for YouTube
- [ ] Seek works for YouTube videos
- [ ] Volume syncs with YouTube player
- [ ] YouTube API loads without errors

### Keyboard Shortcuts
- [ ] Spacebar toggles play/pause
- [ ] Arrow keys seek forward/backward
- [ ] M key toggles mute
- [ ] F key toggles fullscreen

## AI Agent System Tests

### Manual Pause Agent Activation
- [ ] Pausing video shows hint agent prompt
- [ ] "Do you want a hint?" message appears
- [ ] Timestamp shows correct pause time
- [ ] Message state is UNACTIVATED (gray)

### Agent Button Tests
- [ ] Hint button shows hint agent when clicked
- [ ] Quiz button shows quiz agent when clicked
- [ ] Reflect button shows reflection agent when clicked
- [ ] Path button shows path agent when clicked
- [ ] Clicking different agent while one is active switches to new agent
- [ ] Active agent button is highlighted

### "Let's Go" Activation Tests
- [ ] Clicking "Let's go" on hint activates hint agent
- [ ] Agent message changes to ACTIVATED state
- [ ] AI response appears after activation
- [ ] Original prompt buttons disappear after activation

### "Not Now" Rejection Tests
- [ ] Clicking "Not now" rejects agent
- [ ] Agent message changes to REJECTED state (crossed out)
- [ ] No AI response appears
- [ ] Can continue watching video

### Quiz Agent Specific Tests
- [ ] Quiz questions appear after accepting quiz agent
- [ ] Can select answers for each question
- [ ] Feedback shows correct/incorrect
- [ ] Quiz results show score at the end
- [ ] Video resumes after 3-2-1 countdown
- [ ] Countdown actually resumes video playback

### Reflection Agent Specific Tests
- [ ] Reflection options appear (voice, screenshot, Loom)
- [ ] Can select reflection type
- [ ] Can submit reflection
- [ ] Video resumes after reflection submission
- [ ] Can cancel reflection

## Video Segment Selection Tests

### In/Out Point Tests
- [ ] Can set in-point with I key or button
- [ ] Can set out-point with O key or button
- [ ] Visual indicators show selected segment
- [ ] Can clear segment selection
- [ ] Can send segment to chat as context

## Chat Sidebar Tests

### Message Flow
- [ ] System messages appear in gray
- [ ] Agent prompts appear with correct styling
- [ ] AI responses appear after activation
- [ ] Messages scroll properly
- [ ] Timestamps are correct

### State Persistence
- [ ] Messages persist when video plays/pauses
- [ ] Agent state maintained across interactions
- [ ] Chat history maintained during session

## Video Controls UI Tests

### Control Visibility
- [ ] Controls show on mouse movement
- [ ] Controls hide after 3 seconds of no movement
- [ ] Controls always visible when paused
- [ ] Controls show on hover

### Progress Bar
- [ ] Shows current time position
- [ ] Shows buffered amount
- [ ] Allows clicking to seek
- [ ] Tooltip shows time on hover

## Student vs Instructor Views

### Student View Tests
- [ ] Student can watch videos
- [ ] Student can interact with AI agents
- [ ] Student can take notes
- [ ] Student can see their progress

### Instructor View Tests
- [ ] Instructor can see student activities
- [ ] Instructor can view student reflections
- [ ] Instructor can respond to confusion points
- [ ] Analytics display correctly

## Performance Tests

### Memory Tests
- [ ] No memory leaks after extended use
- [ ] Event listeners cleaned up on unmount
- [ ] No accumulating timeouts/intervals

### State Sync Tests
- [ ] Video time stays synchronized
- [ ] Play state consistent across components
- [ ] No conflicting state updates

## Error Handling Tests

### Failure Scenarios
- [ ] Video URL not found shows error
- [ ] Network failure handled gracefully
- [ ] AI service failure shows message
- [ ] Invalid video format detected

## Cross-Browser Tests

### Chrome
- [ ] All features work in Chrome

### Firefox
- [ ] All features work in Firefox

### Safari
- [ ] All features work in Safari

### Edge
- [ ] All features work in Edge

## Test Execution Results

### Initial Baseline Test
**Date/Time**: 2025-08-31 09:23 AM EST
**Tester**: Claude
**Browser**: Chrome (assumed)
**Result**: TO BE TESTED

### Issues Found
(Document any issues discovered during baseline testing)

### Working Features Confirmed
(List all features confirmed working)

---

## How to Use This Checklist

1. **Before Any Change**: Run through entire checklist
2. **After Each Change**: Run through affected sections
3. **After Each Phase**: Run complete checklist
4. **Document Results**: Note any failures with details

## Critical Must-Work Items

These MUST work after every change:
1. Video play/pause
2. AI agents appear on pause
3. "Let's go" activates agents
4. Agent switching works
5. Video resumes after quiz

If any of these break, IMMEDIATELY REVERT changes.

---

**Note**: This checklist represents the baseline functionality as of 2025-08-31. Any refactoring must maintain ALL these behaviors.