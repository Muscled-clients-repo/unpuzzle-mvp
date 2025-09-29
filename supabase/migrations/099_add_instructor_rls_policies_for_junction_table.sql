-- Add RLS policies for instructors to manage course content via junction table
-- Instructors can create, read, update, delete course_chapter_media for their own courses

-- 1. Allow instructors to insert course_chapter_media for their own courses
CREATE POLICY "Instructors can insert course chapter media for their courses"
ON course_chapter_media
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM course_chapters cc
    INNER JOIN courses c ON c.id = cc.course_id
    WHERE cc.id = course_chapter_media.chapter_id
    AND c.instructor_id = auth.uid()
  )
);

-- 2. Allow instructors to read course_chapter_media for their own courses
CREATE POLICY "Instructors can read course chapter media for their courses"
ON course_chapter_media
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM course_chapters cc
    INNER JOIN courses c ON c.id = cc.course_id
    WHERE cc.id = course_chapter_media.chapter_id
    AND c.instructor_id = auth.uid()
  )
);

-- 3. Allow instructors to update course_chapter_media for their own courses
CREATE POLICY "Instructors can update course chapter media for their courses"
ON course_chapter_media
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM course_chapters cc
    INNER JOIN courses c ON c.id = cc.course_id
    WHERE cc.id = course_chapter_media.chapter_id
    AND c.instructor_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM course_chapters cc
    INNER JOIN courses c ON c.id = cc.course_id
    WHERE cc.id = course_chapter_media.chapter_id
    AND c.instructor_id = auth.uid()
  )
);

-- 4. Allow instructors to delete course_chapter_media for their own courses
CREATE POLICY "Instructors can delete course chapter media for their courses"
ON course_chapter_media
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM course_chapters cc
    INNER JOIN courses c ON c.id = cc.course_id
    WHERE cc.id = course_chapter_media.chapter_id
    AND c.instructor_id = auth.uid()
  )
);

-- 5. Add comments for documentation
COMMENT ON POLICY "Instructors can insert course chapter media for their courses" ON course_chapter_media
IS 'Allows instructors to link media files to chapters in their own courses';

COMMENT ON POLICY "Instructors can read course chapter media for their courses" ON course_chapter_media
IS 'Allows instructors to view media linked to chapters in their own courses';

COMMENT ON POLICY "Instructors can update course chapter media for their courses" ON course_chapter_media
IS 'Allows instructors to modify media links (title, order, transcripts) in their own courses';

COMMENT ON POLICY "Instructors can delete course chapter media for their courses" ON course_chapter_media
IS 'Allows instructors to unlink media from chapters in their own courses';