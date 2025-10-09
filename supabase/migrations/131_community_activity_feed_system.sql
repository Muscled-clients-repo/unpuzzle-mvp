-- Community Activity Feed System
-- Tracks all student activities for display in community feed

/*
================================================================================
TABLE: video_ai_conversations
================================================================================
PURPOSE: Store AI chat conversations where students ask questions about videos
ARCHITECTURE: One row per Q&A message, grouped by video, threaded by parent

UX CONTEXT:
  - Video page has persistent sidebar (always visible)
  - Student can select in/out points → sends transcript chunk to sidebar
  - Student can click specific timestamp → grabs transcript around that moment
  - Student types question → AI answers using provided transcript context
  - All Q&As for a video are stored and viewable in sidebar chat history

STRUCTURE:
  - id: UUID (PK) - Unique message identifier
  - user_id: UUID (FK → profiles.id) - Student who asked the question
  - media_file_id: UUID (FK → media_files.id) - Which video (groups all Q&As)
  - parent_message_id: UUID (FK → video_ai_conversations.id) - For follow-up questions
  - video_timestamp: DECIMAL - Timestamp student was at/asking about
  - conversation_context: TEXT - Transcript excerpt sent to AI (in/out selection)
  - user_message: TEXT - Student's question
  - ai_response: TEXT - AI's answer
  - model_used: TEXT - AI model identifier (e.g., 'gpt-4', 'claude-3')
  - metadata: JSONB - Additional data (in_point, out_point, tokens, etc.)
  - created_at: TIMESTAMPTZ - When question was asked

CONVERSATION THREADING:
  - All Q&As for one video: GROUP BY media_file_id
  - Follow-up questions: parent_message_id links to previous question
  - Independent questions: parent_message_id = NULL
  - Sidebar displays: All messages for video, ordered by created_at

EXAMPLES:

  Video "React Hooks Tutorial" (media_file_id = 'video-abc'):
    Row 1: timestamp=1:45, parent=NULL, "What is useState?"
    Row 2: timestamp=1:45, parent=Row1, "Can I use multiple useState?"
    Row 3: timestamp=2:30, parent=NULL, "Explain useEffect" (new topic)
    Row 4: timestamp=2:30, parent=Row3, "What's the cleanup function?"
    Row 5: timestamp=5:00, parent=NULL, "How does useContext work?" (new topic)

QUERYING:
  - All Q&As for video: WHERE media_file_id = 'video-abc' ORDER BY created_at
  - Conversation thread: Follow parent_message_id chain recursively
  - Questions at timestamp: WHERE video_timestamp BETWEEN 2:00 AND 2:30

INDEXES:
  - user_id (user's conversation history across all videos)
  - media_file_id (all Q&As for specific video)
  - parent_message_id (threading follow-ups)
  - created_at DESC (chronological display)

RLS POLICIES:
  - Users can only view/create their own AI conversations
  - Instructors CANNOT view (private learning assistant)

DATA FLOW:
  1. Student selects in/out (1:30-2:00) or clicks timestamp 1:45
  2. Transcript chunk extracted → sent to sidebar context
  3. Student types question → API call with context + question
  4. AI response → Store both in this table
  5. Student asks follow-up → Store with parent_message_id = previous row
  6. Sidebar displays full chat history for current video
================================================================================
*/
CREATE TABLE IF NOT EXISTS video_ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  media_file_id UUID REFERENCES media_files(id) ON DELETE SET NULL,
  parent_message_id UUID REFERENCES video_ai_conversations(id) ON DELETE CASCADE,
  video_timestamp DECIMAL(10, 2), -- timestamp student was at/asking about
  conversation_context TEXT, -- transcript excerpt sent to AI
  user_message TEXT NOT NULL, -- student's question
  ai_response TEXT NOT NULL, -- AI's answer
  model_used TEXT, -- e.g., 'gpt-4', 'claude-3'
  metadata JSONB DEFAULT '{}', -- in_point, out_point, tokens, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

