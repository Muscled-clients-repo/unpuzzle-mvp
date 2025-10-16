# Phase 4 Investigation: Database Schema & Admin CMS Design

**Date**: October 16, 2025, 3:30 PM EST
**Branch**: `feature/blog-seo-admin-tiptap`
**Purpose**: Analyze existing database patterns, admin routes, and CRUD implementations to design Phase 4 blog system

---

## Investigation Goals

Before implementing Phase 4 (database migration + Tiptap CMS), we need to understand:

1. **Database Migration Patterns** - How to structure migrations, indexes, constraints, triggers
2. **Admin/Instructor Route Structures** - UI patterns, layouts, forms
3. **Supabase Setup & RLS Policies** - Authentication, authorization, public access
4. **Existing CRUD Patterns** - Server actions, error handling, revalidation

---

## 1. Database Migration Patterns

### Migration Files Analyzed

- `140_add_featured_students.sql` - Adding columns, indexes, triggers
- `141_featured_students_rls.sql` - RLS policy creation
- `142_optimize_featured_students.sql` - Performance optimizations

### Key Migration Patterns

#### Structure
```sql
-- Always include verification block at the end
DO $$
BEGIN
  RAISE NOTICE 'Migration 140: Featured students functionality added successfully';
END $$;
```

#### Adding Columns
```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS featured_order INTEGER,
ADD COLUMN IF NOT EXISTS featured_since TIMESTAMPTZ;
```

**Pattern**: Always use `IF NOT EXISTS` for idempotency

#### Creating Indexes
```sql
CREATE INDEX IF NOT EXISTS idx_profiles_featured
  ON profiles(is_featured, featured_order)
  WHERE is_featured = true;
```

**Pattern**:
- Use `IF NOT EXISTS` for idempotency
- Name convention: `idx_{table}_{purpose}`
- Use partial indexes with `WHERE` clause for performance
- Create composite indexes for common query patterns

#### Triggers with Business Logic
```sql
CREATE OR REPLACE FUNCTION check_featured_students_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_featured = true THEN
    IF (SELECT COUNT(*) FROM profiles WHERE is_featured = true AND id != NEW.id) >= 3 THEN
      RAISE EXCEPTION 'Cannot feature more than 3 students. Please unfeature another student first.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_featured_students_limit
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_featured_students_limit();
```

**Pattern**:
- Use `CREATE OR REPLACE FUNCTION` for idempotency
- Triggers enforce business rules at database level
- Use `RAISE EXCEPTION` for constraint violations
- Name convention: `{action}_{table}_{purpose}`

#### Auto-Assignment Logic
```sql
CREATE OR REPLACE FUNCTION auto_assign_featured_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_featured = true AND NEW.featured_order IS NULL THEN
    SELECT COALESCE(MAX(featured_order), 0) + 1
    INTO NEW.featured_order
    FROM profiles
    WHERE is_featured = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Pattern**: Auto-populate fields based on existing data

---

## 2. Row Level Security (RLS) Patterns

### RLS Policy Structure (from `141_featured_students_rls.sql`)

```sql
-- Always drop existing policies first
DROP POLICY IF EXISTS "Public can view featured students" ON profiles;

