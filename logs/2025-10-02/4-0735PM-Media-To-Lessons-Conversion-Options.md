# Media to Standalone Lessons Conversion - Implementation Options
**Date**: October 2, 2025 - 7:35 PM
**Context**: Convert media files from `/instructor/media` into standalone lessons at `/instructor/lessons`
**Goal**: Free marketing content + AI feature testing for prospects

---

## Current State Analysis

### What You Have Now:

**`/instructor/media`** (Fully Implemented)
- ✅ Database: `media_files` table with real data
- ✅ Features: Thumbnails, durations, tags, CDN URLs
- ✅ Real uploads to Backblaze B2
- ✅ 30 files per page with lazy loading

**`/instructor/lessons`** (UI Only - Mock Data)
- ✅ UI: Complete lesson cards, analytics, sharing
- ❌ Database: No `lessons` table yet
- ❌ Data: Mock Zustand store only
- ❌ Backend: No server actions

**Key Difference**:
- Media = Private assets for courses
- Lessons = Public/free standalone content for marketing

---

## Architecture Options

### **Option 1: Reference Model (Recommended)**
**Link lessons to existing media files without duplication**

#### Database Schema:
```sql
CREATE TABLE standalone_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES profiles(id),
  media_file_id UUID NOT NULL REFERENCES media_files(id),  -- Links to existing media

  -- Lesson-specific metadata
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[],

  -- Publishing
  status VARCHAR(20) DEFAULT 'draft',  -- draft, published, archived
  visibility VARCHAR(20) DEFAULT 'public',  -- public, unlisted, private
  is_free BOOLEAN DEFAULT true,

  -- Marketing
  cta_text TEXT,
  cta_link TEXT,
  related_course_id UUID REFERENCES courses(id),

  -- AI Features (enable/disable per lesson)
  transcript_enabled BOOLEAN DEFAULT true,
  confusions_enabled BOOLEAN DEFAULT true,
  segment_selection_enabled BOOLEAN DEFAULT true,

  -- Analytics (denormalized for performance)
  total_views INT DEFAULT 0,
  unique_views INT DEFAULT 0,
  ai_interactions INT DEFAULT 0,
  avg_watch_time_seconds INT DEFAULT 0,
  completion_rate INT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(media_file_id)  -- One lesson per media file
)

CREATE INDEX idx_standalone_lessons_instructor ON standalone_lessons(instructor_id);
CREATE INDEX idx_standalone_lessons_status ON standalone_lessons(status);
CREATE INDEX idx_standalone_lessons_media ON standalone_lessons(media_file_id);
```

#### Pros:
- ✅ **No file duplication** - Reuses existing thumbnails, videos, CDN URLs
- ✅ **Single source of truth** for video metadata (duration, file_size)
- ✅ **Efficient storage** - Only stores lesson-specific data
- ✅ **Easy sync** - If media thumbnail/duration updates, lesson gets it automatically
- ✅ **Simpler backend** - Fewer database operations

#### Cons:
- ⚠️ **Media dependency** - Can't delete media file if lesson uses it
- ⚠️ **Complex queries** - Need joins to get full lesson data
- ⚠️ **Lesson tags separate** from media tags (could confuse users)

#### Best For:
- Production-ready implementation
- Long-term scalability
- Minimizing storage costs

---

### **Option 2: Snapshot Model**
**Copy media file data into lessons table at creation time**

#### Database Schema:
```sql
CREATE TABLE standalone_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES profiles(id),
  source_media_file_id UUID REFERENCES media_files(id),  -- Optional reference

  -- Video data (copied from media_files)
  video_url TEXT NOT NULL,  -- Backblaze URL
  cdn_url TEXT,
  thumbnail_url TEXT,
  duration_seconds INT,
  file_size BIGINT,

  -- Lesson metadata
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[],

  -- Publishing (same as Option 1)
  status VARCHAR(20) DEFAULT 'draft',
  visibility VARCHAR(20) DEFAULT 'public',
  is_free BOOLEAN DEFAULT true,

  -- Marketing (same as Option 1)
  cta_text TEXT,
  cta_link TEXT,
  related_course_id UUID REFERENCES courses(id),

  -- AI Features (same as Option 1)
  transcript_enabled BOOLEAN DEFAULT true,
  confusions_enabled BOOLEAN DEFAULT true,
  segment_selection_enabled BOOLEAN DEFAULT true,

  -- Analytics (same as Option 1)
  total_views INT DEFAULT 0,
  -- ... etc

  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
)
```

#### Pros:
- ✅ **Complete independence** - Lesson data self-contained
- ✅ **Simpler queries** - No joins needed
- ✅ **Faster reads** - All data in one table
- ✅ **Can delete source media** - Lesson survives independently

#### Cons:
- ❌ **Storage duplication** - Stores video URLs, thumbnails again
- ❌ **Sync issues** - If media thumbnail updates, lesson doesn't get it
- ❌ **More complex updates** - Need to update both media and lesson
- ❌ **Larger database** - Duplicates metadata

#### Best For:
- Rapid prototyping
- When lessons truly independent from media library
- If you plan to delete source media files

