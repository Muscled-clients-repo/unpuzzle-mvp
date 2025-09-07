# TanStack Query vs Zustand: Single Source of Truth Architecture

## Core Principle: TanStack Query = Server State (SSOT), Zustand = Client State

### TanStack Query Responsibilities (Server State - Single Source of Truth)

#### 1. Course Data Management
**What it stores:**
- Course metadata (id, title, description, price, difficulty, status, created_at, updated_at)
- Course instructor information
- Course enrollment data
- Course analytics/statistics
- Course publishing state

**Cache Keys:**
```typescript
['course', courseId] // Individual course
['courses', userId] // User's courses list
['course-analytics', courseId] // Course stats
['course-students', courseId] // Enrolled students
```

**Who reads from it:**
- Course edit pages (`/instructor/course/[id]/edit`)
- Course list page (`/instructor/courses`)
- Course analytics page (`/instructor/course/[id]/analytics`)
- Course preview components
- Header/breadcrumb components
- Publishing workflows

---

#### 2. Chapter Data Management
**What it stores:**
- Virtual chapter data (derived from video chapter_id fields)
- Chapter ordering
- Chapter video counts
- Chapter durations

**Cache Keys:**
```typescript
['chapters', courseId] // All chapters for course
['chapter', chapterId] // Individual chapter (if needed)
```

**Who reads from it:**
- Chapter manager components
- Course content overview
- Student course view
- Video organization components
- Drag & drop reordering
- Course structure exports

---

#### 3. Video Data Management
**What it stores:**
- Video metadata (id, filename, duration, size, format)
- Video processing status
- Video URLs (stream, thumbnail, download)
- Video chapter assignment (chapter_id)
- Video ordering within chapters
- Upload completion status

**Cache Keys:**
```typescript
['videos', courseId] // All videos for course
['video', videoId] // Individual video
['chapter-videos', chapterId] // Videos in specific chapter
```

**Who reads from it:**
- Video list components
- Video player
- Video uploader progress
- Chapter content display
- Course content export
- Student video access
- Video analytics

---

#### 4. User & Authentication Data
**What it stores:**
- User profile (id, name, email, avatar)
- User preferences (stored on server)
- Authentication tokens
- User subscription status
- User course permissions

**Cache Keys:**
```typescript
['user'] // Current user
['user-profile', userId] // User details
['user-courses', userId] // User's course access
```

**Who reads from it:**
- Navigation/header components
- Profile pages
- Permission checks
- Billing components
- Settings pages

---

#### 5. Upload & Processing Data
**What it stores:**
- Completed upload results
- Video processing status
- Upload success/failure states
- Final video URLs after processing

**Cache Keys:**
```typescript
['upload-result', uploadId] // Individual upload result
['processing-status', videoId] // Video processing state
```

**Who reads from it:**
- Upload completion notifications
- Video availability checks
- Processing status indicators
- Course content updates after upload

---

### Zustand Responsibilities (Client/UI State)

#### 1. UI Interaction States
**What it stores:**
- Currently editing item ID and type (`editingVideoId`, `editingChapterId`)
- Modal open/close states (`videoPreviewOpen`, `settingsModalOpen`)
- Dropdown/popover states
- Tab selection (`activeTab`)
- Form dirty flags
- Validation error states

**Example store structure:**
```typescript
interface UIState {
  editing: {
    type: 'video' | 'chapter' | 'course' | null
    id: string | null
  }
  modals: {
    videoPreview: boolean
    deleteConfirmation: boolean
    settings: boolean
  }
  activeTab: string
  formDirty: boolean
}
```

**Who uses it:**
- Form components (to track dirty state)
- Modal managers
- Edit mode toggles
- Navigation guards
- Auto-save triggers

---

#### 2. Real-time Progress & Temporary States
**What it stores:**
- Upload progress percentages (before completion)
- Loading states for individual actions
- Temporary form data (before save)
- Drag & drop temporary states
- Search/filter inputs (before API call)

**Example store structure:**
```typescript
interface ProgressState {
  uploads: Record<string, {
    filename: string
    progress: number
    status: 'uploading' | 'processing' | 'complete' | 'error'
  }>
  dragState: {
    isDragging: boolean
    draggedItem: { type: string, id: string } | null
    dropTarget: string | null
  }
  filters: {
    searchTerm: string
    sortBy: string
    statusFilter: string
  }
}
```

