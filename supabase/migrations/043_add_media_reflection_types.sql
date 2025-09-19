-- Add new reflection types for media-based reflections
-- This extends the existing reflection_type enum to support voice, screenshot, and loom reflections

-- First, check if the constraint exists as an enum or check constraint
DO $$
BEGIN
  -- Try to add new values to the reflection_type constraint
  -- The reflection_type is defined as a CHECK constraint, not an enum type

  -- Drop the existing check constraint (PostgreSQL auto-generated name)
  ALTER TABLE reflections DROP CONSTRAINT IF EXISTS reflections_reflection_type_check;

  -- Add the new check constraint with format-based types only
  ALTER TABLE reflections ADD CONSTRAINT chk_reflection_type
    CHECK (reflection_type IN (
      'voice', 'screenshot', 'loom', 'text'
    ));

  RAISE NOTICE 'Successfully updated reflection types to format-based: voice, screenshot, loom, text';

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error updating reflection types: %', SQLERRM;
END $$;