-- ============================================================================
-- VibeCoding 7D(AI)S — Modern Supabase Schema v2 (2026)
-- File: supabase/schema_v2.sql
-- Purpose: Production-ready schema for migrating from localStorage to Supabase
-- ============================================================================

-- Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ============================================================================
-- 1. USER PROFILES
-- ============================================================================
create table public.user_profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  full_name text,
  preferred_language text default 'en' check (preferred_language in ('en', 'ru')),
  onboarding_data jsonb,                    -- { goal, experience, timePerDay, idea }
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_profiles enable row level security;

create policy "Users can modify their own data"
  on public.user_profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- 2. USER PROGRESS (XP, level, current day, skills)
-- ============================================================================
create table public.user_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  current_day int default 1 check (current_day between 1 and 7),
  xp int default 0,
  level int default 1,
  skills jsonb default '{"sales": 0, "product": 0, "content": 0, "ai": 0}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_progress enable row level security;

create policy "Users can modify their own data"
  on public.user_progress
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- 3. USER STEP RESPONSES (answers to each step)
-- ============================================================================
create table public.user_step_responses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  day int not null check (day between 1 and 7),
  step_index int not null,
  response_text text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, day, step_index)
);

alter table public.user_step_responses enable row level security;

create policy "Users can modify their own data"
  on public.user_step_responses
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- 4. USER STEP COMPLETIONS (including side quests)
-- ============================================================================
create table public.user_step_completions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  day int not null check (day between 1 and 7),
  step_index int,
  step_id text,                              -- for compatibility with legacy data
  is_sidequest boolean default false,
  completed_at timestamptz default now(),
  unique(user_id, day, step_index, is_sidequest)
);

alter table public.user_step_completions enable row level security;

create policy "Users can modify their own data"
  on public.user_step_completions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- 5. USER ARTIFACTS (Day 1-7 synthesized documents)
-- ============================================================================
create table public.user_artifacts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  day int not null check (day between 1 and 7),
  artifact_type text not null,               -- "Business Concept Document", "MVP Blueprint", etc.
  content jsonb not null,                    -- full structured artifact from /api/ai/synthesize
  created_at timestamptz default now(),
  unique(user_id, day)
);

alter table public.user_artifacts enable row level security;

create policy "Users can modify their own data"
  on public.user_artifacts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- 6. USER LEADS (CRM)
-- ============================================================================
create table public.user_leads (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  platform text,
  status text default 'no_reply' check (status in ('no_reply', 'replied', 'interested')),
  type text,
  contact jsonb,                             -- email, phone, telegram, etc.
  notes jsonb,
  day int,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_leads enable row level security;

create policy "Users can modify their own data"
  on public.user_leads
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- 7. VC_PLANS (AI-generated 7-day business plans)
-- IMPORTANT: Structure designed to match src/lib/plan-engine.ts exactly
-- ============================================================================
create table public.vc_plans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  plan_json jsonb not null,                  -- full { suggested_idea, plan_summary, days: [...] }
  niche text,                                -- plan.suggested_idea (used as business niche)
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)                            -- supports upsert onConflict: "user_id"
);

alter table public.vc_plans enable row level security;

create policy "Users can modify their own data"
  on public.vc_plans
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- 8. VC_PLAN_DAYS (individual days from the plan)
-- CRITICAL: Must match the insert/select patterns in plan-engine.ts
-- ============================================================================
create table public.vc_plan_days (
  id uuid default gen_random_uuid() primary key,
  plan_id uuid references public.vc_plans(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  day_number int not null check (day_number between 1 and 7),
  title text not null,
  description text,
  steps jsonb not null,                      -- array of PlanStep objects: [{order, title, description, type, skill, xp}]
  status text default 'locked' check (status in ('active', 'locked', 'completed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(plan_id, day_number)
);

alter table public.vc_plan_days enable row level security;

create policy "Users can modify their own data"
  on public.vc_plan_days
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
create index idx_user_step_responses_user_day on public.user_step_responses(user_id, day);
create index idx_user_step_completions_user_day on public.user_step_completions(user_id, day);
create index idx_user_artifacts_user_day on public.user_artifacts(user_id, day);
create index idx_vc_plan_days_user_day on public.vc_plan_days(user_id, day_number);
create index idx_vc_plans_user_active on public.vc_plans(user_id, is_active);

-- ============================================================================
-- UPDATED_AT TRIGGERS (auto-update timestamps)
-- ============================================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply triggers
create trigger user_profiles_updated_at before update on public.user_profiles for each row execute procedure public.handle_updated_at();
create trigger user_progress_updated_at before update on public.user_progress for each row execute procedure public.handle_updated_at();
create trigger user_step_responses_updated_at before update on public.user_step_responses for each row execute procedure public.handle_updated_at();
create trigger user_artifacts_updated_at before update on public.user_artifacts for each row execute procedure public.handle_updated_at();
create trigger user_leads_updated_at before update on public.user_leads for each row execute procedure public.handle_updated_at();
create trigger vc_plans_updated_at before update on public.vc_plans for each row execute procedure public.handle_updated_at();
create trigger vc_plan_days_updated_at before update on public.vc_plan_days for each row execute procedure public.handle_updated_at();

-- ============================================================================
-- NOTES & COMPATIBILITY
-- ============================================================================
-- 1. `vc_plans` and `vc_plan_days` are intentionally named `vc_*` to match
--    the current queries in src/lib/plan-engine.ts (generateAndSavePlan, getUserPlan, etc.).
--
-- 2. [RESOLVED] Legacy code references "vc_profiles" (plan-engine.ts:getUserProfile,
--    dashboard, profile, auth/callback, onboarding). We provide a compatibility
--    VIEW below that maps the clean `user_profiles` table. No JS changes needed
--    for reads. Writes will be centralized via the new supabase-storage.ts layer.
--
-- 3. The old supabase/schema.sql is preserved for historical reference.
-- ============================================================================

-- ============================================================================
-- 9. LEGACY COMPATIBILITY VIEW: vc_profiles
-- Purpose: Zero-downtime bridge for existing Supabase calls during migration.
-- Allows .from("vc_profiles").select("*").eq("user_id", ...) and similar
-- to succeed against the canonical user_profiles table.
--
-- Column mapping (based on actual usage in plan-engine, dashboard, profile, callback):
--   user_id              -> user_id (for filters + conflict targets)
--   onboarding_answers   <- onboarding_data (jsonb with goal/experience/etc.)
--   onboarding_completed <- derived from presence of onboarding_data
--   full_name, preferred_language, timestamps passed through
-- ============================================================================

CREATE OR REPLACE VIEW public.vc_profiles AS
SELECT
  id,
  user_id,
  full_name,
  preferred_language,
  onboarding_data AS onboarding_answers,
  (onboarding_data IS NOT NULL AND onboarding_data <> '{}'::jsonb) AS onboarding_completed,
  created_at,
  updated_at
FROM public.user_profiles;

-- NOTE: This VIEW is SELECT-only for now.
-- Legacy direct upserts in src/app/onboarding/page.tsx will be replaced
-- by calls to the supabase-storage helpers (see Phase 1 plan below).
-- The RLS policies on user_profiles continue to protect all access.