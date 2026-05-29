-- ============================================================================
-- Migration: align public.smart_quests with schema_v2
-- ----------------------------------------------------------------------------
-- Context: the production `smart_quests` table was created from an early schema
-- and is missing the `day`-based columns. As a result every Nexus plan persist
-- failed with: `column smart_quests.day does not exist`, the API silently fell
-- back to a mock plan, and no Smart Quests were ever saved.
--
-- This migration is IDEMPOTENT and NON-DESTRUCTIVE — safe to run multiple times.
-- Run it in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
-- ============================================================================

-- 1. Add the missing columns ------------------------------------------------
alter table public.smart_quests
  add column if not exists day               int,
  add column if not exists order_index       int not null default 0,
  add column if not exists input_label       text,
  add column if not exists input_placeholder text,
  add column if not exists ai_log_lines      jsonb,
  add column if not exists result            text,
  add column if not exists project_id        text,
  add column if not exists updated_at        timestamptz not null default now();

-- 2. Backfill `day` for any pre-existing rows, then enforce NOT NULL ---------
update public.smart_quests set day = 1 where day is null;
alter table public.smart_quests alter column day set not null;

-- 3. Constraints (Postgres has no ADD CONSTRAINT IF NOT EXISTS) --------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'smart_quests_day_check') then
    alter table public.smart_quests
      add constraint smart_quests_day_check check (day between 1 and 7);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'smart_quests_user_day_order_key') then
    alter table public.smart_quests
      add constraint smart_quests_user_day_order_key unique (user_id, day, order_index);
  end if;
end $$;

-- 4. updated_at trigger (drop + create for idempotency) ---------------------
drop trigger if exists smart_quests_updated_at on public.smart_quests;
create trigger smart_quests_updated_at
  before update on public.smart_quests
  for each row execute procedure public.handle_updated_at();

-- 5. Indexes ----------------------------------------------------------------
create index if not exists idx_smart_quests_user_day
  on public.smart_quests(user_id, day);
create index if not exists idx_smart_quests_user_status
  on public.smart_quests(user_id, status);

-- 6. RLS + granular owner policies (idempotent) -----------------------------
alter table public.smart_quests enable row level security;

drop policy if exists "smart_quests_select_own" on public.smart_quests;
create policy "smart_quests_select_own"
  on public.smart_quests for select
  using (auth.uid() = user_id);

drop policy if exists "smart_quests_insert_own" on public.smart_quests;
create policy "smart_quests_insert_own"
  on public.smart_quests for insert
  with check (auth.uid() = user_id);

drop policy if exists "smart_quests_update_own" on public.smart_quests;
create policy "smart_quests_update_own"
  on public.smart_quests for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "smart_quests_delete_own" on public.smart_quests;
create policy "smart_quests_delete_own"
  on public.smart_quests for delete
  using (auth.uid() = user_id);
