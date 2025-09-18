-- Temporary: Create enrollment for testing transcript access
-- Student ID: f4469cc4-a6fe-4179-8db4-33447b53893d
-- Course ID: dc3361ea-72ce-4756-8eac-8dc7a4df9835

INSERT INTO enrollments (user_id, course_id, status, enrolled_at)
VALUES (
  'f4469cc4-a6fe-4179-8db4-33447b53893d',
  'dc3361ea-72ce-4756-8eac-8dc7a4df9835',
  'active',
  now()
) ON CONFLICT (user_id, course_id) DO NOTHING;