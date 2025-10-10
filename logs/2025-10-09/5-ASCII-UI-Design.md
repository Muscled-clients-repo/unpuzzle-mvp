# Video Player UI Design - ASCII Mockup

**Created:** October 9, 2025
**Purpose:** Visual mockup of the new video sidebar integration

---

## Desktop Layout (Wide Screen)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  UNPUZZLE                                    [Course: React Hooks]           [@Student] │
└────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┬─────────────────────────────────────────────────┐
│                                      │  ┌─────────────────────────────────────────────┐ │
│                                      │  │ 🤖 AI Chat │ 📝 Notes │ ✅ Tasks │ 📊 Activity│ │
│                                      │  └─────────────────────────────────────────────┘ │
│                                      │                                                   │
│          🎬 VIDEO PLAYER             │  ┌─────────────────────────────────────────────┐ │
│                                      │  │ AI CHAT                                     │ │
│     ┌──────────────────────────┐    │  ├─────────────────────────────────────────────┤ │
│     │                          │    │  │                                             │ │
│     │                          │    │  │  💬 Student: "What is useState?"           │ │
│     │   [▶] React Hooks        │    │  │     ↳ Asked at 2:05                        │ │
│     │       Tutorial           │    │  │                                             │ │
│     │                          │    │  │  🤖 AI: useState is a React Hook that      │ │
│     │   [====|==========]      │    │  │     lets you add state to functional...    │ │
│     │   2:05 / 10:30           │    │  │                                             │ │
│     │                          │    │  │  💬 Student: "Can I use multiple?"         │ │
│     └──────────────────────────┘    │  │     ↳ Follow-up at 2:12                    │ │
│                                      │  │                                             │ │
│  ─────────────────────────────────  │  │  🤖 AI: Yes! You can call useState         │ │
│  00:00 ────●────────────── 10:30    │  │     multiple times in a component...       │ │
│                                      │  │                                             │ │
│  🔊 ═══════════════  🎬  ⚙️  ⛶     │  │                                             │ │
│                                      │  └─────────────────────────────────────────────┘ │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │                                                   │
│  React Hooks Tutorial                │  ┌─────────────────────────────────────────────┐ │
│  Duration: 10:30 | Progress: 20%    │  │ 🎯 Ask a question about the video...       │ │
│                                      │  │                                         [Send]│ │
│  📚 Course Chapter:                  │  └─────────────────────────────────────────────┘ │
│  Chapter 2 - State Management       │                                                   │
│                                      │  💡 Tip: Select video section for context       │
└──────────────────────────────────────┴─────────────────────────────────────────────────┘
```

---

## AI Chat Tab (Active)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🤖 AI Chat │ 📝 Notes │ ✅ Tasks │ 📊 Activity                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ CONVERSATION HISTORY                                        [Clear Chat] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  💬 You (2:05)                                                           │
│  "What is useState and when should I use it?"                            │
│  📍 Video Context: 2:00 - 2:15                                           │
│                                                                           │
│  🤖 AI Assistant                                                         │
│  useState is a React Hook that lets you add state to functional         │
│  components. You should use it when you need to:                        │
│  • Track values that change over time                                   │
│  • Trigger re-renders when data updates                                 │
│  • Manage component-level state                                         │
│                                                                           │
│  [👍 Helpful] [👎 Not Helpful] [💾 Save to Notes]                       │
│                                                                           │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                           │
│  💬 You (2:12)                                                           │
│  "Can I use multiple useState calls in one component?"                   │
│  📍 Follow-up question                                                   │
│                                                                           │
│  🤖 AI Assistant                                                         │
│  Yes! You can use multiple useState calls. Here's an example:           │
│                                                                           │
│  ```jsx                                                                  │
│  const [name, setName] = useState('')                                   │
│  const [age, setAge] = useState(0)                                      │
│  const [isActive, setIsActive] = useState(false)                        │
│  ```                                                                     │
│                                                                           │
│  [👍 Helpful] [👎 Not Helpful] [💾 Save to Notes]                       │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ 🎯 Ask a question...                                            [🎬 2:45]│
│                                                                      [Send]│
└─────────────────────────────────────────────────────────────────────────┘
 💡 Current video timestamp will be saved with your question
```

---

