-- Guppy Tracker: accounts, tanks, water log and fish.
-- Every table carries user_id and row level security, so each account only sees its own rows.

create extension if not exists pgcrypto;

-- Profiles ---------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  breeder_initials text not null check (breeder_initials ~ '^[A-Z]{1,5}$'),
  club text,
  country text,
  created_at timestamptz not null default now()
);

-- Tanks ------------------------------------------------------------------

create table public.tanks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  seq integer not null,
  tank_code text not null,
  name text,
  size_gallons numeric(6, 1),
  purpose text not null check (purpose in (
    'breeding', 'fry_growout', 'male_juvenile_growout', 'female_juvenile_growout',
    'quarantine', 'show_conditioning', 'retirement', 'cull'
  )),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, tank_code)
);

create table public.water_tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tank_id uuid not null references public.tanks (id) on delete cascade,
  tested_on date not null default current_date,
  temperature_c numeric(4, 1),
  ph numeric(3, 1),
  ammonia numeric(5, 2),
  nitrite numeric(5, 2),
  nitrate numeric(6, 1),
  gh numeric(4, 1),
  kh numeric(4, 1),
  notes text,
  created_at timestamptz not null default now()
);

create table public.water_changes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tank_id uuid not null references public.tanks (id) on delete cascade,
  changed_on date not null default current_date,
  percent numeric(4, 1) check (percent between 0 and 100),
  notes text,
  created_at timestamptz not null default now()
);

-- Fish -------------------------------------------------------------------

create table public.fish (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  seq integer not null,
  fish_code text not null,
  previous_codes text[] not null default '{}',
  name text,
  sex text not null default 'U' check (sex in ('M', 'F', 'U')),
  tail_standard text not null check (tail_standard in (
    'A1', 'A2', 'A3', 'A4', 'A5', 'B1', 'B2', 'B3', 'B4', 'C1', 'C2', 'C3', 'C4'
  )),
  base_colour smallint check (base_colour between 1 and 10),
  cover_colours smallint[] not null default '{}',
  strain text,
  date_of_birth date,
  generation text,
  origin text not null default 'bred' check (origin in ('bred', 'imported', 'purchased')),
  foundation boolean not null default false,
  original_breeder text,
  sire_id uuid references public.fish (id) on delete set null,
  dam_id uuid references public.fish (id) on delete set null,
  tank_id uuid references public.tanks (id) on delete set null,
  status text not null default 'breeder' check (status in (
    'breeder', 'show_prospect', 'show_fish', 'for_sale', 'sold', 'culled', 'retired', 'deceased'
  )),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, fish_code)
);

create table public.fish_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  fish_id uuid not null references public.fish (id) on delete cascade,
  storage_path text not null,
  taken_on date not null default current_date,
  created_at timestamptz not null default now()
);

create table public.fish_moves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  fish_id uuid not null references public.fish (id) on delete cascade,
  from_tank_id uuid references public.tanks (id) on delete set null,
  to_tank_id uuid references public.tanks (id) on delete set null,
  moved_at timestamptz not null default now()
);

create index on public.tanks (user_id);
create index on public.water_tests (tank_id, tested_on desc);
create index on public.water_changes (tank_id, changed_on desc);
create index on public.fish (user_id);
create index on public.fish (tank_id);
create index on public.fish_photos (fish_id);
create index on public.fish_moves (fish_id, moved_at desc);

-- Row level security -----------------------------------------------------

alter table public.profiles enable row level security;
create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['tanks', 'water_tests', 'water_changes', 'fish', 'fish_photos', 'fish_moves'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "own rows" on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
  end loop;
end $$;

-- Tank codes: T-001, T-002 ... per account ---------------------------------

create function public.assign_tank_code() returns trigger
language plpgsql as $$
begin
  select coalesce(max(seq), 0) + 1 into new.seq from public.tanks where user_id = new.user_id;
  new.tank_code := 'T-' || lpad(new.seq::text, 3, '0');
  return new;
end $$;

create trigger tanks_code before insert on public.tanks
  for each row execute function public.assign_tank_code();

-- Fish codes: initials + tail standard + sex + number, e.g. SD-A3-M-001.
-- The number counts per tail standard and sex. When sex or tail standard changes,
-- the fish takes the next number for its new group and keeps its old code in previous_codes.

create function public.assign_fish_code() returns trigger
language plpgsql as $$
declare initials text;
begin
  if tg_op = 'UPDATE' and new.sex = old.sex and new.tail_standard = old.tail_standard then
    new.seq := old.seq;
    new.fish_code := old.fish_code;
    return new;
  end if;

  select breeder_initials into initials from public.profiles where id = new.user_id;
  if initials is null then
    raise exception 'Set your breeder initials in your profile before adding fish';
  end if;

  select coalesce(max(seq), 0) + 1 into new.seq
    from public.fish
    where user_id = new.user_id and tail_standard = new.tail_standard and sex = new.sex;

  if tg_op = 'UPDATE' then
    new.previous_codes := old.previous_codes || old.fish_code;
  end if;
  new.fish_code := initials || '-' || new.tail_standard || '-' || new.sex || '-' || lpad(new.seq::text, 3, '0');
  return new;
end $$;

create trigger fish_code before insert or update of sex, tail_standard on public.fish
  for each row execute function public.assign_fish_code();

-- Moving a fish: log the move, and moving into a cull tank marks it Culled.

create function public.on_fish_tank_change() returns trigger
language plpgsql as $$
begin
  if new.tank_id is not null
     and exists (select 1 from public.tanks where id = new.tank_id and purpose = 'cull') then
    new.status := 'culled';
  end if;
  return new;
end $$;

create trigger fish_cull_status before insert or update of tank_id on public.fish
  for each row execute function public.on_fish_tank_change();

create function public.log_fish_move() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.tank_id is not null then
      insert into public.fish_moves (user_id, fish_id, from_tank_id, to_tank_id)
        values (new.user_id, new.id, null, new.tank_id);
    end if;
  elsif new.tank_id is distinct from old.tank_id then
    insert into public.fish_moves (user_id, fish_id, from_tank_id, to_tank_id)
      values (new.user_id, new.id, old.tank_id, new.tank_id);
  end if;
  return null;
end $$;

create trigger fish_moves_log after insert or update of tank_id on public.fish
  for each row execute function public.log_fish_move();

-- updated_at ---------------------------------------------------------------

create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger tanks_touch before update on public.tanks
  for each row execute function public.touch_updated_at();
create trigger fish_touch before update on public.fish
  for each row execute function public.touch_updated_at();

-- Photo storage: a private bucket, files stored under <user id>/... -------

insert into storage.buckets (id, name, public) values ('fish-photos', 'fish-photos', false)
  on conflict (id) do nothing;

create policy "own fish photos" on storage.objects
  for all using (bucket_id = 'fish-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'fish-photos' and (storage.foldername(name))[1] = auth.uid()::text);
