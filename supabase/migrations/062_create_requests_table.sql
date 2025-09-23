-- Create unified requests table for bug reports, feature requests, track changes, and refunds
CREATE TABLE public.requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,

  -- Request details
  request_type TEXT NOT NULL CHECK (request_type IN ('bug_report', 'feature_request', 'track_change', 'refund')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Status and priority
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'completed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- Type-specific metadata (JSON for flexibility)
  metadata JSONB DEFAULT '{}',

  -- Assignment and timestamps
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  resolved_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX requests_user_id_idx ON requests(user_id);
CREATE INDEX requests_type_idx ON requests(request_type);
CREATE INDEX requests_status_idx ON requests(status);
CREATE INDEX requests_assigned_to_idx ON requests(assigned_to);
CREATE INDEX requests_created_at_idx ON requests(created_at);

-- Enable RLS
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Students can view their own requests
CREATE POLICY "Students can view their own requests" ON requests
  FOR SELECT
  USING (
    auth.uid() = user_id
  );

-- Students can create their own requests
CREATE POLICY "Students can create their own requests" ON requests
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
  );

-- Students can update their own pending requests (to add details, not change status)
CREATE POLICY "Students can update their own pending requests" ON requests
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND status = 'pending'
  )
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND request_type = OLD.request_type -- Cannot change request type
  );

-- Instructors/admins can view all requests
CREATE POLICY "Instructors can view all requests" ON requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('instructor', 'admin')
    )
  );

-- Instructors/admins can update requests (status, assignment, etc.)
CREATE POLICY "Instructors can update requests" ON requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('instructor', 'admin')
    )
  );

-- Create simple function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();

  -- Set resolved_at when status is completed/rejected
  IF NEW.status IN ('completed', 'rejected') AND NEW.resolved_at IS NULL THEN
    NEW.resolved_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_requests_updated_at
  BEFORE UPDATE ON requests
  FOR EACH ROW
  EXECUTE FUNCTION update_requests_updated_at();

-- Add comments for documentation
COMMENT ON TABLE requests IS 'Unified table for all user requests: bug reports, feature requests, track changes, and refunds';
COMMENT ON COLUMN requests.metadata IS 'JSON field for request-type specific data (e.g., current_track, desired_track for track changes)';