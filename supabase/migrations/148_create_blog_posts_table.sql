-- Migration 148: Create Blog Posts Table
-- Purpose: Main blog posts table with SEO optimization fields
-- Date: 2025-10-16

-- Create blog_posts table
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Content fields
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content JSONB, -- Tiptap JSON format

  -- SEO fields
  meta_title TEXT,
  meta_description TEXT,
  og_image_url TEXT,
  canonical_url TEXT,

  -- Publishing
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,

  -- Relationships
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES blog_categories(id) ON DELETE SET NULL,

  -- Featured image
  featured_image_url TEXT,
  featured_image_alt TEXT,

  -- Engagement metrics
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,

  -- Reading time (in minutes)
  reading_time INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Search
  search_vector tsvector
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_blog_posts_author_id ON blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category_id ON blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_search_vector ON blog_posts USING gin(search_vector);

-- Full-text search trigger
CREATE OR REPLACE FUNCTION update_blog_post_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector =
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.excerpt, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.meta_description, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS blog_post_search_vector_update ON blog_posts;
CREATE TRIGGER blog_post_search_vector_update
BEFORE INSERT OR UPDATE ON blog_posts
FOR EACH ROW
EXECUTE FUNCTION update_blog_post_search_vector();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_blog_post_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS blog_post_updated_at_trigger ON blog_posts;
CREATE TRIGGER blog_post_updated_at_trigger
BEFORE UPDATE ON blog_posts
FOR EACH ROW
EXECUTE FUNCTION update_blog_post_updated_at();

-- Auto-generate slug from title if not provided
CREATE OR REPLACE FUNCTION generate_blog_post_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug = lower(regexp_replace(NEW.title, '[^a-zA-Z0-9]+', '-', 'g'));
    NEW.slug = trim(both '-' from NEW.slug);

    -- Ensure uniqueness
    IF EXISTS (SELECT 1 FROM blog_posts WHERE slug = NEW.slug AND id != NEW.id) THEN
      NEW.slug = NEW.slug || '-' || substr(NEW.id::text, 1, 8);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS blog_post_slug_trigger ON blog_posts;
CREATE TRIGGER blog_post_slug_trigger
BEFORE INSERT OR UPDATE ON blog_posts
FOR EACH ROW
EXECUTE FUNCTION generate_blog_post_slug();

-- Comments
COMMENT ON TABLE blog_posts IS 'Blog posts with SEO optimization and full-text search';
COMMENT ON COLUMN blog_posts.content IS 'Tiptap editor JSON format';
COMMENT ON COLUMN blog_posts.search_vector IS 'Full-text search vector (auto-generated)';
COMMENT ON COLUMN blog_posts.slug IS 'URL-friendly slug (auto-generated from title if not provided)';
COMMENT ON COLUMN blog_posts.reading_time IS 'Estimated reading time in minutes';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 148 Complete - Blog Posts Table Created';
  RAISE NOTICE 'Table: blog_posts';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '  - SEO optimization fields (meta_title, meta_description, og_image)';
  RAISE NOTICE '  - Full-text search with tsvector';
  RAISE NOTICE '  - Auto-generated slugs';
  RAISE NOTICE '  - Auto-updated timestamps';
  RAISE NOTICE '  - Engagement metrics (views, likes)';
END $$;
