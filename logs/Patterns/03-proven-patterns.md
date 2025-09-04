# Proven Patterns - Unpuzzle MVP

This document outlines the patterns that have been successfully implemented and are working in production with real API/database connections (not mock data).

## 1. Role-Based Switching Pattern (Instructor ↔ Student)

### Implementation
- **Cookie-based active role**: Uses `active-role` cookie to track current viewing mode
- **Database role validation**: Checks user's actual role in the database before allowing switches
- **API Endpoint**: `/api/switch-role/route.ts` handles role switching

### Key Components
```typescript
// Header component checks both active role and database role
const userRole = getUserRole(user) // Gets active role from cookie
const userDatabaseRole = profile?.role || user?.user_metadata?.role // Gets actual role from DB

// Only instructors can switch roles
{userDatabaseRole === 'instructor' && (
  <DropdownMenuItem onSelect={(e) => {
    e.preventDefault()
    handleRoleSwitch(targetRole)
  }}>
)}
```

### Important Notes
- Uses `onSelect` with `e.preventDefault()` for DropdownMenuItem (not `onClick`)
- Validates permissions server-side before allowing role switch
- Redirects to appropriate dashboard after switching

## 2. Header Flash Fix Pattern (SSR/Hydration)

### Problem
Login/Signup buttons would flash during hydration even when user was authenticated.

### Solution - Three-State Loading Pattern
```typescript
// 1. Show loading state during SSR and initial hydration
if (!hydrated || (loading && !user)) {
  return <LoadingHeader /> // Skeleton UI
}

// 2. Use localStorage for optimistic UI
const getInitialState = () => {
  if (typeof window === 'undefined') {
    return { user: null, profile: null, loading: false }
  }
  
  const storedUser = localStorage.getItem('unpuzzle-user')
  return {
    user: storedUser ? JSON.parse(storedUser) : null,
    loading: true // Always verify with server
  }
}

// 3. Verify with Supabase on mount
useEffect(() => {
  initializeAuth() // Checks real session
}, [])
```

### Key Principles
- Never show auth UI during loading states
- Use localStorage for immediate UI state
- Always verify with server in background
- Clean separation between SSR and client state

## 3. Course CRUD Pattern

### Architecture
```
UI Layer → Zustand Store → Service Layer → Supabase
```

### Implementation
```typescript
// Store Pattern (instructor-slice.ts)
loadCourses: async (instructorId?: string) => {
  set({ loading: true, error: null })
  
  try {
    // Feature flag for real vs mock data
    if (FEATURES.USE_REAL_COURSES_DATA && instructorId) {
      courses = await supabaseCourseService.getInstructorCourses(instructorId)
    } else {
      courses = mockCourses // Fallback
    }
    set({ courses, loading: false })
  } catch (error) {
    // Graceful fallback to mock data
    if (FEATURES.FALLBACK_TO_MOCK_ON_ERROR) {
      set({ courses: mockCourses, loading: false })
    }
  }
}
```

### Service Layer Pattern
```typescript
// services/supabase-courses.service.ts
async getInstructorCourses(instructorId: string) {
  const { data, error } = await supabase
    .from('courses')
    .select(`
      *,
      course_stats (
        total_students,
        average_rating,
        completion_rate
      )
    `)
    .eq('instructor_id', instructorId)
    .order('created_at', { ascending: false })
    
  if (error) throw error
  return data
}
```

### Key Features
- Graceful fallbacks to mock data
- Feature flags for progressive enhancement
- Optimistic updates for better UX
- Comprehensive error handling

## 4. Video Upload Pattern (Backblaze B2 + Bunny CDN)

### Architecture
```
Client → Next.js API → Backblaze B2 (Storage) → Bunny CDN (Delivery)
```

