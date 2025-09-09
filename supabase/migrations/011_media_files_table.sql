-- Create media_files table for centralized media management
-- This table stores all uploaded media files with metadata and usage tracking

create table public.media_files (
  id uuid default gen_random_uuid() primary key,
  
  -- File metadata
  name text not null,
  original_name text not null,
  file_type text not null, -- 'video', 'image', 'audio', 'document'
  mime_type text not null,
  file_size bigint not null, -- in bytes
  duration_seconds numeric null, -- for video/audio files
  
  -- Storage information
  backblaze_file_id text null,
  backblaze_url text null,
  cdn_url text null,
  thumbnail_url text null,
  
  -- File organization
  category text default 'uncategorized',
  tags text[] default array[]::text[],
  description text null,
  
  -- Usage tracking
  usage_count integer default 0,
  last_used_at timestamp with time zone null,
  
  -- Relationships
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  
  -- Status and metadata
  status text default 'active' check (status in ('active', 'archived', 'deleted')),
  is_public boolean default false,
  
  -- Timestamps
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for performance
create index idx_media_files_uploaded_by on public.media_files(uploaded_by);
create index idx_media_files_file_type on public.media_files(file_type);
create index idx_media_files_status on public.media_files(status);
create index idx_media_files_created_at on public.media_files(created_at);
create index idx_media_files_category on public.media_files(category);
create index idx_media_files_tags on public.media_files using gin(tags);

-- Enable RLS
alter table public.media_files enable row level security;

-- Create RLS policies
-- Users can only see their own media files (instructors see their uploads)
create policy "Users can view own media files" on public.media_files
  for select using (uploaded_by = auth.uid());

-- Users can insert their own media files
create policy "Users can insert own media files" on public.media_files
  for insert with check (uploaded_by = auth.uid());

-- Users can update their own media files
create policy "Users can update own media files" on public.media_files
  for update using (uploaded_by = auth.uid());

-- Users can delete their own media files (soft delete by changing status)
create policy "Users can delete own media files" on public.media_files
  for delete using (uploaded_by = auth.uid());

-- Create trigger for updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger update_media_files_updated_at 
  before update on public.media_files 
  for each row execute function update_updated_at_column();

-- Create function to increment usage count
create or replace function increment_media_usage(media_id uuid)
returns void as $$
begin
  update public.media_files 
  set 
    usage_count = usage_count + 1,
    last_used_at = timezone('utc'::text, now())
  where id = media_id and uploaded_by = auth.uid();
end;
$$ language plpgsql security definer;

-- Grant permissions
grant usage on schema public to anon, authenticated;
grant all on public.media_files to authenticated;
grant execute on function increment_media_usage(uuid) to authenticated;