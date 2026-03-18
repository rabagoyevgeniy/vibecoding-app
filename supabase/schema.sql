-- VibeCoding App Database Schema
-- Run this in your Supabase SQL editor

-- Users table (extends Supabase auth.users)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  goal text check (goal in ('money', 'startup', 'ai')),
  created_at timestamptz default now()
);

alter table public.users enable row level security;
create policy "Users can read own data" on public.users for select using (auth.uid() = id);
create policy "Users can update own data" on public.users for update using (auth.uid() = id);

-- Progress table
create table public.progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null unique,
  current_day int default 1 check (current_day between 1 and 7),
  xp int default 0,
  level int default 1
);

alter table public.progress enable row level security;
create policy "Users can read own progress" on public.progress for select using (auth.uid() = user_id);
create policy "Users can update own progress" on public.progress for update using (auth.uid() = user_id);
create policy "Users can insert own progress" on public.progress for insert with check (auth.uid() = user_id);

-- Missions table (static data, readable by all)
create table public.missions (
  id uuid default gen_random_uuid() primary key,
  day int not null unique,
  title text not null,
  description text not null
);

alter table public.missions enable row level security;
create policy "Missions are readable by all" on public.missions for select using (true);

-- Mission steps table
create table public.mission_steps (
  id uuid default gen_random_uuid() primary key,
  mission_id uuid references public.missions(id) on delete cascade not null,
  title text not null,
  description text not null,
  "order" int not null
);

alter table public.mission_steps enable row level security;
create policy "Steps are readable by all" on public.mission_steps for select using (true);

-- User step completions (tracks which steps each user has completed)
create table public.user_step_completions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  step_id uuid references public.mission_steps(id) on delete cascade not null,
  completed_at timestamptz default now(),
  unique(user_id, step_id)
);

alter table public.user_step_completions enable row level security;
create policy "Users can read own completions" on public.user_step_completions for select using (auth.uid() = user_id);
create policy "Users can insert own completions" on public.user_step_completions for insert with check (auth.uid() = user_id);
create policy "Users can delete own completions" on public.user_step_completions for delete using (auth.uid() = user_id);
