# Backend Integration Plan: Course Route Support

**Date:** 2025-09-03  
**Author:** Claude Code Analysis  
**Objective:** Enable `/course/[id]` route to load without mock data by implementing proper backend API endpoints

---

## Root Cause Analysis Summary

The `/course/course-1` route returns 404 errors because:
1. **Mock data disabled**: `.env.local` sets `NEXT_PUBLIC_USE_MOCK_DATA=false`
2. **Missing API endpoints**: Frontend calls `/api/courses/[id]` and `/api/student/courses` but these don't exist
3. **Backend gap**: Only 4 API routes exist (upload, delete-video, check-auth, switch-role)

## Mock Data Analysis

### Current Mock Course Structure
From `src/data/mock/courses.ts`, each course contains:

```typescript
interface MockCourse {
  id: string                    // "course-1", "course-2", "course-3"
  title: string                 // "Shopify Freelancer on Upwork"
  description: string           // Full course description
  instructor: {
    name: string               // "Sarah Chen"
    avatar: string             // Dicebear URL
  }
  thumbnail: string            // Unsplash image URL
  price: number               // 79, 129, 99
  duration: string            // "12 hours", "20 hours", "15 hours"
  students: number            // 2543, 1832, 3421
  rating: number              // 4.8, 4.9, 4.7
  level: "beginner" | "intermediate" | "advanced"
  category: string            // "Programming", "Data Science", "Marketing"
  videos: Video[]             // Array of course videos
}
```

### Video Structure
Each course has 5 videos with rich metadata:
```typescript
interface MockVideo {
  id: string                  // "1", "2", "3", "4", "5"
  title: string              // "Getting Started on Upwork as Shopify Developer"
  duration: string           // "15:30", "45:00", "50:00"
  description: string        // Video description
  thumbnailUrl: string       // Local paths like "/video-thumbs/intro.jpg"
  videoUrl: string          // Google Cloud sample videos
  transcript?: string       // Full HTML transcript with timestamps
  timestamps?: Timestamp[]  // Chapter markers
  quizPoints?: QuizPoint[]  // Interactive quiz points
}
```

### Domain Type Mapping
The `studentCourseService` transforms mock data to match domain types:
- Mock `Course` → Domain `Course` (src/types/domain.ts:155-172)
- Mock `Video` → Domain `Video` (src/types/domain.ts:32-44)
- Adds computed fields: `instructor.id`, `instructor.email`, `enrollmentCount`, etc.

## Required API Endpoints

### 1. `/api/courses/[id]` (GET)
**Purpose:** Get individual course details for course preview page  
**Usage:** Called by `loadCourseById()` in student-course-slice  
**Response Format:**
```typescript
{
  "data": Course | null,  // Domain Course type
  "error"?: string
}
```

**Required Course Fields:**
```typescript
{
  id: string
  title: string
  description: string
  thumbnailUrl: string
  instructor: {
    id: string
    name: string
    email: string
    avatar: string
  }
  price: number
  duration: number        // Total minutes
  difficulty: "beginner" | "intermediate" | "advanced"
  tags: string[]
  videos: Video[]         // Array of course videos
  enrollmentCount: number
  rating: number
  isPublished: boolean
  isFree: boolean
  createdAt: string       // ISO date
  updatedAt: string       // ISO date
}
```

### 2. `/api/student/courses` (GET)
**Purpose:** Get enrolled courses for current user  
**Usage:** Called by `loadEnrolledCourses()` in student-course-slice  
**Response Format:**
```typescript
{
  "data": Course[],  // Array of Domain Course types
  "error"?: string
}
```

### 3. `/api/courses` (GET) - Optional
**Purpose:** Get all public courses for browsing  
**Usage:** Called by `getAllCourses()` in student-course-slice  
**Response Format:** Same as `/api/student/courses`

## Supabase Schema Requirements

### Core Tables Needed

#### 1. `profiles` (User Management)
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  avatar VARCHAR,
  role VARCHAR DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. `instructors` (Instructor Details)
```sql
CREATE TABLE instructors (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  bio TEXT,
  expertise TEXT[],
  courses_count INTEGER DEFAULT 0,
  students_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3. `courses` (Course Catalog)
```sql
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID REFERENCES instructors(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  description TEXT,
  thumbnail_url VARCHAR,
  price DECIMAL(10,2) DEFAULT 0,
  duration_minutes INTEGER DEFAULT 0,
  difficulty VARCHAR CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  tags TEXT[] DEFAULT '{}',
  enrollment_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  is_free BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4. `videos` (Course Videos)
```sql
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  description TEXT,
  duration_seconds INTEGER DEFAULT 0,
  order_index INTEGER NOT NULL,
  video_url VARCHAR,
  thumbnail_url VARCHAR,
  transcript JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 5. `enrollments` (Student-Course Relationships)
```sql
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  progress DECIMAL(5,2) DEFAULT 0,
  UNIQUE(student_id, course_id)
);
```

### Indexes and Constraints
```sql
-- Performance indexes
CREATE INDEX idx_courses_instructor_id ON courses(instructor_id);
CREATE INDEX idx_courses_published ON courses(is_published) WHERE is_published = true;
CREATE INDEX idx_videos_course_id ON videos(course_id);
CREATE INDEX idx_videos_order ON videos(course_id, order_index);
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);