-- Create new policy with descriptive name
CREATE POLICY "Public can view featured students"
ON profiles FOR SELECT
USING (is_featured = true);
```

**Pattern**:
- Always `DROP POLICY IF EXISTS` before creating (idempotency)
- Policy name should be descriptive and quoted
- Specify operation: `FOR SELECT`, `FOR INSERT`, `FOR UPDATE`, `FOR DELETE`
- Use `USING` clause for SELECT policies
- Use `WITH CHECK` clause for INSERT/UPDATE policies

### Cross-Table RLS Policies
```sql
CREATE POLICY "Public can view featured students' activities"
ON community_activities FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = community_activities.user_id
    AND profiles.is_featured = true
  )
);
```

**Pattern**: Use `EXISTS` subqueries to check related tables

### Common RLS Patterns for Blog System

**Public Read Access**:
```sql
-- Anyone can read published posts
CREATE POLICY "Public can view published blog posts"
ON blog_posts FOR SELECT
USING (status = 'published');
```

**Author-Only Write Access**:
```sql
-- Only author can update their own posts
CREATE POLICY "Authors can update their own posts"
ON blog_posts FOR UPDATE
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);
```

**Admin Access** (using service role):
```sql
-- Admin operations bypass RLS by using service client
-- No policy needed - use createServiceClient() in server actions
```

---

## 3. Admin/Instructor Route Patterns

### Admin Dashboard Structure (`/src/app/admin/page.tsx`)

**Layout Components**:
```tsx
import { PageContainer, PageContentHeader } from "@/components/layout/page-wrapper"
import { StatsGrid } from "@/components/admin/stats/stats-grid"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function AdminPage() {
  return (
    <PageContainer>
      <PageContentHeader
        title="Admin Dashboard"
        description="Manage courses, users, and system settings"
      />

      {/* Stats Cards */}
      <StatsGrid>
        <Card>
          <CardHeader>
            <CardTitle>Total Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">42</div>
          </CardContent>
        </Card>
        {/* More cards... */}
      </StatsGrid>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <FileText className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>Courses</CardTitle>
          </CardHeader>
        </Card>
      </div>
    </PageContainer>
  )
}
```

**UI Patterns**:
- Use `PageContainer` and `PageContentHeader` for consistent layout
- `StatsGrid` for metrics display
- Card-based design for content sections
- Lucide icons for visual hierarchy
- Hover effects on interactive elements

### Edit Page Structure (`/src/app/instructor/course/[id]/edit/page.tsx`)

**Key Patterns**:

1. **React Query for Data Fetching**:
```tsx
const { courseData, isLoading: isLoadingCourse } = useCourseWithMedia(courseId)
```

2. **Mutations with Optimistic Updates**:
```tsx
const linkMediaMutation = useMutation({
  mutationFn: async ({ mediaFiles, chapterId }) => {
    for (const mediaFile of mediaFiles) {
      const result = await linkMediaToChapterAction(mediaFile.id, chapterId)
      if (!result.success) throw new Error(result.error)
    }
  },
  onMutate: async ({ mediaFiles, chapterId }) => {
    // Cancel outgoing queries
    await queryClient.cancelQueries({ queryKey: chapterMediaKeys.course(courseId) })

    // Save current state for rollback
    const previousCourse = queryClient.getQueryData(chapterMediaKeys.course(courseId))

    // Optimistically update UI
    queryClient.setQueryData(chapterMediaKeys.course(courseId), (old: any) => {
      // Update logic...
    })

    return { previousCourse }
  },
  onError: (err, variables, context) => {
    // Rollback on error
    if (context?.previousCourse) {
      queryClient.setQueryData(chapterMediaKeys.course(courseId), context.previousCourse)
    }
    toast.error('Failed to link media')
  },
  onSettled: () => {
    // Refetch to ensure sync with database
    queryClient.invalidateQueries({ queryKey: chapterMediaKeys.course(courseId) })
  }
})
```

**Pattern Summary**:
- Use React Query for all data operations
- Implement optimistic updates for better UX
- Save previous state in `onMutate` for rollback
- Show error toasts on failure
- Invalidate queries in `onSettled` to resync

---

## 4. Server Actions & CRUD Patterns

### Server Action Structure (`/src/app/actions/course-actions.ts`)

#### Authentication Helper
```typescript
import { createClient } from "@/lib/supabase/server"

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Authentication required')
  }

  return user
}
```

**Pattern**: Always authenticate first before database operations

#### ActionResult Type
```typescript
export type ActionResult<T = any> =
  | { success: true; data: T }
  | { success: false; error: string }
