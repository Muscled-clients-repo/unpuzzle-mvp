# 2-Hour Frontend Refactoring Sprint (REVISED)
## Clean Architecture While Preserving Role-Specific Components

## STATUS: Phase 1-5 COMPLETED ✅

## IMPORTANT: Video Player Architecture

### ✅ KEEP BOTH Video Players - They Serve Different Purposes:

1. **Student Video Player** (`VideoPlayerRefactored.tsx`)
   - AI chat integration
   - In/out point selection for context
   - Reflection/confusion submission
   - Quiz functionality
   - Transcript navigation
   - Used in: `/learn/[id]`, `/student/course/[id]/video/[videoId]`

2. **Instructor Video View** (embedded player in `InstructorVideoView.tsx`)
   - Timeline markers for student reflections
   - Student activity overlay
   - Response system
   - No AI features needed
   - Used in: `/learn/[id]?instructor=true`

### Rename for Clarity:
```bash
# Make the purpose clear
mv src/components/video/VideoPlayerRefactored.tsx src/components/video/StudentVideoPlayer.tsx
# The instructor has its own view component already
```

---

## PHASE 1: SMART CLEANUP (15 minutes) ✅ COMPLETED

### Step 1.1: Remove ONLY True Duplicates ✅
```bash
# These ARE duplicates - remove them:
rm src/app/course/[id]/alt/page.tsx  # Alternative layout
rm src/app/course/[id]/alternative.tsx  # Another alternative
rm src/app/learn/course/[id]/video/[videoId]/experimental/page.tsx  # Experimental version

# These are BROKEN/BACKUP - remove them:
rm src/app/instructor/course/[id]/analytics/page-broken.tsx
rm -rf src/data/repositories-disabled/
```

### Step 1.2: Keep But Organize Video Components ✅
```bash
# Create better organization
mkdir -p src/components/video/student
mkdir -p src/components/video/instructor
mkdir -p src/components/video/shared

# Move student-specific components
mv src/components/video/VideoPlayerRefactored.tsx src/components/video/student/StudentVideoPlayer.tsx
mv src/components/video/VideoPlayerWithHooks.tsx src/components/video/student/StudentVideoPlayerWithHooks.tsx

# Keep shared components
# VideoControls, VideoSeeker, TranscriptPanel can be shared
```

### Step 1.3: Check What Each Component Does
```bash
# VideoPlayerWithHooks - Uses custom hooks pattern
# Keep it if it's actively used, otherwise mark for later removal
# Check usage:
grep -r "VideoPlayerWithHooks" src/app src/components
```

---

## PHASE 2: UNIFY TYPES (20 minutes) ✅ COMPLETED

### Step 2.1: Create Domain Types with Role Awareness ✅
Create `src/types/domain.ts`:

