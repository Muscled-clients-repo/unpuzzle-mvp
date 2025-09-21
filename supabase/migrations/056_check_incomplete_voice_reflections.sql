-- Migration 056: Check for incomplete voice reflections
-- Purpose: Find voice reflections that violate the completeness constraint

-- Check for voice reflections with missing file_url
SELECT
    'Missing file_url:' as issue_type,
    id,
    reflection_type,
    file_url,
    duration_seconds,
    created_at
FROM reflections
WHERE reflection_type = 'voice' AND file_url IS NULL;

-- Check for voice reflections with missing or zero duration
SELECT
    'Missing/zero duration:' as issue_type,
    id,
    reflection_type,
    file_url,
    duration_seconds,
    created_at
FROM reflections
WHERE reflection_type = 'voice' AND (duration_seconds IS NULL OR duration_seconds <= 0);

-- Check all voice reflections data completeness
SELECT
    'All voice reflections:' as check_type,
    id,
    CASE WHEN file_url IS NULL THEN 'NO_FILE_URL' ELSE 'HAS_FILE_URL' END as file_status,
    CASE WHEN duration_seconds IS NULL THEN 'NO_DURATION'
         WHEN duration_seconds <= 0 THEN 'ZERO_DURATION'
         ELSE 'HAS_DURATION' END as duration_status,
    duration_seconds,
    created_at
FROM reflections
WHERE reflection_type = 'voice'
ORDER BY created_at DESC;