```

**Pattern**: Consistent return type for all server actions

#### CREATE Action
```typescript
export async function createCourseAction(data: CourseInput): Promise<ActionResult<Course>> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    const courseData = {
      title: data.title,
      description: data.description,
      instructor_id: user.id,
      status: 'draft',
      created_at: new Date().toISOString()
    }

    const { data: course, error } = await supabase
      .from('courses')
      .insert(courseData)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/instructor/courses')

    return { success: true, data: course }
  } catch (error) {
    console.error('Create course error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create course'
    }
  }
}
```

**Pattern**:
1. Authenticate with `requireAuth()`
2. Create Supabase client
3. Auto-populate fields (user_id, timestamps)
4. Use `.select().single()` to return created record
5. Call `revalidatePath()` to update Next.js cache
6. Return `ActionResult` type
7. Catch and log all errors

#### UPDATE Action with Ownership Verification
```typescript
export async function updateCourseAction(
  courseId: string,
  data: Partial<CourseInput>
): Promise<ActionResult<Course>> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    // Verify ownership
    const { data: course } = await supabase
      .from('courses')
      .select('instructor_id')
      .eq('id', courseId)
      .single()

    if (!course) {
      return { success: false, error: 'Course not found' }
    }

    if (course.instructor_id !== user.id) {
      return { success: false, error: 'Unauthorized' }
    }

    // Perform update
    const { data: updatedCourse, error } = await supabase
      .from('courses')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', courseId)
      .eq('instructor_id', user.id) // Double-check ownership at DB level
      .select()
      .single()

    if (error) throw error

    revalidatePath(`/instructor/course/${courseId}`)
    revalidatePath('/instructor/courses')

    return { success: true, data: updatedCourse }
  } catch (error) {
    console.error('Update course error:', error)
    return { success: false, error: error.message }
  }
}
```

**Pattern**:
1. Verify record exists
2. Verify ownership (twice: in code AND in DB query)
3. Update `updated_at` timestamp
4. Revalidate multiple paths if needed

#### DELETE Action
```typescript
export async function deleteCourseAction(courseId: string): Promise<ActionResult<void>> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    // Check if course has students enrolled
    const { count } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId)

    if (count && count > 0) {
      return {
        success: false,
        error: 'Cannot delete course with active enrollments'
      }
    }

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId)
      .eq('instructor_id', user.id)

    if (error) throw error

    revalidatePath('/instructor/courses')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('Delete course error:', error)
    return { success: false, error: error.message }
  }
}
```

**Pattern**:
1. Check for dependencies before deleting
2. Return descriptive error if deletion not allowed
3. Always verify ownership in DELETE query

#### Complex Action with Multiple Operations
```typescript
export async function publishCourseAction(courseId: string): Promise<ActionResult<Course>> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    // Fetch course with related data
    const { data: course, error: fetchError } = await supabase
      .from('courses')
      .select(`
        *,
        course_chapters (
          id,
          title,
          content
        )
      `)
      .eq('id', courseId)
      .eq('instructor_id', user.id)
      .single()

    if (fetchError || !course) {
      return { success: false, error: 'Course not found' }
    }

    // Validate course is ready to publish
    if (!course.title || !course.description) {
      return {
        success: false,
        error: 'Course must have title and description'
      }
    }

    if (!course.course_chapters || course.course_chapters.length === 0) {
      return {
        success: false,
        error: 'Course must have at least one chapter'
      }
    }

    // Update status
    const { data: publishedCourse, error: updateError } = await supabase
      .from('courses')
      .update({
        status: 'published',
        published_at: new Date().toISOString()
      })
      .eq('id', courseId)
      .eq('instructor_id', user.id)
      .select()
      .single()

    if (updateError) throw updateError

    // Broadcast real-time notification
    await broadcastWebSocketMessage({
      type: 'course-status-changed',
      data: {
        courseId,
        status: 'published',
        title: course.title
      }
    })

    // Revalidate multiple paths
    revalidatePath(`/instructor/course/${courseId}`)
    revalidatePath('/instructor/courses')
    revalidatePath('/courses') // Public course catalog

    return { success: true, data: publishedCourse }
  } catch (error) {
    console.error('Publish course error:', error)
    return { success: false, error: error.message }
  }
}
```

**Pattern**:
1. Fetch with joins using nested select syntax
2. Validate all business rules before operation
3. Return descriptive errors for each validation
4. Update related timestamps
5. Broadcast WebSocket events for real-time updates
6. Revalidate all affected paths (admin + public)

#### Using Service Client for Admin Operations
```typescript
import { createServiceClient } from "@/lib/supabase/server"

