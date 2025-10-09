-- Video AI Conversations System
-- AI chat conversations where students ask questions about videos

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

-- Indexes
CREATE INDEX video_ai_conversations_user_id_idx ON video_ai_conversations(user_id);
CREATE INDEX video_ai_conversations_media_id_idx ON video_ai_conversations(media_file_id);
CREATE INDEX video_ai_conversations_parent_msg_idx ON video_ai_conversations(parent_message_id);
CREATE INDEX video_ai_conversations_created_at_idx ON video_ai_conversations(created_at DESC);

-- RLS Policies
ALTER TABLE video_ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI conversations"
  ON video_ai_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own AI conversations"
  ON video_ai_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE video_ai_conversations IS 'AI chat conversations where students ask questions about video content';
COMMENT ON COLUMN video_ai_conversations.parent_message_id IS 'Links to previous question for follow-up threading';
COMMENT ON COLUMN video_ai_conversations.conversation_context IS 'Transcript excerpt sent to AI for context (from in/out selection)';
