-- Run this once in Supabase Dashboard > SQL Editor > New query.
-- Each person's workout data is private and can only be accessed by their login.

create table if not exists public.exercise_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  completed boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.exercise_days enable row level security;
revoke all on public.exercise_days from anon;
grant select, insert, update, delete on public.exercise_days to authenticated;

create policy "exercise: read own" on public.exercise_days
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "exercise: insert own" on public.exercise_days
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "exercise: update own" on public.exercise_days
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "exercise: delete own" on public.exercise_days
  for delete to authenticated using ((select auth.uid()) = user_id);

create table if not exists public.exercise_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  accent text not null default '#719e88' check (accent ~ '^#[0-9a-fA-F]{6}$'),
  theme text not null default 'auto' check (theme in ('light','dark','auto'))
);

alter table public.exercise_preferences enable row level security;
revoke all on public.exercise_preferences from anon;
grant select, insert, update on public.exercise_preferences to authenticated;

create policy "preferences: read own" on public.exercise_preferences
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "preferences: insert own" on public.exercise_preferences
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "preferences: update own" on public.exercise_preferences
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
