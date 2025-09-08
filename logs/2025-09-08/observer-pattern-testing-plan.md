# Observer Pattern Testing Plan - Real Course Edit Flow

**Date**: 2025-09-08  
**Goal**: Test observer system with actual video uploads, chapter operations, and WebSocket events  
**Priority**: Verify no infinite loops + real-time functionality works  

## Critical Testing Scenarios

### 1. Video Upload Flow Testing

**What to Test**: End-to-end video upload with real-time progress updates

**Steps**:
1. Navigate to course edit page (EditCourseV3Page)
2. Open browser dev tools → Console tab
3. Create or select a chapter  
4. Upload a video file (use small test file ~1-5MB)
5. Watch console for observer events

**Expected Observer Console Output**:
```
📡 Observer: Subscribed to upload-progress
📡 Observer: Subscribed to upload-complete  
📨 WebSocket message received: upload-progress {...}
📡 Observer: Emitting upload-progress to 1 listeners
📈 Upload progress via Observer: 25
📈 Upload progress via Observer: 50
📈 Upload progress via Observer: 100
📤 Upload completed via Observer: {...}
```

**Success Criteria**:
- ✅ No infinite re-render errors in console
- ✅ Observer events appear for upload progress
- ✅ Video appears in UI after upload
- ✅ Toast notification shows "Upload completed"
- ✅ No excessive WebSocket re-subscriptions

---

### 2. Chapter Operations Testing

**What to Test**: Chapter create, update, delete with WebSocket confirmations

**Steps**:
1. Open course edit page with console open
2. **Create Chapter**: 
   - Click "Add Chapter" 
   - Enter chapter title
   - Save changes
3. **Update Chapter**:
   - Edit chapter title inline
   - Save changes  
4. **Delete Chapter**:
   - Mark chapter for deletion
   - Save changes

**Expected Observer Console Output**:
```
📡 Observer: Subscribed to chapter-create-complete
📡 Observer: Subscribed to chapter-update-complete
📡 Observer: Subscribed to chapter-delete-complete
📚 Starting WebSocket chapter update: operation-123
📨 WebSocket message received: chapter-update-complete
📡 Observer: Emitting chapter-update-complete to 1 listeners
📚 Chapter update completed via Observer: {...}
```

**Success Criteria**:
- ✅ No infinite loops during chapter operations
- ✅ Real-time updates work (other users see changes)
- ✅ Toast notifications appear correctly
- ✅ UI updates immediately with optimistic changes
- ✅ WebSocket confirmations trigger observer events

---

### 3. Video Rename/Delete Testing

**What to Test**: Video operations with WebSocket confirmations

**Steps**:
1. Have some uploaded videos in chapters
2. **Rename Video**:
   - Click edit on video title
   - Change title and save
3. **Delete Video**:
   - Delete a video
   - Confirm deletion

**Expected Observer Console Output**:
```
📡 Observer: Subscribed to video-update-complete
📡 Observer: Subscribed to video-delete-complete
🎬 Video update completed via Observer: {...}
🗑️ Video deleted via Observer: {...}
```

---

### 4. Infinite Loop Prevention Testing

**What to Test**: Operations that previously caused infinite loops

**Rapid Fire Test**:
1. Quickly perform multiple operations:
   - Create chapter → Upload video → Rename video → Delete video
   - Do this rapidly (5-10 operations in 30 seconds)
2. Monitor browser performance tab
3. Watch console for error patterns

**Memory Leak Test**:
1. Leave course edit page open for 5+ minutes
2. Perform occasional operations (every minute)
3. Check if memory usage grows excessively
4. Monitor WebSocket connection stability

**Success Criteria**:
- ✅ No "Maximum update depth exceeded" errors
- ✅ Memory usage remains stable
- ✅ No exponential growth in console logs
- ✅ Page remains responsive during rapid operations

---

### 5. Multi-Course Testing

**What to Test**: Observer system handles multiple course contexts correctly

**Steps**:
1. Open two browser tabs with different courses
2. Perform operations in both tabs simultaneously
3. Verify events only affect the correct course

