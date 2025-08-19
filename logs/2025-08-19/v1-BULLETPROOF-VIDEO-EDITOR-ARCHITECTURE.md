# 04: Bulletproof Video Editor Architecture - Complete Implementation Guide

---

## 🎯 Architecture Principles (Non-Negotiable)

### Principle 1: Single Source of Truth (SSOT)
- **RULE**: Every piece of queryable state exists in exactly ONE place - the State Machine
- **CLARIFICATION**: 
  - State Machine stores ALL state (business: timeline/modes, technical: video time/recorder status)
  - Services manipulate resources (DOM, MediaRecorder) but don't store queryable state
  - All state updates flow: Service → Event → State Machine
- **ENFORCEMENT**: TypeScript interfaces prevent duplicate state storage (NO `any` types allowed)
- **VALIDATION**: Automated tests verify no data duplication
- **TYPE SAFETY**: All events and state must be fully typed with type guards

### Principle 2: Event-Driven Communication
- **RULE**: All inter-service communication happens via typed events
- **ENFORCEMENT**: Direct service calls are compile-time errors
- **VALIDATION**: Event bus logs provide complete audit trail
- **EVENT FLOW**: State changes trigger events via the Event Bus
- **ERROR RECOVERY**: Compensating events for all failures

### Principle 3: State Machine Authority
- **RULE**: All state changes go through validated state machine transitions
- **ENFORCEMENT**: XState prevents impossible state transitions
- **VALIDATION**: State machine visualizer shows all possible flows

### Principle 4: Service Boundary Isolation
- **RULE**: Each service has single responsibility with clear boundaries
- **ENFORCEMENT**: Interface contracts prevent boundary violations
- **VALIDATION**: Dependency analysis ensures clean separation
- **SERVICE RESPONSIBILITY**: Services are stateless executors that manipulate external resources
- **INITIALIZATION**: Clear initialization sequence prevents race conditions

### Principle 5: Pure Component Pattern
- **RULE**: React components only render, never manage state
- **ENFORCEMENT**: ESLint rules prevent useState in components
- **VALIDATION**: Component tests only verify rendering

---

## 🏗️ Core Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    EVENT BUS (Central Nervous System)   │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   RECORD    │  │   PLAYBACK  │  │   TIMELINE  │     │
│  │   SERVICE   │  │   SERVICE   │  │   SERVICE   │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
├─────────────────────────────────────────────────────────┤
│              STATE MACHINE (Single State Authority)     │
├─────────────────────────────────────────────────────────┤
│                   EVENT STORE (State History)           │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ RECORDING   │  │ PLAYBACK    │  │ TIMELINE    │     │
│  │ COMPONENTS  │  │ COMPONENTS  │  │ COMPONENTS  │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
```

---