export async function adminGetAllCoursesAction(): Promise<ActionResult<Course[]>> {
  try {
    const user = await requireAuth()

    // Check if user is admin
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return { success: false, error: 'Admin access required' }
    }

    // Use service client to bypass RLS
    const serviceClient = createServiceClient()
    const { data: courses, error } = await serviceClient
      .from('courses')
      .select('*, profiles!courses_instructor_id_fkey(*)')
      .order('created_at', { ascending: false })

    if (error) throw error

    return { success: true, data: courses }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
```

**Pattern**:
- Verify admin role first
- Use `createServiceClient()` for operations that need to bypass RLS
- Service client has full database access (no RLS restrictions)

---

## 5. Recommended Approach for Phase 4

### Database Schema Design

Based on the investigation, here's the recommended blog database structure:

#### Core Tables

**1. `blog_posts` table**
```sql
CREATE TABLE blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  content JSONB NOT NULL, -- Tiptap JSON format
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES blog_categories(id) ON DELETE RESTRICT,
  featured_image_url TEXT,
  reading_time INTEGER, -- in minutes
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- SEO fields
  meta_title TEXT,
  meta_description TEXT,

  -- Engagement metrics (updated by triggers)
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_posts_status_published_at ON blog_posts(status, published_at DESC);
CREATE INDEX idx_blog_posts_author ON blog_posts(author_id);
CREATE INDEX idx_blog_posts_category ON blog_posts(category_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_blog_post_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_blog_post_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_post_updated_at();

-- Auto-generate slug from title if not provided
CREATE OR REPLACE FUNCTION auto_generate_blog_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := lower(regexp_replace(NEW.title, '[^a-zA-Z0-9]+', '-', 'g'));
    NEW.slug := trim(both '-' from NEW.slug);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_blog_slug_trigger
  BEFORE INSERT OR UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_blog_slug();
```

**2. `blog_categories` table**
```sql
CREATE TABLE blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed data
INSERT INTO blog_categories (slug, name, description) VALUES
  ('learning-science', 'Learning Science', 'Evidence-based learning strategies and cognitive science'),
  ('ai-education', 'AI & Education', 'How artificial intelligence is transforming learning'),
  ('student-success', 'Student Success', 'Tips and strategies for academic achievement'),
  ('teaching-strategies', 'Teaching Strategies', 'Effective methods for educators');
```

**3. `blog_tags` table**
```sql
CREATE TABLE blog_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_blog_tags_slug ON blog_tags(slug);
```

**4. `blog_post_tags` junction table**
```sql
CREATE TABLE blog_post_tags (
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES blog_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX idx_blog_post_tags_post ON blog_post_tags(post_id);
CREATE INDEX idx_blog_post_tags_tag ON blog_post_tags(tag_id);
```

**5. `blog_comments` table**
```sql
CREATE TABLE blog_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_blog_comments_post ON blog_comments(post_id, created_at DESC);
CREATE INDEX idx_blog_comments_user ON blog_comments(user_id);

-- Trigger to update post comment count
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE blog_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE blog_posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_comment_count_trigger
  AFTER INSERT OR DELETE ON blog_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_post_comment_count();
```

**6. `blog_post_views` table** (for analytics)
```sql
CREATE TABLE blog_post_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL for anonymous
  ip_address TEXT,
  user_agent TEXT,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_blog_post_views_post ON blog_post_views(post_id, viewed_at DESC);

-- Trigger to update post views count
CREATE OR REPLACE FUNCTION update_post_views_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE blog_posts SET views_count = views_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_views_count_trigger
  AFTER INSERT ON blog_post_views
  FOR EACH ROW
  EXECUTE FUNCTION update_post_views_count();
```

**7. `blog_post_likes` table**
```sql
CREATE TABLE blog_post_likes (
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX idx_blog_post_likes_user ON blog_post_likes(user_id);

-- Trigger to update post likes count
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE blog_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE blog_posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_likes_count_trigger
  AFTER INSERT OR DELETE ON blog_post_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_post_likes_count();
```

**8. Add author bio fields to existing `profiles` table**
```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS credentials TEXT[], -- Array of strings
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS twitter_url TEXT,
ADD COLUMN IF NOT EXISTS github_url TEXT;
```

### RLS Policies

**blog_posts policies**:
```sql
-- Public read for published posts
CREATE POLICY "Public can view published posts"
ON blog_posts FOR SELECT
USING (status = 'published');

-- Authors can view their own drafts
CREATE POLICY "Authors can view own posts"
ON blog_posts FOR SELECT
USING (auth.uid() = author_id);

-- Authors can create posts
CREATE POLICY "Authors can create posts"
ON blog_posts FOR INSERT
WITH CHECK (auth.uid() = author_id);

-- Authors can update own posts
CREATE POLICY "Authors can update own posts"
ON blog_posts FOR UPDATE
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

-- Authors can delete own posts (or use service client for admin)
CREATE POLICY "Authors can delete own posts"
ON blog_posts FOR DELETE
USING (auth.uid() = author_id);
```

**blog_comments policies**:
```sql
-- Anyone can read comments on published posts
CREATE POLICY "Public can view comments on published posts"
ON blog_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM blog_posts
    WHERE blog_posts.id = blog_comments.post_id
    AND blog_posts.status = 'published'
  )
);

-- Authenticated users can create comments
CREATE POLICY "Authenticated users can create comments"
ON blog_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update own comments
CREATE POLICY "Users can update own comments"
ON blog_comments FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete own comments
CREATE POLICY "Users can delete own comments"
ON blog_comments FOR DELETE
USING (auth.uid() = user_id);
```

**blog_post_likes policies**:
```sql
-- Users can view all likes (for displaying counts)
CREATE POLICY "Anyone can view likes"
ON blog_post_likes FOR SELECT
USING (true);

-- Authenticated users can like posts
CREATE POLICY "Authenticated users can like posts"
ON blog_post_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can unlike posts they liked
CREATE POLICY "Users can unlike posts"
ON blog_post_likes FOR DELETE
USING (auth.uid() = user_id);
```

### Server Actions Structure

**File**: `/src/app/actions/blog-actions.ts`

```typescript
"use server"

import { createClient, createServiceClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { JSONContent } from '@tiptap/core'

export type ActionResult<T = any> =
  | { success: true; data: T }
  | { success: false; error: string }

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Authentication required')
  return user
}

// CREATE
export async function createBlogPostAction(data: {
  title: string
  excerpt: string
  content: JSONContent
  category_id: string
  tags: string[] // Tag names
  featured_image_url?: string
}): Promise<ActionResult<BlogPost>> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    // Insert post
    const { data: post, error } = await supabase
      .from('blog_posts')
      .insert({
        title: data.title,
        excerpt: data.excerpt,
        content: data.content,
        category_id: data.category_id,
        featured_image_url: data.featured_image_url,
        author_id: user.id,
        status: 'draft'
      })
      .select()
      .single()

    if (error) throw error

    // Handle tags
    if (data.tags && data.tags.length > 0) {
      for (const tagName of data.tags) {
        // Get or create tag
        let { data: tag } = await supabase
          .from('blog_tags')
          .select()
          .eq('name', tagName)
          .single()

        if (!tag) {
          const { data: newTag } = await supabase
            .from('blog_tags')
            .insert({ name: tagName, slug: tagName.toLowerCase().replace(/\s+/g, '-') })
            .select()
            .single()
          tag = newTag
        }

        // Link tag to post
        if (tag) {
          await supabase
            .from('blog_post_tags')
            .insert({ post_id: post.id, tag_id: tag.id })
        }
      }
    }

    revalidatePath('/admin/blog')
    return { success: true, data: post }
  } catch (error) {
    console.error('Create blog post error:', error)
    return { success: false, error: error.message }
  }
}

