-- Guppy Tracker: traits, breeding groups and spawns.
-- A spawn is tracked as one batch by count. Picked fry become fish rows that point back at the spawn,
-- and everything else that happens to the batch is a dated row in spawn_events.

-- Traits -------------------------------------------------------------------
-- Defined once per account. Breeding groups target them now; trait records on fish come later.

create table public.traits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  created_at timestamptz not null default now()
);

create unique index traits_user_name on public.traits (user_id, lower(name));

-- Breeding groups ------------------------------------------------------------

create table public.breeding_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  seq integer not null,
  group_code text not null,
  name text,
  tank_id uuid references public.tanks (id) on delete set null,
  started_on date not null default current_date,
  ended_on date,
  goal text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, group_code),
  check (ended_on is null or ended_on >= started_on)
);

create table public.breeding_group_members (
  group_id uuid not null references public.breeding_groups (id) on delete cascade,
  fish_id uuid not null references public.fish (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  primary key (group_id, fish_id)
);

create table public.breeding_group_traits (
  group_id uuid not null references public.breeding_groups (id) on delete cascade,
  trait_id uuid not null references public.traits (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  primary key (group_id, trait_id)
);

-- Spawns ---------------------------------------------------------------------

create table public.spawns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  seq integer not null,
  spawn_code text not null,
  group_id uuid references public.breeding_groups (id) on delete set null,
  sire_id uuid references public.fish (id) on delete set null,
  dam_id uuid references public.fish (id) on delete set null,
  born_on date not null default current_date,
  fry_count integer not null check (fry_count >= 0),
  tank_id uuid references public.tanks (id) on delete set null,
  strain text,
  generation text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, spawn_code)
);

-- The batch log. Which columns are used depends on kind:
--   move:   count, to_tank_id
--   loss:   count, reason
--   sexing: males, females, unknown
--   cull:   count, reason, for_sale, sold_on
create table public.spawn_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  spawn_id uuid not null references public.spawns (id) on delete cascade,
  kind text not null check (kind in ('move', 'loss', 'sexing', 'cull')),
  happened_on date not null default current_date,
  count integer check (count >= 0),
  to_tank_id uuid references public.tanks (id) on delete set null,
  males integer check (males >= 0),
  females integer check (females >= 0),
  unknown integer check (unknown >= 0),
  reason text,
  for_sale boolean not null default false,
  sold_on date,
  notes text,
  created_at timestamptz not null default now(),
  check (kind = 'sexing' or count is not null),
  check (kind <> 'move' or to_tank_id is not null)
);

-- Picked fry are fish that remember the spawn they came from and why they were picked.
alter table public.fish
  add column spawn_id uuid references public.spawns (id) on delete set null,
  add column pick_reason text;

-- Indexes, including every foreign key ----------------------------------------

create index on public.breeding_groups (user_id);
create index on public.breeding_groups (tank_id);
create index on public.breeding_group_members (fish_id);
create index on public.breeding_group_members (user_id);
create index on public.breeding_group_traits (trait_id);
create index on public.breeding_group_traits (user_id);
create index on public.spawns (user_id);
create index on public.spawns (group_id);
create index on public.spawns (sire_id);
create index on public.spawns (dam_id);
create index on public.spawns (tank_id);
create index on public.spawn_events (spawn_id, happened_on);
create index on public.spawn_events (to_tank_id);
create index on public.spawn_events (user_id);
create index on public.fish (spawn_id);

-- Row level security ----------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'traits', 'breeding_groups', 'breeding_group_members', 'breeding_group_traits', 'spawns', 'spawn_events'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "own rows" on public.%I for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t
    );
  end loop;
end $$;

-- Codes: G-001 for groups, S-001 for spawns, per account ---------------------

create function public.assign_group_code() returns trigger
language plpgsql set search_path = '' as $$
begin
  select coalesce(max(seq), 0) + 1 into new.seq from public.breeding_groups where user_id = new.user_id;
  new.group_code := 'G-' || lpad(new.seq::text, 3, '0');
  return new;
end $$;

create trigger breeding_groups_code before insert on public.breeding_groups
  for each row execute function public.assign_group_code();

create function public.assign_spawn_code() returns trigger
language plpgsql set search_path = '' as $$
begin
  select coalesce(max(seq), 0) + 1 into new.seq from public.spawns where user_id = new.user_id;
  new.spawn_code := 'S-' || lpad(new.seq::text, 3, '0');
  return new;
end $$;

create trigger spawns_code before insert on public.spawns
  for each row execute function public.assign_spawn_code();

create trigger breeding_groups_touch before update on public.breeding_groups
  for each row execute function public.touch_updated_at();
create trigger spawns_touch before update on public.spawns
  for each row execute function public.touch_updated_at();
