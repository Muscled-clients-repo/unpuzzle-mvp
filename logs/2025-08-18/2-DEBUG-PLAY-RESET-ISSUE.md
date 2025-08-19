# Debug: Play Button Not Resetting Scrubber

## Root Cause Analysis

### Issue
When scrubber is at end of video and play button is clicked, scrubber doesn't reset to beginning.

### Current Flow
1. **PlaybackControls** → `commands.execute('PLAYBACK.PLAY')`
2. **VideoEditorCommands.execute()** → calls `this.play()`
3. **VideoEditorCommands.play()** checks:
   - Gets `duration` from `this.playbackService.duration`
   - Gets `scrubberPosition` from state machine context
   - If `scrubberPosition >= duration - 0.1`, should reset

### Potential Issues Found

1. **Duration might be 0 or NaN**
   - Video element might not be loaded yet
   - Duration returns 0 if video not loaded

2. **Scrubber position might not be updated properly**
   - When video ends, scrubber stays at end position
   - But duration might not be set correctly

3. **Timing issue**
   - Video element connected asynchronously
   - Duration might not be available when needed

### Debug Points Added
- `VideoEditorCommands.play()` - logs duration, scrubberPosition, isAtEnd
- `PlaybackService.duration` - logs actual duration value and NaN check
- `PlaybackService.play()` - logs currentTime

### Next Steps
1. Check console logs when clicking play at end
2. Verify duration is not 0
3. Verify scrubberPosition matches duration
4. Check if reset condition is being triggered