-- Add unique constraint to goal_conversations to prevent duplicate student-instructor pairs
-- This should be run after 026 and before 027

-- Add unique constraint for student-instructor pairs
-- This allows multiple conversations per student but only one per student-instructor pair
ALTER TABLE goal_conversations
ADD CONSTRAINT unique_student_instructor_pair
UNIQUE (student_id, instructor_id);

-- Note: This constraint allows:
-- - Multiple students to have conversations with the same instructor
-- - One student to have multiple conversations if instructor_id is different (including NULL)
-- - But prevents duplicate (student_id, instructor_id) combinations