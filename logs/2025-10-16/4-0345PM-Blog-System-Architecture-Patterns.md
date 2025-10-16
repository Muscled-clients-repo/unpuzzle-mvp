# Blog System Architecture: Applying Established Patterns

**Date**: October 16, 2025, 3:45 PM EST
**Branch**: `feature/blog-seo-admin-tiptap`
**Purpose**: Apply project's established 3-Layer SSOT architecture patterns to blog system implementation

---

## Critical Requirement

The blog system MUST follow the established architectural patterns documented in `logs/Patterns/`. This is not optional - it's the foundation of how this codebase is structured.

**Required Reading Before Implementation**:
- Pattern 08: 3-Layer SSOT Distribution (Architecture Principles)
- Pattern 01: Optimistic Updates Pattern
- Pattern 05: Server Actions vs API Routes
- Pattern 09: Professional Form State & React Key Stability

---

## 1. 3-Layer SSOT Architecture for Blog System

### Pattern 08: Layer Ownership Boundaries

The blog system will follow the industry-standard 3-Layer SSOT distribution used throughout this codebase:

#### TanStack Query Layer (Server-Related State)
**Owns**:
- All blog post data fetching (list, detail, by category, by tag)
- Blog post mutations (create, update, delete, publish, unpublish)
- Category and tag data
- Engagement data (views, likes, comments)
- Upload progress for featured images
- Optimistic updates with automatic rollback
- Cache management and revalidation

**Does NOT Own**:
- Form input values during editing
- UI preferences (editor toolbar state, preview mode)
- Modal visibility states

#### Form State Layer (Input Processing)
**Owns**:
- Title, excerpt, content (Tiptap JSON) during active editing
- Category/tag selection during form interaction
- Form validation state
- Dirty flag for unsaved changes detection
- Featured image URL input (before upload)

**Does NOT Own**:
- Published blog posts from database
- Server-side validation results
- Upload progress

#### Zustand Layer (Pure UI State)
**Owns**:
- Tiptap editor preferences (toolbar visibility, focus mode, distraction-free mode)
- Blog post preview modal state
- Image upload modal state
- Tag selection dropdown UI state
- Pending publish/unpublish operations (before confirmation)
- Blog post table filters and sort preferences

**Does NOT Own**:
- Any server-related data
- Form input values
- Database state

---

## 2. Pattern 01: Optimistic Updates for Blog Operations

### Delete Blog Post (Optimistic)

```typescript
// In useBlogMutations.ts (TanStack Query layer)
export function useBlogMutations() {
  const queryClient = useQueryClient()

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const result = await deleteBlogPostAction(postId)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onMutate: async (postId) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['blog', 'posts'] })

      // Save current state for rollback
      const previousPosts = queryClient.getQueryData(['blog', 'posts'])

      // Optimistically remove post from cache
      queryClient.setQueryData(['blog', 'posts'], (old: any) => {
        return {
          ...old,
          posts: old.posts.filter((p: any) => p.id !== postId)
        }
      })

      return { previousPosts }
    },
    onError: (err, postId, context) => {
      // Rollback on error
      if (context?.previousPosts) {
        queryClient.setQueryData(['blog', 'posts'], context.previousPosts)
      }
      toast.error('Failed to delete post')
    },
    onSettled: () => {
      // Refetch to ensure sync
      queryClient.invalidateQueries({ queryKey: ['blog', 'posts'] })
    }
  })

  return { deletePostMutation }
}
```

### Publish Blog Post (Optimistic)

