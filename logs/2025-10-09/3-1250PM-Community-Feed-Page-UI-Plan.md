# Community Feed Page UI Plan

**Created:** October 9, 2025 - 12:50 PM EST

## Overview

Public community feed showing learning activities from all students. Combines social learning with activity tracking to foster engagement and peer learning.

---

## Page Structure

### Route
`/community` or `/community/feed`

### Layout
- **Header:** Community navigation + filters
- **Main Content:** Activity feed (center column)
- **Sidebar:** Quick stats + trending topics (optional)

---

## Header Section

### Navigation Tabs
- **Feed** (default) - All public activities
- **Courses** - Community course reviews/discussions
- **Goals** - Goal achievements showcase
- **Resources** - Shared resources/notes

### Filter Bar (Sticky)
- **Activity Type Filters (Pills/Checkboxes):**
  - All Activities (default)
  - 💬 AI Chats
  - 📝 Notes
  - 🎤 Voice Memos
  - 🎯 Quizzes
  - 💰 Revenue Proofs
  - 🎉 Goals Achieved

- **Sort Options:**
  - Recent (default)
  - Most Engaged (likes/comments if added later)
  - Trending (high activity in last 24h)

- **Course Filter:**
  - Dropdown: "All Courses" or specific course
  - Shows activities only from that course

- **Date Range:**
  - Quick filters: Today, This Week, This Month, All Time
  - Custom date picker

---

## Activity Feed (Main Content)

### Activity Card Structure

**Base Card Layout:**
```
┌─────────────────────────────────────┐
│ [Avatar] [Name] • [Time ago]        │
│ [Activity Type Icon] [Action Text]  │
│                                      │
│ [Preview Content/Snippet]           │
│                                      │
│ [Context Badges: Video, Goal, etc.] │
│ [Interaction Bar: View, Like, etc.] │
└─────────────────────────────────────┐
```

### Activity Type Displays

**1. AI Chat Activity:**
- Icon: 💬
- Header: "Asked AI about [Video Title] at 2:30"
- Content: Question preview (first 100 chars)
- Badges: Video badge (clickable → opens video)
- Action: "View Conversation" button
- On click: Opens modal with full Q&A thread

**2. Video Note Activity:**
- Icon: 📝
- Header: "Took notes on [Video Title] at 3:45"
- Content: Note preview (first 150 chars, truncated with "...")
- Badges: Video badge, tags (if public)
- Action: "View Note" button (if note is public)
- Private notes don't show content, just "took notes"

**3. Voice Memo Activity:**
- Icon: 🎤
- Header: "Recorded voice memo on [Video Title] at 4:30"
- Content: Waveform visualization or duration badge "2:15"
- Badges: Video badge
- Action: "Listen" button (if public)

**4. Quiz Activity:**
- Icon: 🎯
- Header: "Completed quiz on [Video Title] at 5:00"
- Content: "Score: 85% (17/20 correct)"
- Visual: Progress bar showing score
- Badges: Video badge, quiz difficulty
- Action: "View Results" button

**5. Goal Message Activity:**
- Icon: 💬
- Header: "Sent daily progress update for [Goal Title]"
- Content: Message preview (first 100 chars)
- Badges: Goal badge, day streak if applicable
- Action: Not clickable (private to instructor)
- Display: "Shared privately with instructor"

**6. Revenue Proof Activity:**
- Icon: 💰
- Header: "Submitted revenue proof for [Goal Title]"
- Content: "Hit $[amount] milestone!"
- Visual: Trophy/achievement badge
- Badges: Goal badge, milestone badge
- Action: Not clickable (private)
- Display: Shows achievement without sensitive details

**7. Goal Achieved Activity:**
- Icon: 🎉
- Header: "[Name] achieved [Goal Title]!"
- Content: Achievement summary (if public)
- Visual: Celebration animation (confetti on first load)
- Badges: Goal badge, completion date
- Stats: "Completed in [X] days"
- Action: "View Journey" (if student makes it public)

---

## Context Badges

