-- Migration 139: Backfill Historical Activities
-- Purpose: Populate community_activities with existing historical data
-- Date: 2025-10-16

-- This migration will run once to backfill all existing reflections, quizzes, etc.
-- into the community_activities table so instructors can see historical student activity

-- ============================================================
-- STEP 1: Backfill Reflections (text, screenshot, voice, loom)
-- ============================================================

INSERT INTO community_activities (
  user_id, activity_type, content, goal_id, goal_title,
  media_file_id, video_title, course_id, timestamp_seconds,
  reflection_id, metadata, is_public, created_at
)
SELECT
  r.user_id,
  r.reflection_type,
  CASE
    WHEN r.reflection_type = 'voice' THEN 'Voice memo: ' || COALESCE(LEFT(r.reflection_text, 100), 'No transcript')
    WHEN r.reflection_type = 'screenshot' THEN 'Screenshot: ' || COALESCE(LEFT(r.reflection_text, 100), 'No description')
    WHEN r.reflection_type = 'loom' THEN 'Loom video: ' || COALESCE(LEFT(r.reflection_text, 100), 'No description')
    ELSE LEFT(r.reflection_text, 200)
  END,
  p.current_goal_id,
  p.goal_title,
  r.video_id,
  mf.name,
  r.course_id,
  r.video_timestamp_seconds,
  r.id,
  jsonb_build_object(
    'file_url', r.file_url,
    'duration_seconds', r.duration_seconds,
    'reflection_prompt', r.reflection_prompt
  ),
  false,
  r.created_at
FROM reflections r
INNER JOIN profiles p ON p.id = r.user_id
LEFT JOIN media_files mf ON mf.id = r.video_id
WHERE NOT EXISTS (
  SELECT 1 FROM community_activities ca
  WHERE ca.reflection_id = r.id
)
AND (r.video_id IS NULL OR EXISTS (SELECT 1 FROM media_files WHERE id = r.video_id))
AND (r.course_id IS NULL OR EXISTS (SELECT 1 FROM courses WHERE id = r.course_id));

-- ============================================================
-- STEP 2: Backfill Quiz Attempts
-- ============================================================

INSERT INTO community_activities (
  user_id, activity_type, content, goal_id, goal_title,
  media_file_id, video_title, course_id, timestamp_seconds,
  quiz_attempt_id, metadata, is_public, created_at
)
SELECT
  qa.user_id,
  'quiz',
  'Quiz completed: ' || qa.score || '/' || qa.total_questions || ' correct (' || qa.percentage || '%)',
  p.current_goal_id,
  p.goal_title,
  qa.video_id,
  mf.name,
  qa.course_id,
  qa.video_timestamp,
  qa.id,
  jsonb_build_object(
    'percentage', qa.percentage,
    'score', qa.score,
    'total_questions', qa.total_questions,
    'quiz_duration_seconds', qa.quiz_duration_seconds
  ),
  false,
  qa.created_at
FROM quiz_attempts qa
INNER JOIN profiles p ON p.id = qa.user_id
LEFT JOIN media_files mf ON mf.id = qa.video_id
WHERE qa.user_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM community_activities ca
  WHERE ca.quiz_attempt_id = qa.id
)
AND (qa.video_id IS NULL OR EXISTS (SELECT 1 FROM media_files WHERE id = qa.video_id))
AND (qa.course_id IS NULL OR EXISTS (SELECT 1 FROM courses WHERE id = qa.course_id));

-- ============================================================
-- STEP 3: Backfill AI Conversations
-- ============================================================

INSERT INTO community_activities (
  user_id, activity_type, content, goal_id, goal_title,
  media_file_id, video_title, timestamp_seconds,
  ai_conversation_id, metadata, is_public, created_at
)
SELECT
  vac.user_id,
  'ai_chat',
  'AI Chat: ' || LEFT(vac.user_message, 150) || '...',
  p.current_goal_id,
  p.goal_title,
  vac.media_file_id,
  mf.name,
  vac.video_timestamp,
  vac.id,
  jsonb_build_object(
    'model_used', vac.model_used,
    'conversation_context', vac.conversation_context
  ),
  false,
  vac.created_at
FROM video_ai_conversations vac
INNER JOIN profiles p ON p.id = vac.user_id
LEFT JOIN media_files mf ON mf.id = vac.media_file_id
WHERE NOT EXISTS (
  SELECT 1 FROM community_activities ca
  WHERE ca.ai_conversation_id = vac.id
)
AND (vac.media_file_id IS NULL OR EXISTS (SELECT 1 FROM media_files WHERE id = vac.media_file_id));

