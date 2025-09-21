-- Add AI-generated summary columns to videos table
-- This enables us to store pregenerated video summaries for efficient chat context

ALTER TABLE videos
ADD COLUMN ai_summary JSONB,
ADD COLUMN ai_summary_generated_at TIMESTAMPTZ,
ADD COLUMN ai_summary_version TEXT DEFAULT 'v1';

-- The JSONB structure will store:
-- {
--   "id": "summary_videoId_timestamp",
--   "content": "Detailed summary text...",
--   "keyTopics": ["topic1", "topic2", "topic3"],
--   "mainConcepts": ["concept1", "concept2"],
--   "duration": 1800,
--   "summaryLength": "5-6 minute",
--   "generatedAt": "2025-01-09T12:00:00Z"
-- }

-- Create index for efficient summary queries
CREATE INDEX idx_videos_ai_summary_generated ON videos(ai_summary_generated_at)
WHERE ai_summary IS NOT NULL;

-- Create index for summary version tracking
CREATE INDEX idx_videos_ai_summary_version ON videos(ai_summary_version)
WHERE ai_summary IS NOT NULL;

COMMENT ON COLUMN videos.ai_summary IS 'JSONB containing AI-generated video summary with topics, concepts, and content for chat context';
COMMENT ON COLUMN videos.ai_summary_generated_at IS 'Timestamp when the AI summary was generated';
COMMENT ON COLUMN videos.ai_summary_version IS 'Version of the AI summary format for future migrations';