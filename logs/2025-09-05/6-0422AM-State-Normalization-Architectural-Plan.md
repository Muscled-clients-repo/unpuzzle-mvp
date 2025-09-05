# State Normalization Architectural Plan

## Executive Summary
This document outlines the architectural approach for normalizing the Unpuzzle MVP state structure to eliminate data duplication, synchronization issues, and the root causes of bugs like video reordering. This plan focuses on principles and concepts without implementation details.

## Current State Problems

### Data Duplication Issues
- Videos exist in multiple locations simultaneously
- Same video object stored in main videos array and within chapter arrays
- Order information tracked redundantly through array position and explicit order field
- Changes must be synchronized across multiple locations
- High risk of state inconsistency

### Synchronization Complexity
- Every video update requires updating multiple arrays
- Reordering requires complex array manipulation logic
- Moving videos between chapters requires multiple state updates
- Delete operations must cascade through multiple structures

### Maintenance Burden
- Developers must remember to update all locations
- Bug-prone synchronization logic
- Difficult to reason about state changes
- Testing requires checking multiple state locations

## Normalization Principles

### Single Source of Truth
Every piece of data should exist in exactly one location. References to that data use identifiers, not copies.

### Entity Separation
Different types of entities (videos, chapters, courses) should be stored in separate normalized structures.

### Relationship Through IDs
Relationships between entities should be expressed through ID references, not nested objects.

### Computed Derived State
Any data that can be computed from the normalized state should be computed, not stored.

## Proposed Architecture

### Core Concepts

#### 1. Entity Maps
Store entities in flat map structures indexed by ID. This provides O(1) lookup performance and ensures each entity exists once.

#### 2. Relationship Arrays
Store relationships as arrays of IDs. This maintains order while avoiding duplication.

#### 3. Selector Pattern
Use selector functions to reconstruct nested views of data for UI consumption.

#### 4. Update Normalization
All updates target the single source of truth. UI components never modify derived data.

### State Structure Design

#### Video Storage
- Videos stored in a flat map structure by ID
- Each video exists exactly once
- Video object contains all video-specific data including order field

#### Chapter Storage
- Chapters stored in flat map structure by ID
- Chapters contain only chapter-specific data
- Relationship to videos expressed through array of video IDs

#### Course Storage
- Course contains course-specific metadata
- Relationships to chapters through array of chapter IDs
- Global video order maintained as single array

#### Order Management
- Order is explicit field on entities, not array position
- Single authoritative order field prevents conflicts
- Array position becomes display concern only

### Data Flow Architecture

#### Read Path
1. Normalized state exists in store
2. Selectors compute derived views
3. Components consume computed views
4. UI never directly accesses normalized state

#### Write Path
1. User actions trigger store actions
2. Actions update single source of truth
3. Selectors automatically recompute
4. UI updates from new computed views

### Selector Strategy

#### Purpose of Selectors
- Transform normalized state into UI-friendly shape
- Compute derived data on-demand
- Provide consistent interface to components
- Enable memoization for performance

#### Selector Types Needed
- Get video by ID
- Get videos for chapter
- Get all videos in order
- Get chapters with populated videos
- Get course with full hierarchy

#### Memoization Strategy
- Selectors should be memoized to prevent unnecessary recomputation
- Use shallow equality for primitive comparisons
- Use deep equality for complex object comparisons
- Consider using reselect or similar library

### Migration Strategy

#### Phase 1: Parallel Structure
- Implement normalized structure alongside existing
- Create adapters to sync between structures
- Verify normalized structure correctness

#### Phase 2: Component Migration
- Migrate components to use selectors
- Update one component at a time
- Maintain backwards compatibility

#### Phase 3: State Action Migration
- Update state actions to modify normalized structure
- Remove synchronization to old structure
- Update all write operations

#### Phase 4: Cleanup
- Remove old denormalized structure
- Remove synchronization code
- Remove backwards compatibility layers

### Benefits of Normalization

#### Correctness
- Eliminates synchronization bugs
- Ensures data consistency
- Reduces update complexity