### Upload Flow
```typescript
// 1. Client initiates upload
const formData = new FormData()
formData.append('file', videoFile)
formData.append('courseId', courseId)
formData.append('chapterId', chapterId)

// 2. API Route handles upload (/api/upload/video)
const b2 = new B2({
  applicationKeyId: process.env.B2_KEY_ID,
  applicationKey: process.env.B2_APPLICATION_KEY
})

// 3. Upload to B2
await b2.authorize()
const uploadUrl = await b2.getUploadUrl(bucketId)
const result = await b2.uploadFile({
  uploadUrl,
  fileName: `courses/${courseId}/${fileName}`,
  data: buffer
})

// 4. Save CDN URL to database
const cdnUrl = `https://unpuzzle.b-cdn.net/${result.fileName}`
await supabase.from('course_videos').insert({
  course_id: courseId,
  cdn_url: cdnUrl,
  b2_file_id: result.fileId
})
```

### Key Features
- Direct B2 integration for cost-effective storage
- Bunny CDN for global distribution
- Progress tracking during uploads
- Automatic retry on failure
- Secure signed URLs for private content

## 5. Authentication State Management Pattern

### Zustand + Supabase Auth
```typescript
// Central auth slice with persistence
export const createAuthSlice = () => ({
  user: null,
  profile: null,
  loading: true,
  
  initializeAuth: async () => {
    // 1. Check Supabase session
    const { data: { session } } = await supabase.auth.getSession()
    
    // 2. Set user if exists
    if (session?.user) {
      set({ user: session.user })
      
      // 3. Fetch profile from database
      const profile = await fetchProfile(session.user.id)
      set({ profile })
    }
    
    set({ loading: false })
  },
  
  // Persist to localStorage on change
  subscribe: (state) => {
    if (state.user) {
      localStorage.setItem('unpuzzle-user', JSON.stringify(state.user))
    } else {
      localStorage.removeItem('unpuzzle-user')
    }
  }
})
```

### Key Principles
- Single source of truth (Zustand store)
- No duplicate auth state (removed AuthContext)
- Automatic persistence to localStorage
- Clean separation of user vs profile data

## 6. Error Boundary Pattern

### Global Error Handling
```typescript
// All API calls follow this pattern
try {
  const data = await apiCall()
  handleSuccess(data)
} catch (error) {
  // 1. Check if it's a mock ID
  if (id.includes('mock-') || id.includes('learner-')) {
    return mockData // Safe fallback
  }
  
  // 2. Check if it's a network error
  if (!navigator.onLine) {
    showOfflineMessage()
    return cachedData
  }
  
  // 3. Log and show user-friendly error
  console.error('[Component] Error:', error)
  showErrorToast('Something went wrong')
}
```

## 7. Data Loading Pattern

### Three-State Loading
```typescript
// Every data-fetching component follows this pattern
function Component() {
  const { data, loading, error } = useStore()
  
  useEffect(() => {
    loadData(realId) // Always pass real IDs
  }, [realId])
  
  if (loading) return <Skeleton />
  if (error) return <ErrorFallback error={error} />
  if (!data) return <EmptyState />
  
  return <ActualContent data={data} />
}
```

## 8. UUID Validation Pattern

### Preventing Mock ID Database Calls
```typescript
// Always validate UUIDs before database calls
const isValidUUID = (id: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

// Guard against mock IDs
if (!isValidUUID(id) || id.includes('mock') || id.includes('learner')) {
  console.warn('Invalid ID, using mock data:', id)
  return mockData
}

// Safe to call database
const data = await supabase.from('table').select().eq('id', id)
```

## 9. Feature Flag Pattern

### Progressive Enhancement
```typescript
// config/features.ts
export const FEATURES = {
  USE_REAL_COURSES_DATA: true,
  USE_REAL_VIDEO_UPLOAD: true,
  ENABLE_AI_FEATURES: false, // Not ready yet
  FALLBACK_TO_MOCK_ON_ERROR: true,
}

// Usage in code
if (FEATURES.USE_REAL_VIDEO_UPLOAD) {
  await uploadToB2(video)
} else {
  await mockUpload(video)
}
```

## 10. Middleware Protection Pattern

### Route Protection
```typescript
// middleware.ts
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  
  // 1. Get session
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()
  
  // 2. Check protected routes
  if (pathname.startsWith('/instructor')) {
    if (!session) {
      return NextResponse.redirect('/login')
    }
    
    // 3. Verify role from cookie or database
    const activeRole = req.cookies.get('active-role')?.value
    if (activeRole !== 'instructor') {
      // Check if user can be instructor
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()
        
      if (profile?.role !== 'instructor') {
        return NextResponse.redirect('/student')
      }
    }
  }
  
  return NextResponse.next()
}
```

## Best Practices Summary

1. **Always validate IDs** before database calls
2. **Use feature flags** for progressive rollout
3. **Implement graceful fallbacks** for errors
4. **Single source of truth** for state management
5. **Proper SSR/hydration handling** for auth states
6. **Service layer abstraction** for API calls
7. **Optimistic UI updates** for better perceived performance
8. **Comprehensive error boundaries** at component level
9. **Type safety** with TypeScript throughout
10. **Clean separation** between mock and real data paths

## Common Pitfalls to Avoid

1. ❌ Don't inject mock users in production code
2. ❌ Don't use `onClick` on DropdownMenuItem (use `onSelect`)
3. ❌ Don't make database calls with mock IDs
4. ❌ Don't clear auth tokens when clearing mock data
5. ❌ Don't duplicate auth state across multiple contexts
6. ❌ Don't show loading UI that flashes during hydration
7. ❌ Don't forget to validate user permissions server-side
8. ❌ Don't store sensitive data in cookies or localStorage
9. ❌ Don't forget error boundaries for async operations
10. ❌ Don't mix mock and real data in the same session