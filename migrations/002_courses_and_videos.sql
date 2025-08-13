-- Migration 002: Courses and Videos
-- Date: 2025-08-13
-- Purpose: Create course structure and video content tables

-- Create courses table
create table public.courses (
  id text primary key, -- Using text to match existing courseIds like 'course-1'
  title text not null,
  description text not null,
  thumbnail_url text,
  instructor_id uuid references public.profiles(id) not null,
  price decimal(10,2) not null default 0.00,
  duration integer not null default 0, -- in hours
  difficulty text not null default 'beginner' check (difficulty in ('beginner', 'intermediate', 'advanced')),
  tags text[] default '{}',
  enrollment_count integer not null default 0,
  rating decimal(3,2) default 4.5,
  is_published boolean not null default false,
  is_free boolean not null default false,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Create videos table
create table public.videos (
  id text primary key, -- Using text to match existing videoIds like '1', '2', etc.
  course_id text references public.courses(id) not null,
  title text not null,
  description text not null,
  duration integer not null default 600, -- in seconds
  order_index integer not null,
  video_url text not null,
  thumbnail_url text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Create transcript entries table
create table public.transcript_entries (
  id uuid default uuid_generate_v4() primary key,
  video_id text references public.videos(id) not null,
  start_time integer not null, -- in seconds
  end_time integer not null, -- in seconds
  text text not null,
  created_at timestamp with time zone default now() not null
);

-- Create enrollments table (many-to-many between users and courses)
create table public.enrollments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  course_id text references public.courses(id) not null,
  enrolled_at timestamp with time zone default now() not null,
  unique(user_id, course_id)
);

-- Create course progress table
create table public.course_progress (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  course_id text references public.courses(id) not null,
  videos_completed integer not null default 0,
  total_videos integer not null default 0,
  percent_complete integer not null default 0 check (percent_complete >= 0 and percent_complete <= 100),
  last_accessed_at timestamp with time zone default now() not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  unique(user_id, course_id)
);

-- Create video progress table
create table public.video_progress (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  video_id text references public.videos(id) not null,
  watched_seconds integer not null default 0,
  total_seconds integer not null default 0,
  percent_complete integer not null default 0 check (percent_complete >= 0 and percent_complete <= 100),
  is_completed boolean not null default false,
  last_watched_at timestamp with time zone default now() not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  unique(user_id, video_id)
);

-- Row Level Security
alter table public.courses enable row level security;
alter table public.videos enable row level security;
alter table public.transcript_entries enable row level security;
alter table public.enrollments enable row level security;
alter table public.course_progress enable row level security;
alter table public.video_progress enable row level security;

-- Policies for courses (public read, instructor write)
create policy "Anyone can view published courses" on public.courses
  for select using (is_published = true);

create policy "Instructors can manage own courses" on public.courses
  for all using (auth.uid() = instructor_id);

-- Policies for videos (public read for published course videos)
create policy "Anyone can view videos of published courses" on public.videos
  for select using (
    exists (
      select 1 from public.courses 
      where courses.id = videos.course_id 
      and courses.is_published = true
    )
  );

create policy "Instructors can manage videos of own courses" on public.videos
  for all using (
    exists (
      select 1 from public.courses 
      where courses.id = videos.course_id 
      and courses.instructor_id = auth.uid()
    )
  );

-- Policies for transcript entries
create policy "Anyone can view transcripts of published videos" on public.transcript_entries
  for select using (
    exists (
      select 1 from public.videos v
      join public.courses c on c.id = v.course_id
      where v.id = transcript_entries.video_id 
      and c.is_published = true
    )
  );

-- Policies for enrollments
create policy "Users can view own enrollments" on public.enrollments
  for select using (auth.uid() = user_id);

create policy "Users can enroll in courses" on public.enrollments
  for insert with check (auth.uid() = user_id);

-- Policies for course progress
create policy "Users can view own course progress" on public.course_progress
  for select using (auth.uid() = user_id);

create policy "Users can update own course progress" on public.course_progress
  for all using (auth.uid() = user_id);

-- Policies for video progress
create policy "Users can view own video progress" on public.video_progress
  for select using (auth.uid() = user_id);

create policy "Users can update own video progress" on public.video_progress
  for all using (auth.uid() = user_id);

-- Add updated_at triggers
create trigger update_courses_updated_at
  before update on public.courses
  for each row execute procedure public.update_updated_at_column();

create trigger update_videos_updated_at
  before update on public.videos
  for each row execute procedure public.update_updated_at_column();

create trigger update_course_progress_updated_at
  before update on public.course_progress
  for each row execute procedure public.update_updated_at_column();

create trigger update_video_progress_updated_at
  before update on public.video_progress
  for each row execute procedure public.update_updated_at_column();