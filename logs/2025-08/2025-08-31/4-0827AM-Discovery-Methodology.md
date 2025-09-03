# Discovery Methodology for Hidden Interconnections
**Date**: 2025-08-31
**Time**: 08:27 AM EST
**Purpose**: Systematic approach to finding invisible dependencies and connections

## Discovery Techniques

### 1. Static Analysis Techniques

#### Global Search Patterns
**Find Direct Store Access**
- Search for: getState() calls
- Search for: useAppStore.getState
- Search for: direct slice access patterns
- Search for: cross-slice get() calls

**Find Singleton Patterns**
- Search for: module-level let/const declarations
- Search for: global variable assignments
- Search for: instances stored outside components

**Find Hidden Imports**
- Search for: circular import patterns
- Search for: deep import paths (../../../)
- Search for: re-exports and aliases
- Search for: dynamic imports

#### Dependency Mapping
**Follow Import Chains**
- Start from a component
- List all its imports
- For each import, list its imports
- Build complete dependency tree
- Identify circular dependencies

**Cross-Reference Analysis**
- Find all files importing StudentVideoSlice
- Find all files importing VideoController
- Find all files importing useVideoAgentSystem
- Map overlapping usage

### 2. Runtime Analysis Techniques

#### Console Logging Strategy
**Add Discovery Logs**
- Log when state changes
- Log when effects run
- Log when refs are set
- Log when events dispatch
- Log call stacks for key operations

**Trace Execution Paths**
- Add console.trace() at critical points
- See full call stack
- Identify unexpected callers
- Find hidden execution paths

#### Browser DevTools Investigation
**Redux DevTools**
- Watch state changes in real-time
- See which actions trigger which updates
- Identify cascade effects
- Find duplicate or redundant updates

**Performance Profiler**
- Record interaction scenarios
- See component render triggers
- Identify unnecessary re-renders
- Find performance bottlenecks

**Network Tab**
- Monitor API calls triggered by state changes
- Find hidden data dependencies
- Identify retry patterns

### 3. Behavioral Analysis Techniques

#### Interaction Testing
**User Action Mapping**
- Click pause button → What state changes?
- Click agent button → What components re-render?
- Complete quiz → What cleanup happens?
- Switch video → What persists?

**State Mutation Testing**
- Manually change state in DevTools
- Observe what breaks
- Identify dependent components
- Find assumed state shapes

#### Breakpoint Debugging
**Strategic Breakpoints**
- Set breakpoint in state updates
- Set breakpoint in event handlers
- Set breakpoint in lifecycle methods
- Step through execution flow
- Discover unexpected paths

### 4. Code Archaeology Techniques

#### Git History Analysis
**Blame Investigation**
- Find when dependencies were added
- Understand why patterns exist
- Identify technical debt origins
- Find related changes

**Commit Pattern Analysis**
- Search commits for "fix" related to video
- Find patches that reveal dependencies
- Identify recurring problem areas
- Understand evolution of connections

#### Comment Mining
**Search for Clues**
- TODO comments revealing issues
- FIXME comments showing problems
- HACK comments indicating workarounds
- WARNING comments about dependencies

### 5. Systematic Probing Techniques

#### Controlled Breakage
**Temporary Removal Testing**
- Comment out a suspected dependency
- See what breaks
- Document the connection
- Restore immediately

**Null Testing**
- Replace function with null
- See error messages
- Trace error sources
- Map dependency chain

#### Isolation Testing
**Component Isolation**
- Render component in isolation
- Provide minimal props
- See what it assumes exists
- Identify global dependencies

**Slice Isolation**
- Test slice actions independently
- Mock other slices
- Find cross-slice calls
- Identify hidden coupling

### 6. Documentation Discovery

#### Type Definition Analysis
**Interface Exploration**
- Examine TypeScript interfaces
- Find shared types
- Identify type dependencies
- Map type inheritance

**Generic Type Usage**
- Find components using generic types
- Trace type parameter flow
- Identify type constraints
- Map type relationships

#### JSDoc and Comments
**Inline Documentation**
- Read function comments
- Find usage warnings
- Identify assumptions
- Discover constraints

### 7. Pattern Recognition Techniques

#### Anti-Pattern Detection
**Common Hiding Places**
- useEffect with empty deps hiding global access
- setTimeout/setInterval with closures
- Event listeners accessing outer scope
- Refs storing mutable state

**Subscription Patterns**
- Find all subscribe/unsubscribe pairs
- Identify what triggers subscriptions
- Map subscription dependencies
- Find missing cleanups

### 8. Automated Discovery Tools

#### Static Analysis Tools
**Dependency Graphing**
- Use madge or similar tools
- Generate visual dependency graphs
- Identify circular dependencies
- Find orphaned code

**Complexity Analysis**
- Run complexity analyzers
- Find highly coupled modules
- Identify refactoring targets
- Measure coupling metrics

#### Custom Discovery Scripts
**Write Discovery Utilities**
- Script to find all getState() calls
- Script to map component-to-slice usage
- Script to find singleton patterns
- Script to detect global access

## Discovery Workflow

### Phase 1: Broad Scanning
1. Run automated tools
2. Generate dependency graphs
3. Create initial connection map
4. Identify obvious issues

### Phase 2: Deep Investigation
1. Add discovery logging
2. Trace execution paths
3. Debug critical flows
4. Document hidden paths

### Phase 3: Behavior Verification
1. Test user interactions
2. Monitor state changes
3. Profile performance
4. Map cause and effect

### Phase 4: Documentation
1. Create connection inventory
2. Document each dependency
3. Rate risk level
4. Plan mitigation

## Discovery Outputs

### Connection Inventory Format
For each discovered connection:
- Source location (file:line)
- Target location (file:line)
- Connection type (import/global/event)
- Direction (one-way/bidirectional)
- Risk level (low/medium/high)
- Breakage impact
- Migration strategy

### Hidden Dependency Map
Visual or textual map showing:
- All state sources
- All state consumers
- All event flows
- All global access points
- All circular dependencies

### Risk Assessment Matrix
Table categorizing discoveries:
- Critical paths (must not break)
- High-risk areas (likely to break)
- Safe zones (can change freely)
- Unknown territories (need more investigation)

## Red Flags to Look For

### Immediate Concerns
- Multiple setTimeout/setInterval
- Direct DOM manipulation
- Global variable usage
- Eval or Function constructor
- Dynamic imports in loops

### Architecture Smells
- Circular dependencies
- Deep prop drilling
- State duplication
- Event handler accumulation
- Missing cleanup functions

### Hidden Assumptions
- Assumed execution order
- Implicit state initialization
- Unverified state shapes
- Hardcoded array indices
- Magic string constants

## Discovery Validation

### Verification Steps
1. Disable discovered dependency
2. Confirm expected breakage
3. Re-enable dependency
4. Confirm restoration

### False Positive Check
- Not all imports are dependencies
- Not all state access is coupling
- Some globals are intentional
- Some patterns are framework requirements

## Using Discovery Results

### Prioritization
1. Fix critical hidden dependencies first
2. Document unavoidable dependencies
3. Plan refactoring for bad patterns
4. Accept some coupling as necessary

### Migration Planning
- Use discoveries to update execution plan
- Add steps for each hidden dependency
- Include verification for each connection
- Plan rollback for each change

---

**Key Insight**: You can't refactor what you can't see. Discovery must come before execution. Every hidden connection found before refactoring is a crisis avoided during refactoring.