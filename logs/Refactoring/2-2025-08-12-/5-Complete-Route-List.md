# Complete Route List by Category
**Date:** 2025-08-12

---

## 🏠 ROOT ROUTES (Public)
1. **`/`** - Home page ✅ EXISTS - Landing page with hero, AI showcase, metrics, pricing
   - Example: http://localhost:3000/
2. `/courses` - Public courses list
   - Example: http://localhost:3000/courses
3. `/course/[id]` - Course details page (dynamic route) - 🎥 Shows course with video preview
   - Examples: 
   - http://localhost:3000/course/course-1 (Web Development)
   - http://localhost:3000/course/course-2 (Machine Learning)
   - http://localhost:3000/course/course-3 (Data Science)
4. `/learn/[id]` - Learning page (dynamic route with own layout) - 🎥 Public video learning experience
   - Examples:
   - http://localhost:3000/learn/lesson-1 (CSS Grid Basics)
   - http://localhost:3000/learn/lesson-2
   - http://localhost:3000/learn/lesson-3
5. `/blog` - Blog listing page
   - Example: http://localhost:3000/blog
6. `/blog/[slug]` - Individual blog article (dynamic route)
   - Examples: http://localhost:3000/blog/1, http://localhost:3000/blog/2
7. `/alt` - Alternative layout (deprecated)
   - Example: http://localhost:3000/alt

---

## 👨‍🎓 STUDENT ROUTES (/student/*)
1. `/student` - Student dashboard
   - Example: http://localhost:3000/student
2. `/student/courses` - Student's enrolled courses
   - Example: http://localhost:3000/student/courses
3. **`/student/course/[id]/video/[videoId]`** - 🎥 Main student video player (uses StudentVideoPlayer component)
   - Examples:
   - http://localhost:3000/student/course/course-1/video/1 (HTML & CSS)
   - http://localhost:3000/student/course/course-1/video/2 (JavaScript)
   - http://localhost:3000/student/course/course-1/video/3 (React)
   - http://localhost:3000/student/course/course-2/video/1 (ML Intro)
   - http://localhost:3000/student/course/course-3/video/1 (Python)
4. `/student/community` - Community features (struggle zones, study circles, leaderboard) ⚠️ BROKEN
   - Example: http://localhost:3000/student/community
5. `/student/metrics` - Student performance metrics
   - Example: http://localhost:3000/student/metrics
6. `/student/reflections` - Student reflections/notes
   - Example: http://localhost:3000/student/reflections

---

## 👨‍🏫 INSTRUCTOR ROUTES (/instructor/*)

### Dashboard & Overview
1. `/instructor` - Instructor dashboard
   - Example: http://localhost:3000/instructor
2. `/instructor/students` - Student management
   - Example: http://localhost:3000/instructor/students
3. `/instructor/engagement` - Engagement metrics
   - Example: http://localhost:3000/instructor/engagement
4. `/instructor/confusions` - Student confusions/questions
   - Example: http://localhost:3000/instructor/confusions
5. `/instructor/promote` - Promote students to moderator
   - Example: http://localhost:3000/instructor/promote

### Course Management
6. `/instructor/courses` - Instructor's courses list
   - Example: http://localhost:3000/instructor/courses
7. `/instructor/course/new` - Create new course
   - Example: http://localhost:3000/instructor/course/new
8. `/instructor/course/[id]/edit` - Edit existing course
   - Examples:
   - http://localhost:3000/instructor/course/1/edit
   - http://localhost:3000/instructor/course/2/edit
9. `/instructor/course/[id]/analytics` - Course analytics
   - Examples:
   - http://localhost:3000/instructor/course/1/analytics
   - http://localhost:3000/instructor/course/2/analytics

### Lesson Management
10. `/instructor/lessons` - All lessons list
    - Example: http://localhost:3000/instructor/lessons
11. `/instructor/lesson/new` - Create new lesson
    - Example: http://localhost:3000/instructor/lesson/new
12. `/instructor/lesson/[id]/edit` - Edit existing lesson
    - Example: http://localhost:3000/instructor/lesson/lesson-1/edit
13. `/instructor/lesson/[id]/analytics` - Lesson analytics
    - Example: http://localhost:3000/instructor/lesson/lesson-1/analytics

### Response/Interaction
14. `/instructor/respond/[id]` - Respond to specific student
    - Examples:
    - http://localhost:3000/instructor/respond/sarah_chen
    - http://localhost:3000/instructor/respond/mike_johnson
    - http://localhost:3000/instructor/respond/emma_wilson

---

