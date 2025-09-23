-- Fix RLS policy to allow instructors to create conversations for track changes
-- This addresses the issue where acceptTrackChangeRequest fails due to RLS violations

-- Add policy for instructors to create conversations for students
CREATE POLICY "Instructors can create conversations for students" ON goal_conversations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'instructor'
        )
    );

-- Update existing instructor conversation policy to include inserts
DROP POLICY IF EXISTS "Instructors can update pending conversations" ON goal_conversations;

CREATE POLICY "Instructors can manage conversations" ON goal_conversations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'instructor'
        )
    );

-- Add comment for documentation
COMMENT ON POLICY "Instructors can create conversations for students" ON goal_conversations IS
'Allows instructors to create conversations when accepting track change requests';

COMMENT ON POLICY "Instructors can manage conversations" ON goal_conversations IS
'Allows instructors to create, read, update conversations for goal assignment workflow';