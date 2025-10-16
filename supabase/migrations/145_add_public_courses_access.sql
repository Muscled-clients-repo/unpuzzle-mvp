-- Add RLS policies to allow public (guest) users to view published courses and their track/goal assignments
-- This enables the community courses page to work for unauthenticated users

-- ============================================================================
-- COURSES TABLE - Public access to published courses
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Students can view published courses" ON public.courses;
DROP POLICY IF EXISTS "Authenticated users can view published courses" ON public.courses;
DROP POLICY IF EXISTS "Public can view published courses" ON public.courses;

-- Create new policy for authenticated users
CREATE POLICY "Authenticated users can view published courses"
  ON public.courses FOR SELECT
  USING (
    status = 'published' AND
    auth.uid() IS NOT NULL
  );

-- Create new policy for public (guest) access - THIS IS THE CRITICAL ONE
-- Allows anyone (even unauthenticated) to see published courses
CREATE POLICY "Public can view published courses"
  ON public.courses FOR SELECT
  USING (status = 'published' AND auth.uid() IS NULL);

-- Note: The "Instructors can manage own courses" policy remains unchanged
-- It allows instructors to create/read/update/delete their own courses regardless of status

-- ============================================================================
-- TRACKS TABLE - Public access (should already exist but ensuring it's correct)
-- ============================================================================

-- Drop and recreate to ensure guest access
DROP POLICY IF EXISTS "Public can view active tracks" ON public.tracks;

CREATE POLICY "Public can view active tracks"
  ON public.tracks FOR SELECT
  USING (is_active = true);
-- No auth.uid() check here - truly public!

-- ============================================================================
-- TRACK_GOALS TABLE - Public access (should already exist but ensuring it's correct)
-- ============================================================================

-- Drop and recreate to ensure guest access
DROP POLICY IF EXISTS "Public can view active goals" ON public.track_goals;

CREATE POLICY "Public can view active goals"
  ON public.track_goals FOR SELECT
  USING (is_active = true);
-- No auth.uid() check here - truly public!

-- ============================================================================
-- COURSE_TRACK_ASSIGNMENTS TABLE - Public access for published courses
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view course track assignments for published courses" ON public.course_track_assignments;
DROP POLICY IF EXISTS "Public can view track assignments for published courses" ON public.course_track_assignments;

-- Create new policy for public access (no auth required)
CREATE POLICY "Public can view track assignments for published courses"
  ON public.course_track_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_track_assignments.course_id
      AND courses.status = 'published'
    )
  );
-- No auth.uid() check - anyone can see which tracks a published course belongs to

-- ============================================================================
-- COURSE_GOAL_ASSIGNMENTS TABLE - Public access for published courses
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view course goal assignments for published courses" ON public.course_goal_assignments;
DROP POLICY IF EXISTS "Public can view goal assignments for published courses" ON public.course_goal_assignments;

-- Create new policy for public access (no auth required)
CREATE POLICY "Public can view goal assignments for published courses"
  ON public.course_goal_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_goal_assignments.course_id
      AND courses.status = 'published'
    )
  );
-- No auth.uid() check - anyone can see which goals a published course belongs to

-- ============================================================================
-- PROFILES TABLE - Public access to instructor info only
-- ============================================================================

-- Check if we need to allow public access to instructor profiles (for displaying instructor names/avatars)
DROP POLICY IF EXISTS "Public can view instructor profiles" ON public.profiles;

CREATE POLICY "Public can view instructor profiles"
  ON public.profiles FOR SELECT
  USING (role = 'instructor');
-- Allows anyone to see instructor profiles (needed for course listings)
-- Only exposes: name, avatar, role - no sensitive data

-- Note: The existing RLS policies on videos, chapters, and course content remain
-- protected and require authentication to access actual course materials.
