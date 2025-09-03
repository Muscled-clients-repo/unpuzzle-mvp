# Remaining Mock Data Audit

## Files with Hardcoded Mock Data Found

### Student Routes
1. **`/src/app/student/metrics/page.tsx`**
   - `weeklyData` array - chart data
   - `courseMetrics` array - course statistics
   - `achievements` array - achievement badges

2. **`/src/app/student/reflections/page.tsx`**
   - `reflections` array - student reflections

3. **`/src/app/student/bookmarks/page.tsx`**
   - `bookmarks` array - saved content

4. **`/src/app/student/page.tsx`**
   - `recentActivity` array - activity timeline

### Instructor Routes
5. **`/src/app/instructor/promote/page.tsx`**
   - `topLearners` array - leaderboard data
   - `allSpecializations` array - skill tags

6. **`/src/app/instructor/respond/[id]/page.tsx`**
   - `similarConfusions` array - related confusions

### Community Routes
7. **`/src/app/student/community/page-original.tsx`**
   - `struggleZones` array
   - `studyCircles` array
   - `reflections` array
   - `breakthroughs` array

## Files Correctly Using Stores

### ✅ Already Fixed
- `/instructor/courses/page.tsx` - Uses store
- `/instructor/page.tsx` - Uses store
- `/instructor/confusions/page.tsx` - Uses store (combines from store)
- `/instructor/lessons/page.tsx` - Uses store

### ✅ Mock Data in Stores (Correct Location)
- `/stores/slices/community-slice.ts` - Has mock data in store
- `/stores/slices/lesson-slice.ts` - Has mock data in store
- `/stores/slices/instructor-slice.ts` - Has mock data in store

## Action Required

### Priority 1: Student Routes
Need to move mock data to user-slice or create student-specific slices:
- Metrics data
- Reflections data
- Bookmarks data
- Recent activity

### Priority 2: Instructor Routes
- Promote page data (topLearners)
- Similar confusions data

### Priority 3: Community
- Already has community-slice with mock data
- Need to update page-original.tsx to use store

## Summary
- **7 files** with hardcoded mock data in components
- **4 files** already correctly using stores
- **3 store slices** correctly holding mock data