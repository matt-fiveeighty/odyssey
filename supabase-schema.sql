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

-- ============================================================================
-- Subscriptions & Entitlements (Stage 2)
-- ============================================================================

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan_id text not null default 'free',
  status text not null default 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);

create table public.feature_flags (
  plan_id text primary key,
  features jsonb not null default '{}'::jsonb
);

-- ============================================================================
-- Audit Log
-- ============================================================================

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text,
  resource_id uuid,
  metadata jsonb default '{}'::jsonb,
  ip_address inet,
  created_at timestamptz default now()
);

-- ============================================================================
-- Data Export Requests (CPRA compliance)
-- ============================================================================

create table public.data_export_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  status text not null default 'pending',
  export_url text,
  requested_at timestamptz default now(),
  completed_at timestamptz,
  expires_at timestamptz
);

-- ============================================================================
-- Account Deletion Requests (CPRA/PIPEDA compliance)
-- ============================================================================

create table public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  status text not null default 'pending',
  reason text,
  requested_at timestamptz default now(),
  confirm_by timestamptz,
  delete_by timestamptz,
  completed_at timestamptz
);

-- ============================================================================
-- RLS for new tables
-- ============================================================================

alter table public.subscriptions enable row level security;
alter table public.feature_flags enable row level security;
alter table public.audit_log enable row level security;
alter table public.data_export_requests enable row level security;
alter table public.deletion_requests enable row level security;

create policy "Users can view own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create policy "Feature flags are public"
  on public.feature_flags for select
  using (true);

create policy "Users can view own audit events"
  on public.audit_log for select
  using (auth.uid() = user_id);

create policy "Users can manage own export requests"
  on public.data_export_requests for all
  using (auth.uid() = user_id);

create policy "Users can manage own deletion requests"
  on public.deletion_requests for all
  using (auth.uid() = user_id);

-- ============================================================================
-- Default feature flags
-- ============================================================================

insert into public.feature_flags (plan_id, features) values
  ('free', '{"state_overview": true, "top_3_states": true, "basic_budget": true, "species_explorer": true, "full_draw_odds": false, "unlimited_reruns": false, "export": false, "priority_support": false}'::jsonb),
  ('pro', '{"state_overview": true, "top_3_states": true, "basic_budget": true, "species_explorer": true, "full_draw_odds": true, "unlimited_reruns": true, "export": false, "priority_support": false, "goal_tracking": true, "deadline_reminders": true}'::jsonb),
  ('elite', '{"state_overview": true, "top_3_states": true, "basic_budget": true, "species_explorer": true, "full_draw_odds": true, "unlimited_reruns": true, "export": true, "priority_support": true, "goal_tracking": true, "deadline_reminders": true, "advanced_analytics": true, "multi_year_comparison": true}'::jsonb);

-- ============================================================================
-- Auto-create subscription on signup
-- ============================================================================

create or replace function public.handle_new_user_subscription()
returns trigger as $$
begin
  insert into public.subscriptions (user_id, plan_id, status)
  values (new.id, 'free', 'active');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created_subscription
  after insert on auth.users
  for each row execute function public.handle_new_user_subscription();

-- ============================================================================
-- Phase 1: Reference Data — States, Species, Units, Draw History
-- ============================================================================

-- Reference: states (mirrors TypeScript State type, adds provenance)
create table public.ref_states (
  id text primary key,
  name text not null,
  abbreviation text not null,
  point_system text not null,
  point_system_details jsonb not null default '{}',
  fg_url text,
  buy_points_url text,
  application_deadlines jsonb not null default '{}',
  license_fees jsonb not null default '{}',
  fee_schedule jsonb not null default '[]',
  application_approach text,
  application_approach_description text,
  application_tips jsonb not null default '[]',
  available_species text[] not null default '{}',
  draw_result_dates jsonb default '{}',
  point_cost jsonb not null default '{}',
  color text,
  logistics jsonb,
  point_only_application jsonb,
  season_tiers jsonb,
  state_personality text,
  source_url text,
  source_pulled_at timestamptz,
  updated_at timestamptz default now()
);

