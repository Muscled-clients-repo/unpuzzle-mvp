# Video Editor Replication Principles - Complete Guide

## Core Architecture Principles

### State Management Philosophy
- Centralize all video state in a single custom hook (useVideoEditor)
- Separate visual state (UI updates) from playback state (actual video position)
- Use throttled visual updates to prevent UI lag during scrubbing
- Maintain frame-accurate positioning separate from visual representations
- Implement optimistic UI updates for immediate responsiveness

### Video Engine Architecture
- Build a Virtual Timeline Engine that manages all clip relationships
- Keep video element as a single source managed by the engine
- Decouple timeline logic from video element control
- Use frame-based calculations for all timing (not seconds)
- Implement lazy loading of video segments for performance

### History Management
- Implement comprehensive undo/redo for all operations
- Store operation history with before/after states
- Group related operations into single undo actions
- Maintain a maximum history size to prevent memory issues
- Clear history appropriately when starting new projects

## Layout Principles

### Four-Panel Layout System
- Top-left: AI Script panel (resizable width)
- Top-right: Video preview panel (fills remaining width)
- Bottom-left: Assets panel (same width as script panel)
- Bottom-right: Timeline panel (fills remaining width)
- Implement both horizontal and vertical resize handles
- Maintain minimum and maximum panel sizes (10-40% for sides, 20-80% for vertical)

### Responsive Design Approach
- Use percentage-based sizing for panel dimensions
- Store panel sizes in component state
- Implement smooth resize animations
- Preserve panel sizes during view mode changes
- Handle edge cases when panels reach minimum sizes

### View Modes Architecture
- Normal mode: Standard four-panel layout
- Full Tab mode: Video fills browser tab with minimal controls
- Full Screen mode: Native fullscreen API integration
- Implement keyboard shortcuts for mode switching (F, Shift+F)
- Manage video element repositioning between modes

## Styling Principles

### Dark Theme Consistency
- Primary background: gray-900
- Secondary backgrounds: gray-800
- Borders: gray-700
- Hover states: gray-600
- Text hierarchy: white, gray-300, gray-400, gray-500
- Accent colors: blue-500 for primary actions, red-600 for recording

### Visual Feedback Patterns
- Hover effects on all interactive elements
- Transition animations for state changes
- Visual indicators for resize handles
- Pulsing animation for recording state
- Progress indicators for long-running operations

### Component Styling Strategy
- Use Tailwind CSS for utility-first styling
- Implement conditional classes based on state
- Maintain consistent spacing (p-4, gap-2, etc.)
- Use aspect ratios for media containers
- Apply overflow handling appropriately

## Timeline Implementation Principles

### Multi-Track System
- Support unlimited video/audio tracks
- Implement track-specific operations (mute, solo, delete)
- Maintain track heights and visual hierarchy
- Support drag-and-drop between tracks
- Implement magnetic snapping to clip edges

### Clip Management
- Each clip maintains start frame, end frame, and track assignment
- Support trimming from both ends independently
- Implement splitting at playhead position
- Maintain clip selection state
- Support multi-clip operations

### Timeline Interactions
- Click and drag to move clips
- Alt-drag to duplicate clips
- Drag edges to trim
- Double-click to select/deselect
- Implement zoom controls for timeline scale
- Support horizontal scrolling with proper boundaries

### Visual Rendering
- Use Canvas or SVG for timeline ruler
- Implement virtual scrolling for large timelines
- Show frame-accurate positioning
- Display time markers at appropriate intervals
- Render waveforms for audio tracks

## Recording System Principles

### MediaRecorder Integration
- Request appropriate media permissions
- Support screen, camera, and microphone recording
- Handle multiple input sources simultaneously
- Implement proper cleanup on stop
- Generate unique identifiers for recordings

### Recording State Management
- Track recording duration with interval timer
- Display real-time recording indicators
- Handle recording errors gracefully
- Auto-save recordings to prevent data loss
- Support pause/resume if available

