-- Migration: Create initial admin user

-- Promote user to admin by user ID
UPDATE profiles
SET role = 'admin', updated_at = NOW()
WHERE id = '1efd594a-a98a-4f57-bd93-4d9f01b2e5ba';

-- IMPORTANT: To promote additional admins in the future:
-- 1. Create a new migration file (e.g., 150_add_another_admin.sql)
-- 2. Add: UPDATE profiles SET role = 'admin' WHERE id = 'new-user-id';
-- 3. Run: npx supabase db push
--
-- OR use Supabase SQL Editor:
-- UPDATE profiles SET role = 'admin' WHERE id = 'user-id-here';
--
-- NEVER expose admin promotion in the UI - only via migrations or direct SQL access.