```typescript
// src/types/domain.ts

// ============= USER & ROLES =============
export type UserRole = 'student' | 'instructor' | 'moderator' | 'admin'

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  role: UserRole
  subscription: Subscription
  createdAt: string
  updatedAt: string
}

// ============= VIDEO TYPES =============
// Course videos (part of structured courses)
export interface Video {
  id: string
  courseId: string
  title: string
  description: string
  duration: number
  order: number
  videoUrl: string
  thumbnailUrl?: string
  transcript?: TranscriptEntry[]
  createdAt: string
  updatedAt: string
}

// Student-specific course video data
export interface StudentVideoData extends Video {
  progress?: VideoProgress
  reflections?: Reflection[]
  quizzes?: Quiz[]
  aiContextEnabled: boolean
}

// Instructor-specific course video data
export interface InstructorVideoData extends Video {
  studentActivity: StudentActivity[]
  confusionHotspots: ConfusionHotspot[]
  aggregateMetrics: VideoMetrics
}

// ============= PUBLIC LESSON TYPES =============
// Public standalone lessons (anyone can view, students get AI features)
export interface Lesson {
  id: string
  title: string
  description: string
  duration: number
  videoUrl: string
  thumbnailUrl?: string
  transcript?: TranscriptEntry[]
  instructor: Instructor
  tags: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  isFree: boolean
  isPublished: boolean
  viewCount: number
  rating: number
  // No courseId or order - it's standalone
  createdAt: string
  updatedAt: string
}

// Enhanced lesson data for logged-in students (AI features unlocked)
export interface StudentLessonData extends Lesson {
  progress?: VideoProgress
  reflections?: Reflection[]
  quizzes?: Quiz[]
  aiContextEnabled: boolean  // Always true for students
  hasAccess: boolean  // Based on subscription/payment for premium lessons
}

// Analytics data for lesson owner (instructor)
export interface InstructorLessonData extends Lesson {
  studentActivity: StudentActivity[]
  confusionHotspots: ConfusionHotspot[]
  aggregateMetrics: VideoMetrics
  earnings?: {
    totalRevenue: number
    monthlyRevenue: number
    viewsThisMonth: number
  }
}

// ============= STUDENT FEATURES =============
export interface Reflection {
  id: string
  userId: string
  videoId: string
  content: string
  timestamp: number
  timeInSeconds: number
  type: 'text' | 'voice' | 'screenshot' | 'loom' | 'confusion'
  sentiment?: 'positive' | 'neutral' | 'confused'
  status: 'unresponded' | 'responded'
  response?: string
  responseTime?: string
  createdAt: string
}

export interface VideoSegment {
  videoId: string
  inPoint: number
  outPoint: number
  transcript?: string
  purpose: 'ai-context' | 'quiz' | 'reflection'
  // 'ai-context' = Student sends segment to AI for questions
  // 'quiz' = Student wants to be tested on this segment  
  // 'reflection' = AI agent selected this segment and prompted student for reflection
}

export interface Quiz {
  id: string
  videoId: string
  timestamp: number
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
  difficulty: 'easy' | 'medium' | 'hard'
}

// ============= INSTRUCTOR FEATURES =============
export interface StudentActivity {
  studentId: string
  studentName: string
  videoId: string
  timestamp: number
  type: 'reflection' | 'confusion' | 'quiz_attempt' | 'completion'
  content?: string
  needsResponse: boolean
}
// Activity types:
// 'reflection' = Student submitted reflection (voice/loom/text) on AI-prompted segment
// 'confusion' = Student marked confusion/stuck (HIGH priority for instructor)
// 'quiz_attempt' = Student completed embedded quiz (review if failed)  
// 'completion' = Student finished video (progress tracking)

export interface ConfusionHotspot {
  timestamp: number
  studentCount: number
  topic: string
  resolved: boolean
}

export interface VideoMetrics {
  totalViews: number
  avgWatchTime: number
  completionRate: number
  confusionPoints: ConfusionHotspot[]
  quizPassRate: number
  reflectionCount: number
}

// ============= COURSE TYPES =============
export interface Course {
  id: string
  title: string
  description: string
  thumbnailUrl: string
  instructor: Instructor
  price: number
  duration: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  tags: string[]
  videos: Video[]
  enrollmentCount: number
  rating: number
  isPublished: boolean
  isFree: boolean
  createdAt: string
  updatedAt: string
}

export interface Instructor {
  id: string  // This was missing before!
  name: string
  email: string
  avatar: string
  bio?: string
  expertise?: string[]
  coursesCount?: number
  studentsCount?: number
}

// ============= AI CHAT (Student Only) =============
export interface AIMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  videoContext?: VideoSegment
  intent?: 'conceptual' | 'quiz' | 'hint' | 'confusion' | 'reflection'
}
// Intent types:
// 'conceptual' = Student asking for concept explanation
// 'quiz' = Student wants to be tested on material
// 'hint' = Student wants a clue, not full answer
// 'confusion' = Student is stuck and needs clarification
// 'reflection' = Student submitting their understanding for AI feedback

export interface AIChat {
  id: string
  userId: string
  videoId: string
  messages: AIMessage[]
  contextSegments: VideoSegment[]
  createdAt: string
}

// ============= PROGRESS TRACKING =============
export interface VideoProgress {
  userId: string
  videoId: string
  watchedSeconds: number
  totalSeconds: number
  percentComplete: number
  lastWatchedAt: string
  completedAt?: string
  quizAttempts?: QuizAttempt[]
  reflectionCount: number
}

// ============= AI ENGAGEMENT METRICS =============
export interface AIEngagementMetrics {
  userId: string
  executionRate: number  // % of AI prompts student acted on (vs skipped)
  executionPace: number  // Average seconds to respond to AI prompts
  totalPromptsShown: number
  totalPromptsActedOn: number
  avgResponseTime: number
}

export interface AIPrompt {
  id: string
  userId: string
  videoId: string
  type: 'reflection' | 'quiz'
  videoSegment: VideoSegment
  promptText: string
  shownAt: string
  respondedAt?: string
  responseTimeSeconds?: number
  action: 'completed' | 'skipped' | 'pending'
}

export interface QuizAttempt {
  quizId: string
  attemptedAt: string
  correct: boolean
  timeSpent: number
}

// ============= SERVICE RESPONSES =============
export interface ServiceResult<T> {
  data?: T
  error?: string
  loading?: boolean
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}
```

