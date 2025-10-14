# Instructor Student Journey Tab - Real Data Integration Plan

**Date:** October 14, 2025, 3:47 AM EST
**Status:** Planning Phase - Not Started

---

## Current State Analysis

### Student Video Page (Working with Real Data)
**URL:** `http://localhost:3000/student/course/[courseId]/video/[videoId]`

**Agents Tab - Real Data Sources:**
1. **Quiz Attempts** - Database-backed
   - Query: `useQuizAttemptsQuery(videoId, courseId)`
   - Action: `getQuizAttemptsAction(videoId, courseId)`
   - Data Structure:
     ```typescript
     {
       id, video_id, course_id, user_id,
       video_timestamp, questions, user_answers,
       score, total_questions, percentage, created_at
     }
     ```
   - Display: Expandable quiz cards showing Q&A review

2. **Reflections** - Database-backed
   - Query: `useReflectionsQuery(videoId, courseId)`
   - Action: `getReflectionsAction(videoId, courseId)`
   - Data Structure:
     ```typescript
     {
       id, user_id, video_id, course_id,
       reflection_type: 'voice' | 'loom' | 'screenshot',
       file_url, duration_seconds,
       video_timestamp_seconds, created_at
     }
     ```
   - Display:
     - **Voice memos:** MessengerAudioPlayer with waveform
     - **Loom videos:** LoomVideoCard with embedded player
     - Grouped by date (Today, Yesterday, specific dates)

3. **AI Chat** - Database-backed
   - Query: `useAIConversationsQuery` (infinite scroll)
   - Action: `getVideoAIConversations(videoId)`
   - Display: Chat interface in separate tab

**Component Location:** `/src/components/student/ai/AIChatSidebarV2.tsx`

---

### Instructor Video Page (Currently Mock Data)
**URL:** `http://localhost:3000/instructor/course/[courseId]/video/[videoId]`

**Student Journey Tab - Mock Data:**
- Student selector dropdown with search
- Metrics: Learn rate, execution rate, execution pace (mock)
- Reflections list with different types (mock)
- Response functionality (partially implemented)

**Component Location:** `/src/components/video/instructor/StudentJourneySidebar.tsx`

---

## What I Understand You Want

### High-Level Goal
Transform the **Student Journey tab** in the **instructor video page** to show **real student data** from the database, similar to how the **student video page's Agents tab** works, but with multi-student selection capability.

### Key Requirements

#### 1. **Student Selection (Keep Existing)**
- ✅ Search box to find students by name/email
- ✅ "View All" button to see all students' activity
- ✅ Individual student selection to focus on one student
- **Keep this UI** - it's good for instructor workflow

#### 2. **Metrics Section (Keep Mock for Now)**
You said: *"for now u can keep learn rate execution rate and pace mock data"*
- ✅ Keep current metrics display:
  - Learn rate (min/hr)
  - Execution rate (%)
  - Execution pace (seconds)
- ✅ Keep mock data for these metrics
- ✅ Show aggregate when "View All" selected
- ✅ Show individual student metrics when one student selected

#### 3. **Real Data Integration (Main Task)**
You said: *"below that i wanna be able to see student's real data like we see in current student video page"*

**What needs to be replaced with real data:**

**A. Quiz Attempts**
- Show student's quiz attempts for this video
- Same data structure as student Agents tab
- Display format:
  - Expandable cards
  - Show score: X/Y
  - Show timestamp when quiz was taken (video timestamp)
  - When expanded: Full Q&A review
  - Color coding: Green for correct, red for incorrect answers
  - Show explanation text

**B. Reflections (Voice Memos & Loom Videos)**
- Show student's voice memos for this video
- Show student's Loom video reflections for this video
- Display format:
  - Voice memos: MessengerAudioPlayer component (waveform + play button)
  - Loom videos: LoomVideoCard component (embedded player)
  - Show timestamp when reflection was created (video timestamp)
  - Group by date (Today, Yesterday, specific dates)

**C. AI Chat Conversations**
- Show student's AI chat messages for this video
- Display format:
  - User messages (student questions)
  - AI responses
  - Chronological order
  - Show timestamps

#### 4. **Filtering Logic**
When instructor selects a specific student:
- Query filters:
  - `videoId` = current video ID
  - `courseId` = current course ID
  - `userId` = selected student's ID

When instructor selects "View All":
- Query filters:
  - `videoId` = current video ID
  - `courseId` = current course ID
  - `userId` = ALL enrolled students
