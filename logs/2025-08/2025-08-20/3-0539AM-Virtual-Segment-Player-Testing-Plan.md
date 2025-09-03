# Virtual Segment Player Testing Plan

**Date**: August 20, 2025  
**Time**: 05:39 AM EST  
**Description**: Testing plan for virtual segment player implementation - trim playback without creating new blobs

**NOTE**: New file creation must adhere to format: `#-TimeEST-Description.md` (Run `TZ=America/New_York date "+%I%M%p"` for time)

## Implementation Status

### ✅ Completed
1. Created `VirtualSegmentPlayer` class with:
   - Segment list management
   - Frame-accurate outPoint monitoring
   - Video reuse for same-source segments
   - Timeline position mapping
   - Preloading next segment

2. Integrated into `VideoEditorSingleton`:
   - Replaced complex clip transition logic
   - Connected callbacks to state machine
   - Virtual player handles all playback

3. Updated state machine:
   - Added `PLAYBACK.CLIP_CHANGED` event
   - Added `updateCurrentClip` action
   - Virtual player now drives playback

## Test Scenarios

### Test 1: Single Trimmed Clip
1. Record a 10-second clip
2. Trim to 2-5 seconds (3 second duration)
3. Click play
4. **Expected**: Plays from 2s to 5s, then stops
5. **Verify**: Scrubber moves smoothly, preview matches

### Test 2: Multiple Trimmed Segments (Same Source)
1. Record a 10-second clip
2. Create two trims:
   - Trim 1: 1-3 seconds
   - Trim 2: 6-8 seconds
3. Arrange on timeline sequentially
4. Click play
5. **Expected**: Plays trim 1 (1-3s), then trim 2 (6-8s) seamlessly
6. **Verify**: No reload between segments, smooth transition

### Test 3: Mixed Sources
1. Record two separate clips (10s each)
2. Create trims:
   - Clip1-trim: 2-4 seconds
   - Clip2-trim: 3-6 seconds
3. Arrange on timeline
4. Click play
5. **Expected**: Plays clip1 trim, loads clip2, plays clip2 trim
6. **Verify**: Brief load for new source, but no issues

### Test 4: Scrubber Interaction
1. Setup multiple trimmed clips
2. During playback, click scrubber at different points
3. **Expected**: Jumps to correct position in correct segment
4. **Verify**: Preview shows correct frame

### Test 5: Pause/Resume
1. Setup trimmed clips
2. Play, then pause mid-segment
3. Resume playback
4. **Expected**: Continues from exact pause point
5. **Verify**: No skip or reset

### Test 6: Edge Cases
1. **Trim to very end**: Trim clip to last 0.5 seconds
2. **Tiny segments**: Multiple 0.5s trims
3. **Rapid seeking**: Click scrubber rapidly during playback
4. **Delete during playback**: Delete clip while playing

## Known Issues to Watch

1. **Frame accuracy**: Browser seeking might be slightly off
2. **Transition smoothness**: Slight pause between different sources
3. **Memory usage**: Monitor if videos are properly released
4. **Loop detection**: Edge case when video naturally ends

## Debug Commands

```javascript
// In console, check virtual player state
const vp = window.videoEditorInstance?.virtualPlayer
console.log('Segments:', vp?.segments)
console.log('Current index:', vp?.currentSegmentIndex)
console.log('Timeline position:', vp?.getCurrentTimelinePosition())
```

## Success Criteria

- [ ] No more looping through fragments
- [ ] Scrubber doesn't jump to beginning unexpectedly  
- [ ] Can extend/shrink trim edges without issues
- [ ] Smooth playback across multiple trims
- [ ] Memory efficient (reuses videos)

## Next Steps if Issues

1. **If seeking is slow**: Implement double-buffering with hidden video
2. **If transitions are rough**: Add crossfade or loading indicator
3. **If memory leaks**: Ensure proper video element cleanup
4. **If still unstable**: Fall back to "Process on Apply" approach