### Blob Handling
- Convert MediaRecorder output to usable video URLs
- Implement proper memory management for blobs
- Support different video codecs
- Handle large file sizes efficiently
- Implement progressive loading

## Playback Control Principles

### Frame-Accurate Playback
- Use requestAnimationFrame for smooth updates
- Sync visual timeline with actual video position
- Implement frame stepping (forward/backward)
- Support variable playback speeds
- Handle seeking accurately across clips

### Performance Optimization
- Throttle timeline updates during playback
- Implement efficient clip switching
- Preload adjacent clips for smooth transitions
- Use Web Workers for heavy calculations
- Optimize Canvas/SVG rendering

### Audio/Video Synchronization
- Maintain audio sync during operations
- Handle multiple audio tracks properly
- Implement crossfades between clips
- Support audio ducking
- Maintain sync after trimming operations

## Keyboard Shortcuts System

### Global Shortcuts
- Space: Play/Pause
- Arrow keys: Frame stepping
- Shift+Arrow: Jump to clip boundaries
- Cmd/Ctrl+Z: Undo
- Cmd/Ctrl+Shift+Z: Redo
- Delete/Backspace: Remove selected clip
- S: Split at playhead
- I/O: Set in/out points

### Context-Aware Shortcuts
- Disable shortcuts when typing in inputs
- Implement modifier keys for variations
- Support customizable shortcuts
- Show shortcut hints in UI
- Prevent browser default behaviors

## Export and Save Principles

### Project Persistence
- Auto-save project state periodically
- Store in localStorage or IndexedDB
- Implement project versioning
- Support import/export of project files
- Maintain backward compatibility

### Export Pipeline
- Support multiple export formats
- Implement quality presets
- Show export progress
- Handle long exports gracefully
- Support background exporting

## Error Handling Principles

### Graceful Degradation
- Catch and handle all video loading errors
- Provide fallback UI for unsupported features
- Show meaningful error messages
- Implement retry mechanisms
- Log errors for debugging

### User Feedback
- Show loading states for async operations
- Provide progress indicators
- Display success confirmations
- Implement toast notifications
- Support error recovery actions

## Performance Principles

### Memory Management
- Clean up video URLs when not needed
- Limit history stack size
- Implement clip thumbnail caching
- Use virtual scrolling for long timelines
- Release MediaRecorder resources properly

### Rendering Optimization
- Use React.memo for expensive components
- Implement proper dependency arrays
- Throttle/debounce expensive operations
- Use CSS transforms for animations
- Minimize DOM manipulations

### Loading Strategy
- Lazy load video content
- Progressive enhancement approach
- Implement skeleton screens
- Prioritize visible content
- Use intersection observers

## Mobile Considerations

### Touch Interactions
- Support touch gestures for timeline
- Implement pinch-to-zoom
- Handle touch-based trimming
- Support swipe gestures
- Provide larger touch targets

### Responsive Behavior
- Adapt layout for smaller screens
- Prioritize essential controls
- Implement collapsible panels
- Support portrait/landscape modes
- Optimize for mobile performance

## Accessibility Principles

### Keyboard Navigation
- Full keyboard accessibility
- Proper focus management
- Skip links for major sections
- Announce state changes
- Support screen readers

### Visual Accessibility
- Sufficient color contrast
- Focus indicators
- Alternative text for icons
- Captions for audio content
- Respect prefers-reduced-motion

## Testing Principles

### Component Testing
- Test all user interactions
- Verify state management
- Test edge cases
- Mock media APIs
- Test error scenarios

### Integration Testing
- Test complete workflows
- Verify data persistence
- Test keyboard shortcuts
- Test view mode transitions
- Test export functionality

## Documentation Principles

### Code Documentation
- Document complex algorithms
- Explain architectural decisions
- Provide usage examples
- Document API interfaces
- Maintain changelog

### User Documentation
- Provide getting started guide
- Document all shortcuts
- Include troubleshooting section
- Provide video tutorials
- Maintain FAQ section