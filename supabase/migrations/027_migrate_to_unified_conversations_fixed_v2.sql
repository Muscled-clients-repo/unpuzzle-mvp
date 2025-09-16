-- Fixed Migration script to move data from fragmented tables to unified conversation system
-- This runs after the unified schema is created and migrates existing data

-- Function to migrate existing data to unified conversation system
CREATE OR REPLACE FUNCTION migrate_to_unified_conversations()
RETURNS TABLE(
  operation TEXT,
  count_migrated BIGINT,
  status TEXT
) AS $$
DECLARE
  conversation_record RECORD;
  message_record RECORD;
  file_record RECORD;
  conversations_created BIGINT := 0;
  additional_conversations BIGINT := 0;
  daily_notes_migrated BIGINT := 0;
  instructor_responses_migrated BIGINT := 0;
  activities_migrated BIGINT := 0;
  daily_files_migrated BIGINT := 0;
  instructor_files_migrated BIGINT := 0;
BEGIN

  -- Step 1: Create conversations for each student-instructor pair
  RAISE NOTICE 'Step 1: Creating conversations from existing data...';

  -- First, create conversations from instructor-student pairs (where instructor_id is not null)
  INSERT INTO goal_conversations (student_id, instructor_id, status, created_at, updated_at)
  SELECT DISTINCT
    student_id,
    instructor_id,
    'active'::text,
    MIN(created_at) as created_at,
    MAX(updated_at) as updated_at
  FROM instructor_goal_responses igr
  WHERE NOT EXISTS (
    SELECT 1 FROM goal_conversations gc
    WHERE gc.student_id = igr.student_id
    AND gc.instructor_id = igr.instructor_id
  )
  GROUP BY student_id, instructor_id;

  GET DIAGNOSTICS conversations_created = ROW_COUNT;

  -- Then, create student-only conversations (where instructor_id is null)
  INSERT INTO goal_conversations (student_id, instructor_id, status, created_at, updated_at)
  SELECT DISTINCT
    udn.user_id as student_id,
    NULL::uuid as instructor_id,
    'active'::text,
    MIN(udn.created_at) as created_at,
    MAX(udn.updated_at) as updated_at
  FROM user_daily_notes udn
  WHERE NOT EXISTS (
    SELECT 1 FROM goal_conversations gc
    WHERE gc.student_id = udn.user_id
    AND gc.instructor_id IS NULL
  )
  GROUP BY udn.user_id;

  GET DIAGNOSTICS additional_conversations = ROW_COUNT;
  conversations_created := conversations_created + additional_conversations;

  RETURN QUERY SELECT 'conversations_created'::TEXT, conversations_created, 'SUCCESS'::TEXT;

  -- Step 2: Migrate daily notes to conversation messages
  RAISE NOTICE 'Step 2: Migrating daily notes to messages...';

  FOR message_record IN
    SELECT
      udn.id as original_id,
      udn.user_id,
      udn.note,
      udn.note_date,
      udn.created_at,
      udn.updated_at,
      gc.id as conversation_id
    FROM user_daily_notes udn
    JOIN goal_conversations gc ON gc.student_id = udn.user_id AND gc.instructor_id IS NULL
    WHERE NOT EXISTS (
      SELECT 1 FROM conversation_messages cm
      WHERE cm.metadata->>'migrated_from' = 'user_daily_notes'
      AND (cm.metadata->>'original_id')::uuid = udn.id
    )
  LOOP
    INSERT INTO conversation_messages (
      conversation_id,
      sender_id,
      message_type,
      content,
      metadata,
      target_date,
      created_at,
      updated_at
    ) VALUES (
      message_record.conversation_id,
      message_record.user_id,
      'daily_note',
      message_record.note,
      jsonb_build_object('migrated_from', 'user_daily_notes', 'original_id', message_record.original_id),
      message_record.note_date,
      message_record.created_at,
      message_record.updated_at
    );

    daily_notes_migrated := daily_notes_migrated + 1;
  END LOOP;

  RETURN QUERY SELECT 'daily_notes_migrated'::TEXT, daily_notes_migrated, 'SUCCESS'::TEXT;

  -- Step 3: Migrate instructor responses to conversation messages
  RAISE NOTICE 'Step 3: Migrating instructor responses to messages...';

  FOR message_record IN
    SELECT
      igr.id as original_id,
      igr.instructor_id,
      igr.student_id,
      igr.message,
      igr.response_type,
      igr.target_date,
      igr.metadata,
      igr.created_at,
      igr.updated_at,
      gc.id as conversation_id
    FROM instructor_goal_responses igr
    JOIN goal_conversations gc ON gc.student_id = igr.student_id AND gc.instructor_id = igr.instructor_id
    WHERE NOT EXISTS (
      SELECT 1 FROM conversation_messages cm
      WHERE cm.metadata->>'migrated_from' = 'instructor_goal_responses'
      AND (cm.metadata->>'original_id')::uuid = igr.id
    )
  LOOP
    INSERT INTO conversation_messages (
      conversation_id,
      sender_id,
      message_type,
      content,
      metadata,
      target_date,
      created_at,
      updated_at
    ) VALUES (
      message_record.conversation_id,
      message_record.instructor_id,
      'instructor_response',
      message_record.message,
      jsonb_build_object(
        'migrated_from', 'instructor_goal_responses',
        'original_id', message_record.original_id,
        'response_type', message_record.response_type
      ) || COALESCE(message_record.metadata, '{}'::jsonb),
      message_record.target_date,
      message_record.created_at,
      message_record.updated_at
    );

    instructor_responses_migrated := instructor_responses_migrated + 1;
  END LOOP;

  RETURN QUERY SELECT 'instructor_responses_migrated'::TEXT, instructor_responses_migrated, 'SUCCESS'::TEXT;

  -- Step 4: Migrate user actions to conversation messages
  RAISE NOTICE 'Step 4: Migrating user actions to messages...';

  FOR message_record IN
    SELECT
      ua.id as original_id,
      ua.user_id,
      ua.description,
      ua.metadata,
      ua.action_date,
      ua.created_at,
      at.name as action_type_name,
      at.is_auto_tracked,
      gc.id as conversation_id
    FROM user_actions ua
    JOIN action_types at ON at.id = ua.action_type_id
    JOIN goal_conversations gc ON gc.student_id = ua.user_id AND gc.instructor_id IS NULL
    WHERE NOT EXISTS (
      SELECT 1 FROM conversation_messages cm
      WHERE cm.metadata->>'migrated_from' = 'user_actions'
      AND (cm.metadata->>'original_id')::uuid = ua.id
    )
  LOOP
    INSERT INTO conversation_messages (
      conversation_id,
      sender_id,
      message_type,
      content,
      metadata,
      target_date,
      created_at,
      updated_at
    ) VALUES (
      message_record.conversation_id,
      message_record.user_id,
      'activity',
      COALESCE(message_record.description, 'Activity: ' || message_record.action_type_name),
      jsonb_build_object(
        'migrated_from', 'user_actions',
        'original_id', message_record.original_id,
        'action_type', message_record.action_type_name,
        'is_auto_tracked', message_record.is_auto_tracked
      ) || COALESCE(message_record.metadata, '{}'::jsonb),
      message_record.action_date,
      message_record.created_at,
      message_record.created_at -- user_actions doesn't have updated_at
    );

    activities_migrated := activities_migrated + 1;
  END LOOP;

  RETURN QUERY SELECT 'activities_migrated'::TEXT, activities_migrated, 'SUCCESS'::TEXT;

  -- Step 5: Migrate daily note files to message attachments
  RAISE NOTICE 'Step 5: Migrating daily note files to message attachments...';

  FOR file_record IN
    SELECT
      dnf.id as original_id,
      dnf.daily_note_id,
      dnf.user_id,
      dnf.filename,
      dnf.original_filename,
      dnf.file_size,
      dnf.mime_type,
      dnf.storage_path,
      dnf.backblaze_file_id,
      dnf.cdn_url,
      dnf.upload_status,
      dnf.message_text,
      dnf.created_at,
      cm.id as message_id
    FROM daily_note_files dnf
    JOIN user_daily_notes udn ON udn.id = dnf.daily_note_id
    JOIN conversation_messages cm ON
      cm.metadata->>'migrated_from' = 'user_daily_notes'
      AND (cm.metadata->>'original_id')::uuid = udn.id
    WHERE NOT EXISTS (
      SELECT 1 FROM message_attachments ma
      WHERE ma.message_id = cm.id
      AND ma.original_filename = dnf.original_filename
    )
  LOOP
    INSERT INTO message_attachments (
      message_id,
      filename,
      original_filename,
      file_size,
      mime_type,
      cdn_url,
      backblaze_file_id,
      storage_path,
      upload_status,
      created_at
    ) VALUES (
      file_record.message_id,
      file_record.filename,
      file_record.original_filename,
      file_record.file_size,
      file_record.mime_type,
      file_record.cdn_url,
      file_record.backblaze_file_id,
      file_record.storage_path,
      COALESCE(file_record.upload_status, 'completed'),
      file_record.created_at
    );

    daily_files_migrated := daily_files_migrated + 1;
  END LOOP;

  RETURN QUERY SELECT 'daily_files_migrated'::TEXT, daily_files_migrated, 'SUCCESS'::TEXT;

  -- Step 6: Migrate instructor response files to message attachments
  RAISE NOTICE 'Step 6: Migrating instructor response files to message attachments...';

  FOR file_record IN
    SELECT
      irf.id as original_id,
      irf.instructor_response_id,
      irf.instructor_id,
      irf.filename,
      irf.original_filename,
      irf.file_size,
      irf.mime_type,
      irf.storage_path,
      irf.backblaze_file_id,
      irf.cdn_url,
      irf.upload_status,
      irf.created_at,
      cm.id as message_id
    FROM instructor_response_files irf
    JOIN instructor_goal_responses igr ON igr.id = irf.instructor_response_id
    JOIN conversation_messages cm ON
      cm.metadata->>'migrated_from' = 'instructor_goal_responses'
      AND (cm.metadata->>'original_id')::uuid = igr.id
    WHERE NOT EXISTS (
      SELECT 1 FROM message_attachments ma
      WHERE ma.message_id = cm.id
      AND ma.original_filename = irf.original_filename
    )
  LOOP
    INSERT INTO message_attachments (
      message_id,
      filename,
      original_filename,
      file_size,
      mime_type,
      cdn_url,
      backblaze_file_id,
      storage_path,
      upload_status,
      created_at
    ) VALUES (
      file_record.message_id,
      file_record.filename,
      file_record.original_filename,
      file_record.file_size,
      file_record.mime_type,
      file_record.cdn_url,
      file_record.backblaze_file_id,
      file_record.storage_path,
      COALESCE(file_record.upload_status, 'completed'),
      file_record.created_at
    );

    instructor_files_migrated := instructor_files_migrated + 1;
  END LOOP;

  RETURN QUERY SELECT 'instructor_files_migrated'::TEXT, instructor_files_migrated, 'SUCCESS'::TEXT;

  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '- Conversations created: %', conversations_created;
  RAISE NOTICE '- Daily notes migrated: %', daily_notes_migrated;
  RAISE NOTICE '- Instructor responses migrated: %', instructor_responses_migrated;
  RAISE NOTICE '- Activities migrated: %', activities_migrated;
  RAISE NOTICE '- Daily files migrated: %', daily_files_migrated;
  RAISE NOTICE '- Instructor files migrated: %', instructor_files_migrated;

