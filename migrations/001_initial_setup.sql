-- Migration 001: Initial Setup
-- Date: 2025-08-13
-- Purpose: Set up basic auth and user profiles

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create users table (extends auth.users)
create table public.profiles (
  id uuid references auth.users(id) primary key,
  email text unique not null,
  name text not null,
  avatar text,
  role text not null default 'student' check (role in ('student', 'instructor', 'moderator', 'admin')),
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Create subscriptions table
create table public.subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  plan text not null default 'free' check (plan in ('free', 'basic', 'pro', 'team')),
  status text not null default 'active' check (status in ('active', 'cancelled', 'expired', 'trial')),
  current_period_end timestamp with time zone,
  ai_credits integer not null default 0,
  ai_credits_used integer not null default 0,
  daily_ai_interactions integer not null default 0,
  last_reset_date date default current_date,
  max_courses integer not null default 1,
  features text[] default '{}',
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Create user preferences table
create table public.user_preferences (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) unique not null,
  theme text not null default 'light' check (theme in ('light', 'dark')),
  auto_play boolean not null default true,
  playback_rate decimal(3,2) not null default 1.0,
  volume decimal(3,2) not null default 1.0,
  sidebar_width integer not null default 400,
  show_chat_sidebar boolean not null default true,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Create moderator stats table
create table public.moderator_stats (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) unique not null,
  responses_provided integer not null default 0,
  helpful_votes integer not null default 0,
  endorsed_by_instructor integer not null default 0,
  specialization text[] default '{}',
  trust_score integer not null default 0 check (trust_score >= 0 and trust_score <= 100),
  promoted_at timestamp with time zone,
  promoted_by uuid references public.profiles(id),
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.user_preferences enable row level security;
alter table public.moderator_stats enable row level security;

-- Policies for profiles
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Anyone can view instructor profiles" on public.profiles
  for select using (role = 'instructor');

-- Policies for subscriptions
create policy "Users can view own subscription" on public.subscriptions
  for select using (auth.uid() = user_id);

create policy "Users can update own subscription" on public.subscriptions
  for update using (auth.uid() = user_id);

-- Policies for user preferences
create policy "Users can view own preferences" on public.user_preferences
  for select using (auth.uid() = user_id);

create policy "Users can update own preferences" on public.user_preferences
  for all using (auth.uid() = user_id);

-- Policies for moderator stats
create policy "Users can view own moderator stats" on public.moderator_stats
  for select using (auth.uid() = user_id);

create policy "Anyone can view moderator stats for public display" on public.moderator_stats
  for select using (true);

create policy "Only admins can update moderator stats" on public.moderator_stats
  for update using (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() 
      and profiles.role = 'admin'
    )
  );

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', 'User'));
  
  insert into public.subscriptions (user_id, plan)
  values (new.id, 'free');
  
  insert into public.user_preferences (user_id)
  values (new.id);
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Add updated_at triggers
create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at_column();

create trigger update_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute procedure public.update_updated_at_column();

create trigger update_user_preferences_updated_at
  before update on public.user_preferences
  for each row execute procedure public.update_updated_at_column();

create trigger update_moderator_stats_updated_at
  before update on public.moderator_stats
  for each row execute procedure public.update_updated_at_column();

-- Function to reset daily AI interactions
create or replace function public.reset_daily_ai_interactions()
returns void as $$
begin
  update public.subscriptions 
  set 
    daily_ai_interactions = 0,
    last_reset_date = current_date
  where last_reset_date < current_date;
end;
$$ language plpgsql security definer;