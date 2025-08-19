# Video Editor Architecture

**BULLETPROOF Video Editor - XState v5 Implementation**

## 🎯 Quick Start

### Core Files (DO NOT MODIFY WITHOUT APPROVAL)
- **State Machine:** `state-machine/VideoEditorMachineV5.ts` (THE ONLY STATE MACHINE)
- **Commands:** `commands/VideoEditorCommands.ts` (User actions)
- **Integration:** `VideoEditorSingleton.ts` (Orchestration layer)
- **Queries:** `queries/VideoEditorQueries.ts` (State reading)

### Service Layer (Stateless Executors)
- **PlaybackService:** Video playback operations only
- **RecordingService:** Media recording operations only  
- **TimelineService:** Timeline event processing only

## 🏗️ Architecture Pattern

```
User Action → Component → Command → State Machine → Integration Layer → Service
                                        ↓
Service Event → Integration Layer → State Machine → Query → Component Update
```

## ✅ Features Implemented

### Multi-Clip Video Editor
- ✅ **Sequential clip recording** with automatic timeline placement
- ✅ **Seamless clip-to-clip transitions** without manual intervention
- ✅ **Pause/resume functionality** across multiple clips
- ✅ **Timeline navigation** with click and drag scrubber
- ✅ **Keyboard shortcuts** (Delete/Backspace to remove clips)
- ✅ **End-of-video reset** behavior

### Architecture Compliance
- ✅ **Single Source of Truth** - All state in State Machine
- ✅ **Event-Driven Communication** - No direct service calls
- ✅ **Service Isolation** - Services are stateless executors
- ✅ **Integration Layer** - Bridges State Machine to Services

## 🔧 Adding New Features

### 1. Extend State Machine
```typescript
// Add new events to VideoEditorEvent type
| { type: 'NEW_FEATURE.ACTION'; data: SomeType }

// Add new actions
actions: {
  handleNewFeature: assign(({ context, event }) => ({
    // State Machine contains ALL business logic
  }))
}
```

### 2. Add Command Methods
```typescript
// VideoEditorCommands.ts
newFeatureAction(data: SomeType): void {
  this.stateMachine.send({ type: 'NEW_FEATURE.ACTION', data })
}
```

### 3. Update Integration Layer (if needed)
```typescript
// VideoEditorSingleton.ts - only if service interaction needed
if (snapshot.context.newFeature.pendingAction) {
  // Forward State Machine decisions to services
  someService.executeAction(pendingAction)
}
```

## 📋 Development Rules

### ✅ SAFE TO MODIFY
- Command methods (add new user actions)
- Query methods (add new state readers)
- Service methods (add new technical operations)
- Component UI (rendering and user interactions)

### 🚫 DO NOT MODIFY (Without Architecture Review)
- State Machine event flow patterns
- Integration Layer observation logic  
- Service isolation boundaries
- EventBus type definitions
- Core architecture files

### 🔍 Before Making Changes
1. **Understand the flow:** User → Command → State Machine → Integration → Service
2. **Add business logic** in State Machine actions only
3. **Keep services stateless** - no business decisions
4. **Test incrementally** after each change

## 🧪 Testing Your Changes

### Basic Functionality Test
```bash
# After any changes, verify:
npm run dev                    # App starts without errors
```

### Video Editor Functionality Test  
1. **Record multiple clips** (2-3 clips)
2. **Play all clips** - should transition seamlessly
3. **Pause/resume** - should work across clips
4. **Navigate timeline** - click and drag scrubber
5. **Delete clips** - select and press Delete key
6. **Reset behavior** - should restart from beginning when finished

### TypeScript Verification
```bash
npx tsc --noEmit --skipLibCheck   # No compilation errors
```

## 📚 Architecture Documentation

- **BULLETPROOF Principles:** `/logs/2025-08-19/BULLETPROOF-ARCHITECTURE-V2-LESSONS-LEARNED.md`
- **Implementation Details:** `/logs/2025-08-19/4-MULTI-CLIP-VIDEO-EDITOR-COMMIT.md`
- **Refactoring History:** `/logs/2025-08-19/VIDEO-EDITOR-BULLETPROOF-REFACTORING-PLAN.md`

## 🆘 Troubleshooting

### Common Issues
1. **State not updating:** Check if Command is sending correct event to State Machine
2. **Service not responding:** Verify Integration Layer is observing State Machine
3. **TypeScript errors:** Ensure all events are properly typed in VideoEditorEvent

### Emergency Rollback
```bash
git log --oneline -5           # Find last working commit
git reset --hard <commit-hash> # Rollback to working state
npm run dev                    # Verify app works
```

## 🎯 Current Status

**Architecture:** ✅ BULLETPROOF V2.0 Compliant  
**Features:** ✅ Multi-clip video editor complete  
**Code Quality:** ✅ Type-safe with minimal technical debt  
**Documentation:** ✅ Comprehensive guides available  

**Ready for new feature development!**