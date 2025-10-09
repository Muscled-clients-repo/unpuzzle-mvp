-- Instructor Video Checkpoints System
-- Instructors can place quizzes/prompts at specific video timestamps

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

-- Indexes
CREATE INDEX instructor_video_checkpoints_media_id_idx ON instructor_video_checkpoints(media_file_id);
CREATE INDEX instructor_video_checkpoints_timestamp_idx ON instructor_video_checkpoints(timestamp_seconds);
CREATE INDEX instructor_video_checkpoints_active_idx ON instructor_video_checkpoints(is_active) WHERE is_active = true;
CREATE INDEX instructor_video_checkpoints_creator_idx ON instructor_video_checkpoints(created_by);

-- RLS Policies
ALTER TABLE instructor_video_checkpoints ENABLE ROW LEVEL SECURITY;

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

-- Updated at trigger
CREATE TRIGGER trigger_update_instructor_video_checkpoints_updated_at
  BEFORE UPDATE ON instructor_video_checkpoints
  FOR EACH ROW
  EXECUTE FUNCTION update_resources_updated_at();

-- Link quiz_attempts to checkpoints
ALTER TABLE quiz_attempts
ADD COLUMN IF NOT EXISTS checkpoint_id UUID REFERENCES instructor_video_checkpoints(id) ON DELETE SET NULL;

-- Link reflections to checkpoints
ALTER TABLE reflections
ADD COLUMN IF NOT EXISTS checkpoint_id UUID REFERENCES instructor_video_checkpoints(id) ON DELETE SET NULL;

-- Comments
COMMENT ON TABLE instructor_video_checkpoints IS 'Instructor-placed quizzes/reflection prompts at specific video timestamps';
COMMENT ON COLUMN instructor_video_checkpoints.prompt_type IS 'Type: quiz, reflection, voice_memo';
COMMENT ON COLUMN instructor_video_checkpoints.is_required IS 'If true, blocks video progress until student completes this checkpoint';
