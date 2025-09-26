-- Fix instructor role for 123@123.com user
-- This will restore instructor privileges

UPDATE profiles
SET role = 'instructor'
WHERE email = '123@123.com';

-- Verify the change
SELECT id, email, role, full_name, created_at
FROM profiles
WHERE email = '123@123.com';