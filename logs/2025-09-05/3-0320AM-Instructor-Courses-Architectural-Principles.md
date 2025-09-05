# Instructor Courses Current Architecture Documentation

## ⚠️ WARNING: This Document Describes Current Implementation, NOT Best Practices
This document captures the ACTUAL patterns in the codebase, including anti-patterns and technical debt. These are NOT recommended patterns to follow. See "Anti-Patterns & Required Changes" section for critical issues.

## Overview
This document describes the actual architectural patterns implemented in the Unpuzzle MVP instructor courses feature set, based on analysis of the current codebase implementation. Many of these patterns need refactoring.

## Core Architectural Principles

### 1. Client-First State Management
The application prioritizes client-side state as the source of truth during user interactions, with server synchronization happening at explicit save points. This reduces server calls and provides immediate UI feedback.

### 2. Optimistic UI Updates
All user actions immediately update the UI state before server confirmation. Rollback mechanisms exist for failed operations, but the UI assumes success first.

### 3. Explicit Save Pattern
Changes accumulate in client state and require explicit user action to persist. The system tracks "hasChanges" flags to enable/disable save buttons and prevent unnecessary server calls.

### 4. Hybrid Data Flow
The architecture combines multiple data flow patterns:
- Server Actions for data mutations (Next.js 14 pattern)
- API routes for file uploads and complex operations
- Direct Supabase client for real-time features
- Static service classes for business logic encapsulation

## State Management Architecture (Zustand)

### Store Structure
The application uses a single root store with multiple slices, avoiding prop drilling while maintaining clear separation of concerns.

### Slice Organization Patterns
Each feature domain has its own slice:
- **auth-slice**: Authentication state and user session
- **instructor-slice**: Instructor-specific data and courses list
- **course-creation-slice**: Course creation and editing workflow state
- **student-course-slice**: Student view of courses
- **video-slices**: Separate slices for instructor and student video states

### State Update Patterns
The codebase follows these patterns for state updates:
- Immutable updates using spread operators
- Functional updates when depending on previous state
- Direct property assignment for simple updates
- Map/Set operations for complex collections

### Persistence Strategy
- Authentication state: No localStorage persistence (server-only)
- Course drafts: Temporary client state with manual save triggers
- Video upload queue: Maintained in memory during session
- User preferences: Stored in profile, fetched on mount

## Course CRUD Operations

### Create Flow
1. **Initialization**: Empty state in Zustand, no database record
2. **Draft Creation**: First save creates database record with draft status
3. **Progressive Enhancement**: Videos and chapters added incrementally
4. **Publication**: Status change from draft to published

### Read Flow
1. **List View**: Server Action fetches all instructor courses
2. **Detail View**: Load course with related videos into courseCreation state
3. **Transformation**: Server data mapped to UI-friendly format
4. **Caching**: No explicit caching, fresh fetch on navigation

### Update Flow
1. **Optimistic Local Updates**: Immediate UI changes
2. **Change Tracking**: hasChanges flag controls save button
3. **Batch Updates**: Multiple changes sent in single save operation
4. **Partial Updates**: Only modified fields sent to server

### Delete Flow
1. **Soft Delete Option**: Mark as deleted vs immediate removal
2. **Cascade Handling**: Videos deleted from storage and database
3. **Confirmation Pattern**: Modal confirmation before destructive actions
4. **Resource Cleanup**: Backblaze files removed after database deletion

## Data Flow Patterns

### Frontend to Backend Flow
1. **User Action** → Component Event Handler
2. **Component** → Zustand Action Call
3. **Zustand** → State Update + Server Action/API Call
4. **Server Action** → Database Operation
5. **Response** → Zustand State Update
6. **State Change** → React Re-render

### File Upload Architecture
Special handling for video uploads:
1. **Client Selection** → File validation
2. **FormData Creation** → API Route POST
3. **Server Upload** → Backblaze B2 storage
4. **URL Generation** → Database record creation
5. **Progress Tracking** → Simulated client-side updates
6. **Queue Management** → Multiple concurrent uploads

## Component Architecture

### Reusable Component Strategy
Shared components between create and edit flows:
- VideoUploader: Drag-drop interface with progress
- ChapterManager: CRUD operations for chapters
- VideoList: Display with preview and actions
- VideoPreviewModal: Fullscreen video playback

### Component Composition Pattern
- Container components handle state and business logic
- Presentational components receive props and callbacks
- Hooks encapsulate reusable logic
- Compound components for complex UI structures

### Form Handling Patterns
- Controlled components with Zustand state
- Immediate state updates on change
- Validation on blur or submit
- Error states managed in component state

## Server Architecture

### Server Actions (Next.js 14)
Primary pattern for data mutations:
- Automatic request deduplication
- Built-in error boundaries
- Progressive enhancement support
- Cookie-based authentication

### API Routes
Used for specific scenarios:
- File upload handling
- Webhook processing
- Third-party service integration
- Complex multi-step operations

