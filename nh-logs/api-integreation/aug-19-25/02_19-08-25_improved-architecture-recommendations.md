# Improved Architecture Recommendations for Course Page API Integration

## Current Architecture Issues

### 1. **Over-fetching Problem**
The current plan fetches ALL instructor courses on every action (delete, publish, etc.), which is inefficient:
```typescript
// Problem: Re-fetching entire list after each action
await getInstructorCourses() // Fetches ALL courses again
```

### 2. **No Optimistic Updates**
The plan mentions optimistic updates but doesn't implement them properly. Users have to wait for server response before seeing UI changes.

### 3. **Inefficient State Management**
Using `useCourse` hook directly in the page component creates tight coupling and makes testing difficult.

### 4. **Missing Data Layer Abstraction**
No separation between UI logic and data fetching logic.

## Recommended Architecture Improvements

### 1. **Implement Optimistic Updates with Zustand**

```typescript
// Better approach: Update local state immediately, sync with server in background
const handleArchiveCourse = async (courseId: string) => {
  // 1. Optimistic update - immediately update UI
  const optimisticUpdate = () => {
    const updatedCourses = instructorCourses.filter(c => c.id !== courseId)
    setInstructorCourses(updatedCourses) // Update local state immediately
  }
  
  optimisticUpdate()
  
  // 2. Server update in background
  const result = await deleteCourse(courseId)
  
  // 3. Rollback on error
  if (result.error) {
    await getInstructorCourses() // Only refetch on error
    showErrorToast('Failed to archive course')
  }
}
```

### 2. **Use React Query (TanStack Query) for Better Caching**

```typescript
// Install: npm install @tanstack/react-query

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Better data fetching with automatic caching
const useInstructorCoursesQuery = () => {
  return useQuery({
    queryKey: ['instructor', 'courses'],
    queryFn: getInstructorCourses,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  })
}

// Mutation with optimistic updates
const useDeleteCourseMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: deleteCourse,
    onMutate: async (courseId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries(['instructor', 'courses'])
      
      // Snapshot previous value
      const previousCourses = queryClient.getQueryData(['instructor', 'courses'])
      
      // Optimistically update
      queryClient.setQueryData(['instructor', 'courses'], (old: Course[]) => 
        old.filter(c => c.id !== courseId)
      )
      
      return { previousCourses }
    },
    onError: (err, courseId, context) => {
      // Rollback on error
      queryClient.setQueryData(['instructor', 'courses'], context.previousCourses)
    },
    onSettled: () => {
      // Refetch after error or success
      queryClient.invalidateQueries(['instructor', 'courses'])
    }
  })
}
```

### 3. **Implement Proper Data Layer Architecture**

```typescript
// /src/services/course.service.ts
export class CourseService {
  private static instance: CourseService
  private cache = new Map<string, { data: any, timestamp: number }>()
  private CACHE_TTL = 5 * 60 * 1000 // 5 minutes
  
  static getInstance() {
    if (!this.instance) {
      this.instance = new CourseService()
    }
    return this.instance
  }
  
  async getInstructorCourses(forceRefresh = false): Promise<Course[]> {
    const cacheKey = 'instructor-courses'
    
    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data
      }
    }
    
    const result = await apiRequest<Course[]>('/instructor/courses', { method: 'GET' })
    
    if (result.data) {
      this.cache.set(cacheKey, { data: result.data, timestamp: Date.now() })
      return result.data
    }
    
    throw new Error(result.error || 'Failed to fetch courses')
  }
  
  // Partial update instead of full refetch
  async updateCourseStatus(courseId: string, status: string): Promise<Course> {
    const result = await apiRequest<Course>(`/instructor/courses/${courseId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    })
    
    if (result.data) {
      // Update cache with single course change
      this.updateCourseInCache(result.data)
      return result.data
    }
    
    throw new Error(result.error || 'Failed to update course')
  }
  
  private updateCourseInCache(updatedCourse: Course) {
    const cacheKey = 'instructor-courses'
    const cached = this.cache.get(cacheKey)
    
    if (cached) {
      const courses = cached.data as Course[]
      const index = courses.findIndex(c => c.id === updatedCourse.id)
      if (index !== -1) {
        courses[index] = updatedCourse
        this.cache.set(cacheKey, { data: courses, timestamp: cached.timestamp })
      }
    }
  }
}
```

### 4. **Use Server-Side Rendering (SSR) for Initial Load**

```typescript
// /src/app/instructor/courses/page.tsx
import { CourseService } from '@/services/course.service'

// Server Component for initial data
export default async function TeachCoursesPage() {
  // Fetch on server for better SEO and initial load performance
  const courseService = CourseService.getInstance()
  const initialCourses = await courseService.getInstructorCourses()
  
  return <CoursesClientComponent initialCourses={initialCourses} />
}