**Video Badge:**
- Thumbnail + title
- Click → Opens video in new tab at specific timestamp
- Shows duration + progress bar if user has watched

**Goal Badge:**
- Goal icon + title
- Click → Opens goal details/progress page
- Shows current milestone/progress

**Course Badge:**
- Course thumbnail + name
- Click → Opens course page

**Tag Badges (for notes):**
- Small pill badges with tag names
- Click → Filters feed to show only that tag

---

## Interaction Bar (Bottom of Card)

**Actions:**
- **View Full:** Expands to show complete content
- **Jump to Video:** Opens video at specific timestamp
- **Bookmark:** Save to personal bookmarks (future)
- **React:** (Future: 👍 Helpful, 🎉 Congrats, etc.)
- **Comment:** (Future: Peer discussions)

**Stats Display:**
- "3 others asked similar questions" (for AI chats)
- "5 people completed this quiz" (for quizzes)
- "12 people watching this video" (live indicator)

---

## Empty States

**No Activities Found:**
- Icon: 🔍
- Message: "No activities match your filters"
- Action: "Clear filters" button

**First Time User:**
- Icon: 👋
- Message: "Welcome to the community feed!"
- Description: "You'll see learning activities from your peers here as they engage with courses."
- CTA: "Start learning to see your activities here"

**Private User (No Public Activities):**
- Message: "Your activities are private"
- Action: "Change privacy settings" link

---

## Sidebar (Optional - Desktop Only)

### Quick Stats Card
- **Your Activity Today:**
  - X questions asked
  - X notes taken
  - X quizzes completed
- **Community Stats:**
  - Most active course today
  - Trending topics
  - Recent goal achievements

### Trending Topics
- Auto-generated from AI chat patterns
- Shows top 5 topics students are asking about
- Click topic → filters feed to related activities
- Example: "useState hooks", "Revenue tracking", "Email marketing"

### Active Users
- Shows users currently online (green dot)
- "5 people learning right now"
- Course they're currently in (if public)

---

## Real-Time Updates

### Live Activity Stream
- New activities appear at top with slide-in animation
- "3 new activities" badge at top (click to load)
- Auto-refresh every 30 seconds (configurable)
- WebSocket connection for instant updates

### Presence Indicators
- Green dot: User online now
- Orange dot: Active in last 10 min
- Grey: Offline

---

## Privacy Controls

### Activity Visibility (User Settings)

**Per Activity Type:**
- AI Chats: Public / Private
- Notes: Public / Private / Selected notes only
- Quizzes: Show results publicly / Private
- Goals: Public achievements / Private
- Default: Most things private, only achievements public

**Global Toggle:**
- "Share my learning journey publicly"
- On: All activities public (except sensitive revenue data)
- Off: All activities private (only visible to self + instructors)

### What's Always Private:
- Goal conversation messages (student ↔ instructor)
- Revenue proof details (amounts, screenshots)
- Private notes (unless explicitly shared)
- Instructor feedback

### What's Always Public:
- Goal achievements (if student opts in)
- Public course reviews
- Community resource contributions

---

## Mobile Responsive

### Mobile Layout (<768px)

**Header:**
- Hamburger menu for filters (slide-in drawer)
- Simplified to 1 filter pill: "All Activities ▾"
- Tap to open full filter modal

**Activity Cards:**
- Full width
- Stacked layout
- Simplified badges (icons only, hover for text)
- Bottom sheet for expanded view

**Sidebar:**
- Becomes bottom navigation bar
- Quick access to: Feed, Stats, Profile

**Interactions:**
- Swipe left on card → Bookmark
- Swipe right → Skip
- Long press → Quick actions menu

---

## Performance Optimizations

### Infinite Scroll
- Load 20 activities initially
- Load next 20 when scrolling to bottom 200px
- Skeleton loaders while fetching
- "You're all caught up!" when reaching end

### Image/Video Lazy Loading
- Thumbnails load on scroll (intersection observer)
- Low-quality placeholder → High-quality on view
- Video previews load on hover (not auto-play)

