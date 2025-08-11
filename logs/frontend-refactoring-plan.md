# Frontend Refactoring Plan for Backend Integration
## Unpuzzle MVP - Clean Architecture Strategy

## Executive Decision: **KEEP ZUSTAND** ✅

After thorough analysis, **Zustand should be retained** over Redux Toolkit because:
- **Smaller bundle size** (8KB vs 40KB)
- **Simpler API** with less boilerplate
- **Better TypeScript integration** already implemented
- **Performance optimized** with selective subscriptions
- **Clean slice pattern** already in place

## Phase 1: Immediate Cleanup (Day 1-2)

### 1.1 Remove Duplicate Components & Pages

```bash
# Files to DELETE immediately:
rm src/components/video/VideoPlayerWithHooks.tsx
rm src/components/video/components/VideoEngine.tsx  # If unused
rm src/app/course/[id]/alt/page.tsx
rm src/app/course/[id]/alternative.tsx
rm src/app/learn/[id]/page.broken.backup.tsx
rm src/app/instructor/course/[id]/analytics/page-broken.tsx
rm src/app/student/community/page-original.tsx
rm -rf src/data/repositories-disabled/  # Clean up disabled code
```

### 1.2 Consolidate Video Player Implementation

**Keep:** `VideoPlayerRefactored.tsx` as the single video player
**Update imports across the codebase:**

```typescript
// Before (multiple imports)
import VideoPlayer from '@/components/video/video-player'
import { VideoPlayerWithHooks } from '@/components/video/VideoPlayerWithHooks'
import { VideoPlayerRefactored } from '@/components/video/VideoPlayerRefactored'

// After (single import)
import { VideoPlayer } from '@/components/video/VideoPlayer'
```

**Rename for clarity:**
```bash
mv src/components/video/VideoPlayerRefactored.tsx src/components/video/VideoPlayer.tsx
```

## Phase 2: Type Unification (Day 3-4)

### 2.1 Create Single Source of Truth for Types

Create new unified type definitions:

```typescript
// src/types/domain.ts - Domain models (match backend exactly)
export interface Course {
  id: string
  title: string
  description: string
  thumbnailUrl: string
  instructor: {
    id: string  // ✅ Add missing field
    name: string
    email: string
    avatar: string
  }
  price: number
  duration: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  tags: string[]
  videos: Video[]
  createdAt: string
  updatedAt: string
  publishedAt: string | null
  isPublished: boolean
  enrollmentCount: number
}

export interface Video {
  id: string
  courseId: string
  title: string
  description: string
  duration: number
  order: number
  videoUrl: string  // Will be from Bunny.net
  transcriptUrl?: string
  thumbnailUrl?: string
  createdAt: string
  updatedAt: string
}

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
  status: 'active' | 'cancelled' | 'expired'
  currentPeriodEnd: string
  aiCredits: number
  aiCreditsUsed: number
}
```

### 2.2 Update Store Types to Use Domain Types

```typescript
// src/stores/slices/course-slice.ts
import { Course, Video } from '@/types/domain'

interface CourseSlice {
  courses: Course[]  // Use domain type
  currentCourse: Course | null
  loadCourses: () => Promise<void>
  // ... rest of slice
}
```

### 2.3 Fix Mock Data Types

```typescript
// src/data/mock/courses.ts
import { Course } from '@/types/domain'

export const mockCourses: Course[] = [
  {
    id: 'course-1',
    instructor: {
      id: 'instructor-1',  // ✅ Add missing id
      name: 'Sarah Chen',
      email: 'sarah@example.com',
      avatar: '/avatars/sarah.jpg'
    },
    // ... rest matching domain type exactly
  }
]
```

## Phase 3: Service Layer Refactoring (Day 5-6)

### 3.1 Create Unified API Client

```typescript
// src/lib/api-client.ts
export interface ApiResponse<T> {
  data?: T
  error?: string
  status: number
}

export class ApiClient {
  private baseUrl: string
  private headers: HeadersInit
  
  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || ''
    this.headers = {
      'Content-Type': 'application/json',
    }
  }
  
  private async getAuthToken(): Promise<string | null> {
    // Get token from Supabase auth
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  }
  
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const token = await this.getAuthToken()
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          ...this.headers,
          ...options.headers,
          ...(token && { Authorization: `Bearer ${token}` })
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      return { data, status: response.status }
      
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 500 
      }
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

export const apiClient = new ApiClient()
```

### 3.2 Update Services for Backend Integration

