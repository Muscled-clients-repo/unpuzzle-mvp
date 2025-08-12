# Phase 7: Store Cleanup Analysis

## Files to Remove

### 1. OLD Stores (Replaced by role-specific versions)
- [ ] `src/stores/slices/course-slice.ts` - Replaced by student-course-slice and instructor-course-slice
- [ ] `src/stores/slices/video-slice.ts` - Replaced by student-video-slice and instructor-video-slice
- [ ] `src/stores/slices/user-slice.ts` - Check if still needed

### 2. OLD Services (Replaced by role-specific versions)
- [ ] `src/services/course-service.ts` - Replaced by student-course-service and instructor-course-service
- [ ] Remove from `src/services/index.ts` exports

### 3. Repository Pattern (No longer used)
- [ ] `src/data/repositories/` - Entire folder can be deleted
  - `base-repository.ts`
  - `course-repository.ts`
  - `user-repository.ts`
  - `video-repository.ts`
  - `index.ts`

### 4. Duplicate/Backup Components
- [ ] `src/components/video/student/StudentVideoPlayer-backup.tsx`
- [ ] `src/components/video/views/InstructorVideoView-backup.tsx`

### 5. Test/Example Files (Optional)
- [ ] `src/test-store.ts` - If exists
- [ ] `src/components/examples/service-usage-example.tsx` - If no longer needed

## Files to Update

### 1. Update app-store.ts
- Remove imports for old slices
- Remove old slice creation in store
- Keep new role-specific slices only

### 2. Update service exports
- Remove old service exports from `src/services/index.ts`
- Keep only role-specific services

### 3. Update type exports
- Clean up unused types from `src/types/app-types.ts`
- Keep only what's actively used

## Migration Verification

### Components Using New Stores ✅
- `/course/[id]/page.tsx` - Using student-course-slice
- `/student/courses/page.tsx` - Using student-course-slice
- `StudentVideoPlayer` - Using student-video-slice
- `InstructorVideoView` - Using instructor-video-slice

### Components That May Need Updates
- Check all imports of removed files
- Update any remaining references to old stores