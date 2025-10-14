# Student Journey Unified Timeline Architecture

**Created:** 2025-10-14 04:05 AM EST
**Status:** Planning / Architecture Design
**Purpose:** Define how to amalgamate all student activity data (AI chat, quizzes, reflections) into one unified timeline in the Instructor Video Page's Student Journey tab

---

## Overview

The Student Journey tab in the Instructor Video Page needs to display ALL student activities in a single, chronologically-sorted timeline. This differs from the Student Video Page which separates AI Chat into its own tab and groups Quizzes + Reflections in the Agents tab.

---

## Data Sources to Merge

### 1. Quiz Attempts
- **Database Table:** `quiz_attempts`
- **Key Fields:** `id`, `user_id`, `video_id`, `course_id`, `video_timestamp`, `questions`, `user_answers`, `score`, `total_questions`, `percentage`, `created_at`
- **Display As:** Quiz activity items with score, questions, and review capability

### 2. Reflections (Voice Memos + Loom Videos)
- **Database Table:** `reflections`
- **Key Fields:** `id`, `user_id`, `video_id`, `course_id`, `reflection_type` (voice/loom), `file_url`, `duration_seconds`, `video_timestamp_seconds`, `created_at`
- **Display As:**
  - Voice memos with audio player and waveform
  - Loom videos with embedded player

### 3. AI Chat Conversations
- **Database Table:** `ai_interactions` or `ai_conversations` (need to verify exact table)
- **Key Fields:** `id`, `user_id`, `video_id`, `course_id`, `user_message`, `ai_response`, `video_timestamp`, `created_at`
- **Display As:** Chat message pairs or conversation threads

---

## Unified Activity Architecture

### Core Concept: Single Activity Type

Transform all three data sources into a unified `Activity` type that can be:
- **Sorted chronologically** (by timestamp)
- **Grouped by date** (Today, Yesterday, specific dates)
- **Rendered polymorphically** (different components based on activity type)
- **Paginated uniformly** (Load More button works across all types)

### Activity Shape Principles

1. **Common fields** for all activities:
   - Unique ID
   - Activity type discriminator (quiz/voice/loom/ai-chat)
   - Creation timestamp (for sorting)
   - Video timestamp (where in video it occurred)
   - Student identification (for "View All" mode)

2. **Type-specific nested data**:
   - Quiz activities carry quiz-specific data
   - Voice activities carry audio-specific data
   - Loom activities carry video-specific data
   - AI chat activities carry conversation-specific data

3. **Display metadata**:
   - Formatted timestamps
   - Human-readable labels
   - Icons/badges for activity types

---

## Data Transformation Strategy

### Principle: Transform at Component Level

Following the existing pattern in `AIChatSidebarV2.tsx`, transformation happens in the component that consumes the data.

**Why:**
- Database actions stay simple (return raw records)
- Component knows what display components need
- Type-safe transformation with TypeScript
- Testable transformation functions
- Matches existing codebase patterns

### Transformation Flow

1. **Database Actions** → Return raw DB records
2. **TanStack Query Hooks** → Fetch paginated data (useInfiniteQuery)
3. **Component Transformation** → Raw records → Unified Activity objects
4. **Merge & Sort** → Combine all activity types, sort by timestamp
5. **Group by Date** → Organize into "Today", "Yesterday", etc.
6. **Render** → Map to appropriate display components

---

## Component Architecture

### Primary Component
**File:** `src/components/video/instructor/StudentJourneySidebar.tsx`

**Responsibilities:**
- Student selection UI (dropdown with search + "View All" button)
- Mock metrics display (learn rate, execution rate, pace)
- Data fetching via TanStack Query hooks
- Data transformation (raw DB → unified activities)
- Activity merging and sorting
- Date grouping
- Timeline rendering
- Pagination controls (Load More button)

### Reusable Display Components

From `src/components/student/ai/AIChatSidebarV2.tsx` and related:

1. **QuizActivityItem** - Displays quiz attempts with scores and review
2. **ReflectionActivityItem** - Wrapper for voice/loom reflections
3. **MessengerAudioPlayer** (from `src/components/reflection/MessengerAudioPlayer.tsx`) - Voice memo playback
4. **LoomVideoCard** (from `src/components/reflection/LoomVideoCard.tsx`) - Loom video embed
5. **ChatActivityItem** - NEW component for AI chat messages (or adapt existing)

