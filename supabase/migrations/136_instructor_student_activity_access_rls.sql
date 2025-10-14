-- Instructor Access to Student Activity Data (RLS Policies)
-- =============================================================================
-- PURPOSE: Allow instructors to view student activities (quizzes, reflections,
--          AI chats) for courses they own/teach
--
-- SECURITY: Instructors can ONLY access data from their own courses
--           Students can still manage their own data (existing policies remain)
--
-- TABLES AFFECTED:
--   - quiz_attempts
--   - reflections
--   - ai_interactions (if exists) or ai_interactions_temp
--
-- AUTHORIZATION FLOW:
--   1. Check if user is authenticated (auth.uid())
--   2. Check if user has role = 'instructor' in profiles
--   3. Verify instructor owns the course via courses.instructor_id
--   4. Allow SELECT access to student activity data
-- =============================================================================

-- =============================================================================
-- POLICY 1: Instructors can view quiz attempts for their courses
-- =============================================================================
CREATE POLICY "Instructors can view quiz attempts for their courses"
  ON quiz_attempts
  FOR SELECT
  USING (
    -- Verify requesting user is an instructor who owns the course
    EXISTS (
      SELECT 1
      FROM courses
      JOIN profiles ON profiles.id = auth.uid()
      WHERE courses.id = quiz_attempts.course_id::uuid
        AND courses.instructor_id = auth.uid()
        AND profiles.role = 'instructor'
    )
  );

-- =============================================================================
-- POLICY 2: Instructors can view reflections for their courses
-- =============================================================================
CREATE POLICY "Instructors can view reflections for their courses"
  ON reflections
  FOR SELECT
  USING (
    -- Verify requesting user is an instructor who owns the course
    EXISTS (
      SELECT 1
      FROM courses
      JOIN profiles ON profiles.id = auth.uid()
      WHERE courses.id = reflections.course_id::uuid
        AND courses.instructor_id = auth.uid()
        AND profiles.role = 'instructor'
    )
  );

-- =============================================================================
-- POLICY 3: Instructors can view AI interactions for their courses
-- =============================================================================
-- Check if ai_interactions table exists (not _temp)
DO $$
BEGIN
  -- Try to add policy to ai_interactions if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'ai_interactions'
  ) THEN
    EXECUTE '
      CREATE POLICY "Instructors can view AI interactions for their courses"
        ON ai_interactions
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1
            FROM courses
            JOIN profiles ON profiles.id = auth.uid()
            WHERE courses.id = ai_interactions.course_id::uuid
              AND courses.instructor_id = auth.uid()
              AND profiles.role = ''instructor''
          )
        );
    ';
  END IF;

  -- Try to add policy to ai_interactions_temp if it exists instead
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'ai_interactions_temp'
  ) THEN
    EXECUTE '
      CREATE POLICY "Instructors can view AI interactions for their courses"
        ON ai_interactions_temp
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1
            FROM courses
            JOIN profiles ON profiles.id = auth.uid()
            WHERE courses.id = ai_interactions_temp.course_id::uuid
              AND courses.instructor_id = auth.uid()
              AND profiles.role = ''instructor''
          )
        );
    ';
  END IF;
END $$;

-- =============================================================================
-- COMMENTS: Document the security model
-- =============================================================================
COMMENT ON POLICY "Instructors can view quiz attempts for their courses" ON quiz_attempts IS
  'Allows instructors to SELECT quiz_attempts for students enrolled in courses they own. Does not allow INSERT/UPDATE/DELETE.';

COMMENT ON POLICY "Instructors can view reflections for their courses" ON reflections IS
  'Allows instructors to SELECT reflections (voice memos, Loom videos) for students in courses they own. Does not allow INSERT/UPDATE/DELETE.';

-- =============================================================================
-- VERIFICATION QUERIES (Run these after migration to verify)
-- =============================================================================
-- 1. Check policies exist:
--    SELECT tablename, policyname, cmd FROM pg_policies
--    WHERE tablename IN ('quiz_attempts', 'reflections', 'ai_interactions')
--    ORDER BY tablename, policyname;
--
-- 2. Test instructor access (as instructor):
--    SELECT * FROM quiz_attempts WHERE course_id = 'your-course-id' LIMIT 1;
--
-- 3. Test unauthorized access (as different instructor):
--    SELECT * FROM quiz_attempts WHERE course_id = 'not-your-course-id' LIMIT 1;
--    (Should return 0 rows)
--
-- 4. Test student access still works:
--    SELECT * FROM quiz_attempts WHERE user_id = auth.uid();
--    (Should return student's own quiz attempts)
-- =============================================================================

-- =============================================================================
-- ROLLBACK INSTRUCTIONS
-- =============================================================================
-- If you need to remove these policies:
--
-- DROP POLICY IF EXISTS "Instructors can view quiz attempts for their courses" ON quiz_attempts;
-- DROP POLICY IF EXISTS "Instructors can view reflections for their courses" ON reflections;
-- DROP POLICY IF EXISTS "Instructors can view AI interactions for their courses" ON ai_interactions;
-- DROP POLICY IF EXISTS "Instructors can view AI interactions for their courses" ON ai_interactions_temp;
-- =============================================================================
