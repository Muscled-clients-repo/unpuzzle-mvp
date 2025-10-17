-- Migration 150: Add Author Bio Fields to Profiles
-- Purpose: Enable instructors to add bio information for blog author pages
-- Date: 2025-10-16

-- Add author bio fields to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS author_bio TEXT;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS author_title TEXT;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS author_website_url TEXT;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS author_twitter_handle TEXT;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS author_linkedin_url TEXT;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS author_github_url TEXT;

-- Comments
COMMENT ON COLUMN profiles.author_bio IS 'Short biography for blog author pages (200-300 words recommended)';
COMMENT ON COLUMN profiles.author_title IS 'Professional title/role (e.g., "Senior Data Scientist")';
COMMENT ON COLUMN profiles.author_website_url IS 'Personal website or portfolio URL';
COMMENT ON COLUMN profiles.author_twitter_handle IS 'Twitter/X handle (without @)';
COMMENT ON COLUMN profiles.author_linkedin_url IS 'LinkedIn profile URL';
COMMENT ON COLUMN profiles.author_github_url IS 'GitHub profile URL';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 150 Complete - Author Bio Fields Added to Profiles';
  RAISE NOTICE 'New columns added:';
  RAISE NOTICE '  - author_bio (text)';
  RAISE NOTICE '  - author_title (text)';
  RAISE NOTICE '  - author_website_url (text)';
  RAISE NOTICE '  - author_twitter_handle (text)';
  RAISE NOTICE '  - author_linkedin_url (text)';
  RAISE NOTICE '  - author_github_url (text)';
END $$;