### Virtual Scrolling
- For very long feeds (>100 activities)
- Only render visible cards + buffer
- Recycle DOM nodes for performance

---

## Advanced Features (Future)

### AI-Powered Insights
- "Students who asked this also asked..."
- "Related notes from other students"
- "Recommended next video based on community activity"

### Study Groups (Future)
- Create groups around specific courses/topics
- Group activity feed
- Collaborative notes

### Leaderboards (Future)
- Most active learners this week
- Quiz champions
- Goal achievement streaks

### Notifications (Future)
- "Someone asked a similar question you asked"
- "New activity in course you're taking"
- "Goal achievement from classmate"

---

## Instructor View Differences

### Additional Filters (Instructors Only)
- **Student Filter:** View specific student's public activities
- **Course Filter:** Deep-dive into course engagement
- **Checkpoint Analytics:** See completion rates

### Activity Cards Show:
- Student name (always visible to instructors)
- Completion timestamps
- Attempt counts (for quizzes/checkpoints)
- Links to student's full activity log

### Instructor Actions:
- "View Student Profile" link
- "Send Feedback" button (for quiz/goal activities)
- Flag content (if inappropriate)

---

## Component Structure

```
CommunityFeedPage/
  ├── CommunityHeader/
  │   ├── NavTabs
  │   ├── FilterBar
  │   └── SearchBar
  ├── ActivityFeed/
  │   ├── ActivityCard (dynamic based on type)
  │   │   ├── AIChatCard
  │   │   ├── NoteCard
  │   │   ├── QuizCard
  │   │   ├── GoalMessageCard
  │   │   ├── RevenueProofCard
  │   │   └── GoalAchievedCard
  │   └── InfiniteScrollLoader
  └── CommunitySidebar/
      ├── QuickStatsCard
      ├── TrendingTopics
      └── ActiveUsers
```

---

## Data Fetching Strategy

### Initial Load
```typescript
// Load first page with filters
const { data: activities } = await getCommunityActivities({
  limit: 20,
  offset: 0,
  activityTypes: selectedTypes,
  courseId: selectedCourse,
  dateRange: selectedRange,
  isPublic: true // always filter for public only
})
```

### Real-Time Subscription
```typescript
// Subscribe to new public activities
supabase
  .channel('community-feed')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'community_activities',
    filter: 'is_public=eq.true'
  }, (payload) => {
    // Add to feed with animation
    addNewActivity(payload.new)
  })
  .subscribe()
```

### Caching Strategy
- Cache activities in Zustand store
- Stale-while-revalidate pattern
- Refresh feed every 5 minutes in background
- Invalidate on user action (post new activity)

---

## Success Metrics

**Engagement:**
- Daily active users viewing feed
- Average time spent on feed
- Click-through rate on activities

**Social Learning:**
- Number of "similar question" discoveries
- Peer learning interactions (future: comments/reactions)
- Resource sharing rate

**Privacy Compliance:**
- % of users understanding privacy settings
- Opt-in rate for public activities
- Zero privacy violations

---

## Edge Cases

**User Deletes Activity:**
- Remove from feed immediately (real-time)
- Show toast: "Activity removed"
- Don't show placeholder (just remove)

**User Changes Privacy Mid-Feed:**
- Re-fetch feed with new privacy settings
- Clear cache
- Show appropriate activities only

**Offensive Content:**
- Report button on each card
- Auto-hide after X reports (pending review)
- Instructor can manually hide/delete

**Network Issues:**
- Show cached feed with "Offline" banner
- Queue actions (bookmarks, etc.) for retry
- Sync when back online

---

## Integration Points

**Video Player:**
- "Jump to moment" from activity card → Opens video page at timestamp
- Player embeds in modal for quick preview

**Goal System:**
- Goal achievement activities link to goal progress page
- Show milestone timeline in expanded view

**Course Pages:**
- "See community activity" button on course page → Filters feed to that course
- Show recent activities in course sidebar

**User Profile:**
- User's public activity history
- "View in community feed" link from profile activities
