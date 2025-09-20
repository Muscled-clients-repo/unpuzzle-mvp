-- Add missing columns to quiz_attempts table if they don't exist
-- This handles the case where the table exists but is missing some columns

-- Add percentage column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'quiz_attempts' AND column_name = 'percentage'
    ) THEN
        ALTER TABLE quiz_attempts ADD COLUMN percentage DECIMAL NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Add other potentially missing columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'quiz_attempts' AND column_name = 'questions'
    ) THEN
        ALTER TABLE quiz_attempts ADD COLUMN questions JSONB NOT NULL DEFAULT '[]';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'quiz_attempts' AND column_name = 'user_answers'
    ) THEN
        ALTER TABLE quiz_attempts ADD COLUMN user_answers JSONB NOT NULL DEFAULT '[]';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'quiz_attempts' AND column_name = 'score'
    ) THEN
        ALTER TABLE quiz_attempts ADD COLUMN score INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'quiz_attempts' AND column_name = 'total_questions'
    ) THEN
        ALTER TABLE quiz_attempts ADD COLUMN total_questions INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;