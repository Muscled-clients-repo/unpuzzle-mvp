# Video Sidebar UI Integration Plan

**Created:** October 9, 2025 - 12:45 PM EST

## Overview

Leverage the existing video page chat sidebar to integrate all new features (AI chat, private notes, checkpoints, activities) in a unified, tab-based interface.

---

## Current Video Page Structure

**Existing Layout:**
- Left: Video player
- Right: Chat sidebar (always visible, persistent)

**Goal:** Transform sidebar into multi-purpose learning hub with tabs.

---

## Sidebar Tab Structure

### Tab Navigation (Top of Sidebar)

**4 Main Tabs:**
1. **💬 AI Chat** - Ask questions about video
2. **📝 Notes** - Take private notes
3. **📊 Quiz/Tasks** - View checkpoints for this video
4. **📋 Activity** - Your activity history for this video

**Tab Behavior:**
- Default tab: AI Chat (most used)
- Tabs remember state (don't clear on switch)
- Active tab indicator (underline/highlight)
- Keyboard shortcuts: Cmd+1, Cmd+2, Cmd+3, Cmd+4

---

## Tab 1: 💬 AI Chat

### Layout

**Top Section (Fixed):**
- Transcript context selector
  - Button: "Select In/Out Points" (opens timeline selector overlay on video)
  - OR Button: "Use Current Timestamp" (grabs ±30 seconds around current time)
  - Display: "Context: 1:30 - 2:15 (45s)"
- Clear context button (X icon)

**Middle Section (Scrollable Chat History):**
- Shows all Q&As for current video (grouped by timestamp)
- Each message pair:
  - **Student Question:**
    - Avatar (user)
    - Timestamp badge (e.g., "at 2:30")
    - Question text
    - Timestamp link (click → jumps video to that moment)
  - **AI Response:**
    - AI icon
    - Response text
    - Copy button, "Ask follow-up" button
- Thread indicators for follow-up questions (slight indent)

**Bottom Section (Fixed Input):**
- Text input: "Ask a question about this video..."
- Send button
- Character count
- "Follow-up" indicator if replying to previous question

### Features

**Context Management:**
- Students can change context anytime (select new in/out points)
- Context persists until changed
- Context shown in each message's metadata

**Thread Following:**
- "Ask follow-up" button on any AI response
- Sets parent_message_id to that response
- Keeps context from original question

**History Display:**
- Group by date: "Today", "Yesterday", "Oct 8"
- Show timestamp badges for each question
- Click timestamp → video jumps to that moment

---

## Tab 2: 📝 Notes

### Layout

**Two Sub-Sections (Toggle):**

#### View 1: Note List (Default)
- Search/filter bar at top
  - Search by content
  - Filter by: "All", "Video Notes", "Goal Notes", "Untagged"
  - Sort by: "Recent", "Oldest", "Goal"
- Note cards (scrollable list):
  - Title (if exists) or first 50 chars of content
  - Tags (if exists)
  - Created date
  - Video badge (if linked to video) - click → jumps to video
  - Goal badge (if linked to goal)
  - Share status: "Private" or "Shared with instructor ✓"
  - 3-dot menu: Edit, Delete, Share

#### View 2: Note Editor (When creating/editing)
- Title input (optional)
- Rich text editor (content)
- Tag input (comma-separated or tag pills)
- Context auto-detect:
  - "Link to current video?" checkbox (auto-checked)
  - "Link to goal?" dropdown (shows active goals)
- Bottom actions:
  - Save button
  - Cancel button
  - If already shared: "Shared with instructor ✓" badge (disabled)

### Features

**Note Creation:**
- Floating "+" button at bottom-right of note list
- Quick note: Type and save (minimal fields)
- Full note: Title, content, tags, context

**Sharing to Instructor:**
- Each note card has "Share with Instructor" button
- On click:
  - Confirmation modal: "This will send this note to your instructor in today's goal conversation. You cannot unshare once sent."
  - On confirm: Note appears in goal conversation as special message
  - Button changes to: "Shared ✓" (disabled, greyed out)
- Only shows button if note is not yet shared

**Video Context:**
- When viewing video, new notes auto-link to that video
- Video-linked notes show thumbnail + title
- Click video badge → opens that video

---

## Tab 3: 📊 Quiz/Tasks

### Layout

**Checkpoint Timeline:**
- Visual timeline showing all checkpoints for this video
- Each checkpoint:
  - Timestamp marker (e.g., "5:30")
  - Type icon: 🎯 Quiz, 💭 Reflection, 🎤 Voice Memo
  - Title
  - Required badge (if is_required=true)
  - Status:
    - "Not started" (grey)
    - "In progress" (yellow)
    - "Completed ✓" (green)
  - Click → expands details

**Checkpoint Details (Expanded):**
- Full instructions
- For Quiz:
  - Number of questions
  - Passing score requirement
  - "Start Quiz" button
  - If completed: Score display, "Retake" button
- For Reflection:
  - Prompt text
  - Requirements: "Text required", "Video required", "Audio required"
  - "Submit Reflection" button
  - If completed: View submission link
- For Voice Memo:
  - Prompt text
  - Record button or upload button
  - If completed: Play recording button

**Empty State:**
- "No checkpoints for this video yet"
- Instructors see: "Add checkpoints" button

### Features

**Video Player Integration:**
- When video reaches checkpoint timestamp → auto-pause
- Modal overlay shows checkpoint
- If is_required=true: Cannot close until completed
- If is_required=false: "Skip for now" button

**Completion Tracking:**
- Links to quiz_attempts or reflections via checkpoint_id
- Shows completion date/time
- Shows score/feedback (if applicable)

---

## Tab 4: 📋 Activity

### Layout

**Activity Feed (Chronological):**
- Shows all activities for current video only
- Grouped by date: "Today", "Yesterday", "Oct 8"
- Activity cards:
  - Icon based on activity_type
  - Timestamp ("2 hours ago")
  - Action description
  - Preview content (first 100 chars)
  - Link to source (e.g., "View quiz", "See note")

**Activity Types Display:**
- **AI Chat:** "💬 Asked AI at 2:30" → Links to chat tab with that Q&A
- **Video Note:** "📝 Took notes at 3:45" → Links to notes tab
- **Voice Memo:** "🎤 Voice memo at 4:30" → Links to voice memo player
- **Quiz:** "🎯 Completed quiz at 5:00 - Score: 85%" → Links to quiz results
- **Goal Message:** "💬 Sent daily update" → Links to goal conversation (external)
- **Revenue Proof:** "💰 Submitted revenue proof" → Links to goal conversation
- **Goal Achieved:** "🎉 Goal achieved!" → Links to goal conversation

**Filter Options:**
- Filter by activity type (checkboxes)
- Date range filter
- "Show all activities" toggle (includes activities from other videos)

### Features

**Quick Navigation:**
- Click any activity → jumps to relevant location
- Video timestamp activities → jumps video player to that moment
- Goal activities → opens goal conversation in new tab/modal

**Activity Stats (Top):**
- Total activities this video
- Most recent activity timestamp
- Completion percentage (if checkpoints exist)

---

## Cross-Tab Features

### Persistent Context Awareness

**Video Player State:**
- All tabs aware of current video timestamp
- Timestamp selector always available
- Jump-to-timestamp works from any tab

**Data Sync:**
- Create note in Notes tab → appears in Activity tab immediately
- Complete quiz → Quiz tab updates status + Activity tab shows new entry
- Ask AI question → Chat tab shows it + Activity tab logs it

### Quick Actions Bar (Below Tabs)

**Always Visible Actions:**
- Current video progress: "3:45 / 12:30"
- Bookmark current moment: ⭐ icon
- Take screenshot: 📸 icon
- Quick note: ✏️ icon (opens note editor modal)

---

## Mobile Responsive Design

### Small Screens (<768px)

**Sidebar becomes:**
- Bottom drawer (swipe up to open)
- Tabs become horizontal scroll at top
- Full-screen modal on mobile
- Swipe gestures for tab switching

### Tablet (768px - 1024px)

**Sidebar becomes:**
- Collapsible panel (toggle button)
- Tabs remain horizontal
- Width: 320px (collapsed) → 480px (expanded)

---

## Instructor-Specific Features

### Checkpoint Creation (Tab 3)

**Instructors see additional UI:**
- "Add Checkpoint" button in Quiz/Tasks tab
- Timeline editor:
  - Click any timestamp on video timeline → "Add checkpoint here"
  - Modal opens with checkpoint form:
    - Type selector: Quiz / Reflection / Voice Memo
    - Title input
    - Instructions textarea
    - Type-specific fields (quiz questions, reflection prompt, etc.)
    - Settings: Required? Active?
- Checkpoint management:
  - Edit existing checkpoints
  - Toggle active/inactive
  - Delete checkpoints
  - See completion stats (how many students completed)

### Activity Monitoring

**Instructors can view:**
- Student activity feeds (per student)
- Aggregated activity stats
- Most asked AI questions (across all students)
- Common struggles (based on AI chat patterns)

---

## Technical Implementation Notes

### State Management

**Zustand Stores:**
```
- videoSidebarStore:
  - activeTab
  - chatHistory (cached)
  - notesList (cached)
  - checkpointsList (cached)
  - activitiesList (cached)
  - currentContext (in/out points)

- videoPlayerStore:
  - currentTimestamp
  - videoId
  - playbackState
```

### Data Loading Strategy

**On Sidebar Mount:**
- Load all data in parallel:
  - AI chat history (video_ai_conversations)
  - Notes (private_notes)
  - Checkpoints (instructor_video_checkpoints)
  - Activities (community_activities)
- Cache in Zustand
- Real-time subscriptions for updates

**On Tab Switch:**
- Use cached data (instant switch)
- Refresh in background if stale (>1 min old)

### Real-Time Updates

**Supabase Realtime:**
- Subscribe to video_ai_conversations (new AI responses)
- Subscribe to instructor_video_checkpoints (new checkpoints)
- Subscribe to community_activities (new activities)
- Update UI instantly on changes

---

## Success Metrics

**User Engagement:**
- Average time spent in each tab
- Tab switch frequency
- Feature adoption rates

**Learning Effectiveness:**
- AI questions per video
- Notes per video
- Checkpoint completion rates
- Follow-up question patterns

**Instructor Insights:**
- Most used features
- Common AI questions (across students)
- Checkpoint effectiveness (pass rates)

---

## Future Enhancements

**Phase 2 Features:**
- AI-generated study guides (from notes + questions)
- Note collaboration (share notes with classmates)
- Checkpoint templates (reusable quiz banks)
- Activity export (download learning history)
- Smart context suggestions (AI recommends what to select)
- Voice input for notes (speech-to-text)
- Note linking (connect related notes across videos)

---

## Component Hierarchy

```
VideoSidebar/
  ├── SidebarTabs (Navigation)
  ├── AIChatTab/
  │   ├── ContextSelector
  │   ├── ChatHistory
  │   └── ChatInput
  ├── NotesTab/
  │   ├── NoteList
  │   ├── NoteCard
  │   └── NoteEditor
  ├── QuizTasksTab/
  │   ├── CheckpointTimeline
  │   ├── CheckpointCard
  │   └── CheckpointModal (quiz/reflection UI)
  └── ActivityTab/
      ├── ActivityFilters
      └── ActivityFeed
```

---

## Key UX Principles

1. **Context Persistence:** Never lose user's context (selected transcript, drafted note, etc.)
2. **Quick Access:** Max 2 clicks to any action
3. **Visual Feedback:** Immediate confirmation for all actions
4. **No Dead Ends:** Always provide next action suggestion
5. **Learning First:** UI reinforces learning, not just tracking
