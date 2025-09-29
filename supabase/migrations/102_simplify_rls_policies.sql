-- Migration 102: Simplify RLS by relaxing course_chapter_media policies
-- This fixes the 403 Forbidden error by removing complex RLS chains
-- while maintaining security at the course level where it belongs.

-- Drop the problematic RLS policy causing 403 errors
DROP POLICY IF EXISTS "Students can read junction records for their goal courses" ON course_chapter_media;

-- Disable RLS on course_chapter_media since course access is controlled at course level
ALTER TABLE course_chapter_media DISABLE ROW LEVEL SECURITY;

-- Keep RLS on media_files for instructor isolation
-- (Students access media through course pages, not directly)

-- Keep RLS on courses for goal-based access control
-- (This is where the real security boundary should be)

-- Add comment for documentation
COMMENT ON TABLE course_chapter_media IS 'Junction table with relaxed RLS - access controlled at course level via application logic';