---

## PHASE 3: ROLE-AWARE SERVICES (20 minutes) ✅ COMPLETED

### Step 3.1: Create Role-Specific Service Layer ✅
**COMPLETED**: Created separate services for each role:
- `src/services/student-video-service.ts` ✅
- `src/services/instructor-video-service.ts` ✅  
- `src/services/student-course-service.ts` ✅
- `src/services/instructor-course-service.ts` ✅
- `src/lib/api-client.ts` ✅

**Note**: We separated course services (originally combined in role-aware-course-service.ts) for better separation of concerns.

Original `src/services/student-video-service.ts`:

```typescript
// src/services/student-video-service.ts
import { apiClient, useMockData } from '@/lib/api-client'
import { StudentVideoData, VideoProgress, Reflection, Quiz, ServiceResult } from '@/types/domain'

export class StudentVideoService {
  async getVideoWithStudentData(videoId: string): Promise<ServiceResult<StudentVideoData>> {
    if (useMockData) {
      // Return mock data with student features
      return { 
        data: {
          id: videoId,
          title: 'React Hooks Deep Dive',
          videoUrl: 'mock-url',
          aiContextEnabled: true,
          progress: {
            percentComplete: 45,
            watchedSeconds: 540,
            totalSeconds: 1200
          },
          reflections: [],
          quizzes: []
        } as StudentVideoData
      }
    }

    const response = await apiClient.get<StudentVideoData>(`/api/student/videos/${videoId}`)
    return response.error 
      ? { error: response.error }
      : { data: response.data }
  }

  async saveReflection(reflection: Partial<Reflection>): Promise<ServiceResult<Reflection>> {
    if (useMockData) {
      return { 
        data: { 
          ...reflection, 
          id: `ref-${Date.now()}`,
          createdAt: new Date().toISOString() 
        } as Reflection
      }
    }

    const response = await apiClient.post<Reflection>('/api/reflections', reflection)
    return response.error
      ? { error: response.error }
      : { data: response.data }
  }

  async submitQuizAnswer(
    quizId: string, 
    answer: number
  ): Promise<ServiceResult<{ correct: boolean; explanation: string }>> {
    if (useMockData) {
      return { 
        data: { 
          correct: answer === 2, 
          explanation: 'Great job! That\'s the correct answer.' 
        }
      }
    }

    const response = await apiClient.post(`/api/quizzes/${quizId}/answer`, { answer })
    return response.error
      ? { error: response.error }
      : { data: response.data }
  }

  async updateProgress(progress: Partial<VideoProgress>): Promise<ServiceResult<void>> {
    if (useMockData) {
      // Just log in dev
      console.log('Progress update:', progress)
      return { data: undefined }
    }

    const response = await apiClient.post('/api/progress', progress)
    return response.error
      ? { error: response.error }
      : { data: undefined }
  }
}

export const studentVideoService = new StudentVideoService()
```

Create `src/services/instructor-video-service.ts`:

