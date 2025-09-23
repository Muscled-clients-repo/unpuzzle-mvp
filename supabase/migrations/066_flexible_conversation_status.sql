-- Migration 066: Make goal_conversations status flexible for track changes
-- Remove restrictive CHECK constraints and add track transition metadata

-- Step 1: Remove all existing CHECK constraints on status
ALTER TABLE goal_conversations
DROP CONSTRAINT IF EXISTS goal_conversations_status_check;

-- Check for other potential constraint names and remove them
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find any CHECK constraints on status column
    FOR constraint_name IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'goal_conversations'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) LIKE '%status%'
    LOOP
        EXECUTE format('ALTER TABLE goal_conversations DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END LOOP;
END $$;

-- Step 2: Add metadata columns for track transitions
ALTER TABLE goal_conversations ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;
ALTER TABLE goal_conversations ADD COLUMN IF NOT EXISTS end_reason TEXT;
ALTER TABLE goal_conversations ADD COLUMN IF NOT EXISTS transition_to_track_id UUID REFERENCES tracks(id) ON DELETE SET NULL;

-- Step 3: Add helpful comments for status usage
COMMENT ON COLUMN goal_conversations.status IS
'Flexible status field: active (current goal), completed (goal achieved), paused (temporarily stopped), track_changed (switched tracks), discontinued (stopped without completion), pending_instructor_review (awaiting assignment)';

COMMENT ON COLUMN goal_conversations.ended_at IS
'Timestamp when conversation ended (for completed, track_changed, discontinued statuses)';

COMMENT ON COLUMN goal_conversations.end_reason IS
'Reason for ending: goal_achieved, track_change, student_request, instructor_decision, etc.';

COMMENT ON COLUMN goal_conversations.transition_to_track_id IS
'If end_reason is track_change, this references the new track the student moved to';

-- Step 4: Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_goal_conversations_status_active ON goal_conversations(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_goal_conversations_track_changed ON goal_conversations(status) WHERE status = 'track_changed';
CREATE INDEX IF NOT EXISTS idx_goal_conversations_ended_at ON goal_conversations(ended_at) WHERE ended_at IS NOT NULL;

-- Step 5: Create a view for active conversations (commonly queried)
CREATE OR REPLACE VIEW active_goal_conversations AS
SELECT
    gc.*,
    p.full_name as student_name,
    p.email as student_email,
    i.full_name as instructor_name,
    tg.name as goal_name,
    tg.description as goal_description,
    tg.target_amount,
    t.name as track_name
FROM goal_conversations gc
JOIN profiles p ON gc.student_id = p.id
LEFT JOIN profiles i ON gc.instructor_id = i.id
LEFT JOIN track_goals tg ON gc.goal_id = tg.id
LEFT JOIN tracks t ON gc.track_id = t.id
WHERE gc.status = 'active';

-- Step 6: Add RLS policies for new columns
-- (Inherit existing RLS from the table)

-- Step 7: Log the migration success
DO $$
BEGIN
    RAISE NOTICE '✅ goal_conversations status made flexible - can now use: active, completed, track_changed, discontinued, etc.';
    RAISE NOTICE '✅ Added track transition metadata columns';
    RAISE NOTICE '✅ Created indexes for performance';
    RAISE NOTICE '✅ Created active_goal_conversations view';
END $$;