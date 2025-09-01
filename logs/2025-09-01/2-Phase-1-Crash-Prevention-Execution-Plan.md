# Phase 1: Crash Prevention Execution Plan
**Date:** September 1, 2025  
**Goal:** Prevent white screen crashes when API returns unexpected data  
**Time Estimate:** 2 hours  
**Priority:** 🔴 CRITICAL - Must complete before backend integration

## 🎯 Success Criteria
- [ ] No crashes when instructor is null
- [ ] No crashes when arrays are undefined
- [ ] Error boundary catches component failures
- [ ] Loading states show during data fetch

## 📋 EXECUTION STEPS

### Step 1.1: Fix Instructor Property Access (20 min)
**Files to fix:**
1. `/src/components/course/ai-course-card.tsx`
   - Line 216: `course.instructor.avatar` → `course?.instructor?.avatar`
   - Line 217: `course.instructor.name` → `course?.instructor?.name`
   - Line 221: `course.instructor.name` → `course?.instructor?.name || "Instructor"`

2. `/src/app/student/courses/page.tsx`
   - Line 158: Add fallback for instructor name

3. `/src/app/instructor/courses/page.tsx`
   - Check all instructor references

**✅ CHECKPOINT 1.1:**
```bash
# Test: Temporarily modify mock data to return null instructor
# Expected: Shows "Instructor" placeholder, no crash
# User Action: Navigate to /student/courses and /instructor/courses
```

---

### Step 1.2: Fix Array Operations (30 min)
**Files to fix:**
1. `/src/app/instructor/courses/page.tsx`
   ```typescript
   // Line 53: Fix filter
   const filteredCourses = (courses || []).filter(course => {
   
   // Line 96: Fix length
   <div>{(courses || []).length}</div>
   
   // Line 110: Fix reduce
   {(courses || []).reduce((acc, c) => acc + c.students, 0)}
   ```

2. `/src/app/student/courses/page.tsx`
   ```typescript
   // Line 46: Fix forEach
   (enrolledCourses || []).forEach(course => {
   
   // Line 119: Fix length
   ({(enrolledCourses || []).length})
   
   // Line 126: Fix map
   {(enrolledCourses || []).map((course) => {
   ```

3. `/src/app/instructor/lessons/page.tsx`
   ```typescript
   // Line 57: Fix filter
   const filteredLessons = (lessons || []).filter(lesson => {
   
   // Line 101: Fix length
   {(lessons || []).length}
   
   // Line 115: Fix reduce
   {(lessons || []).reduce((acc, l) => acc + l.views, 0)}
   ```

**✅ CHECKPOINT 1.2:**
```bash
# Test: Modify store to return undefined arrays
# Expected: Shows empty state, no crash
# User Action: Check all list pages work with null data
```

---

### Step 1.3: Fix Video Array Access (10 min)
**Files to fix:**
1. `/src/components/course/ai-course-card.tsx`
   ```typescript
   // Line 246: Fix video access
   href={`/student/course/${course.id}/video/${course.videos?.[0]?.id || '1'}`}
   ```

2. `/src/app/student/courses/page.tsx`
   ```typescript
   // Line 218: Fix video navigation
   href={`/student/course/${course.id}/video/${
     course.videos?.[progress.completedLessons]?.id || 
     course.videos?.[0]?.id || 
     '1'
   }`}
   ```

**✅ CHECKPOINT 1.3:**
```bash
# Test: Courses with no videos
# Expected: Links work with fallback video ID
# User Action: Click "Continue Learning" on course with no videos
```

---

### Step 1.4: Add Error Boundaries to Routes (30 min)
**Implementation:**
```typescript
// Create wrapper component
// /src/app/instructor/courses/page.tsx
import { ErrorBoundary } from '@/components/common'

export default function TeachCoursesPage() {
  return (
    <ErrorBoundary>
      {/* existing page content */}
    </ErrorBoundary>
  )
}
```

**Files to wrap:**
1. `/src/app/instructor/courses/page.tsx`
2. `/src/app/instructor/lessons/page.tsx`
3. `/src/app/student/courses/page.tsx`
4. `/src/app/student/course/[id]/video/[videoId]/page.tsx`
5. `/src/app/instructor/course/[id]/video/[videoId]/page.tsx`
6. `/src/app/instructor/course/[id]/analytics/page.tsx`
7. `/src/app/instructor/lesson/[id]/analytics/page.tsx`
8. `/src/app/instructor/students/page.tsx`
9. `/src/app/instructor/engagement/page.tsx`
10. `/src/app/course/[id]/page.tsx`
11. `/src/app/learn/[id]/page.tsx`
12. `/src/app/instructor/confusions/page.tsx`

**✅ CHECKPOINT 1.4:**
```bash
# Test: Add temporary throw new Error('Test') in component
# Expected: See error fallback UI with retry button
# User Action: Verify each wrapped page shows error UI
```

---

### Step 1.5: Add Loading States (30 min)
**Implementation pattern:**
```typescript
// Add to each data-loading component
const { courses, loading, error } = useAppStore()

if (loading) return <LoadingSpinner />
if (error) return <ErrorFallback error={error} />

// Then safe to use data
return (
  <div>
    {(courses || []).map(...)}
  </div>
)
```

**Files to update:**
1. `/src/app/instructor/courses/page.tsx`
2. `/src/app/instructor/lessons/page.tsx`
3. `/src/app/student/courses/page.tsx`
4. `/src/app/instructor/students/page.tsx`
5. `/src/app/instructor/engagement/page.tsx`
6. `/src/app/instructor/confusions/page.tsx`

**✅ CHECKPOINT 1.5:**
```bash
# Test: Chrome DevTools → Network → Slow 3G
# Expected: See loading spinner before content
# User Action: Navigate to each page with throttled network
```

---

## 🧪 FINAL VERIFICATION

### Test Scenario 1: Null Instructor
```javascript
// Temporarily modify mock data
course: {
  id: '1',
  title: 'Test Course',
  instructor: null, // Force null
}
```
**Expected:** No crash, shows "Instructor" placeholder

### Test Scenario 2: Undefined Arrays
```javascript
// Temporarily modify store
set({ courses: undefined })
```
**Expected:** No crash, shows empty state

### Test Scenario 3: Component Error
```javascript
// Add to any component
if (Math.random() > 0.5) throw new Error('Random error')
```
**Expected:** Error boundary catches, shows fallback UI

### Test Scenario 4: Slow Network
- Chrome DevTools → Network → Slow 3G
- Navigate between pages
**Expected:** Loading spinner shows, no frozen UI

---

## 📊 Progress Tracking

| Step | Time | Status | Verified |
|------|------|--------|----------|
| 1.1 Instructor null checks | 20 min | ⏳ Pending | ❌ |
| 1.2 Array operations safety | 30 min | ⏳ Pending | ❌ |
| 1.3 Video array access | 10 min | ⏳ Pending | ❌ |
| 1.4 Error boundaries | 30 min | ⏳ Pending | ❌ |
| 1.5 Loading states | 30 min | ⏳ Pending | ❌ |
| **TOTAL** | **2 hours** | - | - |

---

## 🚦 Go/No-Go Criteria

Before proceeding to backend:
- [ ] All 5 checkpoints pass
- [ ] No white screens on API errors
- [ ] Loading states visible
- [ ] Error boundaries working

## 💭 Notes
- Keep changes minimal and surgical
- Don't refactor unrelated code
- Test after each step
- Commit after each checkpoint passes