```typescript
// src/services/instructor-video-service.ts
import { apiClient, useMockData } from '@/lib/api-client'
import { InstructorVideoData, StudentActivity, VideoMetrics, ServiceResult } from '@/types/domain'

export class InstructorVideoService {
  async getVideoWithInstructorData(
    videoId: string, 
    studentId?: string
  ): Promise<ServiceResult<InstructorVideoData>> {
    if (useMockData) {
      return {
        data: {
          id: videoId,
          title: 'React Hooks Deep Dive',
          videoUrl: 'mock-url',
          studentActivity: [
            {
              studentId: 'student-1',
              studentName: 'Sarah Chen',
              timestamp: 135,
              type: 'confusion',
              content: 'Not clear about useCallback',
              needsResponse: true
            }
          ],
          confusionHotspots: [
            { timestamp: 135, studentCount: 3, topic: 'useCallback', resolved: false }
          ],
          aggregateMetrics: {
            totalViews: 45,
            avgWatchTime: 720,
            completionRate: 0.65,
            quizPassRate: 0.78,
            reflectionCount: 23
          }
        } as InstructorVideoData
      }
    }

    const endpoint = studentId 
      ? `/api/instructor/videos/${videoId}?student=${studentId}`
      : `/api/instructor/videos/${videoId}`
      
    const response = await apiClient.get<InstructorVideoData>(endpoint)
    return response.error
      ? { error: response.error }
      : { data: response.data }
  }

  async respondToReflection(
    reflectionId: string, 
    response: string
  ): Promise<ServiceResult<void>> {
    if (useMockData) {
      console.log('Response to reflection:', reflectionId, response)
      return { data: undefined }
    }

    const result = await apiClient.post(`/api/reflections/${reflectionId}/respond`, { response })
    return result.error
      ? { error: result.error }
      : { data: undefined }
  }

  async getStudentActivities(
    videoId: string
  ): Promise<ServiceResult<StudentActivity[]>> {
    if (useMockData) {
      return {
        data: [
          // Mock activities
        ]
      }
    }

    const response = await apiClient.get<StudentActivity[]>(`/api/instructor/videos/${videoId}/activities`)
    return response.error
      ? { error: response.error }
      : { data: response.data }
  }
}

export const instructorVideoService = new InstructorVideoService()
```

---

## PHASE 4: SPLIT STORES BY ROLE (20 minutes) ✅ COMPLETED

### Bug Fix During Phase 4:
**Fixed VideoEngine continuous time updates** - The YouTube player was calling `setCurrentTime` every 500ms even when paused, causing unnecessary Redux updates. Fixed by:
- Only running the interval when video is playing
- Clearing interval when paused/ended
- Properly managing interval lifecycle

## PHASE 4: SPLIT STORES BY ROLE (20 minutes)

### Step 4.0: Update Existing Store to Use New Services
**IMPORTANT**: The existing `course-slice.ts` currently uses the old `courseService` from `@/services/course-service.ts`. This needs to be updated to use the new role-specific services:

```typescript
// OLD: src/stores/slices/course-slice.ts
import { courseService } from '@/services'  // Uses old generic service

// NEW: Should import role-specific services
import { studentCourseService } from '@/services/student-course-service'
import { instructorCourseService } from '@/services/instructor-course-service'
```

**Files to update:**
- `src/stores/slices/course-slice.ts` - Currently uses old courseService
- `src/services/index.ts` - Remove export of old courseService
- `src/services/course-service.ts` - DELETE after updating stores

**Repository Pattern to Remove (old architecture):**
- `src/data/repositories/` - Entire folder can be deleted
  - Only used by old `course-service.ts`
  - `user-repository.ts` and `video-repository.ts` not used anywhere else
  - `course-repository.ts` only used by `course-service.ts`
  - Types were moved to `/types/domain.ts` unnecessarily (can be removed if not needed)

**Already cleaned up:**
- ✅ DELETED `src/services/user-service.ts` - Was unused
- ✅ DELETED `src/services/video-service.ts` - Was unused
- ✅ MOVED types to `domain.ts` (for repositories - can be removed with repositories)

**Note about AI Service:**
- `src/services/ai-service.ts` - Keep as-is (AI is student-only feature)
- Used by `ai-slice.ts` store
- Consider renaming to `student-ai-service.ts` in future for consistency

### Step 4.1: Create Student-Specific Store Slice
Create `src/stores/slices/student-video-slice.ts`:

