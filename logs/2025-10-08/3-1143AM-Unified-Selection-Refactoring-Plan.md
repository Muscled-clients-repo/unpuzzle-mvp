# Unified Selection System Refactoring Plan

## Goal
Create a single, shared selection and drag-selection implementation that both `/media` and `/studio/projects` routes use, eliminating code duplication while preserving all existing functionality.

## Current State Analysis

### Media Route
- **Store**: `src/stores/media-store.ts` (has drag selection methods built-in)
- **Hook**: `src/hooks/use-drag-selection.ts` (directly uses media store)
- **Page**: `src/app/instructor/media/page.tsx`
- **Grid**: `src/components/media/media-grid.tsx` (renders drag rectangle)
- **Data attribute**: `data-selectable`
- **Item type**: `MediaFile` (video/image files with upload status, thumbnails, duration, CDN URLs)
- **Unique features**:
  - Auto-scroll during drag
  - Upload dashboard state
  - View mode (grid/list)
  - Hiding files during deletion animation
  - File preview modal
  - Upload progress tracking

### Studio Projects Route
- **Store**: `src/stores/projects-selection-store.ts` (copied media pattern)
- **Hook**: `src/hooks/use-projects-drag-selection.ts` (copied media hook)
- **Page**: `src/app/instructor/studio/projects/page.tsx`
- **Data attribute**: `data-selectable-project`
- **Item type**: `StudioProject` (video editing projects with timeline_state, clips, export status)
- **Unique features**:
  - Bulk operation preview
  - Tag management
  - Draft/published status
  - Timeline clip count
  - Export tracking

### Generic Utilities (Created but Not Used)
- `src/stores/create-selection-store.ts` - Selection store factory
- `src/hooks/use-drag-selection.generic.ts` - Generic drag hook
- `src/lib/selection-utils.ts` - Selection handler creator

## Refactoring Strategy

### Phase 1: Create Unified Selection Store Factory
**Goal**: Make a store factory that both routes can use while keeping their unique features

**Files to modify**:
- `src/stores/create-selection-store.ts` - Enhance to support drag selection

**What to do**:
1. Add drag selection state and methods to the generic store factory
2. Make it configurable (e.g., data attribute name)
3. Keep it backward compatible

**Verification checkpoint**: Run TypeScript compiler to ensure no type errors

---

### Phase 2: Create Unified Drag Selection Hook
**Goal**: Make a single hook that works for any route

**Files to create/modify**:
- `src/hooks/use-unified-drag-selection.ts` - New unified hook

**What to do**:
1. Create hook that accepts:
   - Container ref
   - Store methods (startDrag, updateDrag, finalizeDrag, etc.)
   - Configuration (data attribute, enabled flag)
2. Extract common logic from both existing hooks
3. Support auto-scroll (media needs it, projects can ignore it)

**Verification checkpoint**: Test that existing media route still works with old hook

---

### Phase 3: Migrate Projects Route to Use Unified System
**Goal**: Update projects to use the new unified utilities without breaking anything

**Files to modify**:
- `src/stores/projects-selection-store.ts` - Replace with factory usage
- `src/app/instructor/studio/projects/page.tsx` - Update to use unified hook

**What to do**:
1. Update projects store to use `createSelectionStore` factory
2. Keep project-specific extensions (bulk preview, tags)
3. Update projects page to use unified drag hook
4. Update data attribute to be configurable

**Verification checkpoint**:
- [ ] Test CMD+click multi-select works
- [ ] Test Shift+click range select works
- [ ] Test click-and-drag selection works
- [ ] Test drag rectangle displays correctly
- [ ] Test bulk tag operations work
- [ ] Test bulk delete works

---

### Phase 4: Migrate Media Route to Use Unified System
**Goal**: Update media to use unified utilities, removing duplication

**Files to modify**:
- `src/stores/media-store.ts` - Simplify to use selection factory
- `src/app/instructor/media/page.tsx` - Update to use unified hook

**What to do**:
1. Extract media-specific features (uploads, view mode, etc.) from selection logic
2. Use `createSelectionStore` for selection state
3. Update media page to use unified drag hook
4. Keep media-specific features intact (auto-scroll, hiding files, etc.)

**Verification checkpoint**:
- [ ] Test all selection features work on media route
- [ ] Test auto-scroll during drag works
- [ ] Test upload dashboard still works
- [ ] Test view mode switching works
- [ ] Test file hiding animation works
- [ ] Test bulk delete works
- [ ] Test bulk tag operations work

---

### Phase 5: Clean Up Deprecated Code
**Goal**: Remove duplicate implementations now that both use unified system

**Files to delete**:
- `src/hooks/use-drag-selection-projects.ts` (replaced by unified hook)
- `src/hooks/use-projects-drag-selection.ts` (replaced by unified hook)
- `src/hooks/use-drag-selection.ts` (replaced by unified hook)
- `src/hooks/use-drag-selection.generic.ts` (merged into unified hook)
- `src/lib/selection-utils.ts` (if not needed)

