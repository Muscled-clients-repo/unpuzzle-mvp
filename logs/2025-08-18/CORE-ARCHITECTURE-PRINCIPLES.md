# Core Architecture Principles

## 1. Single Source of Truth (SSOT)
- The State Machine is the ONLY authority for business state
- Services may maintain technical state (e.g., MediaRecorder instance) but NEVER business state
- All business decisions flow through the State Machine
- No duplicated state across components or services

## 2. Event-Driven Architecture
- All communication happens through events via TypedEventBus
- Services never call each other directly
- State Machine subscribes to events it cares about
- Services emit events for state changes and notifications
- Complete decoupling between system components

## 3. State Machine Authority
- State Machine validates ALL state transitions
- Impossible states are unrepresentable
- Guards prevent invalid transitions
- All business logic lives in the State Machine
- Services execute commands only after state validation

## 4. Service Boundary Isolation
- Clear separation between business state and technical state
- Services own technical implementation details
- State Machine owns all business logic and state
- Services are stateless processors of commands
- No service knows about other services

## 5. Pure Component Pattern
- React components are purely presentational
- No useState for business logic in components
- Containers use useReducer for batched UI updates
- Components receive data and emit events only
- Complete separation of view from business logic

## 6. Command-Query Responsibility Segregation (CQRS)
- Commands mutate state (go through State Machine first)
- Queries read state (from State Machine or services)
- Clear separation between read and write operations
- Commands always validate through State Machine before execution
- Queries never modify state

## 7. Type Safety
- Zero 'any' types throughout the codebase
- Full TypeScript typing for all events and state
- XState v5 with proper TypeScript integration
- Type-safe event bus with discriminated unions
- Compile-time guarantees for state transitions

## 8. Error Recovery
- Every state transition has error handling
- Services emit error events, don't throw
- State Machine handles error states gracefully
- System can recover from any error state
- No silent failures

## 9. Predictable Behavior
- Given a state and an event, the next state is deterministic
- All state transitions are explicit and logged
- Event sourcing capability for debugging
- Complete audit trail of all state changes
- Time-travel debugging possible

## 10. Scalability Through Composition
- Features are added by extending, not modifying
- New events don't break existing handlers
- Services can be added without touching others
- State machine states can be composed hierarchically
- System grows through addition, not modification

## Key Principles Summary

### DO:
- ✅ State Machine FIRST, Service SECOND for all mutations
- ✅ Events for ALL communication
- ✅ Pure functions and immutable state
- ✅ Explicit state transitions
- ✅ Type everything fully

### DON'T:
- ❌ Services calling services directly
- ❌ Business logic in React components
- ❌ State duplication across boundaries
- ❌ Implicit state changes
- ❌ Any 'any' types

## Architecture Decision Records

### Decision 1: State Ownership
**Choice**: State Machine owns ALL business state
**Rationale**: Single source of truth prevents synchronization bugs
**Trade-off**: Slightly more complex initial setup for centralized state

### Decision 2: Event Bus vs Direct Calls
**Choice**: All communication through EventBus
**Rationale**: Complete decoupling enables independent service evolution
**Trade-off**: Slight performance overhead for event routing

### Decision 3: React State Management
**Choice**: No useState for business logic, only useReducer in containers
**Rationale**: Predictable updates and better performance with batching
**Trade-off**: More boilerplate for simple UI state

### Decision 4: Service Design
**Choice**: Services as stateless command processors
**Rationale**: Simpler testing and reasoning about behavior
**Trade-off**: Some technical state must still be managed (e.g., MediaRecorder)

### Decision 5: Error Handling
**Choice**: Events for errors, no throwing
**Rationale**: Graceful degradation and recovery
**Trade-off**: More explicit error handling code

## Testing Philosophy

1. **Unit Test State Machine**: Test all transitions and guards
2. **Unit Test Services**: Test technical operations in isolation
3. **Integration Test Event Flow**: Test event chains end-to-end
4. **Component Test UI**: Test pure components with props
5. **E2E Test User Flows**: Test complete user journeys

## Extension Guidelines

When adding new features:
1. Define new events first
2. Extend state machine with new states/transitions
3. Create new services if needed (following boundaries)
4. Connect services to event bus
5. Update commands/queries
6. Create pure components for UI
7. Test at each layer independently

## Performance Considerations

1. **Event Batching**: Batch related events when possible
2. **Selective Subscriptions**: Services only subscribe to relevant events
3. **Lazy Service Initialization**: Initialize services only when needed
4. **State Snapshots**: Use snapshots for expensive computations
5. **React Optimization**: Memoize components and callbacks appropriately

## Security Principles

1. **Validate at Boundaries**: Validate all external inputs
2. **State Machine Validation**: Guards prevent invalid states
3. **Sanitize Events**: Clean event payloads before processing
4. **Principle of Least Privilege**: Services only access what they need
5. **Audit Trail**: Log all state transitions for security analysis