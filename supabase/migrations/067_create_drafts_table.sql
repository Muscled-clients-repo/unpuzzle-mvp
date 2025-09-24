-- Create drafts table for auto-save functionality
CREATE TABLE IF NOT EXISTS drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('bug_report', 'feature_request')),
  title TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_drafts_user_id ON drafts(user_id);
CREATE INDEX idx_drafts_type ON drafts(type);
CREATE INDEX idx_drafts_updated_at ON drafts(updated_at);

-- RLS policies
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own drafts
CREATE POLICY "Users can view their own drafts"
  ON drafts FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own drafts
CREATE POLICY "Users can create their own drafts"
  ON drafts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own drafts
CREATE POLICY "Users can update their own drafts"
  ON drafts FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own drafts
CREATE POLICY "Users can delete their own drafts"
  ON drafts FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on every update
CREATE TRIGGER update_drafts_updated_at_trigger
  BEFORE UPDATE ON drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_drafts_updated_at();