-- ============================================================
-- STEP 4: Backfill Course Completions
-- ============================================================

INSERT INTO community_activities (
  user_id, activity_type, content, goal_id, goal_title,
  course_id, metadata, is_public, created_at
)
SELECT
  e.user_id,
  'course_completion',
  'Completed course: ' || COALESCE(c.title, 'Unknown Course'),
  p.current_goal_id,
  p.goal_title,
  e.course_id,
  jsonb_build_object(
    'course_title', c.title,
    'completed_videos', e.completed_videos,
    'total_videos', e.total_videos
  ),
  true,
  COALESCE(e.completed_at, e.last_accessed_at, NOW())
FROM enrollments e
INNER JOIN profiles p ON p.id = e.user_id
LEFT JOIN courses c ON c.id = e.course_id
WHERE e.progress_percent >= 100
  AND (e.course_id IS NULL OR EXISTS (SELECT 1 FROM courses WHERE id = e.course_id))
  AND NOT EXISTS (
    SELECT 1 FROM community_activities ca
    WHERE ca.user_id = e.user_id
      AND ca.course_id = e.course_id
      AND ca.activity_type = 'course_completion'
  );

-- ============================================================
-- STEP 5: Backfill Daily Notes
-- ============================================================

INSERT INTO community_activities (
  user_id, activity_type, content, goal_id, goal_title,
  metadata, is_public, created_at
)
SELECT
  udn.user_id,
  'daily_note_submission',
  'Daily note: ' || LEFT(udn.note, 200),
  udn.goal_id,
  p.goal_title,
  jsonb_build_object('note_date', udn.note_date),
  false,
  udn.created_at
FROM user_daily_notes udn
INNER JOIN profiles p ON p.id = udn.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM community_activities ca
  WHERE ca.user_id = udn.user_id
    AND ca.activity_type = 'daily_note_submission'
    AND DATE(ca.created_at) = DATE(udn.created_at)
);

-- ============================================================
-- STEP 6: Backfill Revenue Proof Submissions
-- ============================================================

INSERT INTO community_activities (
  user_id, activity_type, content, goal_id, goal_title,
  conversation_message_id, metadata, is_public, created_at
)
SELECT
  cm.sender_id,
  'revenue_proof_submission',
  cm.content,
  p.current_goal_id,
  p.goal_title,
  cm.id,
  cm.metadata,
  false,
  cm.created_at
FROM conversation_messages cm
INNER JOIN profiles p ON p.id = cm.sender_id
WHERE cm.message_type = 'revenue_submission'
  AND NOT EXISTS (
    SELECT 1 FROM community_activities ca
    WHERE ca.conversation_message_id = cm.id
  );

-- ============================================================
-- STEP 7: Verification & Summary
-- ============================================================

DO $$
DECLARE
  reflections_count INTEGER;
  quizzes_count INTEGER;
  ai_chats_count INTEGER;
  courses_count INTEGER;
  notes_count INTEGER;
  revenue_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO reflections_count
  FROM community_activities
  WHERE activity_type IN ('text', 'screenshot', 'voice', 'loom');

  SELECT COUNT(*) INTO quizzes_count
  FROM community_activities
  WHERE activity_type = 'quiz';

  SELECT COUNT(*) INTO ai_chats_count
  FROM community_activities
  WHERE activity_type = 'ai_chat';

  SELECT COUNT(*) INTO courses_count
  FROM community_activities
  WHERE activity_type = 'course_completion';

  SELECT COUNT(*) INTO notes_count
  FROM community_activities
  WHERE activity_type = 'daily_note_submission';

  SELECT COUNT(*) INTO revenue_count
  FROM community_activities
  WHERE activity_type = 'revenue_proof_submission';

  total_count := reflections_count + quizzes_count + ai_chats_count + courses_count + notes_count + revenue_count;

  RAISE NOTICE '✅ Migration 139 Complete - Historical Data Backfilled';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Activities populated:';
  RAISE NOTICE '  - Reflections (text/screenshot/voice/loom): %', reflections_count;
  RAISE NOTICE '  - Quiz completions: %', quizzes_count;
  RAISE NOTICE '  - AI conversations: %', ai_chats_count;
  RAISE NOTICE '  - Course completions: %', courses_count;
  RAISE NOTICE '  - Daily notes: %', notes_count;
  RAISE NOTICE '  - Revenue submissions: %', revenue_count;
  RAISE NOTICE '================================================';
  RAISE NOTICE 'TOTAL HISTORICAL ACTIVITIES: %', total_count;
END $$;