## Notes Tab

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🤖 AI Chat │ 📝 Notes │ ✅ Tasks │ 📊 Activity                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ MY NOTES                                             [+ New Note]        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  📌 useState Basics                                           [Edit] [×] │
│  🏷️ react, hooks, state                                                  │
│  ⏱️ Created: 2 mins ago                                                  │
│  ────────────────────────────────────────────────────────────────────   │
│  useState is a React Hook for adding state to functional components.    │
│  It returns an array with two elements: the current state value and     │
│  a setter function.                                                      │
│                                                                           │
│  Example: const [count, setCount] = useState(0)                          │
│                                                                           │
│  [🔗 Share with Instructor]                                              │
│  ────────────────────────────────────────────────────────────────────   │
│                                                                           │
│  📌 Multiple State Variables                                  [Edit] [×] │
│  🏷️ react, hooks                                                         │
│  ⏱️ Created: 5 mins ago | 📍 Video: 2:12                                │
│  ────────────────────────────────────────────────────────────────────   │
│  You can use multiple useState calls in a single component. Each call   │
│  manages independent state.                                              │
│                                                                           │
│  ✅ Shared with instructor on Oct 9, 1:15 PM                             │
│  ────────────────────────────────────────────────────────────────────   │
│                                                                           │
│  📌 Common Mistakes                                           [Edit] [×] │
│  🏷️ react, hooks, debugging                                             │
│  ⏱️ Created: Yesterday                                                   │
│  ────────────────────────────────────────────────────────────────────   │
│  Don't call useState inside loops or conditionals. Hooks must be        │
│  called in the same order on every render.                               │
│                                                                           │
│  [🔗 Share with Instructor]                                              │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

💡 Tip: Notes are private unless you share them with your instructor
```

---

## Tasks/Checkpoints Tab

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🤖 AI Chat │ 📝 Notes │ ✅ Tasks │ 📊 Activity                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ VIDEO CHECKPOINTS                                 2 Required | 1 Optional│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ⏱️ 3:30 - useState Quiz (Required)                          [▶ Jump To] │
│  🎯 Quiz • 5 questions • Passing: 70%                                    │
│  ────────────────────────────────────────────────────────────────────   │
│  Test your understanding of useState basics                              │
│                                                                           │
│  Status: ⏳ Not Started                                                  │
│  [Start Quiz]                                                            │
│  ────────────────────────────────────────────────────────────────────   │
│                                                                           │
│  ⏱️ 5:45 - Reflect on State Management (Required)            [▶ Jump To] │
│  💭 Reflection • Text or Voice                                           │
│  ────────────────────────────────────────────────────────────────────   │
│  Share your thoughts on when to use useState vs useReducer              │
│                                                                           │
│  Status: ⏳ Not Started                                                  │
│  [Start Reflection]                                                      │
│  ────────────────────────────────────────────────────────────────────   │
│                                                                           │
│  ⏱️ 8:20 - Advanced Patterns (Optional)                      [▶ Jump To] │
│  📚 Reading • External Link                                              │
│  ────────────────────────────────────────────────────────────────────   │
│  Learn about advanced useState patterns and performance optimization     │
│                                                                           │
│  Status: ✅ Completed (Oct 8, 2025)                                      │
│  Score: 85% (17/20)                                                      │
│  [View Results]                                                          │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

⚠️ Required checkpoints must be completed to proceed
```

---

## Activity Tab

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🤖 AI Chat │ 📝 Notes │ ✅ Tasks │ 📊 Activity                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ YOUR ACTIVITY FOR THIS VIDEO                    [Public] [Private] [All] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  🤖 AI Chat Question                                      🌍 Public       │
│  "What is useState and when should I use it?"                            │
│  📍 Video: 2:05 • 2 minutes ago                                          │
│  ────────────────────────────────────────────────────────────────────   │
│                                                                           │
│  🎤 Voice Memo                                            🌍 Public       │
│  Recorded reflection on state management (45s)                           │
│  📍 Video: 2:30 • 5 minutes ago                                          │
│  ────────────────────────────────────────────────────────────────────   │
│                                                                           │
│  📝 Note Created                                          🔒 Private      │
│  "useState Basics" - 3 tags                                              │
│  📍 Video: 2:05 • 7 minutes ago                                          │
│  ────────────────────────────────────────────────────────────────────   │
│                                                                           │
│  ✅ Quiz Completed                                        🌍 Public       │
│  "React Hooks Fundamentals" - Score: 85% (17/20)                        │
│  📍 Video: 1:30 • Yesterday                                              │
│  ────────────────────────────────────────────────────────────────────   │
│                                                                           │
│  🎯 Goal Progress                                         🔒 Private      │
│  Completed 3/5 checkpoints for this video                                │
│  📊 Overall Course Progress: 45%                                         │
│  📍 Video: 0:00 • 2 days ago                                             │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