// UPDATE
export async function updateBlogPostAction(
  postId: string,
  data: Partial<{
    title: string
    excerpt: string
    content: JSONContent
    category_id: string
    tags: string[]
    featured_image_url: string
  }>
): Promise<ActionResult<BlogPost>> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    // Update post
    const { data: post, error } = await supabase
      .from('blog_posts')
      .update({
        ...data,
        tags: undefined // Remove tags from update (handled separately)
      })
      .eq('id', postId)
      .eq('author_id', user.id)
      .select()
      .single()

    if (error) throw error

    // Update tags if provided
    if (data.tags) {
      // Remove existing tags
      await supabase
        .from('blog_post_tags')
        .delete()
        .eq('post_id', postId)

      // Add new tags
      for (const tagName of data.tags) {
        let { data: tag } = await supabase
          .from('blog_tags')
          .select()
          .eq('name', tagName)
          .single()

        if (!tag) {
          const { data: newTag } = await supabase
            .from('blog_tags')
            .insert({ name: tagName, slug: tagName.toLowerCase().replace(/\s+/g, '-') })
            .select()
            .single()
          tag = newTag
        }

        if (tag) {
          await supabase
            .from('blog_post_tags')
            .insert({ post_id: postId, tag_id: tag.id })
        }
      }
    }

    revalidatePath('/admin/blog')
    revalidatePath(`/admin/blog/${postId}`)
    revalidatePath(`/blog/${post.slug}`)
    return { success: true, data: post }
  } catch (error) {
    console.error('Update blog post error:', error)
    return { success: false, error: error.message }
  }
}

