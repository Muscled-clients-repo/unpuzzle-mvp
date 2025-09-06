# Legacy State Management Files

This folder contains deprecated state management files that were replaced during the migration to hybrid TanStack Query + Zustand architecture.

## Migrated Files

- `course-creation-slice.ts` - **DEPRECATED**: Replaced with TanStack Query mutations and server actions
- `normalized-course-slice.ts` - **DEPRECATED**: Experimental normalized state approach, replaced with TanStack Query
- `course-selectors.ts` - **DEPRECATED**: Complex selectors replaced with TanStack Query cached data

## Migration Details

**Date**: September 2025  
**Reason**: 60% code bloat and synchronization issues between dual state management systems

**Replaced With**:
- Server state: TanStack Query with server actions  
- UI state: Minimal Zustand store (`app-store-new.ts`)
- Types: Extracted to `/src/types/course.ts`

## What NOT to Delete

These files may still be referenced by other parts of the application that haven't been migrated yet. Before deleting:

1. Search codebase for imports from these files
2. Update imports to use new architecture
3. Test affected functionality
4. Only then delete safely

## Files Still Using Old Architecture

Many instructor and student pages still use the old `useAppStore` pattern. These should be migrated incrementally as needed.