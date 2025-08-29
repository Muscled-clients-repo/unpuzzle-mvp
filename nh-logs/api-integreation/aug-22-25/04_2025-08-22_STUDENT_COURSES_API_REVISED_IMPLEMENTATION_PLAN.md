# Student Courses API Integration - Revised Implementation Plan (Following Existing Architecture)

## Date: 2025-08-22
## Feature: Student Courses Management
## Priority: HIGH
## Architecture: Following Established Patterns

---

## 🏗️ Existing Architecture Pattern Analysis

Based on Course Sections and Media Assignment implementations:

1. **API Client Pattern**: 
   - Centralized in `src/lib/api-client.ts`
   - Uses `credentials: 'include'` for cookie-based auth
   - CORS mode explicitly set
   - No manual header management for auth

2. **Service Layer Pattern**:
   - Services handle mock/real data switching
   - Services call apiClient methods
   - Services return `ServiceResult<T>` type

3. **Store Pattern**:
   - Store actions call service methods
   - Optimistic updates with error rollback
   - Loading states tracked per operation
   - Error handling at store level

4. **UI Pattern**:
   - Components use store actions
   - Individual loading states for operations
   - Disable UI during API calls

---

## 🛠️ Revised Implementation Tasks (Following Architecture)

### Phase 1: API Client Enhancement

#### Task 1.1: Add Student Course Methods to API Client
**File**: `src/lib/api-client.ts`

```typescript
class ApiClient {
  // Existing methods...
  
  // Student Courses API Methods
  async getStudentCourses(): Promise<ApiResponse<Course[]>> {
    return this.get('/api/v1/student/courses');
  }
  
  async enrollInCourse(courseId: string, data?: { paymentMethod?: string; couponCode?: string }): Promise<ApiResponse<EnrollmentResponse>> {
    return this.post(`/api/v1/student/courses/${courseId}/enroll`, data);
  }
  
  async unenrollFromCourse(courseId: string): Promise<ApiResponse<void>> {
    return this.post(`/api/v1/student/courses/${courseId}/unenroll`);
  }
  
  async getStudentCourseProgress(courseId: string): Promise<ApiResponse<CourseProgress>> {
    return this.get(`/api/v1/student/courses/${courseId}/progress`);
  }
  
  async submitCourseReview(courseId: string, review: CourseReview): Promise<ApiResponse<void>> {
    return this.post(`/api/v1/student/courses/${courseId}/review`, review);
  }
}
```

**Note**: No manual cookie or CSRF handling needed - already handled by existing `credentials: 'include'`

### Phase 2: Service Layer Updates

#### Task 2.1: Update StudentCourseService
**File**: `src/services/student-course-service.ts`

```typescript
export class StudentCourseService {
  // Fix existing methods to use new API client methods
  async getEnrolledCourses(userId: string): Promise<ServiceResult<Course[]>> {
    if (useMockData) {
      // Keep existing mock logic
      return { data: transformedCourses }
    }
    
    // Use new API client method
    const response = await apiClient.getStudentCourses()
    return response.error
      ? { error: response.error }
      : { data: response.data }
  }
  
  async getCourseProgress(userId: string, courseId: string): Promise<ServiceResult<CourseProgress>> {
    if (useMockData) {
      // Keep existing mock logic
      return { data: mockProgress }
    }
    
    const response = await apiClient.getStudentCourseProgress(courseId)
    return response.error
      ? { error: response.error }
      : { data: response.data }
  }
  
  // Add new methods following pattern
  async unenrollFromCourse(courseId: string): Promise<ServiceResult<void>> {
    if (useMockData) {
      return { data: undefined }
    }
    
    const response = await apiClient.unenrollFromCourse(courseId)
    return response.error
      ? { error: response.error }
      : { data: undefined }
  }
  
  async submitCourseReview(courseId: string, review: CourseReview): Promise<ServiceResult<void>> {
    if (useMockData) {
      return { data: undefined }
    }
    
    const response = await apiClient.submitCourseReview(courseId, review)
    return response.error
      ? { error: response.error }
      : { data: undefined }
  }
}
```

### Phase 3: Store Integration

#### Task 3.1: Update Student Course Slice
**File**: `src/stores/slices/student-course-slice.ts`

Following the pattern from course-creation-slice:

