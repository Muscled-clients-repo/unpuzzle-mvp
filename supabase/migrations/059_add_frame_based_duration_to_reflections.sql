-- Add frame-based duration columns to reflections table
-- This aligns voice memos with the frame-based architecture used in the studio video editor

-- Add new frame-based columns
ALTER TABLE reflections
ADD COLUMN duration_frames INTEGER,
ADD COLUMN video_timestamp_frames INTEGER;

-- Create index for frame-based queries (performance optimization)
CREATE INDEX IF NOT EXISTS idx_reflections_duration_frames
ON reflections(duration_frames)
WHERE duration_frames IS NOT NULL;

-- Migrate existing data from seconds to frames (using 30 FPS standard)
-- duration_seconds → duration_frames
UPDATE reflections
SET duration_frames = ROUND(duration_seconds * 30)
WHERE duration_seconds IS NOT NULL
AND duration_frames IS NULL;

-- video_timestamp_seconds → video_timestamp_frames
UPDATE reflections
SET video_timestamp_frames = ROUND(video_timestamp_seconds * 30)
WHERE video_timestamp_seconds IS NOT NULL
AND video_timestamp_frames IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN reflections.duration_frames IS 'Voice memo duration in frames (30 FPS) for frame-perfect accuracy';
COMMENT ON COLUMN reflections.video_timestamp_frames IS 'Video timestamp in frames (30 FPS) when reflection was captured';

-- Note: We keep the old seconds columns for backward compatibility
-- New code should use frame-based columns, old code continues to work