---

### **Option 3: Hybrid Model**
**Reference media but cache critical fields**

#### Database Schema:
```sql
CREATE TABLE standalone_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES profiles(id),
  media_file_id UUID NOT NULL REFERENCES media_files(id),

  -- Cached fields (updated on media changes)
  cached_thumbnail_url TEXT,
  cached_duration_seconds INT,
  cache_updated_at TIMESTAMPTZ,

  -- Lesson-specific (same as Option 1)
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[],
  status VARCHAR(20) DEFAULT 'draft',
  -- ... etc
)

-- Trigger to update cache when media_files changes
CREATE OR REPLACE FUNCTION update_lesson_cache()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE standalone_lessons
  SET
    cached_thumbnail_url = NEW.thumbnail_url,
    cached_duration_seconds = NEW.duration_seconds,
    cache_updated_at = NOW()
  WHERE media_file_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER media_files_cache_update
AFTER UPDATE OF thumbnail_url, duration_seconds ON media_files
FOR EACH ROW
EXECUTE FUNCTION update_lesson_cache();
```

#### Pros:
- ✅ **Best of both worlds** - References + fast queries
- ✅ **No joins needed** for common queries
- ✅ **Auto-sync** via database triggers
- ✅ **Efficient** - Only caches frequently accessed fields

#### Cons:
- ⚠️ **More complex** - Triggers to maintain
- ⚠️ **Cache staleness risk** - If triggers fail
- ⚠️ **Development overhead** - More code to write

#### Best For:
- High-traffic scenarios (lots of lesson views)
- When query performance is critical
- Teams comfortable with database triggers

---

## UI/UX Flow Options

### **Flow 1: Action Menu in Media Grid** (Simplest)

**User Experience**:
1. Navigate to `/instructor/media`
2. Click "⋮" menu on media card
3. Select "Convert to Lesson"
4. Opens modal with:
   - Pre-filled title (from media filename)
   - Description field
   - Tags (inherited from media)
   - CTA button text/link
   - Publish immediately checkbox
5. Click "Create Lesson"
6. Success toast + redirect to `/instructor/lessons`

**Implementation**:
```tsx
// In MediaCard dropdown menu
<DropdownMenuItem onClick={() => handleConvertToLesson(item.id)}>
  <Sparkles className="mr-2 h-4 w-4" />
  Convert to Lesson
</DropdownMenuItem>
```

**Pros**:
- ⚡ Fastest to implement (1-2 hours)
- 🎯 Clear intent - user explicitly chooses
- 📱 Works in existing UI

**Cons**:
- ⚠️ One-at-a-time conversion
- ⚠️ No bulk operations

---

### **Flow 2: Bulk Selection** (Most Flexible)

**User Experience**:
1. Navigate to `/instructor/media`
2. Enable selection mode
3. Select multiple media files
4. Click "Convert to Lessons" in bulk toolbar
5. Opens wizard:
   - Step 1: Review selected files
   - Step 2: Set defaults (tags, CTA, visibility)
   - Step 3: Individual customization (optional)
   - Step 4: Confirm & create
6. Shows progress bar for bulk creation

**Implementation**:
```tsx
// In BulkSelectionToolbar
<Button onClick={() => handleBulkConvertToLessons(selectedFiles)}>
  <Sparkles className="mr-2 h-4 w-4" />
  Convert {selectedFiles.size} to Lessons
</Button>
```

**Pros**:
- 🚀 Efficient for multiple files
- 🎨 Consistent defaults across batch
- 💪 Power user friendly

**Cons**:
- ⏱️ Longer implementation (4-6 hours)
- 🧩 More complex UI/UX

---

### **Flow 3: Dedicated Conversion Page** (Most Polished)

**User Experience**:
1. Navigate to `/instructor/media/convert-to-lessons` (new route)
2. See all media files with "Lesson Status" column:
   - ✅ Already a lesson
   - ➕ Can be converted
   - 🔒 Used in courses (optional warning)
3. Checkbox selection with preview
4. Batch convert with wizard
5. Live preview of lesson appearance

**Implementation**:
- New route: `/instructor/media/convert-to-lessons/page.tsx`
- Reuses MediaGrid component
- Custom toolbar with conversion actions

**Pros**:
- 🎯 Dedicated workflow (no clutter in main media)
- 📊 Clear overview of conversion status
- 🎨 Better UX for bulk operations
- 🔍 Easy to find "convertible" media

**Cons**:
- ⏱️ Most development time (1-2 days)
- 🧭 Extra navigation step

---

## Backend Implementation Options

### **Approach A: Server Action** (Recommended)

**File**: `src/app/actions/lesson-actions.ts`

