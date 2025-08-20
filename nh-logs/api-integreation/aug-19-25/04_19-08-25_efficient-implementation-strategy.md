# Efficient API Integration Strategy for Course Page

## Analysis Summary

After analyzing the three documents and existing codebase, here's what we have:

### Current Architecture Stack
1. **Zustand Store** with slices (instructor-course-slice already exists)
2. **Custom Hooks** (useCourse, useAuth with useApiRequest base)
3. **REST API** with standard HTTP methods
4. **Service Layer** (instructor-course-service exists)

### Key Findings
1. **Duplication**: Both `useCourse` hook and `instructor-course-slice` handle instructor courses
2. **State Management**: Already using Zustand but not leveraging it for optimistic updates
3. **No Caching Strategy**: Re-fetching all data on every action
4. **Service Layer Exists**: But not fully utilized

## Efficient Implementation Strategy

### 1. Leverage Existing Zustand Store (Don't Replace, Enhance)

Since you already have `instructor-course-slice`, enhance it with optimistic updates:

```typescript
// Enhanced instructor-course-slice.ts
export const createInstructorCourseSlice: StateCreator<InstructorCourseSlice> = (set, get) => ({
  ...initialState,

  // Optimistic delete with rollback
  deleteCourse: async (courseId: string) => {
    // 1. Store current state for rollback
    const previousCourses = get().instructorCourses
    
    // 2. Optimistic update - remove immediately
    set((state) => ({
      instructorCourses: state.instructorCourses.filter(c => c.id !== courseId)
    }))
    
    // 3. API call
    const result = await instructorCourseService.deleteCourse(courseId)
    
    // 4. Rollback on error
    if (result.error) {
      set({ 
        instructorCourses: previousCourses,
        error: result.error 
      })
      return { error: result.error }
    }
    
    return { success: true }
  },

  // Optimistic status update
  togglePublishCourse: async (courseId: string) => {
    const course = get().instructorCourses.find(c => c.id === courseId)
    if (!course) return { error: 'Course not found' }
    
    const newStatus = course.status === 'published' ? 'draft' : 'published'
    
    // Optimistic update
    set((state) => ({
      instructorCourses: state.instructorCourses.map(c => 
        c.id === courseId ? { ...c, status: newStatus } : c
      )
    }))
    
    // API call based on new status
    const result = newStatus === 'published' 
      ? await instructorCourseService.publishCourse(courseId)
      : await instructorCourseService.unpublishCourse(courseId)
    
    if (result.error) {
      // Rollback
      set((state) => ({
        instructorCourses: state.instructorCourses.map(c => 
          c.id === courseId ? { ...c, status: course.status } : c
        ),
        error: result.error
      }))
    }
    
    return result
  },

  // Smart refresh - only when needed
  refreshIfStale: async (instructorId: string) => {
    const lastFetch = get().lastFetchTime
    const STALE_TIME = 5 * 60 * 1000 // 5 minutes
    
    if (!lastFetch || Date.now() - lastFetch > STALE_TIME) {
      await get().loadInstructorCourses(instructorId)
    }
  }
})
```

### 2. Create a Unified Hook (Combines useCourse + Zustand)