-- Reference: species
create table public.ref_species (
  id text primary key,
  name text not null,
  icon text,
  image_url text,
  gradient text,
  description text,
  updated_at timestamptz default now()
);

-- Reference: hunting units
create table public.ref_units (
  id uuid primary key default gen_random_uuid(),
  state_id text not null references public.ref_states(id),
  species_id text not null references public.ref_species(id),
  unit_code text not null,
  unit_name text,
  success_rate numeric(5,3),
  trophy_rating smallint check (trophy_rating between 1 and 10),
  points_required_resident int default 0,
  points_required_nonresident int default 0,
  terrain_type text[] default '{}',
  pressure_level text check (pressure_level in ('Low', 'Moderate', 'High')),
  elevation_range int[] default '{}',
  public_land_pct numeric(5,3),
  tag_quota_nonresident int,
  season_dates jsonb,
  notes text,
  tactical_notes jsonb,
  nearest_airport text,
  drive_time_from_airport text,
  source_url text,
  source_pulled_at timestamptz,
  updated_at timestamptz default now(),
  unique(state_id, species_id, unit_code)
);

-- Historical draw data per unit per year
create table public.ref_unit_draw_history (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.ref_units(id) on delete cascade,
  year smallint not null,
  applicants int,
  tags_available int,
  tags_issued int,
  odds_percent numeric(6,2),
  resident_applicants int,
  nonresident_applicants int,
  min_points_drawn int,
  source_url text,
  source_pulled_at timestamptz,
  unique(unit_id, year)
);

-- Unit tags (computed/admin-authored for filtering)
create table public.ref_unit_tags (
  unit_id uuid references public.ref_units(id) on delete cascade,
  tag text not null,
  confidence numeric(4,2) default 1.00,
  primary key (unit_id, tag)
);

-- Unit change notes
create table public.ref_unit_notes (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid references public.ref_units(id) on delete cascade,
  note_type text not null,
  title text not null,
  body text not null,
  effective_year smallint,
  created_at timestamptz default now()
);

-- Admin-adjustable scoring weights
create table public.scoring_weights (
  id text primary key default 'default',
  weights jsonb not null default '{
    "harvest_trend": 25,
    "tag_availability": 20,
    "hunter_pressure": 20,
    "season_timing": 15,
    "success_rate": 10,
    "public_land": 10
  }'::jsonb,
  updated_at timestamptz default now()
);

-- Data import log (tracks all imports)
create table public.data_import_log (
  id uuid primary key default gen_random_uuid(),
  import_type text not null,
  state_id text,
  rows_imported int default 0,
  rows_skipped int default 0,
  errors jsonb default '[]',
  imported_by uuid references auth.users(id),
  source_file text,
  source_url text,
  created_at timestamptz default now()
);

-- RLS for reference tables (public read)
alter table public.ref_states enable row level security;
alter table public.ref_species enable row level security;
alter table public.ref_units enable row level security;
alter table public.ref_unit_draw_history enable row level security;
alter table public.ref_unit_tags enable row level security;
alter table public.ref_unit_notes enable row level security;
alter table public.scoring_weights enable row level security;
alter table public.data_import_log enable row level security;

create policy "Reference states are public" on public.ref_states for select using (true);
create policy "Reference species are public" on public.ref_species for select using (true);
create policy "Reference units are public" on public.ref_units for select using (true);
create policy "Draw history is public" on public.ref_unit_draw_history for select using (true);
create policy "Unit tags are public" on public.ref_unit_tags for select using (true);
create policy "Unit notes are public" on public.ref_unit_notes for select using (true);
create policy "Scoring weights are public" on public.scoring_weights for select using (true);

-- Seed default scoring weights
insert into public.scoring_weights (id, weights) values ('default', '{
  "harvest_trend": 25,
  "tag_availability": 20,
  "hunter_pressure": 20,
  "season_timing": 15,
  "success_rate": 10,
  "public_land": 10
}'::jsonb);

-- ============================================================================
-- Phase 2: User Points (server-side) + Saved Searches
-- ============================================================================

create table public.user_points (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  state_id text not null,
  species_id text not null,
  points int not null default 0,
  point_type text not null default 'preference',
  year_started smallint,
  updated_at timestamptz default now(),
  unique(user_id, state_id, species_id, point_type)
);

