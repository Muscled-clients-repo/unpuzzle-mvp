-- Create media_file_history table for tracking file operations
-- This table records all operations performed on media files

create table public.media_file_history (
  id uuid default gen_random_uuid() primary key,
  
  -- Reference to the media file
  media_file_id uuid not null references public.media_files(id) on delete cascade,
  
  -- Action details
  action text not null check (action in ('uploaded', 'deleted', 'renamed', 'updated', 'downloaded')),
  description text not null,
  
  -- User information
  performed_by uuid not null references auth.users(id) on delete cascade,
  
  -- Additional metadata
  metadata jsonb null, -- Store additional context like old/new names, file sizes, etc.
  
  -- Timestamps
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for performance
create index idx_media_file_history_media_file_id on public.media_file_history(media_file_id);
create index idx_media_file_history_action on public.media_file_history(action);
create index idx_media_file_history_performed_by on public.media_file_history(performed_by);
create index idx_media_file_history_created_at on public.media_file_history(created_at);

-- Enable RLS
alter table public.media_file_history enable row level security;

-- Create RLS policies
-- Users can only see history for their own media files
create policy "Users can view history for own media files" on public.media_file_history
  for select using (
    exists (
      select 1 from public.media_files 
      where id = media_file_history.media_file_id 
      and uploaded_by = auth.uid()
    )
  );

-- Users can insert history for their own media files
create policy "Users can insert history for own media files" on public.media_file_history
  for insert with check (
    performed_by = auth.uid() and
    exists (
      select 1 from public.media_files 
      where id = media_file_history.media_file_id 
      and uploaded_by = auth.uid()
    )
  );

-- Grant permissions
grant usage on schema public to anon, authenticated;
grant all on public.media_file_history to authenticated;

-- Function to add history entry
create or replace function add_media_file_history(
  p_media_file_id uuid,
  p_action text,
  p_description text,
  p_metadata jsonb default null
) returns uuid as $$
declare
  history_id uuid;
begin
  insert into public.media_file_history (
    media_file_id,
    action,
    description,
    performed_by,
    metadata
  ) values (
    p_media_file_id,
    p_action,
    p_description,
    auth.uid(),
    p_metadata
  ) returning id into history_id;
  
  return history_id;
end;
$$ language plpgsql security definer;

-- Grant execute permission on the function
grant execute on function add_media_file_history(uuid, text, text, jsonb) to authenticated;