```typescript
// src/services/course-service.ts
import { apiClient } from '@/lib/api-client'
import { Course } from '@/types/domain'
import { mockCourses } from '@/data/mock/courses'

export class CourseService {
  private useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true'
  
  async getCourses(): Promise<ServiceResult<Course[]>> {
    if (this.useMockData) {
      // Return mock data during development
      return { data: mockCourses }
    }
    
    // Real API call
    const response = await apiClient.get<Course[]>('/courses')
    
    if (response.error) {
      return { error: response.error }
    }
    
    return { data: response.data }
  }
  
  async getCourse(id: string): Promise<ServiceResult<Course>> {
    if (this.useMockData) {
      const course = mockCourses.find(c => c.id === id)
      return course ? { data: course } : { error: 'Course not found' }
    }
    
    const response = await apiClient.get<Course>(`/courses/${id}`)
    
    if (response.error) {
      return { error: response.error }
    }
    
    return { data: response.data }
  }
  
  async createCourse(course: Partial<Course>): Promise<ServiceResult<Course>> {
    if (this.useMockData) {
      // Mock creation
      const newCourse = { ...course, id: `course-${Date.now()}` } as Course
      return { data: newCourse }
    }
    
    const response = await apiClient.post<Course>('/courses', course)
    
    if (response.error) {
      return { error: response.error }
    }
    
    return { data: response.data }
  }
}

export const courseService = new CourseService()
```

## Phase 4: Store Refactoring (Day 7-8)

### 4.1 Split Overloaded Video Slice

Current video slice has 26 properties - split into focused slices:

```typescript
// src/stores/slices/video-playback-slice.ts
interface VideoPlaybackSlice {
  // Core playback state
  currentVideoId: string | null
  currentTime: number
  duration: number
  isPlaying: boolean
  isBuffering: boolean
  playbackRate: number
  volume: number
  
  // Core playback actions
  play: () => void
  pause: () => void
  seek: (time: number) => void
  setPlaybackRate: (rate: number) => void
  setVolume: (volume: number) => void
}

// src/stores/slices/video-ui-slice.ts
interface VideoUISlice {
  // UI state
  showTranscript: boolean
  showControls: boolean
  isFullscreen: boolean
  selectedQuality: string
  
  // UI actions
  toggleTranscript: () => void
  toggleControls: () => void
  toggleFullscreen: () => void
  setQuality: (quality: string) => void
}

// src/stores/slices/video-transcript-slice.ts
interface VideoTranscriptSlice {
  // Transcript state
  transcript: TranscriptEntry[]
  currentTranscriptIndex: number
  searchQuery: string
  
  // Transcript actions
  loadTranscript: (videoId: string) => Promise<void>
  searchTranscript: (query: string) => void
  jumpToTranscript: (index: number) => void
}
```

### 4.2 Update Store with Backend Integration

```typescript
// src/stores/slices/course-slice.ts
import { courseService } from '@/services/course-service'
import { Course } from '@/types/domain'

interface CourseSlice {
  courses: Course[]
  currentCourse: Course | null
  isLoading: boolean
  error: string | null
  
  loadCourses: () => Promise<void>
  loadCourse: (id: string) => Promise<void>
  createCourse: (course: Partial<Course>) => Promise<void>
}

const createCourseSlice: StateCreator<CourseSlice> = (set, get) => ({
  courses: [],
  currentCourse: null,
  isLoading: false,
  error: null,
  
  loadCourses: async () => {
    set({ isLoading: true, error: null })
    
    const result = await courseService.getCourses()
    
    if (result.error) {
      set({ error: result.error, isLoading: false })
      return
    }
    
    set({ courses: result.data || [], isLoading: false })
  },
  
  loadCourse: async (id: string) => {
    set({ isLoading: true, error: null })
    
    const result = await courseService.getCourse(id)
    
    if (result.error) {
      set({ error: result.error, isLoading: false })
      return
    }
    
    set({ currentCourse: result.data || null, isLoading: false })
  },
  
  createCourse: async (course: Partial<Course>) => {
    set({ isLoading: true, error: null })
    
    const result = await courseService.createCourse(course)
    
    if (result.error) {
      set({ error: result.error, isLoading: false })
      return
    }
    
    // Optimistically update local state
    set((state) => ({
      courses: [...state.courses, result.data!],
      isLoading: false
    }))
  }
})
```

## Phase 5: Component Decoupling (Day 9-10)