// PUBLISH
export async function publishBlogPostAction(postId: string): Promise<ActionResult<BlogPost>> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    // Validate post
    const { data: post } = await supabase
      .from('blog_posts')
      .select()
      .eq('id', postId)
      .eq('author_id', user.id)
      .single()

    if (!post) {
      return { success: false, error: 'Post not found' }
    }

    if (!post.title || !post.excerpt || !post.content) {
      return { success: false, error: 'Post must have title, excerpt, and content' }
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

    revalidatePath('/admin/blog')
    revalidatePath(`/blog/${publishedPost.slug}`)
    revalidatePath('/blog')

    return { success: true, data: publishedPost }
  } catch (error) {
    console.error('Publish blog post error:', error)
    return { success: false, error: error.message }
  }
}

// DELETE
export async function deleteBlogPostAction(postId: string): Promise<ActionResult<void>> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', postId)
      .eq('author_id', user.id)

    if (error) throw error

    revalidatePath('/admin/blog')
    revalidatePath('/blog')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('Delete blog post error:', error)
    return { success: false, error: error.message }
  }
}

// LIKE POST
export async function toggleLikeBlogPostAction(postId: string): Promise<ActionResult<{ liked: boolean }>> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    // Check if already liked
    const { data: existingLike } = await supabase
      .from('blog_post_likes')
      .select()
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .single()

    if (existingLike) {
      // Unlike
      await supabase
        .from('blog_post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id)

      return { success: true, data: { liked: false } }
    } else {
      // Like
      await supabase
        .from('blog_post_likes')
        .insert({ post_id: postId, user_id: user.id })

      return { success: true, data: { liked: true } }
    }
  } catch (error) {
    console.error('Toggle like error:', error)
    return { success: false, error: error.message }
  }
}

// CREATE COMMENT
export async function createCommentAction(postId: string, content: string): Promise<ActionResult<BlogComment>> {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    const { data: comment, error } = await supabase
      .from('blog_comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        content: content
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath(`/blog/${postId}`)

    return { success: true, data: comment }
  } catch (error) {
    console.error('Create comment error:', error)
    return { success: false, error: error.message }
  }
}

