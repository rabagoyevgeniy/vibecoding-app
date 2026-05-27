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
-- 3. The previous `supabase/schema.sql` (legacy "users"/"progress"/"missions"
--    tables) was DELETED as part of the C3 audit fix — schema_v2.sql is the
--    single source of truth from 2026 onward.
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

-- ============================================================================
-- 10. NEXUS SESSIONS (AI Agent State Persistence)
-- Purpose: Persist generated plans and actions across page refreshes.
-- Allows NexusEngine to survive F5 / navigation while keeping in-memory speed.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.vc_nexus_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  day int NOT NULL CHECK (day BETWEEN 1 AND 7),
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'failed')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, day)
);

ALTER TABLE public.vc_nexus_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own Nexus sessions"
  ON public.vc_nexus_sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Reuse existing updated_at trigger function
CREATE TRIGGER vc_nexus_sessions_updated_at 
  BEFORE UPDATE ON public.vc_nexus_sessions 
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE INDEX idx_vc_nexus_sessions_user_day ON public.vc_nexus_sessions(user_id, day);

-- ============================================================================
-- 11. SMART_QUESTS (Interactive AI-driven quests — Day-by-day execution)
-- Purpose: replaces the static `mission_steps` text with dynamic, branching
-- quests where the AI either executes a task itself (ai_auto), asks the user
-- for a real input like an API key (user_action), or analyses a screenshot
-- when the user is stuck (ai_vision_help).
--
-- Источник истины для UI: src/components/quests/SmartQuestCard.tsx
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.smart_quests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  day int NOT NULL CHECK (day BETWEEN 1 AND 7),
  -- Порядок отображения внутри дня; используется фронтом для сортировки.
  order_index int NOT NULL DEFAULT 0,
  execution_type text NOT NULL
    CHECK (execution_type IN ('ai_auto', 'user_action', 'ai_vision_help')),
  title text NOT NULL,
  description text NOT NULL,
  -- Поля под `user_action`: подпись и плейсхолдер для поля ввода CEO.
  input_label text,
  input_placeholder text,
  -- Опциональные строки лога для красивой терминальной анимации `ai_auto`.
  ai_log_lines jsonb,
  -- Жизненный цикл квеста — синхронизирован с SmartQuestStatus в TS.
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  -- Для `user_action`: сообщение от verifyQuest (или сохранённый ввод).
  -- Для `ai_vision_help`: текст AI-анализа от analyzeScreenshot.
  result text,
  -- Supabase project id пользователя — нужен AI Vision для deep-link'ов
  -- в нужный раздел supabase.com/dashboard/project/<project_id>/...
  project_id text,
  xp_reward int NOT NULL DEFAULT 50 CHECK (xp_reward >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Каждый квест уникален в пределах (user, day, order_index) — это позволяет
  -- безопасно делать upsert при пересборке плана и предотвращает дубли.
  UNIQUE (user_id, day, order_index)
);

ALTER TABLE public.smart_quests ENABLE ROW LEVEL SECURITY;

-- Гранулярные политики (по образцу user_progress) — единая FOR ALL политика
-- иногда конфликтует с PostgREST upsert на INSERT новых строк.
CREATE POLICY "smart_quests_select_own"
  ON public.smart_quests
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "smart_quests_insert_own"
  ON public.smart_quests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "smart_quests_update_own"
  ON public.smart_quests
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "smart_quests_delete_own"
  ON public.smart_quests
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER smart_quests_updated_at
  BEFORE UPDATE ON public.smart_quests
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_smart_quests_user_day
  ON public.smart_quests(user_id, day);

CREATE INDEX IF NOT EXISTS idx_smart_quests_user_status
  ON public.smart_quests(user_id, status);

-- ============================================================================
-- RLS HARDENING MIGRATION (for user_progress upsert issues)
-- Run this in Supabase SQL Editor if you still see saveUserProgress errors after deploy.
-- The original single "FOR ALL" policy can be flaky with PostgREST upserts + new rows.
-- Granular policies (select / insert / update) are the recommended pattern.
-- ============================================================================

-- 1. Drop the broad policy if it exists (safe if not)
DROP POLICY IF EXISTS "Users can modify their own data" ON public.user_progress;

-- 2. Create explicit policies (allows authenticated user to fully manage ONLY their row)
CREATE POLICY "user_progress_select_own"
  ON public.user_progress
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_progress_insert_own"
  ON public.user_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_progress_update_own"
  ON public.user_progress
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- (Optional but recommended) Same hardening for other progress-related tables:
-- DROP POLICY IF EXISTS "Users can modify their own data" ON public.user_step_responses;
-- ... (repeat pattern for user_step_responses, user_artifacts, user_leads, vc_plans etc. if needed)

-- After running, new users doing syncLocalStorageToSupabase or incrementXp will succeed.
