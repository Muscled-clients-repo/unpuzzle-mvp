# Course Creation & Edit Flow Architecture Principles

## Core Architecture Pattern: Professional 3-Layer SSOT Distribution

### Industry-Standard Data Flow: Clear Layer Ownership
- **TanStack Query**: Owns server-related state (courses, chapters, videos, upload progress)
- **Form State**: Owns input handling and change detection (temporary, page-specific)
- **Zustand**: Owns pure UI state (modals, drag state, preferences)
- **Components**: Read from appropriate layer based on data type

### Why This 3-Layer Pattern (Used by YouTube, Udemy, Netflix)
- Clear ownership boundaries eliminate conflicts
- Minimal cross-layer dependencies  
- Each layer manages its domain expertise
- Predictable data flow and debugging
- Better performance through focused responsibilities
- Form isolation prevents UI pollution and performance issues

## State Responsibility Distribution

### TanStack Query Responsibilities (Server-Related State)
- Course, chapter, video data fetching
- Upload progress and status tracking
- Server mutations (create, update, delete operations)
- Optimistic updates with automatic rollback
- Cache management and background refetch
- Network error handling and retry logic

### Form State Responsibilities (Input Processing)
- Input field values and change tracking
- Dirty flag calculation (has user made changes)
- Form validation and field-level errors
- Optimistic reset on save for immediate UI feedback
- Temporary state that doesn't persist across navigation

### Zustand Store Responsibilities (Pure UI State)
- **modal**: Modal states (video preview, confirmations)
- **dragState**: Drag & drop UI state
- **editing**: Inline editing states (which field is being edited)
- **preferences**: UI preferences (expanded chapters, view modes)
- **pendingDeletes**: Items marked for deletion before batch operation

### Component Responsibilities
- Read server-related data from TanStack hooks
- Read form data from form state hooks
- Read UI state from Zustand selectors
- Event handling that calls appropriate layer actions
- No cross-layer data merging or coordination

## Server Actions Architecture

### Server Action Responsibilities
- **All server-side mutations**: Database operations, file uploads, external API calls
- **Security operations**: Authentication, authorization, credential handling
- **Sensitive data**: API keys, secrets, server-only configurations
- **Data validation**: Server-side validation and sanitization
- **Permission checks**: Course ownership, user authorization

### Server Action + TanStack Integration Pattern
- **TanStack mutations call server actions**: Never direct API calls from client
- **Structured responses**: Server actions return `{success: boolean, data?, error?}`
- **Optimistic updates in TanStack**: Client-side immediate feedback
- **Server persistence via actions**: Actual data changes happen server-side

### Data Flow with Server Actions + WebSockets
**Flow**: Component → TanStack mutation → Server Action → Background Upload → External APIs
**Return**: Component ← TanStack cache ← WebSocket events ← Progress updates

**WebSocket Pattern**:
1. Server Action starts upload and returns immediately with upload ID
2. Background process tracks upload and broadcasts progress via WebSocket  
3. Client WebSocket hook receives updates and updates TanStack cache
4. Components read progress from TanStack for real-time UI updates

### Progress Tracking with Server Actions + WebSockets
- **Server actions cannot provide real-time callbacks** (server → client limitation)
- **WebSocket solution**: Real-time progress updates from server to client
- **Architecture pattern**:
  1. Client starts upload via TanStack mutation → Server Action
  2. Server Action initiates background upload with progress tracking
  3. Server broadcasts progress updates via WebSocket to client
  4. Client receives WebSocket events → Updates TanStack cache
  5. Components read progress from TanStack (single source of truth)
- **Progress state ownership**: TanStack (server-related data)
- **WebSocket connection**: Managed by custom hook integrated with TanStack

### Security Boundaries
- **Client never holds credentials**: All sensitive operations server-side
- **Server actions validate ownership**: Course/resource permissions
- **Structured error handling**: Consistent error format across actions

## Data Management Rules

### Server Data Management (TanStack Only)
- Components use TanStack hooks: `useCourseEdit(courseId)`, `useVideoUpload()`
- **TanStack mutations call server actions**: All server operations
- Upload progress tracked in TanStack mutations
- Optimistic updates happen in TanStack cache only
- No data copying or syncing between layers

### UI State Management (Zustand Only)
- Modal visibility and data: `ui.openModal()`, `ui.closeModal()`
- Drag and drop states: `ui.startDrag()`, `ui.endDrag()`
- Editing states: `ui.startEdit()`, `ui.stopEdit()`
- UI preferences: `ui.updatePreference()`

