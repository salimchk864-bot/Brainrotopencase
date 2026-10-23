
create table if not exists public.game_profiles (
  telegram_id text primary key,
  username text,
  balance bigint not null default 67000,
  cases_opened integer not null default 0,
  upgrades_done integer not null default 0,
  inventory jsonb not null default '[]'::jsonb,
  daily_reward_date date,
  tasks jsonb not null default '[]'::jsonb,
  season_progress jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.game_profiles enable row level security;

revoke all on public.game_profiles from anon, authenticated;
