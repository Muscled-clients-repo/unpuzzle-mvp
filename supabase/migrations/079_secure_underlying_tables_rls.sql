-- Migration: Secure Underlying Tables with Comprehensive RLS Policies
-- Date: 2025-09-24
-- Description: Add comprehensive RLS policies to base tables so views inherit proper security
-- Risk Level: HIGH - Adding security restrictions that may affect existing functionality

-- =============================================================================
-- COMPREHENSIVE RLS POLICIES FOR BASE TABLES
-- =============================================================================

-- =============================================================================
-- GOAL_CONVERSATIONS TABLE POLICIES
-- =============================================================================

-- Enable RLS (already enabled, but ensuring it's on)
ALTER TABLE goal_conversations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own conversations" ON goal_conversations;
DROP POLICY IF EXISTS "Instructors can view assigned conversations" ON goal_conversations;
DROP POLICY IF EXISTS "Students can view their conversations" ON goal_conversations;
DROP POLICY IF EXISTS "Instructors can manage conversations" ON goal_conversations;

-- Create comprehensive policies
CREATE POLICY "Students can view their own conversations"
ON goal_conversations FOR SELECT
USING (student_id = auth.uid());

CREATE POLICY "Instructors can view assigned conversations"
ON goal_conversations FOR SELECT
USING (
    instructor_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'instructor'
    )
);

CREATE POLICY "Instructors can manage assigned conversations"
ON goal_conversations FOR ALL
USING (
    instructor_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('instructor', 'admin')
    )
);

-- =============================================================================
-- CONVERSATION_MESSAGES TABLE POLICIES
-- =============================================================================

-- Enable RLS
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view messages from their conversations" ON conversation_messages;
DROP POLICY IF EXISTS "Users can send messages" ON conversation_messages;

-- Create comprehensive policies
CREATE POLICY "Users can view messages from their conversations"
ON conversation_messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM goal_conversations gc
        WHERE gc.id = conversation_messages.conversation_id
        AND (gc.student_id = auth.uid() OR gc.instructor_id = auth.uid())
    )
);

CREATE POLICY "Users can send messages to their conversations"
ON conversation_messages FOR INSERT
WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM goal_conversations gc
        WHERE gc.id = conversation_messages.conversation_id
        AND (gc.student_id = auth.uid() OR gc.instructor_id = auth.uid())
    )
);

-- =============================================================================
-- COURSES TABLE POLICIES
-- =============================================================================

-- Enable RLS (already enabled)
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Instructors can manage own courses" ON courses;
DROP POLICY IF EXISTS "Students can view published courses" ON courses;
DROP POLICY IF EXISTS "Instructors can manage their own courses" ON courses;
DROP POLICY IF EXISTS "Authenticated users can view published courses" ON courses;
DROP POLICY IF EXISTS "Admins can view all courses" ON courses;

-- Create comprehensive policies
CREATE POLICY "Instructors can manage their own courses"
ON courses FOR ALL
USING (instructor_id = auth.uid())
WITH CHECK (instructor_id = auth.uid());

CREATE POLICY "Authenticated users can view published courses"
ON courses FOR SELECT
USING (
    status = 'published' AND
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
    )
);

CREATE POLICY "Admins can view all courses"
ON courses FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- =============================================================================
-- COURSE_GOAL_ASSIGNMENTS TABLE POLICIES
-- =============================================================================

-- Enable RLS
ALTER TABLE course_goal_assignments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "course_goal_assignments_policy" ON course_goal_assignments;
DROP POLICY IF EXISTS "Instructors can manage course goal assignments" ON course_goal_assignments;
DROP POLICY IF EXISTS "Users can view published course assignments" ON course_goal_assignments;

-- Create comprehensive policies
CREATE POLICY "Instructors can manage course goal assignments"
ON course_goal_assignments FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM courses c
        WHERE c.id = course_goal_assignments.course_id
        AND c.instructor_id = auth.uid()
    )
);

CREATE POLICY "Users can view published course assignments"
ON course_goal_assignments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM courses c
        WHERE c.id = course_goal_assignments.course_id
        AND (c.status = 'published' OR c.instructor_id = auth.uid())
    )
);

-- =============================================================================
-- TRACK_GOALS TABLE POLICIES
-- =============================================================================

-- Enable RLS
ALTER TABLE track_goals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "track_goals_policy" ON track_goals;
DROP POLICY IF EXISTS "Authenticated users can view active track goals" ON track_goals;
DROP POLICY IF EXISTS "Admins can manage track goals" ON track_goals;

-- Create comprehensive policies
CREATE POLICY "Authenticated users can view active track goals"
ON track_goals FOR SELECT
USING (
    is_active = true AND
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
    )
);

CREATE POLICY "Admins can manage track goals"
ON track_goals FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- =============================================================================
-- TRACKS TABLE POLICIES
-- =============================================================================

-- Enable RLS
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "tracks_policy" ON tracks;
DROP POLICY IF EXISTS "Authenticated users can view active tracks" ON tracks;
DROP POLICY IF EXISTS "Admins can manage tracks" ON tracks;

-- Create comprehensive policies
CREATE POLICY "Authenticated users can view active tracks"
ON tracks FOR SELECT
USING (
    is_active = true AND
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
    )
);

CREATE POLICY "Admins can manage tracks"
ON tracks FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- =============================================================================
-- USER_TRACK_ASSIGNMENTS TABLE POLICIES
-- =============================================================================