- **Challenge:** Need to fetch data for ALL students in the course
- Display: Show all activity sorted by timestamp, with student name labels

---

## Technical Implementation Plan

### Architecture Pattern to Follow
Use the **same pattern** as student video page:

1. **TanStack Query for data fetching** (Server State - Layer 1)
2. **Component co-location** - StudentJourneySidebar loads its own data
3. **Lazy loading** - Only fetch when tab is active
4. **Parallel queries** - Fetch quiz attempts, reflections, and AI chats in parallel

### Data Fetching Strategy

#### Option A: Per-Student Queries (Simpler)
```typescript
// When student selected
const quizAttemptsQuery = useQuizAttemptsQuery(
  videoId,
  courseId,
  {
    enabled: selectedStudentId !== 'all',
    userId: selectedStudentId // Add filter
  }
)

const reflectionsQuery = useReflectionsQuery(
  videoId,
  courseId,
  {
    enabled: selectedStudentId !== 'all',
    userId: selectedStudentId // Add filter
  }
)

const aiConversationsQuery = useAIConversationsQuery(
  videoId,
  {
    enabled: selectedStudentId !== 'all',
    userId: selectedStudentId // Add filter
  }
)
```

#### Option B: All-Students Query (More Complex)
```typescript
// When "View All" selected
const allStudentsQuizAttemptsQuery = useAllStudentsQuizAttemptsQuery(
  videoId,
  courseId,
  { enabled: selectedStudentId === 'all' }
)

// Backend needs to:
// 1. Get all enrolled students for this course
// 2. Fetch their quiz attempts for this video
// 3. Return aggregated data with student info
```

### Database Actions Needed

**New Actions to Create:**

1. `getInstructorStudentQuizAttempts(videoId, courseId, userId)`
   - Similar to existing `getQuizAttemptsAction`
   - Add userId filter
   - Return quiz attempts for specific student

2. `getInstructorStudentReflections(videoId, courseId, userId)`
   - Similar to existing `getReflectionsAction`
   - Add userId filter
   - Return reflections for specific student

3. `getInstructorStudentAIConversations(videoId, userId)`
   - Similar to existing `getVideoAIConversations`
   - Add userId filter
   - Return AI chat history for specific student

4. `getInstructorAllStudentsActivity(videoId, courseId)` **(Optional for "View All")**
   - Aggregate all students' activity
   - Return with student info (name, email)
   - More complex query

### Component Structure

**Current:**
```
StudentJourneySidebar
├── Student selector (search + "View All")
├── Metrics section (mock data - KEEP)
└── Reflections list (mock data - REPLACE)
```

**Target:**
```
StudentJourneySidebar
├── Student selector (search + "View All") - KEEP
├── Metrics section (mock data) - KEEP
└── Real Data Section - NEW
    ├── Quiz Attempts (TanStack Query)
    ├── Reflections (TanStack Query)
    │   ├── Voice Memos (MessengerAudioPlayer)
    │   └── Loom Videos (LoomVideoCard)
    └── AI Chat (TanStack Query)
```

### Display Format

**Unified Activity Timeline:**
Similar to student Agents tab, show all activity in chronological order:

```
[Date Header: Today]

[Quiz Card - Expandable]
Quiz taken at ▶️ 2:15 • 9/10          3:45 PM
[When expanded: Show Q&A review]

[Voice Memo Card]
Voice memo submitted at ▶️ 5:30       2:15 PM
[Audio player with waveform]

[Loom Video Card]
Loom video submitted at ▶️ 8:45       1:30 PM
[Embedded Loom player]

[AI Chat Messages]
Student: "Can you explain hooks?"      12:45 PM
AI: "React hooks are..."               12:46 PM

[Date Header: Yesterday]
...
```

### Reusable Components
Use the **same components** as student video page:

1. **MessengerAudioPlayer** - Voice memo playback
   - Location: `/src/components/reflection/MessengerAudioPlayer.tsx`
   - Props: `reflectionId, fileUrl, duration, timestamp, isOwn`

2. **LoomVideoCard** - Loom video display
   - Location: `/src/components/reflection/LoomVideoCard.tsx`
   - Props: `url, timestamp, isOwn`

3. **QuizActivityItem** - Quiz card (memoized)
   - Currently in AIChatSidebarV2.tsx
   - Consider extracting to separate component

4. **Date grouping utilities** - Already in AIChatSidebarV2.tsx
   - `formatDateHeader()` - "Today", "Yesterday", or date
   - `formatTime()` - Time formatting
   - `groupActivitiesByDate()` - Group by date

