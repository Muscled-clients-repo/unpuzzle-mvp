-- Migration 052: Check quiz attempts data integrity manually
-- Purpose: Since migration 051 didn't show NOTICE messages, check manually

-- Check 1: Count total quiz attempts
SELECT 'Total quiz attempts:' as check_type, COUNT(*) as result
FROM quiz_attempts;

-- Check 2: Check current column types
SELECT
    'Column types:' as check_type,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'quiz_attempts'
  AND column_name IN ('video_id', 'course_id');

-- Check 3: Check for invalid video_id references
SELECT
    'Invalid video_id count:' as check_type,
    COUNT(*) as result
FROM quiz_attempts qa
WHERE qa.video_id NOT IN (
    SELECT id::TEXT FROM videos
);

-- Check 4: Check for invalid course_id references
SELECT
    'Invalid course_id count:' as check_type,
    COUNT(*) as result
FROM quiz_attempts qa
WHERE qa.course_id NOT IN (
    SELECT id::TEXT FROM courses
);

-- Check 5: Show sample of current data
SELECT
    'Sample data:' as check_type,
    video_id,
    course_id,
    length(video_id) as video_id_length,
    length(course_id) as course_id_length
FROM quiz_attempts
LIMIT 3;