```typescript
const publishPostMutation = useMutation({
  mutationFn: async (postId: string) => {
    const result = await publishBlogPostAction(postId)
    if (!result.success) throw new Error(result.error)
    return result.data
  },
  onMutate: async (postId) => {
    await queryClient.cancelQueries({ queryKey: ['blog', 'posts'] })
    const previousPosts = queryClient.getQueryData(['blog', 'posts'])

    // Optimistically update status
    queryClient.setQueryData(['blog', 'posts'], (old: any) => {
      return {
        ...old,
        posts: old.posts.map((p: any) =>
          p.id === postId
            ? { ...p, status: 'published', published_at: new Date().toISOString() }
            : p
        )
      }
    })

    return { previousPosts }
  },
  onError: (err, postId, context) => {
    if (context?.previousPosts) {
      queryClient.setQueryData(['blog', 'posts'], context.previousPosts)
    }
    toast.error('Failed to publish post')
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['blog', 'posts'] })
    queryClient.invalidateQueries({ queryKey: ['blog', 'sitemap'] })
  }
})
```

---

## 3. Pattern 05: Server Actions for All Blog Mutations

### Critical Rule: No Direct API Calls

**ALL** blog operations must use server actions. Never make direct API calls from client code.

**Why**:
- Automatic authentication via cookies
- No credential exposure
- Type safety end-to-end
- Simplified architecture
- Consistent error handling

### Server Action Structure

```typescript
// /src/app/actions/blog-actions.ts
'use server'

import { createClient, createServiceClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// Standard response type (matches existing patterns)
export type ActionResult<T = any> =
  | { success: true; data: T }
  | { success: false; error: string }

// Authentication helper (matches existing patterns)
async function requireAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Authentication required')
  return user
}

// CREATE - matches createCourseAction pattern
export async function createBlogPostAction(data: CreateBlogPostInput): Promise<ActionResult<BlogPost>> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    const { data: post, error } = await supabase
      .from('blog_posts')
      .insert({
        ...data,
        author_id: user.id,
        status: 'draft',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/admin/blog')
    return { success: true, data: post }
  } catch (error) {
    console.error('Create blog post error:', error)
    return { success: false, error: error.message }
  }
}

// UPDATE - matches updateCourseAction pattern with ownership verification
export async function updateBlogPostAction(
  postId: string,
  data: Partial<CreateBlogPostInput>
): Promise<ActionResult<BlogPost>> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    // Verify ownership
    const { data: post } = await supabase
      .from('blog_posts')
      .select('author_id')
      .eq('id', postId)
      .single()

    if (!post) {
      return { success: false, error: 'Post not found' }
    }

    if (post.author_id !== user.id) {
      return { success: false, error: 'Unauthorized' }
    }

    // Update with ownership check at DB level too
    const { data: updatedPost, error } = await supabase
      .from('blog_posts')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', postId)
      .eq('author_id', user.id) // Double-check ownership
      .select()
      .single()

    if (error) throw error

    revalidatePath(`/admin/blog/${postId}`)
    revalidatePath('/admin/blog')
    revalidatePath(`/blog/${updatedPost.slug}`)

    return { success: true, data: updatedPost }
  } catch (error) {
    console.error('Update blog post error:', error)
    return { success: false, error: error.message }
  }
}

// PUBLISH - matches publishCourseAction pattern with validation
export async function publishBlogPostAction(postId: string): Promise<ActionResult<BlogPost>> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    // Fetch and validate
    const { data: post } = await supabase
      .from('blog_posts')
      .select()
      .eq('id', postId)
      .eq('author_id', user.id)
      .single()

    if (!post) {
      return { success: false, error: 'Post not found' }
    }

    // Validate business rules
    if (!post.title || !post.excerpt || !post.content) {
      return {
        success: false,
        error: 'Post must have title, excerpt, and content before publishing'
      }
    }

    // Publish
    const { data: publishedPost, error } = await supabase
      .from('blog_posts')
      .update({
        status: 'published',
        published_at: new Date().toISOString()
      })
      .eq('id', postId)
      .eq('author_id', user.id)
      .select()
      .single()

    if (error) throw error

    // Revalidate all affected paths
    revalidatePath('/admin/blog')
    revalidatePath(`/blog/${publishedPost.slug}`)
    revalidatePath('/blog')
    revalidatePath('/sitemap.xml')

    return { success: true, data: publishedPost }
  } catch (error) {
    console.error('Publish blog post error:', error)
    return { success: false, error: error.message }
  }
}
```

---

