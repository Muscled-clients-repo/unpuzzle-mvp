-- Notifications System Migration
-- Creates instructor notification system for track requests, daily notes, and revenue submissions

-- Create notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('track_request', 'daily_note', 'revenue_submission', 'system')),
  title TEXT NOT NULL,
  message TEXT,
  metadata JSONB DEFAULT '{}',
  action_url TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX notifications_user_id_idx ON notifications(user_id);
CREATE INDEX notifications_type_idx ON notifications(type);
CREATE INDEX notifications_created_at_idx ON notifications(created_at DESC);
-- Index for unread notifications query (most common query)
CREATE INDEX notifications_user_unread_idx ON notifications(user_id, read_at, created_at DESC)
  WHERE read_at IS NULL;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own notifications (for marking as read)
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- System can create notifications (service role)
-- No INSERT policy = only service role can create

-- Instructors can view all notifications (for admin purposes)
CREATE POLICY "Instructors can view all notifications" ON notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('instructor', 'admin')
    )
  );

-- Grant permissions
GRANT SELECT, UPDATE ON notifications TO authenticated;

-- Helper function to create notification for all instructors
CREATE OR REPLACE FUNCTION notify_all_instructors(
  notification_type TEXT,
  notification_title TEXT,
  notification_message TEXT,
  notification_metadata JSONB DEFAULT '{}',
  notification_action_url TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, metadata, action_url)
  SELECT
    id,
    notification_type,
    notification_title,
    notification_message,
    notification_metadata,
    notification_action_url
  FROM profiles
  WHERE role IN ('instructor', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION notify_all_instructors TO authenticated;

-- Helper function to create notification for specific instructor
CREATE OR REPLACE FUNCTION notify_instructor(
  instructor_id UUID,
  notification_type TEXT,
  notification_title TEXT,
  notification_message TEXT,
  notification_metadata JSONB DEFAULT '{}',
  notification_action_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, metadata, action_url)
  VALUES (
    instructor_id,
    notification_type,
    notification_title,
    notification_message,
    notification_metadata,
    notification_action_url
  )
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION notify_instructor TO authenticated;
