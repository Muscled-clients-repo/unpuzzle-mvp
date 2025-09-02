-- Create videos table matching UI expectations (UI-First Database Design)
-- This table serves data in formats the existing UI already expects
CREATE TABLE videos (
    -- Core identifiers (match domain.ts Video interface)
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    chapter_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    
    -- Duration as formatted string (UI expects "5:30" format, not seconds)
    duration TEXT DEFAULT '0:00', -- e.g., "5:30", "1:23:45"
    duration_seconds INTEGER DEFAULT 0, -- For calculations
    
    -- URLs (match domain.ts Video interface field names)  
    video_url TEXT, -- Main video URL (CDN or direct)
    thumbnail_url TEXT, -- Video thumbnail URL
    
    -- File metadata  
    filename TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    
    -- Upload status (match course-creation-slice.ts VideoUpload interface)
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'uploading', 'processing', 'complete', 'error')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    
    -- Storage backend URLs (internal use)
    backblaze_file_id TEXT, -- Backblaze B2 file ID for deletion
    backblaze_url TEXT, -- Private Backblaze B2 URL
    bunny_url TEXT, -- Bunny.net CDN URL
    
    -- Video technical metadata
    video_format TEXT DEFAULT 'mp4',
    video_quality TEXT DEFAULT 'original',
    
    -- Organization (match UI expectations)
    "order" INTEGER DEFAULT 0,
    
    -- Timestamps (match domain.ts Video interface)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique ordering per chapter
    UNIQUE(course_id, chapter_id, "order")
);

-- Create indexes for better performance
CREATE INDEX idx_videos_course_id ON videos(course_id);
CREATE INDEX idx_videos_chapter_id ON videos(chapter_id);
CREATE INDEX idx_videos_status ON videos(status);
CREATE INDEX idx_videos_course_chapter_order ON videos(course_id, chapter_id, "order");

-- Enable Row Level Security (RLS)
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Policy 1: Users can view videos for courses they have access to
CREATE POLICY "Users can view videos for their courses" ON videos
    FOR SELECT USING (
        course_id IN (
            SELECT id FROM courses 
            WHERE instructor_id = auth.uid()
        )
    );

-- Policy 2: Instructors can manage videos for their own courses
CREATE POLICY "Instructors can manage their course videos" ON videos
    FOR ALL USING (
        course_id IN (
            SELECT id FROM courses 
            WHERE instructor_id = auth.uid()
        )
    );

-- Policy 3: Service role can manage all videos (for backend operations)
CREATE POLICY "Service role can manage all videos" ON videos
    FOR ALL USING (
        auth.role() = 'service_role'
    );

-- Create function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_videos_updated_at 
    BEFORE UPDATE ON videos 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON videos TO authenticated;
GRANT ALL ON videos TO service_role;