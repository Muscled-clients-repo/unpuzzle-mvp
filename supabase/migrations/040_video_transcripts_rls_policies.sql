-- Migration: Enable RLS policies for video_transcripts table
-- Description: Allow instructors to manage their own transcripts, students to read enrolled course transcripts

-- Enable RLS on video_transcripts table
ALTER TABLE video_transcripts ENABLE ROW LEVEL SECURITY;

-- Policy 1: Instructors can manage (INSERT/UPDATE/DELETE/SELECT) transcripts for their own courses
CREATE POLICY "instructors_manage_own_transcripts" ON video_transcripts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM videos v
      JOIN courses c ON v.course_id = c.id
      WHERE v.id = video_transcripts.video_id
      AND c.instructor_id = auth.uid()
    )
  );

-- Policy 2: Students can read (SELECT) transcripts if enrolled in the course
CREATE POLICY "students_read_enrolled_transcripts" ON video_transcripts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      JOIN videos v ON v.course_id = e.course_id
      WHERE v.id = video_transcripts.video_id
      AND e.user_id = auth.uid()
    )
  );