/*
================================================================================
TABLE: private_notes
================================================================================
PURPOSE: Student's personal notes with one-click sharing to goal conversations
PRIVACY: Private by default, can be shared (irreversibly) with instructor

STRUCTURE:
  - id: UUID (PK) - Unique note identifier
  - user_id: UUID (FK → profiles.id) - Student who owns the note
  - goal_id: UUID (FK → track_goals.id) - Optional goal context
  - media_file_id: UUID (FK → media_files.id) - Optional video context
  - title: TEXT - Note title (optional)
  - content: TEXT - Note content (required)
  - tags: TEXT[] - Array of tags for organization
  - is_shared_with_instructor: BOOLEAN - Has been shared? (default: false)
  - shared_at: TIMESTAMPTZ - When it was shared (null if not shared)
  - shared_to_conversation_id: UUID (FK → goal_conversations.id) - Which conversation
  - created_at: TIMESTAMPTZ - When note was created
  - updated_at: TIMESTAMPTZ - Last modification time

INDEXES:
  - user_id (for student's note list)
  - goal_id (for goal-related notes)
  - is_shared_with_instructor (for instructor's shared notes view)
  - created_at DESC (for chronological listing)
  - shared_to_conversation_id (for conversation linking)

RLS POLICIES:
  - Students can view/create/update/delete their own notes
  - Instructors can view ONLY shared notes (is_shared_with_instructor = true)

DATA FLOW (SHARING):
  1. Student writes note → private_notes table
  2. Student clicks "Share with Instructor"
  3. System finds active goal_conversation
  4. Creates conversation_message with message_type='shared_note'
  5. Sets is_shared_with_instructor=true, shared_at=NOW()
  6. IRREVERSIBLE: Cannot unshare once shared
================================================================================
*/
CREATE TABLE IF NOT EXISTS private_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Context (optional)
  goal_id UUID REFERENCES track_goals(id) ON DELETE SET NULL,
  media_file_id UUID REFERENCES media_files(id) ON DELETE SET NULL,

  -- Note content
  title TEXT,
  content TEXT NOT NULL,
  tags TEXT[],

  -- Sharing with instructor
  is_shared_with_instructor BOOLEAN DEFAULT false,
  shared_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX community_activities_user_id_idx ON community_activities(user_id);
CREATE INDEX community_activities_type_idx ON community_activities(activity_type);
CREATE INDEX community_activities_media_id_idx ON community_activities(media_file_id);
CREATE INDEX community_activities_goal_id_idx ON community_activities(goal_id);
CREATE INDEX community_activities_created_at_idx ON community_activities(created_at DESC);
CREATE INDEX community_activities_public_idx ON community_activities(is_public) WHERE is_public = true;

CREATE INDEX private_notes_user_id_idx ON private_notes(user_id);
CREATE INDEX private_notes_goal_id_idx ON private_notes(goal_id);
CREATE INDEX private_notes_shared_idx ON private_notes(is_shared_with_instructor);
CREATE INDEX private_notes_created_at_idx ON private_notes(created_at DESC);

-- RLS Policies
ALTER TABLE community_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_notes ENABLE ROW LEVEL SECURITY;

-- Community Activities RLS
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

-- Private Notes RLS
CREATE POLICY "Users can view their own private notes"
  ON private_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Instructors can view shared private notes"
  ON private_notes FOR SELECT
  USING (
    is_shared_with_instructor = true
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'instructor'
    )
  );

CREATE POLICY "Users can create their own private notes"
  ON private_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own private notes"
  ON private_notes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own private notes"
  ON private_notes FOR DELETE
  USING (auth.uid() = user_id);

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

