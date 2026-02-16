-- ============================================================================
-- Hunt Planner — Supabase Database Schema
-- Run this in the Supabase SQL Editor after creating your project
-- ============================================================================

-- Profiles (auto-created on signup via trigger)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Wizard state (auto-saved as user progresses through consultation)
create table public.wizard_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  state jsonb not null default '{}',
  updated_at timestamptz default now(),
  unique(user_id)
);

-- Generated strategic assessments
create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  input jsonb not null,
  result jsonb not null,
  created_at timestamptz default now()
);

-- User goals
create table public.user_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  species text,
  target_state text,
  target_year int,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.wizard_state enable row level security;
alter table public.assessments enable row level security;
alter table public.user_goals enable row level security;

-- Profiles: read/update own only
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Wizard state: full CRUD on own rows
create policy "Users can CRUD own wizard state"
  on public.wizard_state for all
  using (auth.uid() = user_id);

-- Assessments: full CRUD on own rows
create policy "Users can CRUD own assessments"
  on public.assessments for all
  using (auth.uid() = user_id);

-- Goals: full CRUD on own rows
create policy "Users can CRUD own goals"
  on public.user_goals for all
  using (auth.uid() = user_id);

-- ============================================================================
-- Auto-create profile on signup
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
