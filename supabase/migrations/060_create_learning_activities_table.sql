-- Create learning_activities table for agent system separation
-- This table will replace agent-related message types in the messages table

CREATE TABLE learning_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,

    -- Activity identification
    activity_type TEXT NOT NULL CHECK (activity_type IN ('quiz', 'reflection', 'checkpoint', 'prompt')),
    activity_subtype TEXT, -- 'voice', 'loom', 'multiple_choice', etc.

    -- Content and state
    title TEXT NOT NULL,
    content JSONB, -- Flexible content storage for different activity types
    state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'active', 'completed')),

    -- Metadata
    triggered_at_timestamp INTEGER, -- Video timestamp that triggered this activity
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_learning_activities_user_course ON learning_activities(user_id, course_id);
CREATE INDEX idx_learning_activities_video ON learning_activities(video_id);
CREATE INDEX idx_learning_activities_type ON learning_activities(activity_type, state);
CREATE INDEX idx_learning_activities_created_at ON learning_activities(created_at);

-- RLS Policies
ALTER TABLE learning_activities ENABLE ROW LEVEL SECURITY;

-- Users can only see their own learning activities
CREATE POLICY "Users can view own learning activities" ON learning_activities
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create learning activities for themselves
CREATE POLICY "Users can create own learning activities" ON learning_activities
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own learning activities
CREATE POLICY "Users can update own learning activities" ON learning_activities
    FOR UPDATE USING (auth.uid() = user_id);

-- Instructors can view learning activities for their students
-- (Based on course enrollment through user_courses table)
CREATE POLICY "Instructors can view student learning activities" ON learning_activities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM courses c
            WHERE c.id = learning_activities.course_id
            AND c.instructor_id = auth.uid()
        )
    );

-- Add activity_id to reflections table to link to learning_activities
ALTER TABLE reflections
ADD COLUMN activity_id UUID REFERENCES learning_activities(id) ON DELETE SET NULL;

-- Create index for the new foreign key
CREATE INDEX idx_reflections_activity_id ON reflections(activity_id);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_learning_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_learning_activities_updated_at
    BEFORE UPDATE ON learning_activities
    FOR EACH ROW
    EXECUTE FUNCTION update_learning_activities_updated_at();

-- Comments for documentation
COMMENT ON TABLE learning_activities IS 'Stores all learning agent activities separately from chat messages for clean architectural separation';
COMMENT ON COLUMN learning_activities.activity_type IS 'Type of learning activity: quiz, reflection, checkpoint, prompt';
COMMENT ON COLUMN learning_activities.activity_subtype IS 'Subtype for specific implementations: voice, loom, multiple_choice, etc.';
COMMENT ON COLUMN learning_activities.content IS 'Flexible JSONB storage for activity-specific data';
COMMENT ON COLUMN learning_activities.state IS 'Activity lifecycle state: pending, active, completed';
COMMENT ON COLUMN learning_activities.triggered_at_timestamp IS 'Video timestamp in seconds that triggered this activity';