### Utility Functions

From `src/components/student/ai/AIChatSidebarV2.tsx`:

1. **groupActivitiesByDate()** - Groups activities by Today/Yesterday/Date
2. **formatDateHeader()** - Formats date strings for display
3. **formatTime()** - Formats timestamps for activity items
4. **formatVideoTimestamp()** - Converts seconds to MM:SS format

---

## TanStack Query Integration

### Three Infinite Query Hooks

1. **useInfiniteQuizAttemptsQuery**
   - Query Key: `['instructor-quiz-attempts', videoId, courseId, userId]`
   - Fetches: Quiz attempts with pagination
   - Filter: By selected student (or all students)

2. **useInfiniteReflectionsQuery**
   - Query Key: `['instructor-reflections', videoId, courseId, userId]`
   - Fetches: Voice memos and Loom videos with pagination
   - Filter: By selected student (or all students)

3. **useInfiniteAIChatQuery**
   - Query Key: `['instructor-ai-chat', videoId, courseId, userId]`
   - Fetches: AI conversation history with pagination
   - Filter: By selected student (or all students)

### Pagination Strategy

- **Pattern:** Offset-based pagination (LIMIT/OFFSET)
- **Page Size:** 10-20 activities per page
- **Load More:** Button at bottom of timeline
- **Reset:** When student selection changes, reset pagination
- **Merge Pages:** Flatten all pages from all queries before sorting

### Query Invalidation

When student changes selection:
- Invalidate all three query caches for previous student
- Fetch fresh data for new student
- Reset pagination to page 1

---

## Student Selection Modes

### Mode 1: Single Student Selected

- **Filter:** `user_id = selectedStudentId`
- **Display:** "Alice Johnson's Journey"
- **Metrics:** Individual student metrics (mock for now)
- **Activities:** Only Alice's activities in timeline

### Mode 2: View All Students

- **Filter:** `user_id IN (all enrolled students)`
- **Display:** "All Students' Journey"
- **Metrics:** Aggregated metrics across all students (mock for now)
- **Activities:** Interleaved timeline from all students
- **Each Activity Shows:** Student name/avatar
- **Sorting:** Still chronological by timestamp
- **Pagination:** Critical (potentially hundreds of activities)

---

## Timeline Rendering Structure

### Visual Hierarchy

