-- Migration: Phase 2.1 - Videos Table Column Cleanup
-- Date: 2025-09-23
-- Description: Remove unused columns from videos table to simplify schema
-- Risk Level: LOW - Removing unused/redundant columns

-- =============================================================================
-- PHASE 2.1: VIDEOS TABLE OPTIMIZATION
-- =============================================================================

-- Create backup of videos table before cleanup
CREATE TABLE backup_videos_columns_20250923 AS
SELECT id, bunny_url, video_format, video_quality, progress, created_at
FROM videos
WHERE bunny_url IS NOT NULL
   OR video_format != 'mp4'
   OR video_quality != 'original'
   OR progress IS NOT NULL;

-- =============================================================================
-- COLUMN ANALYSIS AND VERIFICATION
-- =============================================================================

DO $$
DECLARE
    bunny_url_count INTEGER;
    video_format_count INTEGER;
    video_quality_count INTEGER;
    progress_count INTEGER;
    total_videos INTEGER;
BEGIN
    -- Count videos with non-null bunny_url
    SELECT COUNT(*) INTO bunny_url_count FROM videos WHERE bunny_url IS NOT NULL;

    -- Count videos with non-default video_format
    SELECT COUNT(*) INTO video_format_count FROM videos WHERE video_format != 'mp4';

    -- Count videos with non-default video_quality
    SELECT COUNT(*) INTO video_quality_count FROM videos WHERE video_quality != 'original';

    -- Count videos with non-null progress (removed feature)
    SELECT COUNT(*) INTO progress_count FROM videos WHERE progress IS NOT NULL;

    -- Total videos
    SELECT COUNT(*) INTO total_videos FROM videos;

    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'VIDEOS TABLE COLUMN ANALYSIS';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Total videos: %', total_videos;
    RAISE NOTICE 'Videos with bunny_url: % (redundant - using video_url)', bunny_url_count;
    RAISE NOTICE 'Videos with non-default video_format: % (inferred from metadata)', video_format_count;
    RAISE NOTICE 'Videos with non-default video_quality: % (inferred from metadata)', video_quality_count;
    RAISE NOTICE 'Videos with progress data: % (feature removed from app)', progress_count;
    RAISE NOTICE '=============================================================================';
END $$;

-- =============================================================================
-- REMOVE UNUSED COLUMNS
-- =============================================================================

-- Remove bunny_url (redundant - video_url is used)
ALTER TABLE videos DROP COLUMN IF EXISTS bunny_url;

-- Remove video_format (inferred from file metadata when needed)
ALTER TABLE videos DROP COLUMN IF EXISTS video_format;

-- Remove video_quality (inferred from file metadata when needed)
ALTER TABLE videos DROP COLUMN IF EXISTS video_quality;

-- Remove progress (video progress feature was removed from app)
ALTER TABLE videos DROP COLUMN IF EXISTS progress;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Verify columns were removed
DO $$
DECLARE
    remaining_columns TEXT[];
    removed_count INTEGER := 0;
BEGIN
    -- Check which target columns still exist
    SELECT array_agg(column_name) INTO remaining_columns
    FROM information_schema.columns
    WHERE table_name = 'videos'
    AND table_schema = 'public'
    AND column_name IN ('bunny_url', 'video_format', 'video_quality', 'progress');

    IF remaining_columns IS NULL THEN
        removed_count := 4;
        RAISE NOTICE '✓ All 4 unused columns successfully removed from videos table';
    ELSE
        removed_count := 4 - array_length(remaining_columns, 1);
        RAISE WARNING 'Only % columns removed. Remaining columns: %', removed_count, remaining_columns;
    END IF;

    RAISE NOTICE 'Videos table optimization: % columns removed, schema simplified', removed_count;
END $$;

-- =============================================================================
-- LOG SCHEMA CHANGE
-- =============================================================================

-- Log this cleanup in schema_changes table
INSERT INTO public.schema_changes (
    change_type,
    description,
    tables_affected,
    estimated_impact,
    created_at
) VALUES (
    'column_removal',
    'Phase 2.1: Removed unused columns from videos table (bunny_url, video_format, video_quality, progress)',
    1,
    'Simplified videos table schema, removed redundant URL storage and unused progress tracking',
    NOW()
);

-- =============================================================================
-- PERFORMANCE IMPACT ANALYSIS
-- =============================================================================

DO $$
DECLARE
    backup_rows INTEGER;
BEGIN
    -- Count backup rows
    SELECT COUNT(*) INTO backup_rows FROM backup_videos_columns_20250923;

    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'PHASE 2.1: VIDEOS TABLE CLEANUP COMPLETED';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Columns Removed: 4 (bunny_url, video_format, video_quality, progress)';
    RAISE NOTICE 'Schema Simplification: Reduced videos table complexity';
    RAISE NOTICE 'Storage Optimization: Removed redundant URL and metadata storage';
    RAISE NOTICE 'Feature Alignment: Removed progress column (feature no longer in app)';
    RAISE NOTICE 'Backup Created: backup_videos_columns_20250923 (% rows with data)', backup_rows;
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'BENEFITS:';
    RAISE NOTICE '✓ Cleaner videos table focused on essential data only';
    RAISE NOTICE '✓ Removed redundant bunny_url (video_url is primary)';
    RAISE NOTICE '✓ Removed metadata columns (inferred when needed)';
    RAISE NOTICE '✓ Removed unused progress tracking column';
    RAISE NOTICE '✓ Simplified schema for easier maintenance';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'REMAINING CORE COLUMNS:';
    RAISE NOTICE '• id, course_id, chapter_id - Core identifiers';
    RAISE NOTICE '• title, description - Content metadata';
    RAISE NOTICE '• video_url, thumbnail_url - Primary URLs';
    RAISE NOTICE '• duration, duration_seconds - Timing data';
    RAISE NOTICE '• filename, file_size - File information';
    RAISE NOTICE '• status - Upload/processing status';
    RAISE NOTICE '• backblaze_file_id, backblaze_url - Storage backend';
    RAISE NOTICE '• "order" - Chapter organization';
    RAISE NOTICE '• created_at, updated_at - Timestamps';
    RAISE NOTICE '=============================================================================';
END $$;