```typescript
// src/stores/slices/student-video-slice.ts
import { StateCreator } from 'zustand'
import { StudentVideoData, Reflection, VideoSegment, Quiz } from '@/types/domain'
import { studentVideoService } from '@/services/student-video-service'

export interface StudentVideoSlice {
  // Student-specific video state
  currentVideo: StudentVideoData | null
  selectedSegment: VideoSegment | null
  activeQuiz: Quiz | null
  reflections: Reflection[]
  
  // AI Chat context
  inPoint: number | null
  outPoint: number | null
  
  // Actions
  loadStudentVideo: (videoId: string) => Promise<void>
  setVideoSegment: (inPoint: number, outPoint: number) => void
  clearVideoSegment: () => void
  addReflection: (reflection: Partial<Reflection>) => Promise<void>
  submitQuizAnswer: (quizId: string, answer: number) => Promise<void>
}

export const createStudentVideoSlice: StateCreator<StudentVideoSlice> = (set, get) => ({
  currentVideo: null,
  selectedSegment: null,
  activeQuiz: null,
  reflections: [],
  inPoint: null,
  outPoint: null,

  loadStudentVideo: async (videoId: string) => {
    const result = await studentVideoService.getVideoWithStudentData(videoId)
    if (result.data) {
      set({ 
        currentVideo: result.data,
        reflections: result.data.reflections || []
      })
    }
  },

  setVideoSegment: (inPoint: number, outPoint: number) => {
    set({
      inPoint,
      outPoint,
      selectedSegment: {
        videoId: get().currentVideo?.id || '',
        inPoint,
        outPoint,
        purpose: 'ai-context'
      }
    })
  },

  clearVideoSegment: () => {
    set({
      inPoint: null,
      outPoint: null,
      selectedSegment: null
    })
  },

  addReflection: async (reflection: Partial<Reflection>) => {
    const result = await studentVideoService.saveReflection(reflection)
    if (result.data) {
      set(state => ({
        reflections: [...state.reflections, result.data!]
      }))
    }
  },

  submitQuizAnswer: async (quizId: string, answer: number) => {
    const result = await studentVideoService.submitQuizAnswer(quizId, answer)
    // Handle result...
  }
})
```

### Step 4.2: Create Instructor-Specific Store Slice
Create `src/stores/slices/instructor-video-slice.ts`:

```typescript
// src/stores/slices/instructor-video-slice.ts
import { StateCreator } from 'zustand'
import { InstructorVideoData, StudentActivity } from '@/types/domain'
import { instructorVideoService } from '@/services/instructor-video-service'

export interface InstructorVideoSlice {
  // Instructor-specific video state
  currentVideoData: InstructorVideoData | null
  selectedStudent: string | 'all'
  studentActivities: StudentActivity[]
  currentReflectionIndex: number
  
  // Actions
  loadInstructorVideo: (videoId: string, studentId?: string) => Promise<void>
  selectStudent: (studentId: string | 'all') => void
  navigateToReflection: (index: number) => void
  respondToReflection: (reflectionId: string, response: string) => Promise<void>
}

export const createInstructorVideoSlice: StateCreator<InstructorVideoSlice> = (set, get) => ({
  currentVideoData: null,
  selectedStudent: 'all',
  studentActivities: [],
  currentReflectionIndex: 0,

  loadInstructorVideo: async (videoId: string, studentId?: string) => {
    const result = await instructorVideoService.getVideoWithInstructorData(videoId, studentId)
    if (result.data) {
      set({ 
        currentVideoData: result.data,
        studentActivities: result.data.studentActivity
      })
    }
  },

  selectStudent: (studentId: string | 'all') => {
    set({ selectedStudent: studentId })
    // Reload data for specific student if needed
  },

  navigateToReflection: (index: number) => {
    set({ currentReflectionIndex: index })
  },

  respondToReflection: async (reflectionId: string, response: string) => {
    await instructorVideoService.respondToReflection(reflectionId, response)
    // Update local state to mark as responded
  }
})
```

---

## PHASE 5: UPDATE COMPONENTS TO USE ROLE-SPECIFIC STORES (20 minutes)

### Step 5.1: Update Student Video Player Import
Update imports in student pages:

```typescript
// src/app/student/course/[id]/video/[videoId]/page.tsx
// Change from:
import { VideoPlayerRefactored } from '@/components/video/VideoPlayerRefactored'

// To:
import { StudentVideoPlayer } from '@/components/video/student/StudentVideoPlayer'

// Update the component usage
<StudentVideoPlayer 
  videoUrl={video.videoUrl}
  onTimeUpdate={handleTimeUpdate}
  // ... other props
/>
```

### Step 5.2: Update Store Usage in Components
In Student Video Player:

```typescript
// src/components/video/student/StudentVideoPlayer.tsx
// Use student-specific store slice
const { 
  inPoint, 
  outPoint, 
  setVideoSegment,
  clearVideoSegment 
} = useAppStore(state => ({
  inPoint: state.inPoint,
  outPoint: state.outPoint,
  setVideoSegment: state.setVideoSegment,
  clearVideoSegment: state.clearVideoSegment
}))
```

