# Comprehensive Investigation: Videos Table Deletion Impact Analysis

**Date:** September 27, 2025
**Time:** 8:22 AM EST
**Objective:** Analyze all issues that will arise from deleting the videos table

## Executive Summary

The videos table is extensively used throughout the Unpuzzle codebase and cannot be safely deleted without significant refactoring. This investigation identifies **71 files** that reference videos, with **16 files** containing direct database queries to the videos table.

## Database Usage Analysis

### Direct Database Queries (Critical Impact)

**Files with `.from('videos')` queries:**
1. `/src/app/actions/chapter-actions.ts` - 7 queries
2. `/src/app/actions/course-actions.ts` - 3 queries
3. `/src/app/actions/student-course-actions.ts` - Multiple queries
4. `/src/app/actions/video-actions.ts` - CRUD operations
5. `/src/app/actions/get-course-videos.ts` - Video fetching
6. `/src/app/actions/cleanup-actions.ts` - Cleanup operations
7. `/src/app/api/delete-video/[id]/route.ts` - Video deletion API
8. `/src/app/api/transcription/[videoId]/route.ts` - Transcription system
9. `/src/app/api/transcription/status/route.ts` - Transcription status
10. `/src/app/api/transcription/upload/route.ts` - Transcript uploads
11. `/src/services/supabase/video-service.ts` - Core video service
12. `/src/services/supabase/video-service-refactored.ts` - Refactored service
13. `/src/hooks/use-video-summary.ts` - Video summary hooks
14. `/src/lib/auth/api-auth.ts` - Authentication for videos
15. `/src/stores/legacy/course-creation-slice.ts` - Legacy course creation
16. `/src/app/api/delete-course/[id]/route.ts` - Course deletion cascading

## Critical System Areas Affected

### 1. Student Video Player System
**Files:** `/src/app/student/course/[id]/video/[videoId]/page.tsx`
**Impact:** Complete student video experience broken
- Video playback functionality
- Progress tracking
- Navigation between videos
- Video metadata display

### 2. Transcription Workflow
**Files:** Multiple transcription APIs and services
**Impact:** Entire transcription system broken
- Video transcript generation
- Transcript uploads
- Transcript status tracking
- AI video summaries

### 3. Course Content Management
**Files:** Course and chapter actions
**Impact:** Course creation and editing broken
- Adding videos to courses
- Chapter-video relationships
- Video ordering within chapters
- Course content display

### 4. Chapter Management System
**Files:** `/src/app/actions/chapter-actions.ts`
**Impact:** Chapter functionality broken
- Creating chapters with videos
- Reordering videos within chapters
- Chapter content organization
- Bulk video operations

### 5. Video Services Layer
**Files:** Video service classes
**Impact:** Core video functionality broken
- Video CRUD operations
- Video metadata management
- Video URL handling
- Video authentication

## Database Schema Dependencies

### Foreign Key Relationships
```sql
-- These relationships will be broken:
videos.course_id → courses.id
videos.chapter_id → course_chapters.id
video_transcripts.video_id → videos.id
video_progress.video_id → videos.id
ai_interactions.video_id → videos.id (if exists)
```

### Dependent Tables
1. **video_transcripts** - Stores transcription data
2. **video_progress** - Tracks student progress
3. **ai_interactions** - AI interactions with videos (if used)

## Type System Impact

### TypeScript Type Definitions
**Files:** `/src/types/database.types.ts`, `/src/types/course.ts`
**Impact:** Type errors throughout application
- Videos table types removal
- Course interface changes
- Video-related type exports
- API response types

## API Endpoints Affected

### REST Endpoints
1. `/api/delete-video/[id]` - Video deletion
2. `/api/transcription/[videoId]` - Video transcription
3. `/api/transcription/status` - Transcription status
4. `/api/transcription/upload` - Transcript upload
5. `/api/delete-course/[id]` - Course deletion (cascading)

## UI Components Impact

### Student-Facing Components
- Video player components
- Course content listings
- Video navigation
- Progress indicators
- Video metadata displays

### Instructor-Facing Components
- Course editing interfaces
- Chapter management
- Video upload flows (legacy)
- Video organization tools

## State Management Impact

### Zustand Stores
**Files:** Various store slices
**Impact:** State management broken
- Video state management
- Course state with videos
- Student progress state
- Video player state

## Migration Requirements

### Data Migration Needs
1. **Video metadata** → media_files table
2. **Chapter relationships** → New relationship model
3. **Transcription data** → Update foreign keys
4. **Student progress** → Update video references
5. **Course content structure** → Redesign

### Code Refactoring Requirements
1. **Replace videos queries** with media_files queries
2. **Update type definitions** for new schema
3. **Refactor API endpoints** to use media_files
4. **Update UI components** for new data structure
5. **Migrate state management** to new model

## Risk Assessment

### High Risk Areas
- **Student video player** - Core functionality
- **Transcription system** - Active feature
- **Course content display** - Primary use case
- **Chapter management** - Content organization

### Medium Risk Areas
- **Course creation flows** - Administrative functions
- **Video services** - Backend functionality
- **API endpoints** - Integration points

### Low Risk Areas
- **Legacy stores** - Already marked as legacy
- **Cleanup utilities** - Administrative tools

## Recommended Approach

### Option 1: Gradual Migration (Safer)
1. Add media_files relationships to existing code
2. Create videos → media_files mapping
3. Gradually replace videos queries
4. Maintain backward compatibility
5. Delete videos table last

### Option 2: Big Bang Migration (Riskier)
1. Create comprehensive migration script
2. Update all code simultaneously
3. Test extensively
4. Deploy all changes together

### Option 3: Hybrid Approach (Recommended)
1. Keep videos table structure
2. Populate from media_files data
3. Update creation flows only
4. Maintain existing read flows
5. Gradual deprecation

## Conclusion

**Deleting the videos table requires extensive refactoring across the entire application.** The table is deeply integrated into:
- Core student experience (video player)
- Content management system
- Transcription workflow
- Course creation and editing
- Database relationships

**Estimated impact:** 71 files requiring updates, 16 files with direct database dependencies, multiple system areas requiring complete redesign.

**Recommendation:** Do not delete videos table immediately. Instead, implement hybrid approach to gradually migrate to media_files-based system while maintaining existing functionality.