```typescript
export async function convertMediaToLessonAction(
  mediaFileId: string,
  lessonData: {
    title?: string
    description?: string
    tags?: string[]
    ctaText?: string
    ctaLink?: string
    publishImmediately?: boolean
  }
) {
  const supabase = await createSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Get media file
  const { data: mediaFile } = await supabase
    .from('media_files')
    .select('*')
    .eq('id', mediaFileId)
    .single()

  // Create lesson (using Option 1: Reference Model)
  const { data: lesson, error } = await supabase
    .from('standalone_lessons')
    .insert({
      instructor_id: user.id,
      media_file_id: mediaFileId,
      title: lessonData.title || mediaFile.name,
      description: lessonData.description || '',
      tags: lessonData.tags || mediaFile.tags || [],
      status: lessonData.publishImmediately ? 'published' : 'draft',
      published_at: lessonData.publishImmediately ? new Date().toISOString() : null,
      cta_text: lessonData.ctaText,
      cta_link: lessonData.ctaLink,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, lesson }
}
```

**Pros**:
- ✅ Architecture-compliant (Pattern 05)
- ✅ Easy to call from client components
- ✅ Automatic authentication
- ✅ Type-safe with TypeScript

---

### **Approach B: API Route** (For Complex Operations)

**When to use**:
- Bulk conversions (100+ files)
- Long-running operations
- Need webhooks or external API calls
- File processing required

**File**: `src/app/api/lessons/convert/route.ts`

```typescript
export async function POST(req: Request) {
  // Handle streaming responses for progress
  // Better for bulk operations
}
```

---

## Recommended Implementation Plan

### **🎯 Recommended Combo: Option 1 + Flow 1 + Approach A**

**Why**:
- ✅ **Fastest MVP**: 2-4 hours total
- ✅ **Clean architecture**: Reference model prevents duplication
- ✅ **Simple UX**: Action menu in existing media grid
- ✅ **Scalable**: Easy to add bulk operations later

**Phase 1: Core Functionality** (2-4 hours)
1. Create `standalone_lessons` table (30 min)
2. Create `convertMediaToLessonAction` server action (1 hour)
3. Add "Convert to Lesson" menu item in MediaCard (30 min)
4. Create ConvertToLessonModal component (1 hour)
5. Update lessons page to fetch from database (1 hour)

**Phase 2: Enhancements** (Optional, 2-4 hours)
1. Add bulk conversion in BulkSelectionToolbar
2. Add "Already a lesson" indicator in media grid
3. Add analytics tracking
4. Add share link generation

---

## Database Migration Example

```sql
-- Migration: Create standalone_lessons table
CREATE TABLE standalone_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  media_file_id UUID NOT NULL REFERENCES media_files(id) ON DELETE RESTRICT,

  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',

  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'unlisted', 'private')),
  is_free BOOLEAN DEFAULT true,

  cta_text TEXT,
  cta_link TEXT,
  related_course_id UUID REFERENCES courses(id) ON DELETE SET NULL,

  transcript_enabled BOOLEAN DEFAULT true,
  confusions_enabled BOOLEAN DEFAULT true,
  segment_selection_enabled BOOLEAN DEFAULT true,

  total_views INT DEFAULT 0,
  unique_views INT DEFAULT 0,
  ai_interactions INT DEFAULT 0,
  avg_watch_time_seconds INT DEFAULT 0,
  completion_rate INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_lesson_per_media UNIQUE(media_file_id)
);

CREATE INDEX idx_standalone_lessons_instructor ON standalone_lessons(instructor_id);
CREATE INDEX idx_standalone_lessons_status ON standalone_lessons(status, published_at DESC);
CREATE INDEX idx_standalone_lessons_visibility ON standalone_lessons(visibility) WHERE status = 'published';

-- RLS Policies
ALTER TABLE standalone_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Instructors can view own lessons"
  ON standalone_lessons FOR SELECT
  USING (auth.uid() = instructor_id);

CREATE POLICY "Instructors can create own lessons"
  ON standalone_lessons FOR INSERT
  WITH CHECK (auth.uid() = instructor_id);

CREATE POLICY "Instructors can update own lessons"
  ON standalone_lessons FOR UPDATE
  USING (auth.uid() = instructor_id);

CREATE POLICY "Instructors can delete own lessons"
  ON standalone_lessons FOR DELETE
  USING (auth.uid() = instructor_id);

-- Public can view published free lessons
CREATE POLICY "Public can view published lessons"
  ON standalone_lessons FOR SELECT
  USING (status = 'published' AND visibility = 'public');
```

---

## Key Decision Points

### 1. **Should lessons be truly independent or reference media?**
   - **Recommendation**: Reference (Option 1)
   - **Reason**: Avoids duplication, easier maintenance

### 2. **Single or bulk conversion?**
   - **Recommendation**: Start single, add bulk later
   - **Reason**: Faster MVP, can iterate

### 3. **Where should conversion UI live?**
   - **Recommendation**: Media grid action menu
   - **Reason**: Discoverable, minimal navigation

### 4. **Migrate Zustand lessons to database?**
   - **Recommendation**: Yes, create real `standalone_lessons` table
   - **Reason**: Need persistence, analytics, sharing

---

## Next Steps

1. **Choose your option combo** (recommend: Option 1 + Flow 1 + Approach A)
2. **Create database migration** for `standalone_lessons` table
3. **Implement server action** for conversion
4. **Add UI** to media grid
5. **Test** with a few media files
6. **Iterate** based on usage

Let me know which combination you prefer, and I'll start implementing!