-- Data integrity
ALTER TABLE videos ADD CONSTRAINT positive_order CHECK (order_index > 0);
ALTER TABLE courses ADD CONSTRAINT positive_price CHECK (price >= 0);
ALTER TABLE enrollments ADD CONSTRAINT valid_progress CHECK (progress >= 0 AND progress <= 100);
```

### Database Views for API Performance
```sql
-- Instructor courses view with computed fields
CREATE VIEW instructor_courses_view AS
SELECT 
  c.id,
  c.title,
  c.thumbnail_url as thumbnail,
  c.is_published as status,
  c.enrollment_count as students,
  COALESCE(
    AVG(e.progress) FILTER (WHERE e.progress > 0), 
    0
  ) as completion_rate,
  (c.price * c.enrollment_count) as revenue,
  COUNT(v.id) as total_videos,
  CONCAT(FLOOR(c.duration_minutes / 60), 'h ', c.duration_minutes % 60, 'm') as total_duration,
  0 as pending_confusions, -- TODO: Join with confusions table when implemented
  c.updated_at as last_updated,
  c.instructor_id,
  c.description,
  c.price,
  c.difficulty,
  c.tags,
  c.rating,
  c.is_free,
  c.created_at,
  c.updated_at
FROM courses c
LEFT JOIN videos v ON c.id = v.course_id
LEFT JOIN enrollments e ON c.id = e.course_id
GROUP BY c.id, c.title, c.thumbnail_url, c.is_published, c.enrollment_count, c.price, c.duration_minutes, c.updated_at, c.instructor_id, c.description, c.difficulty, c.tags, c.rating, c.is_free, c.created_at;

-- Student courses view with enrollment info
CREATE VIEW student_courses_view AS
SELECT 
  c.*,
  i.name as instructor_name,
  i.id as instructor_id,
  p.email as instructor_email,
  p.avatar as instructor_avatar,
  e.enrolled_at,
  e.progress,
  e.completed_at