// Client Component for interactivity
'use client'
function CoursesClientComponent({ initialCourses }: { initialCourses: Course[] }) {
  // Use initial data from server
  const [courses, setCourses] = useState(initialCourses)
  // ... rest of the component
}
```

### 5. **Implement Proper Error Boundaries**

```typescript
// /src/components/ErrorBoundary.tsx
export class CourseErrorBoundary extends Component {
  state = { hasError: false, error: null }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to error reporting service
    console.error('Course page error:', error, errorInfo)
  }
  
  render() {
    if (this.state.hasError) {
      return <CourseErrorFallback error={this.state.error} />
    }
    return this.props.children
  }
}
```

### 6. **Implement Virtual Scrolling for Large Lists**

```typescript
// For better performance with many courses
import { useVirtualizer } from '@tanstack/react-virtual'

function CourseGrid({ courses }: { courses: Course[] }) {
  const parentRef = useRef<HTMLDivElement>(null)
  
  const virtualizer = useVirtualizer({
    count: courses.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 400, // Estimated card height
    overscan: 5, // Render 5 items outside viewport
  })
  
  return (
    <div ref={parentRef} className="h-screen overflow-auto">
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(virtualItem => (
          <CourseCard
            key={courses[virtualItem.index].id}
            course={courses[virtualItem.index]}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
```

### 7. **Implement Proper WebSocket for Real-time Updates**

```typescript
// /src/hooks/useCoursesRealtime.ts
export function useCoursesRealtime(userId: string) {
  const queryClient = useQueryClient()
  
  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/instructor/${userId}/courses`)
    
    ws.onmessage = (event) => {
      const update = JSON.parse(event.data)
      
      switch (update.type) {
        case 'COURSE_UPDATED':
          queryClient.setQueryData(['instructor', 'courses'], (old: Course[]) => {
            return old.map(c => c.id === update.courseId ? update.course : c)
          })
          break
          
        case 'COURSE_DELETED':
          queryClient.setQueryData(['instructor', 'courses'], (old: Course[]) => {
            return old.filter(c => c.id !== update.courseId)
          })
          break
          
        case 'NEW_ENROLLMENT':
          // Update specific course stats
          queryClient.setQueryData(['instructor', 'courses'], (old: Course[]) => {
            return old.map(c => {
              if (c.id === update.courseId) {
                return { ...c, enrolledCount: c.enrolledCount + 1 }
              }
              return c
            })
          })
          break
      }
    }
    
    return () => ws.close()
  }, [userId, queryClient])
}
```

## Recommended Tech Stack

### Essential (Should Implement Now)
1. **TanStack Query** - Better caching and state management
2. **Zustand** - Already in use, leverage for optimistic updates
3. **React Error Boundary** - Better error handling
4. **Service Layer Pattern** - Separate data logic from UI

### Nice to Have (Future Improvements)
1. **TanStack Virtual** - For large course lists
2. **WebSockets** - Real-time updates
3. **React Suspense** - Better loading states
4. **SWR** - Alternative to React Query

## Implementation Priority

### Phase 1: Core Improvements (Immediate)
1. Add service layer for data management
2. Implement optimistic updates with Zustand
3. Add proper error boundaries
4. Improve caching strategy

### Phase 2: Performance (Next Sprint)
1. Add React Query for advanced caching
2. Implement virtual scrolling for large lists
3. Add pagination or infinite scroll

### Phase 3: Real-time (Future)
1. Add WebSocket support
2. Implement collaborative features
3. Add real-time notifications

## Key Architecture Principles

1. **Separation of Concerns**: Keep data fetching logic separate from UI components
2. **Optimistic UI**: Update UI immediately, sync with server in background
3. **Progressive Enhancement**: Start with SSR, enhance with client-side features
4. **Cache First**: Use cached data when possible, refresh in background
5. **Error Recovery**: Graceful degradation with proper error boundaries
6. **Performance**: Virtual scrolling, lazy loading, and efficient re-renders

## Migration Path from Current Plan

1. **Keep existing useCourse hook** but wrap it in a service layer
2. **Add React Query incrementally** - start with read operations
3. **Implement optimistic updates** one action at a time
4. **Add error boundaries** around course grid
5. **Improve caching** without breaking existing functionality

## Summary

The current plan is functional but lacks modern best practices for production applications. The recommended improvements focus on:

- **Better Performance**: Through caching, optimistic updates, and virtual scrolling
- **Improved UX**: Instant feedback, no loading spinners for common actions
- **Better Architecture**: Separation of concerns, testability, maintainability
- **Scalability**: Can handle thousands of courses efficiently
- **Real-time Capabilities**: Foundation for collaborative features

These improvements can be implemented incrementally without breaking existing functionality.