### Clear Data Boundaries
- **Server-related**: Always read from TanStack
- **Form input processing**: Always read from Form State
- **UI-only**: Always read from Zustand  
- **No data mixing**: Components never merge data from multiple layers
- **UI orchestration allowed**: Components can coordinate actions across layers without mixing data

### UI Orchestration vs Data Mixing (Important Distinction)

#### ✅ ALLOWED: UI Orchestration
- Reading state from multiple layers for UI decisions
- Coordinating multiple actions in sequence across layers
- Displaying combined status from different layers
- Conditional logic based on state from multiple layers

#### ❌ FORBIDDEN: Data Mixing
- Merging data from different layers into combined objects
- Copying server data into UI or form layers
- Manual synchronization between layers via useEffect chains
- Using wrong layer for data type (server data in form state, form data in Zustand)

## UI Component Reuse Strategy

### Use Old UI Components, Not Old Functionality
- Reuse visual components: ChapterManager, VideoList, forms, cards
- Strip out ALL old state management, hooks, and data fetching
- Replace with new architecture hooks and Zustand actions
- Maintain visual consistency while modernizing data flow

### Component Enhancement Pattern
- Create "Enhanced" wrappers around old UI components
- Enhanced components integrate with new architecture
- Pass data and handlers from new system to old UI components
- Example: EnhancedChapterManager wraps ChapterManager

## File Upload Architecture (Server Actions + WebSockets)

### Upload Flow (Architecture-Compliant)
1. User selects files → TanStack mutation calls Server Action
2. Server Action starts background upload → Returns upload ID immediately  
3. Background upload process broadcasts progress via WebSocket
4. WebSocket hook receives updates → Updates TanStack cache
5. Components read progress from TanStack → Real-time UI updates
6. Upload completes → Server broadcasts completion → TanStack refetches

### Progress Tracking (WebSocket → TanStack)
- **WebSocket connection**: Managed by custom hook integrated with TanStack
- **Progress updates**: Server → WebSocket → TanStack cache
- **Components read from TanStack only**: Single source of truth maintained
- **No cross-layer coordination**: WebSocket hook updates TanStack directly
- **Security**: All credentials and uploads handled server-side

## Batch Operations Strategy

### Save Strategy Options: Individual vs Consolidated UX

#### Option 1: Individual Optimistic Operations
- **Course metadata**: Individual optimistic saves via TanStack (auto-save on blur)
- **Chapter operations**: Individual optimistic saves via TanStack (auto-save on edit)
- **Video operations**: Individual optimistic saves via TanStack (auto-save on rename)
- **Pros**: Pure architecture, immediate feedback
- **Cons**: May feel chaotic to users, no unified "Save Changes" experience

#### Option 2: Architecture-Compliant Consolidated UX
- **UI Orchestration**: Single "Save Changes" button coordinates multiple TanStack mutations
- **Layer Boundaries Maintained**: Each mutation stays in its TanStack domain
- **User Experience**: Unified save experience like professional platforms
- **Implementation**: UI orchestration coordinates multiple layer actions without data mixing

### Pending Operations (Zustand UI State)
- Mark items for deletion in Zustand `pendingDeletes`
- Show visual indicators for pending operations
- Execute batch deletes via single TanStack mutation
- Clear Zustand state after successful batch operation

## Error Handling Principles

### Optimistic Updates
- TanStack handles optimistic updates with automatic rollback
- Show immediate feedback in UI
- On error: TanStack rolls back, toast shows error message
- Never leave UI in inconsistent state

### Upload Error Handling (TanStack Owned)
- Failed uploads tracked in TanStack mutation error state
- Components read error state from TanStack hooks
- User can retry via TanStack mutation retry
- UI shows error state from single TanStack source

## Modal and Navigation Management

### Modal State
- All modals controlled by Zustand modal state
- Video preview, confirmations, settings dialogs
- Components trigger via `ui.openModal()` and `ui.closeModal()`

### Navigation
- Use Next.js router for page navigation
- Zustand maintains page-specific UI state
- Clear temporary state on navigation away

## Performance Considerations

### Cache Strategy
- **TanStack**: Intelligent caching and background updates for server data
- **Form State**: Temporary, non-persistent state (cleared on navigation)
- **Zustand**: Persists UI preferences only (no server or form data)
- Zero data duplication across layers = better memory usage

### Re-render Optimization
- Use React.memo for expensive UI components
- Zustand selectors to prevent unnecessary re-renders
- Batch Zustand updates where possible

## Testing Strategy

