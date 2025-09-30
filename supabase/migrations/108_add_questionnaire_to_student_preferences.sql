-- Migration: Add questionnaire data columns to student_preferences
-- Date: 2025-09-30
-- Description: Store questionnaire responses directly in student_preferences table

-- =============================================================================
-- ADD QUESTIONNAIRE COLUMNS
-- =============================================================================

ALTER TABLE student_preferences
ADD COLUMN IF NOT EXISTS questionnaire_data JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS questionnaire_version TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS questionnaire_track_id UUID REFERENCES tracks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS monthly_income_goal INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS approach_preference TEXT DEFAULT NULL CHECK (approach_preference IN ('direct', 'patient'));

-- Add index for faster queries by track
CREATE INDEX IF NOT EXISTS idx_student_preferences_track
ON student_preferences(questionnaire_track_id)
WHERE questionnaire_track_id IS NOT NULL;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
BEGIN
    -- Check if columns were added
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'student_preferences'
        AND column_name IN ('questionnaire_data', 'questionnaire_version', 'questionnaire_track_id', 'monthly_income_goal', 'approach_preference')
    ) THEN
        RAISE NOTICE '✓ Questionnaire columns added to student_preferences';
    END IF;

    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'QUESTIONNAIRE STORAGE SETUP COMPLETE';
    RAISE NOTICE '• questionnaire_data: Stores all responses as JSONB';
    RAISE NOTICE '• questionnaire_version: Tracks which version of questions';
    RAISE NOTICE '• questionnaire_track_id: Links to the track for these questions';
    RAISE NOTICE '• monthly_income_goal: Target monthly income';
    RAISE NOTICE '• approach_preference: Learning style (direct/patient)';
    RAISE NOTICE '=============================================================================';
END $$;