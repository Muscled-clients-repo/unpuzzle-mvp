-- Goals and Daily Notes System for V1 Integration
-- This migration adds missing database fields to support the approved V1 UX

-- Add daily notes table for student daily updates
CREATE TABLE public.user_daily_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  goal_id UUID REFERENCES public.track_goals(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  note_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, note_date)
);

-- Add goal progress tracking fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN goal_title TEXT,
ADD COLUMN goal_current_amount TEXT,
ADD COLUMN goal_target_amount TEXT,
ADD COLUMN goal_progress INTEGER DEFAULT 0 CHECK (goal_progress >= 0 AND goal_progress <= 100),
ADD COLUMN goal_target_date DATE,
ADD COLUMN goal_start_date DATE,
ADD COLUMN goal_status TEXT DEFAULT 'active' CHECK (goal_status IN ('active', 'completed', 'paused'));

-- Create indexes for performance
CREATE INDEX user_daily_notes_user_id_idx ON public.user_daily_notes(user_id);
CREATE INDEX user_daily_notes_date_idx ON public.user_daily_notes(note_date);
CREATE INDEX user_daily_notes_goal_id_idx ON public.user_daily_notes(goal_id);
CREATE INDEX profiles_goal_status_idx ON public.profiles(goal_status);

-- Enable RLS
ALTER TABLE public.user_daily_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily notes (users manage own notes)
CREATE POLICY "Users can manage own daily notes" 
  ON public.user_daily_notes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Instructors can view student daily notes" 
  ON public.user_daily_notes FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'instructor'
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER user_daily_notes_updated_at
  BEFORE UPDATE ON public.user_daily_notes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_daily_notes TO authenticated;

-- Insert sample goal data for existing users
DO $$
DECLARE
  student_id_var UUID;
BEGIN
  -- Get the first student user ID
  SELECT id INTO student_id_var FROM public.profiles WHERE role = 'student' LIMIT 1;
  
  -- Only insert if we have a student
  IF student_id_var IS NOT NULL THEN
    UPDATE public.profiles 
    SET 
      goal_title = 'UI/UX Designer to $4K/month',
      goal_current_amount = '$450',
      goal_target_amount = '$4,000',
      goal_progress = 11,
      goal_target_date = '2025-03-17',
      goal_start_date = '2024-09-17',
      goal_status = 'active'
    WHERE id = student_id_var;
    
    -- Insert sample daily notes
    INSERT INTO public.user_daily_notes (user_id, note, note_date) VALUES 
    (student_id_var, 'User research is more complex than I thought. Need to practice more.', '2024-09-23'),
    (student_id_var, 'First potential client call! They liked my portfolio but want to see more e-commerce work.', '2024-09-22'),
    (student_id_var, 'Focused on understanding design systems today. The component library approach makes so much sense now.', '2024-09-21'),
    (student_id_var, 'Applied to 3 new projects today. Feeling more confident about my proposals.', '2024-09-20');
    
    RAISE NOTICE 'Sample goal data and daily notes inserted for student %', student_id_var;
  ELSE
    RAISE NOTICE 'No student found. Skipping sample data insertion.';
  END IF;
END $$;