create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  search_type text not null default 'highest_odds',
  params jsonb not null,
  results_snapshot jsonb,
  created_at timestamptz default now()
);

alter table public.user_points enable row level security;
alter table public.saved_searches enable row level security;

create policy "Users can CRUD own points" on public.user_points for all using (auth.uid() = user_id);
create policy "Users can CRUD own searches" on public.saved_searches for all using (auth.uid() = user_id);

-- ============================================================================
-- Phase 4: Year Plans, Budget, Savings Goals
-- ============================================================================

create table public.year_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  year smallint not null,
  status text not null default 'draft',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, year)
);

create table public.year_plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references public.year_plans(id) on delete cascade not null,
  item_type text not null,
  title text not null,
  description text,
  state_id text,
  species_id text,
  unit_id uuid references public.ref_units(id),
  month smallint check (month between 1 and 12),
  start_date date,
  end_date date,
  estimated_cost numeric(10,2),
  cost_breakdown jsonb default '[]',
  completed boolean default false,
  completed_at timestamptz,
  sort_order int default 0,
  created_at timestamptz default now()
);

create table public.budget_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  year smallint not null,
  total_budget numeric(10,2),
  categories jsonb not null default '{}',
  actual_spend jsonb default '{}',
  notes text,
  unique(user_id, year)
);

create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  target_cost numeric(10,2) not null,
  target_date date,
  monthly_savings numeric(10,2),
  current_saved numeric(10,2) default 0,
  state_id text,
  species_id text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.year_plans enable row level security;
alter table public.year_plan_items enable row level security;
alter table public.budget_plans enable row level security;
alter table public.savings_goals enable row level security;

create policy "Users can CRUD own year plans" on public.year_plans for all using (auth.uid() = user_id);
create policy "Users can CRUD own plan items" on public.year_plan_items for all
  using (plan_id in (select id from public.year_plans where user_id = auth.uid()));
create policy "Users can CRUD own budgets" on public.budget_plans for all using (auth.uid() = user_id);
create policy "Users can CRUD own savings goals" on public.savings_goals for all using (auth.uid() = user_id);

-- ============================================================================
-- Phase 6: LLM Cache + Usage Tracking
-- ============================================================================

create table public.llm_cache (
  id uuid primary key default gen_random_uuid(),
  cache_key text not null unique,
  prompt_type text not null,
  input_params jsonb not null,
  output text not null,
  model text not null,
  tokens_used int,
  created_at timestamptz default now(),
  expires_at timestamptz
);

create table public.llm_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  prompt_type text not null,
  tokens_used int,
  created_at timestamptz default now()
);

alter table public.llm_cache enable row level security;
alter table public.llm_usage enable row level security;

create policy "LLM cache is public read" on public.llm_cache for select using (true);
create policy "Users can view own LLM usage" on public.llm_usage for select using (auth.uid() = user_id);

-- ============================================================================
-- Phase 7: Collaboration — Plan Shares, Comments, Groups
-- ============================================================================

create table public.plan_shares (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references public.year_plans(id) on delete cascade not null,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  shared_with_id uuid references public.profiles(id) on delete cascade,
  shared_with_email text,
  role text not null default 'viewer',
  invite_token text unique,
  accepted_at timestamptz,
  created_at timestamptz default now()
);

