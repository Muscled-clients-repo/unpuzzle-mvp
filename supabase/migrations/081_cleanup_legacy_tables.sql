-- Migration: Clean Up Legacy Tables and Functions
-- Date: 2025-09-24
-- Description: Remove user_daily_notes table and media_file_history function dependencies
-- Risk Level: HIGH - Removing legacy tables that may have migration dependencies

-- =============================================================================
-- REMOVE MIGRATION DEPENDENCIES THAT REFERENCE user_daily_notes
-- =============================================================================

-- Drop migration verification functions that depend on legacy tables
DROP FUNCTION IF EXISTS verify_conversation_migration();
DROP FUNCTION IF EXISTS create_migration_backup();

-- =============================================================================
-- DROP MEDIA_FILE_HISTORY FUNCTION (already called in media-actions.ts)
-- =============================================================================

-- Drop the function that was called from application code
DROP FUNCTION IF EXISTS add_media_file_history(UUID, TEXT, TEXT, JSONB);

-- =============================================================================
-- DROP LEGACY DAILY NOTES TABLE
-- =============================================================================

-- Drop the user_daily_notes table (data should be migrated to conversation_messages)
-- This will cascade to any remaining dependencies
DROP TABLE IF EXISTS user_daily_notes CASCADE;

-- =============================================================================
-- CLEAN UP ANY REMAINING DAILY NOTE REFERENCES
-- =============================================================================

-- Drop any remaining daily note related tables/functions
DROP TABLE IF EXISTS daily_note_upload_errors CASCADE;

-- =============================================================================
-- UPDATE DATABASE TYPES (Instructions for manual steps)
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'LEGACY TABLE CLEANUP COMPLETED';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Tables Removed:';
    RAISE NOTICE '• user_daily_notes (data migrated to conversation_messages)';
    RAISE NOTICE '• daily_note_files (already removed)';
    RAISE NOTICE '• media_file_history (already removed)';
    RAISE NOTICE '• daily_note_upload_errors';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Functions Removed:';
    RAISE NOTICE '• add_media_file_history()';
    RAISE NOTICE '• verify_conversation_migration()';
    RAISE NOTICE '• create_migration_backup()';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Manual Steps Required:';
    RAISE NOTICE '• Regenerate database types: npx supabase gen types typescript';
    RAISE NOTICE '• Remove any UI components that reference file history';
    RAISE NOTICE '• Update imports that reference deleted action functions';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Architecture Changes:';
    RAISE NOTICE '• Daily notes now unified in conversation_messages table';
    RAISE NOTICE '• File attachments now unified in message_attachments table';
    RAISE NOTICE '• Media file history simplified to created_at/updated_at timestamps';
    RAISE NOTICE '• Removed complex audit logging in favor of standard timestamps';
    RAISE NOTICE '=============================================================================';
END $$;