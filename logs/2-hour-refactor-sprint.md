# 2-Hour Frontend Refactoring Sprint
## Immediate Actions to Clean Architecture - Execute NOW

## Sprint Goal
Transform the frontend from MVP chaos to production-ready architecture in 2 hours. Focus on removing duplicates, unifying types, and preparing for backend integration.

---

## PHASE 1: DELETE DUPLICATES (15 minutes)

### Step 1.1: Remove Duplicate Video Players
```bash
# Run these commands NOW:
rm src/components/video/VideoPlayerWithHooks.tsx
rm src/components/video/components/VideoEngine.tsx
rm src/components/video/components/VideoSeeker.tsx
rm src/components/video/components/VideoControls.tsx
rm src/components/video/components/TranscriptPanel.tsx
```

### Step 1.2: Remove Alternative Pages
```bash
rm src/app/course/[id]/alt/page.tsx
rm src/app/course/[id]/alternative.tsx
rm src/app/learn/course/[id]/video/[videoId]/experimental/page.tsx
```

### Step 1.3: Remove Broken/Backup Files
```bash
rm src/app/instructor/course/[id]/analytics/page-broken.tsx
rm -rf src/data/repositories-disabled/
```

### Step 1.4: Rename Main Video Player
```bash
mv src/components/video/VideoPlayerRefactored.tsx src/components/video/VideoPlayer.tsx
```

### Step 1.5: Update All Video Player Imports
Search and replace across entire codebase:
- Find: `VideoPlayerRefactored`
- Replace: `VideoPlayer`

- Find: `from "@/components/video/VideoPlayerRefactored"`
- Replace: `from "@/components/video/VideoPlayer"`

---

## PHASE 2: UNIFY TYPES (20 minutes)

### Step 2.1: Create Domain Types File
Create `src/types/domain.ts`:

```typescript
// src/types/domain.ts
// Single source of truth for all domain types

// User & Authentication
export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  role: 'student' | 'instructor' | 'moderator' | 'admin'
  subscription: Subscription
  createdAt: string
  updatedAt: string
}

export interface Subscription {
  id: string
  userId: string
  plan: 'free' | 'basic' | 'pro' | 'team'
  status: 'active' | 'cancelled' | 'expired' | 'trial'
  currentPeriodEnd: string
  aiCredits: number
  aiCreditsUsed: number
  maxCourses: number
  features: string[]
}

// Course & Video
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
  id: string  // This was missing!
  name: string
  email: string
  avatar: string
  bio?: string
  expertise?: string[]
}

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

export interface TranscriptEntry {
  id: string
  start: number
  end: number
  text: string
}

// AI & Chat
export interface AIMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  videoContext?: {
    videoId: string
    timestamp: number
    transcript?: string
  }
}

export interface Reflection {
  id: string
  userId: string
  videoId: string
  content: string
  timestamp: number
  type: 'text' | 'voice' | 'screenshot' | 'loom'
  sentiment?: 'positive' | 'neutral' | 'confused'
  status: 'unresponded' | 'responded'
  response?: string
  createdAt: string
}

// Analytics
export interface VideoProgress {
  userId: string
  videoId: string
  watchedSeconds: number
  totalSeconds: number
  percentComplete: number
  lastWatchedAt: string
  completedAt?: string
}

export interface CourseProgress {
  userId: string
  courseId: string
  videosCompleted: number
  totalVideos: number
  percentComplete: number
  lastAccessedAt: string
  certificateEarnedAt?: string
}

// Service Response Types
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

### Step 2.2: Update Mock Data Types
Update `src/data/mock/courses.ts`:

```typescript
// src/data/mock/courses.ts
import { Course } from '@/types/domain'

