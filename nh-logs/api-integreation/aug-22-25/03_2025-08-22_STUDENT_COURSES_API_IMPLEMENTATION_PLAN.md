# Student Courses API Integration Implementation Plan

## Date: 2025-08-22
## Feature: Student Courses Management
## Priority: HIGH

---

## 📋 API Endpoints Identified

### From Postman Collection Analysis:

1. **Get Enrolled Courses**
   - Method: `GET`
   - URL: `{{base_url}}/api/v1/student/courses`
   - Auth: Cookie authentication with access_token
   - Rate Limit: 100 requests per minute
   - Returns: All courses the student is enrolled in with progress information

2. **Enroll in Course**
   - Method: `POST`
   - URL: `{{base_url}}/api/v1/student/courses/{{course_id}}/enroll`
   - Auth: Cookie + CSRF token
   - Body: `{ paymentMethod, couponCode }`
   - Rate Limit: 10 requests per minute
   - Returns: enrollmentId

3. **Unenroll from Course**
   - Method: `POST`
   - URL: `{{base_url}}/api/v1/student/courses/{{course_id}}/unenroll`
   - Auth: Cookie + CSRF token
   - Rate Limit: 10 requests per minute
   - May trigger refund process

4. **Get Course Progress**
   - Method: `GET`
   - URL: `{{base_url}}/api/v1/student/courses/{{course_id}}/progress`
   - Auth: Cookie authentication
   - Rate Limit: 100 requests per minute
   - Returns: Detailed progress including videos completed, quiz scores, certificate status

5. **Submit Course Review**
   - Method: `POST`
   - URL: `{{base_url}}/api/v1/student/courses/{{course_id}}/review`
   - Auth: Cookie + CSRF token
   - Rate Limit: 10 requests per minute
   - One review per student per course

---

## 🔍 Current Implementation Status

### ✅ Already Implemented (Partially):
1. **StudentCourseService** (`/src/services/student-course-service.ts`)
   - `getEnrolledCourses()` - Currently using mock data
   - `getCourseProgress()` - Currently using mock data
   - `enrollInCourse()` - Currently using mock data
   - URL paths incorrect: `/api/student/courses` instead of `/api/v1/student/courses`

2. **Store Integration** (`/src/stores/slices/student-course-slice.ts`)
   - `loadEnrolledCourses()` action
   - `loadCourseProgress()` action
   - State management for enrolled courses

3. **UI Component** (`/src/app/student/courses/page.tsx`)
   - Basic page structure
   - Using store actions
   - Mock progress data hardcoded

### ❌ Not Implemented:
1. Proper API endpoint URLs (missing `/v1/` in path)
2. Authentication headers (Cookie-based auth)
3. CSRF token handling
4. Unenroll functionality
5. Course review submission
6. Error handling for API responses
7. Loading states for individual operations
8. Real progress data integration

---

## 🛠️ Implementation Tasks

### Phase 1: Fix API Integration (Priority: CRITICAL)

#### Task 1.1: Update API Client Configuration
- [ ] Update base URL configuration to include `/api/v1/`
- [ ] Implement cookie-based authentication in API client
- [ ] Add CSRF token management
- [ ] Configure proper headers for all requests

#### Task 1.2: Fix StudentCourseService Endpoints
```typescript
// Current (incorrect)
`/api/student/courses`

// Should be
`/api/v1/student/courses`
```

#### Task 1.3: Implement Authentication Headers
```typescript
headers: {
  'Cookie': `access_token=${getAccessToken()}`,
  'X-CSRF-Token': getCsrfToken() // for POST requests
}
```

### Phase 2: Complete Missing Functionality

#### Task 2.1: Implement Unenroll Feature
- [ ] Add `unenrollFromCourse()` to StudentCourseService
- [ ] Add store action for unenroll
- [ ] Create UI component with confirmation dialog
- [ ] Handle refund process information

#### Task 2.2: Implement Course Review
- [ ] Add `submitCourseReview()` to StudentCourseService
- [ ] Create review form component
- [ ] Add validation (one review per course)
- [ ] Display existing reviews

