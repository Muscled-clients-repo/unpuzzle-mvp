-- Create instructor_goal_responses table for instructor feedback on student goals
CREATE TABLE IF NOT EXISTS instructor_goal_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Relationships
    instructor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    daily_note_id UUID REFERENCES user_daily_notes(id) ON DELETE CASCADE, -- Optional: link to specific daily note
    
    -- Response content
    message TEXT NOT NULL,
    response_type TEXT DEFAULT 'feedback' CHECK (response_type IN ('feedback', 'encouragement', 'assignment', 'review')),
    
    -- Target date - which day this response is for
    target_date DATE NOT NULL,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_instructor_goal_responses_instructor_id ON instructor_goal_responses(instructor_id);
CREATE INDEX idx_instructor_goal_responses_student_id ON instructor_goal_responses(student_id);
CREATE INDEX idx_instructor_goal_responses_target_date ON instructor_goal_responses(target_date);
CREATE INDEX idx_instructor_goal_responses_student_date ON instructor_goal_responses(student_id, target_date);

-- RLS Policies
ALTER TABLE instructor_goal_responses ENABLE ROW LEVEL SECURITY;

-- Instructors can view and create responses for their assigned students
CREATE POLICY "Instructors can manage responses for their students" ON instructor_goal_responses
    FOR ALL USING (
        auth.uid() = instructor_id 
        AND EXISTS (
            SELECT 1 FROM profiles up1 
            WHERE up1.id = auth.uid() 
            AND up1.role = 'instructor'
        )
        AND EXISTS (
            SELECT 1 FROM profiles up2 
            WHERE up2.id = student_id 
            AND up2.role = 'student'
        )
    );

-- Students can view responses addressed to them
CREATE POLICY "Students can view responses to them" ON instructor_goal_responses
    FOR SELECT USING (
        auth.uid() = student_id 
        AND EXISTS (
            SELECT 1 FROM profiles up 
            WHERE up.id = auth.uid() 
            AND up.role = 'student'
        )
    );

-- Admins can view all responses
CREATE POLICY "Admins can view all responses" ON instructor_goal_responses
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles up 
            WHERE up.id = auth.uid() 
            AND up.role = 'admin'
        )
    );

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_instructor_goal_responses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_instructor_goal_responses_updated_at
    BEFORE UPDATE ON instructor_goal_responses
    FOR EACH ROW EXECUTE FUNCTION update_instructor_goal_responses_updated_at();