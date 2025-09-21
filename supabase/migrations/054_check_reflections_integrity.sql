-- Migration 054: Check reflections table data integrity
-- Purpose: Analyze current state before making reflections NOT NULL

-- Check 1: Count total reflections
SELECT 'Total reflections:' as check_type, COUNT(*) as result
FROM reflections;

-- Check 2: Check for NULL foreign keys
SELECT 'NULL course_id count:' as check_type, COUNT(*) as result
FROM reflections WHERE course_id IS NULL;

SELECT 'NULL video_id count:' as check_type, COUNT(*) as result
FROM reflections WHERE video_id IS NULL;

-- Check 3: Check for invalid foreign key references
SELECT 'Invalid course_id count:' as check_type, COUNT(*) as result
FROM reflections r
WHERE r.course_id IS NOT NULL
  AND r.course_id NOT IN (SELECT id FROM courses);

SELECT 'Invalid video_id count:' as check_type, COUNT(*) as result
FROM reflections r
WHERE r.video_id IS NOT NULL
  AND r.video_id NOT IN (SELECT id FROM videos);

-- Check 4: Check reflection types distribution
SELECT
    'Reflection types:' as check_type,
    reflection_type,
    COUNT(*) as count
FROM reflections
GROUP BY reflection_type;

-- Check 5: Sample of reflections without proper video context
SELECT
    'Sample NULL FKs:' as check_type,
    id,
    course_id,
    video_id,
    reflection_type,
    CASE
        WHEN file_url IS NOT NULL THEN 'HAS_FILE_URL'
        ELSE 'NO_FILE_URL'
    END as file_status
FROM reflections
WHERE course_id IS NULL OR video_id IS NULL
LIMIT 5;