-- Migration 151: Row Level Security Policies for Blog Tables
-- Purpose: Secure blog tables with proper access controls
-- Date: 2025-10-16

-- Enable RLS on all blog tables
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_tags ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- BLOG_POSTS POLICIES
-- =====================================================

-- Public can view published posts
DROP POLICY IF EXISTS "Public can view published blog posts" ON blog_posts;
CREATE POLICY "Public can view published blog posts"
ON blog_posts
FOR SELECT
TO public
USING (status = 'published');

-- Authors can view their own posts (any status)
DROP POLICY IF EXISTS "Authors can view their own blog posts" ON blog_posts;
CREATE POLICY "Authors can view their own blog posts"
ON blog_posts
FOR SELECT
TO authenticated
USING (auth.uid() = author_id);

-- Admins can view all posts
DROP POLICY IF EXISTS "Admins can view all blog posts" ON blog_posts;
CREATE POLICY "Admins can view all blog posts"
ON blog_posts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Authors can create their own posts
DROP POLICY IF EXISTS "Authors can create blog posts" ON blog_posts;
CREATE POLICY "Authors can create blog posts"
ON blog_posts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = author_id);

-- Authors can update their own posts
DROP POLICY IF EXISTS "Authors can update their own blog posts" ON blog_posts;
CREATE POLICY "Authors can update their own blog posts"
ON blog_posts
FOR UPDATE
TO authenticated
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

-- Admins can update any post
DROP POLICY IF EXISTS "Admins can update all blog posts" ON blog_posts;
CREATE POLICY "Admins can update all blog posts"
ON blog_posts
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Authors can delete their own posts
DROP POLICY IF EXISTS "Authors can delete their own blog posts" ON blog_posts;
CREATE POLICY "Authors can delete their own blog posts"
ON blog_posts
FOR DELETE
TO authenticated
USING (auth.uid() = author_id);

-- Admins can delete any post
DROP POLICY IF EXISTS "Admins can delete all blog posts" ON blog_posts;
CREATE POLICY "Admins can delete all blog posts"
ON blog_posts
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- =====================================================
-- BLOG_CATEGORIES POLICIES
-- =====================================================

-- Everyone can view categories
DROP POLICY IF EXISTS "Public can view blog categories" ON blog_categories;
CREATE POLICY "Public can view blog categories"
ON blog_categories
FOR SELECT
TO public
USING (true);

-- Only admins can manage categories
DROP POLICY IF EXISTS "Admins can insert blog categories" ON blog_categories;
CREATE POLICY "Admins can insert blog categories"
ON blog_categories
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can update blog categories" ON blog_categories;
CREATE POLICY "Admins can update blog categories"
ON blog_categories
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can delete blog categories" ON blog_categories;
CREATE POLICY "Admins can delete blog categories"
ON blog_categories
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- =====================================================
-- BLOG_TAGS POLICIES
-- =====================================================

-- Everyone can view tags
DROP POLICY IF EXISTS "Public can view blog tags" ON blog_tags;
CREATE POLICY "Public can view blog tags"
ON blog_tags
FOR SELECT
TO public
USING (true);

-- Only admins can manage tags
DROP POLICY IF EXISTS "Admins can insert blog tags" ON blog_tags;
CREATE POLICY "Admins can insert blog tags"
ON blog_tags
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can update blog tags" ON blog_tags;
CREATE POLICY "Admins can update blog tags"
ON blog_tags
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can delete blog tags" ON blog_tags;
CREATE POLICY "Admins can delete blog tags"
ON blog_tags
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- =====================================================
-- BLOG_POST_TAGS POLICIES
-- =====================================================

-- Public can view tags for published posts
DROP POLICY IF EXISTS "Public can view blog post tags" ON blog_post_tags;
CREATE POLICY "Public can view blog post tags"
ON blog_post_tags
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM blog_posts
    WHERE blog_posts.id = blog_post_tags.post_id
    AND blog_posts.status = 'published'
  )
);

-- Authors can view tags for their own posts
DROP POLICY IF EXISTS "Authors can view their post tags" ON blog_post_tags;
CREATE POLICY "Authors can view their post tags"
ON blog_post_tags
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM blog_posts
    WHERE blog_posts.id = blog_post_tags.post_id
    AND blog_posts.author_id = auth.uid()
  )
);

-- Authors can add tags to their own posts
DROP POLICY IF EXISTS "Authors can add tags to their posts" ON blog_post_tags;
CREATE POLICY "Authors can add tags to their posts"
ON blog_post_tags
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM blog_posts
    WHERE blog_posts.id = blog_post_tags.post_id
    AND blog_posts.author_id = auth.uid()
  )
);

-- Authors can remove tags from their own posts
DROP POLICY IF EXISTS "Authors can remove tags from their posts" ON blog_post_tags;
CREATE POLICY "Authors can remove tags from their posts"
ON blog_post_tags
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM blog_posts
    WHERE blog_posts.id = blog_post_tags.post_id
    AND blog_posts.author_id = auth.uid()
  )
);

-- Admins can manage all post tags
DROP POLICY IF EXISTS "Admins can manage all post tags" ON blog_post_tags;
CREATE POLICY "Admins can manage all post tags"
ON blog_post_tags
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 151 Complete - Blog RLS Policies Created';
  RAISE NOTICE 'RLS enabled for all blog tables:';
  RAISE NOTICE '  - blog_posts (9 policies)';
  RAISE NOTICE '  - blog_categories (4 policies)';
  RAISE NOTICE '  - blog_tags (4 policies)';
  RAISE NOTICE '  - blog_post_tags (5 policies)';
  RAISE NOTICE 'Access rules:';
  RAISE NOTICE '  - Public: read published posts only';
  RAISE NOTICE '  - Authors: full control of own posts';
  RAISE NOTICE '  - Admins: full control of everything';
END $$;
