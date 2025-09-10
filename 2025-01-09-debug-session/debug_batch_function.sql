-- Debug function to systematically test each part of the batch linking function
-- This will isolate exactly which comparison is causing the "text = uuid" error

CREATE OR REPLACE FUNCTION debug_batch_linking_types(
  p_media_ids UUID[],
  p_chapter_id UUID,
  p_course_id UUID
)
RETURNS TABLE (
  step TEXT,
  status TEXT,
  details TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  media_id UUID;
  current_user_id UUID;
  test_result RECORD;
BEGIN
  -- Step 1: Test auth.uid() and its type
  BEGIN
    SELECT auth.uid(), pg_typeof(auth.uid()) INTO test_result;
    RETURN QUERY SELECT 'auth_uid_type', 'SUCCESS', 
      format('auth.uid() = %s, type = %s', test_result.uid, test_result.pg_typeof);
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT 'auth_uid_type', 'FAILED', SQLERRM;
  END;

  -- Step 2: Test auth.uid() casting to UUID
  BEGIN
    current_user_id := auth.uid()::uuid;
    RETURN QUERY SELECT 'auth_uid_cast_uuid', 'SUCCESS', 
      format('Successfully cast to UUID: %s', current_user_id);
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT 'auth_uid_cast_uuid', 'FAILED', SQLERRM;
  END;

  -- Step 3: Test parameter types
  RETURN QUERY SELECT 'parameter_types', 'INFO', 
    format('p_chapter_id type: %s, p_course_id type: %s, array length: %s', 
           pg_typeof(p_chapter_id), pg_typeof(p_course_id), array_length(p_media_ids, 1));

  -- Step 4: Test course_chapters table query
  BEGIN
    PERFORM 1 FROM course_chapters WHERE id = p_chapter_id;
    RETURN QUERY SELECT 'course_chapters_lookup', 'SUCCESS', 'Chapter ID found in course_chapters';
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT 'course_chapters_lookup', 'FAILED', SQLERRM;
  END;

  -- Step 5: Test course_chapters with course_id
  BEGIN
    PERFORM 1 FROM course_chapters 
    WHERE id = p_chapter_id AND course_id = p_course_id;
    RETURN QUERY SELECT 'course_chapters_full_lookup', 'SUCCESS', 
      'Chapter and course ID match found';
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT 'course_chapters_full_lookup', 'FAILED', SQLERRM;
  END;

  -- Step 6: Test courses table query
  BEGIN
    PERFORM 1 FROM courses WHERE id = p_course_id;
    RETURN QUERY SELECT 'courses_lookup', 'SUCCESS', 'Course ID found';
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT 'courses_lookup', 'FAILED', SQLERRM;
  END;

  -- Step 7: Test courses with instructor_id (THE MOST LIKELY CULPRIT)
  BEGIN
    PERFORM 1 FROM courses 
    WHERE id = p_course_id AND instructor_id = current_user_id;
    RETURN QUERY SELECT 'courses_instructor_match', 'SUCCESS', 
      'Course instructor match found';
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT 'courses_instructor_match', 'FAILED', SQLERRM;
  END;

  -- Step 8: Test the full EXISTS query (COMBINED TEST)
  BEGIN
    PERFORM 1 FROM course_chapters 
    WHERE id = p_chapter_id 
    AND course_id = p_course_id
    AND EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = p_course_id 
      AND courses.instructor_id = current_user_id
    );
    RETURN QUERY SELECT 'full_exists_query', 'SUCCESS', 'Full authorization check passed';
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT 'full_exists_query', 'FAILED', SQLERRM;
  END;

  -- Step 9: Test media_files queries for each media ID
  FOREACH media_id IN ARRAY p_media_ids
  LOOP
    BEGIN
      PERFORM 1 FROM media_files WHERE id = media_id;
      RETURN QUERY SELECT format('media_file_%s_exists', media_id), 'SUCCESS', 
        'Media file found by ID';
    EXCEPTION
      WHEN OTHERS THEN
        RETURN QUERY SELECT format('media_file_%s_exists', media_id), 'FAILED', SQLERRM;
    END;

    -- Step 10: Test media_files with uploaded_by (ANOTHER LIKELY CULPRIT)
    BEGIN
      PERFORM 1 FROM media_files 
      WHERE id = media_id AND uploaded_by = current_user_id;
      RETURN QUERY SELECT format('media_file_%s_owner_match', media_id), 'SUCCESS', 
        'Media file ownership verified';
    EXCEPTION
      WHEN OTHERS THEN
        RETURN QUERY SELECT format('media_file_%s_owner_match', media_id), 'FAILED', SQLERRM;
    END;
  END LOOP;

  -- Step 11: Test videos table duplicate check
  FOREACH media_id IN ARRAY p_media_ids
  LOOP
    BEGIN
      PERFORM 1 FROM videos 
      WHERE course_id = p_course_id 
      AND chapter_id = p_chapter_id 
      AND media_file_id = media_id;
      RETURN QUERY SELECT format('video_duplicate_check_%s', media_id), 'SUCCESS', 
        'Duplicate check query executed successfully';
    EXCEPTION
      WHEN OTHERS THEN
        RETURN QUERY SELECT format('video_duplicate_check_%s', media_id), 'FAILED', SQLERRM;
    END;
  END LOOP;

  RETURN;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION debug_batch_linking_types(UUID[], UUID, UUID) TO authenticated;

-- Test call example (replace with real values):
-- SELECT * FROM debug_batch_linking_types(
--   ARRAY['your-media-uuid-1', 'your-media-uuid-2']::UUID[],
--   'your-chapter-uuid'::UUID,
--   'your-course-uuid'::UUID
-- );