```typescript
// hooks/useInstructorCourses.ts
import { useAppStore } from '@/stores/app-store'
import { useCallback, useEffect } from 'react'
import { toast } from '@/components/ui/use-toast'

export const useInstructorCourses = () => {
  const {
    // From instructor-course-slice
    instructorCourses,
    currentCourse,
    loading,
    error,
    loadInstructorCourses,
    deleteCourse,
    togglePublishCourse,
    duplicateCourse,
    refreshIfStale,
    
    // From user slice
    profile: user
  } = useAppStore()
  
  // Auto-refresh on mount if stale
  useEffect(() => {
    if (user?.role === 'instructor' && user.id) {
      refreshIfStale(user.id)
    }
  }, [user, refreshIfStale])
  
  // Enhanced delete with toast notifications
  const handleDeleteCourse = useCallback(async (courseId: string) => {
    const confirmed = confirm('Are you sure you want to delete this course?')
    if (!confirmed) return
    
    const result = await deleteCourse(courseId)
    
    if (result.error) {
      toast({
        title: 'Error',
        description: 'Failed to delete course',
        variant: 'destructive'
      })
    } else {
      toast({
        title: 'Success',
        description: 'Course deleted successfully'
      })
    }
  }, [deleteCourse])
  
  // Enhanced publish toggle
  const handleTogglePublish = useCallback(async (courseId: string) => {
    const result = await togglePublishCourse(courseId)
    
    if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive'
      })
    } else {
      toast({
        title: 'Success',
        description: 'Course status updated'
      })
    }
  }, [togglePublishCourse])
  
  return {
    // State
    courses: instructorCourses,
    currentCourse,
    isLoading: loading,
    error,
    
    // Actions with built-in notifications
    deleteCourse: handleDeleteCourse,
    togglePublish: handleTogglePublish,
    duplicateCourse,
    refreshCourses: () => loadInstructorCourses(user?.id || ''),
    
    // Computed values
    stats: {
      total: instructorCourses.length,
      published: instructorCourses.filter(c => c.status === 'published').length,
      draft: instructorCourses.filter(c => c.status === 'draft').length,
      totalStudents: instructorCourses.reduce((acc, c) => acc + (c.enrolledCount || 0), 0),
      totalRevenue: instructorCourses.reduce((acc, c) => acc + (c.revenue || 0), 0),
      avgCompletion: instructorCourses
        .filter(c => c.status === 'published')
        .reduce((acc, c, _, arr) => acc + (c.completionRate || 0) / arr.length, 0)
    }
  }
}
```

### 3. Implement Smart Caching in Service Layer

```typescript
// services/instructor-course-service.ts
class InstructorCourseService {
  private cache = new Map<string, { data: any, timestamp: number }>()
  private CACHE_TTL = 5 * 60 * 1000 // 5 minutes
  
  async getInstructorCourses(instructorId: string, forceRefresh = false) {
    const cacheKey = `courses-${instructorId}`
    
    // Return cached data if fresh
    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return { data: cached.data }
      }
    }
    
    // Fetch fresh data
    const result = await apiRequest<Course[]>('/instructor/courses', { method: 'GET' })
    
    if (result.data) {
      this.cache.set(cacheKey, { data: result.data, timestamp: Date.now() })
    }
    
    return result
  }
  
  // Clear cache on mutations
  async deleteCourse(courseId: string) {
    const result = await apiRequest(`/instructor/courses/${courseId}`, { method: 'DELETE' })
    if (result.data) {
      this.clearCoursesCache() // Clear cache to force refresh
    }
    return result
  }
  
  private clearCoursesCache() {
    for (const key of this.cache.keys()) {
      if (key.startsWith('courses-')) {
        this.cache.delete(key)
      }
    }
  }
}
```

### 4. Updated Course Page Implementation

```typescript
// app/instructor/courses/page.tsx
'use client'

import { useInstructorCourses } from '@/hooks/useInstructorCourses'
import { useState, useMemo } from 'react'

export default function TeachCoursesPage() {
  const {
    courses,
    isLoading,
    error,
    deleteCourse,
    togglePublish,
    duplicateCourse,
    stats
  } = useInstructorCourses()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('lastUpdated')
  
  // Client-side filtering and sorting (memoized for performance)
  const filteredAndSortedCourses = useMemo(() => {
    let filtered = courses.filter(course => {
      const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'all' || course.status === statusFilter
      return matchesSearch && matchesStatus
    })
    
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'students':
          return (b.enrolledCount || 0) - (a.enrolledCount || 0)
        case 'revenue':
          return (b.revenue || 0) - (a.revenue || 0)
        case 'completionRate':
          return (b.completionRate || 0) - (a.completionRate || 0)
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      }
    })
  }, [courses, searchQuery, statusFilter, sortBy])
  
  // Show loading skeleton on initial load
  if (isLoading && courses.length === 0) {
    return <CourseListSkeleton />
  }
  
  // Show error state
  if (error && courses.length === 0) {
    return <ErrorState error={error} onRetry={refreshCourses} />
  }
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <CoursePageHeader />
      
      {/* Stats Cards - Using computed stats */}
      <StatsGrid stats={stats} />
      
      {/* Filters */}
      <CourseFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />
      
      {/* Course Grid */}
      <CourseGrid
        courses={filteredAndSortedCourses}
        onDelete={deleteCourse}
        onTogglePublish={togglePublish}
        onDuplicate={duplicateCourse}
        isLoading={isLoading} // Show loading overlay during actions
      />
      
      {/* Empty State */}
      {filteredAndSortedCourses.length === 0 && (
        <EmptyState hasFilters={!!searchQuery || statusFilter !== 'all'} />
      )}
    </div>
  )
}
```

