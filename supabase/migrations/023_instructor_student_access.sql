-- Allow instructors to view all student profiles for goals management
CREATE POLICY "Instructors can view student profiles"
  ON profiles FOR SELECT
  USING (
    -- The current user is an instructor
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'instructor'
    )
    -- And they are viewing a student profile
    AND role = 'student'
  );