## 👮 MODERATOR ROUTES (/moderator/*)
1. `/moderator` - Moderator dashboard
   - Example: http://localhost:3000/moderator
2. `/moderator/respond/[id]` - Respond to moderation item
   - Examples:
   - http://localhost:3000/moderator/respond/r1 (reflection)
   - http://localhost:3000/moderator/respond/a1 (annotation)

---

## 🔌 API ROUTES
1. **`/api/youtube-transcript`** - GET endpoint for YouTube transcripts (returns mock data)
   - Example: http://localhost:3000/api/youtube-transcript

---

## 🧪 TEST ROUTES (Development Only)
1. `/test-stores` - Test Zustand stores
   - Example: http://localhost:3000/test-stores
2. **`/test-student-video`** - 🎥 Test student video player (uses video-1)
   - Example: http://localhost:3000/test-student-video
3. **`/test-instructor-video`** - 🎥 Test instructor video view (uses test-lesson-1)
   - Example: http://localhost:3000/test-instructor-video
4. `/test-feature-flags` - Test feature flag system
   - Example: http://localhost:3000/test-feature-flags

---

## 📊 Route Count Summary

| Category | Count | Routes |
|----------|-------|--------|
| **Root/Public** | 7 | /, /courses, /course/[id], /learn/[id], /blog, /blog/[slug], /alt |
| **Student** | 6 | /student + 5 sub-routes |
| **Instructor** | 14 | /instructor + 13 sub-routes |
| **Moderator** | 2 | /moderator + 1 sub-route |
| **API** | 1 | /api/youtube-transcript |
| **Test** | 4 | Test routes for development |
| **TOTAL** | 34 | All routes (29 pages + 1 API + 4 test pages) |

---

## 📂 Layout Structure

