-- Private Notes System
-- Student private notes with one-click sharing to goal conversations

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
  shared_to_conversation_id UUID REFERENCES goal_conversations(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX private_notes_user_id_idx ON private_notes(user_id);
CREATE INDEX private_notes_goal_id_idx ON private_notes(goal_id);
CREATE INDEX private_notes_shared_idx ON private_notes(is_shared_with_instructor);
CREATE INDEX private_notes_created_at_idx ON private_notes(created_at DESC);
CREATE INDEX private_notes_shared_conversation_idx ON private_notes(shared_to_conversation_id);

-- RLS Policies
ALTER TABLE private_notes ENABLE ROW LEVEL SECURITY;

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

-- Updated at trigger
CREATE TRIGGER trigger_update_private_notes_updated_at
  BEFORE UPDATE ON private_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_resources_updated_at();

-- Update conversation_messages to support shared notes
ALTER TABLE conversation_messages
ADD COLUMN IF NOT EXISTS shared_note_id UUID REFERENCES private_notes(id) ON DELETE SET NULL;

CREATE INDEX conversation_messages_shared_note_idx ON conversation_messages(shared_note_id);

-- Comments
COMMENT ON TABLE private_notes IS 'Student private notes that can optionally be shared with instructors';
COMMENT ON COLUMN private_notes.is_shared_with_instructor IS 'Student can choose to share specific private notes with their instructor';
COMMENT ON COLUMN private_notes.shared_to_conversation_id IS 'Links to goal_conversation where this note was shared (one-way, cannot unshare)';
COMMENT ON COLUMN conversation_messages.shared_note_id IS 'Links to private_note when message_type is "shared_note"';
