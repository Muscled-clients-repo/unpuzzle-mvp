-- Backfill media_usage table for existing videos with media_file_id
-- This ensures existing linked videos show up in course file counts

INSERT INTO media_usage (media_file_id, resource_type, resource_id, course_id)
SELECT 
    v.media_file_id,
    'chapter'::text as resource_type,
    v.id as resource_id, -- Use video UUID as resource_id
    v.course_id
FROM videos v
WHERE v.media_file_id IS NOT NULL
AND NOT EXISTS (
    -- Don't duplicate if record already exists
    SELECT 1 FROM media_usage mu 
    WHERE mu.media_file_id = v.media_file_id 
    AND mu.resource_id = v.id
    AND mu.course_id = v.course_id
);