END;
$$ LANGUAGE plpgsql;

-- Function to validate migration results
CREATE OR REPLACE FUNCTION validate_conversation_migration()
RETURNS TABLE(
  check_name TEXT,
  old_count BIGINT,
  new_count BIGINT,
  status TEXT
) AS $$
BEGIN
  -- Validate daily notes migration
  RETURN QUERY
  SELECT
    'daily_notes_migrated'::TEXT,
    (SELECT COUNT(*) FROM user_daily_notes),
    (SELECT COUNT(*) FROM conversation_messages WHERE message_type = 'daily_note'),
    CASE WHEN
      (SELECT COUNT(*) FROM user_daily_notes) =
      (SELECT COUNT(*) FROM conversation_messages WHERE message_type = 'daily_note')
    THEN 'PASS' ELSE 'FAIL' END;

  -- Validate instructor responses migration
  RETURN QUERY
  SELECT
    'instructor_responses_migrated'::TEXT,
    (SELECT COUNT(*) FROM instructor_goal_responses),
    (SELECT COUNT(*) FROM conversation_messages WHERE message_type = 'instructor_response'),
    CASE WHEN
      (SELECT COUNT(*) FROM instructor_goal_responses) =
      (SELECT COUNT(*) FROM conversation_messages WHERE message_type = 'instructor_response')
    THEN 'PASS' ELSE 'FAIL' END;

  -- Validate user actions migration
  RETURN QUERY
  SELECT
    'user_actions_migrated'::TEXT,
    (SELECT COUNT(*) FROM user_actions),
    (SELECT COUNT(*) FROM conversation_messages WHERE message_type = 'activity'),
    CASE WHEN
      (SELECT COUNT(*) FROM user_actions) =
      (SELECT COUNT(*) FROM conversation_messages WHERE message_type = 'activity')
    THEN 'PASS' ELSE 'FAIL' END;

  -- Validate file attachments migration
  RETURN QUERY
  SELECT
    'attachments_migrated'::TEXT,
    (SELECT COUNT(*) FROM daily_note_files) + (SELECT COUNT(*) FROM instructor_response_files),
    (SELECT COUNT(*) FROM message_attachments),
    CASE WHEN
      (SELECT COUNT(*) FROM daily_note_files) + (SELECT COUNT(*) FROM instructor_response_files) =
      (SELECT COUNT(*) FROM message_attachments)
    THEN 'PASS' ELSE 'FAIL' END;

  -- Validate conversations created
  RETURN QUERY
  SELECT
    'conversations_created'::TEXT,
    (SELECT COUNT(DISTINCT student_id) FROM user_daily_notes) +
    (SELECT COUNT(DISTINCT (student_id, instructor_id)) FROM instructor_goal_responses),
    (SELECT COUNT(*) FROM goal_conversations),
    CASE WHEN
      (SELECT COUNT(*) FROM goal_conversations) > 0
    THEN 'PASS' ELSE 'FAIL' END;

