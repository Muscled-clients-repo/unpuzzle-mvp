# Phase 3.2 DOM Service Implementation Plan
**Date**: 2025-08-31
**Time**: 6:30 PM EST
**Purpose**: Detailed plan for Step 3.2 - Replace Direct DOM Access with DOM Service abstraction

## Alignment with Core Documents

### From File #5 (Discovery Findings)
**8 Direct DOM Manipulations identified**:
- `document.querySelector('video')` - Direct DOM queries
- `document.createElement('script')` - Dynamic script injection  
- `document.body.style` - Direct style manipulation
- `window.getSelection()` - Text selection handling
- `document.fullscreenElement` - Fullscreen checks
- `document.addEventListener` - Event registration
- YouTube API script injection
- Resize observer patterns

**Risk**: Cannot run in Node/SSR, testing requires jsdom

### From File #2 (Principles)
Following these principles:
- **Risk-Based Ordering**: Start with lowest risk (create new alongside old)
- **Compatibility Layer Strategy**: Maintain backward compatibility
- **Incremental Verification**: Test after each atomic change
- **Clear Boundary Definition**: DOM service has clear interface

## Strategy Overview

**Core Approach**: "Abstract, Don't Break"
- Create DOM service interface first
- Implement browser version (real DOM)
- Implement mock version (for testing)
- Migrate one usage at a time
- Keep direct DOM as fallback initially

## Risk Assessment

### Low Risk (Start Here)
- VideoController's fallback DOM queries
- Fullscreen API calls
- Window size calculations

### Medium Risk
- Event listener registration
- YouTube script injection
- Body style modifications

### High Risk (Do Last)
- TranscriptPanel text selection
- VideoStudio drag-and-drop DOM manipulation
- Timeline direct element queries

## Implementation Plan

### Phase A: Create DOM Service Infrastructure
**Risk Level**: No Risk (new code only)

#### Step 1: Define Interface
```typescript
// src/lib/dependency-injection/services/IDOMService.ts
export interface IDOMService {
  // Query methods
  querySelector<T extends Element>(selector: string): T | null
  querySelectorAll<T extends Element>(selector: string): NodeListOf<T>
  getElementById<T extends HTMLElement>(id: string): T | null
  
  // Creation
  createElement<K extends keyof HTMLElementTagNameMap>(
    tagName: K
  ): HTMLElementTagNameMap[K]
  
  // Style manipulation
  setBodyStyle(property: string, value: string): void
  removeBodyStyle(property: string): void
  
  // Selection API
  getSelection(): Selection | null
  
  // Fullscreen API
  requestFullscreen(element: Element): Promise<void>
  exitFullscreen(): Promise<void>
  isFullscreen(): boolean
  
  // Event management (with automatic cleanup)
  addEventListener(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions
  ): () => void // Returns cleanup function
  
  // Window/viewport
  getViewportSize(): { width: number; height: number }
  
  // Script injection
  injectScript(src: string, async?: boolean): Promise<void>
}
```

#### Step 2: Browser Implementation
```typescript
// src/lib/dependency-injection/services/BrowserDOMService.ts
export class BrowserDOMService implements IDOMService {
  private listeners = new Map<EventTarget, Map<string, Set<EventListener>>>()
  
  querySelector<T extends Element>(selector: string): T | null {
    if (typeof document === 'undefined') return null
    return document.querySelector<T>(selector)
  }
  
  // Track listeners for cleanup
  addEventListener(...) {
    // Add to tracking
    // Return cleanup function
  }
  
  cleanup() {
    // Remove all tracked listeners
  }
}
```

#### Step 3: Mock Implementation
```typescript
// src/lib/dependency-injection/services/MockDOMService.ts
export class MockDOMService implements IDOMService {
  // Test-friendly implementation
  // No real DOM required
}
```

#### Step 4: Register in ServiceContainer
- Add to ServiceContainer
- Use factory pattern: `typeof window !== 'undefined' ? BrowserDOMService : MockDOMService`

**✅ CHECKPOINT A**: Test service registration only - no usage yet

### Phase B: Migrate Low-Risk DOM Access
**Risk Level**: Low (fallback patterns exist)

#### Step 1: VideoController DOM Fallback
**Current code** (VideoController.ts:43-47):
```typescript
const videoElement = document.querySelector('video') as HTMLVideoElement
if (videoElement) {
  domTime = videoElement.currentTime
}
```

**New code**:
```typescript
const domService = getServiceWithFallback('domService', 
  () => ({ querySelector: (s) => document.querySelector(s) })
)
const videoElement = domService.querySelector<HTMLVideoElement>('video')
if (videoElement) {
  domTime = videoElement.currentTime
}
```

