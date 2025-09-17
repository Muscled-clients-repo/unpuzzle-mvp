# Real Course Video System Implementation Plan

## Date: 2025-09-17

## Problem Statement
Currently, students clicking "continue learning" should be taken to the video page with AI agents, but the system needs to use real courses and videos from the database instead of mock data.

## Current System Architecture

### Real Data Flow (Database-Driven)
- **Courses**: Stored in Supabase `courses` table via `/student/courses` route
- **Videos**: Uploaded to `/media` via "Browse Library" button by instructors
- **Linking**: Videos linked to chapters using `MediaSelector` component with `linkMediaMutation`
- **Structure**: Courses → Chapters → Videos (proper database relationships)

### Video Page Architecture
- **Route**: `/student/course/[courseId]/video/[videoId]`
- **Component**: `StudentVideoPlayerV2` with integrated AI sidebar
- **Current Issue**: Still has mock data dependencies instead of real database data

## Implementation Plan

### Phase 1: Data Loading Architecture Alignment
Following the professional pattern from logs/patterns (client-side IDs only, server-side data handling):

#### 1.1 Video Page Data Loading Refactor
- Remove mock data dependencies from `/src/app/student/course/[id]/video/[videoId]/page.tsx`
- Update `loadStudentVideo()` and `loadCourseById()` to use real database queries
- Ensure video loading follows the established pattern: client passes IDs, server handles all lookups

#### 1.2 Course-Video Relationship Verification
- Verify `get_user_courses()` function returns correct course data with video relationships
- Ensure chapter-video linking via `MediaSelector` creates proper database associations
- Validate video metadata includes `videoUrl`, `title`, `chapter_id`, etc.

### Phase 2: Student Course Navigation Flow

#### 2.1 Continue Learning Button Implementation
- Update `/student/courses` page "continue learning" buttons to link to correct video URLs
- Implement logic to determine "next video" or "last watched video" for each course
- Follow pattern: `/student/course/{courseId}/video/{videoId}`

#### 2.2 Video Progress Tracking
- Ensure video player can track and resume progress using real video IDs
- Integrate with existing `handleTimeUpdate`, `handlePause`, `handleEnded` events
- Store progress in database linked to user and video

### Phase 3: AI Agents Integration

#### 3.1 Real Video Context for AI
- Pass real video transcript data to `StudentVideoPlayerV2`
- Ensure AI agents receive actual course context (not mock data)
- Verify `videoId` parameter correctly identifies videos for AI interactions

#### 3.2 Conversation System Integration
- Link AI conversations to real course goals via existing `course_goal_assignments`
- Use real instructor and course data for AI context
- Maintain conversation history per real video/course combination

### Phase 4: Data Consistency and Performance

#### 4.1 Query Optimization
- Implement TanStack Query caching for course and video data (following existing patterns)
- Use concurrent loading pattern from course edit page for video player
- Prefetch related videos in the same chapter/course

#### 4.2 Error Handling and Fallbacks
- Handle missing videos gracefully (if video deleted but course still references it)
- Implement proper loading states during data fetching
- Add error boundaries for malformed video data

## Technical Requirements

### Database Schema Validation
- Verify `courses` table has proper video relationships
- Confirm `videos` table includes all required fields for player
- Validate `course_goal_assignments` for AI context

### API Endpoints Needed
- `GET /api/courses/[courseId]` - Course with chapters and videos
- `GET /api/videos/[videoId]` - Individual video data with metadata
- `POST /api/video-progress` - Track video watching progress

### Security Considerations
- Verify student can only access videos from their assigned/purchased courses
- Implement proper RLS policies for video access
- Ensure video URLs are properly secured (following established media patterns)

## Success Criteria

1. **Student Navigation**: "Continue learning" buttons take students to correct video pages
2. **Real Data**: Video player loads actual uploaded videos (not mock data)
3. **AI Integration**: AI agents receive real course/video context for meaningful interactions
4. **Performance**: Video loading follows established caching and optimization patterns
5. **Progress Tracking**: Students can resume videos where they left off

## Architecture Alignment

This implementation follows established patterns:
- **Client-Server Separation**: Client handles IDs only, server manages data lookups
- **TanStack Query**: Consistent caching and state management
- **Professional UX**: Optimistic updates and proper loading states
- **Security First**: Proper access controls and data validation

## Dependencies
- Existing `MediaSelector` and video linking system
- TanStack Query infrastructure from course edit pages
- `StudentVideoPlayerV2` component architecture
- Goal-course assignment system for AI context