# Transcript Implementation Plan

## Overview
This document outlines the plan to implement transcript functionality in the junction table architecture, based on the existing transcription code found in earlier commits.

## Current State Analysis

### What We Found from ~10 Commits Ago

1. **Transcription API Route** (`/api/transcription/[videoId]/route.ts`)
   - Handled transcript generation and storage
   - Used old videos table structure
   - Needs adaptation for junction table architecture

2. **Course Edit Page Features**
   - `useTranscriptStatus` hook for tracking transcription progress
   - `SimpleVideoPreview` component for video preview
   - Transcript upload functionality integrated into media management

3. **Student Video Page**
   - Passed transcript data to `StudentVideoPlayerV2`
   - Transcript displayed in video player interface

### Current Issues
- No transcript upload functionality in current course edit page
- No transcripts available for student video viewing
- Transcription API still references old videos table
- Student video page expects transcript data that doesn't exist

## Implementation Plan

### Phase 1: Database Schema Updates

#### 1.1 Add Transcript Storage to Junction Table
```sql
-- Add transcript column to course_chapter_media table
ALTER TABLE course_chapter_media
ADD COLUMN transcript_text TEXT,
ADD COLUMN transcript_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN transcript_uploaded_at TIMESTAMP WITH TIME ZONE;
```

#### 1.2 Create Transcript Index
```sql
-- Add index for transcript searches
CREATE INDEX idx_course_chapter_media_transcript_status
ON course_chapter_media(transcript_status);
```

### Phase 2: Update Transcription API

#### 2.1 Modify API Route Structure
- **File**: `/src/app/api/transcription/[videoId]/route.ts`
- **Changes**:
  - Replace videos table queries with course_chapter_media queries
  - Update transcript storage to use junction table
  - Maintain same API interface for backward compatibility

#### 2.2 Key Query Changes
```typescript
// OLD: Update videos table
await supabase
  .from('videos')
  .update({ transcript: transcriptText })
  .eq('id', videoId)

// NEW: Update course_chapter_media table
await supabase
  .from('course_chapter_media')
  .update({
    transcript_text: transcriptText,
    transcript_status: 'completed',
    transcript_uploaded_at: new Date().toISOString()
  })
  .eq('media_file_id', videoId)
```

### Phase 3: Course Edit Page Enhancements

#### 3.1 Restore Video Preview Component
- **File**: `/src/components/course/SimpleVideoPreview.tsx`
- **Features**:
  - Video playback for preview
  - Transcript upload interface
  - Progress tracking for transcription

#### 3.2 Add Transcript Management
- **File**: `/src/app/instructor/course/[id]/edit/page.tsx`
- **Integration Points**:
  - Add transcript tab or section to existing media management
  - Include transcript status in media cards
  - Provide upload/generate transcript actions

#### 3.3 Update Media Card Component
- **File**: `/src/components/course/MediaCard.tsx`
- **Enhancements**:
  - Show transcript status badge
  - Add transcript upload button
  - Display transcription progress

### Phase 4: Student Video Page Updates

#### 4.1 Update Video Data Loading
- **File**: `/src/app/actions/student-course-actions-junction.ts`
- **Function**: `getStudentVideoFromJunctionTable`
- **Changes**:
```typescript
// Add transcript_text to select query
.select(`
  id, name, file_type, cdn_url, transcript_text,
  course_chapter_media!inner (
    id, title, transcript_text, transcript_status,
    // ... rest of query
  )
`)
```

#### 4.2 Update Video Page Component
- **File**: `/src/app/student/course/[id]/video/[videoId]/page.tsx`
- **Changes**:
  - Pass transcript data to StudentVideoPlayerV2
  - Handle transcript formatting for display
  - Add fallback for missing transcripts

### Phase 5: Hooks and State Management

#### 5.1 Restore useTranscriptStatus Hook
- **File**: `/src/hooks/useTranscriptStatus.ts`
- **Purpose**: Track transcription progress in real-time
- **Updates**: Adapt queries for junction table architecture

#### 5.2 Update Student Video Slice
- **File**: `/src/stores/slices/student-video-slice.ts`
- **Changes**:
  - Include transcript in video data structure
  - Add transcript-related state management

## Implementation Order

### Step 1: Database Schema (Migration)
1. Create migration file for transcript columns
2. Test migration in development
3. Verify data structure

### Step 2: API Route Updates
1. Update transcription API to use junction table
2. Test transcript generation/storage
3. Verify API backward compatibility

### Step 3: Course Edit Page
1. Restore SimpleVideoPreview component
2. Add transcript management to media cards
3. Integrate transcript upload workflow
4. Test transcript upload and status tracking

### Step 4: Student Video Page
1. Update junction table action to include transcript
2. Modify video page to pass transcript data
3. Test transcript display in video player
4. Handle missing transcript cases

### Step 5: Testing and Validation
1. Test complete transcript workflow
2. Verify student access to transcripts
3. Test error handling and edge cases
4. Performance testing for transcript loading

## Technical Considerations

### Data Flow
```
Course Edit Page → Transcript Upload → course_chapter_media.transcript_text
Student Video Page → Junction Action → VideoPlayer (transcript display)
```

### Error Handling
- Handle missing transcripts gracefully
- Provide fallback for failed transcription
- Show appropriate loading states

### Performance
- Consider transcript size limits
- Implement lazy loading for large transcripts
- Cache transcript data appropriately

### Security
- Ensure RLS policies cover transcript access
- Validate transcript upload permissions
- Sanitize transcript content

## Files to be Created/Modified

### New Files
- `/supabase/migrations/098_add_transcript_to_junction_table.sql`
- `/transcript-implementation-plan.md` (this file)

### Modified Files
- `/src/app/api/transcription/[videoId]/route.ts`
- `/src/components/course/SimpleVideoPreview.tsx`
- `/src/app/instructor/course/[id]/edit/page.tsx`
- `/src/components/course/MediaCard.tsx`
- `/src/app/actions/student-course-actions-junction.ts`
- `/src/app/student/course/[id]/video/[videoId]/page.tsx`
- `/src/hooks/useTranscriptStatus.ts`
- `/src/stores/slices/student-video-slice.ts`

## Success Criteria

1. ✅ Instructors can upload/generate transcripts in course edit page
2. ✅ Transcript status is visible in media management interface
3. ✅ Students can view transcripts while watching videos
4. ✅ Transcript functionality works with junction table architecture
5. ✅ No references to old videos table remain
6. ✅ Performance is acceptable for transcript loading/display

## Risk Mitigation

- **Data Loss**: Backup any existing transcript data before migration
- **API Breaking**: Maintain API compatibility during transition
- **Performance**: Monitor transcript loading times
- **User Experience**: Provide clear feedback during transcript processing

---

**Note**: This plan assumes the existing `StudentVideoPlayerV2` component already supports transcript display. If not, additional updates to the video player component may be required.