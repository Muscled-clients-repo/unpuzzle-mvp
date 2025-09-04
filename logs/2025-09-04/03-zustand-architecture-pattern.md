# The Zustand Way - Correct Architecture

## Core Principle: Store is the ONLY Source of Truth

```
UI Component → Store Action → API/Database → Update Store → UI Re-renders
```

## What We're Doing Wrong

### ❌ Current (Wrong) Pattern
```typescript
// Multiple service instances floating around
export const supabaseVideoService = new SupabaseVideoService()

// API routes directly manipulating database
await supabaseVideoService.deleteVideo(id)

// Store just calling APIs without managing state
removeVideo: async (videoId) => {
  await fetch('/api/delete-video')  // Fire and forget
  // Then manually remove from UI state
}
```

### ✅ Correct Zustand Pattern
```typescript
// Store slice manages EVERYTHING
export const createCourseSlice = (set, get) => ({
  videos: [],
  
  // Store action handles entire flow
  removeVideo: async (videoId) => {
    try {
      // 1. Optimistically update UI (immediate feedback)
      set(state => ({
        videos: state.videos.filter(v => v.id !== videoId)
      }))
      
      // 2. Call backend
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', videoId)
      
      if (error) {
        // 3. Revert on failure
        await get().loadCourseForEdit(courseId)
        throw error
      }
      
      // 4. State already updated optimistically
    } catch (error) {
      toast.error('Failed to delete video')
    }
  },
  
  // Load data into store
  loadCourseForEdit: async (courseId) => {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    
    const { data } = await supabase
      .from('videos')
      .select('*')
      .eq('course_id', courseId)
    
    // Update store state - UI automatically re-renders
    set({ videos: data || [] })
  }
})
```

## Why Zustand Way is Better

1. **Single Source of Truth** - Store state is THE state
2. **Optimistic Updates** - Instant UI feedback
3. **Automatic Re-renders** - Zustand handles React updates
4. **Simpler Debugging** - One place to look for state
5. **No Singleton Issues** - Store creates clients as needed

## The Problem We Hit

We created service singletons that:
- Don't have auth context in API routes
- Don't update Zustand store
- Create multiple sources of truth
- Make debugging harder

## How to Fix

### Option 1: Quick Fix (Keep current architecture)
- Just ensure API routes use proper auth (what we did)

### Option 2: Proper Zustand Refactor
1. Move ALL data operations into store actions
2. Remove service singletons
3. Don't use API routes for CRUD (unless needed for security)
4. Let store manage everything

## Example: Delete Video the Zustand Way

```typescript
// Component
const { removeVideo } = useAppStore()
await removeVideo(videoId)  // That's it!

// Store handles everything
removeVideo: async (videoId) => {
  // Update UI immediately
  set(state => ({
    videos: state.videos.filter(v => v.id !== videoId)
  }))
  
  // Delete from database
  const supabase = createClient()
  await supabase.from('videos').delete().eq('id', videoId)
  
  // Done - UI already updated
}
```

No API routes, no services, no singletons - just Zustand!