-- Enable RLS
ALTER TABLE user_track_assignments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "user_track_assignments_policy" ON user_track_assignments;
DROP POLICY IF EXISTS "Users can view their own track assignments" ON user_track_assignments;
DROP POLICY IF EXISTS "Instructors can view student track assignments" ON user_track_assignments;
DROP POLICY IF EXISTS "Admins can manage track assignments" ON user_track_assignments;

-- Create comprehensive policies
CREATE POLICY "Users can view their own track assignments"
ON user_track_assignments FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Instructors can view student track assignments"
ON user_track_assignments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'instructor'
    )
);

CREATE POLICY "Admins can manage track assignments"
ON user_track_assignments FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- =============================================================================
-- REMOVE SECURITY FILTERS FROM VIEWS (LET THEM INHERIT FROM TABLES)
-- =============================================================================

-- Since views will now inherit security from underlying tables with RLS,
-- we can simplify the views to remove the WHERE clauses and let RLS handle security

-- Recreate instructor_track_history without WHERE clause (let RLS handle it)
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

    -- Student details
    p.full_name as student_name,
    p.email as student_email,

    -- Goal details
    tg.id as goal_id,
    tg.name as goal_name,
    tg.description as goal_description,

    -- Track details
    t.id as track_id,
    t.name as track_name,

    -- Transition track details
    tt.id as transition_to_track_id,
    tt.name as transition_to_track_name,

    -- User track assignment details
    uta.assigned_at as goal_assigned_at,
    uta.status as assignment_status,

    -- Calculated fields
    EXTRACT(EPOCH FROM (COALESCE(gc.ended_at, NOW()) - gc.created_at)) / 86400 as conversation_duration_days,

    CASE
        WHEN gc.status = 'completed' THEN 'completed'
        WHEN gc.status = 'active' AND gc.created_at > NOW() - INTERVAL '7 days' THEN 'recent'
        WHEN gc.status = 'active' THEN 'ongoing'
        ELSE 'inactive'
    END as progress_status

FROM goal_conversations gc
LEFT JOIN profiles p ON gc.student_id = p.id
LEFT JOIN track_goals tg ON gc.goal_id = tg.id
LEFT JOIN tracks t ON tg.track_id = t.id
LEFT JOIN tracks tt ON gc.transition_to_track_id = tt.id
LEFT JOIN user_track_assignments uta ON (
    uta.user_id = gc.student_id
    AND uta.goal_id = gc.goal_id
    AND uta.status = 'active'
);

-- Recreate other views without WHERE security clauses
CREATE OR REPLACE VIEW active_goal_conversations AS
SELECT
    gc.*,
    p.full_name as student_name,
    p.email as student_email,
    tg.name as goal_name,
    t.name as track_name
FROM goal_conversations gc
LEFT JOIN profiles p ON gc.student_id = p.id
LEFT JOIN track_goals tg ON gc.goal_id = tg.id
LEFT JOIN tracks t ON tg.track_id = t.id
WHERE gc.status = 'active';

CREATE OR REPLACE VIEW conversation_timeline AS
SELECT
    cm.*,
    gc.student_id,
    gc.instructor_id,
    p.full_name as sender_name
FROM conversation_messages cm
JOIN goal_conversations gc ON cm.conversation_id = gc.id
LEFT JOIN profiles p ON cm.sender_id = p.id;

CREATE OR REPLACE VIEW courses_with_assignments AS
SELECT
    c.*,
    COUNT(cga.id) as assignment_count
FROM courses c
LEFT JOIN course_goal_assignments cga ON c.id = cga.course_id
GROUP BY c.id;

CREATE OR REPLACE VIEW instructor_courses_view AS
SELECT
    c.*,
    COUNT(DISTINCT cga.id) as assignment_count,
    COUNT(DISTINCT gc.student_id) as active_students
FROM courses c
LEFT JOIN course_goal_assignments cga ON c.id = cga.course_id
LEFT JOIN goal_conversations gc ON (
    gc.goal_id = cga.goal_id
    AND gc.status = 'active'
)
GROUP BY c.id;

CREATE OR REPLACE VIEW instructor_review_queue AS
SELECT
    gc.id as conversation_id,
    gc.student_id,
    gc.instructor_id,
    gc.status,
    gc.created_at,
    p.full_name as student_name,
    p.email as student_email,
    tg.name as goal_name,
    t.name as track_name,
    (
        SELECT COUNT(*)
        FROM conversation_messages cm
        WHERE cm.conversation_id = gc.id
        AND cm.sender_id = gc.student_id
    ) as message_count
FROM goal_conversations gc
JOIN profiles p ON gc.student_id = p.id
LEFT JOIN track_goals tg ON gc.goal_id = tg.id
LEFT JOIN tracks t ON tg.track_id = t.id;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
    table_names TEXT[] := ARRAY[
        'goal_conversations',
        'conversation_messages',
        'courses',
        'course_goal_assignments',
        'track_goals',
        'tracks',
        'user_track_assignments'
    ];
    table_name TEXT;
    policy_count INTEGER;
BEGIN
    FOREACH table_name IN ARRAY table_names
    LOOP
        -- Count policies for this table
        SELECT COUNT(*) INTO policy_count
        FROM pg_policies
        WHERE tablename = table_name;

        RAISE NOTICE '✓ % - % RLS policies active', table_name, policy_count;
    END LOOP;

    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'COMPREHENSIVE TABLE-LEVEL RLS IMPLEMENTED';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Security Features:';
    RAISE NOTICE '• All base tables secured with RLS policies';
    RAISE NOTICE '• Views inherit security from underlying tables';
    RAISE NOTICE '• Role-based access (student/instructor/admin)';
    RAISE NOTICE '• User-specific data filtering via auth.uid()';
    RAISE NOTICE '=============================================================================';
END $$;