---

## Differences from Student View

### What's Different for Instructors

1. **Student Selection**
   - Instructors choose which student to view
   - Students only see their own data

2. **Response Capability** (Future Enhancement)
   - You had response functionality in mock data
   - Instructors could reply to reflections
   - This would require additional backend work

3. **No Direct Actions**
   - Students can take quizzes, submit reflections
   - Instructors are viewing student data (read-only)
   - No Quiz/Reflect buttons for instructors

4. **Different Context**
   - Students: "My learning journey"
   - Instructors: "Student X's learning journey"

---

## Data Flow Architecture

### Following Component Co-location Pattern

```typescript
// StudentJourneySidebar component
export function StudentJourneySidebar({ videoId, currentVideoTime }) {
  const [selectedStudentId, setSelectedStudentId] = useState('sarah_chen')

  // Each component loads its own data (co-location)
  const quizAttemptsQuery = useInstructorStudentQuizAttemptsQuery(
    videoId,
    courseId,
    selectedStudentId,
    { enabled: selectedStudentId !== 'all' }
  )

  const reflectionsQuery = useInstructorStudentReflectionsQuery(
    videoId,
    courseId,
    selectedStudentId,
    { enabled: selectedStudentId !== 'all' }
  )

  const aiConversationsQuery = useInstructorStudentAIConversationsQuery(
    videoId,
    selectedStudentId,
    { enabled: selectedStudentId !== 'all' }
  )

  // Combine and sort all activities by timestamp
  const activities = useMemo(() => {
    const quizActivities = quizAttemptsQuery.data?.data || []
    const reflectionActivities = reflectionsQuery.data?.data || []
    const chatActivities = aiConversationsQuery.data?.conversations || []

    return [...quizActivities, ...reflectionActivities, ...chatActivities]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }, [quizAttemptsQuery.data, reflectionsQuery.data, aiConversationsQuery.data])

  // Group by date (like student view)
  const groupedActivities = groupActivitiesByDate(activities)

  return (
    // Render UI with real data
  )
}
```

### Three-Layer State Pattern

1. **Server State (TanStack Query)** - Database data
   - Quiz attempts
   - Reflections
   - AI conversations

2. **Client State (Zustand)** - NOT NEEDED HERE
   - StudentJourneySidebar doesn't need Zustand
   - All data comes from TanStack Query

3. **UI State (Local React State)** - Component state
   - `selectedStudentId` - Which student to view
   - `expandedActivity` - Which quiz card is expanded
   - `studentSearchQuery` - Search input value

---

## API Integration Points

### Existing Actions to Reference

1. `/src/app/actions/quiz-actions.ts`
   - `getQuizAttemptsAction(videoId, courseId)` - Current student version
   - Need instructor version with userId filter

2. `/src/app/actions/reflection-actions.ts`
   - `getReflectionsAction(videoId, courseId)` - Current student version
   - Need instructor version with userId filter

3. `/src/app/actions/video-ai-conversations-actions.ts`
   - `getVideoAIConversations(videoId)` - Current student version
   - Need instructor version with userId filter

### Database Schema Reference

**Tables Involved:**
1. `quiz_attempts` - Quiz data
2. `reflections` - Voice memos and Loom videos
3. `ai_conversations` or similar - AI chat history
4. `enrollments` - To get list of students in course

**Query Pattern:**
```sql
-- For specific student
SELECT * FROM quiz_attempts
WHERE video_id = ?
  AND course_id = ?
  AND user_id = ?
ORDER BY created_at DESC

-- For all students (View All)
SELECT qa.*, u.name, u.email
FROM quiz_attempts qa
JOIN enrollments e ON qa.user_id = e.user_id
JOIN users u ON e.user_id = u.id
WHERE qa.video_id = ?
  AND qa.course_id = ?
ORDER BY qa.created_at DESC
```

---

## Implementation Steps (High-Level)

### Phase 1: Backend (Database Actions)
1. Create instructor-specific query actions with userId filter
2. Add "View All" aggregated query (optional, can skip initially)
3. Test actions return correct filtered data

### Phase 2: Hooks (TanStack Query)
1. Create hooks: `useInstructorStudentQuizAttemptsQuery`
2. Create hooks: `useInstructorStudentReflectionsQuery`
3. Create hooks: `useInstructorStudentAIConversationsQuery`
4. Wrap existing actions with proper caching

