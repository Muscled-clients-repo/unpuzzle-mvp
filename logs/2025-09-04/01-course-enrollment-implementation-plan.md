# Course Enrollment Implementation Plan
**Date:** 2025-09-04  
**Context:** Implementing course enrollment for authenticated users  
**Stack:** Supabase + Zustand + Next.js  

## 🎯 Core Requirements

1. **Free courses** in browse courses frontend area
2. **Enrollment of free courses** to authenticated users  
3. **Enrollment of paid courses** to authenticated users
4. **Guest users** can browse courses but cannot enroll
5. **Once enrolled**, straight to video page

## 📐 Architecture Principles (from Backend Strategy Doc)

### UI Preservation Principle (CRITICAL)
- **The existing UI is approved and perfect** - adapt everything else to it
- **Never change working UI components** - `/courses` page already works with mock data
- **Backend serves data in UI-expected format** - Database must match Course interface

### Database-First Development
- Start with Supabase schema that matches UI expectations
- The database IS your backend with instant APIs
- Use Row Level Security for automatic data isolation

### Zustand State Management (SSOT)
- **Single Source of Truth** - Zustand store is the only state
- **No component state for shared data** - All enrollment state in store
- **Service layer pattern** - Services fetch, store manages state

---

## 🔍 Current State Analysis

### Existing Components & Their Behavior

#### 1. `/courses` Page (Public Browse)
```typescript
// Current implementation at src/app/courses/page.tsx
- Uses: loadAllCourses() from store
- Shows: All available courses with AICourseCard component
- State: recommendedCourses array
- Mock data: Working (when NEXT_PUBLIC_USE_MOCK_DATA=true)
```

#### 2. AICourseCard Component Analysis
```typescript
// src/components/course/ai-course-card.tsx
interface AICourseCardProps {
  course: Course
  variant?: "default" | "enrolled" | "instructor"
  userRole?: UserRole
  progress?: number
}

// Current behaviors:
- variant="default": Shows "View Course" button → links to /course/{id}
- variant="enrolled": Shows "Continue Learning" button → links to /student/course/{id}/video/{videoId}
- Price display: Only shows when NOT enrolled
- AI features: Conditional based on userRole and feature flags
```

#### 3. Student Course Service
```typescript
// src/services/student-course-service.ts
Current methods:
✅ getAllCourses() - Returns all courses for browsing
✅ getEnrolledCourses(userId) - Returns user's enrolled courses
⚠️  enrollInCourse(userId, courseId) - Exists but calls API endpoint (needs Supabase implementation)
```

#### 4. Student Course Slice (Zustand)
```typescript
// src/stores/slices/student-course-slice.ts
State:
- enrolledCourses: Course[]
- recommendedCourses: Course[] (used for ALL courses in browse)
- currentCourse: Course | null
- loading: boolean
- error: string | null

Actions:
✅ loadAllCourses() - Loads into recommendedCourses
✅ loadEnrolledCourses(userId) - Loads into enrolledCourses
✅ enrollInCourse(userId, courseId) - Calls service, reloads enrolled courses
```

#### 5. Database Schema
```sql
-- enrollments table (already exists)
CREATE TABLE enrollments (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  course_id UUID REFERENCES courses(id),
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  progress_percent INTEGER DEFAULT 0,
  -- ... other progress fields
)

-- courses table
CREATE TABLE courses (
  id UUID PRIMARY KEY,
  instructor_id UUID,
  title TEXT,
  price DECIMAL,
  is_free BOOLEAN,
  status TEXT, -- 'published', 'draft'
  -- ... other fields
)
```

---

## 🏗️ Implementation Strategy

### Phase 1: Backend - Supabase Enrollment Logic

