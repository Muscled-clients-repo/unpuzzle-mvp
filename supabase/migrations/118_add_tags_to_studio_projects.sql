-- Add tags column to studio_projects table
-- Tags allow categorizing projects by course, content type, platform, etc.

ALTER TABLE studio_projects
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Create GIN index for fast tag searches
CREATE INDEX IF NOT EXISTS idx_studio_projects_tags
ON studio_projects USING GIN(tags);

-- Add comment for documentation
COMMENT ON COLUMN studio_projects.tags IS 'Array of tag strings for categorizing projects (e.g., course names, content types, platforms)';
