-- Global Resources System
-- Resources can be attached to: community posts, videos, courses, conversations
-- Uses polymorphic junction table for flexible linking

-- Main resources table
CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Resource metadata
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'template', 'tool', 'guide', 'checklist', 'spreadsheet', 'document', etc.
  category TEXT NOT NULL, -- 'marketing', 'sales', 'development', 'design', etc.
  access TEXT NOT NULL DEFAULT 'free', -- 'free', 'premium', 'members_only'

  -- File information
  file_url TEXT NOT NULL,
  file_size BIGINT, -- in bytes
  format TEXT, -- 'pdf', 'docx', 'xlsx', 'pptx', 'zip', etc.
  mime_type TEXT,

  -- Classification
  tags TEXT[],

  -- Source context (optional - for tracking where resource originated)
  source_type TEXT, -- 'community_post', 'course_video', 'course', 'conversation'
  source_id UUID,

  -- Stats (updated via triggers)
  download_count INTEGER DEFAULT 0,
  rating_average DECIMAL(3,2) DEFAULT 0.0, -- 0.00 to 5.00
  rating_count INTEGER DEFAULT 0,

  -- Featured/Popular flags (for UI filtering)
  is_popular BOOLEAN DEFAULT false,
  is_new BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ, -- When made available to users
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_resources_created_by ON resources(created_by);
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type);
CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category);
CREATE INDEX IF NOT EXISTS idx_resources_access ON resources(access);
CREATE INDEX IF NOT EXISTS idx_resources_created_at ON resources(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_resources_download_count ON resources(download_count DESC);
CREATE INDEX IF NOT EXISTS idx_resources_rating_average ON resources(rating_average DESC);
CREATE INDEX IF NOT EXISTS idx_resources_tags ON resources USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_resources_source ON resources(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_resources_deleted_at ON resources(deleted_at) WHERE deleted_at IS NULL;

-- Polymorphic junction table: Links resources to different entities
CREATE TABLE IF NOT EXISTS resource_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,

  -- Polymorphic linking to different entities
  entity_type TEXT NOT NULL, -- 'community_post', 'course_video', 'course', 'conversation'
  entity_id UUID NOT NULL,

  -- Context for videos (e.g., "Download this template at 5:30 in the video")
  timestamp_seconds INTEGER, -- For videos: at what second does this resource get mentioned?
  label TEXT, -- Custom label like "Download Template", "Bonus Resource", etc.
  display_order INTEGER DEFAULT 0, -- For ordering multiple resources on same entity

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Ensure each resource can only be linked once per entity
  UNIQUE(resource_id, entity_type, entity_id)
);

-- Indexes for resource_links
CREATE INDEX IF NOT EXISTS idx_resource_links_resource_id ON resource_links(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_links_entity ON resource_links(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_resource_links_created_by ON resource_links(created_by);

-- Resource interactions: Combines downloads + ratings
CREATE TABLE IF NOT EXISTS resource_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL for guest downloads

  -- Download tracking
  downloaded_at TIMESTAMPTZ,
  download_count INTEGER DEFAULT 0, -- How many times this user downloaded

  -- Rating tracking
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  rated_at TIMESTAMPTZ,

  -- Guest download tracking (when user_id is NULL)
  email TEXT,
  ip_address INET,
  user_agent TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One interaction record per user per resource
  UNIQUE(resource_id, user_id)
);

-- Indexes for resource_interactions
CREATE INDEX IF NOT EXISTS idx_resource_interactions_resource_id ON resource_interactions(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_interactions_user_id ON resource_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_resource_interactions_downloaded_at ON resource_interactions(downloaded_at);
CREATE INDEX IF NOT EXISTS idx_resource_interactions_rating ON resource_interactions(rating);

-- Updated at triggers
CREATE OR REPLACE FUNCTION update_resources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_resources_updated_at
  BEFORE UPDATE ON resources
  FOR EACH ROW
  EXECUTE FUNCTION update_resources_updated_at();

CREATE TRIGGER trigger_update_resource_interactions_updated_at
  BEFORE UPDATE ON resource_interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_resources_updated_at();

-- Function: Update resource stats when interactions change
CREATE OR REPLACE FUNCTION update_resource_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update download_count and rating stats in resources table
  UPDATE resources
  SET
    download_count = (
      SELECT COALESCE(SUM(download_count), 0)
      FROM resource_interactions
      WHERE resource_id = NEW.resource_id
    ),
    rating_average = (
      SELECT COALESCE(AVG(rating), 0.0)
      FROM resource_interactions
      WHERE resource_id = NEW.resource_id AND rating IS NOT NULL
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM resource_interactions
      WHERE resource_id = NEW.resource_id AND rating IS NOT NULL
    )
  WHERE id = NEW.resource_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_resource_stats
  AFTER INSERT OR UPDATE ON resource_interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_resource_stats();

-- Helper function: Record a download
CREATE OR REPLACE FUNCTION record_resource_download(
  p_resource_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_interaction_id UUID;
BEGIN
  -- Insert or update interaction record
  INSERT INTO resource_interactions (
    resource_id,
    user_id,
    downloaded_at,
    download_count,
    email,
    ip_address,
    user_agent
  )
  VALUES (
    p_resource_id,
    p_user_id,
    NOW(),
    1,
    p_email,
    p_ip_address,
    p_user_agent
  )
  ON CONFLICT (resource_id, user_id)
  DO UPDATE SET
    downloaded_at = NOW(),
    download_count = resource_interactions.download_count + 1
  RETURNING id INTO v_interaction_id;

  RETURN v_interaction_id;
END;
$$ LANGUAGE plpgsql;

-- Helper function: Record a rating
CREATE OR REPLACE FUNCTION record_resource_rating(
  p_resource_id UUID,
  p_user_id UUID,
  p_rating INTEGER,
  p_review TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_interaction_id UUID;
BEGIN
  -- Validate rating
  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;

  -- Insert or update interaction record
  INSERT INTO resource_interactions (
    resource_id,
    user_id,
    rating,
    review,
    rated_at
  )
  VALUES (
    p_resource_id,
    p_user_id,
    p_rating,
    p_review,
    NOW()
  )
  ON CONFLICT (resource_id, user_id)
  DO UPDATE SET
    rating = p_rating,
    review = p_review,
    rated_at = NOW()
  RETURNING id INTO v_interaction_id;

  RETURN v_interaction_id;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS)
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_interactions ENABLE ROW LEVEL SECURITY;

-- Resources policies
CREATE POLICY "Anyone can view published resources"
  ON resources
  FOR SELECT
  USING (published_at IS NOT NULL AND deleted_at IS NULL);

CREATE POLICY "Authenticated users can create resources"
  ON resources
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own resources"
  ON resources
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Resource links policies
CREATE POLICY "Anyone can view resource links"
  ON resource_links
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create resource links"
  ON resource_links
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own resource links"
  ON resource_links
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Resource interactions policies
CREATE POLICY "Users can view their own interactions"
  ON resource_interactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own interactions"
  ON resource_interactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interactions"
  ON resource_interactions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
