# Fix Hardcoded Mock Data

## Problem
Mock data is hardcoded directly in component files instead of coming from Zustand stores.

## Files with Hardcoded Mock Data

1. `/src/app/instructor/courses/page.tsx`
   - Has `const mockCourses = [...]` array
   - Should use: `courses` from instructor slice

2. `/src/app/instructor/page.tsx`  
   - Uses hardcoded stats in components
   - Should use: `instructorStats` from store

3. `/src/app/instructor/confusions/page.tsx`
   - Check for any mock data
   - Should use: `pendingConfusions` from store

## Solution

### Step 1: Update Instructor Slice
Add missing data to `/src/stores/slices/instructor-slice.ts`:
- Add `courses` array to store
- Initialize with empty arrays
- Add `loadCourses()` action

### Step 2: Remove Mock Data from Components
- Delete all `const mockXXX` declarations
- Replace with `useAppStore()` data
- Use store actions for loading

### Step 3: Initialize Store with Mock Data (Temporary)
Until backend is ready, initialize store with mock data in the slice itself:
```typescript
// In instructor-slice.ts
const initialMockData = {
  courses: [], // Move mock courses here temporarily
  instructorStats: null
}
```

## Quick Fix Pattern
```typescript
// REMOVE THIS:
const mockCourses = [...]

// REPLACE WITH:
const { courses, loadCourses } = useAppStore()
useEffect(() => { loadCourses() }, [])
```

## Files Fixed ✅
- [x] `/instructor/courses/page.tsx` - Moved mock courses to store
- [x] `/instructor/page.tsx` - Already using store data
- [x] `/instructor/confusions/page.tsx` - Already using store data
- [x] `/instructor/lessons/page.tsx` - Already has loadLessons in store
- [x] Updated instructor slice with courses array and loadCourses action

## Result
All mock data has been successfully moved to Zustand stores. No more hardcoded mock data in components.