#### Step 2: StudentVideoPlayer Fullscreen
**Current code** (StudentVideoPlayer.tsx:307-313):
```typescript
if (!document.fullscreenElement) {
  containerRef.current?.requestFullscreen()
} else {
  document.exitFullscreen()
}
```

**New code**:
```typescript
const domService = getServiceWithFallback('domService', () => ({
  isFullscreen: () => !!document.fullscreenElement,
  requestFullscreen: (el) => el.requestFullscreen(),
  exitFullscreen: () => document.exitFullscreen()
}))

if (!domService.isFullscreen()) {
  await domService.requestFullscreen(containerRef.current!)
} else {
  await domService.exitFullscreen()
}
```

**✅ CHECKPOINT B**: Test video controls and fullscreen

### Phase C: Migrate Medium-Risk DOM Access
**Risk Level**: Medium (affects initialization)

#### Step 1: YouTube Script Injection
**Current code** (VideoEngine.tsx - in YouTube setup):
```typescript
const script = document.createElement('script')
script.src = 'https://www.youtube.com/iframe_api'
document.body.appendChild(script)
```

**New code**:
```typescript
const domService = getServiceWithFallback('domService', ...)
await domService.injectScript('https://www.youtube.com/iframe_api', true)
```

#### Step 2: Event Listener Management
Update all `document.addEventListener` to use service with auto-cleanup

**✅ CHECKPOINT C**: Test YouTube videos and event handling

### Phase D: Migrate High-Risk DOM Access
**Risk Level**: High (complex interactions)

#### Step 1: TranscriptPanel Selection
- Complex text selection logic
- Needs careful testing

#### Step 2: VideoStudio Drag-and-Drop
- Very complex DOM manipulation
- Consider deferring to separate refactor

**✅ CHECKPOINT D**: Full regression testing

## Testing Strategy

### Unit Tests
```typescript
describe('DOMService', () => {
  it('should work with mock in Node', () => {
    const service = new MockDOMService()
    expect(service.querySelector('video')).toBeNull()
  })
  
  it('should track event listeners', () => {
    const service = new BrowserDOMService()
    const cleanup = service.addEventListener(...)
    cleanup()
    // Verify listener removed
  })
})
```

### Integration Tests
1. Video playback with DOM service
2. Fullscreen with DOM service
3. YouTube with DOM service
4. Event cleanup on unmount

## Rollback Plan

If any issues:
1. Set `USE_DOM_SERVICE=false` in .env.local
2. All code falls back to direct DOM
3. Remove service usage one by one if needed

## Success Criteria

### Must Have
✅ All DOM access abstracted in video components
✅ Tests can run without jsdom
✅ Event listeners properly cleaned up
✅ Feature flag controlled

### Nice to Have
- Performance metrics (no degradation)
- SSR compatibility improved
- Better error messages for DOM failures

## Implementation Order

1. **Create service interface and implementations** (no risk)
2. **Migrate VideoController** (has fallbacks)
3. **Migrate StudentVideoPlayer fullscreen** (simple API)
4. **Test thoroughly**
5. **Migrate YouTube script injection** (medium risk)
6. **Migrate event listeners** (needs cleanup tracking)
7. **Test thoroughly**
8. **Consider high-risk migrations** (may defer)

## Checkpoints

### CHECKPOINT 1: After Phase A (Infrastructure)
- Service registered in container
- Both implementations work
- No components using it yet
⚠️ **WAIT FOR CONFIRMATION**

### CHECKPOINT 2: After Phase B (Low-Risk)
- VideoController uses DOM service
- Fullscreen uses DOM service
- All video features still work
⚠️ **WAIT FOR CONFIRMATION**

### CHECKPOINT 3: After Phase C (Medium-Risk)
- YouTube videos work
- Events properly managed
- No memory leaks
⚠️ **WAIT FOR CONFIRMATION**

## Key Differences from Direct DOM

| Direct DOM | DOM Service |
|------------|-------------|
| `document.querySelector` | `domService.querySelector` |
| No cleanup tracking | Automatic cleanup |
| Can't mock easily | Easy to mock |
| Scattered usage | Centralized interface |
| No SSR consideration | SSR-aware |

## Alignment with Principles

✅ **Explicit Dependencies**: DOM access now explicit via service
✅ **Gradual Migration**: One component at a time
✅ **Test-First**: Can test without real DOM
✅ **Compatibility Layer**: Fallbacks everywhere
✅ **Risk-Based**: Starting with safest changes

## Lessons from Step 3.1

- Keep changes minimal
- Avoid circular dependencies
- Don't use React hooks conditionally
- Feature flag everything
- Test after each small change

---

**Remember**: The goal is to abstract DOM access without breaking anything. If something seems risky, defer it. Perfect is the enemy of good.