END;
$$ LANGUAGE plpgsql;

-- Function to create backup of old data before cleanup
CREATE OR REPLACE FUNCTION backup_old_conversation_data()
RETURNS TEXT AS $$
BEGIN
  -- Create backup tables with timestamp
  EXECUTE format('CREATE TABLE backup_user_daily_notes_%s AS SELECT * FROM user_daily_notes',
    to_char(now(), 'YYYY_MM_DD_HH24_MI_SS'));

  EXECUTE format('CREATE TABLE backup_daily_note_files_%s AS SELECT * FROM daily_note_files',
    to_char(now(), 'YYYY_MM_DD_HH24_MI_SS'));

  EXECUTE format('CREATE TABLE backup_instructor_goal_responses_%s AS SELECT * FROM instructor_goal_responses',
    to_char(now(), 'YYYY_MM_DD_HH24_MI_SS'));

  EXECUTE format('CREATE TABLE backup_instructor_response_files_%s AS SELECT * FROM instructor_response_files',
    to_char(now(), 'YYYY_MM_DD_HH24_MI_SS'));

  EXECUTE format('CREATE TABLE backup_user_actions_%s AS SELECT * FROM user_actions',
    to_char(now(), 'YYYY_MM_DD_HH24_MI_SS'));

  RETURN 'Backup completed with timestamp: ' || to_char(now(), 'YYYY-MM-DD HH24:MI:SS');
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION migrate_to_unified_conversations() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_conversation_migration() TO authenticated;
GRANT EXECUTE ON FUNCTION backup_old_conversation_data() TO authenticated;

-- Create a migration status tracking table
CREATE TABLE IF NOT EXISTS migration_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_name TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert migration tracking record
INSERT INTO migration_status (migration_name, status, details)
VALUES ('unified_conversations', 'pending', '{"description": "Migration from fragmented to unified conversation system"}')
ON CONFLICT (migration_name) DO UPDATE SET
  status = 'pending',
  details = '{"description": "Migration from fragmented to unified conversation system"}';