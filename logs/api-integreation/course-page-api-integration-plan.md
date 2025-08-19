# Course Page API Integration Plan

## Overview
This document outlines the comprehensive plan for integrating the useCourse API hook with the instructor courses page located at `/src/app/instructor/courses/page.tsx`.

## Current State Analysis

### 1. Course Page Components
The course page currently uses:
- **Data Source**: `useAppStore()` with mock data from `courses` array
- **Components**: 
  - Stats Overview Cards (Total Courses, Students, Revenue, Completion Rate)
  - Search and Filter Controls
  - Course Grid Cards with action menus
  - Empty State

### 2. Current Data Flow
```typescript
// Current implementation
const { courses, loadCourses } = useAppStore()

// Uses mock data loaded on mount
useEffect(() => {
  loadCourses()
}, [loadCourses])
```

### 3. useCourse Hook API Methods
The `useCourse` hook provides comprehensive instructor methods:

#### Core Methods for Course Page
- `getInstructorCourses()` - Fetches all instructor courses
- `deleteCourse(courseId)` - Deletes a course
- `publishCourse(courseId)` - Publishes a draft course
- `unpublishCourse(courseId)` - Unpublishes a course
- `duplicateCourse(courseId)` - Duplicates a course

#### Navigation Helpers
- `navigateToCourseEdit(courseId)` - Navigate to edit page
- `navigateToCourseAnalytics(courseId)` - Navigate to analytics page

## Integration Points

### 1. State Management Changes

#### Replace Current Implementation:
```typescript
// OLD
const { courses, loadCourses } = useAppStore()

// NEW
const { 
  instructorCourses,
  isLoading,
  error,
  getInstructorCourses,
  deleteCourse,
  publishCourse,
  unpublishCourse,
  duplicateCourse,
  navigateToCourseEdit,
  navigateToCourseAnalytics
} = useCourse()
```

### 2. Data Loading Pattern

#### Replace useEffect:
```typescript
// OLD
useEffect(() => {
  loadCourses()
}, [loadCourses])

// NEW
useEffect(() => {
  const loadData = async () => {
    const result = await getInstructorCourses()
    if (result.error) {
      // Handle error with toast or alert
      console.error('Failed to load courses:', result.error)
    }
  }
  loadData()
}, [getInstructorCourses])
```

### 3. Course Actions Integration

#### Archive/Delete Course:
```typescript
const handleArchiveCourse = async (courseId: string) => {
  const confirmed = window.confirm('Are you sure you want to archive this course?')
  if (!confirmed) return
  
  const result = await deleteCourse(courseId)
  if (result.error) {
    // Show error toast
    console.error('Failed to archive course:', result.error)
  } else {
    // Show success toast
    await getInstructorCourses() // Refresh list
  }
}
```

#### Publish/Unpublish Course:
```typescript
const handleTogglePublish = async (courseId: string, currentStatus: string) => {
  const isPublished = currentStatus === 'published'
  const result = isPublished 
    ? await unpublishCourse(courseId)
    : await publishCourse(courseId)
    
  if (result.error) {
    // Show error toast
    console.error('Failed to update course status:', result.error)
  } else {
    // Show success toast
    await getInstructorCourses() // Refresh list
  }
}
```

#### Duplicate Course:
```typescript
const handleDuplicateCourse = async (courseId: string) => {
  const result = await duplicateCourse(courseId)
  if (result.error) {
    // Show error toast
    console.error('Failed to duplicate course:', result.error)
  } else {
    // Show success toast
    await getInstructorCourses() // Refresh list
  }
}
```

### 4. Stats Calculation Updates

#### Update Stats to Use Real Data:
```typescript
// Total Courses
<div className="text-2xl font-bold">{instructorCourses.length}</div>

// Total Students
<div className="text-2xl font-bold">
  {instructorCourses.reduce((acc, c) => acc + (c.enrolledCount || 0), 0).toLocaleString()}
</div>

// Total Revenue  
<div className="text-2xl font-bold">
  ${instructorCourses.reduce((acc, c) => acc + (c.revenue || 0), 0).toLocaleString()}
</div>

// Average Completion
<div className="text-2xl font-bold">
  {Math.round(
    instructorCourses
      .filter(c => c.status === 'published')
      .reduce((acc, c, _, arr) => acc + (c.completionRate || 0) / arr.length, 0)
  )}%
</div>
```

### 5. Loading and Error States

#### Add Loading State:
```typescript
if (isLoading && instructorCourses.length === 0) {
  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    </div>
  )
}
```

#### Add Error State:
```typescript
if (error && instructorCourses.length === 0) {
  return (
    <div className="container mx-auto p-6">
      <Card className="p-12">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <h3 className="mt-4 text-lg font-semibold">Failed to Load Courses</h3>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Button 
            className="mt-4" 
            onClick={() => getInstructorCourses()}
          >
            Try Again
          </Button>
        </div>
      </Card>
    </div>
  )
}
```

