# Simple Video Editor Architecture Plan V2
**Date:** 2025-08-25  
**Purpose:** Updated architecture reflecting real feature requirements  
**Status:** 🔄 Draft for Review

## Problem Statement
The original Simple Architecture Plan was created before understanding actual feature requirements. The current implementation has grown to include essential video editor features like multi-track support, undo/redo, keyboard shortcuts, and advanced timeline interactions. Rather than remove these features, we need an updated architecture that organizes them cleanly.

## Core Principles (Unchanged)

### 1. Virtual Timeline as Single Source of Truth
- Timeline position drives everything
- Video follows timeline, never leads
- Frame-accurate synchronization
- No race conditions from video events

### 2. Pragmatic State Management
- Primary state object for main editor state
- Refs for callback stability and performance
- Throttled visual state for smooth UI during playback
- Optimize calculations based on update frequency
- No external state management libraries

### 3. Frame-Based Architecture
- All calculations in frames (30 FPS)
- No floating-point time drift
- Industry-standard approach
- Precise editing operations

## Updated File Structure

### Core Library
```
/src/lib/video-editor/
├── types.ts                    # All TypeScript interfaces
├── utils.ts                    # Frame/time utilities  
├── VirtualTimelineEngine.ts    # Playbook engine
├── useVideoEditor.ts           # Main state hook
├── useKeyboardShortcuts.ts     # Keyboard handling
├── useRecording.ts             # Recording operations
└── HistoryManager.ts           # Undo/redo operations
```

### UI Components
```
/src/components/video-studio/
├── VideoStudio.tsx             # Main studio layout
├── Timeline.tsx                # Core timeline UI (clips, scrubber, ruler)
└── TimelineControls.tsx        # Zoom, track controls
```

## Architecture Constraints

### Responsibility Constraints
- Each file has a single, clear purpose
- Functions focus on one specific task
- Components handle one area of functionality
- Clear separation between state and presentation

### Complexity Constraints  
- Extract complex logic into utility functions
- Avoid deep conditional nesting
- Break down large functions into smaller, focused ones
- Prefer composition over inheritance

### Maintainability Constraints
- New developer should understand file purpose immediately
- Function names clearly describe what they do
- Minimal cognitive overhead when reading code
- Easy to locate and modify specific functionality

## Key Architecture Decisions

### 1. Consolidated Timeline Approach
- Timeline.tsx handles core timeline UI (clips, scrubber, ruler)
- TimelineControls.tsx handles reusable controls (zoom, track management)
- Avoid deep component hierarchies (max 2 levels)

### 2. Scope-Based Integration Strategy
- **Focused concerns**: Separate hooks for distinct responsibilities (recording, keyboard shortcuts)
- **Editor state**: Integrate into useVideoEditor.ts (clip management)
- **History operations**: Separate HistoryManager class for focused responsibility
- **Reusable UI**: Separate components (TimelineControls)

### 3. History Management Separation
- History logic separated in HistoryManager.ts for focused responsibility
- Clean API integration with useVideoEditor hook
- Testable and maintainable in isolation
- Simple stack-based implementation with clear boundaries

### 4. Keyboard Shortcuts Separation
- Separate hook for app-wide reusability
- Clean separation of concerns
- Easy to test and maintain

### 5. Recording Logic Separation
- Recording logic separated in useRecording.ts for focused responsibility
- Clean API integration with useVideoEditor hook
- Testable and maintainable in isolation

### 6. State Management Patterns
- Use refs to avoid stale closures in callbacks
- Separate precise state from throttled visual state
- Synchronous ref updates with state setters
- Virtual Timeline Engine drives state through callbacks

### 7. Performance Architecture
- Frequent updates: throttled/memoized (33ms visual updates, 50ms debounced seeks)
- Infrequent updates: calculated on render
- Immediate seeks for click operations
- Memoization for expensive calculations

### 8. Component Communication Pattern
- Virtual Timeline Engine communicates via callback functions
- React components never directly control video element
- Timeline position drives all state changes
- Unidirectional data flow from engine to UI

## Success Metrics

### Code Quality
- Clear separation of concerns
- TypeScript strict mode compliance
- Consistent naming conventions
- Robust error handling

### Maintainability
- New developer can understand quickly
- Easy to add new features
- Minimal cognitive overhead
- Clear file organization

### Performance
- Smooth 30 FPS playback
- Responsive drag operations
- No memory leaks
- Efficient re-rendering

## Migration Strategy

### Phase 1: File Consolidation
- Keep Timeline.tsx and TimelineControls.tsx separate (different responsibilities)
- Keep useRecording.ts separate (focused responsibility)
- Keep HistoryManager.ts separate for focused responsibility and testability

### Phase 2: Component Simplification
- Break down large functions
- Extract utility functions
- Improve TypeScript types

### Phase 3: Performance Optimization
- Add proper memoization
- Optimize re-render cycles
- Implement efficient drag handling

## Error Handling Strategy

### Graceful Degradation Patterns
- Recording permission errors handled without crashes
- Video loading failures with fallback states
- Invalid operations ignored rather than throwing errors
- User-friendly error messages for recoverable failures

### Error Boundaries
- Component-level error isolation
- Preserve user work when possible
- Clear error reporting for debugging

## Memory Management Principles

### Resource Cleanup Responsibilities
- Blob URL revocation for deleted clips
- Event listener cleanup on component unmount
- Timeout and interval cleanup
- Animation frame cancellation

### Lifecycle Management
- Proper cleanup in useEffect return functions
- Video element resource management
- Stream cleanup after recording

## Non-Goals (Keeping Simple)

### What We're NOT Building
- Complex animation systems
- Advanced effects or filters  
- Multi-format export
- Real-time collaboration
- Plugin architecture
- Advanced audio editing

### Implementation Constraints
- No external state management (Redux, Zustand)
- No complex design patterns (Observer, Command)
- No microservice architecture
- No complex build tooling

## Risk Mitigation

### Preventing Feature Creep
- Document all feature additions
- Require architecture review for new components
- Monitor component complexity regularly
- Regular complexity audits

### Code Quality
- Enforce TypeScript strict mode
- Regular refactoring sessions
- Clear naming conventions
- Robust error handling

## Next Steps
1. Review this plan for contradictions
2. Create migration checklist
3. Execute consolidation in phases
4. Update documentation
5. Performance testing

## Conclusion
Simple Architecture V2 acknowledges that a real video editor needs sophisticated features, but organizes them in a clean, maintainable way. The goal is not minimal features, but minimal complexity in implementing those features.

Key insight: **Simple doesn't mean basic - it means well-organized.**