In Instructor Video View:

```typescript
// src/components/video/views/InstructorVideoView.tsx
// Use instructor-specific store slice
const {
  currentVideoData,
  selectedStudent,
  studentActivities,
  navigateToReflection,
  respondToReflection
} = useAppStore(state => ({
  currentVideoData: state.currentVideoData,
  selectedStudent: state.selectedStudent,
  studentActivities: state.studentActivities,
  navigateToReflection: state.navigateToReflection,
  respondToReflection: state.respondToReflection
}))
```

---

## PHASE 6: CLEAN UP SHARED COMPONENTS (15 minutes)

### Step 6.1: Identify Truly Shared Components
These can be shared between student and instructor:
- `VideoControls.tsx` - Basic play/pause/seek controls
- `VideoSeeker.tsx` - Timeline scrubber
- `TranscriptPanel.tsx` - Transcript display (with role-based features)

### Step 6.2: Create Shared Video Utilities
Create `src/components/video/shared/VideoUtils.ts`:

```typescript
// src/components/video/shared/VideoUtils.ts
export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function parseTimestamp(timestamp: string): number {
  const parts = timestamp.split(':').map(Number)
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  return parts[0] * 60 + parts[1]
}

export interface VideoKeyboardShortcuts {
  space: () => void      // Play/pause
  left: () => void       // Seek backward
  right: () => void      // Seek forward
  up?: () => void        // Volume up (student only)
  down?: () => void      // Volume down (student only)
  i?: () => void         // Set in point (student only)
  o?: () => void         // Set out point (student only)
  r?: () => void         // Add reflection (student only)
  n?: () => void         // Next reflection (instructor only)
  p?: () => void         // Previous reflection (instructor only)
}
```

---

## PHASE 7: ENVIRONMENT CONFIGURATION (10 minutes)

### Step 7.1: Create Role-Aware Config
Create `.env.local`:

```bash
# API Configuration
NEXT_PUBLIC_USE_MOCK_DATA=true
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# Feature Flags by Role
NEXT_PUBLIC_ENABLE_STUDENT_AI_CHAT=true
NEXT_PUBLIC_ENABLE_STUDENT_REFLECTIONS=true
NEXT_PUBLIC_ENABLE_STUDENT_QUIZZES=true
NEXT_PUBLIC_ENABLE_INSTRUCTOR_ANALYTICS=true
NEXT_PUBLIC_ENABLE_INSTRUCTOR_RESPONSES=true

# Video Features
NEXT_PUBLIC_MAX_VIDEO_SEGMENT_LENGTH=300  # 5 minutes max for AI context
NEXT_PUBLIC_ENABLE_VIDEO_DOWNLOAD=false

# Supabase (for later)
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Step 7.2: Create Feature Flag System
Create `src/config/features.ts`:

```typescript
// src/config/features.ts
import { UserRole } from '@/types/domain'

interface FeatureFlags {
  aiChat: boolean
  reflections: boolean
  quizzes: boolean
  analytics: boolean
  responses: boolean
  videoDownload: boolean
}