### Phase 3: Component Integration
1. Remove mock data functions from StudentJourneySidebar
2. Add TanStack Query hooks with selectedStudentId dependency
3. Transform database results to activity format
4. Reuse display components from student view

### Phase 4: UI Polish
1. Add loading states (skeleton loaders)
2. Add error states (error messages)
3. Add empty states ("No activity yet")
4. Test student switching (refetch on selection change)

### Phase 5: Testing
1. Test with different students
2. Test "View All" mode
3. Test with no data (empty states)
4. Test with mixed activity types (quiz + voice + loom)

---

## Pagination Strategy

### Problem
When viewing "All Students" or even a single active student, there could be **hundreds of activities** (quizzes, reflections, AI chats). Loading all at once would:
- Slow down page load
- Overwhelm the UI
- Waste bandwidth

### Solution: Load More Pattern

**Initial Load:** 10-20 activities
**Load More Button:** Load next 10-20 activities
**Infinite Scroll Alternative:** Auto-load when scrolling near bottom (optional)

### Implementation Approach

#### Option A: Simple Offset Pagination (Recommended)
```typescript
const [currentPage, setCurrentPage] = useState(0)
const PAGE_SIZE = 20

const activitiesQuery = useInstructorStudentActivitiesQuery(
  videoId,
  courseId,
  selectedStudentId,
  {
    limit: PAGE_SIZE,
    offset: currentPage * PAGE_SIZE
  }
)

// Load More handler
const handleLoadMore = () => {
  setCurrentPage(prev => prev + 1)
  // TanStack Query will fetch next page
}
```

**Pros:**
- Simple to implement
- Works with existing database
- Easy to understand

**Cons:**
- Performance degrades with large offsets
- Can miss items if data changes between loads

#### Option B: Cursor-Based Pagination (More Robust)
```typescript
const activitiesQuery = useInfiniteQuery({
  queryKey: ['instructor-student-activities', videoId, selectedStudentId],
  queryFn: ({ pageParam = null }) =>
    getInstructorStudentActivities(videoId, courseId, selectedStudentId, {
      limit: 20,
      cursor: pageParam // Last item's ID from previous page
    }),
  getNextPageParam: (lastPage) => lastPage.nextCursor
})

// Load More handler
const handleLoadMore = () => {
  activitiesQuery.fetchNextPage()
}
```

**Pros:**
- Consistent performance regardless of dataset size
- No duplicate/missing items
- Standard pattern for infinite scroll

**Cons:**
- Requires backend support for cursor
- Slightly more complex

### Recommended Pattern: TanStack Query Infinite Queries

**Already used in the codebase for AI Chat!** (ChatInterface component uses infinite scroll)

```typescript
// Hook: useInstructorStudentActivitiesInfiniteQuery
export function useInstructorStudentActivitiesInfiniteQuery(
  videoId: string,
  courseId: string,
  userId: string | 'all'
) {
  return useInfiniteQuery({
    queryKey: ['instructor-student-activities', videoId, courseId, userId],
    queryFn: async ({ pageParam = 0 }) => {
      const result = await getInstructorStudentActivities(
        videoId,
        courseId,
        userId,
        {
          limit: 20,
          offset: pageParam
        }
      )

      return {
        activities: result.data,
        nextOffset: pageParam + 20,
        hasMore: result.data.length === 20
      }
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextOffset : undefined,
    initialPageParam: 0
  })
}
```

### UI Implementation

```typescript
// In StudentJourneySidebar component
const activitiesQuery = useInstructorStudentActivitiesInfiniteQuery(
  videoId,
  courseId,
  selectedStudentId
)

// Flatten all pages
const allActivities = activitiesQuery.data?.pages.flatMap(page => page.activities) || []

// Group by date
const groupedActivities = groupActivitiesByDate(allActivities)

return (
  <div>
    {/* Render activities */}
    {groupedActivities.map(group => (
      <div key={group.dateKey}>
        {/* Date header and activities */}
      </div>
    ))}

    {/* Load More Button */}
    {activitiesQuery.hasNextPage && (
      <Button
        onClick={() => activitiesQuery.fetchNextPage()}
        disabled={activitiesQuery.isFetchingNextPage}
        className="w-full mt-4"
      >
        {activitiesQuery.isFetchingNextPage ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading more...
          </>
        ) : (
          <>Load More Activities</>
        )}
      </Button>
    )}

    {/* End of list message */}
    {!activitiesQuery.hasNextPage && allActivities.length > 0 && (
      <p className="text-center text-sm text-muted-foreground mt-4">
        No more activities
      </p>
    )}
  </div>
)
```