### Layout Files:
1. **Root Layout:** `/src/app/layout.tsx` - Applies to all routes
2. **Student Layout:** `/src/app/student/layout.tsx` - All /student/* routes
3. **Instructor Layout:** `/src/app/instructor/layout.tsx` - All /instructor/* routes
4. **Moderator Layout:** `/src/app/moderator/layout.tsx` - All /moderator/* routes
5. **Learn Layout:** `/src/app/learn/[id]/layout.tsx` - Learning experience layout

### Dynamic Routes:
- `[id]` parameters: Used for courses, lessons, responses
- `[slug]` parameter: Used for blog posts
- `[videoId]` parameter: Used for video identification
- **Nested dynamic:** `/student/course/[id]/video/[videoId]` - Two-level dynamic routing

---

## 🎥 VIDEO-SPECIFIC ROUTES

### Active Video Routes with Real Examples:
1. **`/student/course/[id]/video/[videoId]`** - Primary student video learning experience
   - Uses: `StudentVideoPlayer` component
   - Features: AI chat, in/out points, transcript, reflections
   - Store: `student-video-slice`
   - Real URLs:
     - http://localhost:3000/student/course/course-1/video/1
     - http://localhost:3000/student/course/course-1/video/2
     - http://localhost:3000/student/course/course-2/video/1

2. **`/learn/[id]`** - Public/standalone video learning page
   - Can be accessed without login
   - Has its own layout
   - Real URLs:
     - http://localhost:3000/learn/lesson-1
     - http://localhost:3000/learn/lesson-2
     - http://localhost:3000/learn/test-lesson-1 (for testing)

3. **`/course/[id]`** - Course page with video previews
   - Shows course overview
   - Lists video lessons
   - Real URLs:
     - http://localhost:3000/course/course-1
     - http://localhost:3000/course/course-2
     - http://localhost:3000/course/course-3

### Test Video Routes:
4. **`/test-student-video`** - Development testing for student video
   - http://localhost:3000/test-student-video
5. **`/test-instructor-video`** - Development testing for instructor video analytics
   - http://localhost:3000/test-instructor-video

### Instructor Video Analytics (via query params):
- `/learn/lesson-1?instructor=true&student=sarah_chen`
- `/learn/test-lesson-1?instructor=true&student=sarah_chen&from=test`

### Deleted Video Routes (From Refactoring):
- ❌ `/learn/course/[id]/video/[videoId]/experimental` - Removed in Phase 1
- ❌ `/course/[id]/alt` - Alternative layout removed
- ❌ Various backup video components removed

### Video-Related Components (Not Routes):
- `StudentVideoPlayer` - Main student video component
- `InstructorVideoView` - Instructor analytics view
- `VideoControls` - Shared controls
- `VideoSeeker` - Timeline component
- `TranscriptPanel` - Transcript display

---

## 🎯 Routes Grouped by Feature

### Core Learning Experience ✅
- `/student` - Dashboard
- `/student/courses` - Course list
- **`/student/course/[id]/video/[videoId]`** - 🎥 Primary video player
- **`/learn/[id]`** - 🎥 Public video learning
- **`/course/[id]`** - 🎥 Course with video previews
- `/instructor` - Dashboard
- `/instructor/courses` - Course management
- `/instructor/course/[id]/analytics` - Analytics

### Course Creation Feature 🔧
- `/instructor/course/new` - New course wizard
- `/instructor/course/[id]/edit` - Edit course

### Lesson Management Feature 🔧
- `/instructor/lessons` - Lesson list
- `/instructor/lesson/new` - New lesson
- `/instructor/lesson/[id]/edit` - Edit lesson
- `/instructor/lesson/[id]/analytics` - Lesson analytics

### Community Feature 🔧
- `/student/community` - All community features

### Blog Feature 🔧
- `/blog` - Blog listing
- `/blog/[slug]` - Blog articles

### Student Metrics & Reflection ✅
- `/student/metrics` - Performance metrics
- `/student/reflections` - Notes/reflections

### Instructor Engagement ✅
- `/instructor/students` - Student management
- `/instructor/engagement` - Engagement metrics
- `/instructor/confusions` - Student questions
- `/instructor/respond/[id]` - Respond to students

### Moderation System (Future) ⏸️
- `/moderator` - Moderator dashboard
- `/moderator/respond/[id]` - Moderation responses
- `/instructor/promote` - Promote to moderator

### Public Access ✅
- `/` - Home
- `/courses` - Browse courses
- `/course/[id]` - Course details
- `/learn/[id]` - Public learning

---

## 🚨 Routes with Known Issues

1. **`/student/community`** - Runtime error (leaderboard[selectedMetric] is undefined)
   - http://localhost:3000/student/community ❌
2. **`/alt`** - Deprecated alternative layout
   - http://localhost:3000/alt ⚠️
3. **Test routes** - Should be removed before production
4. **`/api/youtube-transcript`** - Currently returns mock data, needs real implementation

---

## 📊 MOCK DATA ID REFERENCE

### Course IDs:
- `course-1` - Web Development Fundamentals
- `course-2` - Machine Learning Basics
- `course-3` - Data Science with Python

### Video IDs (per course):
- Videos use numeric IDs: `1`, `2`, `3`, `4`, `5`

### Lesson IDs:
- `lesson-1`, `lesson-2`, `lesson-3`
- `test-lesson-1` (for testing)

### Student IDs:
- `sarah_chen`, `mike_johnson`, `emma_wilson`

### Other IDs:
- Blog posts: `1`, `2`, `3`, `4`, `5`, `6`
- Reflections: `r1`, `r2`, `r3`, etc.
- Annotations: `a1`, `a2`, `a3`, etc.

---

## 📝 Recommended Actions

### Keep These Routes (Core MVP):
- All `/student/*` routes EXCEPT `/student/community`
- `/instructor`, `/instructor/courses`, `/instructor/course/[id]/analytics`
- `/instructor/students`, `/instructor/engagement`, `/instructor/confusions`, `/instructor/respond/[id]`
- All public routes: `/`, `/courses`, `/course/[id]`, `/learn/[id]`

### Remove These Routes:
- `/student/community` (broken)
- `/blog` and `/blog/[slug]` (not core)
- `/instructor/course/new` and `/instructor/course/[id]/edit` (course creation)
- All `/instructor/lesson/*` routes (lesson management)
- `/alt` (deprecated)
- All `/test-*` routes (after testing complete)

### Hide These Routes (Keep Code):
- `/moderator/*` routes (future feature)
- `/instructor/promote` (tied to moderator feature)

---

## ✅ Verified Complete Route List

**Total Routes Found:** 34
- 29 Page routes (including homepage at `/`)
  - 5 routes with video functionality 🎥
- 1 API route (`/api/youtube-transcript`)
- 4 Test routes (2 are video-related)
- 5 Layout files for role-based UI

**No Missing Routes:** This list is complete based on thorough codebase analysis.

**Special Routing Features Used:**
- Dynamic routes with `[param]` syntax
- Nested dynamic routes
- Role-based layouts
- API routes in `/api` folder

**Not Found in Codebase:**
- No middleware.ts
- No loading/error/not-found.tsx files
- No catch-all routes `[...slug]`
- No route groups `(groupname)`
- No parallel routes `@folder`
- No intercepting routes `(.)folder`