#### 1.1 Update getAllCourses() Service Method
```typescript
// src/services/student-course-service.ts
async getAllCourses(): Promise<ServiceResult<Course[]>> {
  if (useMockData) {
    // Existing mock implementation
  }

  try {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    
    // Get all published courses
    const { data: courses, error } = await supabase
      .from('courses')
      .select(`
        *,
        profiles:instructor_id (
          id,
          name,
          email,
          avatar_url
        ),
        videos (
          id,
          title,
          duration,
          order
        )
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    // Check enrollment status if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    let enrolledCourseIds = new Set<string>()
    
    if (user) {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('user_id', user.id)
      
      enrolledCourseIds = new Set(enrollments?.map(e => e.course_id) || [])
    }
    
    // Transform to Course type with enrollment info
    const transformedCourses = courses?.map(course => ({
      id: course.id,
      title: course.title,
      description: course.description || '',
      thumbnailUrl: course.thumbnail_url || '',
      instructor: {
        id: course.profiles?.id || course.instructor_id,
        name: course.profiles?.name || 'Instructor',
        email: course.profiles?.email || '',
        avatar: course.profiles?.avatar_url || ''
      },
      price: course.price || 0,
      duration: course.total_duration_minutes || 0,
      difficulty: course.difficulty || 'beginner',
      tags: course.tags || [],
      videos: course.videos || [],
      enrollmentCount: course.enrollment_count || 0,
      rating: course.rating || 4.5,
      isPublished: course.status === 'published',
      isFree: course.is_free || course.price === 0,
      isEnrolled: enrolledCourseIds.has(course.id), // Add enrollment status
      createdAt: course.created_at,
      updatedAt: course.updated_at
    })) || []
    
    return { data: transformedCourses }
  } catch (error) {
    console.error('Error fetching all courses:', error)
    return { error: 'Failed to fetch courses' }
  }
}
```

#### 1.2 Implement enrollInCourse() with Supabase
```typescript
// src/services/student-course-service.ts
async enrollInCourse(
  userId: string,
  courseId: string
): Promise<ServiceResult<{ success: boolean; message: string; enrollmentId?: string }>> {
  if (useMockData) {
    return {
      data: {
        success: true,
        message: 'Successfully enrolled in course'
      }
    }
  }

  try {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.id !== userId) {
      return { error: 'User not authenticated' }
    }
    
    // Check if already enrolled
    const { data: existingEnrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .single()
    
    if (existingEnrollment) {
      return {
        data: {
          success: false,
          message: 'Already enrolled in this course',
          enrollmentId: existingEnrollment.id
        }
      }
    }
    
    // Get course details
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('title, is_free, price, total_videos')
      .eq('id', courseId)
      .single()
    
    if (courseError || !course) {
      return { error: 'Course not found' }
    }
    
    // Check if course is free or payment is handled
    if (!course.is_free && course.price > 0) {
      // For MVP: Allow enrollment but flag as unpaid
      // TODO: Integrate payment gateway
      console.log('Payment required for course:', course.title)
    }
    
    // Create enrollment
    const { data: enrollment, error: enrollError } = await supabase
      .from('enrollments')
      .insert({
        user_id: userId,
        course_id: courseId,
        progress_percent: 0,
        completed_videos: 0,
        total_videos: course.total_videos || 0,
        current_lesson_title: 'Not started',
        estimated_time_remaining_formatted: `${course.total_videos || 0} lessons`,
        ai_interactions_count: 0
      })
      .select()
      .single()
    
    if (enrollError) {
      console.error('Enrollment error:', enrollError)
      return { error: 'Failed to enroll in course' }
    }
    
    return {
      data: {
        success: true,
        message: `Successfully enrolled in ${course.title}`,
        enrollmentId: enrollment.id
      }
    }
  } catch (error) {
    console.error('Error enrolling in course:', error)
    return { error: 'Failed to enroll in course' }
  }
}
```

### Phase 2: Frontend - Enhanced UI Components

#### 2.1 Update Course Browse Page
```typescript
// src/app/courses/page.tsx - Add enrollment handling
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/stores/app-store"
import { AICourseCard } from "@/components/course/ai-course-card"
import { toast } from "sonner"

export default function CoursesPage() {
  const router = useRouter()
  const { 
    recommendedCourses,
    loading,
    error,
    user,
    loadAllCourses,
    enrollInCourse
  } = useAppStore()
  
  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null)

  useEffect(() => {
    loadAllCourses()
  }, [loadAllCourses])

  const handleEnroll = async (courseId: string) => {
    if (!user) {
      toast.error("Please login to enroll in courses")
      router.push('/login')
      return
    }

    setEnrollingCourseId(courseId)
    
    try {
      await enrollInCourse(user.id, courseId)
      
      // Find the course to get first video
      const course = recommendedCourses.find(c => c.id === courseId)
      const firstVideoId = course?.videos?.[0]?.id
      
      if (firstVideoId) {
        toast.success("Enrollment successful! Starting course...")
        // Navigate directly to first video
        router.push(`/student/course/${courseId}/video/${firstVideoId}`)
      } else {
        toast.success("Enrollment successful!")
        router.push(`/student/courses`)
      }
    } catch (err) {
      toast.error("Failed to enroll in course")
    } finally {
      setEnrollingCourseId(null)
    }
  }

  // ... rest of component
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {recommendedCourses.map((course) => (
        <AICourseCard 
          key={course.id} 
          course={course}
          variant={course.isEnrolled ? "enrolled" : "default"}
          userRole={user?.role}
          onEnroll={handleEnroll}
          isEnrolling={enrollingCourseId === course.id}
        />
      ))}
    </div>
  )
}
```

#### 2.2 Enhance AICourseCard for Enrollment
```typescript
// Update src/components/course/ai-course-card.tsx
interface AICourseCardProps {
  // ... existing props
  onEnroll?: (courseId: string) => void
  isEnrolling?: boolean
}

