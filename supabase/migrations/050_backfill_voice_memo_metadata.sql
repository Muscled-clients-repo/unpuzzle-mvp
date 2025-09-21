-- Migration: 050_backfill_voice_memo_metadata.sql
-- Purpose: Backfill metadata for existing voice memos created before the refactor
-- This parses the old reflection_text format to populate the new columns

DO $$
DECLARE
  voice_memo_record RECORD;
  extracted_timestamp DECIMAL;
  extracted_duration DECIMAL;
  extracted_file_url TEXT;
  timestamp_match TEXT;
  duration_match TEXT;
  file_url_match TEXT;
BEGIN
  -- Process all voice memos that don't have the new metadata populated
  FOR voice_memo_record IN
    SELECT id, reflection_text
    FROM reflections
    WHERE reflection_type = 'voice'
    AND (file_url IS NULL OR duration_seconds IS NULL OR video_timestamp_seconds IS NULL)
  LOOP
    -- Initialize variables
    extracted_timestamp := NULL;
    extracted_duration := NULL;
    extracted_file_url := NULL;

    -- Extract video timestamp from "captured at {number}s"
    SELECT substring(voice_memo_record.reflection_text FROM 'captured at ([0-9]+(?:\.[0-9]+)?)s') INTO timestamp_match;
    IF timestamp_match IS NOT NULL THEN
      extracted_timestamp := timestamp_match::DECIMAL;
    END IF;

    -- Extract duration from "Duration: {number}s"
    SELECT substring(voice_memo_record.reflection_text FROM 'Duration: ([0-9]+(?:\.[0-9]+)?)s') INTO duration_match;
    IF duration_match IS NOT NULL THEN
      extracted_duration := duration_match::DECIMAL;
    END IF;

    -- Extract file URL from "File URL: {url}"
    SELECT substring(voice_memo_record.reflection_text FROM 'File URL: ([^\n\r]+)') INTO file_url_match;
    IF file_url_match IS NOT NULL THEN
      extracted_file_url := trim(file_url_match);
    END IF;

    -- Update the record with extracted metadata
    UPDATE reflections
    SET
      video_timestamp_seconds = COALESCE(video_timestamp_seconds, extracted_timestamp),
      duration_seconds = COALESCE(duration_seconds, extracted_duration),
      file_url = COALESCE(file_url, extracted_file_url)
    WHERE id = voice_memo_record.id;

    RAISE NOTICE 'Updated voice memo % with timestamp=%, duration=%, file_url=%',
      voice_memo_record.id, extracted_timestamp, extracted_duration,
      CASE WHEN extracted_file_url IS NOT NULL THEN 'present' ELSE 'missing' END;
  END LOOP;

  RAISE NOTICE 'Backfill completed successfully!';
END $$;