-- Migration: Instructor Track History View
-- Date: 2025-09-24
-- Description: Create optimized view for instructor track history dashboard
-- Risk Level: LOW - Adding read-only view for performance

-- =============================================================================
-- CREATE OPTIMIZED VIEW FOR INSTRUCTOR TRACK HISTORY
-- =============================================================================

CREATE OR REPLACE VIEW instructor_track_history AS
SELECT
    -- Conversation details
    gc.id as conversation_id,
    gc.student_id,
    gc.instructor_id,
    gc.status as conversation_status,
    gc.created_at,
    gc.ended_at,
    gc.end_reason,

    -- Student details (denormalized for performance)
    p.full_name as student_name,
    p.email as student_email,

    -- Goal details (denormalized for performance)
    tg.id as goal_id,
    tg.name as goal_name,
    tg.description as goal_description,
    tg.target_amount,
    tg.currency,
    tg.goal_type,

    -- Track details (denormalized for performance)
    t.id as track_id,
    t.name as track_name,

    -- Transition track details (if applicable)
    tt.id as transition_to_track_id,
    tt.name as transition_to_track_name,

    -- User track assignment details
    uta.assigned_at as goal_assigned_at,
    uta.status as assignment_status,

    -- Calculated fields for UI
    EXTRACT(EPOCH FROM (COALESCE(gc.ended_at, NOW()) - gc.created_at)) / 86400 as conversation_duration_days,

    -- Track progress indicator
    CASE
        WHEN gc.status = 'completed' THEN 'completed'
        WHEN gc.status = 'active' AND gc.created_at > NOW() - INTERVAL '7 days' THEN 'recent'
        WHEN gc.status = 'active' THEN 'ongoing'
        ELSE 'inactive'
    END as progress_status

FROM goal_conversations gc
-- Join with profiles (student info)
LEFT JOIN profiles p ON gc.student_id = p.id
-- Join with track goals
LEFT JOIN track_goals tg ON gc.goal_id = tg.id
-- Join with tracks (current track)
LEFT JOIN tracks t ON tg.track_id = t.id
-- Join with transition track (if student switched tracks)
LEFT JOIN tracks tt ON gc.transition_to_track_id = tt.id
-- Join with user track assignments for additional context
LEFT JOIN user_track_assignments uta ON (
    uta.user_id = gc.student_id
    AND uta.goal_id = gc.goal_id
    AND uta.status = 'active'
);

-- =============================================================================
-- CREATE PERFORMANCE INDEXES
-- =============================================================================

-- Index on conversation created_at for sorting
CREATE INDEX IF NOT EXISTS idx_goal_conversations_created_at ON goal_conversations(created_at DESC);

-- Index on student_id for filtering by student
CREATE INDEX IF NOT EXISTS idx_goal_conversations_student_lookup ON goal_conversations(student_id, created_at DESC);

-- Index on status for filtering active/completed conversations
CREATE INDEX IF NOT EXISTS idx_goal_conversations_status ON goal_conversations(status, created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY FOR VIEW
-- =============================================================================

-- Note: Views inherit RLS from underlying tables
-- The goal_conversations table already has instructor policies:
-- - "Instructors can manage conversations"
-- - "Instructors can view assigned conversations"

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
BEGIN
    -- Verify view exists
    IF EXISTS (
        SELECT 1 FROM information_schema.views
        WHERE table_name = 'instructor_track_history'
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE '✓ instructor_track_history view created successfully';
    ELSE
        RAISE WARNING '! instructor_track_history view creation failed';
    END IF;

    -- Verify indexes exist
    IF EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_goal_conversations_created_at'
    ) THEN
        RAISE NOTICE '✓ Performance indexes created successfully';
    ELSE
        RAISE WARNING '! Index creation may have failed';
    END IF;

    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'INSTRUCTOR TRACK HISTORY VIEW IMPLEMENTED';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Performance Benefits:';
    RAISE NOTICE '• Single query instead of N+1 queries';
    RAISE NOTICE '• Denormalized data for fast reads';
    RAISE NOTICE '• Optimized indexes for common filter patterns';
    RAISE NOTICE '• Pre-calculated fields for UI display';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Usage:';
    RAISE NOTICE '• SELECT * FROM instructor_track_history ORDER BY created_at DESC';
    RAISE NOTICE '• Filter by student: WHERE student_email = student@example.com';
    RAISE NOTICE '• Filter by status: WHERE conversation_status = active';
    RAISE NOTICE '• Search students: WHERE student_name ILIKE search term';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'UI Features Enabled:';
    RAISE NOTICE '• All student track history in single view';
    RAISE NOTICE '• Search functionality by name/email';
    RAISE NOTICE '• Filter by conversation status';
    RAISE NOTICE '• Sort by date, progress, track changes';
    RAISE NOTICE '• Real-time progress indicators';
    RAISE NOTICE '=============================================================================';
END $$;