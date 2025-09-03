# Phase 3.1 Revised Implementation Plan
**Date**: 2025-08-31
**Time**: 09:45 AM EST
**Purpose**: Detailed plan for Step 3.1 - Create Dependency Container (revised after initial failure)

## ⚠️ CRITICAL: User Confirmation Required

**This plan has 2 MANDATORY CHECKPOINTS where I must STOP and wait for your confirmation:**

1. **CHECKPOINT 1** - After all non-React changes (ServiceContainer + StateMachine + VideoController)
2. **CHECKPOINT 2** - After first React component (VideoEngine - high risk)

**I will NOT proceed past any checkpoint without explicit confirmation from you.**

## What Went Wrong in First Attempt

### Issues Identified
1. **Too Many Changes at Once**: Modified multiple components simultaneously
2. **React Hook Rules Violation**: Used `useService` hook conditionally which breaks React rules
3. **Complex Conditional Logic**: Mixed feature flag checks with hook calls
4. **No Gradual Migration Path**: Tried to inject services everywhere immediately

## Revised Approach for Step 3.1

### Core Principle
**"Minimal Changes, Maximum Compatibility"** - Start with non-React services only, avoid hooks initially

### Implementation Strategy

## Part A: Create Basic Container (No React Integration)
**Goal**: Build the container without touching React components yet

### Step A.1: Create ServiceContainer
```typescript
// /src/lib/dependency-injection/ServiceContainer.ts
export class ServiceContainer {
  private static instance: ServiceContainer | null = null
  private services = new Map<string, ServiceRegistration<any>>()
  
  // Singleton pattern
  static getInstance(): ServiceContainer
  
  // Register and resolve services
  register<K extends keyof Services>(name: K, registration): void
  resolve<K extends keyof Services>(name: K): Services[K]
}

// Export functions for non-React usage
export const serviceContainer = ServiceContainer.getInstance()
export function getService<K extends keyof Services>(name: K): Services[K]
```

### Step A.2: Register Non-React Services Only
**Services to Register**:
- VideoController (already a class)
- VideoStateCoordinator (singleton)
- StateUpdateTracker (singleton)
- RaceConditionGuard (singleton)
- EventListenerManager (singleton)