### Database Access Patterns
- Service classes encapsulate Supabase queries
- Row Level Security for authorization
- Service role client for admin operations
- Prepared statements through Supabase client

## Authentication & Authorization

### Authentication Flow
1. Server-side cookie validation
2. HTTP-only cookies for security
3. Server Action auth checks
4. RLS policies as backup authorization

### Authorization Patterns
- Ownership verification before operations
- instructor_id foreign key relationships
- Course access through enrollment records
- Service role for system operations

## Error Handling Strategy

### Client-Side Errors
- Try-catch blocks in async operations
- Error state in components
- Toast notifications for user feedback
- Console logging for debugging

### Server-Side Errors
- Structured error returns from Server Actions
- Database constraint validation
- Rollback on partial failures
- Error logging with context

## Performance Optimization Patterns

### Loading States
- Skeleton loaders for initial fetch
- Spinner overlays for mutations
- Progressive content loading
- Optimistic updates reduce perceived latency

### Data Fetching Strategy
- Parallel fetches where possible
- Lazy loading for heavy content
- No prefetching (explicit user navigation)
- Minimal data in list views

## File Organization Structure

### Route Organization
- App router with nested layouts
- Parallel routes for role-based views
- Route groups for organization
- Dynamic segments for resource IDs

### Component Organization
- Feature-based component folders
- Shared UI components library
- Domain-specific components
- Layout components separate

### Service Layer Organization
- Services folder for business logic
- Supabase subfolder for database services
- Video services for external integrations
- Mock services for development

## State Synchronization Challenges

### Current Implementation Issues
1. **Order Persistence**: Video reordering uses both array position and order field, leading to synchronization issues
2. **Unique Constraints**: Database constraints on (course_id, chapter_id, order) require careful update sequencing
3. **State Divergence**: Main videos array and chapter videos arrays can become inconsistent
4. **Save Timing**: Auto-save disabled to prevent unwanted drafts, requiring manual saves

### Mitigation Strategies
- Explicit save actions with user confirmation
- Temporary order values during reordering
- State reconciliation on load
- Validation before persistence

## Development Patterns

### Feature Flags
Environment variables control feature availability:
- NEXT_PUBLIC_USE_REAL_COURSE_CREATION
- NEXT_PUBLIC_USE_REAL_COURSE_UPDATES
- Service-specific feature flags

### Development vs Production
- Mock services in development
- Different auth strategies
- Simplified error handling in dev
- Extended logging in development

## Testing Approach

### Current Testing Strategy
- Manual testing predominant
- Console.log debugging
- Browser DevTools for state inspection
- Supabase dashboard for data verification

### Missing Testing Patterns
- No unit tests observed
- No integration tests
- No E2E test setup
- No snapshot testing

## Technical Debt & Limitations

### Identified Issues
1. **State Management Complexity**: Multiple sources of truth for same data
2. **Type Safety Gaps**: Any types and type assertions prevalent
3. **Error Recovery**: Limited rollback mechanisms
4. **Code Duplication**: Similar patterns repeated across slices
5. **Migration Debt**: Disabled slices and commented code
6. **Naming Inconsistencies**: Mix of camelCase and snake_case

### Architectural Constraints
- Single store limiting modularity
- Tight coupling between UI and state shape
- Limited abstraction over Supabase
- No middleware for cross-cutting concerns

## Anti-Patterns & Required Changes

### 🔴 CRITICAL: Multiple Sources of Truth (ROOT CAUSE of Video Reordering Bug)
**Current Problem:** Videos exist in both main array and chapter arrays, order tracked in both array position and order field
**Required Fix:** Normalize state to single source of truth using order field only

### 🔴 CRITICAL: State Structure Issues
**Current Problem:** Single monolithic store, state coupled to UI structure
**Required Fix:** Split into multiple stores (auth, course, video), normalize data structure

### 🔴 CRITICAL: Type Safety
**Current Problem:** Prevalent 'any' types, type assertions everywhere
**Required Fix:** Enable TypeScript strict mode, eliminate all 'any' types

### ⚠️ Missing Zustand Best Practices
- **Not using Immer middleware** (would prevent mutation bugs)
- **Not using persist middleware** (needed for draft persistence)
- **No state normalization** (causing synchronization issues)
- **No selector optimization** (performance issues)

### ⚠️ Development Issues
- **No tests** (makes refactoring dangerous)
- **Console.log debugging** (should use DevTools)
- **Business logic in slices** (violates separation of concerns)

## Summary

⚠️ **THIS ARCHITECTURE HAS SIGNIFICANT ISSUES**

The current architecture works for MVP but contains critical anti-patterns that are actively causing bugs (especially video reordering). The system prioritizes developer velocity over architectural correctness, which has led to:

1. **Data synchronization bugs** from multiple sources of truth
2. **Type safety issues** making refactoring dangerous  
3. **State management anti-patterns** violating Zustand best practices
4. **No testing** making changes risky

**These patterns should NOT be followed for new features.** The codebase needs significant refactoring before adding complexity.