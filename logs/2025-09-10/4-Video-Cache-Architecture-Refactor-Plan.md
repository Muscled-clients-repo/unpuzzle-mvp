# Video Cache Architecture Refactor Plan

**Date**: 2025-09-10  
**Goal**: Eliminate dual video cache confusion by moving to chapters-only architecture  
**Problem**: Videos exist in chapters cache but hooks expect video list cache  
**Solution**: Single source of truth - videos only in `chapters[].videos[]`  

---

## 🎯 **Refactor Strategy: Incremental & Testable**

### **Core Principle**
Replace all `videoKeys.list(courseId)` references with `chapterKeys.list(courseId)` operations, maintaining existing functionality while eliminating cache confusion.

---

## 📋 **Phase 1: Foundation & Testing Setup** 
**Duration**: 30 minutes  
**Risk**: Low  

### Tasks:
1. **Create backup branch**: `git checkout -b refactor-video-cache-architecture`
2. **Add comprehensive logging** to existing video operations for debugging
3. **Document current video operations** that work (for regression testing)
4. **Test current functionality** thoroughly:
   - Add videos from media library ✅
   - Delete videos from chapters ✅  
   - Video filename editing ✅
   - Video reordering ✅

### Success Criteria:
- All current video operations work as expected
- Console logs show which cache operations are happening
- Clear baseline for comparison

