-- Migration 140: Add Featured Students for Community Goals Page
-- Purpose: Allow instructors to select 3 students to showcase publicly
-- Date: 2025-10-16

-- Add is_featured column to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Add featured_order for sorting (1, 2, 3)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS featured_order INTEGER;

-- Add featured_at timestamp to track when they were featured
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS featured_at TIMESTAMPTZ;

-- Create index for fast featured student queries
CREATE INDEX IF NOT EXISTS idx_profiles_featured
  ON profiles(is_featured, featured_order)
  WHERE is_featured = true;

-- Add constraint: only allow max 3 featured students
CREATE OR REPLACE FUNCTION check_featured_students_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_featured = true THEN
    -- Check if we already have 3 featured students
    IF (SELECT COUNT(*) FROM profiles WHERE is_featured = true AND id != NEW.id) >= 3 THEN
      RAISE EXCEPTION 'Cannot feature more than 3 students. Please unfeature another student first.';
    END IF;

    -- Set featured_at timestamp
    NEW.featured_at = NOW();

    -- Auto-assign featured_order if not set
    IF NEW.featured_order IS NULL THEN
      SELECT COALESCE(MAX(featured_order), 0) + 1
      INTO NEW.featured_order
      FROM profiles
      WHERE is_featured = true AND id != NEW.id;
    END IF;
  ELSE
    -- Clear featured fields when unfeaturing
    NEW.featured_order = NULL;
    NEW.featured_at = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Separate triggers for INSERT and UPDATE since they handle OLD differently
DROP TRIGGER IF EXISTS enforce_featured_students_limit_insert ON profiles;
CREATE TRIGGER enforce_featured_students_limit_insert
BEFORE INSERT ON profiles
FOR EACH ROW
WHEN (NEW.is_featured = true)
EXECUTE FUNCTION check_featured_students_limit();

DROP TRIGGER IF EXISTS enforce_featured_students_limit_update ON profiles;
CREATE TRIGGER enforce_featured_students_limit_update
BEFORE UPDATE ON profiles
FOR EACH ROW
WHEN (NEW.is_featured IS DISTINCT FROM OLD.is_featured OR NEW.featured_order IS DISTINCT FROM OLD.featured_order)
EXECUTE FUNCTION check_featured_students_limit();

COMMENT ON COLUMN profiles.is_featured IS 'Whether this student is featured on community/goals page (max 3)';
COMMENT ON COLUMN profiles.featured_order IS 'Order in which featured students appear (1, 2, 3)';
COMMENT ON COLUMN profiles.featured_at IS 'Timestamp when student was featured';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 140 Complete - Featured Students Added';
  RAISE NOTICE 'New columns added to profiles:';
  RAISE NOTICE '  - is_featured (boolean)';
  RAISE NOTICE '  - featured_order (integer)';
  RAISE NOTICE '  - featured_at (timestamptz)';
  RAISE NOTICE 'Max featured students: 3';
END $$;
