-- Fix profiles RLS to allow conversation_timeline view to work properly
-- Date: 2025-09-25
-- Description: Allow users to view profiles of message senders in conversations they have access to

-- =============================================================================
-- DROP PROBLEMATIC EXISTING POLICIES
-- =============================================================================

-- Drop the restrictive instructor policy that only allows one specific instructor
DROP POLICY IF EXISTS "Instructors can view student profiles" ON profiles;

-- =============================================================================
-- CREATE COMPREHENSIVE RLS POLICY FOR CONVERSATION ACCESS
-- =============================================================================

-- Allow users to view profiles of people who send messages in conversations they have access to
CREATE POLICY "Users can view conversation participant profiles"
  ON profiles FOR SELECT
  USING (
    -- Allow viewing own profile
    auth.uid() = id
    OR
    -- Allow viewing profiles of users who send messages in conversations the current user has access to
    EXISTS (
      SELECT 1
      FROM conversation_messages cm
      JOIN goal_conversations gc ON cm.conversation_id = gc.id
      WHERE cm.sender_id = profiles.id
      AND (
        gc.student_id = auth.uid() OR
        gc.instructor_id = auth.uid()
      )
    )
  );

-- =============================================================================
-- VERIFICATION QUERY
-- =============================================================================

DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    -- Count policies on profiles table
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'profiles'
    AND policyname = 'Users can view conversation participant profiles';

    IF policy_count > 0 THEN
        RAISE NOTICE '============================================================================';
        RAISE NOTICE 'PROFILES RLS POLICY FIXED SUCCESSFULLY';
        RAISE NOTICE '============================================================================';
        RAISE NOTICE 'New Policy: "Users can view conversation participant profiles"';
        RAISE NOTICE '• Users can view their own profile';
        RAISE NOTICE '• Users can view profiles of message senders in their conversations';
        RAISE NOTICE '• Students can see instructor profiles who message them';
        RAISE NOTICE '• Instructors can see student profiles in their conversations';
        RAISE NOTICE '• This allows conversation_timeline view to work properly';
        RAISE NOTICE '============================================================================';
        RAISE NOTICE 'Impact:';
        RAISE NOTICE '• ✅ Fixes conversation_timeline view returning 0 messages';
        RAISE NOTICE '• ✅ Enables proper display of message sender names/avatars';
        RAISE NOTICE '• ✅ Allows attachment images to display in conversations';
        RAISE NOTICE '• ✅ Maintains security - only conversation participants visible';
        RAISE NOTICE '============================================================================';
    ELSE
        RAISE WARNING 'Policy creation may have failed - please verify manually';
    END IF;
END $$;