### 6. Navigation Updates

#### Update Navigation Methods:
```typescript
// OLD
<DropdownMenuItem onClick={() => router.push(`/instructor/course/${course.id}/edit`)}>

// NEW  
<DropdownMenuItem onClick={() => navigateToCourseEdit(course.id)}>

// OLD
<DropdownMenuItem onClick={() => router.push(`/instructor/course/${course.id}/analytics`)}>

// NEW
<DropdownMenuItem onClick={() => navigateToCourseAnalytics(course.id)}>
```

### 7. Filtering and Sorting Updates

Keep the existing client-side filtering and sorting logic but update to use `instructorCourses`:

```typescript
const filteredCourses = instructorCourses.filter(course => {
  const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase())
  const matchesStatus = statusFilter === "all" || course.status === statusFilter
  return matchesSearch && matchesStatus
})
```

## Implementation Steps

### Step 1: Import useCourse Hook
```typescript
import { useCourse } from "@/hooks/useCourse"
```

### Step 2: Replace State Management
- Remove `useAppStore` course-related imports
- Add `useCourse` hook destructuring

### Step 3: Update Data Loading
- Replace `loadCourses` with `getInstructorCourses`
- Add error handling

### Step 4: Integrate Course Actions
- Add handlers for archive, publish, duplicate
- Add confirmation dialogs where needed
- Add success/error toasts

### Step 5: Update UI Components
- Update stats calculations
- Update course cards data binding
- Update navigation methods

### Step 6: Add Loading/Error States
- Add loading spinner
- Add error display with retry

### Step 7: Test All Functionality
- Test course loading
- Test filtering and sorting
- Test all course actions
- Test navigation
- Test error scenarios

## Type Safety Considerations

### Course Type Mapping
Ensure the Course type from the API matches the expected structure:

```typescript
interface Course {
  id: string
  title: string
  description?: string
  thumbnailUrl?: string
  status: 'draft' | 'published' | 'under_review'
  totalVideos: number
  totalDuration: string
  enrolledCount: number // was 'students'
  completionRate: number
  revenue: number
  lastUpdated: string
  pendingConfusions?: number
  instructor?: {
    id: string
    name: string
    email: string
    avatar?: string
  }
}
```

## Error Handling Strategy

### 1. Network Errors
- Display toast notification
- Show retry button
- Log to error tracking service

### 2. Authorization Errors
- Redirect to login if 401
- Show permission denied message if 403

### 3. Validation Errors
- Display field-specific errors
- Highlight problematic fields

### 4. Server Errors
- Show generic error message
- Provide support contact info
- Log full error details

## Performance Optimizations

### 1. Data Caching
- Cache course list for 5 minutes
- Invalidate cache on CRUD operations

### 2. Pagination (Future)
- Load courses in batches of 20
- Implement infinite scroll or pagination

### 3. Optimistic Updates
- Update UI immediately on actions
- Rollback on error

## Testing Checklist

- [ ] Course list loads correctly
- [ ] Stats calculate accurately
- [ ] Search filter works
- [ ] Status filter works
- [ ] Sort options work
- [ ] Create new course navigation works
- [ ] Edit course navigation works
- [ ] View analytics navigation works
- [ ] Preview as student navigation works
- [ ] Archive course with confirmation
- [ ] Publish/unpublish course
- [ ] Duplicate course
- [ ] Error states display correctly
- [ ] Loading states display correctly
- [ ] Empty state displays when no courses
- [ ] Responsive design works on mobile

## Notes

1. **Authentication**: The useCourse hook handles authentication internally
2. **Real-time Updates**: Consider adding WebSocket support for real-time course updates
3. **Batch Operations**: Future enhancement to select and perform actions on multiple courses
4. **Export Data**: Add export functionality for course data (CSV/PDF)
5. **Advanced Filters**: Add date range, earnings range filters in future iterations

## Dependencies

- `@/hooks/useCourse` - Main API hook
- `@/components/ui/*` - UI components
- `lucide-react` - Icons
- `next/navigation` - Routing

## Migration Timeline

1. **Phase 1**: Basic integration (2-3 hours)
   - Replace state management
   - Connect basic CRUD operations
   
2. **Phase 2**: Enhanced features (1-2 hours)
   - Add loading/error states
   - Improve error handling
   
3. **Phase 3**: Polish (1 hour)
   - Add toasts/notifications
   - Performance optimizations
   
4. **Phase 4**: Testing (1-2 hours)
   - Manual testing
   - Fix any issues

Total estimated time: 5-8 hours

## Summary

This integration plan provides a comprehensive approach to connecting the instructor courses page with the backend API through the useCourse hook. The plan maintains all existing functionality while adding proper error handling, loading states, and real API integration. The implementation should be done incrementally, testing each feature as it's integrated.