FROM courses c
JOIN instructors i ON c.instructor_id = i.id
JOIN profiles p ON i.id = p.id
JOIN enrollments e ON c.id = e.course_id
WHERE c.is_published = true;
```

## Implementation Plan

### Phase 1: Database Setup (Priority: HIGH)

1. **Run Supabase Migrations**
   - Create migration files in `migrations/` directory
   - Execute schema in Supabase SQL editor
   - Verify with test data

2. **Seed Test Data**
   ```sql
   -- Insert test instructor
   INSERT INTO profiles (id, email, name, role) VALUES 
   ('550e8400-e29b-41d4-a716-446655440000', 'sarah@example.com', 'Sarah Chen', 'instructor');
   
   -- Insert test course matching mock data
   INSERT INTO courses (id, instructor_id, title, description, thumbnail_url, price, duration_minutes, difficulty, tags, enrollment_count, rating, is_published) VALUES 
   ('course-1', '550e8400-e29b-41d4-a716-446655440000', 'Shopify Freelancer on Upwork', 'Master Shopify development...', 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800&q=80', 79, 720, 'beginner', '{"Programming"}', 2543, 4.8, true);
   ```

### Phase 2: API Routes Implementation (Priority: HIGH)

#### 1. Create `/api/courses/[id]/route.ts`
```typescript
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Course, Video } from '@/types/domain'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    
    // Get course with instructor info
    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .select(`
        *,
        instructor:instructors!instructor_id (
          id,
          name:profiles!id (name, email, avatar)
        ),
        videos (
          id,
          title,
          description,
          duration_seconds,
          order_index,
          video_url,
          thumbnail_url,
          transcript,
          created_at,
          updated_at
        )
      `)
      .eq('id', params.id)
      .eq('is_published', true)
      .single()
    
    if (courseError || !courseData) {
      return Response.json({ data: null }, { status: 404 })
    }
    
    // Transform to Domain Course format
    const course: Course = {
      id: courseData.id,
      title: courseData.title,
      description: courseData.description || '',
      thumbnailUrl: courseData.thumbnail_url || '',
      instructor: {
        id: courseData.instructor.id,
        name: courseData.instructor.name.name,
        email: courseData.instructor.name.email,
        avatar: courseData.instructor.name.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${courseData.instructor.name.name}`
      },
      price: Number(courseData.price),
      duration: Math.floor(courseData.duration_minutes), // Convert to hours
      difficulty: courseData.difficulty,
      tags: courseData.tags || [],
      videos: (courseData.videos || [])
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((v: any): Video => ({
          id: v.id,
          courseId: courseData.id,
          title: v.title,
          description: v.description || '',
          duration: v.duration_seconds || 0,
          order: v.order_index,
          videoUrl: v.video_url || '',
          thumbnailUrl: v.thumbnail_url || '',
          transcript: v.transcript || [],
          createdAt: v.created_at,
          updatedAt: v.updated_at
        })),
      enrollmentCount: courseData.enrollment_count || 0,
      rating: Number(courseData.rating) || 0,
      isPublished: courseData.is_published,
      isFree: courseData.is_free,
      createdAt: courseData.created_at,
      updatedAt: courseData.updated_at
    }
    
    return Response.json({ data: course })
  } catch (error) {
    console.error('Error fetching course:', error)
    return Response.json(
      { error: 'Failed to fetch course' },
      { status: 500 }
    )
  }
}
```

#### 2. Create `/api/student/courses/route.ts`
```typescript
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth/api-auth'

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request)
    if (!authUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const supabase = createClient()
    
    // Get enrolled courses for user
    const { data: enrolledCourses, error } = await supabase
      .from('student_courses_view')
      .select('*')
      .eq('student_id', authUser.id) // Join through enrollments table
    
    if (error) {
      console.error('Error fetching enrolled courses:', error)
      return Response.json({ error: 'Failed to fetch courses' }, { status: 500 })
    }
    
    // Transform to Domain Course format
    const courses = (enrolledCourses || []).map(transformToDomainCourse)
    
    return Response.json({ data: courses })
  } catch (error) {
    console.error('Error in student courses API:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### Phase 3: Data Migration (Priority: MEDIUM)

1. **Migrate Mock Data to Supabase**
   - Transform 3 mock courses into database records
   - Preserve all video content, transcripts, timestamps
   - Maintain course IDs for URL compatibility

2. **Update Environment Configuration**
   - Keep `NEXT_PUBLIC_USE_MOCK_DATA=false`
   - Ensure proper Supabase connection

### Phase 4: Testing & Validation (Priority: HIGH)

1. **API Endpoint Testing**
   ```bash
   # Test individual course fetch
   curl http://localhost:3001/api/courses/course-1
   
   # Test enrolled courses (with auth)
   curl -H "Authorization: Bearer <token>" http://localhost:3001/api/student/courses
   ```

2. **Frontend Integration Testing**
   - Visit `/course/course-1` - should load without 404
   - Test enrollment flow
   - Verify video data loads correctly

3. **Performance Testing**
   - Monitor database query performance
   - Test with larger datasets
   - Optimize indexes as needed

## Data Transformation Requirements

### Mock → Supabase Field Mapping
```typescript
// Mock Course → Database Course
{
  id: "course-1"           → id: UUID or keep as string
  title                    → title
  description              → description  
  instructor.name          → instructors.name via profiles.name
  instructor.avatar        → profiles.avatar
  thumbnail                → thumbnail_url
  price                    → price (decimal)
  duration: "12 hours"     → duration_minutes: 720
  students                 → enrollment_count
  rating                   → rating
  level                    → difficulty
  category                 → tags[0]
  videos[]                 → videos table with course_id FK
}
```

### Instructor Data Creation
```sql
-- For each unique instructor in mock data
INSERT INTO profiles (id, email, name, role, avatar) VALUES
('instructor-sarah', 'sarah.chen@example.com', 'Sarah Chen', 'instructor', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah');

INSERT INTO instructors (id) VALUES ('instructor-sarah');
```

## Risk Assessment & Mitigation

### High Risk Items
1. **Breaking Change**: Switching from mock to real data
   - **Mitigation**: Test thoroughly, maintain mock compatibility
   
2. **Database Performance**: Complex joins for course data
   - **Mitigation**: Use optimized views, proper indexing
   
3. **Authentication**: API routes require proper auth
   - **Mitigation**: Implement robust auth checking

### Medium Risk Items
1. **Data Consistency**: Mock vs real data format differences
   - **Mitigation**: Comprehensive transformation layer
   
2. **Migration Complexity**: Moving existing data
   - **Mitigation**: Phased approach, rollback plan

## Success Criteria

✅ **Primary Goal**: `/course/course-1` loads without 404 errors  
✅ **API Availability**: All required endpoints return proper responses  
✅ **Data Completeness**: All mock course features available via API  
✅ **Performance**: Page loads within 2 seconds  
✅ **Compatibility**: Existing UI components work unchanged  

## Future Enhancements

1. **Real-time Features**: WebSocket support for live engagement data
2. **Caching Layer**: Redis for frequently accessed course data  
3. **CDN Integration**: Optimize video and image delivery
4. **Analytics**: Track course engagement and performance metrics
5. **Search**: Full-text search across courses and content

---

**Next Steps:**
1. Review and approve this plan
2. Create database migration files
3. Implement API routes
4. Test end-to-end functionality
5. Deploy and monitor

**Estimated Timeline:** 2-3 days for full implementation and testing