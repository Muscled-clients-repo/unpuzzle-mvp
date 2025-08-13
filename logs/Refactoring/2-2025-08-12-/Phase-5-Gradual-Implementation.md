# Phase 5: Gradual Implementation of New Stores

## Overview
Phase 5 focuses on gradually migrating components to use the new role-specific stores while maintaining backward compatibility.

## Test Infrastructure Created

### Test Page (`/test-stores`)
- Created comprehensive test page at `/src/app/test-stores/page.tsx`
- Tests all 4 new store slices:
  - Student Course Store
  - Student Video Store  
  - Instructor Course Store
  - Instructor Video Store
- Provides visual feedback on test results
- Accessible from instructor dashboard

## Store Architecture

### Current State (Dual Store System)
```typescript
// Old stores (still in use by existing components)
- video-slice.ts (generic video state)
- course-slice.ts (generic course state)
- ai-slice.ts (AI chat state)
- user-slice.ts (user state)

// New stores (ready for gradual adoption)
- student-course-slice.ts
- student-video-slice.ts
- instructor-course-slice.ts
- instructor-video-slice.ts
```

### Backward Compatibility
The `app-store.ts` includes both old and new slices:
```typescript
export interface AppStore extends 
  CourseSlice,           // OLD - to be deprecated
  VideoSlice,            // OLD - to be deprecated
  StudentCourseSlice,    // NEW - role-specific
  StudentVideoSlice,     // NEW - role-specific
  InstructorCourseSlice, // NEW - role-specific
  InstructorVideoSlice   // NEW - role-specific
```

## Testing Process

### Manual Testing Steps
1. Navigate to `/instructor`
2. Click "Test New Stores" in Development Tools section
3. Run each test individually:
   - Student Course Store Test
   - Student Video Store Test
   - Instructor Course Store Test
   - Instructor Video Store Test
4. Verify results show green checkmarks (✅)

### Expected Test Results
```
✅ loadEnrolledCourses executed
✅ Loaded 2 enrolled courses
✅ calculateProgress returned 45%

✅ loadStudentVideo executed  
✅ Video loaded: React Hooks Deep Dive
✅ setVideoSegment(10, 30) executed
✅ Segment set: 10s to 30s
✅ addReflection executed
✅ 1 reflection(s) added
✅ clearVideoSegment executed

✅ loadInstructorCourses executed
✅ Loaded 2 instructor courses
✅ loadCourseAnalytics executed
✅ Analytics loaded: 45 students

✅ loadInstructorVideo executed
✅ Video data loaded: React Hooks Deep Dive
✅ 1 student activities found
✅ selectStudent("student-1") executed
✅ Selected student: student-1
✅ navigateToReflection(0) executed
✅ selectStudent("all") executed
```

## Next Steps for Migration

### Priority 1: Student Video Player
- Component: `/src/components/video/student/StudentVideoPlayer.tsx`
- Currently uses: Old `video-slice.ts`
- Migrate to: `student-video-slice.ts`
- Key changes:
  - Replace `setInOutPoints` with `setVideoSegment`
  - Replace `clearSelection` with `clearVideoSegment`
  - Use `loadStudentVideo` for video data

### Priority 2: Instructor Video View
- Component: `/src/components/video/views/InstructorVideoView.tsx`
- Currently uses: Old `video-slice.ts`
- Migrate to: `instructor-video-slice.ts`
- Key changes:
  - Use `loadInstructorVideo` for analytics data
  - Use `selectStudent` for filtering
  - Use `navigateToReflection` for timeline navigation

### Priority 3: Course Pages
- Student: `/src/app/student/course/[id]/page.tsx`
- Instructor: `/src/app/instructor/course/[id]/page.tsx`
- Migrate to respective course slices

## Migration Strategy

### Step-by-Step Approach
1. Create feature flag for new stores
2. Duplicate component with `-new` suffix
3. Update new component to use role-specific store
4. Test thoroughly with test page
5. Add toggle to switch between old/new
6. Monitor for issues
7. Once stable, remove old version

### Example Migration Pattern
```typescript
// Old pattern (generic store)
const { currentTime, setCurrentTime } = useAppStore()

// New pattern (role-specific store)  
const { currentVideo, loadStudentVideo } = useAppStore()
```

## Risks and Mitigation

### Risks
1. Breaking existing functionality
2. State synchronization issues
3. Performance impacts

### Mitigation
1. Keep old stores active during migration
2. Test each component individually
3. Use feature flags for rollback
4. Monitor Redux DevTools for issues

## Success Criteria
- All tests pass in test page
- No console errors
- Redux DevTools shows clean state updates
- User functionality unchanged
- Performance maintained or improved

## Timeline
- Phase 5a: Test infrastructure (COMPLETE)
- Phase 5b: Migrate StudentVideoPlayer (TODO)
- Phase 5c: Migrate InstructorVideoView (TODO)
- Phase 5d: Migrate course pages (TODO)
- Phase 5e: Remove old stores (TODO)