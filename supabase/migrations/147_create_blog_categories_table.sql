-- Migration 147: Create Blog Categories Table
-- Purpose: Categorize blog posts for organization and filtering
-- Date: 2025-10-16

-- Create blog_categories table
CREATE TABLE IF NOT EXISTS blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Category info
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,

  -- SEO
  meta_title TEXT,
  meta_description TEXT,

  -- Display
  color TEXT, -- Hex color for UI badges
  icon TEXT, -- Icon name or emoji

  -- Ordering
  display_order INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_blog_categories_slug ON blog_categories(slug);
CREATE INDEX IF NOT EXISTS idx_blog_categories_display_order ON blog_categories(display_order);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_blog_category_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS blog_category_updated_at_trigger ON blog_categories;
CREATE TRIGGER blog_category_updated_at_trigger
BEFORE UPDATE ON blog_categories
FOR EACH ROW
EXECUTE FUNCTION update_blog_category_updated_at();

-- Auto-generate slug from name if not provided
CREATE OR REPLACE FUNCTION generate_blog_category_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug = lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
    NEW.slug = trim(both '-' from NEW.slug);

    -- Ensure uniqueness
    IF EXISTS (SELECT 1 FROM blog_categories WHERE slug = NEW.slug AND id != NEW.id) THEN
      NEW.slug = NEW.slug || '-' || substr(NEW.id::text, 1, 8);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS blog_category_slug_trigger ON blog_categories;
CREATE TRIGGER blog_category_slug_trigger
BEFORE INSERT OR UPDATE ON blog_categories
FOR EACH ROW
EXECUTE FUNCTION generate_blog_category_slug();

-- Insert default categories
INSERT INTO blog_categories (name, description, color, icon, display_order) VALUES
  ('AI & Machine Learning', 'Articles about artificial intelligence and machine learning', '#3B82F6', '🤖', 1),
  ('Web Development', 'Web development tutorials and best practices', '#10B981', '💻', 2),
  ('Data Science', 'Data science, analytics, and visualization', '#8B5CF6', '📊', 3),
  ('Career Tips', 'Career advice and professional development', '#F59E0B', '🎯', 4),
  ('Product Updates', 'Platform updates and new features', '#EC4899', '🚀', 5)
ON CONFLICT (name) DO NOTHING;

-- Comments
COMMENT ON TABLE blog_categories IS 'Blog post categories for organization and filtering';
COMMENT ON COLUMN blog_categories.slug IS 'URL-friendly slug (auto-generated from name if not provided)';
COMMENT ON COLUMN blog_categories.display_order IS 'Order in which categories appear in UI';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 147 Complete - Blog Categories Table Created';
  RAISE NOTICE 'Table: blog_categories';
  RAISE NOTICE 'Default categories: 5';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '  - Auto-generated slugs';
  RAISE NOTICE '  - Auto-updated timestamps';
  RAISE NOTICE '  - Display ordering';
  RAISE NOTICE '  - Color and icon support';
END $$;