```typescript
export interface StudentCourseState {
  enrolledCourses: Course[]
  recommendedCourses: Course[]
  currentCourse: Course | null
  courseProgress: Record<string, CourseProgress>
  loading: boolean
  error: string | null
  // Add operation-specific loading states
  enrollingCourseId: string | null
  unenrollingCourseId: string | null
  loadingProgressCourseId: string | null
  submittingReviewCourseId: string | null
}

export interface StudentCourseActions {
  // Existing actions...
  
  // New actions following pattern
  unenrollFromCourse: (courseId: string) => Promise<void>
  submitCourseReview: (courseId: string, review: CourseReview) => Promise<void>
  refreshCourseProgress: (courseId: string) => Promise<void>
}

// Implementation
export const createStudentCourseSlice = (set, get) => ({
  // ... existing state ...
  
  unenrollFromCourse: async (courseId: string) => {
    set({ unenrollingCourseId: courseId })
    
    const result = await studentCourseService.unenrollFromCourse(courseId)
    
    if (result.error) {
      set({ 
        unenrollingCourseId: null,
        error: result.error 
      })
      return
    }
    
    // Optimistically remove from enrolled courses
    const currentCourses = get().enrolledCourses
    set({ 
      enrolledCourses: currentCourses.filter(c => c.id !== courseId),
      unenrollingCourseId: null,
      error: null
    })
  },
  
  submitCourseReview: async (courseId: string, review: CourseReview) => {
    set({ submittingReviewCourseId: courseId })
    
    const result = await studentCourseService.submitCourseReview(courseId, review)
    
    if (result.error) {
      set({ 
        submittingReviewCourseId: null,
        error: result.error 
      })
      return
    }
    
    set({ 
      submittingReviewCourseId: null,
      error: null
    })
    
    // Optionally reload course to get updated review
    await get().loadCourseProgress(courseId)
  }
})
```

### Phase 4: UI Component Updates

#### Task 4.1: Update Student Courses Page
**File**: `src/app/student/courses/page.tsx`

Following the pattern from course edit page:

```typescript
export default function MyCoursesPage() {
  const {
    enrolledCourses,
    courseProgress,
    loading,
    error,
    unenrollingCourseId,
    loadingProgressCourseId,
    loadEnrolledCourses,
    loadCourseProgress,
    unenrollFromCourse
  } = useAppStore()
  
  // Remove mock data - use actual API data
  
  const handleUnenroll = async (courseId: string) => {
    if (confirm('Are you sure you want to unenroll from this course?')) {
      await unenrollFromCourse(courseId)
    }
  }
  
  return (
    <div>
      {/* Course cards */}
      {enrolledCourses.map(course => (
        <Card key={course.id}>
          {/* ... course content ... */}
          <Button
            onClick={() => handleUnenroll(course.id)}
            disabled={unenrollingCourseId === course.id}
          >
            {unenrollingCourseId === course.id ? (
              <LoadingSpinner size="sm" />
            ) : (
              'Unenroll'
            )}
          </Button>
        </Card>
      ))}
    </div>
  )
}
```

---

## 📋 Key Architecture Alignments

### ✅ Following Established Patterns:

1. **API Client**:
   - ✅ Methods added to centralized `api-client.ts`
   - ✅ Using existing auth with `credentials: 'include'`
   - ✅ No manual header management
   - ✅ CORS mode already configured

2. **Service Layer**:
   - ✅ Keep mock data switching in service
   - ✅ Services call apiClient methods
   - ✅ Return `ServiceResult<T>` type
   - ✅ No direct API calls from stores

3. **Store Pattern**:
   - ✅ Operation-specific loading states (like `assigningMediaId`)
   - ✅ Optimistic updates with rollback
   - ✅ Error handling in store actions
   - ✅ Auto-refresh related data after mutations

4. **UI Pattern**:
   - ✅ Disable buttons during operations
   - ✅ Show loading spinners per operation
   - ✅ Use store loading states for UI feedback
   - ✅ Confirmation dialogs for destructive actions

---

## 🔄 Migration Path (Aligned with Previous Implementations)

### Step 1: API Client Methods (Day 1)
- Add all student course methods to `api-client.ts`
- Test with existing auth flow
- No CSRF token implementation needed (handled by backend)

### Step 2: Service Layer (Day 1)
- Update existing methods to use new API client
- Add missing service methods
- Keep mock data fallback

### Step 3: Store Integration (Day 2)
- Add operation-specific loading states
- Implement new actions with optimistic updates
- Follow error handling pattern

### Step 4: UI Updates (Day 3)
- Remove mock data from components
- Add loading states per operation
- Implement confirmation dialogs

### Step 5: Testing (Day 4)
- Test all CRUD operations
- Verify auth works with cookies
- Test error scenarios

---

## ⚠️ Important Notes

1. **No Manual Auth Headers**: The existing architecture uses `credentials: 'include'` which automatically sends cookies
2. **CSRF Handled Server-Side**: No need for client-side CSRF token management
3. **Mock Data Toggle**: Keep using `NEXT_PUBLIC_USE_MOCK_DATA` env variable
4. **Error Patterns**: Follow existing error handling in stores
5. **Loading States**: Use operation-specific states, not global loading

---

## 📊 Success Metrics

- All API endpoints properly integrated
- No breaking changes to existing architecture
- Consistent UI/UX with other features
- Mock data can be toggled via env variable
- Auth works seamlessly with cookies

---

## 🚀 Next Steps

1. Start with API client methods
2. Update service layer to use new methods
3. Enhance store with new actions
4. Update UI components
5. Remove mock data dependencies
6. Test end-to-end flow