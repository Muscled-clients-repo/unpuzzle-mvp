-- Migration 003: AI Features
-- Date: 2025-08-13
-- Purpose: Create tables for AI chat, reflections, and transcript references

-- Create chat messages table
create table public.chat_messages (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  video_id text references public.videos(id) not null,
  content text not null,
  type text not null default 'user' check (type in ('user', 'ai')),
  video_context jsonb, -- stores {videoId, timestamp, transcript}
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Create transcript references table
create table public.transcript_references (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  video_id text references public.videos(id) not null,
  text text not null,
  start_time integer not null, -- in seconds
  end_time integer not null, -- in seconds
  created_at timestamp with time zone default now() not null
);

-- Create user reflections table
create table public.user_reflections (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  video_id text references public.videos(id) not null,
  course_id text references public.courses(id) not null,
  reflection_text text not null,
  reflection_type text not null default 'text' check (reflection_type in ('text', 'voice', 'video', 'screenshot')),
  media_url text, -- for voice/video/screenshot reflections
  video_timestamp integer, -- timestamp in video when reflection was made
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Create AI interactions tracking table
create table public.ai_interactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  video_id text references public.videos(id),
  course_id text references public.courses(id),
  interaction_type text not null check (interaction_type in ('chat', 'quiz', 'hint', 'reflection_feedback')),
  credits_used integer not null default 1,
  context_data jsonb, -- stores relevant context for the interaction
  created_at timestamp with time zone default now() not null
);

-- Create AI metrics table (for tracking user AI usage)
create table public.ai_metrics (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  date date not null default current_date,
  total_interactions integer not null default 0,
  hints_generated integer not null default 0,
  quizzes_completed integer not null default 0,
  reflections_submitted integer not null default 0,
  credits_used integer not null default 0,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  unique(user_id, date)
);

-- Row Level Security
alter table public.chat_messages enable row level security;
alter table public.transcript_references enable row level security;
alter table public.user_reflections enable row level security;
alter table public.ai_interactions enable row level security;
alter table public.ai_metrics enable row level security;

-- Policies for chat messages
create policy "Users can view own chat messages" on public.chat_messages
  for select using (auth.uid() = user_id);

create policy "Users can create own chat messages" on public.chat_messages
  for insert with check (auth.uid() = user_id);

create policy "Users can update own chat messages" on public.chat_messages
  for update using (auth.uid() = user_id);

-- Policies for transcript references
create policy "Users can view own transcript references" on public.transcript_references
  for select using (auth.uid() = user_id);

create policy "Users can create own transcript references" on public.transcript_references
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own transcript references" on public.transcript_references
  for delete using (auth.uid() = user_id);

-- Policies for user reflections
create policy "Users can view own reflections" on public.user_reflections
  for select using (auth.uid() = user_id);

create policy "Instructors can view reflections for their courses" on public.user_reflections
  for select using (
    exists (
      select 1 from public.courses 
      where courses.id = user_reflections.course_id 
      and courses.instructor_id = auth.uid()
    )
  );

create policy "Users can create own reflections" on public.user_reflections
  for insert with check (auth.uid() = user_id);

create policy "Users can update own reflections" on public.user_reflections
  for update using (auth.uid() = user_id);

-- Policies for AI interactions
create policy "Users can view own AI interactions" on public.ai_interactions
  for select using (auth.uid() = user_id);

create policy "Users can create own AI interactions" on public.ai_interactions
  for insert with check (auth.uid() = user_id);

-- Policies for AI metrics
create policy "Users can view own AI metrics" on public.ai_metrics
  for select using (auth.uid() = user_id);

create policy "Users can update own AI metrics" on public.ai_metrics
  for all using (auth.uid() = user_id);

-- Add updated_at triggers
create trigger update_chat_messages_updated_at
  before update on public.chat_messages
  for each row execute procedure public.update_updated_at_column();

create trigger update_user_reflections_updated_at
  before update on public.user_reflections
  for each row execute procedure public.update_updated_at_column();

create trigger update_ai_metrics_updated_at
  before update on public.ai_metrics
  for each row execute procedure public.update_updated_at_column();

-- Function to increment AI metrics
create or replace function public.increment_ai_metrics(
  p_user_id uuid,
  p_interaction_type text,
  p_credits_used integer default 1
) returns void as $$
begin
  insert into public.ai_metrics (user_id, date, total_interactions, credits_used)
  values (p_user_id, current_date, 1, p_credits_used)
  on conflict (user_id, date) 
  do update set
    total_interactions = ai_metrics.total_interactions + 1,
    credits_used = ai_metrics.credits_used + p_credits_used,
    hints_generated = case when p_interaction_type = 'hint' then ai_metrics.hints_generated + 1 else ai_metrics.hints_generated end,
    quizzes_completed = case when p_interaction_type = 'quiz' then ai_metrics.quizzes_completed + 1 else ai_metrics.quizzes_completed end,
    reflections_submitted = case when p_interaction_type = 'reflection_feedback' then ai_metrics.reflections_submitted + 1 else ai_metrics.reflections_submitted end,
    updated_at = now();
end;
$$ language plpgsql security definer;

-- Function to check AI credit limits
create or replace function public.check_ai_credits(p_user_id uuid)
returns json as $$
declare
  user_subscription record;
  daily_usage integer;
  monthly_usage integer;
  result json;
begin
  -- Get user subscription details
  select s.plan, s.ai_credits, s.ai_credits_used 
  into user_subscription
  from public.subscriptions s
  where s.user_id = p_user_id;

  -- Get daily usage
  select coalesce(sum(credits_used), 0) 
  into daily_usage
  from public.ai_metrics 
  where user_id = p_user_id and date = current_date;

  -- Get monthly usage (from subscription table)
  monthly_usage := coalesce(user_subscription.ai_credits_used, 0);

  -- Build result based on plan
  case user_subscription.plan
    when 'free' then
      result := json_build_object(
        'canUse', daily_usage < 5,
        'dailyUsed', daily_usage,
        'dailyLimit', 5,
        'plan', 'free'
      );
    when 'basic' then
      result := json_build_object(
        'canUse', daily_usage < 20,
        'dailyUsed', daily_usage,
        'dailyLimit', 20,
        'plan', 'basic'
      );
    when 'pro' then
      result := json_build_object(
        'canUse', monthly_usage < user_subscription.ai_credits,
        'monthlyUsed', monthly_usage,
        'monthlyLimit', user_subscription.ai_credits,
        'plan', 'pro'
      );
    else
      result := json_build_object('canUse', false, 'plan', 'unknown');
  end case;

  return result;
end;
$$ language plpgsql security definer;