// In the component's CardFooter:
<CardFooter className="pt-0">
  {isEnrolled ? (
    // Existing "Continue Learning" button
  ) : (
    <div className="w-full space-y-2">
      {course.isFree ? (
        // Free course - direct enrollment
        <Button 
          className="w-full" 
          onClick={() => onEnroll?.(course.id)}
          disabled={isEnrolling}
        >
          {isEnrolling ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enrolling...
            </>
          ) : (
            <>
              Enroll for Free
              <Sparkles className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      ) : (
        // Paid course - show price and enroll button
        <>
          <Button 
            className="w-full" 
            onClick={() => onEnroll?.(course.id)}
            disabled={isEnrolling}
          >
            {isEnrolling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Enroll - ${course.price}
                <Sparkles className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
          <p className="text-center text-[10px] text-muted-foreground">
            30-day money-back guarantee
          </p>
        </>
      )}
      {!user && (
        <p className="text-center text-xs text-muted-foreground">
          <Link href="/login" className="underline">Login</Link> to enroll
        </p>
      )}
    </div>
  )}
</CardFooter>
```

### Phase 3: User Flow Implementation

#### 3.1 Guest User Flow
```typescript
// Middleware or auth check in courses page
const isGuest = !user

// In AICourseCard:
- Show course details normally
- Display "Login to enroll" instead of enroll button
- Clicking redirects to /login with return URL
```

#### 3.2 Authenticated User Flow
```typescript
// Free Course Enrollment:
1. User clicks "Enroll for Free"
2. Call enrollInCourse(userId, courseId)
3. On success → Navigate to /student/course/{id}/video/{firstVideoId}
4. Course now appears in "My Courses" with "Continue Learning" button

// Paid Course Enrollment (MVP):
1. User clicks "Enroll - $X"
2. Call enrollInCourse(userId, courseId) 
3. Create enrollment with payment_pending flag
4. Show payment modal (or redirect to payment page)
5. On payment success → Update enrollment, navigate to video
```

### Phase 4: Database Queries & RLS

#### 4.1 Row Level Security Policies
```sql
-- Allow users to read all published courses
CREATE POLICY "Public courses are viewable by everyone" 
ON courses FOR SELECT 
USING (status = 'published');

-- Allow users to read their own enrollments
CREATE POLICY "Users can view own enrollments" 
ON enrollments FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to create their own enrollments
CREATE POLICY "Users can enroll in courses" 
ON enrollments FOR INSERT 
WITH CHECK (auth.uid() = user_id);
```

---

## 🚀 Implementation Checklist

### Immediate Actions (Phase 1)
- [ ] Update `getAllCourses()` to fetch from Supabase with enrollment status
- [ ] Implement `enrollInCourse()` with Supabase insert
- [ ] Add RLS policies for enrollments table
- [ ] Test with 12@123.com user

### UI Updates (Phase 2)
- [ ] Add `onEnroll` prop to AICourseCard
- [ ] Update courses page with enrollment handler
- [ ] Add loading states during enrollment
- [ ] Implement success/error toasts

### Navigation Flow (Phase 3)
- [ ] Get first video ID from course
- [ ] Navigate to video page after enrollment
- [ ] Update "My Courses" to show new enrollment

### Testing Checklist
- [ ] Guest can browse but not enroll
- [ ] Authenticated user can enroll in free courses
- [ ] Enrolled courses show "Continue Learning"
- [ ] Non-enrolled show "Enroll" button
- [ ] After enrollment, navigate to first video

---

## 📊 Success Metrics

1. **User can browse all courses** without authentication
2. **Enrollment creates database record** in enrollments table
3. **UI updates immediately** to show enrolled state
4. **Navigation flows correctly** to video page
5. **State remains consistent** across page refreshes

## 🔧 Quick SQL for Testing

```sql
-- Check user ID for 12@123.com
SELECT id FROM auth.users WHERE email = '12@123.com';

-- Manual enrollment for testing
INSERT INTO enrollments (
  user_id, 
  course_id, 
  progress_percent, 
  completed_videos, 
  total_videos
)
SELECT 
  '[USER_ID_FROM_ABOVE]',
  id,
  0,
  0,
  total_videos
FROM courses 
WHERE status = 'published'
LIMIT 1;

-- Verify enrollment
SELECT * FROM enrollments WHERE user_id = '[USER_ID]';
```

---

## 🎯 Key Takeaways

1. **Leverage existing code** - All pieces exist, just need Supabase connection
2. **Zustand is SSOT** - All enrollment state flows through store
3. **UI stays unchanged** - Backend adapts to existing Course interface
4. **Progressive enhancement** - Start with free courses, add payments later
5. **Direct to video** - Best UX is immediate access after enrollment

**Next Step:** Start with updating `getAllCourses()` and `enrollInCourse()` service methods to use Supabase instead of API endpoints.