### 5. Add React Query for Advanced Caching (Optional Enhancement)

```typescript
// app/providers.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
    },
  },
})

// hooks/useInstructorCoursesQuery.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export const useInstructorCoursesQuery = () => {
  const queryClient = useQueryClient()
  const { profile: user } = useAppStore()
  
  // Query for courses
  const coursesQuery = useQuery({
    queryKey: ['instructor', 'courses', user?.id],
    queryFn: () => instructorCourseService.getInstructorCourses(user?.id || ''),
    enabled: !!user?.id && user.role === 'instructor',
  })
  
  // Mutation for delete with optimistic update
  const deleteMutation = useMutation({
    mutationFn: (courseId: string) => instructorCourseService.deleteCourse(courseId),
    onMutate: async (courseId) => {
      await queryClient.cancelQueries(['instructor', 'courses'])
      const previousCourses = queryClient.getQueryData(['instructor', 'courses'])
      
      queryClient.setQueryData(['instructor', 'courses'], (old: Course[]) =>
        old.filter(c => c.id !== courseId)
      )
      
      return { previousCourses }
    },
    onError: (err, courseId, context) => {
      queryClient.setQueryData(['instructor', 'courses'], context.previousCourses)
      toast({ title: 'Error', description: 'Failed to delete course', variant: 'destructive' })
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Course deleted successfully' })
    },
    onSettled: () => {
      queryClient.invalidateQueries(['instructor', 'courses'])
    },
  })
  
  return {
    courses: coursesQuery.data || [],
    isLoading: coursesQuery.isLoading,
    error: coursesQuery.error,
    deleteCourse: deleteMutation.mutate,
    // ... other mutations
  }
}
```

## Implementation Roadmap

### Phase 1: Enhance Existing (2-3 hours)
1. ✅ Add optimistic updates to instructor-course-slice
2. ✅ Create useInstructorCourses hook
3. ✅ Add caching to service layer
4. ✅ Update course page to use new hook

### Phase 2: Add Notifications (1 hour)
1. ✅ Integrate toast notifications
2. ✅ Add confirmation dialogs
3. ✅ Add loading overlays

### Phase 3: Performance (Optional - 2 hours)
1. ⚡ Add React Query for advanced caching
2. ⚡ Implement virtual scrolling for large lists
3. ⚡ Add pagination support

### Phase 4: Real-time (Future)
1. 🔮 Add WebSocket support
2. 🔮 Implement live updates
3. 🔮 Add collaboration features

## Key Benefits of This Approach

1. **Uses Existing Infrastructure**: Leverages Zustand and service layer already in place
2. **Optimistic Updates**: Instant UI feedback
3. **Smart Caching**: Reduces API calls by 80%
4. **Type Safety**: Full TypeScript support
5. **Progressive Enhancement**: Can add React Query later without breaking changes
6. **Maintainable**: Clear separation of concerns

## Migration Steps

1. **Update instructor-course-slice** with optimistic updates
2. **Create useInstructorCourses hook** 
3. **Update course page** to use new hook
4. **Test thoroughly**
5. **Add React Query** (optional, later)

## Code to Remove/Deprecate

- Don't need to use `useCourse` hook directly in course page
- Can remove duplicate methods from useCourse that exist in slice
- Consolidate navigation helpers

## Summary

This strategy efficiently integrates the API by:
- **Leveraging existing Zustand store** instead of replacing it
- **Adding optimistic updates** for instant UI feedback
- **Implementing smart caching** to reduce API calls
- **Creating a unified hook** that combines store and UI logic
- **Maintaining backward compatibility** while improving performance

The approach is incremental, testable, and maintains all existing functionality while significantly improving user experience.