export const mockCourses: Course[] = [
  {
    id: 'course-1',
    title: 'React Hooks Mastery',
    description: 'Master React Hooks from basics to advanced patterns',
    thumbnailUrl: '/images/react-hooks.jpg',
    instructor: {
      id: 'inst-1', // Add missing ID
      name: 'Sarah Chen',
      email: 'sarah@unpuzzle.com',
      avatar: '/avatars/sarah.jpg',
      bio: 'Senior React Developer with 10 years experience'
    },
    price: 99,
    duration: 480, // minutes
    difficulty: 'intermediate',
    tags: ['react', 'hooks', 'javascript'],
    videos: [], // Will be populated
    enrollmentCount: 1250,
    rating: 4.8,
    isPublished: true,
    isFree: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
  // ... more courses
]
```

### Step 2.3: Update Store Types to Use Domain
Update each store slice to import from domain:

```typescript
// src/stores/slices/course-slice.ts
import { Course, Video, CourseProgress } from '@/types/domain'

// Remove any local type definitions and use domain types
```

---

## PHASE 3: CREATE API CLIENT (15 minutes)

### Step 3.1: Create API Client
Create `src/lib/api-client.ts`:

```typescript
// src/lib/api-client.ts
interface ApiConfig {
  baseUrl: string
  timeout?: number
  headers?: Record<string, string>
}

interface ApiResponse<T> {
  data?: T
  error?: string
  status: number
}

class ApiClient {
  private config: ApiConfig
  private abortController: AbortController | null = null

  constructor(config?: Partial<ApiConfig>) {
    this.config = {
      baseUrl: process.env.NEXT_PUBLIC_API_URL || '',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
      ...config
    }
  }

  private async getAuthToken(): Promise<string | null> {
    // TODO: Get from Supabase when ready
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token')
    }
    return null
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    // Cancel previous request if exists
    if (this.abortController) {
      this.abortController.abort()
    }

    this.abortController = new AbortController()

    try {
      const token = await this.getAuthToken()
      
      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        ...options,
        signal: this.abortController.signal,
        headers: {
          ...this.config.headers,
          ...options.headers,
          ...(token && { Authorization: `Bearer ${token}` })
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`)
      }

      return { data, status: response.status }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return { error: 'Request cancelled', status: 0 }
        }
        return { error: error.message, status: 500 }
      }
      return { error: 'Unknown error', status: 500 }
    } finally {
      this.abortController = null
    }
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  post<T>(endpoint: string, body: any) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    })
  }

  put<T>(endpoint: string, body: any) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    })
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

// Export singleton instance
export const apiClient = new ApiClient()

// Export for mock/real data switching
export const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true'
```

### Step 3.2: Update Services to Use API Client
Update `src/services/course-service.ts`:

```typescript
// src/services/course-service.ts
import { apiClient, useMockData } from '@/lib/api-client'
import { Course, ServiceResult } from '@/types/domain'
import { mockCourses } from '@/data/mock/courses'

export class CourseService {
  async getCourses(): Promise<ServiceResult<Course[]>> {
    if (useMockData) {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 300))
      return { data: mockCourses }
    }

    const response = await apiClient.get<Course[]>('/courses')
    return response.error 
      ? { error: response.error }
      : { data: response.data }
  }

  async getCourse(id: string): Promise<ServiceResult<Course>> {
    if (useMockData) {
      await new Promise(resolve => setTimeout(resolve, 300))
      const course = mockCourses.find(c => c.id === id)
      return course 
        ? { data: course }
        : { error: 'Course not found' }
    }

    const response = await apiClient.get<Course>(`/courses/${id}`)
    return response.error
      ? { error: response.error }
      : { data: response.data }
  }

  async enrollInCourse(courseId: string): Promise<ServiceResult<boolean>> {
    if (useMockData) {
      await new Promise(resolve => setTimeout(resolve, 500))
      return { data: true }
    }

    const response = await apiClient.post<boolean>(`/courses/${courseId}/enroll`, {})
    return response.error
      ? { error: response.error }
      : { data: response.data }
  }
}

export const courseService = new CourseService()
```

---

## PHASE 4: SPLIT VIDEO SLICE (20 minutes)

### Step 4.1: Create Video Playback Slice
Create `src/stores/slices/video-playback-slice.ts`:

```typescript
// src/stores/slices/video-playback-slice.ts
import { StateCreator } from 'zustand'

export interface VideoPlaybackSlice {
  // Core playback state
  currentVideoId: string | null
  currentTime: number
  duration: number
  isPlaying: boolean
  isBuffering: boolean
  playbackRate: number
  volume: number
  
  // Actions
  play: () => void
  pause: () => void
  seek: (time: number) => void
  setPlaybackRate: (rate: number) => void
  setVolume: (volume: number) => void
  setVideo: (videoId: string, duration: number) => void
  updateProgress: (time: number) => void
}

export const createVideoPlaybackSlice: StateCreator<VideoPlaybackSlice> = (set) => ({
  currentVideoId: null,
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  isBuffering: false,
  playbackRate: 1,
  volume: 1,

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  
  seek: (time) => set({ currentTime: time }),
  
  setPlaybackRate: (rate) => set({ playbackRate: rate }),
  
  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
  
  setVideo: (videoId, duration) => set({
    currentVideoId: videoId,
    duration,
    currentTime: 0,
    isPlaying: false
  }),
  
  updateProgress: (time) => set({ currentTime: time })
})
```

### Step 4.2: Create Video UI Slice
Create `src/stores/slices/video-ui-slice.ts`:

```typescript
// src/stores/slices/video-ui-slice.ts
import { StateCreator } from 'zustand'

export interface VideoUISlice {
  // UI state
  showTranscript: boolean
  showControls: boolean
  isFullscreen: boolean
  selectedQuality: 'auto' | '1080p' | '720p' | '480p'
  captionsEnabled: boolean
  
  // Actions
  toggleTranscript: () => void
  toggleControls: () => void
  toggleFullscreen: () => void
  setQuality: (quality: string) => void
  toggleCaptions: () => void
}

export const createVideoUISlice: StateCreator<VideoUISlice> = (set) => ({
  showTranscript: true,
  showControls: true,
  isFullscreen: false,
  selectedQuality: 'auto',
  captionsEnabled: false,

  toggleTranscript: () => set((state) => ({ 
    showTranscript: !state.showTranscript 
  })),
  
  toggleControls: () => set((state) => ({ 
    showControls: !state.showControls 
  })),
  
  toggleFullscreen: () => set((state) => ({ 
    isFullscreen: !state.isFullscreen 
  })),
  
  setQuality: (quality) => set({ 
    selectedQuality: quality as VideoUISlice['selectedQuality'] 
  }),
  
  toggleCaptions: () => set((state) => ({ 
    captionsEnabled: !state.captionsEnabled 
  }))
})
```

### Step 4.3: Update Main Store
Update `src/stores/app-store.ts`:

```typescript
// src/stores/app-store.ts
import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'

// Import new slices
import { VideoPlaybackSlice, createVideoPlaybackSlice } from './slices/video-playback-slice'
import { VideoUISlice, createVideoUISlice } from './slices/video-ui-slice'
// ... other imports

type AppStore = 
  & VideoPlaybackSlice
  & VideoUISlice
  & UserSlice
  & CourseSlice
  & AISlice
  // ... other slices

export const useAppStore = create<AppStore>()(
  devtools(
    subscribeWithSelector((...args) => ({
      ...createVideoPlaybackSlice(...args),
      ...createVideoUISlice(...args),
      ...createUserSlice(...args),
      ...createCourseSlice(...args),
      ...createAISlice(...args),
      // ... other slices
    }))
  )
)
```

---

## PHASE 5: DECOUPLE COMPONENTS (20 minutes)

### Step 5.1: Create Video Player Container
Create `src/components/video/VideoPlayerContainer.tsx`:

```typescript
// src/components/video/VideoPlayerContainer.tsx
'use client'

import { useAppStore } from '@/stores/app-store'
import { VideoPlayer } from './VideoPlayer'
import { useEffect } from 'react'

interface VideoPlayerContainerProps {
  videoId: string
  videoUrl: string
  duration?: number
}

export function VideoPlayerContainer({ 
  videoId, 
  videoUrl,
  duration = 0 
}: VideoPlayerContainerProps) {
  const {
    currentTime,
    isPlaying,
    playbackRate,
    volume,
    play,
    pause,
    seek,
    setPlaybackRate,
    setVolume,
    setVideo,
    updateProgress
  } = useAppStore()

  useEffect(() => {
    setVideo(videoId, duration)
  }, [videoId, duration, setVideo])

  return (
    <VideoPlayer
      videoUrl={videoUrl}
      currentTime={currentTime}
      duration={duration}
      isPlaying={isPlaying}
      playbackRate={playbackRate}
      volume={volume}
      onPlay={play}
      onPause={pause}
      onSeek={seek}
      onPlaybackRateChange={setPlaybackRate}
      onVolumeChange={setVolume}
      onProgress={updateProgress}
    />
  )
}
```

### Step 5.2: Update Video Player to Be Pure
Update the main VideoPlayer component to accept props instead of using store directly:

```typescript
// src/components/video/VideoPlayer.tsx
// At the top of the file, change from store usage to props

interface VideoPlayerProps {
  videoUrl: string
  currentTime: number
  duration: number
  isPlaying: boolean
  playbackRate: number
  volume: number
  onPlay: () => void
  onPause: () => void
  onSeek: (time: number) => void
  onPlaybackRateChange: (rate: number) => void
  onVolumeChange: (volume: number) => void
  onProgress: (time: number) => void
}

export function VideoPlayer(props: VideoPlayerProps) {
  // Remove all useAppStore calls
  // Use props instead
  
  // Example change:
  // Before: const { isPlaying } = useAppStore()
  // After: const { isPlaying } = props
}
```

### Step 5.3: Update Page Components to Use Container
Update pages that use VideoPlayer:

```typescript
// src/app/learn/[id]/page.tsx
// Change from:
import { VideoPlayer } from '@/components/video/VideoPlayer'

// To:
import { VideoPlayerContainer } from '@/components/video/VideoPlayerContainer'

// In the component:
<VideoPlayerContainer 
  videoId={lesson.id}
  videoUrl={lesson.videoUrl}
  duration={lesson.duration}
/>
```

---

## PHASE 6: REMOVE HARDCODED DATA (20 minutes)

### Step 6.1: Create Data Hooks
Create `src/hooks/useCourseData.ts`:

```typescript
// src/hooks/useCourseData.ts
import { useEffect } from 'react'
import { useAppStore } from '@/stores/app-store'

export function useCourseData(courseId?: string) {
  const {
    courses,
    currentCourse,
    isLoading,
    error,
    loadCourses,
    loadCourse
  } = useAppStore()

  useEffect(() => {
    if (courseId) {
      loadCourse(courseId)
    } else {
      loadCourses()
    }
  }, [courseId, loadCourse, loadCourses])

  return {
    courses,
    currentCourse,
    isLoading,
    error
  }
}

export function useVideoData(videoId: string) {
  const { currentCourse } = useAppStore()
  
  const video = currentCourse?.videos.find(v => v.id === videoId)
  
  return {
    video,
    isLoading: !video,
    error: !video ? 'Video not found' : null
  }
}
```

### Step 6.2: Remove Hardcoded Data from Components
Find and replace hardcoded arrays in components:

```typescript
// BEFORE: Component with hardcoded data
const CourseList = () => {
  const courses = [
    { id: '1', title: 'React' },
    { id: '2', title: 'Vue' }
  ]
  return <div>{/* render */}</div>
}

// AFTER: Component using hook
const CourseList = () => {
  const { courses, isLoading, error } = useCourseData()
  
  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />
  
  return <div>{/* render courses */}</div>
}
```

---

## PHASE 7: ERROR HANDLING (10 minutes)

### Step 7.1: Create Data Loader Component
Create `src/components/common/DataLoader.tsx`:

```typescript
// src/components/common/DataLoader.tsx
import { LoadingSpinner } from './LoadingSpinner'
import { ErrorMessage } from './ErrorMessage'

interface DataLoaderProps<T> {
  data: T | null | undefined
  isLoading?: boolean
  error?: string | null
  children: (data: T) => React.ReactNode
  loadingText?: string
  emptyText?: string
}

export function DataLoader<T>({
  data,
  isLoading = false,
  error = null,
  children,
  loadingText = 'Loading...',
  emptyText = 'No data available'
}: DataLoaderProps<T>) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <LoadingSpinner />
        <p className="mt-2 text-sm text-muted-foreground">{loadingText}</p>
      </div>
    )
  }

  if (error) {
    return <ErrorMessage error={error} />
  }

  if (!data) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyText}
      </div>
    )
  }

  return <>{children(data)}</>
}
```

### Step 7.2: Use DataLoader in Components
```typescript
// Example usage
const CourseDetails = ({ courseId }: { courseId: string }) => {
  const { currentCourse, isLoading, error } = useCourseData(courseId)
  
  return (
    <DataLoader 
      data={currentCourse}
      isLoading={isLoading}
      error={error}
      loadingText="Loading course..."
    >
      {(course) => (
        <div>
          <h1>{course.title}</h1>
          <p>{course.description}</p>
        </div>
      )}
    </DataLoader>
  )
}
```

---

## PHASE 8: ENVIRONMENT CONFIG (10 minutes)

### Step 8.1: Create .env.local
Create `.env.local` file:

```bash
# API Configuration
NEXT_PUBLIC_USE_MOCK_DATA=true
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# Supabase (for later)
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Video CDN (for later)
NEXT_PUBLIC_BUNNY_CDN_URL=https://your-cdn.b-cdn.net

# Feature Flags
NEXT_PUBLIC_ENABLE_AI_CHAT=true
NEXT_PUBLIC_ENABLE_REFLECTIONS=true
```

### Step 8.2: Create Config File
Create `src/config/app.config.ts`:

```typescript
// src/config/app.config.ts
export const appConfig = {
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || '',
    useMockData: process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true',
    timeout: 30000
  },
  features: {
    aiChat: process.env.NEXT_PUBLIC_ENABLE_AI_CHAT === 'true',
    reflections: process.env.NEXT_PUBLIC_ENABLE_REFLECTIONS === 'true'
  },
  cdn: {
    videoUrl: process.env.NEXT_PUBLIC_BUNNY_CDN_URL || ''
  }
}

// Helper to check if we're in development
export const isDevelopment = process.env.NODE_ENV === 'development'

// Helper to check if we're using mock data
export const isUsingMockData = appConfig.api.useMockData
```

---

## VERIFICATION CHECKLIST

After completing all steps, verify:

### ✅ Files Deleted
- [ ] No VideoPlayerWithHooks.tsx
- [ ] No alternative.tsx or alt pages
- [ ] No broken/backup files
- [ ] No disabled repositories folder

### ✅ Types Unified
- [ ] domain.ts created with all types
- [ ] Mock data uses domain types
- [ ] Stores import from domain.ts
- [ ] No duplicate type definitions

### ✅ API Client Ready
- [ ] api-client.ts created
- [ ] Services updated to use API client
- [ ] Mock/real data toggle works

### ✅ Video Slice Split
- [ ] video-playback-slice.ts created
- [ ] video-ui-slice.ts created
- [ ] Old video slice removed/updated

### ✅ Components Decoupled
- [ ] VideoPlayerContainer created
- [ ] VideoPlayer accepts props only
- [ ] Pages use Container component

### ✅ No Hardcoded Data
- [ ] Data hooks created
- [ ] Components use hooks/store
- [ ] No hardcoded arrays in components

### ✅ Error Handling
- [ ] DataLoader component created
- [ ] Components handle loading/error states
- [ ] Consistent error UI

### ✅ Environment Config
- [ ] .env.local created
- [ ] app.config.ts created
- [ ] Mock data toggleable

---

## TESTING THE REFACTOR

### Quick Smoke Test (5 minutes)
1. **Start the app**: `npm run dev`
2. **Check console**: No errors or warnings
3. **Navigate to**:
   - `/courses` - Should show course list
   - `/learn/[id]` - Should show video player
   - `/instructor` - Should show dashboard
4. **Test video player**: Play, pause, seek should work
5. **Check network tab**: No 404s for removed files

### If Something Breaks
1. Check import paths are updated
2. Verify store is properly connected
3. Check domain types match usage
4. Review error messages in console

---

## COMMIT STRATEGY

Make focused commits after each phase:

```bash
git add -A && git commit -m "refactor: remove duplicate components and pages"
git add -A && git commit -m "refactor: unify types with domain.ts"
git add -A && git commit -m "feat: add API client for backend integration"
git add -A && git commit -m "refactor: split video slice into focused slices"
git add -A && git commit -m "refactor: decouple VideoPlayer from store"
git add -A && git commit -m "refactor: remove hardcoded mock data"
git add -A && git commit -m "feat: add consistent error handling"
git add -A && git commit -m "feat: add environment configuration"
```

---

## WHAT'S NEXT AFTER THIS SPRINT

Once this 2-hour sprint is complete, you'll have:
- **Clean codebase** with no duplicates
- **Type-safe** architecture
- **Backend-ready** service layer
- **Decoupled** components
- **Consistent** error handling

Next steps (not today):
1. Connect Supabase authentication
2. Replace mock data with real API calls
3. Add real-time subscriptions
4. Implement payment processing
5. Deploy to production

---

## START NOW!

Begin with Phase 1 - deleting files takes seconds and gives immediate cleanup. Each phase builds on the previous one. If you get stuck, move to the next phase and come back.

**Time to start: NOW**
**Expected completion: 2 hours**
**Result: Production-ready frontend architecture**

---
*Document created for immediate execution*
*No weeks, no days - just DO IT NOW!*