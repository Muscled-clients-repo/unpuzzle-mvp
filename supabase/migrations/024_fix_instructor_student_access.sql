-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Instructors can view student profiles" ON profiles;

-- Create a simpler policy that allows the instructor to view student profiles
-- Using the known instructor ID to avoid recursion
CREATE POLICY "Instructors can view student profiles"
  ON profiles FOR SELECT
  USING (
    -- Allow the specific instructor user to view student profiles
    (auth.uid() = '28a603f0-f9ac-42b8-a5b1-9dd632dc74d6'::uuid AND role = 'student')
  );