**Expected Behavior**:
- Course A operations only update Course A UI
- Course B operations only update Course B UI
- No cross-course event contamination

---

## Browser Dev Tools Testing Setup

### Console Monitoring Commands

Add these to browser console for better debugging:

```javascript
// Monitor observer health
setInterval(() => {
  console.log('📊 Observer Health:', {
    ...courseEventObserver.getMetrics(),
    listeners: courseEventObserver.getListenerCount(),
    types: courseEventObserver.getEventTypes(),
    healthy: courseEventObserver.isHealthy()
  })
}, 10000)

// Monitor WebSocket subscriptions
let subscriptionCount = 0
const originalSubscribe = courseEventObserver.subscribe
courseEventObserver.subscribe = function(...args) {
  subscriptionCount++
  console.log(`🔌 Subscription #${subscriptionCount}:`, args[0])
  return originalSubscribe.apply(this, args)
}
```

### Network Tab Monitoring

**WebSocket Tab**:
- Monitor `ws://localhost:xxxx` connection
- Watch for message frequency
- Check for abnormal reconnection patterns

**Performance Tab**:
- Start recording before operations
- Look for excessive JavaScript execution time
- Check for memory leaks during video operations

---

## Testing Checklist

### Pre-Test Setup
- [ ] Start development server (`npm run dev`)
- [ ] Open browser dev tools (Console + Network + Performance)
- [ ] Navigate to course edit page
- [ ] Add observer monitoring code to console
- [ ] Have test video files ready (1MB, 10MB, 50MB)

### Core Functionality Tests
- [ ] **Video Upload**: Upload works, progress shows, no infinite loops
- [ ] **Chapter Create**: Creates successfully, WebSocket confirmation received
- [ ] **Chapter Update**: Updates work, real-time sync, proper toast notifications
- [ ] **Chapter Delete**: Deletes properly, UI updates correctly
- [ ] **Video Rename**: Renames work, WebSocket events fire correctly
- [ ] **Video Delete**: Deletion works, proper cleanup occurs

### Stress Tests
- [ ] **Rapid Operations**: 10+ operations in 1 minute, no infinite loops
- [ ] **Large File Upload**: 50MB+ file upload, progress tracking works
- [ ] **Multi-Tab Test**: Two courses open, operations don't cross-contaminate
- [ ] **Connection Drop**: Disconnect/reconnect WebSocket, operations still work
- [ ] **Extended Session**: 30+ minute session, no memory leaks

### Error Scenarios
- [ ] **Failed Upload**: Network error during upload, proper error handling
- [ ] **WebSocket Disconnect**: Operations work without WebSocket
- [ ] **Server Error**: 500 error response, proper error toast and rollback
- [ ] **Invalid Data**: Send malformed data, observer handles gracefully

---

## Expected Results Summary

### ✅ Success Indicators
- Observer events appear in console for all operations
- No "Maximum update depth exceeded" errors
- Real-time updates work (if testing with multiple browsers)
- Memory usage remains stable over time
- Toast notifications appear correctly
- UI updates are immediate and smooth

### ❌ Failure Indicators  
- Infinite re-render errors return
- Observer events not firing
- WebSocket events not reaching observer
- Memory usage growing exponentially
- UI freezing or becoming unresponsive
- Missing toast notifications
- Operations not saving to server

---

## Quick Test Commands

Start the dev server and run these quick tests:

```bash
# 1. Start development server
npm run dev

# 2. Open browser to course edit page
# http://localhost:3000/instructor/course/[course-id]/edit

# 3. Open browser console and run observer monitoring
# (paste JavaScript monitoring code from above)

# 4. Test video upload with small file
# 5. Test chapter operations (create, update, delete)
# 6. Monitor console for observer events and infinite loop errors
```

This testing approach will verify that:
1. **Observer system works** with real WebSocket events
2. **Infinite loops are eliminated** during actual operations  
3. **Real-time functionality preserved** through observer pattern
4. **Performance is stable** under normal usage

Ready to start testing the actual course edit flow?