#### Performance
- O(1) entity lookups
- Reduced memory usage (no duplication)
- More efficient updates (single location)

#### Developer Experience
- Clearer mental model
- Easier debugging
- Simpler update logic
- Predictable state changes

#### Maintainability
- Less code for updates
- Fewer edge cases
- Easier to add new features
- Simpler testing

### Handling Complex Operations

#### Video Reordering Within Chapter
- Update order field on affected videos only
- No array manipulation needed
- UI sorts by order field for display

#### Moving Video Between Chapters
- Update video's chapter_id field
- Update order to fit new position
- Remove ID from old chapter's array
- Add ID to new chapter's array

#### Bulk Operations
- Batch updates in single transaction
- Update normalized structure once
- Let selectors handle recomputation

#### Delete Cascades
- Delete entity from map
- Remove ID from relationship arrays
- Consider soft delete for recovery

### State Persistence Considerations

#### What to Persist
- Only persist normalized structure
- Never persist computed/derived data
- Persist minimal relationship data

#### Hydration Strategy
- Load normalized data from storage
- Validate data integrity on load
- Compute initial derived state

#### Version Migration
- Version the state structure
- Create migration functions for updates
- Handle backwards compatibility

### Performance Optimization

#### Selector Memoization
- Memoize expensive computations
- Use appropriate equality checks
- Consider computation vs memory tradeoff

#### Update Batching
- Batch multiple updates together
- Reduce number of re-renders
- Use transaction pattern for complex updates

#### Lazy Loading
- Load entity details on demand
- Keep initial state minimal
- Progressive enhancement pattern

### Error Handling Philosophy

#### Validation Layer
- Validate at action boundaries
- Ensure data integrity before updates
- Reject invalid operations early

#### Recovery Mechanisms
- Design for partial failure recovery
- Maintain consistent state during errors
- Provide rollback capabilities

#### Debugging Support
- Log state transitions
- Provide state inspection tools
- Enable time-travel debugging

### Testing Strategy

#### Unit Testing
- Test selectors independently
- Test state updates in isolation
- Verify normalization correctness

#### Integration Testing
- Test complete data flows
- Verify selector recomputation
- Test migration scenarios

#### Property-Based Testing
- Ensure normalization invariants
- Test that operations maintain consistency
- Verify selector correctness

### Documentation Requirements

#### State Shape Documentation
- Document normalized structure
- Explain entity relationships
- Provide state examples

#### Selector Documentation
- Document available selectors
- Explain selector inputs/outputs
- Provide usage examples

#### Migration Guide
- Step-by-step migration instructions
- Common pitfall warnings
- Rollback procedures

## Implementation Principles

### Incremental Adoption
- Implement normalization incrementally
- Maintain working application throughout
- Test each phase thoroughly

### Backwards Compatibility
- Support old and new patterns temporarily
- Provide migration utilities
- Deprecate gradually

### Type Safety First
- Define types for normalized structure
- Type all selectors
- Ensure compile-time safety

### Performance Awareness
- Profile before and after
- Monitor selector performance
- Optimize hot paths

## Success Criteria

### Technical Metrics
- Zero duplicate data in state
- All updates target single location
- No synchronization code needed
- Improved update performance

### Quality Metrics
- Reduced bug count
- Faster feature development
- Improved code clarity
- Better test coverage

### Developer Experience
- Clearer mental model
- Easier onboarding
- Reduced cognitive load
- Faster debugging

## Risk Mitigation

### Migration Risks
- Potential for data loss during migration
- Temporary performance degradation
- Breaking existing functionality

### Mitigation Strategies
- Comprehensive testing at each phase
- Feature flags for rollback
- Parallel running for verification
- Incremental user migration

## Next Steps

1. Create detailed implementation plan with code examples
2. Set up normalization utilities and helpers
3. Implement selector infrastructure
4. Begin Phase 1 of migration
5. Create comprehensive test suite

## Conclusion

State normalization is essential for application scalability and maintainability. By eliminating data duplication and establishing single sources of truth, we resolve current bugs and prevent future issues. The migration can be done incrementally with minimal risk, providing immediate benefits while maintaining application stability.