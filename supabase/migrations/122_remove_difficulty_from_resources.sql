-- Remove difficulty column from resources table
-- This was mistakenly added in migration 120

ALTER TABLE resources DROP COLUMN IF EXISTS difficulty;