### State Testing
- Test TanStack queries in isolation
- Test form state hooks and validation logic
- Test Zustand layer actions and selectors
- Test component integration with mocked layers

### User Flow Testing
- Create course → Edit course → Add chapters → Upload videos → Save
- Test error scenarios and recovery
- Test optimistic updates and rollbacks

## Development Workflow: Architecture-First Approach

### Before ANY Implementation or Bug Fix
1. **PAUSE**: Read through these architectural principles
2. **IDENTIFY**: Which layer should own the data/state in question? (TanStack/Form State/Zustand)
3. **VERIFY**: Does the solution follow clear layer ownership?
4. **CHECK**: Are you avoiding cross-layer data merging?
5. **CONFIRM**: Components read from appropriate layer only

### Implementation Checklist
- ✅ Server-related state → TanStack Query
- ✅ Form input processing → Form State Layer
- ✅ UI-only state → Zustand  
- ✅ TanStack mutations call server actions (never direct API calls)
- ✅ Server actions handle all sensitive operations
- ✅ No data copying between layers
- ✅ No manual synchronization between layers
- ✅ Components read from single appropriate layer
- ✅ Clear ownership boundaries maintained

### Red Flags to Avoid
- ❌ **Client-side API calls with credentials** (use server actions)
- ❌ **Direct external API calls from client** (security risk)
- ❌ **Data mixing**: Merging data from different layers into combined objects
- ❌ **Data copying**: Copying data between layers (server data in form state, form data in Zustand)
- ❌ **Manual synchronization**: useEffect chains that sync layers
- ❌ **Layer confusion**: Using wrong layer for data type (server data in form state, form data in Zustand, UI state in TanStack)
- ❌ **Callback chains**: Complex callback hierarchies that create infinite loops

### Acceptable Patterns (Not Red Flags)
- ✅ **UI orchestration**: Reading from multiple layers for UI decisions
- ✅ **Coordinated actions**: Single button triggering multiple layer mutations
- ✅ **Status aggregation**: Combining loading/error states from different layers for unified UI feedback
- ✅ **Conditional logic**: if (formState.isDirty && tanStackMutation.isReady && !ui.isModalOpen) doSomething()

## Professional Form State Patterns

### Critical Pattern: Form State as Source of Truth
Professional apps (YouTube, Udemy, Netflix) follow this pattern:
- **Form state drives input display** (never mix with server state for input values)
- **Internal dirty flag for change detection** (not server comparison for UI responsiveness)
- **No UI orchestration during typing** (prevents character loss)
- **Optimistic reset on save** (immediate UI feedback, revert only on error)

### Form State Lifecycle Principles
- **Initialization**: Form state initialized with server data or defaults
- **Input Handling**: All inputs read from and write to form state exclusively
- **Change Detection**: Use form's internal dirty flag, not server comparison
- **Optimistic Reset**: Reset form state immediately on save for instant UI feedback
- **Error Recovery**: Revert form state to server data only on save failure
- **Server Sync**: Update form initial values when server data changes (not form values)
- **Dependency Management**: Never include form state objects in React dependency arrays

### Form State Anti-Patterns (Cause Character Loss and Infinite Loops)
- **UI orchestration in input values**: Causes race conditions during typing
- **Complex display logic during typing**: Creates unpredictable input behavior
- **Mixed state sources for same input**: Leads to inconsistent state
- **Object dependencies in useEffect**: Creates infinite re-render loops
- **Server state comparison for change detection**: Causes delayed UI feedback

## React Hook Patterns for Professional UX

### Immediate UI Feedback Principles
- **Use internal state flags over external comparisons**: Dirty flags respond instantly vs server comparisons
- **Optimistic state updates**: Update UI state immediately, revert only on failure
- **Stable dependency arrays**: Use primitive values, avoid object references in useEffect deps
- **Controlled timing**: Manual state resets for predictable UI behavior vs waiting for async updates

### Hook Dependency Best Practices
- **Primitive dependencies only**: Use values/flags, never objects or functions without useCallback
- **Minimal dependency arrays**: Include only what actually needs to trigger re-computation
- **Stable references**: useCallback for functions, useMemo for complex objects in dependencies
- **Break circular dependencies**: Avoid including stateful objects that change on every render

## Migration Principles

### Incremental Migration
- Create new architecture alongside old
- Migrate page by page using new patterns
- Delete old architecture files only after testing new implementation
- Maintain backward compatibility during transition

### Component Reuse
- Maximum reuse of existing UI components
- Zero reuse of old state management patterns
- Create clear mapping of old vs new architecture files