create table public.plan_comments (
  id uuid primary key default gen_random_uuid(),
  plan_item_id uuid references public.year_plan_items(id) on delete cascade not null,
  author_id uuid references public.profiles(id) on delete cascade not null,
  body text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.plan_swap_proposals (
  id uuid primary key default gen_random_uuid(),
  plan_item_id uuid references public.year_plan_items(id) on delete cascade not null,
  proposed_by uuid references public.profiles(id) on delete cascade not null,
  proposal_type text not null,
  proposal_data jsonb not null,
  status text not null default 'pending',
  created_at timestamptz default now()
);

create table public.group_applications (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references public.profiles(id) on delete cascade not null,
  state_id text not null,
  species_id text not null,
  unit_id uuid references public.ref_units(id),
  year smallint not null,
  status text not null default 'forming',
  notes text,
  created_at timestamptz default now()
);

create table public.group_application_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.group_applications(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade,
  invite_email text,
  role text not null default 'member',
  points int default 0,
  status text not null default 'invited',
  created_at timestamptz default now()
);

alter table public.plan_shares enable row level security;
alter table public.plan_comments enable row level security;
alter table public.plan_swap_proposals enable row level security;
alter table public.group_applications enable row level security;
alter table public.group_application_members enable row level security;

create policy "Users can view shares they're part of" on public.plan_shares for select
  using (auth.uid() = owner_id or auth.uid() = shared_with_id);
create policy "Owners can manage shares" on public.plan_shares for all
  using (auth.uid() = owner_id);

create policy "Comment participants can view" on public.plan_comments for select
  using (auth.uid() = author_id);
create policy "Users can CRUD own comments" on public.plan_comments for all
  using (auth.uid() = author_id);

create policy "Swap proposal authors" on public.plan_swap_proposals for all
  using (auth.uid() = proposed_by);

create policy "Group creators can manage" on public.group_applications for all
  using (auth.uid() = creator_id);
create policy "Group members can view" on public.group_applications for select
  using (
    creator_id = auth.uid() or
    id in (select group_id from public.group_application_members where user_id = auth.uid())
  );

create policy "Group membership visible to members" on public.group_application_members for select
  using (
    user_id = auth.uid() or
    group_id in (select id from public.group_applications where creator_id = auth.uid())
  );
create policy "Group creators manage members" on public.group_application_members for all
  using (
    group_id in (select id from public.group_applications where creator_id = auth.uid())
  );

-- ============================================================================
-- Updated feature flags with all new features
-- ============================================================================

-- Drop and re-insert with full feature set
delete from public.feature_flags;

insert into public.feature_flags (plan_id, features) values
  ('free', '{
    "state_overview": true, "top_3_states": true, "basic_budget": true, "species_explorer": true,
    "full_draw_odds": false, "unlimited_reruns": false, "export": false, "priority_support": false,
    "goal_tracking": false, "deadline_reminders": false, "advanced_analytics": false, "multi_year_comparison": false,
    "unit_database": true, "draw_history": false, "unit_scoring": false, "unit_export": false,
    "odds_finder": true, "point_unlock_preview": true,
    "goal_suggestions": false,
    "planner": true, "auto_fill": false, "opportunity_finder": false,
    "budget_planner": true, "savings_goals": false,
    "journey_map": true, "llm_narratives": false,
    "collaboration": false, "group_applications": false
  }'::jsonb),
  ('pro', '{
    "state_overview": true, "top_3_states": true, "basic_budget": true, "species_explorer": true,
    "full_draw_odds": true, "unlimited_reruns": true, "export": false, "priority_support": false,
    "goal_tracking": true, "deadline_reminders": true, "advanced_analytics": false, "multi_year_comparison": false,
    "unit_database": true, "draw_history": true, "unit_scoring": true, "unit_export": false,
    "odds_finder": true, "point_unlock_preview": true,
    "goal_suggestions": true,
    "planner": true, "auto_fill": true, "opportunity_finder": false,
    "budget_planner": true, "savings_goals": true,
    "journey_map": true, "llm_narratives": true,
    "collaboration": true, "group_applications": false
  }'::jsonb),
  ('elite', '{
    "state_overview": true, "top_3_states": true, "basic_budget": true, "species_explorer": true,
    "full_draw_odds": true, "unlimited_reruns": true, "export": true, "priority_support": true,
    "goal_tracking": true, "deadline_reminders": true, "advanced_analytics": true, "multi_year_comparison": true,
    "unit_database": true, "draw_history": true, "unit_scoring": true, "unit_export": true,
    "odds_finder": true, "point_unlock_preview": true,
    "goal_suggestions": true,
    "planner": true, "auto_fill": true, "opportunity_finder": true,
    "budget_planner": true, "savings_goals": true,
    "journey_map": true, "llm_narratives": true,
    "collaboration": true, "group_applications": true
  }'::jsonb);