**Who uses it:**
- Progress bars
- Upload components
- Drag & drop handlers
- Search/filter components
- Loading spinners

---

#### 3. User Preferences (Client-Side)
**What it stores:**
- UI theme (dark/light)
- Layout preferences (sidebar collapsed, grid vs list view)
- Local settings not synced to server
- Recently viewed items
- Client-side feature flags

**Example store structure:**
```typescript
interface PreferencesState {
  theme: 'light' | 'dark' | 'system'
  sidebarCollapsed: boolean
  viewMode: 'grid' | 'list'
  recentlyViewed: string[]
  featureFlags: Record<string, boolean>
}
```

**Who uses it:**
- Theme provider
- Layout components
- View mode toggles
- Recent items lists
- Feature flag checks

---

#### 4. Navigation & History States
**What it stores:**
- Navigation history for breadcrumbs
- Previous page context
- Tab navigation state
- Wizard/multi-step form progress

**Example store structure:**
```typescript
interface NavigationState {
  breadcrumbs: Array<{
    label: string
    href: string
  }>
  previousPage: string | null
  wizardStep: number
  tabHistory: string[]
}
```

**Who uses it:**
- Breadcrumb components
- Back button logic
- Multi-step forms
- Tab navigation

---

### Integration Patterns

#### 1. Data Flow
```
Server → TanStack Query Cache → React Components
                ↑
User Actions → Zustand (UI state) → TanStack Mutations → Server
```

#### 2. Example Component Usage
```typescript
function VideoEditor({ videoId }: { videoId: string }) {
  // Read from TanStack (SSOT)
  const { data: video } = useQuery({
    queryKey: ['video', videoId],
    queryFn: () => getVideo(videoId)
  })
  
  // Read/Write UI state from Zustand
  const { editing, setEditing } = useUIStore()
  const isEditing = editing.type === 'video' && editing.id === videoId
  
  // Mutations update TanStack cache
  const updateVideo = useMutation({
    mutationFn: updateVideoAction,
    onSuccess: () => {
      queryClient.setQueryData(['video', videoId], updatedData)
      setEditing({ type: null, id: null }) // Clear UI state
    }
  })
}
```

#### 3. State Boundaries
- **TanStack Query**: If it exists on the server, it lives here
- **Zustand**: If it's purely UI/client-side, it lives here
- **Never duplicate**: Data should never exist in both stores

#### 4. Cache Invalidation Strategy
- **Optimistic updates**: Update TanStack cache immediately
- **Background sync**: Refetch after delay for reconciliation
- **Error rollback**: Revert TanStack cache on mutation failure
- **UI state cleanup**: Clear Zustand state after successful mutations

### Rules & Best Practices

#### 1. TanStack Query Rules
- All server data goes through TanStack Query
- Components NEVER bypass TanStack to call server directly
- Use optimistic updates for instant UI feedback
- Always handle error states with rollback
- Use background refetching for data reconciliation

#### 2. Zustand Rules
- Only store client-side, temporary, or UI-specific state
- Clear UI state after successful server operations
- Don't persist server data in Zustand
- Use selectors to prevent unnecessary re-renders

#### 3. Integration Rules
- Mutations can read from both stores but only update their respective domains
- Components can subscribe to both stores simultaneously
- UI actions may trigger both Zustand updates AND TanStack mutations
- Never duplicate state between the two systems

### Migration Strategy

#### Phase 1: TanStack Query Foundation
1. Move all course/chapter/video data to TanStack Query
2. Remove all server data from component state
3. Implement optimistic updates for all mutations

#### Phase 2: Zustand UI Layer
1. Extract all UI state to Zustand stores
2. Remove UI state from component useState
3. Implement proper state cleanup patterns

#### Phase 3: Integration & Testing
1. Test all data flows work correctly
2. Verify no state duplication exists
3. Confirm optimistic updates work as expected
4. Test error handling and rollback scenarios

This architecture ensures:
- ✅ Single source of truth for server data
- ✅ Clear separation of concerns
- ✅ No race conditions between state systems
- ✅ Predictable data flow
- ✅ Proper error handling and rollback
- ✅ Optimal performance with minimal re-renders