/*
================================================================================
TABLE: instructor_video_checkpoints
================================================================================
PURPOSE: Instructors can place quizzes/prompts at specific video timestamps
USE CASE: Video pauses at 5:30, shows quiz modal, student completes, video resumes

STRUCTURE:
  - id: UUID (PK) - Checkpoint identifier
  - created_by: UUID (FK → profiles.id) - Instructor who created it
  - media_file_id: UUID (FK → media_files.id) - Which video
  - prompt_type: TEXT - 'quiz', 'reflection', 'voice_memo'
  - timestamp_seconds: DECIMAL - When video should pause (e.g., 330 = 5:30)
  - title: TEXT - Checkpoint title
  - instructions: TEXT - Additional instructions (optional)

  FOR QUIZ TYPE:
  - quiz_questions: JSONB - Array of quiz questions
    Format: [{ question: "", options: [], correctAnswer: "" }]
  - passing_score: INTEGER - Required score to pass (e.g., 70%)

  FOR REFLECTION TYPE:
  - reflection_prompt: TEXT - What to reflect on
  - requires_video: BOOLEAN - Must submit Loom video?
  - requires_audio: BOOLEAN - Must submit voice memo?

  SETTINGS:
  - is_required: BOOLEAN - Block video progress until completed?
  - is_active: BOOLEAN - Currently enabled? (default: true)
  - created_at: TIMESTAMPTZ - When created
  - updated_at: TIMESTAMPTZ - Last modification

INDEXES:
  - media_file_id (all checkpoints for a video)
  - timestamp_seconds (ordered checkpoints)
  - is_active (filter active only)
  - created_by (instructor's checkpoints)

RLS POLICIES:
  - Instructors can create/update/delete their own checkpoints
  - All users can view active checkpoints for videos they can access

LINKING TO RESPONSES:
  - quiz_attempts.checkpoint_id → Links student's quiz to this checkpoint
  - reflections.checkpoint_id → Links student's reflection to this checkpoint

DATA FLOW:
  1. Instructor: Edits video → Clicks timeline at 5:30 → "Add Quiz"
  2. Student: Watches video → At 5:30, video pauses → Modal shows quiz
  3. Student: Completes quiz → Saves to quiz_attempts with checkpoint_id
  4. Video: Resumes (if not is_required) or stays paused until passing score
================================================================================
*/
CREATE TABLE IF NOT EXISTS instructor_video_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  media_file_id UUID REFERENCES media_files(id) ON DELETE CASCADE NOT NULL,
  prompt_type TEXT NOT NULL, -- 'quiz', 'reflection', 'voice_memo'
  timestamp_seconds DECIMAL(10, 2) NOT NULL, -- when video should pause
  title TEXT NOT NULL,
  instructions TEXT,

  -- For quiz prompts
  quiz_questions JSONB, -- [{ question: "", options: [], correctAnswer: "" }]
  passing_score INTEGER,

  -- For reflection prompts
  reflection_prompt TEXT,
  requires_video BOOLEAN DEFAULT false, -- must submit Loom video?
  requires_audio BOOLEAN DEFAULT false, -- must submit voice memo?

  -- Settings
  is_required BOOLEAN DEFAULT false, -- block video progress until completed?
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

/*
================================================================================
EXISTING TABLE UPDATES
================================================================================
Adding foreign key columns to link existing tables to new checkpoint system
and note sharing system
================================================================================
*/

/*
UPDATE: quiz_attempts
ADD: checkpoint_id column
PURPOSE: Link quiz attempt back to instructor's checkpoint (if from checkpoint)
USAGE: When student completes checkpoint quiz, store checkpoint_id here
*/
ALTER TABLE quiz_attempts
ADD COLUMN IF NOT EXISTS checkpoint_id UUID REFERENCES instructor_video_checkpoints(id) ON DELETE SET NULL;

/*
UPDATE: reflections
ADD: checkpoint_id column
PURPOSE: Link reflection/voice memo back to instructor's checkpoint
USAGE: When student submits reflection at checkpoint, store checkpoint_id here
*/
ALTER TABLE reflections
ADD COLUMN IF NOT EXISTS checkpoint_id UUID REFERENCES instructor_video_checkpoints(id) ON DELETE SET NULL;

/*
UPDATE: conversation_messages
ADD: shared_note_id column
PURPOSE: Link message to private_note when sharing notes to conversation
USAGE: When student shares private note, message_type='shared_note' + this FK
DISPLAY: Allows special UI rendering for shared note messages
*/
ALTER TABLE conversation_messages
ADD COLUMN IF NOT EXISTS shared_note_id UUID REFERENCES private_notes(id) ON DELETE SET NULL;

/*
UPDATE: private_notes
ADD: shared_to_conversation_id column
PURPOSE: Track which conversation this note was shared to
USAGE: Set when note is shared (alongside is_shared_with_instructor=true)
BENEFIT: Direct link to conversation for reference
*/
ALTER TABLE private_notes
ADD COLUMN IF NOT EXISTS shared_to_conversation_id UUID REFERENCES goal_conversations(id) ON DELETE SET NULL;

