-- Orbit Todo initial database schema.
-- Run this in the Supabase SQL Editor or with the Supabase CLI.
-- This reset version deletes existing task data before recreating the schema.

-- Remove an earlier auth trigger if it exists. Auth users are enough for now;
-- task ownership is handled directly with tasks.user_id.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

create extension if not exists pgcrypto;

drop table if exists public.tasks;
drop type if exists public.task_status;
drop type if exists public.task_priority;

create type public.task_status as enum ('pending', 'completed');
create type public.task_priority as enum ('low', 'medium', 'high');

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  status public.task_status not null default 'pending',
  priority public.task_priority,
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_title_not_blank check (length(trim(title)) > 0),
  constraint tasks_description_not_blank check (
    description is null or length(trim(description)) > 0
  ),
  constraint tasks_completed_at_matches_status check (
    (status = 'completed' and completed_at is not null)
    or (status = 'pending' and completed_at is null)
  )
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
before update on public.tasks
for each row
execute function public.set_updated_at();

alter table public.tasks enable row level security;

drop policy if exists "Users can read own tasks" on public.tasks;
create policy "Users can read own tasks"
on public.tasks
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create own tasks" on public.tasks;
create policy "Users can create own tasks"
on public.tasks
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own tasks" on public.tasks;
create policy "Users can update own tasks"
on public.tasks
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own tasks" on public.tasks;
create policy "Users can delete own tasks"
on public.tasks
for delete
to authenticated
using (auth.uid() = user_id);

create index if not exists tasks_user_id_idx on public.tasks(user_id);
create index if not exists tasks_user_status_idx on public.tasks(user_id, status);
create index if not exists tasks_user_priority_idx on public.tasks(user_id, priority);
create index if not exists tasks_user_due_date_idx on public.tasks(user_id, due_date);
create index if not exists tasks_user_created_at_idx on public.tasks(user_id, created_at desc);