### 5.1 Create Container/Presentation Pattern

```typescript
// src/components/video/VideoPlayerContainer.tsx
'use client'

import { useAppStore } from '@/stores/app-store'
import { VideoPlayer } from './VideoPlayer'

export function VideoPlayerContainer({ videoId }: { videoId: string }) {
  // All store interactions in container
  const {
    currentTime,
    duration,
    isPlaying,
    play,
    pause,
    seek
  } = useAppStore((state) => ({
    currentTime: state.currentTime,
    duration: state.duration,
    isPlaying: state.isPlaying,
    play: state.play,
    pause: state.pause,
    seek: state.seek
  }))
  
  return (
    <VideoPlayer
      videoId={videoId}
      currentTime={currentTime}
      duration={duration}
      isPlaying={isPlaying}
      onPlay={play}
      onPause={pause}
      onSeek={seek}
    />
  )
}

// src/components/video/VideoPlayer.tsx
interface VideoPlayerProps {
  videoId: string
  currentTime: number
  duration: number
  isPlaying: boolean
  onPlay: () => void
  onPause: () => void
  onSeek: (time: number) => void
}

export function VideoPlayer(props: VideoPlayerProps) {
  // Pure presentation component - no store dependencies
  // Easy to test, reuse, and maintain
}
```

### 5.2 Extract Business Logic to Custom Hooks

```typescript
// src/hooks/useVideoPlayer.ts
export function useVideoPlayer(videoId: string) {
  const store = useAppStore()
  
  const state = {
    currentTime: store.currentTime,
    duration: store.duration,
    isPlaying: store.isPlaying,
    isBuffering: store.isBuffering
  }
  
  const actions = {
    play: store.play,
    pause: store.pause,
    seek: store.seek,
    togglePlayPause: () => {
      state.isPlaying ? store.pause() : store.play()
    }
  }
  
  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        actions.togglePlayPause()
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [state.isPlaying])
  
  return { ...state, ...actions }
}

// Usage in component
export function VideoPlayerWithHook({ videoId }: { videoId: string }) {
  const player = useVideoPlayer(videoId)
  
  return (
    <VideoPlayer {...player} />
  )
}
```

## Phase 6: Data Flow Optimization (Day 11-12)

### 6.1 Implement Single Source of Truth Pattern

```typescript
// src/lib/data-manager.ts
class DataManager {
  private cache = new Map<string, any>()
  private subscribers = new Map<string, Set<Function>>()
  
  // Single point for all data updates
  async fetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key)
    }
    
    // Fetch and cache
    const data = await fetcher()
    this.cache.set(key, data)
    
    // Notify subscribers
    this.notifySubscribers(key, data)
    
    return data
  }
  
  subscribe(key: string, callback: Function) {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set())
    }
    this.subscribers.get(key)!.add(callback)
    
    // Return unsubscribe function
    return () => {
      this.subscribers.get(key)?.delete(callback)
    }
  }
  
  private notifySubscribers(key: string, data: any) {
    this.subscribers.get(key)?.forEach(callback => callback(data))
  }
  
  invalidate(key: string) {
    this.cache.delete(key)
  }
  
  invalidateAll() {
    this.cache.clear()
  }
}

export const dataManager = new DataManager()
```

### 6.2 Update Stores to Use Data Manager

```typescript
// src/stores/slices/course-slice.ts
const createCourseSlice: StateCreator<CourseSlice> = (set, get) => ({
  loadCourses: async () => {
    set({ isLoading: true })
    
    const courses = await dataManager.fetch(
      'courses',
      () => courseService.getCourses().then(r => r.data)
    )
    
    set({ courses, isLoading: false })
  }
})
```

## Phase 7: Remove Hardcoded Mock Data (Day 13-14)

### 7.1 Create Environment-Based Configuration

```typescript
// .env.local
NEXT_PUBLIC_USE_MOCK_DATA=true  # Set to false when backend is ready
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 7.2 Update Components to Remove Hardcoded Data

```typescript
// BEFORE: Hardcoded mock data in component
const VideoList = () => {
  const videos = [
    { id: '1', title: 'Introduction' },
    { id: '2', title: 'Getting Started' }
  ]
  
  return <div>{/* render videos */}</div>
}

