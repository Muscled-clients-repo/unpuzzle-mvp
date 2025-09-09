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
**Flow**: Component → TanStack mutation → Server Action → HTTP POST → WebSocket Server → Client
**Return**: Component ← TanStack cache ← Observer events ← WebSocket messages ← Server updates

**Production-Proven WebSocket Pattern**:
1. **Server Action** processes upload with progress callbacks
2. **HTTP POST bridge** sends progress to standalone WebSocket server  
3. **WebSocket server** broadcasts to all connected clients
4. **Client WebSocket hook** receives and maps messages to Observer events
5. **Observer pattern** emits events to prevent circular dependencies
6. **TanStack cache** updates from Observer events (dual cache update)
7. **Components** read progress from TanStack (single source of truth)

### Progress Tracking: Architecture-Compliant Implementation
- **Standalone WebSocket server**: Runs independently for connection stability during development
- **HTTP bridge pattern**: Server Actions communicate via HTTP POST (not globalThis)
- **Observer pattern integration**: WebSocket → Observer → TanStack prevents dependency cycles
- **Dual cache updates**: Both `videoKeys.list()` and `chapterKeys.list()` updated (critical fix)
- **Operation ID tracking**: Unique IDs match progress updates to specific uploads
- **Graceful error handling**: System continues working when WebSocket server offline

**Technical Implementation Details**:
```javascript
// Server Action → WebSocket communication
broadcastWebSocketMessage({
  type: 'upload-progress',
  courseId,
  operationId,
  data: { progress: progressData.percentage }
})

// WebSocket → Observer → TanStack flow  
courseEventObserver.emit(COURSE_EVENTS.UPLOAD_PROGRESS, courseId, progressData)
```

**Key Architecture Decision**: Standalone WebSocket server provides better reliability than Next.js API routes for persistent connections.

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

### Upload Flow: Production Implementation (Architecture-Compliant)
1. **User selects files** → TanStack mutation calls Server Action
2. **Server Action initiates upload** → HTTP POST to WebSocket server with operation ID
3. **WebSocket server broadcasts** → Real-time progress to connected clients  
4. **Client WebSocket hook** → Maps messages to Observer events
5. **Observer emits events** → Updates TanStack cache (dual cache strategy)
6. **Components read progress** → Real-time UI updates from TanStack
7. **Upload completes** → WebSocket broadcasts completion → Cache invalidation

### Progress Tracking: Production-Proven Pattern
- **Standalone WebSocket architecture**: Independent server for connection reliability
- **HTTP bridge communication**: Server Actions → WebSocket server via HTTP POST
- **Observer pattern integration**: Prevents circular dependencies in React hooks
- **Dual cache updates**: Critical fix ensuring UI reactivity across all components
- **Operation ID correlation**: Matches progress updates to specific file uploads
- **Cross-tab synchronization**: Progress visible across multiple browser tabs
- **Graceful degradation**: System functions when WebSocket server unavailable

### Performance Characteristics (Battle-Tested)
- **1GB file uploads**: Consistent progress tracking for large video files
- **Multiple concurrent uploads**: WebSocket handles simultaneous operations
- **Sub-100ms UI updates**: Real-time progress bar updates during upload
- **Memory efficiency**: No data duplication between caches
- **Network optimization**: WebSocket messages ~200 bytes each

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

---

## Advanced Data Patterns for Media Manager

### Resource Linking Pattern (Media-Specific)

The resource linking pattern manages relationships between media files and course content while maintaining data integrity and enabling comprehensive usage tracking. This pattern is distinct from course-chapter relationships as it involves cross-domain asset management.

#### Core Implementation Pattern
The resource linking pattern requires a many-to-many relationship table connecting media files to various resource types (courses, chapters, lessons). Each link includes metadata for tracking and analytics purposes. Server actions handle all linking operations with proper cache invalidation across affected resources.

#### Architecture Compliance
- **TanStack Query**: Owns usage data queries and cache invalidation
- **Server Actions**: Handle all linking/unlinking mutations
- **Zustand**: Manages UI state for link creation modals
- **No Data Mixing**: Components read usage data from TanStack, never duplicate across layers

