# Phase 1 Investigation: Event Source Identification

## Implementation Summary

**Timestamp**: 2025-08-23 11:15AM EST  
**Objective**: Add comprehensive event logging to capture exact event object causing XState internal crash  
**Status**: ✅ COMPLETED - Ready for testing

## Logging Points Added

### 1. VideoEditorSingleton.ts (Lines 123-160)
**Location**: playback.seek event handler  
**Log Markers**: `📍 [1], [2], [3], [4]`

```javascript
// Logs added:
- [1] playback.seek event received with full parameter analysis
- [2] SCRUBBER.DRAG event object creation with validation
- [3] Pre-send confirmation
- [4] Post-send success/error
```

**What we're tracking**:
- Original time parameter type and value
- NaN/undefined/null checks
- Event object structure before sending
- State machine status at send time
- Stack trace for call origin

### 2. VideoEditorCommands.ts (Lines 197-223)
**Location**: SCRUBBER.DRAG command handler  
**Log Markers**: `📍 [CMD-1], [CMD-2], [CMD-3]`

```javascript
// Logs added:
- [CMD-1] Command params received from UI
- [CMD-2] Event object creation with validation
- [CMD-3] Send success/error tracking
```

**What we're tracking**:
- Incoming params structure
- Position parameter validation
- Event creation process
- Send success/failure

### 3. VideoEditorMachineV5.ts (Lines 921-975)
**Location**: Global SCRUBBER.DRAG handler  
**Log Markers**: `🔴 [SM-1], [SM-2], [SM-3]`

```javascript
// Logs added:
- [SM-1] Handler entry (BEFORE assign) - Critical test point
- [SM-2] Inside assign function 
- [SM-3] Position calculation results
```

**What we're tracking**:
- Whether handler is even reached (SM-1 is key)
- Event object structure at handler
- Context availability
- Position calculation process

### 4. VideoEditorSingleton.ts (Lines 448-474)
**Location**: Clip loading seek operation  
**Log Markers**: `📍 [SEEK-1], [SEEK-2], [SEEK-3], [SEEK-4]`

```javascript
// Logs added:
- [SEEK-1] Pre-calculation values
- [SEEK-2] SeekTime calculation details
- [SEEK-3] Pre-seek confirmation
- [SEEK-4] Post-seek success
```

**What we're tracking**:
- clip.inPoint value and type
- pendingSeek.time value and type
- seekTime calculation result
- NaN/undefined detection

### 5. PlaybackService.ts (Lines 114-138)
**Location**: seek() method  
**Log Markers**: `📍 [PS-1], [PS-2], [PS-3], [PS-4]`

```javascript
// Logs added:
- [PS-1] Incoming time parameter analysis
- [PS-2] playback.seek event emission
- [PS-3] playback.timeUpdate event emission
- [PS-4] Completion confirmation
```

**What we're tracking**:
- Time parameter validation
- Event emission sequence
- Completion status

## Expected Log Flow for Normal Operation

```
1. 📍 [SEEK-1] About to calculate seekTime
2. 📍 [SEEK-2] Calculated seekTime: 0
3. 📍 [SEEK-3] About to call playbackService.seek()
4. 📍 [PS-1] PlaybackService.seek called: time=0
5. 📍 [PS-2] About to emit playback.seek event
6. 📍 [1] playback.seek event received: time=0
7. 📍 [2] Creating SCRUBBER.DRAG event: position=0
8. 📍 [3] About to send SCRUBBER.DRAG
9. 🔴 [SM-1] SCRUBBER.DRAG handler ENTERED ← CRITICAL
10. 🔴 [SM-2] Inside assign function
11. 🔴 [SM-3] Calculated new position: 0
12. 📍 [4] SCRUBBER.DRAG sent successfully
13. 📍 [PS-3] About to emit playback.timeUpdate
14. 📍 [PS-4] PlaybackService.seek completed
15. 📍 [SEEK-4] playbackService.seek() completed
```

## Critical Investigation Points

### If Crash Occurs:
1. **Check if 🔴 [SM-1] appears**: 
   - If NO → XState crashes BEFORE handler execution (internal issue)
   - If YES → Handler executes but assign fails

2. **Check last 📍 marker before error**:
   - Identifies exact failure point in event chain

3. **Examine event object at [2] and [CMD-2]**:
   - Verify position property exists and is valid
   - Check for unexpected properties

4. **Compare [SEEK-2] calculation**:
   - Verify seekTime is a valid number
   - Check for NaN/undefined propagation

## Testing Instructions

1. **Start fresh session**:
   - Clear console
   - Reload application

2. **Trigger the crash**:
   - Record a video
   - Click play button

3. **Capture logs**:
   - Copy all 📍 and 🔴 marked logs
   - Note the LAST log before error
   - Check if 🔴 [SM-1] ever appears

4. **Analyze**:
   - If no 🔴 logs → XState internal crash confirmed
   - If 🔴 [SM-1] appears → Our handler issue
   - Check event objects for malformation

## Verification Checklist

✅ VideoEditorSingleton.ts - playback.seek handler instrumented  
✅ VideoEditorCommands.ts - SCRUBBER.DRAG command instrumented  
✅ VideoEditorMachineV5.ts - Global handler instrumented  
✅ VideoEditorSingleton.ts - Seek calculation instrumented  
✅ PlaybackService.ts - seek() method instrumented  
✅ No other SCRUBBER.DRAG sources exist (verified via grep)

## Next Steps Based on Results

### Scenario A: No 🔴 logs appear
**Conclusion**: XState crashes internally before reaching our handler  
**Action**: Move SCRUBBER.DRAG to state-specific handlers (Phase 2)

### Scenario B: 🔴 [SM-1] appears but [SM-2] doesn't
**Conclusion**: Crash in assign function initialization  
**Action**: Investigate assign function or context issues

### Scenario C: All logs appear but error still occurs
**Conclusion**: Error is elsewhere in the assign return object  
**Action**: Check for circular references or invalid context updates

### Scenario D: Event object shows undefined/NaN position
**Conclusion**: Event malformation confirmed  
**Action**: Fix event creation at source

## Summary

Phase 1 investigation is fully implemented with comprehensive logging at every critical point in the SCRUBBER.DRAG event flow. The key indicator will be whether 🔴 [SM-1] appears, which will definitively tell us if XState crashes internally or if our handler executes.

**Ready for testing** - Run the application and trigger the crash to collect diagnostic data.