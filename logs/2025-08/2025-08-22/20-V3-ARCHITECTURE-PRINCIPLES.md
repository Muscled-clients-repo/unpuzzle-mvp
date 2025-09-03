# BULLETPROOF V3.0 Architecture Principles

*Core principles and proven patterns for professional video editor architecture*

---

## 🎯 Core Architecture Principles

### Principle 0: Frame-Based Single Source of Truth
- **RULE**: ALL time calculations use frame numbers as the primary source of truth
- **PRECISION**: State Machine stores frame numbers (integers), time values calculated only when needed
- **PROFESSIONAL STANDARD**: Follows industry practice (Adobe Premiere, DaVinci Resolve, Final Cut Pro)
- **SYNC GUARANTEE**: Frame-based calculations eliminate floating-point precision issues
- **CONVERSION**: Frame numbers convert to time/pixels only for display and external services

### Principle 1: Single Source of Truth (SSOT)
- **RULE**: Every piece of queryable state exists in exactly ONE place - the State Machine
- **AUTHORITY**: State Machine stores BOTH business state AND technical state
- **FRAME ENHANCEMENT**: Primary state stored as frame numbers with frame rate metadata
- **ENFORCEMENT**: TypeScript interfaces prevent duplicate state storage
- **REQUIREMENT**: Integration Layer pattern bridges State Machine decisions to services

### Principle 2: State Machine Authority
- **RULE**: All state changes go through validated state machine transitions
- **BUSINESS LOGIC**: State Machine contains ALL business logic, not just state storage
- **PRE-CALCULATION**: State Machine pre-calculates decisions for Integration Layer
- **GUARDS**: Complex conditional state transitions for real-world flows
- **VALIDATION**: Every state change must be validated before execution

### Principle 3: Service Boundary Isolation
- **RULE**: Each service has single responsibility with clear boundaries
- **EXECUTOR ROLE**: Services are stateless executors that only manipulate external resources
- **NO BUSINESS LOGIC**: Services cannot make business decisions or store business state
- **INTEGRATION**: Services respond to Integration Layer, not direct method calls
- **EXTERNAL ONLY**: Services only interact with external resources (DOM, APIs, etc.)

### Principle 4: Integration Layer Coordination
- **RULE**: Integration Layer observes State Machine and coordinates service execution
- **OBSERVER**: Subscribes to State Machine changes, forwards decisions to services
- **NO LOGIC**: Integration Layer only forwards pre-calculated decisions
- **BIDIRECTIONAL**: Handles State Machine → Services and Services → State Machine flow
- **CLEANUP**: Responsible for action cleanup after execution

### Principle 5: Pure Component Pattern
- **RULE**: React components only render, never manage state
- **QUERIES**: Components read state via Query Layer
- **COMMANDS**: Components trigger actions via Command Layer
- **NO HOOKS**: No useState for business logic in components
- **RENDER ONLY**: Components are pure rendering functions

### Principle 6: Query Layer SSOT Compliance
- **RULE**: Query Layer reads from State Machine ONLY
- **NO SERVICE ACCESS**: Queries never read from services directly
- **READ-ONLY**: Queries are pure read operations with no side effects
- **FRAME CONVERSION**: Queries handle frame-to-time conversion for components
- **SINGLE PATH**: All state queries follow one path: Component → Query → State Machine

### Principle 7: Command Layer Unidirectional Flow
- **RULE**: Commands only send events to State Machine, never call services directly
- **EVENT-ONLY**: Commands translate user actions into State Machine events
- **NO LOGIC**: Commands contain no business logic, only event dispatching
- **VALIDATION**: Commands may validate input format but not business rules
- **SINGLE DIRECTION**: All commands follow one path: Component → Command → State Machine

---

## 🔧 Proven Working Patterns

### Pattern 1: Pending Action Pattern
**Purpose**: State Machine pre-calculates complex decisions
- State Machine sets pending actions in context
- Integration Layer reads pending actions
- Services execute pre-calculated decisions
- State Machine clears pending actions after execution
- Prevents business logic in Integration Layer

### Pattern 2: Observer Subscription Pattern
**Purpose**: Loose coupling between State Machine and services
- Integration Layer subscribes to State Machine
- Tracks previous state to detect changes
- Compares current vs processed actions
- Forwards only new actions to services
- Maintains single subscription point

### Pattern 3: Race Condition Prevention Pattern
**Purpose**: Prevent overlapping operations
- Atomic operation locks (isProcessingClipTransition, isProcessingSeek)
- Check lock before starting operation
- Set lock when operation begins
- Clear lock in finally block
- Timeout recovery for stuck locks

### Pattern 4: Video Reuse Optimization Pattern
**Purpose**: Optimize video element usage for performance
- Check if same video already loaded
- Compare base clip IDs for trimmed segments
- Verify source URLs match
- Skip load if video can be reused
- Seek within existing video instead of reload

### Pattern 5: Action Cleanup Pattern
**Purpose**: Maintain clean state after operations
- Execute service operations
- Send ACTIONS_PROCESSED event
- Clear pending actions from context
- Reset processing flags
- Prevent duplicate processing

### Pattern 6: Frame-to-Time Conversion Pattern
**Purpose**: Bridge frame-based state with time-based services
- Store frames as primary source
- Convert to time only when needed
- Use consistent frame rate
- Round frames for precision
- Cache conversions when possible

---

## 🚫 Anti-Patterns to Avoid

### Anti-Pattern 1: Dual Sources of Truth
- ❌ Reading time from both State Machine and Services
- ❌ Storing same data in multiple locations
- ❌ Services exposing queryable state

### Anti-Pattern 2: Business Logic in Services
- ❌ Services making decisions
- ❌ Services calculating next states
- ❌ Services determining clip sequences

### Anti-Pattern 3: Direct Service Communication
- ❌ Services calling each other directly
- ❌ Components calling services directly
- ❌ Bypassing State Machine for state changes

### Anti-Pattern 4: Floating-Point Time Primary Storage
- ❌ Storing time as primary source
- ❌ Using decimals for frame positions
- ❌ Accumulating floating-point errors

### Anti-Pattern 5: Synchronous State Assumptions
- ❌ Assuming immediate state updates
- ❌ Not handling pending states
- ❌ Ignoring race conditions

---

## 🎯 Architecture Invariants

1. **State Machine is the ONLY source of truth**
2. **All state changes flow through State Machine**
3. **Services never store queryable state**
4. **Integration Layer never makes decisions**
5. **Components never directly modify state**
6. **Frame numbers are primary, time is derived**
7. **Every operation has cleanup**
8. **Race conditions are prevented with locks**
9. **Business logic lives ONLY in State Machine**
10. **External resources accessed ONLY through Services**

---

## 🔄 Data Flow Rules

### Command Flow
```
User Action → Component → Command → State Machine → Integration Layer → Service
```

### Query Flow
```
Component → Query → State Machine (ONLY)
```

### Event Flow
```
Service Event → Integration Layer → State Machine → Query Updates → Component Re-render
```

### Frame Conversion Flow
```
Frame (State Machine) → Time (Integration Layer) → Video Element (Service)
```

---

## ✅ Implementation Checklist

When implementing any feature, verify:

- [ ] State stored in State Machine only
- [ ] Business logic in State Machine only
- [ ] Services are stateless executors
- [ ] Integration Layer only forwards decisions
- [ ] Components only render
- [ ] Frame-based calculations used
- [ ] Race conditions prevented
- [ ] Cleanup implemented
- [ ] Single source of truth maintained
- [ ] No anti-patterns introduced