**NOT YET**:
- No DOMService yet (too many touch points)
- No AIService yet (doesn't exist)
- No Store services (would create circular deps)

### Step A.3: Update Non-React Code Only
**Safe Updates** (these are classes, not components):
1. `StateMachine.ts` - Use `getService('videoController')` with feature flag
2. `VideoController.ts` - Use `getService('videoStateCoordinator')` internally

**DO NOT UPDATE YET**:
- Any React components
- Any hooks
- Anything that renders

## Part B: Test Non-React Integration
**Goal**: Ensure services work without React involvement

### Test Points:
1. Services can be resolved
2. Singletons return same instance
3. Feature flag controls work
4. Fallback to direct imports works

## Part C: Add React Context (Carefully)
**Goal**: Provide services to React without breaking rules

### Step C.1: Create Simple Provider
```typescript
// /src/providers/ServiceProvider.tsx
'use client'

export function ServiceProvider({ children }) {
  // No hooks here, just pass through
  return children
}
```

### Step C.2: Add to Layout (Inactive)
- Add ServiceProvider to layout but it does nothing initially
- Ensures no immediate breakage

### Step C.3: Create Helper Functions (Not Hooks)
```typescript
// /src/lib/dependency-injection/helpers.ts

// Not a hook - can be called conditionally
export function getDIService<K extends keyof Services>(
  name: K,
  featureFlag: boolean
): Services[K] | null {
  if (!featureFlag) return null
  return getService(name)
}

// Usage in components:
const service = getDIService('raceConditionGuard', isFeatureEnabled('USE_DI'))
if (service) {
  // use service
} else {
  // use direct import
}
```

## Part D: Gradual Component Migration
**Goal**: Update one component at a time with proper testing

### Step D.1: Pick Simplest Component
Start with `VideoEngine.tsx`:
```typescript
// Instead of hook:
const videoStateCoordinator = isFeatureEnabled('USE_DI')
  ? getDIService('videoStateCoordinator', true)
  : require('@/lib/video-state/VideoStateCoordinator').videoStateCoordinator
```

### Step D.2: Test That Component
- Verify it works with DI enabled
- Verify it works with DI disabled
- No React hook errors

### Step D.3: Continue One by One
Only after VideoEngine works, move to next component

## Success Criteria for Step 3.1

### Must Have
✅ ServiceContainer class exists and works
✅ Services can be registered and resolved
✅ Feature flag controls enablement
✅ Fallback to direct imports works
✅ No React hook violations
✅ No component breakage

### Nice to Have (But Not Required)
- React context integration (can be Step 3.1b)
- All components using DI (can be gradual)
- DOM service abstraction (can be Step 3.2)

## Key Differences from Failed Attempt

| Failed Attempt | Revised Approach |
|----------------|------------------|
| Used React hooks (`useService`) | Use plain functions (`getService`) |
| Updated many components at once | Update one at a time |
| Conditional hook calls | No hooks, just functions |
| Required ServiceProvider immediately | ServiceProvider optional/inactive initially |
| Complex DOM service | Skip DOM service for now |
| All-or-nothing migration | Gradual, feature-flagged migration |

## Implementation Order with Checkpoints

### Phase A: Non-React Infrastructure (Steps 1-3)
**These can be done together as they're all non-React classes**

#### Step 1: Create ServiceContainer.ts
- Create the container class
- Register services
- Add to window for debugging

#### Step 2: Update StateMachine.ts
- Use `getService('videoController')` with feature flag
- Keep fallback to direct instantiation

#### Step 3: Update VideoController.ts
- Use `getService('videoStateCoordinator')` internally
- Keep all fallbacks

**✅ CHECKPOINT 1 - STOP AND TEST AFTER ALL NON-REACT CHANGES**
```
Manual Testing Required:
1. Open browser console - verify window.__SERVICE_CONTAINER__ exists
2. Play/pause video - verify it works
3. Test keyboard shortcuts (← → space F)
4. Verify AI agents appear on pause
5. Click "Let's go" button - verify it activates
6. Switch between quiz/reflect/path - verify switching works
7. Complete a quiz - verify video resumes
8. Test on both student and public pages
9. Check console for any errors

⚠️ WAIT FOR USER CONFIRMATION: "All non-React tests pass, proceed to React components"
```

### Phase B: React Component Integration

#### Step 4: Create Helper Functions
- Create getDIService helper (not a hook)
- This is just a utility function

#### Step 5: Update First React Component (VideoEngine.tsx)
- Use getDIService helper for conditional import
- NOT using hooks, just conditional logic

**✅ CHECKPOINT 2 - CRITICAL - STOP AND TEST AFTER FIRST REACT COMPONENT**
```
Manual Testing Required:
1. Test with feature flag OFF:
   - Set USE_DEPENDENCY_INJECTION=false
   - Full video functionality test
   - Verify no React hook errors
   
2. Test with feature flag ON:
   - Set USE_DEPENDENCY_INJECTION=true
   - Full video functionality test
   - Verify services are being used (check console logs)
   
3. Test both video types:
   - Regular HTML5 videos
   - YouTube videos
   
4. Check specifically for React errors in console

⚠️ WAIT FOR USER CONFIRMATION: "React integration successful, Step 3.1 complete"
```

### Phase C: Additional Components (Only if Checkpoint 2 passes)
- Update remaining components one at a time
- Each gets individual testing
- Lower risk once pattern is proven

## Rollback Plan

If anything breaks:
1. Set `USE_DEPENDENCY_INJECTION=false`
2. All code falls back to direct imports
3. Delete new files if needed
4. No modifications to existing imports required

## Testing Checklist After Implementation

- [ ] Video plays and pauses
- [ ] Keyboard shortcuts work
- [ ] AI agents appear
- [ ] No console errors about hooks
- [ ] No console errors about missing services
- [ ] Feature flag `USE_DEPENDENCY_INJECTION=false` restores old behavior
- [ ] Feature flag `USE_DEPENDENCY_INJECTION=true` uses new container

## Lessons Learned

1. **Don't use React hooks conditionally** - This is a fundamental React rule
2. **Start with non-React code** - Classes and utilities are safer to modify
3. **One component at a time** - Easier to identify what breaks
4. **Feature flags for everything** - Must be able to disable instantly
5. **Test after each small change** - Don't accumulate changes

## Next Steps After Success

Only after Step 3.1 is working and stable:
- Step 3.1b: Add React context support (if needed)
- Step 3.2: DOM Service abstraction
- Step 3.3: Break circular dependencies

---

**Remember**: The goal is a working DI container that doesn't break anything. React integration is secondary and can be deferred.