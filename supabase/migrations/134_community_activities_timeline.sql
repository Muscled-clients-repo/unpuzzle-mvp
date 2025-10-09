-- Community Activities Timeline
-- Centralized activity feed linking to source tables

/*
================================================================================
TABLE: community_activities
================================================================================
PURPOSE: Centralized activity feed linking to source tables
ARCHITECTURE: Timeline table with foreign keys to actual data tables

STRUCTURE:
  - id: UUID (PK) - Activity record identifier
  - user_id: UUID (FK → profiles.id) - Who performed the activity
  - activity_type: TEXT - Type of activity (see ACTIVITY TYPES below)

  FOREIGN KEYS TO SOURCE TABLES (only one will be set per row):
  - ai_conversation_id: UUID (FK → video_ai_conversations.id)
  - reflection_id: UUID (FK → reflections.id)
  - quiz_attempt_id: UUID (FK → quiz_attempts.id)
  - conversation_message_id: UUID (FK → conversation_messages.id)

  DENORMALIZED DISPLAY DATA (for feed performance):
  - media_file_id: UUID (FK → media_files.id) - Video context
  - video_title: TEXT - Cached video title
  - timestamp_seconds: DECIMAL - Video timestamp where activity occurred
  - goal_id: UUID (FK → track_goals.id) - Goal context
  - goal_title: TEXT - Cached goal title
  - content: TEXT - Preview text (first 200 chars)
  - metadata: JSONB - Flexible additional data

  VISIBILITY:
  - is_public: BOOLEAN - Show in community feed? (default: true)

  TIMESTAMPS:
  - created_at: TIMESTAMPTZ - When activity occurred
  - updated_at: TIMESTAMPTZ - Last modification

ACTIVITY TYPES:
  - 'ai_chat': Student asked AI about video → video_ai_conversations
  - 'video_note': Student took text notes → reflections
  - 'voice_memo': Student recorded voice memo → reflections (with file_url)
  - 'quiz': Student completed quiz → quiz_attempts
  - 'goal_message': Daily progress message → conversation_messages
  - 'revenue_proof': Revenue screenshot submitted → conversation_messages
  - 'goal_achieved': Goal marked complete → goal_conversations

INDEXES:
  - user_id (user's activity history)
  - activity_type (filter by type)
  - created_at DESC (chronological feed)
  - is_public (public feed optimization)
  - All FK columns (join performance)

RLS POLICIES:
  - Anyone can view public activities (is_public = true)
  - Users can view ALL their own activities (public + private)
  - Users can create/update/delete their own activities

DATA FLOW:
  Source Action → Creates row in source table → Auto-creates activity row
  Example: Student takes quiz → quiz_attempts row → community_activities row
================================================================================
*/
CREATE TABLE IF NOT EXISTS community_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  activity_type TEXT NOT NULL, -- 'ai_chat', 'video_note', 'voice_memo', 'quiz', 'goal_message', 'revenue_proof', 'goal_achieved'

  -- Foreign keys to source tables (nullable, only one will be set)
  ai_conversation_id UUID REFERENCES video_ai_conversations(id) ON DELETE CASCADE,
  reflection_id UUID REFERENCES reflections(id) ON DELETE CASCADE,
  quiz_attempt_id UUID REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  conversation_message_id UUID REFERENCES conversation_messages(id) ON DELETE CASCADE,

  -- Denormalized fields for display performance
  media_file_id UUID REFERENCES media_files(id) ON DELETE CASCADE,
  video_title TEXT,
  timestamp_seconds DECIMAL(10, 2), -- timestamp in video where activity occurred
  goal_id UUID REFERENCES track_goals(id) ON DELETE SET NULL,
  goal_title TEXT,

  -- Activity metadata
  content TEXT, -- preview text for feed (first 200 chars)
  metadata JSONB DEFAULT '{}', -- flexible storage for activity-specific data

  -- Visibility control
  is_public BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX community_activities_user_id_idx ON community_activities(user_id);
CREATE INDEX community_activities_type_idx ON community_activities(activity_type);
CREATE INDEX community_activities_created_at_idx ON community_activities(created_at DESC);
CREATE INDEX community_activities_public_idx ON community_activities(is_public) WHERE is_public = true;
CREATE INDEX community_activities_ai_conversation_idx ON community_activities(ai_conversation_id);
CREATE INDEX community_activities_reflection_idx ON community_activities(reflection_id);
CREATE INDEX community_activities_quiz_idx ON community_activities(quiz_attempt_id);
CREATE INDEX community_activities_message_idx ON community_activities(conversation_message_id);
CREATE INDEX community_activities_media_idx ON community_activities(media_file_id);
CREATE INDEX community_activities_goal_idx ON community_activities(goal_id);

-- RLS Policies
ALTER TABLE community_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public activities"
  ON community_activities FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can view their own activities"
  ON community_activities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own activities"
  ON community_activities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own activities"
  ON community_activities FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own activities"
  ON community_activities FOR DELETE
  USING (auth.uid() = user_id);

-- Updated at trigger
CREATE TRIGGER trigger_update_community_activities_updated_at
  BEFORE UPDATE ON community_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_resources_updated_at();

-- Comments
COMMENT ON TABLE community_activities IS 'Tracks all student learning activities for community feed display';
COMMENT ON COLUMN community_activities.activity_type IS 'Type: ai_chat, video_note, voice_memo, quiz, goal_message, revenue_proof, goal_achieved';
COMMENT ON COLUMN community_activities.is_public IS 'Controls visibility in community feed. Private activities only visible to user.';
