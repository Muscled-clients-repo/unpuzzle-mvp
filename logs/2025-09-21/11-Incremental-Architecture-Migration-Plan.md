# Incremental Architecture Migration Plan
**Date**: 2025-09-21
**Goal**: Migrate from monolithic AIChatSidebarV2 to clean Chat/Agent separation
**Current State**: Working quiz/reflection buttons at commit `e3b0801`

## Migration Strategy: Phased Incremental Approach

### Phase 1: Foundation Setup (Infrastructure Only)
**Goal**: Set up new architecture infrastructure without breaking existing functionality

#### Step 1.1: Database Migration
- [ ] Apply learning_activities table migration
- [ ] **Manual Check**: Verify database migration successful, no errors
- [ ] **Manual Check**: Existing quiz/reflection functionality still works

#### Step 1.2: Server Actions & Hooks
- [ ] Add learning-activity-actions.ts (server actions)
- [ ] Add use-learning-activities.ts (TanStack Query hooks)
- [ ] **Manual Check**: No compilation errors, existing functionality unaffected

### Phase 2: Component Creation (Parallel Architecture)
**Goal**: Create new components that run alongside old architecture

#### Step 2.1: Create Base Components
- [ ] Create ChatInterface.tsx (pure chat functionality)
- [ ] Create AgentInterface.tsx (pure agent functionality)
- [ ] Create LearningTabs.tsx (tab container)
- [ ] **Manual Check**: Components compile, no runtime errors
- [ ] **Manual Check**: Old AIChatSidebarV2 still works perfectly

#### Step 2.2: Test Components in Isolation
- [ ] Add temporary route to test new components separately
- [ ] Verify ChatInterface handles chat messages correctly
- [ ] Verify AgentInterface displays activities correctly
- [ ] **Manual Check**: New components work in isolation
- [ ] **Manual Check**: Old system still 100% functional

### Phase 3: Gradual Integration (Feature by Feature)
**Goal**: Slowly replace old functionality with new components

#### Step 3.1: Chat Tab Migration
- [ ] Replace chat rendering in AIChatSidebarV2 with ChatInterface
- [ ] Keep Agent tab using old logic
- [ ] **Manual Check**: Chat tab works with new component
- [ ] **Manual Check**: Agent tab still uses old working logic
- [ ] **Manual Check**: Quiz/reflection buttons still work in Agent tab

#### Step 3.2: Message Filtering Migration
- [ ] Move chat message filtering to ChatInterface
- [ ] Keep agent message filtering in old AIChatSidebarV2
- [ ] **Manual Check**: Chat messages display correctly
- [ ] **Manual Check**: Agent functionality unchanged

#### Step 3.3: Agent Tab Structure Migration
- [ ] Replace agent tab structure with LearningTabs
- [ ] Keep agent logic/handlers in AIChatSidebarV2
- [ ] **Manual Check**: Agent tab layout looks correct
- [ ] **Manual Check**: Quiz/reflection buttons still work

### Phase 4: Handler Migration (Critical Phase)
**Goal**: Move quiz/reflection handlers to new architecture

#### Step 4.1: Handler Prop Passing
- [ ] Pass quiz/reflection handlers through component chain
- [ ] Keep old handlers as fallback
- [ ] **Manual Check**: Handlers reach AgentInterface correctly
- [ ] **Manual Check**: Buttons still work via old handlers

#### Step 4.2: Handler Activation
- [ ] Switch AgentInterface to use new handlers
- [ ] Keep old handlers for emergency fallback
- [ ] **Manual Check**: Quiz buttons work with new handlers
- [ ] **Manual Check**: Reflection buttons work with new handlers
- [ ] **Manual Check**: Voice recording still works
- [ ] **Manual Check**: Loom functionality still works

#### Step 4.3: Handler Cleanup
- [ ] Remove old handler code from AIChatSidebarV2
- [ ] **Manual Check**: Everything still works perfectly

### Phase 5: Data Flow Migration
**Goal**: Replace message-based system with proper data sources

#### Step 5.1: Agent Prompts Migration
- [ ] Create agent prompts via learning_activities instead of messages
- [ ] Keep message bridge as fallback
- [ ] **Manual Check**: Agent prompts appear correctly
- [ ] **Manual Check**: Quiz/reflection flow works end-to-end

#### Step 5.2: Activity Data Migration
- [ ] Use TanStack Query for activity data
- [ ] Remove dependency on message filtering
- [ ] **Manual Check**: Activities display correctly
- [ ] **Manual Check**: Quiz results show properly
- [ ] **Manual Check**: Voice memos appear correctly

### Phase 6: Final Cleanup
**Goal**: Remove old architecture and finalize

#### Step 6.1: Legacy Code Removal
- [ ] Remove unused code from AIChatSidebarV2
- [ ] Clean up message filtering logic
- [ ] **Manual Check**: No functionality lost

#### Step 6.2: Testing & Validation
- [ ] Full end-to-end testing
- [ ] Performance validation
- [ ] **Manual Check**: All features work as before
- [ ] **Manual Check**: Code is cleaner and maintainable

## Safety Protocols

### Before Each Step
1. **Git checkpoint**: Commit working state
2. **Backup verification**: Ensure we can revert quickly
3. **Functionality test**: Verify current step works

### After Each Step
1. **Manual verification**: User confirms functionality
2. **Error check**: No console errors or warnings
3. **Performance check**: No degradation in responsiveness

### If Something Breaks
1. **Immediate revert**: `git reset --hard [last-working-commit]`
2. **Root cause analysis**: Understand what went wrong
3. **Plan adjustment**: Modify approach for next attempt

## Success Criteria

### Phase Completion Criteria
- [ ] All existing functionality works exactly as before
- [ ] No console errors or warnings
- [ ] Clean separation between chat and agent systems
- [ ] Maintainable and extensible code structure

### Final Success Criteria
- [ ] Quiz buttons work perfectly
- [ ] Reflection buttons work perfectly
- [ ] Voice recording works
- [ ] Loom functionality works
- [ ] Chat system works independently
- [ ] Agent system works independently
- [ ] Code is clean and maintainable

## Risk Mitigation

### High-Risk Areas
1. **Handler wiring**: Most likely to break quiz/reflection functionality
2. **Message filtering**: Complex logic that affects both systems
3. **State management**: Props passing through multiple components

### Mitigation Strategies
1. **Incremental prop passing**: Add props without using them first
2. **Dual implementation**: Keep old and new side-by-side
3. **Immediate testing**: Test after every small change

## Notes
- **Priority**: Functionality over code cleanliness
- **Approach**: Conservative, test-heavy, user-verified
- **Rollback**: Always ready to revert to working state
- **Communication**: Manual check required before proceeding to next step