// AFTER: Data from store/props
const VideoList = ({ courseId }: { courseId: string }) => {
  const videos = useAppStore(state => 
    state.courses.find(c => c.id === courseId)?.videos || []
  )
  
  return <div>{/* render videos */}</div>
}
```

## Phase 8: Error Handling & Loading States (Day 15-16)

### 8.1 Add Consistent Error Handling

```typescript
// src/components/common/DataLoader.tsx
interface DataLoaderProps<T> {
  data: T | null
  isLoading: boolean
  error: string | null
  children: (data: T) => React.ReactNode
  loadingComponent?: React.ReactNode
  errorComponent?: React.ReactNode
}

export function DataLoader<T>({
  data,
  isLoading,
  error,
  children,
  loadingComponent = <LoadingSpinner />,
  errorComponent
}: DataLoaderProps<T>) {
  if (isLoading) return <>{loadingComponent}</>
  if (error) return <>{errorComponent || <ErrorMessage error={error} />}</>
  if (!data) return null
  
  return <>{children(data)}</>
}

// Usage
const CourseList = () => {
  const { courses, isLoading, error } = useAppStore()
  
  return (
    <DataLoader
      data={courses}
      isLoading={isLoading}
      error={error}
    >
      {(courses) => (
        <div>
          {courses.map(course => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </DataLoader>
  )
}
```

## Implementation Timeline

### Week 1: Cleanup & Types
- Day 1-2: Remove duplicates, consolidate components
- Day 3-4: Unify type definitions
- Day 5-6: Refactor service layer

### Week 2: Architecture
- Day 7-8: Refactor store structure
- Day 9-10: Decouple components
- Day 11-12: Optimize data flow

### Week 3: Polish
- Day 13-14: Remove hardcoded data
- Day 15-16: Add error handling
- Day 17-18: Testing & documentation

## Checklist for Backend Integration Readiness

### Pre-Backend Checklist:
- [ ] All duplicate components removed
- [ ] Single video player implementation
- [ ] Unified type definitions matching backend schema
- [ ] Service layer with API client ready
- [ ] Store refactored with loading/error states
- [ ] Components decoupled from store
- [ ] Mock data centralized and toggleable
- [ ] Error boundaries implemented
- [ ] Loading states consistent
- [ ] Environment variables configured

### Backend Integration Steps:
1. **Update environment variables** to point to real API
2. **Toggle USE_MOCK_DATA** to false
3. **Test service layer** with real endpoints
4. **Add authentication** token management
5. **Implement real-time** subscriptions
6. **Add error recovery** mechanisms

## File Structure After Refactoring

```
src/
├── app/                    # Next.js app router
│   ├── (auth)/            # Auth layout group
│   ├── (dashboard)/       # Dashboard layout group
│   └── api/               # API routes
├── components/
│   ├── common/            # Shared components
│   ├── course/            # Course-specific
│   ├── video/             # Video player (single)
│   └── ai/                # AI chat components
├── hooks/                 # Custom React hooks
│   ├── useVideoPlayer.ts
│   ├── useAuth.ts
│   └── useCourse.ts
├── lib/                   # Utilities & clients
│   ├── api-client.ts
│   ├── data-manager.ts
│   └── supabase.ts
├── services/              # Service layer
│   ├── course-service.ts
│   ├── user-service.ts
│   └── ai-service.ts
├── stores/                # Zustand stores
│   ├── app-store.ts
│   └── slices/
│       ├── course-slice.ts
│       ├── user-slice.ts
│       └── video-playback-slice.ts
├── types/                 # TypeScript types
│   ├── domain.ts         # Domain models
│   ├── api.ts           # API types
│   └── ui.ts            # UI-specific types
└── data/
    └── mock/             # Mock data (dev only)
```

## Final Recommendations

### DO:
✅ **Keep Zustand** - it's working well
✅ **Unify types first** - prevents bugs
✅ **Clean duplicates immediately** - reduces confusion
✅ **Use container pattern** - improves testability
✅ **Centralize API calls** - easier to switch backends

### DON'T:
❌ **Don't switch to Redux** - unnecessary complexity
❌ **Don't refactor everything at once** - incremental approach
❌ **Don't mix concerns** - keep UI and logic separate
❌ **Don't hardcode data** - use service layer
❌ **Don't skip error handling** - add it from start

## Success Metrics

After refactoring, you should have:
- **50% less code** through duplicate removal
- **Single source of truth** for all data types
- **100% type safety** across the application
- **< 5 minute** backend integration time
- **Zero hardcoded** mock data in components
- **Clean separation** between UI and business logic

---
*Document created: August 11, 2025*
*Estimated completion: 3 weeks with focused effort*