**What to do**:
1. Verify both routes work with unified system
2. Delete old hook files
3. Update any imports
4. Run full test of both routes

**Verification checkpoint**:
- [ ] Projects route: All selection features work
- [ ] Media route: All selection features work
- [ ] No broken imports
- [ ] No TypeScript errors
- [ ] No console errors

---

## Implementation Details

### Unified Store Factory Design
```typescript
// src/stores/create-selection-store.ts

interface SelectionStoreConfig {
  dataAttribute?: string // 'data-selectable', 'data-selectable-project', etc.
  enableAutoScroll?: boolean
}

interface BaseSelectionState {
  // Core selection
  selectedItems: Set<string>
  lastSelectedId: string | null

  // Drag selection
  dragSelection: {
    isActive: boolean
    startPoint: { x: number, y: number } | null
    currentPoint: { x: number, y: number } | null
    selectedDuringDrag: Set<string>
    selectionMode: 'replace' | 'add' | 'range'
    originalSelection: Set<string> | null
  }

  // Auto-scroll (optional)
  autoScroll?: {
    isScrolling: boolean
    direction: 'up' | 'down' | null
    speed: number
  }

  // Methods
  toggleSelection: (id: string) => void
  selectRange: (from: string, to: string, allIds: string[]) => void
  selectAll: (ids: string[]) => void
  clearSelection: () => void
  startDragSelection: (point: {x: number, y: number}, mode: 'replace' | 'add' | 'range') => void
  updateDragSelection: (point: {x: number, y: number}, intersecting: string[]) => void
  finalizeDragSelection: () => void
  cancelDragSelection: () => void
}

export function createSelectionStore<T extends BaseSelectionState>(
  config: SelectionStoreConfig = {}
) {
  return create<T>((set, get) => ({
    // ... implementation
  }))
}
```

### Unified Hook Design
```typescript
// src/hooks/use-unified-drag-selection.ts

interface UseDragSelectionConfig {
  containerRef: RefObject<HTMLElement>
  allItemIds: string[]
  enabled: boolean
  dataAttribute: string // 'data-selectable' or 'data-selectable-project'
  store: {
    dragSelection: BaseSelectionState['dragSelection']
    startDragSelection: BaseSelectionState['startDragSelection']
    updateDragSelection: BaseSelectionState['updateDragSelection']
    finalizeDragSelection: BaseSelectionState['finalizeDragSelection']
    cancelDragSelection: BaseSelectionState['cancelDragSelection']
    autoScroll?: BaseSelectionState['autoScroll']
    startAutoScroll?: (direction: 'up' | 'down', speed: number) => void
    stopAutoScroll?: () => void
  }
}

export function useUnifiedDragSelection(config: UseDragSelectionConfig) {
  // ... implementation with auto-scroll support
  return {
    isDragActive: boolean
    dragRectangle: DragRectangle | null
    selectedDuringDrag: Set<string>
  }
}
```

### Migration Pattern for Projects Store
```typescript
// Before (current):
export const useProjectsSelectionStore = create<ProjectsSelectionState>((set, get) => ({
  selectedItems: new Set(),
  // ... 200 lines of selection logic
  bulkOperationPreview: null, // project-specific
  setBulkOperationPreview: () => {}
}))

// After (unified):
import { createSelectionStore } from './create-selection-store'

interface ProjectsExtensions {
  bulkOperationPreview: {...}
  setBulkOperationPreview: () => {}
}

const baseStore = createSelectionStore<ProjectsSelectionState>({
  dataAttribute: 'data-selectable-project'
})

export const useProjectsSelectionStore = create<ProjectsSelectionState & ProjectsExtensions>((set, get) => ({
  ...baseStore.getState(), // Get base selection logic

  // Project-specific extensions
  bulkOperationPreview: null,
  setBulkOperationPreview: (preview) => set({ bulkOperationPreview: preview })
}))
```

## Key Principles

1. **Backward Compatibility**: Each phase must not break existing functionality
2. **Incremental**: Verify after each phase before proceeding
3. **Feature Preservation**: All unique features of each route must continue working
4. **Type Safety**: No TypeScript errors at any stage
5. **Testing**: Manual verification checkpoints at each phase

## Benefits After Completion

- ✅ Single source of truth for selection logic
- ✅ Easy to add selection to new routes (courses, lessons, etc.)
- ✅ Consistent behavior across all routes
- ✅ Reduced maintenance burden
- ✅ Smaller bundle size (less duplicate code)
- ✅ Easier to add new selection features (they work everywhere automatically)

## Risk Mitigation

- Each phase has verification checkpoints
- Can roll back individual phases if issues arise
- Keep old code until verified working
- Test both routes after each change
- Git commit after each successful phase