### Database Query Changes

**Backend Action:**
```typescript
// Add pagination parameters
export async function getInstructorStudentActivities(
  videoId: string,
  courseId: string,
  userId: string | 'all',
  options: {
    limit?: number,      // Default: 20
    offset?: number      // Default: 0
  } = {}
) {
  const { limit = 20, offset = 0 } = options

  // Combine queries for quizzes, reflections, AI chats
  // Sort by created_at DESC
  // Apply LIMIT and OFFSET

  const query = supabase
    .from('combined_activities_view') // Or use UNION query
    .select('*')
    .eq('video_id', videoId)
    .eq('course_id', courseId)

  if (userId !== 'all') {
    query.eq('user_id', userId)
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  return { data, error }
}
```

### Handling "View All" with Pagination

When `selectedStudentId === 'all'`:
- Query returns activities from ALL enrolled students
- Still paginated (20 at a time)
- Includes student name in each activity
- Backend joins with users table to get student info

**Example:**
```typescript
// First page: 20 activities (mixed students)
[
  { studentName: "Sarah Chen", type: "quiz", ... },
  { studentName: "Mike Johnson", type: "voice", ... },
  { studentName: "Sarah Chen", type: "loom", ... },
  ...
]

// Load More: Next 20 activities
```

### Performance Considerations

**For "View All" mode:**
- Database query: `WHERE video_id = ? AND course_id = ?` (no user filter)
- Returns up to 20 activities at a time
- If 100 students × 5 activities each = 500 total activities
- User sees first 20, can load more if interested

**For single student:**
- Database query: `WHERE video_id = ? AND course_id = ? AND user_id = ?`
- Typically fewer activities per student
- Pagination still useful for very active students

### Reset Pagination on Student Change

```typescript
// Reset to first page when student selection changes
useEffect(() => {
  // When selectedStudentId changes, reset query
  activitiesQuery.refetch()
}, [selectedStudentId])
```

**TanStack Query automatically handles this** if `selectedStudentId` is in the query key!

### Loading States

```typescript
// Initial load
if (activitiesQuery.isLoading) {
  return <ActivityListSkeleton count={5} />
}

// Error state
if (activitiesQuery.isError) {
  return <ErrorMessage message="Failed to load activities" />
}

// Empty state
if (allActivities.length === 0) {
  return (
    <EmptyState
      message={
        selectedStudentId === 'all'
          ? "No student activity yet for this video"
          : `${selectedStudent.name} hasn't started this video yet`
      }
    />
  )
}

// Loading next page (show spinner below existing content)
if (activitiesQuery.isFetchingNextPage) {
  return <div>Existing activities... <Spinner /></div>
}
```

---

## Questions & Clarifications Needed

### Before Starting Implementation:

1. ~~**View All Mode:** Should we implement aggregated "View All" in first version, or skip it and require student selection?~~
   **ANSWERED:** Yes, implement with pagination (20 at a time, Load More button)

2. **Response Functionality:** The mock data has instructor response features. Should we implement this now, or focus only on displaying student data first?

3. **AI Chat Display:** Should AI chat be:
   - Mixed with quiz/reflections in unified timeline?
   - Separate section/tab within Student Journey?

4. **Filtering:** Any other filters needed? (Date range, activity type, etc.)

5. **Permissions:** Security check - should we verify instructor owns/teaches this course before showing student data?

6. **Page Size:** Confirmed 10-20 activities per page. Should we go with 15 (middle ground) or 20 (more content)?

---

## Summary

### What I Understand:

✅ **Keep existing UI:** Student selector, search, "View All" button
✅ **Keep mock metrics:** Learn rate, execution rate, pace (top section)
✅ **Replace mock reflections:** Use real database data below metrics
✅ **Show real activity:** Quizzes, voice memos, Loom videos, AI chat
✅ **Same display format:** Reuse components from student Agents tab
✅ **Component co-location:** StudentJourneySidebar loads its own data
✅ **Student filtering:** Query data based on selected student
✅ **Unified timeline:** All activity types sorted by date/time

### What Will Change:
- Mock data functions removed
- TanStack Query hooks added
- Real database queries with userId filter
- Same visual components as student view
- Grouped by date with timestamps
- Expandable quiz cards with Q&A review
- Voice memo players with waveforms
- Loom video embeds with playback

### What Stays the Same:
- Student selector UI
- Search functionality
- "View All" button
- Metrics section (still mock data)
- Overall layout and structure