```
┌─ Student Journey Tab ─────────────────────────────────────┐
│                                                             │
│  [Student Selector: Alice Johnson ▼]  [View All Button]   │
│                                                             │
│  ┌─ Metrics Section ────────────────────────────────────┐  │
│  │  Learn Rate: 45 min/hr                               │  │
│  │  Execution Rate: 78%                                 │  │
│  │  Execution Pace: 12s avg                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Activity Timeline ───────────────────────────────────┐ │
│  │                                                        │ │
│  │  === Today ===                                        │ │
│  │  🤖 AI Chat: "How does useState work?" (3:45 PM)     │ │
│  │  🎤 Voice Memo at 12:30 (2:15 PM)                    │ │
│  │  📝 Quiz: React Hooks - 8/10 (1:20 PM)              │ │
│  │                                                        │ │
│  │  === Yesterday ===                                    │ │
│  │  🎥 Loom Video at 5:45 (4:30 PM)                     │ │
│  │  🤖 AI Chat: "Explain useEffect" (2:10 PM)          │ │
│  │  📝 Quiz: Lifecycle - 9/10 (11:00 AM)               │ │
│  │                                                        │ │
│  │  === Jan 12 ===                                       │ │
│  │  🎤 Voice Memo at 8:20 (6:15 PM)                     │ │
│  │  📝 Quiz: Props vs State - 10/10 (3:00 PM)          │ │
│  │                                                        │ │
│  │  [Load More Button]                                   │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Grouping Logic

1. **Sort all activities by timestamp** (descending - newest first)
2. **Group by date category:**
   - Today: Activities from current date
   - Yesterday: Activities from previous date
   - Specific dates: "Jan 12", "Jan 11", etc.
3. **Render date headers** with visual separation
4. **Render activities under each date** in chronological order
5. **Show Load More** when more pages available

---

## AI Chat Integration Options

### Option A: Individual Chat Messages as Activities (Recommended)

**Concept:** Each user question + AI response pair becomes one activity item

**Pros:**
- Consistent with other activity types
- Shows chat activity interspersed with quizzes/reflections
- Clear chronological order of all interactions
- Easy to implement (same pattern as other activities)

**Cons:**
- Could clutter timeline for students who chat heavily
- Multiple chat items might dominate the view

**Display Format:**
```
🤖 AI Chat at 3:45 PM
Q: "How does useState work?"
A: "useState is a React Hook that..."
[Expand for full conversation]
```

### Option B: Grouped Conversation Threads

**Concept:** Group related chat messages into conversation threads

**Pros:**
- Less cluttered for heavy chat users
- Shows conversation context
- Easier to follow related questions

**Cons:**
- More complex to implement
- Harder to define "related" messages
- May hide valuable chronological context

**Display Format:**
```
🤖 AI Conversation (5 messages) at 3:45 PM
Topics: useState, useEffect, props
[Click to expand full thread]
```

### Recommendation: Option A

Use individual chat message pairs as activity items for:
- Simplicity and consistency
- True chronological interleaving
- Matches the atomic nature of other activities (each quiz, each reflection is separate)

---

## Database Actions Required

### New Server Actions to Create

**File Location:** `src/app/actions/`

1. **instructor-quiz-actions.ts**
   - `getInstructorQuizAttempts(videoId, courseId, userId?, limit, offset)`
   - Returns paginated quiz attempts
   - Filters by student if userId provided
   - **Authorization:** Verifies instructor owns the course
   - Used by useInfiniteQuizAttemptsQuery

2. **instructor-reflections-actions.ts**
   - `getInstructorReflections(videoId, courseId, userId?, limit, offset)`
   - Returns paginated voice memos and Loom videos
   - Filters by student if userId provided
   - **Authorization:** Verifies instructor owns the course
   - Used by useInfiniteReflectionsQuery

3. **instructor-ai-chat-actions.ts**
   - `getInstructorAIChats(videoId, courseId, userId?, limit, offset)`
   - Returns paginated AI conversation history
   - Filters by student if userId provided
   - **Authorization:** Verifies instructor owns the course
   - Used by useInfiniteAIChatQuery

4. **instructor-students-actions.ts** (may already exist)
   - `getEnrolledStudents(courseId)`
   - Returns list of students for selector dropdown
   - **Authorization:** Verifies instructor owns the course
   - Includes: id, name, avatar, enrollment date

---

## Multi-Instructor Security & Authorization

### Security Problem

In a multi-instructor platform, **instructors must NOT access student data from courses they don't own**. Without proper authorization checks:

- Instructor A could view Instructor B's student activities
- Malicious actors could enumerate courseIds to access unauthorized data
- Privacy violations and data leakage across instructor boundaries

### Authorization Requirements

**Every database action MUST verify:**
1. The requesting user is authenticated (`auth.uid()` exists)
2. The requesting user has `role = 'instructor'` in profiles table
3. The requesting user owns/teaches the specified courseId

### Implementation Strategy

#### Server Action Authorization Pattern

Each server action must include authorization verification BEFORE querying student data:

**Step 1: Verify Instructor Role**
```
Check profiles table: auth.uid() exists AND role = 'instructor'
```

**Step 2: Verify Course Ownership**
```
Check courses table: course.id = courseId AND course.instructor_id = auth.uid()
```

**Step 3: Query Student Data**
```
Only after Steps 1 & 2 pass, fetch quiz_attempts/reflections/ai_interactions
```

#### Database Query Authorization

All queries must include course ownership verification:

**Pattern:**
```sql
WHERE course_id = courseId
AND video_id = videoId
AND EXISTS (
  SELECT 1 FROM courses
  WHERE id = courseId
  AND instructor_id = auth.uid()
)
```

**For user-specific queries (single student selected):**
```sql
WHERE course_id = courseId
AND video_id = videoId
AND user_id = selectedUserId
AND EXISTS (
  SELECT 1 FROM courses
  WHERE id = courseId
  AND instructor_id = auth.uid()
)
```

**For "View All" queries (all students):**
```sql
WHERE course_id = courseId
AND video_id = videoId
AND user_id IN (
  SELECT user_id FROM enrollments
  WHERE course_id = courseId
)
AND EXISTS (
  SELECT 1 FROM courses
  WHERE id = courseId
  AND instructor_id = auth.uid()
)
```

#### Row Level Security (RLS) Policies

Database tables must have RLS policies enforcing instructor-course boundaries:

**For quiz_attempts table:**
```
Policy: "Instructors view quiz attempts for their courses"
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = quiz_attempts.course_id
    AND courses.instructor_id = auth.uid()
  )
)
```

**For reflections table:**
```
Policy: "Instructors view reflections for their courses"
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = reflections.course_id
    AND courses.instructor_id = auth.uid()
  )
)
```

**For ai_interactions table:**
```
Policy: "Instructors view AI chats for their courses"
USING (
  EXISTS (
    SELECT 1 FROM courses
    WHERE courses.id = ai_interactions.course_id
    AND courses.instructor_id = auth.uid()
  )
)
```

### Authorization Flow

```
1. Instructor opens Student Journey tab for Video X in Course Y
2. Component calls getInstructorQuizAttempts(videoId=X, courseId=Y)
3. Server action validates:
   a. User is authenticated (has auth.uid())
   b. User is instructor (profiles.role = 'instructor')
   c. User owns Course Y (courses.instructor_id = auth.uid())
