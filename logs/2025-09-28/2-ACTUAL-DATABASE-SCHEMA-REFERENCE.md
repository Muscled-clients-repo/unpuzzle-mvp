# ACTUAL DATABASE SCHEMA REFERENCE
**Date**: 2025-09-28
**Purpose**: Document the actual current database schema for junction table architecture
**Source**: Direct SQL queries from production database

## 📊 TABLE OVERVIEW
- ✅ `courses` - Course basic information
- ✅ `course_chapters` - Chapter structure within courses
- ✅ `course_chapter_media` - Junction table linking chapters to media
- ✅ `media_files` - Media library storage
- ❌ `videos` - CONFIRMED DELETED (does not exist)

## 📋 COURSES TABLE

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| instructor_id | uuid | NO | null |
| title | text | NO | null |
| description | text | YES | null |
| thumbnail_url | text | YES | null |
| status | text | NO | 'draft'::text |
| price | numeric | YES | 0 |
| is_free | boolean | YES | false |
| total_videos | integer | YES | 0 |
| total_duration_minutes | integer | YES | 0 |
| students | integer | YES | 0 |
| tags | ARRAY | YES | '{}'::text[] |
| rating | numeric | YES | 0.00 |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |
| category | text | YES | null |
| published_at | timestamp with time zone | YES | null |

**Key Findings:**
- ❌ NO `difficulty` column (was dropped in migration 072)
- ✅ Has `price`, `status`, `total_videos`, `total_duration_minutes`
- ✅ Standard course metadata structure

## 📋 COURSE_CHAPTERS TABLE

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | text | NO | null |
| course_id | uuid | NO | null |
| title | text | NO | null |
| description | text | YES | ''::text |
| order | integer | NO | 0 |
| is_published | boolean | YES | true |
| is_preview | boolean | YES | false |
| created_at | timestamp with time zone | YES | now() |
| updated_at | timestamp with time zone | YES | now() |

**Key Findings:**
- ✅ Chapter ID is TEXT format (not UUID)
- ✅ Has proper course_id FK to courses table
- ✅ Standard chapter structure with ordering

## 📋 COURSE_CHAPTER_MEDIA TABLE (Junction Table)

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| chapter_id | text | NO | null |
| media_file_id | uuid | NO | null |
| order_in_chapter | integer | NO | null |
| title | text | YES | null |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

**Key Findings:**
- ✅ Junction table properly implemented
- ✅ chapter_id is TEXT (matches course_chapters.id)
- ✅ media_file_id is UUID (matches media_files.id)
- ✅ Has custom title override capability
- ✅ Has ordering within chapter

## 📋 MEDIA_FILES TABLE

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| name | text | NO | null |
| original_name | text | NO | null |
| file_type | text | NO | null |
| mime_type | text | NO | null |
| file_size | bigint | NO | null |
| duration_seconds | numeric | YES | null |
| backblaze_file_id | text | YES | null |
| backblaze_url | text | YES | null |
| cdn_url | text | YES | null |
| thumbnail_url | text | YES | null |
| category | text | YES | 'uncategorized'::text |
| tags | ARRAY | YES | ARRAY[]::text[] |
| description | text | YES | null |
| usage_count | integer | YES | 0 |
| last_used_at | timestamp with time zone | YES | null |
| uploaded_by | uuid | NO | null |
| status | text | YES | 'active'::text |
| is_public | boolean | YES | false |
| created_at | timestamp with time zone | NO | timezone('utc'::text, now()) |
| updated_at | timestamp with time zone | NO | timezone('utc'::text, now()) |

**Key Findings:**
- ✅ Complete media library structure
- ✅ Has duration_seconds for video content
- ✅ Has CDN URLs and thumbnail support
- ✅ Usage tracking and metadata support

## 🔗 RELATIONSHIPS

### Junction Table Pattern
```
courses (id: uuid)
  ↓ 1:many
course_chapters (id: text, course_id: uuid)
  ↓ many:many via junction
course_chapter_media (chapter_id: text, media_file_id: uuid)
  ↓ many:1
media_files (id: uuid)
```

### Foreign Key Constraints
- `course_chapters.course_id` → `courses.id`
- `course_chapter_media.chapter_id` → `course_chapters.id` (added in migration 095)
- `course_chapter_media.media_file_id` → `media_files.id`

## ⚠️ SCHEMA MISMATCHES IDENTIFIED

### 1. Code Expects `difficulty` Column
**Error**: `column courses.difficulty does not exist`
**Fix Required**: Remove `difficulty` from all SELECT queries

### 2. Code References Deleted `videos` Table
**Error**: `Could not find the table 'public.videos'`
**Fix Required**: Remove ALL videos table references

### 3. TypeScript Interface Mismatches
**Issue**: Interfaces expect old data structure
**Fix Required**: Update all interfaces to match actual schema

## 📊 DATA STRUCTURE MAPPING

### Old Videos Table Pattern (DELETED)
```typescript
// THIS NO LONGER EXISTS
videos: {
  id: uuid,
  title: text,
  duration_seconds: number,
  chapter_id: text,
  course_id: uuid,
  order: number
}
```

### New Junction Table Pattern (CURRENT)
```typescript
// Junction record
course_chapter_media: {
  id: uuid,                    // Junction ID
  chapter_id: text,           // Links to course_chapters.id
  media_file_id: uuid,        // Links to media_files.id
  order_in_chapter: number,   // Position in chapter
  title: text | null,         // Custom title override
  created_at: timestamp,
  updated_at: timestamp
}

// Media data (via FK relationship)
media_files: {
  id: uuid,
  name: text,
  duration_seconds: number,
  cdn_url: text,
  thumbnail_url: text,
  // ... other media metadata
}
```

## ✅ NEXT STEPS FOR REBUILD

1. **Fix Schema Mismatches**: Remove `difficulty` from queries
2. **Remove Videos References**: Find and eliminate all videos table code
3. **Update TypeScript Interfaces**: Match actual database schema
4. **Test PostgREST Joins**: Verify FK relationships work with auto-joins
5. **Rebuild Components**: Use correct data structure throughout

**This schema reference should be used for all future code development.**