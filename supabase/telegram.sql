-- Run this file in Supabase Dashboard -> SQL Editor.
-- The existing public.entries table is reused for website and Telegram records.

create table if not exists public.telegram_link_codes (
  code text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists telegram_link_codes_user_id_idx
  on public.telegram_link_codes(user_id);

alter table public.telegram_link_codes enable row level security;

drop policy if exists "Users can create their own Telegram link codes" on public.telegram_link_codes;
create policy "Users can create their own Telegram link codes"
  on public.telegram_link_codes for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can read their own Telegram link codes" on public.telegram_link_codes;
create policy "Users can read their own Telegram link codes"
  on public.telegram_link_codes for select to authenticated
  using (auth.uid() = user_id);

create table if not exists public.telegram_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  chat_id text not null unique,
  timezone text not null default 'Europe/Moscow',
  reminder_time text not null default '20:00'
    check (reminder_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  reminders_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.telegram_users enable row level security;
-- No client policies: only the server-side service-role key accesses this table.

create table if not exists public.telegram_reminder_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  reminder_date date not null,
  sent_at timestamptz not null default now(),
  unique (user_id, reminder_date)
);

alter table public.telegram_reminder_log enable row level security;
-- No client policies: only the server-side service-role key accesses this table.

-- The frontend can create expiring codes; server-side bot code consumes them.
-- Keep the service-role key private. Never put it in VITE_* variables.
