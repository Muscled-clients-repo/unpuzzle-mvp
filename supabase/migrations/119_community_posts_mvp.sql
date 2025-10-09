-- Community Posts Table (MVP with JSONB)
-- This uses JSONB for likes/replies to keep it simple for MVP
-- Will be refactored into separate tables when we hit 500+ posts

CREATE TABLE IF NOT EXISTS community_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,

  -- MVP: Store interactions in JSONB (refactor to separate tables later)
  -- likes structure: [{"user_id": "uuid", "created_at": "timestamp"}]
  likes JSONB DEFAULT '[]',

  -- replies structure: [{"id": "uuid", "author_id": "uuid", "content": "text", "created_at": "timestamp"}]
  replies JSONB DEFAULT '[]',

  -- Cached counts for quick display (updated via triggers/functions)
  likes_count INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_posts_author_id ON community_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_deleted_at ON community_posts(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_community_posts_is_pinned ON community_posts(is_pinned) WHERE is_pinned = true;

-- GIN indexes for JSONB queries (allows efficient searching within JSONB)
CREATE INDEX IF NOT EXISTS idx_community_posts_likes ON community_posts USING GIN(likes);
CREATE INDEX IF NOT EXISTS idx_community_posts_replies ON community_posts USING GIN(replies);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_community_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_community_posts_updated_at
  BEFORE UPDATE ON community_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_community_posts_updated_at();

-- Helper function: Add a like to a post
CREATE OR REPLACE FUNCTION add_post_like(
  p_post_id UUID,
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_likes JSONB;
  v_new_like JSONB;
  v_user_already_liked BOOLEAN;
BEGIN
  -- Get current likes
  SELECT likes INTO v_likes FROM community_posts WHERE id = p_post_id;

  -- Check if user already liked
  SELECT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_likes) AS like_obj
    WHERE (like_obj->>'user_id')::UUID = p_user_id
  ) INTO v_user_already_liked;

  IF v_user_already_liked THEN
    RAISE EXCEPTION 'User has already liked this post';
  END IF;

  -- Create new like object
  v_new_like = jsonb_build_object(
    'user_id', p_user_id,
    'created_at', NOW()
  );

  -- Append to likes array
  v_likes = v_likes || v_new_like;

  -- Update post
  UPDATE community_posts
  SET
    likes = v_likes,
    likes_count = jsonb_array_length(v_likes)
  WHERE id = p_post_id;

  RETURN v_likes;
END;
$$ LANGUAGE plpgsql;

-- Helper function: Remove a like from a post
CREATE OR REPLACE FUNCTION remove_post_like(
  p_post_id UUID,
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_likes JSONB;
  v_filtered_likes JSONB;
BEGIN
  -- Get current likes
  SELECT likes INTO v_likes FROM community_posts WHERE id = p_post_id;

  -- Filter out the user's like
  SELECT jsonb_agg(like_obj)
  INTO v_filtered_likes
  FROM jsonb_array_elements(v_likes) AS like_obj
  WHERE (like_obj->>'user_id')::UUID != p_user_id;

  -- Handle case where all likes are removed (jsonb_agg returns NULL)
  v_filtered_likes = COALESCE(v_filtered_likes, '[]'::JSONB);

  -- Update post
  UPDATE community_posts
  SET
    likes = v_filtered_likes,
    likes_count = jsonb_array_length(v_filtered_likes)
  WHERE id = p_post_id;

  RETURN v_filtered_likes;
END;
$$ LANGUAGE plpgsql;

-- Helper function: Add a reply to a post
CREATE OR REPLACE FUNCTION add_post_reply(
  p_post_id UUID,
  p_author_id UUID,
  p_content TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_replies JSONB;
  v_new_reply JSONB;
  v_reply_id UUID;
BEGIN
  -- Get current replies
  SELECT replies INTO v_replies FROM community_posts WHERE id = p_post_id;

  -- Generate new reply ID
  v_reply_id = uuid_generate_v4();

  -- Create new reply object
  v_new_reply = jsonb_build_object(
    'id', v_reply_id,
    'author_id', p_author_id,
    'content', p_content,
    'created_at', NOW()
  );

  -- Append to replies array
  v_replies = v_replies || v_new_reply;

  -- Update post
  UPDATE community_posts
  SET
    replies = v_replies,
    replies_count = jsonb_array_length(v_replies)
  WHERE id = p_post_id;

  RETURN v_new_reply;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS)
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

-- Everyone can read non-deleted posts
CREATE POLICY "Anyone can view non-deleted community posts"
  ON community_posts
  FOR SELECT
  USING (deleted_at IS NULL);

-- Authenticated users can create posts
CREATE POLICY "Authenticated users can create posts"
  ON community_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- Users can update their own posts
CREATE POLICY "Users can update their own posts"
  ON community_posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Users can soft delete their own posts
CREATE POLICY "Users can delete their own posts"
  ON community_posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = author_id);