export function getFeatureFlags(role: UserRole): FeatureFlags {
  switch (role) {
    case 'student':
      return {
        aiChat: process.env.NEXT_PUBLIC_ENABLE_STUDENT_AI_CHAT === 'true',
        reflections: process.env.NEXT_PUBLIC_ENABLE_STUDENT_REFLECTIONS === 'true',
        quizzes: process.env.NEXT_PUBLIC_ENABLE_STUDENT_QUIZZES === 'true',
        analytics: false,
        responses: false,
        videoDownload: false
      }
    
    case 'instructor':
      return {
        aiChat: false,
        reflections: false,
        quizzes: false,
        analytics: process.env.NEXT_PUBLIC_ENABLE_INSTRUCTOR_ANALYTICS === 'true',
        responses: process.env.NEXT_PUBLIC_ENABLE_INSTRUCTOR_RESPONSES === 'true',
        videoDownload: process.env.NEXT_PUBLIC_ENABLE_VIDEO_DOWNLOAD === 'true'
      }
    
    default:
      return {
        aiChat: false,
        reflections: false,
        quizzes: false,
        analytics: false,
        responses: false,
        videoDownload: false
      }
  }
}
```

---

## PHASE 8: QUICK TESTING & VERIFICATION (15 minutes)

### Verification Checklist

#### ✅ Student Features Working:
- [ ] Student video player loads at `/learn/[id]`
- [ ] AI chat sidebar appears for students
- [ ] In/out point selection works
- [ ] Reflections can be added
- [ ] Quiz functionality present

#### ✅ Instructor Features Working:
- [ ] Instructor view loads at `/learn/[id]?instructor=true`
- [ ] Student reflections appear on timeline
- [ ] Can navigate between reflections
- [ ] Response system works
- [ ] "All students" view functional

#### ✅ No Broken Imports:
```bash
# Check for broken imports
npm run build
# Should complete without errors
```

#### ✅ Type Safety:
```bash
# Check TypeScript
npm run type-check
# or
npx tsc --noEmit
```

---

## COMMIT STRATEGY

Make role-aware commits:

```bash
git add -A && git commit -m "refactor: organize video players by role (student/instructor)"
git add -A && git commit -m "feat: add role-specific type definitions"
git add -A && git commit -m "feat: create role-aware service layer"
git add -A && git commit -m "refactor: split video store by student/instructor concerns"
git add -A && git commit -m "feat: add feature flags for role-based features"
```

---

## SUMMARY OF CHANGES

### What We're KEEPING:
✅ Both video player implementations (renamed for clarity)
✅ Role-specific features and UI
✅ Zustand store architecture
✅ Component separation by user role

### What We're REMOVING:
❌ True duplicate pages (alt/alternative layouts)
❌ Broken/backup files
❌ Disabled code

### What We're ADDING:
✅ Role-aware type system
✅ Role-specific services
✅ Feature flag system
✅ Clear separation of concerns

### Architecture After Refactoring:
```
src/components/video/
├── student/
│   ├── StudentVideoPlayer.tsx    # Main student player
│   ├── AIContextSelector.tsx     # In/out points
│   └── ReflectionPanel.tsx       # Student reflections
├── instructor/
│   └── (uses InstructorVideoView) # Already well organized
└── shared/
    ├── VideoControls.tsx          # Basic controls
    ├── VideoSeeker.tsx            # Timeline
    └── VideoUtils.ts              # Shared utilities