## 4. Pattern 09: Professional Form State for Blog Editor

### Critical Pattern: Form State Drives Input Display

The blog post editor form MUST follow these principles:

#### Form State is Source of Truth for Inputs

```typescript
// /src/components/admin/blog/BlogPostForm.tsx
"use client"

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'

interface BlogPostFormProps {
  initialData?: BlogPost // From TanStack Query
  onSave: (data: BlogPostFormData) => Promise<void>
}

export function BlogPostForm({ initialData, onSave }: BlogPostFormProps) {
  // Form state owns input values
  const form = useForm<BlogPostFormData>({
    defaultValues: {
      title: initialData?.title || '',
      excerpt: initialData?.excerpt || '',
      content: initialData?.content || null,
      category_id: initialData?.category_id || '',
      tags: initialData?.tags || []
    }
  })

  // Internal dirty flag (NOT server comparison)
  const isDirty = form.formState.isDirty

  const handleSave = async () => {
    const data = form.getValues()

    // Optimistic reset for immediate feedback
    form.reset(data) // Reset dirty state immediately

    try {
      await onSave(data)
      // Success - stay reset
    } catch (error) {
      // Error - revert to server data
      form.reset(initialData)
      toast.error('Failed to save')
    }
  }

  // CRITICAL: Never mix server state with form state during typing
  // Only update form when intentionally loading new data
  useEffect(() => {
    if (initialData && !isDirty) {
      form.reset(initialData)
    }
  }, [initialData?.id]) // Only reset on new post load, NOT on every data change

  return (
    <form>
      {/* All inputs read from and write to form state ONLY */}
      <Input {...form.register('title')} />
      <Textarea {...form.register('excerpt')} />
      <TiptapEditor
        content={form.watch('content')}
        onChange={(content) => form.setValue('content', content, { shouldDirty: true })}
      />
      {/* ... */}
      <Button
        onClick={handleSave}
        disabled={!isDirty} // Use form's internal dirty flag
      >
        Save Changes
      </Button>
    </form>
  )
}
```

#### Key Principles (from Pattern 09)

1. **Form state drives input display** - Never mix with server state during typing
2. **Internal dirty flag** - Use `form.formState.isDirty`, not server comparison
3. **No UI orchestration during typing** - Prevents character loss
4. **Optimistic reset on save** - Immediate UI feedback
5. **Stable dependencies** - Never include form state objects in useEffect deps

---

## 5. Component Architecture for Blog Admin

### File Organization

```
/src/app/admin/blog/
  page.tsx                     # List all posts (uses TanStack)
  new/page.tsx                 # Create new post (uses Form State)
  [id]/edit/page.tsx          # Edit post (uses Form State + TanStack)

/src/app/actions/
  blog-actions.ts             # All server actions

/src/hooks/blog/
  useBlogPosts.ts             # TanStack Query hook for fetching
  useBlogMutations.ts         # TanStack Mutations for CRUD
  useBlogForm.ts              # Form state hook

/src/stores/
  blog-ui-store.ts            # Zustand for UI state only

/src/components/admin/blog/
  BlogPostForm.tsx            # Form component (Form State layer)
  BlogPostsTable.tsx          # List component (TanStack layer)
  TiptapEditor.tsx            # Editor component (Form State integration)
  BlogPostPreview.tsx         # Preview component (TanStack layer)
```

### Hook Examples

#### TanStack Query Hook (Server Data)

```typescript
// /src/hooks/blog/useBlogPosts.ts
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useBlogPosts(filters?: BlogFilters) {
  return useQuery({
    queryKey: ['blog', 'posts', filters],
    queryFn: async () => {
      const supabase = createClient()
      const query = supabase
        .from('blog_posts')
        .select('*, blog_categories(*), profiles(*)')
        .order('created_at', { ascending: false })

      if (filters?.status) {
        query.eq('status', filters.status)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    }
  })
}

export function useBlogPost(postId: string) {
  return useQuery({
    queryKey: ['blog', 'post', postId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*, blog_categories(*), profiles(*), blog_post_tags(blog_tags(*))')
        .eq('id', postId)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!postId
  })
}
```

