-- Migration: Fix RLS policies to use goal-based access instead of enrollment
-- Description: Students can access transcripts if their goals match course goals

-- Drop the old enrollment-based policies
DROP POLICY IF EXISTS "students_read_enrolled_transcripts" ON video_transcripts;
DROP POLICY IF EXISTS "instructors_manage_own_transcripts" ON video_transcripts;

-- Policy 1: Instructors can manage transcripts for their own courses
CREATE POLICY "instructors_manage_own_transcripts" ON video_transcripts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM videos v
      JOIN courses c ON v.course_id = c.id
      WHERE v.id = video_transcripts.video_id
      AND c.instructor_id = auth.uid()
    )
  );

-- Policy 2: Students can read transcripts if their goals match course goals
CREATE POLICY "students_read_goal_matched_transcripts" ON video_transcripts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM videos v
      JOIN courses c ON v.course_id = c.id
      JOIN profiles p ON p.id = auth.uid()
      JOIN course_goal_assignments cga ON cga.course_id = c.id
      WHERE v.id = video_transcripts.video_id
      AND cga.goal_id = p.current_goal_id
    )
  );