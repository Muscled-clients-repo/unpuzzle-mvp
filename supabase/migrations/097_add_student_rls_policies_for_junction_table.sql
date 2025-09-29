-- Add RLS policies for students to access course content via junction table
-- Students can access chapters and media for courses assigned to their goals

-- 1. Allow students to read course_chapters for courses they have access to via goals
CREATE POLICY "Students can read course chapters for their goal-assigned courses"
ON course_chapters
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM course_goal_assignments cga
    INNER JOIN profiles p ON p.current_goal_id = cga.goal_id
    WHERE cga.course_id = course_chapters.course_id
    AND p.id = auth.uid()
  )
);

-- 2. Allow students to read course_chapter_media for chapters they can access
CREATE POLICY "Students can read course chapter media for accessible chapters"
ON course_chapter_media
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM course_chapters cc
    INNER JOIN course_goal_assignments cga ON cga.course_id = cc.course_id
    INNER JOIN profiles p ON p.current_goal_id = cga.goal_id
    WHERE cc.id = course_chapter_media.chapter_id
    AND p.id = auth.uid()
  )
);

-- 3. Allow students to read media_files that are linked via course_chapter_media
CREATE POLICY "Students can read media files linked to their accessible chapters"
ON media_files
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM course_chapter_media ccm
    INNER JOIN course_chapters cc ON cc.id = ccm.chapter_id
    INNER JOIN course_goal_assignments cga ON cga.course_id = cc.course_id
    INNER JOIN profiles p ON p.current_goal_id = cga.goal_id
    WHERE ccm.media_file_id = media_files.id
    AND p.id = auth.uid()
  )
);

-- 4. Verify RLS is enabled on all relevant tables
ALTER TABLE course_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_chapter_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;

-- 5. Add comment for documentation
COMMENT ON POLICY "Students can read course chapters for their goal-assigned courses" ON course_chapters
IS 'Allows students to read chapters from courses assigned to their current goal';

COMMENT ON POLICY "Students can read course chapter media for accessible chapters" ON course_chapter_media
IS 'Allows students to read media junction records for chapters they can access';

COMMENT ON POLICY "Students can read media files linked to their accessible chapters" ON media_files
IS 'Allows students to read media files linked to chapters from their goal-assigned courses';