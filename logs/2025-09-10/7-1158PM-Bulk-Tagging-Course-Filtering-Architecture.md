# Bulk Tagging + Course Filtering Architecture Principles

## Core Architecture Pattern: Media Asset Management Extension

### Industry-Standard Media Organization Pattern
Following professional platforms (YouTube Studio, Vimeo, Udemy):
- **Bulk tagging**: Multi-select → Add/remove tags → Instant visual feedback
- **Course filtering**: Dropdown/search to filter by course usage
- **Tag search**: Combined search across filename + tags + course
- **Visual indicators**: Tag badges on cards, usage count displays

### Why This Pattern (Used by Professional Media Platforms)
- Clear bulk operation workflow reduces cognitive load
- Tag-based organization scales better than folder hierarchies
- Course filtering leverages existing `media_usage` relationships
- Search combines multiple metadata sources for comprehensive discovery

## State Responsibility Distribution

### TanStack Query Responsibilities (Server-Related State)
- Media file fetching with tag/course filters
- Bulk tag operations (add/remove tags from multiple files)
- Course usage data queries (`media_usage` table joins)
- Tag autocomplete suggestions from existing tags
- Cache invalidation after bulk operations

### Form State Responsibilities (Input Processing)
- Tag input field values in bulk edit modal
- Search input combining filename + tags + course filters
- Course selection dropdown state
- Form validation for tag operations

### Zustand Store Responsibilities (Pure UI State)
- **bulkTagModal**: Modal state for bulk tag editing
- **selectedFiles**: Multi-selected files for bulk operations
- **tagFilters**: Active tag filters for media grid
- **courseFilter**: Active course filter selection
- **searchExpanded**: Search UI expansion state

### Component Responsibilities
- Read media data from TanStack hooks
- Read selection state from Zustand selectors
- Handle bulk tag form submission via TanStack mutations
- Display tag badges from server data
- Show course usage information from `media_usage` joins

## Database Schema Integration

### Existing Database Types Analysis
From `/src/types/database.types.ts`:

#### Media Files Table (Already Has Tags!)
```typescript
media_files: {
  Row: {
    tags?: string[] | null  // ✅ Already exists!
    // ... other fields
  }
}
```

#### Media Usage Table (Perfect for Course Filtering)
```typescript
media_usage: {
  Row: {
    media_file_id: string
    course_id: string
    resource_type: string    // 'chapter', 'lesson', etc.
    resource_id: string
  }
}
```

### Schema Implementation Strategy
**No migrations needed!** Database already supports our requirements:
- `media_files.tags` → JSON array for bulk tagging
- `media_usage` table → Course filtering via joins
- Existing foreign keys → Proper referential integrity

## Server Actions Architecture

### Bulk Tag Operations
```typescript
// Server Action: Bulk add tags
async function bulkAddTagsAction(fileIds: string[], tagsToAdd: string[])

// Server Action: Bulk remove tags  
async function bulkRemoveTagsAction(fileIds: string[], tagsToRemove: string[])

// Server Action: Replace tags
async function bulkReplaceTagsAction(fileIds: string[], newTags: string[])
```

### Course Filtering Queries
```typescript
// Server Action: Get media by course
async function getMediaByCourseAction(courseId: string)

// Server Action: Get media with usage info
async function getMediaWithUsageAction(filters: MediaFilters)
```

### Data Flow Pattern
**Flow**: Component → TanStack mutation → Server Action → Database update
**Return**: Component ← TanStack cache ← Optimistic updates ← Server response

## UI Component Reuse Strategy

### Leverage Existing Patterns
- **Multi-selection**: Reuse existing bulk delete selection logic
- **Modal patterns**: Follow existing modal architecture from bulk operations
- **Search components**: Extend existing search patterns from courses/lessons
- **Filter dropdowns**: Reuse course selector patterns from existing pages

### Component Enhancement Approach
1. **Extend MediaCard**: Add tag badges display
2. **Enhance MediaGrid**: Add course filter dropdown
3. **Create BulkTagModal**: New modal following existing modal patterns
4. **Extend SearchBar**: Add tag/course search capabilities

## Implementation Phases

### Phase 1: Tag Display & Basic Search (Foundation)
1. **Tag Badge Component**: Display existing tags on media cards
2. **Tag Search**: Filter media by existing tags in search
3. **Tag Autocomplete**: Suggest existing tags from database
4. **UI Enhancement**: Visual indicators for tagged vs untagged files

### Phase 2: Bulk Tag Operations (Core Functionality)
1. **Bulk Tag Modal**: Multi-select → "Edit Tags" → Modal with tag management
2. **Add Tags**: Bulk add tags to selected files
3. **Remove Tags**: Bulk remove specific tags from selected files
4. **Replace Tags**: Clear existing and set new tags for selected files
5. **Optimistic Updates**: Immediate UI feedback via TanStack