#### Business Logic Rules
1. **Referential Integrity**: Links automatically cascade delete when target resource is deleted
2. **Usage Analytics**: Every link/unlink operation updates usage metrics for performance insights
3. **Audit Trail**: Complete history of when/where media was linked for troubleshooting
4. **Delete Protection**: Media files cannot be hard deleted while active links exist

#### Example Implementation
Components display usage information by reading from TanStack Query for server data and Zustand for UI expansion states. UI orchestration coordinates unlink operations without mixing data between layers. Usage displays show count and specific resource locations with direct unlink actions.

### Soft Delete with Cross-Resource Dependencies (Media-Specific)

This pattern extends the existing course soft delete approach to handle media files with cross-domain dependencies. Unlike course soft delete which affects self-contained entities, media soft delete impacts multiple courses and requires dependency-aware recovery mechanisms.

**Important**: This pattern complements (does not replace) the existing course edit flow soft delete pattern. Course soft delete remains unchanged - this specifically addresses media asset management.

#### Core Implementation Pattern
Media soft delete checks for active dependencies before marking files as deleted. Files with dependencies require explicit removal from courses or force deletion approval. The deletion process snapshots all current dependencies for potential recovery scenarios. Recovery operations can optionally restore both the file and its previous course relationships based on business rules. All operations maintain comprehensive audit trails for accountability.

#### Distinction from Course Soft Delete
- **Course Soft Delete**: Self-contained, affects single course entity and its chapters
- **Media Soft Delete**: Cross-domain, affects multiple courses that reference the media
- **Recovery Scope**: Course recovery restores single workflow; media recovery can restore multiple course references
- **Dependency Handling**: Course soft delete handles parent-child relationships; media soft delete handles many-to-many references

#### Architecture Compliance
- **TanStack Query**: Manages soft-deleted media state and recovery operations
- **Server Actions**: Handle all soft delete and recovery mutations with dependency checks
- **Form State**: Manages deletion confirmation forms and recovery option selections
- **Zustand**: Controls deletion confirmation modals and recovery workflow UI

### Cross-Domain Analytics Pattern (Media-Specific)

This pattern aggregates data across multiple resource types (media files, course usage, student engagement) to provide comprehensive analytics without violating architectural layer boundaries. Unlike single-domain analytics, this requires coordinating data from multiple TanStack Query sources.

#### Core Implementation Pattern
Cross-domain analytics aggregation occurs server-side using parallel queries across multiple data domains (media files, usage statistics, storage metrics, performance data). Each analytics domain maintains separate TanStack Query keys and caches on the client. Data combination only occurs during visualization rendering through computed values, never stored in client state. Time range filtering and UI interactions use form state and Zustand respectively, maintaining clear layer boundaries.

#### Architecture Compliance Rules
1. **No Data Fusion in Client State**: Never merge analytics data from different domains into single state objects
2. **Query Separation**: Each data domain maintains separate TanStack Query keys and caches  
3. **Computed Visualization Only**: Data combination happens only in render/memo for chart display
4. **Server-Side Aggregation**: Complex cross-domain calculations happen in server actions, not client
5. **Independent Cache Invalidation**: Each analytics domain can be invalidated independently

#### Performance Optimization
- **Parallel Queries**: Multiple analytics domains fetched concurrently
- **Selective Invalidation**: Time range changes only invalidate affected queries
- **Memoized Computations**: Chart data computed only when source data changes
- **Stale Time Management**: Analytics data cached for 5 minutes to reduce server load

#### Example Usage Scenarios
1. **Storage Optimization Dashboard**: Combines file size data with usage patterns to identify cleanup opportunities
2. **Content Performance Analytics**: Merges media metadata with student engagement metrics
3. **ROI Analysis**: Correlates media production costs with course sales and student satisfaction
4. **Capacity Planning**: Analyzes growth trends across storage, usage, and performance domains

These three patterns specifically address the unique challenges of media asset management while maintaining strict architectural compliance with the existing 3-layer SSOT distribution pattern established for course creation workflows.