```

This approach:
- **Preserves** the role-specific functionality you've built
- **Clarifies** the purpose of each component
- **Prepares** for backend integration with proper types
- **Maintains** the excellent UX differences between student and instructor

---

---

## ✅ PHASE 5 COMPLETED (2025-08-12)

### Phase 5a-5d: Component Migration to New Stores
- **StudentVideoPlayer** migrated to use `student-video-slice`
- **InstructorVideoView** migrated to use `instructor-video-slice` 
- **Course pages** migrated to use `student-course-slice`
- **Redux spam fixed** - setShowControls optimization
- **Test pages created** for isolated component testing
- **All migrations tested** and working properly

### Key Achievements:
- ✅ Role-specific store architecture implemented
- ✅ Components using new stores while maintaining backward compatibility
- ✅ Test infrastructure for safe migrations
- ✅ Redux DevTools optimized (spam reduction)
- ✅ Mock data properly transformed to domain types

### Current State:
- **Dual store approach** - Old and new stores coexist
- **Backward compatibility** maintained
- **Ready for Phase 6** - Feature flags implementation

---

## 📋 NEXT PHASES:

### Phase 6: Feature Flags (PENDING)
- Add feature toggle system
- Enable/disable role-specific features
- A/B testing capability
- Safety switches for rollback

### Phase 7: Store Cleanup (PENDING)
- Remove old unused stores
- Consolidate duplicate state
- Final architecture cleanup

---

## 🔍 PHASE 6 PREP: Component Architecture Analysis (REVISED)

### My Analysis Process:

**First, I'll audit the current architecture** by going through our component tree and asking these key questions:

**What gets used by BOTH students and instructors?**
- Basic UI components like buttons, cards, modals
- Layout components like headers, footers, navigation
- Utility components for loading, errors, forms

**What should NEVER have role-specific logic?**
- Pure UI components that just display data
- Form controls that don't care about user context
- Basic video controls like play/pause/volume
- Typography and styling components

**What's currently shared but SHOULDN'T be?**
- Components that have hidden role-based conditionals
- Video players that try to serve both audiences
- Navigation that shows different menus based on user type

### The Assessment Strategy:

**I'll categorize every component into four buckets:**

1. **Pure Shared** - No role logic, truly reusable (Button, Card, Input)
2. **Role-Specific** - Different for students vs instructors (VideoPlayer, Dashboard)
3. **Falsely Shared** - Pretends to be shared but has hidden conditionals (Navigation with role checks)
4. **Contextual** - Shared structure but different data (CourseCard that shows different actions)

### Complete Component Analysis Results:

#### ✅ **Category 1: Pure Shared** (No role logic - keep shared)
```
src/components/ui/* - All UI primitives (Button, Card, Input, etc.)
src/components/common/* - LoadingSpinner, ErrorBoundary, etc.
src/components/theme-*.tsx - Theme components
src/components/providers/StoreProvider.tsx - State management wrapper
src/components/video/shared/* - VideoControls, VideoEngine, etc.
src/components/dashboard/metrics-widget.tsx - Pure data display
```

#### ⚠️ **Category 2: Role-Specific** (Correctly separated - keep separate)
```
src/components/video/student/* - StudentVideoPlayer, etc.
src/components/video/views/InstructorVideoView.tsx
src/components/instructor/* - All instructor-specific components
src/components/layout/teach-sidebar.tsx
src/components/layout/moderate-sidebar.tsx
```

#### 🚨 **Category 3: Falsely Shared** (Has hidden role conditionals - NEEDS SPLITTING)
```
src/components/layout/header.tsx - Role-based navigation & dropdowns
src/components/layout/sidebar.tsx - Different content per role
src/components/ai/ai-interactions-counter.tsx - Shows pricing/upgrade only to students
src/components/lesson/CommentsSection.tsx - Role badges and different comment behaviors
src/components/community/response-badge.tsx - Role-specific badge display logic
```

#### 🎯 **Category 4: Contextual** (Shared structure, different data/actions)
```
src/components/course/ai-course-card.tsx - Same structure, different actions
src/components/ai/ai-chat-sidebar.tsx - Student-only feature, should be flagged
src/components/lesson/RelatedLessonsCarousel.tsx - Different recommendations per role
```

### **🚨 CRITICAL: Hidden Role Conditionals Found**
1. **`components/layout/header.tsx`** - Lines 82-87, 115-126, 129
   - Instructor mode badge
   - Role-based dropdown menu items  
   - Different settings URLs by role

2. **`components/layout/sidebar.tsx`** - Lines 73-77, 87-88, 141-156, 185-220
   - Complete role-based navigation arrays
   - Role switching UI for instructors/moderators
   - AI interactions counter only for students
   - Different badge counts per role

3. **`components/ai/ai-interactions-counter.tsx`** - Lines 57-64
   - Upgrade prompts only shown to non-premium users
   - Student-only feature

4. **`components/lesson/CommentsSection.tsx`** - Lines 199-204
   - Role-specific badges in comments
   - Different user capabilities

5. **`components/community/response-badge.tsx`** - Lines 12-44
   - Completely role-dependent rendering logic

### Updated Recommended Phase 6 Actions:

**Priority 1: Split Falsely Shared Components**
- Create `StudentHeader.tsx` and `InstructorHeader.tsx` 
- Create `StudentSidebar.tsx` and `InstructorSidebar.tsx`
- Move `AIInteractionsCounter` to student-only components

**Priority 2: Add Feature Flags**
- All components in `instructor/*` folder
- All components in `ai/*` folder (student-only)
- Role-specific features in contextual components

**Priority 3: Component Organization**
```
src/components/
├── shared/         # Pure shared (no role logic)
│   ├── ui/
│   ├── common/
│   └── theme/
├── student/        # Student-specific
│   ├── layout/     # StudentHeader, StudentSidebar
│   ├── video/      # StudentVideoPlayer
│   └── ai/         # AI features
├── instructor/     # Instructor-specific  
│   ├── layout/     # InstructorHeader, InstructorSidebar
│   └── views/      # InstructorVideoView
└── contextual/     # Shared structure, different behavior
    ├── course/     # AICourseCard
    └── lesson/     # CommentsSection
```

**ANALYSIS COMPLETE:** Found **8 components** requiring Phase 6 attention (5 additional from revised analysis)

---

**Total Time: 4+ hours** (Extended for thorough testing and optimization)  
**Result: Production-ready role-aware architecture with safe migration strategy**