💡 Public activities appear in the Community Feed
```

---

## Mobile Layout (Responsive - Tabs Below Video)

```
┌──────────────────────────────────────┐
│  📱 UNPUZZLE        [@Student] [☰]   │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│                                      │
│     ┌──────────────────────────┐    │
│     │                          │    │
│     │   [▶] React Hooks        │    │
│     │                          │    │
│     │   [====|====]  2:05/10:30│    │
│     └──────────────────────────┘    │
│                                      │
│  🔊 ═══════  🎬  ⚙️  ⛶             │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ 🤖 Chat │ 📝 Notes │ ✅ Tasks │ 📊   │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ AI CHAT                              │
├──────────────────────────────────────┤
│                                      │
│  💬 You (2:05)                       │
│  What is useState?                   │
│                                      │
│  🤖 AI                               │
│  useState is a React Hook that...   │
│                                      │
│  [👍] [👎] [💾 Save]                │
│                                      │
│ ─────────────────────────────────── │
│                                      │
│ 🎯 Ask a question...          [Send] │
└──────────────────────────────────────┘
```

---

## Component Structure

```
StudentVideoPlayerV2
│
├── VideoPlayer (Left/Top)
│   ├── Video Controls
│   ├── Timeline with Checkpoints
│   └── Video Info
│
└── VideoSidebar (Right/Bottom)
    │
    ├── TabNavigation
    │   ├── AI Chat Tab
    │   ├── Notes Tab
    │   ├── Tasks Tab
    │   └── Activity Tab
    │
    ├── TabContent
    │   │
    │   ├── AIChatPanel
    │   │   ├── ConversationHistory
    │   │   ├── MessageBubble (User)
    │   │   ├── MessageBubble (AI)
    │   │   └── ChatInput
    │   │
    │   ├── NotesPanel
    │   │   ├── NotesList
    │   │   ├── NoteCard
    │   │   │   ├── NoteContent
    │   │   │   ├── Tags
    │   │   │   └── ShareButton
    │   │   └── NewNoteButton
    │   │
    │   ├── TasksPanel
    │   │   ├── CheckpointsList
    │   │   └── CheckpointCard
    │   │       ├── CheckpointInfo
    │   │       ├── CompletionStatus
    │   │       └── ActionButton
    │   │
    │   └── ActivityPanel
    │       ├── FilterTabs (Public/Private/All)
    │       └── ActivityFeed
    │           └── ActivityCard
    │               ├── ActivityIcon
    │               ├── ActivityContent
    │               ├── Timestamp
    │               └── VisibilityBadge
    │
    └── ContextualHelp
        └── Tooltips/Tips
```

---

## Key Features Shown

✅ **AI Chat**
- Threaded conversations
- Video timestamp context
- Save answers to notes
- Follow-up questions

✅ **Private Notes**
- Markdown support
- Tagging system
- Share with instructor (one-way)
- Video timestamp linking

✅ **Checkpoints**
- Required vs Optional
- Quiz/Reflection/Links
- Jump to video timestamp
- Completion tracking

✅ **Activity Feed**
- Public/Private filtering
- Timeline view
- Video context
- Privacy indicators

✅ **Responsive Design**
- Desktop: Side-by-side
- Mobile: Stacked tabs below video
- Collapsible sidebar
- Touch-friendly

---

## Color Coding

- 🌍 Public = Green badges
- 🔒 Private = Gray badges
- ⏳ Pending = Yellow
- ✅ Completed = Green
- ❌ Failed = Red
- 🎯 Required = Red dot

---

## Next Steps

1. Build `VideoSidebar` component
2. Build `AIChatPanel` with real-time
3. Build `NotesPanel` with CRUD
4. Build `TasksPanel` with checkpoint detection
5. Build `ActivityPanel` with filtering
6. Integrate with StudentVideoPlayerV2
