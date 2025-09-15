-- Create instructor_response_files table for file attachments on instructor responses
CREATE TABLE IF NOT EXISTS instructor_response_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Relationships
    instructor_response_id UUID NOT NULL REFERENCES instructor_goal_responses(id) ON DELETE CASCADE,
    instructor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- File metadata
    filename TEXT NOT NULL, -- Storage filename
    original_filename TEXT NOT NULL, -- Original uploaded filename
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,

    -- Backblaze/CDN info
    backblaze_file_id TEXT,
    cdn_url TEXT, -- Private URL for signed URL generation

    -- Upload status
    upload_status TEXT DEFAULT 'completed' CHECK (upload_status IN ('uploading', 'completed', 'failed')),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_instructor_response_files_response_id ON instructor_response_files(instructor_response_id);
CREATE INDEX idx_instructor_response_files_instructor_id ON instructor_response_files(instructor_id);
CREATE INDEX idx_instructor_response_files_created_at ON instructor_response_files(created_at);

-- RLS Policies
ALTER TABLE instructor_response_files ENABLE ROW LEVEL SECURITY;

-- Instructors can manage files for their own responses
CREATE POLICY "Instructors can manage files for their responses" ON instructor_response_files
    FOR ALL USING (
        auth.uid() = instructor_id
        AND EXISTS (
            SELECT 1 FROM profiles up
            WHERE up.id = auth.uid()
            AND up.role = 'instructor'
        )
    );

-- Students can view files in responses addressed to them
CREATE POLICY "Students can view response files addressed to them" ON instructor_response_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM instructor_goal_responses igr
            WHERE igr.id = instructor_response_id
            AND igr.student_id = auth.uid()
            AND EXISTS (
                SELECT 1 FROM profiles up
                WHERE up.id = auth.uid()
                AND up.role = 'student'
            )
        )
    );

-- Admins can view all files
CREATE POLICY "Admins can view all response files" ON instructor_response_files
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles up
            WHERE up.id = auth.uid()
            AND up.role = 'admin'
        )
    );

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_instructor_response_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_instructor_response_files_updated_at
    BEFORE UPDATE ON instructor_response_files
    FOR EACH ROW EXECUTE FUNCTION update_instructor_response_files_updated_at();