4. If validation passes → Query student data with courseId filter
5. If validation fails → Return error "Unauthorized access"
6. RLS policies provide second layer of defense at database level
```

### Defense in Depth

**Three layers of protection:**

1. **Application Layer:** Server actions verify ownership before querying
2. **Database Layer:** RLS policies enforce ownership at query execution
3. **Query Layer:** WHERE clauses include course ownership checks

Even if one layer fails, the others prevent unauthorized access.

### Error Handling

When authorization fails, return clear error messages:

- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - User is not an instructor or doesn't own the course
- `404 Not Found` - Course doesn't exist or instructor doesn't have access

**Do NOT reveal:**
- Whether the course exists
- Who owns the course
- Number of students enrolled

Generic message: "You don't have permission to access this course's data"

### Testing Authorization

Must test these scenarios:

1. **Instructor A accesses their own course's student data** → ✅ Success
2. **Instructor A tries to access Instructor B's course** → ❌ 403 Forbidden
3. **Student tries to access instructor endpoints** → ❌ 403 Forbidden
4. **Unauthenticated user tries to access** → ❌ 401 Unauthorized
5. **Instructor A accesses invalid courseId** → ❌ 404 Not Found
6. **Direct database query bypassing server action** → ❌ Blocked by RLS

---

## File Organization

### Files to Modify

1. **`src/components/video/instructor/StudentJourneySidebar.tsx`**
   - Remove mock reflection data and rendering
   - Add TanStack Query hooks for all three data sources
   - Add transformation functions (raw DB → unified activities)
   - Add merging and sorting logic
   - Integrate existing display components
   - Keep student selector and metrics sections

### Files to Reference (Don't Modify)

1. **`src/components/student/ai/AIChatSidebarV2.tsx`**
   - Study the transformation pattern
   - Copy utility functions (grouping, formatting)
   - Reference display component usage

2. **`src/components/reflection/MessengerAudioPlayer.tsx`**
   - Reuse for voice memo display

3. **`src/components/reflection/LoomVideoCard.tsx`**
   - Reuse for Loom video display

### Files to Create

1. **`src/app/actions/instructor-quiz-actions.ts`** (if doesn't exist)
2. **`src/app/actions/instructor-reflections-actions.ts`** (if doesn't exist)
3. **`src/app/actions/instructor-ai-chat-actions.ts`** (if doesn't exist)
4. **`src/hooks/use-instructor-activities.ts`** (optional - could house TanStack Query hooks)

---

## Key Architectural Principles

### 1. Component Co-location
- StudentJourneySidebar loads its own data
- No prop drilling from parent components
- Self-contained data fetching and transformation

### 2. Unified Activity Model
- All activity types transform to same base shape
- Polymorphic rendering based on type discriminator
- Consistent sorting and grouping across types

### 3. Reuse Over Rebuild
- Use existing display components from student page
- Copy utility functions that work
- Follow established transformation patterns

### 4. Pagination First
- Design for large datasets from the start
- Load More pattern (not infinite scroll)
- Reset pagination on filter changes

### 5. Student Context Awareness
- All queries filter by selected student
- "View All" mode requires different query strategy
- Activities show student attribution in "View All" mode

### 6. Type Safety
- TypeScript interfaces for all data shapes
- Transformation functions are type-checked
- Display components receive properly typed props

### 7. Multi-Instructor Security
- Every database action verifies instructor owns the course
- RLS policies enforce course boundaries at database level
- Defense in depth: Application + Database + Query layers
- No cross-instructor data leakage
- Authorization failures return generic error messages

---

## Implementation Phases

### Phase 1: Database Actions & Security
- Create server actions for fetching data
- **Implement authorization checks (instructor owns course)**
- Add student filtering logic
- Add pagination support (limit/offset)
- **Add RLS policies for instructor access**
- Test with existing data
- **Test authorization scenarios (unauthorized access should fail)**

### Phase 2: TanStack Query Hooks
- Create useInfiniteQuery hooks for each data source
- Configure query keys and refetch behavior
- Add loading and error states
- Test data fetching independently

### Phase 3: Data Transformation
- Create transformation functions (raw DB → Activity)
- Create merging function (all sources → sorted array)
- Test transformation logic with mock data
- Ensure TypeScript types are correct

### Phase 4: UI Integration
- Update StudentJourneySidebar component
- Remove mock data and rendering
- Integrate TanStack Query hooks
- Add transformed data rendering
- Integrate display components

### Phase 5: Polish & Testing
- Add loading states for each query
- Add error handling
- Add empty states ("No activities yet")
- Test pagination (Load More button)
- Test student selection changes
- Test "View All" mode

---

## Questions to Resolve

1. **AI Chat Display Format:**
   - Individual messages vs grouped conversations?
   - How to handle multi-turn conversations?
   - Show full conversation or preview + expand?

2. **View All Mode Performance:**
   - Should we limit to X most active students?
   - Should we add additional filters (date range)?
   - How to handle 100+ students in dropdown?

3. **Activity Type Priority:**
   - Should certain activities be highlighted?
   - Should quizzes with low scores be flagged?
   - Should recent activities be emphasized?

4. **Mock Metrics Timeline:**
   - When will real metrics replace mock data?
   - What calculations are needed for real metrics?
   - Should metrics update live as activities load?

---

## Success Criteria

### Functionality
✅ Instructor can select any enrolled student and see their complete activity history
✅ All three activity types (quiz, reflection, AI chat) appear in one unified timeline
✅ Activities are sorted chronologically (newest first)
✅ Activities are grouped by date (Today, Yesterday, specific dates)
✅ Load More button works for pagination
✅ "View All" mode shows interleaved activities from all students
✅ Display components from student page are reused without modification
✅ Student selector dropdown works with search
✅ Switching students triggers new data fetch and clears old data
✅ Loading and error states are handled gracefully
✅ Empty states show appropriate messaging

### Security
✅ Instructor can ONLY access their own courses' student data
✅ Attempting to access another instructor's course returns 403 Forbidden
✅ Students cannot access instructor-only endpoints
✅ Unauthenticated requests are blocked
✅ RLS policies prevent unauthorized database access
✅ Authorization is enforced at application, database, and query levels

---

## Related Documentation

- `logs/2025-10-14/1-0347AM-Instructor-Student-Journey-Real-Data-Integration-Plan.md` - Initial planning document
- `logs/patterns/24-video-player-state-machine-architecture.md` - Video player architecture
- `src/components/student/ai/AIChatSidebarV2.tsx` - Reference implementation for activity display
- `src/components/video/instructor/StudentJourneySidebar.tsx` - Component to be refactored

---

**Next Steps:**
1. Review and approve this architecture
2. Decide on AI Chat display format (Option A vs Option B)
3. Begin Phase 1: Database Actions
4. Create TanStack Query hooks
5. Implement data transformation and UI integration