#### Task 2.3: Enhanced Progress Tracking
- [ ] Parse complete progress response
- [ ] Display quiz scores
- [ ] Show certificate status
- [ ] Track video completion accurately

### Phase 3: UI/UX Improvements

#### Task 3.1: Remove Mock Data
- [ ] Remove hardcoded `mockProgressData` from page component
- [ ] Use actual API response data
- [ ] Implement proper loading states per course

#### Task 3.2: Error Handling
- [ ] Handle enrollment failures
- [ ] Display API error messages
- [ ] Implement retry mechanisms
- [ ] Add offline support consideration

#### Task 3.3: Performance Optimization
- [ ] Implement data caching
- [ ] Add pagination for course list
- [ ] Optimize progress loading (batch requests)
- [ ] Add lazy loading for course cards

---

## 📐 Technical Architecture

### Data Flow:
```
User Action → UI Component → Store Action → Service Layer → API Client → Backend
                    ↓                              ↓
                State Update              Response Processing
                    ↓                              ↓
                UI Re-render              Error Handling
```

### Service Layer Updates:
```typescript
class StudentCourseService {
  // Fix URLs
  private readonly BASE_PATH = '/api/v1/student/courses'
  
  // Add missing methods
  async unenrollFromCourse(courseId: string): Promise<ServiceResult<void>>
  async submitReview(courseId: string, review: CourseReview): Promise<ServiceResult<void>>
  async getDetailedProgress(courseId: string): Promise<ServiceResult<DetailedProgress>>
}
```

### Store Updates:
```typescript
interface StudentCourseActions {
  // Add missing actions
  unenrollFromCourse: (courseId: string) => Promise<void>
  submitCourseReview: (courseId: string, review: Review) => Promise<void>
  refreshProgress: (courseId: string) => Promise<void>
}
```

---

## 🔄 Migration Strategy

1. **Phase 1**: Fix critical API path issues (Immediate)
2. **Phase 2**: Add authentication headers (Day 1)
3. **Phase 3**: Implement missing features (Day 2-3)
4. **Phase 4**: Remove mock data (Day 4)
5. **Phase 5**: Testing & optimization (Day 5)

---

## ✅ Success Criteria

1. **Functional Requirements:**
   - [ ] Student can view enrolled courses
   - [ ] Progress data loads from actual API
   - [ ] Enrollment/unenrollment works
   - [ ] Reviews can be submitted
   - [ ] All API endpoints properly integrated

2. **Technical Requirements:**
   - [ ] No mock data in production
   - [ ] Proper authentication implemented
   - [ ] CSRF protection active
   - [ ] Error handling comprehensive
   - [ ] Loading states accurate

3. **Performance Metrics:**
   - [ ] Page load < 2 seconds
   - [ ] Progress updates < 500ms
   - [ ] Smooth UI transitions
   - [ ] No unnecessary API calls

---

## 🐛 Known Issues to Address

1. **Current Bugs:**
   - ErrorFallback component typos (FIXED in previous commit)
   - Incorrect API paths
   - Mock data dependency
   - Missing auth headers

2. **Security Concerns:**
   - CSRF token not implemented
   - Access token handling needs review
   - Rate limiting not tracked client-side

---

## 📝 Testing Plan

1. **Unit Tests:**
   - Service layer methods
   - Store actions
   - Component logic

2. **Integration Tests:**
   - API endpoint connectivity
   - Authentication flow
   - Error scenarios

3. **E2E Tests:**
   - Complete enrollment flow
   - Progress tracking
   - Review submission

---

## 🚀 Deployment Considerations

1. **Environment Variables:**
   - Ensure API base URL configured
   - Auth endpoints available
   - CSRF endpoint configured

2. **Feature Flags:**
   - Consider gradual rollout
   - Mock data fallback for testing

3. **Monitoring:**
   - Track API response times
   - Monitor error rates
   - User engagement metrics

---

## 📚 Documentation Updates

After implementation:
1. Update API documentation
2. Create user guide for course management
3. Document authentication flow
4. Add troubleshooting guide

---

## 👥 Team Notes

- Coordinate with backend team on API changes
- UX review needed for enrollment flow
- Security review for auth implementation
- Performance testing required before launch