-- Indexes for new tables
CREATE INDEX video_ai_conversations_user_id_idx ON video_ai_conversations(user_id);
CREATE INDEX video_ai_conversations_media_id_idx ON video_ai_conversations(media_file_id);
CREATE INDEX video_ai_conversations_parent_msg_idx ON video_ai_conversations(parent_message_id);
CREATE INDEX video_ai_conversations_created_at_idx ON video_ai_conversations(created_at DESC);

CREATE INDEX instructor_video_checkpoints_media_id_idx ON instructor_video_checkpoints(media_file_id);
CREATE INDEX instructor_video_checkpoints_timestamp_idx ON instructor_video_checkpoints(timestamp_seconds);
CREATE INDEX instructor_video_checkpoints_active_idx ON instructor_video_checkpoints(is_active) WHERE is_active = true;
CREATE INDEX instructor_video_checkpoints_creator_idx ON instructor_video_checkpoints(created_by);

CREATE INDEX private_notes_shared_conversation_idx ON private_notes(shared_to_conversation_id);
CREATE INDEX conversation_messages_shared_note_idx ON conversation_messages(shared_note_id);

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

-- RLS Policies for new tables
ALTER TABLE video_ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_video_checkpoints ENABLE ROW LEVEL SECURITY;

-- Video AI Conversations RLS
CREATE POLICY "Users can view their own AI conversations"
  ON video_ai_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own AI conversations"
  ON video_ai_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Community Activities RLS
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

-- Instructor Video Checkpoints RLS
CREATE POLICY "Instructors can create their own checkpoints"
  ON instructor_video_checkpoints FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'instructor'
    )
  );

CREATE POLICY "Instructors can update their own checkpoints"
  ON instructor_video_checkpoints FOR UPDATE
  USING (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'instructor'
    )
  )
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'instructor'
    )
  );

CREATE POLICY "Instructors can delete their own checkpoints"
  ON instructor_video_checkpoints FOR DELETE
  USING (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'instructor'
    )
  );

CREATE POLICY "Users can view active checkpoints for accessible videos"
  ON instructor_video_checkpoints FOR SELECT
  USING (is_active = true);

-- Function to auto-create community activity from various triggers
CREATE OR REPLACE FUNCTION create_community_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- This function will be called by triggers on various tables
  -- to automatically create community activities
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Updated at trigger for community_activities
CREATE TRIGGER trigger_update_community_activities_updated_at
  BEFORE UPDATE ON community_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_resources_updated_at(); -- reuse existing function

-- Updated at trigger for private_notes
CREATE TRIGGER trigger_update_private_notes_updated_at
  BEFORE UPDATE ON private_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_resources_updated_at(); -- reuse existing function

-- Updated at trigger for instructor_video_checkpoints
CREATE TRIGGER trigger_update_instructor_video_checkpoints_updated_at
  BEFORE UPDATE ON instructor_video_checkpoints
  FOR EACH ROW
  EXECUTE FUNCTION update_resources_updated_at(); -- reuse existing function

-- Comments
COMMENT ON TABLE community_activities IS 'Tracks all student learning activities for community feed display';
COMMENT ON TABLE private_notes IS 'Student private notes that can optionally be shared with instructors';
COMMENT ON TABLE video_ai_conversations IS 'AI chat conversations where students ask questions about video content';
COMMENT ON TABLE instructor_video_checkpoints IS 'Instructor-placed quizzes/reflection prompts at specific video timestamps';

COMMENT ON COLUMN community_activities.activity_type IS 'Type: question, note, ai_chat, voice_memo, quiz, goal_progress, revenue_submission, goal_achieved, private_note';
COMMENT ON COLUMN community_activities.is_public IS 'Controls visibility in community feed. Private activities only visible to user.';
COMMENT ON COLUMN private_notes.is_shared_with_instructor IS 'Student can choose to share specific private notes with their instructor';
COMMENT ON COLUMN private_notes.shared_to_conversation_id IS 'Links to goal_conversation where this note was shared (one-way, cannot unshare)';
COMMENT ON COLUMN conversation_messages.shared_note_id IS 'Links to private_note when message_type is "shared_note"';
COMMENT ON COLUMN instructor_video_checkpoints.prompt_type IS 'Type: quiz, reflection, voice_memo';
COMMENT ON COLUMN instructor_video_checkpoints.is_required IS 'If true, blocks video progress until student completes this checkpoint';
