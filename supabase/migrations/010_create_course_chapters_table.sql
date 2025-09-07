-- Create course_chapters table for persistent chapter management
CREATE TABLE course_chapters (
    -- Core identifiers
    id TEXT PRIMARY KEY, -- Keep existing chapter_id format (chapter-1, chapter-2, etc.)
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    
    -- Chapter metadata
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    
    -- Organization and visibility
    "order" INTEGER NOT NULL DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    is_preview BOOLEAN DEFAULT false, -- Allow preview without enrollment
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique ordering per course
    UNIQUE(course_id, "order"),
    UNIQUE(course_id, id)
);

-- Create indexes for better performance
CREATE INDEX idx_course_chapters_course_id ON course_chapters(course_id);
CREATE INDEX idx_course_chapters_order ON course_chapters(course_id, "order");
CREATE INDEX idx_course_chapters_published ON course_chapters(is_published);

-- Enable Row Level Security (RLS)
ALTER TABLE course_chapters ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Policy 1: Users can view chapters for courses they have access to
CREATE POLICY "Users can view chapters for their courses" ON course_chapters
    FOR SELECT USING (
        course_id IN (
            SELECT id FROM courses 
            WHERE instructor_id = auth.uid()
        )
    );

-- Policy 2: Instructors can manage chapters for their own courses
CREATE POLICY "Instructors can manage their course chapters" ON course_chapters
    FOR ALL USING (
        course_id IN (
            SELECT id FROM courses 
            WHERE instructor_id = auth.uid()
        )
    );

-- Policy 3: Service role can manage all chapters
CREATE POLICY "Service role can manage all chapters" ON course_chapters
    FOR ALL USING (
        auth.role() = 'service_role'
    );

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_course_chapters_updated_at 
    BEFORE UPDATE ON course_chapters 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON course_chapters TO authenticated;
GRANT ALL ON course_chapters TO service_role;

-- Add foreign key constraint to videos table (videos.chapter_id should reference course_chapters.id)
-- Note: This will be enforced in application logic for now since existing videos may have chapter_ids 
-- that don't exist in course_chapters yet