#### TanStack Mutations Hook (Server Actions)

```typescript
// /src/hooks/blog/useBlogMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createBlogPostAction,
  updateBlogPostAction,
  deleteBlogPostAction,
  publishBlogPostAction
} from '@/app/actions/blog-actions'
import { toast } from 'sonner'

export function useBlogMutations() {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: async (data: CreateBlogPostInput) => {
      const result = await createBlogPostAction(data)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog', 'posts'] })
      toast.success('Post created successfully')
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })

  const updateMutation = useMutation({
    mutationFn: async ({ postId, data }: { postId: string; data: Partial<CreateBlogPostInput> }) => {
      const result = await updateBlogPostAction(postId, data)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['blog', 'post', data.id] })
      queryClient.invalidateQueries({ queryKey: ['blog', 'posts'] })
      toast.success('Post updated successfully')
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })

  // Delete with optimistic update (see section 2)
  const deleteMutation = useMutation({ /* ... */ })

  // Publish with optimistic update (see section 2)
  const publishMutation = useMutation({ /* ... */ })

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    publishMutation
  }
}
```

#### Zustand UI Store

```typescript
// /src/stores/blog-ui-store.ts
import { create } from 'zustand'

interface BlogUIStore {
  // Editor preferences
  editorPreferences: {
    toolbarVisible: boolean
    focusMode: boolean
    distractionFree: boolean
  }
  setEditorPreference: (key: keyof BlogUIStore['editorPreferences'], value: boolean) => void

  // Modal states
  previewModal: {
    isOpen: boolean
    postId: string | null
  }
  openPreviewModal: (postId: string) => void
  closePreviewModal: () => void

  // Image upload modal
  imageUploadModal: {
    isOpen: boolean
  }
  openImageUploadModal: () => void
  closeImageUploadModal: () => void

  // Table preferences
  tableFilters: {
    status: string
    category: string
    search: string
  }
  setTableFilter: (key: keyof BlogUIStore['tableFilters'], value: string) => void
}

export const useBlogUIStore = create<BlogUIStore>((set) => ({
  editorPreferences: {
    toolbarVisible: true,
    focusMode: false,
    distractionFree: false
  },
  setEditorPreference: (key, value) =>
    set((state) => ({
      editorPreferences: { ...state.editorPreferences, [key]: value }
    })),

  previewModal: {
    isOpen: false,
    postId: null
  },
  openPreviewModal: (postId) =>
    set({ previewModal: { isOpen: true, postId } }),
  closePreviewModal: () =>
    set({ previewModal: { isOpen: false, postId: null } }),

  imageUploadModal: {
    isOpen: false
  },
  openImageUploadModal: () =>
    set({ imageUploadModal: { isOpen: true } }),
  closeImageUploadModal: () =>
    set({ imageUploadModal: { isOpen: false } }),

  tableFilters: {
    status: 'all',
    category: 'all',
    search: ''
  },
  setTableFilter: (key, value) =>
    set((state) => ({
      tableFilters: { ...state.tableFilters, [key]: value }
    }))
}))
```

---

## 6. UI Orchestration vs Data Mixing

### ✅ ALLOWED: UI Orchestration

Components can read from multiple layers for UI decisions:

```typescript
function BlogPostEditor({ postId }: { postId: string }) {
  // Read from TanStack (server data)
  const { data: post, isLoading } = useBlogPost(postId)

  // Read from Form State (input values)
  const form = useForm()
  const isDirty = form.formState.isDirty

  // Read from Zustand (UI state)
  const { focusMode } = useBlogUIStore()

  // UI orchestration: Coordinate actions based on multiple layers
  const handleSave = async () => {
    // 1. Get data from form state
    const formData = form.getValues()

    // 2. Call TanStack mutation
    await updateMutation.mutateAsync({ postId, data: formData })

    // 3. Update Zustand UI state
    closeFocusMode()
  }

  // Display logic can read from multiple sources
  const canPublish = !isDirty && post?.status === 'draft'

  return (
    <div className={focusMode ? 'focus-mode' : ''}>
      {/* Component coordinates across layers */}
    </div>
  )
}
```

