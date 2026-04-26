create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  display_name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists pools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists playoff_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  source_pool_id uuid references pools(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists pool_members (
  pool_id uuid not null references pools(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (pool_id, user_id)
);

create table if not exists series (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references pools(id) on delete cascade,
  round text not null,
  lock_at timestamptz not null,
  status text not null default 'open' check (status in ('open', 'locked', 'final')),
  home_team_name text not null,
  home_team_short_name text not null,
  home_team_seed integer not null,
  home_team_conference text not null check (home_team_conference in ('East', 'West')),
  away_team_name text not null,
  away_team_short_name text not null,
  away_team_seed integer not null,
  away_team_conference text not null check (away_team_conference in ('East', 'West')),
  winner_short_name text,
  result_games integer check (result_games between 4 and 7),
  created_at timestamptz not null default now()
);

create table if not exists template_series (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references playoff_templates(id) on delete cascade,
  round text not null,
  lock_at timestamptz not null,
  status text not null default 'open' check (status in ('open', 'locked', 'final')),
  home_team_name text not null,
  home_team_short_name text not null,
  home_team_seed integer not null,
  home_team_conference text not null check (home_team_conference in ('East', 'West')),
  away_team_name text not null,
  away_team_short_name text not null,
  away_team_seed integer not null,
  away_team_conference text not null check (away_team_conference in ('East', 'West')),
  winner_short_name text,
  result_games integer check (result_games between 4 and 7),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists picks (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references pools(id) on delete cascade,
  series_id uuid not null references series(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  winner_short_name text not null,
  games integer not null check (games between 4 and 7),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (series_id, user_id)
);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references pools(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_pool_members_pool_id on pool_members(pool_id);
create index if not exists idx_playoff_templates_created_at on playoff_templates(created_at desc);
create index if not exists idx_series_pool_id on series(pool_id);
create index if not exists idx_template_series_template_id on template_series(template_id, sort_order);
create index if not exists idx_picks_pool_user on picks(pool_id, user_id);
create index if not exists idx_activities_pool_created_at on activities(pool_id, created_at desc);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists picks_set_updated_at on picks;
create trigger picks_set_updated_at
before update on picks
for each row
execute procedure set_updated_at();

alter table users enable row level security;
alter table pools enable row level security;
alter table playoff_templates enable row level security;
alter table pool_members enable row level security;
alter table series enable row level security;
alter table template_series enable row level security;
alter table picks enable row level security;
alter table activities enable row level security;

drop policy if exists "public users access" on users;
drop policy if exists "public pools access" on pools;
drop policy if exists "public playoff_templates access" on playoff_templates;
drop policy if exists "public pool_members access" on pool_members;
drop policy if exists "public series access" on series;
drop policy if exists "public template_series access" on template_series;
drop policy if exists "public picks access" on picks;
drop policy if exists "public activities access" on activities;

drop policy if exists "read users" on users;
create policy "read users" on users
for select
using (true);

drop policy if exists "read pools" on pools;
create policy "read pools" on pools
for select
using (true);

drop policy if exists "read playoff_templates" on playoff_templates;
create policy "read playoff_templates" on playoff_templates
for select
using (true);

drop policy if exists "read pool_members" on pool_members;
create policy "read pool_members" on pool_members
for select
using (true);

drop policy if exists "read series" on series;
create policy "read series" on series
for select
using (true);

drop policy if exists "read template_series" on template_series;
create policy "read template_series" on template_series
for select
using (true);

drop policy if exists "read picks" on picks;
create policy "read picks" on picks
for select
using (true);

drop policy if exists "read activities" on activities;
create policy "read activities" on activities
for select
using (true);