### **🛑 CHECKPOINT 1: USER TESTING REQUIRED**
**What to test:**
- Add 2-3 videos from media library to different chapters
- Delete videos from chapters (check they're removed from chapters but stay in media library)  
- Edit video filenames and verify they persist
- Reorder videos within a chapter

**Please confirm with me:** "✅ All current video operations work perfectly" or "❌ Found issues: [describe]"

---

## 📋 **Phase 2: Fix useVideoDelete Hook**
**Duration**: 45 minutes  
**Risk**: Low (already partially done)  

### Tasks:
1. **Complete the chapters cache lookup** (already started)
2. **Remove all `videoKeys.list()` references** from `useVideoDelete`
3. **Update optimistic updates** to work with chapters cache:
   ```typescript
   // OLD: queryClient.setQueryData(videoKeys.list(courseId), ...)
   // NEW: queryClient.setQueryData(chapterKeys.list(courseId), ...)
   ```
4. **Test delete functionality** extensively

### Success Criteria:
- Videos delete immediately without "Video not found" errors
- Videos stay deleted after refresh  
- Videos remain in media library (proper unlinking)
- No references to `videoKeys.list()` in useVideoDelete

### **🛑 CHECKPOINT 2: USER TESTING REQUIRED**  
**What to test:**
- Delete 3-5 videos from different chapters
- Verify videos disappear immediately from chapters (no "marked for deletion")
- Check videos remain in /instructor/media library
- Refresh page to confirm videos stay deleted from chapters
- No "Video not found" error toasts

**Please confirm with me:** "✅ Video deletion works perfectly" or "❌ Found issues: [describe]"

---

## 📋 **Phase 3: Fix useVideoBatchOperations Hook**
**Duration**: 1.5 hours  
**Risk**: Medium (complex hook with progress tracking)  

### Tasks:
1. **Analyze current batch operations**:
   - Video renaming batch updates
   - Progress tracking during operations
   - WebSocket integration patterns

2. **Replace video list cache with chapters cache**:
   - Update optimistic updates
   - Fix progress tracking to work with chapters structure
   - Maintain WebSocket observer patterns

3. **Test batch operations**:
   - Batch rename multiple videos
   - Verify progress updates work
   - Check WebSocket events still fire

### Success Criteria:
- Batch video renaming works without errors
- Progress indicators show correctly
- WebSocket events continue working
- No `videoKeys.list()` references remain

### **🛑 CHECKPOINT 3: USER TESTING REQUIRED**
**What to test:**
- Edit filenames of 5+ videos across different chapters
- Click Save to trigger batch rename
- Verify progress indicators show correctly  
- Confirm all video names update successfully
- Check WebSocket real-time updates work

**Please confirm with me:** "✅ Batch operations work perfectly" or "❌ Found issues: [describe]"

---

## 📋 **Phase 4: Clean Up Video Keys & Cache References**
**Duration**: 45 minutes  
**Risk**: Low  

### Tasks:
1. **Remove unused video list cache keys**:
   ```typescript
   // Remove from videoKeys:
   lists: () => [...videoKeys.all, 'list'] as const,
   list: (courseId: string) => [...videoKeys.lists(), courseId] as const,
   ```

2. **Search and destroy remaining references**:
   ```bash
   grep -r "videoKeys.list" src/ 
   grep -r "videoKeys.lists" src/
   ```

3. **Update any remaining observers or WebSocket handlers**

4. **Clean up imports and exports**

### Success Criteria:
- Zero `videoKeys.list` references in codebase
- All functionality still works
- No TypeScript errors
- Clean console (no cache warnings)

### **🛑 CHECKPOINT 4: USER TESTING REQUIRED**
**What to test:**
- All video operations from previous checkpoints still work
- No console errors or warnings
- Page loads without TypeScript errors
- I'll run: `grep -r "videoKeys.list" src/` to confirm zero references

**Please confirm with me:** "✅ Cleanup complete, all functions work" or "❌ Found issues: [describe]"

---

## 📋 **Phase 5: Optimize Chapters Cache Operations**
**Duration**: 30 minutes  
**Risk**: Low  

### Tasks:
1. **Consolidate duplicate chapter cache updates**
2. **Add proper error handling for chapter cache operations**
3. **Optimize video finding within chapters** (if needed):
   ```typescript
   // Helper function for finding videos across chapters
   function findVideoInChapters(chapters, videoId) {
     for (const chapter of chapters) {
       const video = chapter.videos?.find(v => v.id === videoId)
       if (video) return { video, chapter }
     }
     return null
   }
   ```

### Success Criteria:
- Video operations are fast and efficient
- Error handling is robust
- Code is clean and maintainable

### **🛑 CHECKPOINT 5: FINAL USER VALIDATION**  
**What to test (comprehensive):**
- Add videos from media library ✅
- Delete videos (immediate removal, stay in library) ✅  
- Edit video filenames ✅
- Reorder videos within chapters ✅
- Batch rename multiple videos ✅
- Move videos between chapters ✅
- Page refresh (data persistence) ✅
- Performance feels responsive ✅

**Please confirm with me:** "✅ All video functionality works perfectly, refactor complete!" or "❌ Found issues: [describe]"

---

## 🧪 **Testing Strategy**

### **Regression Testing Checklist** (Run after each phase):
- [ ] Add videos from media library
- [ ] Delete videos from chapters (check media library preserved)
- [ ] Edit video filenames
- [ ] Reorder videos within chapters
- [ ] Move videos between chapters
- [ ] Batch rename multiple videos
- [ ] Progress indicators during operations
- [ ] Page refresh (data persistence)
- [ ] WebSocket real-time updates

### **Rollback Plan**:
If any checkpoint fails:
1. `git checkout main` (return to working state)
2. Fix issues identified
3. Resume from last successful checkpoint

---

## 📊 **Expected Benefits**

### **Before Refactor**:
- 2 cache systems (confusing)
- "Video not found" errors
- Cache synchronization issues
- 18 `videoKeys.list()` references
- Developers confused about data location

### **After Refactor**:
- 1 cache system (clear)
- No cache lookup errors
- Single source of truth
- 0 `videoKeys.list()` references
- Clear mental model: videos belong to chapters

---

## ⚠️ **Risk Mitigation**

### **Low Risk Phases** (1, 4, 5):
- Mostly cleanup and foundation
- Easy to rollback
- No critical functionality changes

### **Medium Risk Phases** (2, 3):
- Core functionality changes
- Require careful testing
- Multiple checkpoints for validation

### **Rollback Triggers**:
- Any checkpoint fails validation
- Performance significantly degrades
- New bugs introduced that can't be quickly fixed
- WebSocket/progress tracking breaks

---

## 🚀 **Implementation Timeline**

**Total Estimated Time**: 3.5 hours  
**Total Checkpoints**: 5  
**Recommended Session**: Single focused session with breaks between phases

### **Execution Order**:
1. **Phase 1** (Foundation) → **Checkpoint 1** → ✅ Proceed or ❌ Stop
2. **Phase 2** (Delete Fix) → **Checkpoint 2** → ✅ Proceed or ❌ Rollback
3. **Phase 3** (Batch Ops) → **Checkpoint 3** → ✅ Proceed or ❌ Rollback  
4. **Phase 4** (Cleanup) → **Checkpoint 4** → ✅ Proceed or ❌ Rollback
5. **Phase 5** (Optimize) → **Checkpoint 5** → ✅ Complete or ❌ Rollback

**Success Definition**: All checkpoints pass + zero `videoKeys.list` references + full functionality maintained

---

This plan ensures **incremental progress**, **testable checkpoints**, and **safe rollback** at any point. Each phase builds on the previous one, with clear validation before proceeding.