-- Migration: Add secure admin role assignment function
-- This allows promoting users to admin role securely

-- NOTE: These functions are for instructor/student role management only.
-- For security reasons, admin promotion should ONLY be done via:
-- 1. Database migrations (like 143_create_initial_admin.sql)
-- 2. Direct SQL in Supabase dashboard
-- NEVER expose admin promotion in application UI.

-- Function to promote a user to instructor (admins only)
CREATE OR REPLACE FUNCTION promote_user_to_instructor(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
  current_user_role user_role;
BEGIN
  -- Get the role of the user making the request
  SELECT role INTO current_user_role
  FROM profiles
  WHERE id = auth.uid();

  -- Only admins can promote to instructor
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can promote users to instructor role';
  END IF;

  -- Update the target user's role
  UPDATE profiles
  SET role = 'instructor',
      updated_at = NOW()
  WHERE id = target_user_id;

  RAISE NOTICE 'User % promoted to instructor', target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to demote a user to student (admins only)
CREATE OR REPLACE FUNCTION demote_to_student(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
  current_user_role user_role;
BEGIN
  -- Get the role of the user making the request
  SELECT role INTO current_user_role
  FROM profiles
  WHERE id = auth.uid();

  -- Only admins can demote
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can demote users';
  END IF;

  -- Update the target user's role
  UPDATE profiles
  SET role = 'student',
      updated_at = NOW()
  WHERE id = target_user_id;

  RAISE NOTICE 'User % demoted to student', target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users (function will check permissions internally)
GRANT EXECUTE ON FUNCTION promote_user_to_instructor TO authenticated;
GRANT EXECUTE ON FUNCTION demote_to_student TO authenticated;

-- Add RLS policy for admins to view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add RLS policy for admins to update any profile
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Comment on functions
COMMENT ON FUNCTION promote_user_to_instructor IS 'Securely promote a user to instructor role. Only callable by admins.';
COMMENT ON FUNCTION demote_to_student IS 'Demote a user to student. Only callable by admins.';