### ❌ FORBIDDEN: Data Mixing

Never merge data from different layers:

```typescript
// ❌ WRONG: Mixing server data with form state
const [formData, setFormData] = useState({
  ...serverPost,  // From TanStack
  title: userInput // From user typing
})

// ❌ WRONG: Copying server data into Zustand
setBlogUIState({
  posts: serverPosts // Server data doesn't belong in Zustand
})

// ❌ WRONG: Syncing layers with useEffect
useEffect(() => {
  setFormData(serverPost) // Manual sync creates conflicts
}, [serverPost])
```

---

## 7. Implementation Priority

### Phase 4A: Database Foundation (Week 1)
1. Create migrations following Pattern investigation findings
2. Implement RLS policies
3. Create server actions (Pattern 05)
4. Test CRUD operations with Postman/curl

### Phase 4B: Admin UI (Week 2)
1. Install Tiptap dependencies
2. Create TanStack Query hooks
3. Create Zustand UI store
4. Build BlogPostForm component (Pattern 09)
5. Build BlogPostsTable component
6. Implement optimistic updates (Pattern 01)

### Phase 4C: Public Routes Migration (Week 3)
1. Update public routes to fetch from database
2. Replace mock data with TanStack queries
3. Update SEO generation (sitemap, RSS) to use database
4. Test all pages

### Phase 4D: Polish & Testing (Week 4)
1. Add author bio form to profile settings
2. Backfill mock data to database
3. End-to-end testing
4. Performance optimization
5. Documentation

---

## 8. Success Criteria

### Architecture Compliance Checklist

Before marking Phase 4 complete, verify:

- [ ] **TanStack Query Layer**: All server data fetched via TanStack hooks
- [ ] **Form State Layer**: All form inputs use react-hook-form, never mixed with server state
- [ ] **Zustand Layer**: Only UI state, no server data copied here
- [ ] **Server Actions**: All mutations use server actions, no direct API calls
- [ ] **Optimistic Updates**: Delete and publish operations have optimistic updates with rollback
- [ ] **No Data Mixing**: Components orchestrate but never merge data from layers
- [ ] **Professional Form State**: Follows Pattern 09 (internal dirty flag, optimistic reset, stable deps)
- [ ] **Consistent Patterns**: Matches existing course/lesson implementation patterns

### Testing Checklist

- [ ] Create post → Edit → Publish flow works without character loss
- [ ] Optimistic delete rolls back properly on error
- [ ] Form dirty state works correctly (internal flag, not server comparison)
- [ ] No infinite loops during typing in Tiptap editor
- [ ] Zustand UI preferences persist across navigation
- [ ] Server actions handle auth errors gracefully
- [ ] RLS policies prevent unauthorized access

---

## 9. Red Flags to Avoid

Based on Pattern 08 and Pattern 09 documentation:

❌ **Layer Confusion**:
- Using Zustand for server data
- Mixing form state with TanStack data in input values
- Storing form data in Zustand

❌ **Data Mixing**:
- Creating combined objects from multiple layers
- Copying data between layers
- Manual synchronization with useEffect chains

❌ **Form State Anti-Patterns**:
- Comparing form values to server data for dirty detection
- UI orchestration during active typing
- Including form state objects in dependency arrays

❌ **Server Action Violations**:
- Direct API calls instead of server actions
- Missing ownership verification
- Inconsistent ActionResult return types

---

## Conclusion

The blog system is NOT a greenfield project - it must integrate seamlessly with established architectural patterns. This document ensures Phase 4 implementation follows the same professional standards as the rest of the codebase.

**Key Principle**: When in doubt, reference existing course/lesson implementations. They follow these patterns successfully and provide working examples of proper architecture.

**Next Step**: Review this document with the investigation findings, then proceed with Phase 4 implementation following these guidelines.