// TRACK VIEW
export async function trackBlogViewAction(postId: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient()

    // Get user if authenticated (optional)
    const { data: { user } } = await supabase.auth.getUser()

    await supabase
      .from('blog_post_views')
      .insert({
        post_id: postId,
        user_id: user?.id || null
      })

    return { success: true, data: undefined }
  } catch (error) {
    // Don't fail the page load if view tracking fails
    console.error('Track view error:', error)
    return { success: true, data: undefined }
  }
}
```

### Admin Routes Structure

**Routes to create**:
- `/admin/blog` - List all blog posts (all statuses)
- `/admin/blog/new` - Create new blog post
- `/admin/blog/[id]/edit` - Edit existing blog post
- `/admin/blog/categories` - Manage categories
- `/admin/blog/tags` - Manage tags

**UI Components needed**:
- `TiptapEditor` - Rich text editor component
- `TiptapRenderer` - Read-only renderer for displaying content
- `BlogPostForm` - Form with title, excerpt, Tiptap editor, category select, tag input
- `BlogPostsTable` - Table with sorting, filtering by status/category
- `CategoryManager` - CRUD interface for categories
- `TagManager` - CRUD interface for tags

---

## 6. Implementation Checklist

### Migration Phase
- [ ] Create migration `143_create_blog_system.sql` with all 7 tables
- [ ] Create migration `144_blog_rls_policies.sql` with all RLS policies
- [ ] Run migrations and verify schema
- [ ] Seed initial categories

### Tiptap Integration
- [ ] Install dependencies: `@tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-image @tiptap/extension-placeholder`
- [ ] Create `TiptapEditor` component with toolbar
- [ ] Create `TiptapRenderer` component for public display
- [ ] Test JSON storage and rendering

### Server Actions
- [ ] Create `/src/app/actions/blog-actions.ts` with all CRUD operations
- [ ] Implement authentication checks
- [ ] Implement ownership verification
- [ ] Add proper error handling and logging

### Admin Routes
- [ ] Create `/admin/blog/page.tsx` - List view with filters
- [ ] Create `/admin/blog/new/page.tsx` - Create form
- [ ] Create `/admin/blog/[id]/edit/page.tsx` - Edit form
- [ ] Implement React Query hooks for blog operations
- [ ] Add toast notifications for success/error states

### Public Routes Migration
- [ ] Update `/blog/page.tsx` to fetch from database
- [ ] Update `/blog/[slug]/page.tsx` to fetch from database
- [ ] Update `/blog/category/[slug]/page.tsx` to fetch from database
- [ ] Update `/blog/tag/[tag]/page.tsx` to fetch from database
- [ ] Replace `TiptapRenderer` for content display
- [ ] Implement view tracking with `trackBlogViewAction`
- [ ] Update sitemap generation to use database
- [ ] Update RSS feed generation to use database

### Author Bio Integration
- [ ] Add author bio form to instructor/admin profile settings
- [ ] Update `EnhancedAuthorBio` to fetch from `profiles.bio`
- [ ] Display credentials and social links

### Testing & Migration
- [ ] Backfill 6 existing mock posts to database
- [ ] Verify all pages load correctly
- [ ] Test create/edit/delete flows
- [ ] Test publish/unpublish flows
- [ ] Verify RLS policies work correctly
- [ ] Test engagement features (likes, comments)
- [ ] Verify SEO elements still work (JSON-LD, sitemap, RSS)

---

## 7. Key Takeaways

1. **Database Design**:
   - Use triggers for auto-calculations (view counts, like counts)
   - Always include `IF NOT EXISTS` for idempotency
   - Create indexes for common query patterns
   - Use foreign keys with proper `ON DELETE` actions

2. **RLS Policies**:
   - Public can SELECT published content
   - Authors can manage their own content
   - Use service client for admin operations
   - Always drop existing policies before creating

3. **Server Actions**:
   - Always authenticate first with `requireAuth()`
   - Return consistent `ActionResult` type
   - Verify ownership for UPDATE/DELETE
   - Call `revalidatePath()` for cache invalidation
   - Log all errors for debugging

4. **Admin UI**:
   - Follow existing patterns (PageContainer, StatsGrid)
   - Use React Query for data operations
   - Implement optimistic updates for better UX
   - Show toast notifications for feedback

5. **Tiptap Integration**:
   - Store content as JSONB in database
   - Create separate Editor and Renderer components
   - Support basic formatting (headings, bold, italic, lists, links)
   - Add image upload support later if needed

---

## Next Steps

After completing this investigation:

1. **Review and approve** this investigation document
2. **Create database migrations** (143 and 144)
3. **Install Tiptap dependencies**
4. **Implement server actions**
5. **Build admin UI** following existing patterns
6. **Migrate public routes** to use database
7. **Test thoroughly** before merging to main

**Estimated Implementation Time**: 6-8 hours of focused work

---

**Investigation Complete** - Ready to proceed with Phase 4 implementation once approved.
