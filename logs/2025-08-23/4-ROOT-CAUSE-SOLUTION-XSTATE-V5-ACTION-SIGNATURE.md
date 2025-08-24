# Root Cause and Solution: XState v5 Action Signature Issue

## Critical Discovery

**Timestamp**: 2025-08-23 11:22AM EST  
**Issue**: State machine crash with "Cannot read properties of undefined"  
**Root Cause**: ✅ **XState v5 action signature mismatch**  
**Solution**: ✅ **Fixed all action handlers to use v5 destructured parameter syntax**

## The Problem

### What We Observed:
1. Valid event object sent: `{ type: 'SCRUBBER.DRAG', position: 0 }`
2. Handler received `undefined` for both context and event
3. Crash when trying to access `context.timeline.scrubber`

### Investigation Logs Revealed:
```javascript
// We sent a valid event:
📍 [2] Creating SCRUBBER.DRAG event: {event: {…}, positionType: 'number', positionValue: 0}

// But handler received undefined:
🔴 [SM-1] SCRUBBER.DRAG handler ENTERED: {eventReceived: undefined, eventType: 'undefined'}
🔴 [SM-2] Inside assign function: {event: undefined, eventPosition: undefined}

// Leading to crash:
Uncaught TypeError: Cannot read properties of undefined (reading 'scrubber')
    at eval (VideoEditorMachineV5.ts:964:35)
```

## Root Cause Analysis

### XState v4 vs v5 Action Signatures

**XState v4 (Old Pattern):**
```javascript
assign((context, event) => ({
  // context and event as separate parameters
  currentTime: event.position
}))
```

**XState v5 (New Pattern):**
```javascript
assign(({ context, event }) => ({
  // Single object parameter with context and event properties
  currentTime: event.position
}))
```

### Why It Failed:
1. We were using v4 syntax: `(context, event) =>`
2. XState v5 passes a single object: `{ context, event }`
3. Our `context` parameter received the entire object
4. Our `event` parameter received `undefined`
5. Trying to access `undefined.position` caused the crash

### Why Debug Logs Showed Undefined:
When using wrong signature:
- First parameter (`context`) = `{ context: {...}, event: {...} }`
- Second parameter (`event`) = `undefined`

So `event.position` was actually trying to access `undefined.position`

## The Solution

### Changes Applied:

1. **Fixed SCRUBBER.DRAG handler:**
```javascript
// Before:
assign((context, event) => ({

// After:
assign(({ context, event }) => ({
```

2. **Fixed all VIDEO.TIME_UPDATE handlers:**
```javascript
// Before:
actions: assign((context, event) => ({

// After:
actions: assign(({ context, event }) => ({
```

3. **Fixed SCRUBBER.END_DRAG handler:**
```javascript
// Before:
actions: assign((context) => ({

// After:
actions: assign(({ context }) => ({
```

4. **Fixed SCRUBBER.CLICK handler:**
```javascript
// Before:
actions: assign((context, event) => ({

// After:
actions: assign(({ context, event }) => ({
```

5. **Added safety check for context.timeline:**
```javascript
if (!context.timeline) {
  console.error('🔴 [SM-ERROR] context.timeline is undefined!', { context })
  return context // Return unchanged context to prevent crash
}
```

## Files Modified

1. **VideoEditorMachineV5.ts**:
   - Lines 924, 936: SCRUBBER.DRAG handler
   - Line 987: SCRUBBER.END_DRAG handler
   - Line 999: SCRUBBER.CLICK handler
   - Lines 1052, 1146, 1200, 1223: VIDEO.TIME_UPDATE handlers
   - Lines 960-963: Added context.timeline safety check

## Verification

### Before Fix:
- Event handlers received `undefined` for event parameter
- Crash when accessing event properties
- State machine stopped immediately

### After Fix:
- Event handlers correctly receive `{ context, event }` object
- Proper destructuring provides access to both context and event
- State machine continues running

## Lessons Learned

### 1. XState Version Migration
When upgrading XState versions, ALL action signatures must be updated to match the new API. The change from v4 to v5 introduced a breaking change in how actions receive parameters.

### 2. TypeScript Didn't Catch This
Despite TypeScript, this runtime error wasn't caught during compilation because:
- The action signatures are defined with flexible types
- Runtime behavior differs from compile-time expectations

### 3. Debugging Approach Was Correct
The Phase 1 investigation with comprehensive logging was crucial:
- It revealed that events were sent correctly
- It showed handlers received undefined
- It pinpointed the exact location of the issue

### 4. The Super Deep RCA Was Right
The theory that "XState crashes internally before our handlers execute" was partially correct:
- XState was trying to execute our handlers
- But the signature mismatch caused immediate failure
- From XState's perspective, our handlers were malformed

## Impact

### Fixed Issues:
1. ✅ State machine no longer crashes
2. ✅ SCRUBBER.DRAG events process correctly
3. ✅ VIDEO.TIME_UPDATE events work properly
4. ✅ Playback functionality restored
5. ✅ No more "sent to stopped actor" errors

### Remaining Considerations:
- Monitor for any other v4 → v5 migration issues
- Consider adding runtime validation for action parameters
- Update any documentation to reflect v5 patterns

## Summary

The root cause was a **simple but critical XState v5 API change** that wasn't properly migrated. The action handlers were using XState v4 syntax with separate parameters, but XState v5 expects a single destructured object parameter.

The fix was straightforward once identified: update all action signatures to use the correct v5 pattern with `({ context, event })` destructuring.

This resolves the critical state machine crash that was preventing the video editor from functioning.