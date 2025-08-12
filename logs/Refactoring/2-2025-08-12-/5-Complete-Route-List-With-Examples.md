# Complete Route List with Example IDs
**Date:** 2025-08-12  
**Note:** All example IDs are from actual mock data in the codebase

---

## 🏠 ROOT ROUTES (Public)

| Route Pattern | Example URL | Description |
|--------------|-------------|-------------|
| `/` | http://localhost:3000/ | Home page - Landing with hero, AI showcase |
| `/courses` | http://localhost:3000/courses | Public courses list |
| `/course/[id]` | http://localhost:3000/course/course-1 | Course details (Web Development Fundamentals) |
| | http://localhost:3000/course/course-2 | Course details (Machine Learning Basics) |
| | http://localhost:3000/course/course-3 | Course details (Data Science with Python) |
| `/learn/[id]` | http://localhost:3000/learn/lesson-1 | Public video learning (CSS Grid Basics) |
| | http://localhost:3000/learn/lesson-2 | Public video learning |
| | http://localhost:3000/learn/lesson-3 | Public video learning |
| `/blog` | http://localhost:3000/blog | Blog listing page |
| `/blog/[slug]` | http://localhost:3000/blog/1 | Blog article |
| | http://localhost:3000/blog/2 | Blog article |
| `/alt` | http://localhost:3000/alt | Alternative layout (deprecated) |

/alt
/community
/instructor/promote
/api/youtube-transcript
/test-stores
/test-student-video
/test-instructor-video

These are the routes i dont need, the rest of the routes I DO NEED. So I need you to analyze what components we are using in these unneeded routes that are also being used in the NEEDED routes. I need to know what components we are using in NEEDED ROUTES that are also in UNNEEDED ROUTES.

Also need to know what components are in UNEEDED ROUTES that are not used in NEEDED ROUTES.

I need to remove unused components / code from unneeded routes that are not being used in needed routes.


---

## 👨‍🎓 STUDENT ROUTES

| Route Pattern | Example URL | Description |
|--------------|-------------|-------------|
| `/student` | http://localhost:3000/student | Student dashboard |
| `/student/courses` | http://localhost:3000/student/courses | Student's enrolled courses |
| `/student/course/[id]/video/[videoId]` | http://localhost:3000/student/course/course-1/video/1 | HTML & CSS Basics video |
| | http://localhost:3000/student/course/course-1/video/2 | JavaScript Fundamentals video |
| | http://localhost:3000/student/course/course-1/video/3 | React Basics video |
| | http://localhost:3000/student/course/course-1/video/4 | Next.js Introduction video |
| | http://localhost:3000/student/course/course-1/video/5 | Full Stack Project video |
| | http://localhost:3000/student/course/course-2/video/1 | Machine Learning video |
| | http://localhost:3000/student/course/course-3/video/1 | Data Science video |
| `/student/community` | http://localhost:3000/student/community | Community features (BROKEN) |
| `/student/metrics` | http://localhost:3000/student/metrics | Performance metrics |
| `/student/reflections` | http://localhost:3000/student/reflections | Student reflections |

---

## 👨‍🏫 INSTRUCTOR ROUTES

### Dashboard & Management
| Route Pattern | Example URL | Description |
|--------------|-------------|-------------|
| `/instructor` | http://localhost:3000/instructor | Instructor dashboard |
| `/instructor/students` | http://localhost:3000/instructor/students | Student management |
| `/instructor/engagement` | http://localhost:3000/instructor/engagement | Engagement metrics |
| `/instructor/confusions` | http://localhost:3000/instructor/confusions | Student confusions |
| `/instructor/promote` | http://localhost:3000/instructor/promote | Promote to moderator |

### Course Management
| Route Pattern | Example URL | Description |
|--------------|-------------|-------------|
| `/instructor/courses` | http://localhost:3000/instructor/courses | Instructor's courses |
| `/instructor/course/new` | http://localhost:3000/instructor/course/new | Create new course |
| `/instructor/course/[id]/edit` | http://localhost:3000/instructor/course/course-1/edit | Edit Web Dev course |
| | http://localhost:3000/instructor/course/course-2/edit | Edit ML course |
| `/instructor/course/[id]/analytics` | http://localhost:3000/instructor/course/course-1/analytics | Web Dev analytics |
| | http://localhost:3000/instructor/course/course-2/analytics | ML analytics |

### Lesson Management
| Route Pattern | Example URL | Description |
|--------------|-------------|-------------|
| `/instructor/lessons` | http://localhost:3000/instructor/lessons | All lessons list |
| `/instructor/lesson/new` | http://localhost:3000/instructor/lesson/new | Create new lesson |
| `/instructor/lesson/[id]/edit` | http://localhost:3000/instructor/lesson/lesson-1/edit | Edit lesson |
| `/instructor/lesson/[id]/analytics` | http://localhost:3000/instructor/lesson/lesson-1/analytics | Lesson analytics |

