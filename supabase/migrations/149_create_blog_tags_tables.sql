-- Migration 149: Create Blog Tags and Junction Tables
-- Purpose: Tag system for blog posts with many-to-many relationship
-- Date: 2025-10-16

-- Create blog_tags table
CREATE TABLE IF NOT EXISTS blog_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tag info
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,

  -- Display
  color TEXT, -- Hex color for UI badges

  -- Usage count (denormalized for performance)
  post_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create blog_post_tags junction table (many-to-many)
CREATE TABLE IF NOT EXISTS blog_post_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES blog_tags(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique post-tag combinations
  UNIQUE(post_id, tag_id)
);

-- Indexes for blog_tags
CREATE INDEX IF NOT EXISTS idx_blog_tags_slug ON blog_tags(slug);
CREATE INDEX IF NOT EXISTS idx_blog_tags_post_count ON blog_tags(post_count DESC);

-- Indexes for blog_post_tags
CREATE INDEX IF NOT EXISTS idx_blog_post_tags_post_id ON blog_post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_tags_tag_id ON blog_post_tags(tag_id);

-- Auto-update updated_at timestamp for blog_tags
CREATE OR REPLACE FUNCTION update_blog_tag_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS blog_tag_updated_at_trigger ON blog_tags;
CREATE TRIGGER blog_tag_updated_at_trigger
BEFORE UPDATE ON blog_tags
FOR EACH ROW
EXECUTE FUNCTION update_blog_tag_updated_at();

-- Auto-generate slug from name if not provided
CREATE OR REPLACE FUNCTION generate_blog_tag_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug = lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
    NEW.slug = trim(both '-' from NEW.slug);

    -- Ensure uniqueness
    IF EXISTS (SELECT 1 FROM blog_tags WHERE slug = NEW.slug AND id != NEW.id) THEN
      NEW.slug = NEW.slug || '-' || substr(NEW.id::text, 1, 8);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS blog_tag_slug_trigger ON blog_tags;
CREATE TRIGGER blog_tag_slug_trigger
BEFORE INSERT OR UPDATE ON blog_tags
FOR EACH ROW
EXECUTE FUNCTION generate_blog_tag_slug();

-- Update tag post_count when blog_post_tags change
CREATE OR REPLACE FUNCTION update_tag_post_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE blog_tags SET post_count = post_count + 1 WHERE id = NEW.tag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE blog_tags SET post_count = post_count - 1 WHERE id = OLD.tag_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS blog_post_tags_count_trigger ON blog_post_tags;
CREATE TRIGGER blog_post_tags_count_trigger
AFTER INSERT OR DELETE ON blog_post_tags
FOR EACH ROW
EXECUTE FUNCTION update_tag_post_count();

-- Insert popular default tags
INSERT INTO blog_tags (name, color) VALUES
  ('Tutorial', '#3B82F6'),
  ('Beginner', '#10B981'),
  ('Advanced', '#8B5CF6'),
  ('Python', '#F59E0B'),
  ('JavaScript', '#F59E0B'),
  ('React', '#06B6D4'),
  ('TypeScript', '#2563EB'),
  ('Next.js', '#000000'),
  ('Supabase', '#22C55E'),
  ('Tips & Tricks', '#EC4899')
ON CONFLICT (name) DO NOTHING;

-- Comments
COMMENT ON TABLE blog_tags IS 'Tags for blog posts (many-to-many via blog_post_tags)';
COMMENT ON TABLE blog_post_tags IS 'Junction table for blog posts and tags (many-to-many)';
COMMENT ON COLUMN blog_tags.slug IS 'URL-friendly slug (auto-generated from name if not provided)';
COMMENT ON COLUMN blog_tags.post_count IS 'Number of posts with this tag (auto-updated)';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 149 Complete - Blog Tags Tables Created';
  RAISE NOTICE 'Tables: blog_tags, blog_post_tags';
  RAISE NOTICE 'Default tags: 10';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '  - Many-to-many relationship';
  RAISE NOTICE '  - Auto-generated slugs';
  RAISE NOTICE '  - Auto-updated post counts';
  RAISE NOTICE '  - Unique post-tag combinations';
END $$;