### Phase 3: Course Filtering (Advanced Discovery)
1. **Course Filter Dropdown**: Filter media by course usage
2. **Usage Information**: Show which courses use each file
3. **Cross-Course Search**: Find files used across multiple courses
4. **Unused File Detection**: Identify files not linked to any course

### Phase 4: Advanced Search & Analytics (Professional Features)
1. **Combined Search**: Filename + tags + course in single search
2. **Smart Suggestions**: AI-powered tag suggestions based on content
3. **Usage Analytics**: Tag usage statistics and optimization
4. **Bulk Course Operations**: Link/unlink files to courses in bulk

## Technical Implementation Details

### Tag Management Patterns
```typescript
// TanStack Query key structure
const mediaKeys = {
  all: ['media'] as const,
  lists: () => [...mediaKeys.all, 'list'] as const,
  list: (filters: MediaFilters) => [...mediaKeys.lists(), filters] as const,
  tags: () => [...mediaKeys.all, 'tags'] as const,
  tagSuggestions: (partial: string) => [...mediaKeys.tags(), partial] as const,
}

// Bulk tag mutation
const bulkTagMutation = useMutation({
  mutationFn: bulkAddTagsAction,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: mediaKeys.lists() })
    queryClient.invalidateQueries({ queryKey: mediaKeys.tags() })
  }
})
```

### Course Filter Integration
```typescript
// Join query for course filtering
const mediaWithUsageQuery = useQuery({
  queryKey: mediaKeys.list({ courseId, tags, search }),
  queryFn: () => getMediaWithUsageAction({ courseId, tags, search })
})

// Zustand state for filters
const useMediaFilters = create<MediaFiltersState>((set) => ({
  selectedCourse: null,
  activeTags: [],
  searchTerm: '',
  setSelectedCourse: (courseId) => set({ selectedCourse: courseId }),
  addTagFilter: (tag) => set((state) => ({ 
    activeTags: [...state.activeTags, tag] 
  })),
  removeTagFilter: (tag) => set((state) => ({
    activeTags: state.activeTags.filter(t => t !== tag)
  }))
}))
```

## Performance Considerations

### Database Query Optimization
- **Indexed tag searches**: GIN index on `tags` JSON field
- **Efficient joins**: Optimize `media_usage` joins for course filtering
- **Tag autocomplete**: Fast prefix matching on existing tag values
- **Pagination**: Support for large media libraries

### Client-Side Performance
- **Debounced search**: Tag/course search with 300ms debounce
- **Virtual scrolling**: Handle large media grids efficiently
- **Optimistic updates**: Immediate tag badge updates before server confirmation
- **Cached suggestions**: Tag autocomplete caching for responsive UX

## Error Handling & Edge Cases

### Bulk Operation Error Handling
- **Partial failures**: Handle cases where some files fail tag operations
- **Permission checks**: Ensure user can only tag their own files
- **Validation**: Prevent duplicate tags, invalid characters
- **Rollback**: Automatic rollback on bulk operation failures

### Search & Filter Edge Cases
- **Empty results**: Graceful handling of no matches
- **Invalid filters**: Reset to default on invalid filter combinations
- **Course deletion**: Handle deleted courses in usage data
- **Tag cleanup**: Remove unused tags from autocomplete suggestions

## Migration & Rollout Strategy

### Incremental Feature Rollout
1. **Phase 1**: Basic tag display (read-only)
2. **Phase 2**: Individual file tagging
3. **Phase 3**: Bulk tag operations
4. **Phase 4**: Course filtering and advanced search

### Backward Compatibility
- **Existing functionality**: All current media operations remain unchanged
- **Progressive enhancement**: New features enhance existing workflow
- **Feature flags**: Gradual rollout via environment variables
- **Fallback UI**: Graceful degradation when features unavailable

## Testing Strategy

### Unit Testing
- **Tag operation logic**: Bulk add/remove/replace operations
- **Search functionality**: Combined search across multiple fields
- **Filter interactions**: Course and tag filter combinations
- **Form validation**: Tag input validation and sanitization

### Integration Testing
- **Bulk operations**: End-to-end bulk tagging workflows
- **Search & filter**: Combined search and filter scenarios
- **Course usage**: Media-course relationship integrity
- **Performance**: Large dataset handling and query optimization

### User Experience Testing
- **Selection workflows**: Multi-select → bulk tag operations
- **Search discovery**: Tag and course-based media discovery
- **Visual feedback**: Tag badges and usage indicators
- **Mobile responsiveness**: Touch-friendly bulk operations

---

This architecture extends the existing 3-layer SSOT pattern for media-specific bulk operations while leveraging existing database schema and maintaining compatibility with current course creation workflows. The implementation prioritizes user experience patterns from professional media management platforms while ensuring architectural compliance and performance scalability.