### Response/Interaction
| Route Pattern | Example URL | Description |
|--------------|-------------|-------------|
| `/instructor/respond/[id]` | http://localhost:3000/instructor/respond/sarah_chen | Respond to Sarah |
| | http://localhost:3000/instructor/respond/mike_johnson | Respond to Mike |
| | http://localhost:3000/instructor/respond/emma_wilson | Respond to Emma |

---

## 👮 MODERATOR ROUTES

| Route Pattern | Example URL | Description |
|--------------|-------------|-------------|
| `/moderator` | http://localhost:3000/moderator | Moderator dashboard |
| `/moderator/respond/[id]` | http://localhost:3000/moderator/respond/r1 | Respond to reflection |
| | http://localhost:3000/moderator/respond/a1 | Respond to annotation |

---

## 🔌 API ROUTES

| Route Pattern | Example URL | Description |
|--------------|-------------|-------------|
| `/api/youtube-transcript` | http://localhost:3000/api/youtube-transcript | GET YouTube transcripts |

---

## 🧪 TEST ROUTES (Development Only)

| Route Pattern | Example URL | Description |
|--------------|-------------|-------------|
| `/test-stores` | http://localhost:3000/test-stores | Test Zustand stores |
| `/test-student-video` | http://localhost:3000/test-student-video | Test student video (uses video-1) |
| `/test-instructor-video` | http://localhost:3000/test-instructor-video | Test instructor (lesson-1) |
| `/test-feature-flags` | http://localhost:3000/test-feature-flags | Test feature flags |

`/test-feature-flags` - KEEP THIS ROUTE.
---

## 🎥 VIDEO-SPECIFIC ROUTES WITH EXAMPLES

### Primary Student Video Routes
```
/student/course/course-1/video/1  - HTML & CSS Basics
/student/course/course-1/video/2  - JavaScript Fundamentals  
/student/course/course-1/video/3  - React Basics
/student/course/course-1/video/4  - Next.js Introduction
/student/course/course-1/video/5  - Full Stack Project

/student/course/course-2/video/1  - Introduction to Python for ML
/student/course/course-2/video/2  - Numpy and Pandas
/student/course/course-2/video/3  - Machine Learning Basics
/student/course/course-2/video/4  - Neural Networks
/student/course/course-2/video/5  - Deep Learning Project

/student/course/course-3/video/1  - Python Fundamentals
/student/course/course-3/video/2  - Data Cleaning
/student/course/course-3/video/3  - Exploratory Data Analysis
/student/course/course-3/video/4  - Statistical Analysis
/student/course/course-3/video/5  - Data Visualization
```

### Public Learning Routes
```
/learn/lesson-1  - CSS Grid Basics
/learn/lesson-2  - Advanced Layouts
/learn/lesson-3  - Responsive Design
/learn/test-lesson-1  - Test lesson (used in tests)
```

### Instructor Video Analytics (via query params)
```
/learn/lesson-1?instructor=true&student=sarah_chen
/learn/lesson-1?instructor=true&student=mike_johnson
/learn/lesson-1?instructor=true&student=emma_wilson
/learn/test-lesson-1?instructor=true&student=sarah_chen&from=test
```

---

## 📊 MOCK DATA IDS REFERENCE

### Course IDs
- `course-1` - Web Development Fundamentals
- `course-2` - Machine Learning Basics  
- `course-3` - Data Science with Python

### Video IDs (per course)
- Videos: `1`, `2`, `3`, `4`, `5` (numeric IDs)

### Lesson IDs
- `lesson-1`, `lesson-2`, `lesson-3`
- `test-lesson-1` (for testing)

### Student IDs
- `sarah_chen`
- `mike_johnson`
- `emma_wilson`
- `learner-1`

### Instructor IDs
- `instructor-1`
- `instructor-2`

### Reflection/Annotation IDs
- Reflections: `r1`, `r2`, `r3`, `r4`, `r5`, `r6`, `r7`, `r8`
- Annotations: `a1`, `a2`, `a3`, `a4`, `a5`, `a6`, `a7`

### Blog Post IDs
- `1`, `2`, `3`, `4`, `5`, `6` (numeric IDs)

### AI Agent IDs
- `ai-1`, `ai-2`, `ai-3`

---

## 🚨 BROKEN ROUTES

1. **`/student/community`** - Runtime error: `leaderboard[selectedMetric] is undefined`
2. **`/alt`** - Deprecated alternative layout

---

## ✅ MOST USED ROUTES FOR TESTING

### Student Flow
1. http://localhost:3000/
2. http://localhost:3000/courses
3. http://localhost:3000/course/course-1
4. http://localhost:3000/student
5. http://localhost:3000/student/courses
6. http://localhost:3000/student/course/course-1/video/1

### Instructor Flow
1. http://localhost:3000/instructor
2. http://localhost:3000/instructor/courses
3. http://localhost:3000/instructor/course/course-1/analytics
4. http://localhost:3000/instructor/students
5. http://localhost:3000/instructor/engagement

### Public Learning
1. http://localhost:3000/learn/lesson-1
2. http://localhost:3000/learn/lesson-2

### Testing
1. http://localhost:3000/test-student-video
2. http://localhost:3000/test-instructor-video
3. http://localhost:3000/test-stores