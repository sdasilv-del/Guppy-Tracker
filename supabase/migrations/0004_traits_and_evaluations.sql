-- Guppy Tracker: trait records on fish and IHS evaluations.

-- Trait records ----------------------------------------------------------------
-- A trait (defined in 0003) recorded on a fish with a value or score, a date and notes.

create table public.fish_traits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  fish_id uuid not null references public.fish (id) on delete cascade,
  trait_id uuid not null references public.traits (id) on delete cascade,
  recorded_on date not null default current_date,
  value text,
  score numeric(5, 1),
  notes text,
  created_at timestamptz not null default now(),
  check (value is not null or score is not null or notes is not null)
);

-- IHS evaluations ----------------------------------------------------------------
-- One row per judging. The class (sex, tail standard, colours) is copied from the fish at the time,
-- so later edits to the fish don't change old results.
-- scores holds one number per IHS 2023 category; score_notes holds an optional note per category.

create table public.evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  fish_id uuid not null references public.fish (id) on delete cascade,
  kind text not null check (kind in ('official', 'practice', 'breeder')),
  evaluated_on date not null default current_date,
  event text,
  judge text,
  sex text not null check (sex in ('M', 'F')),
  tail_standard text,
  base_colour smallint,
  cover_colours smallint[] not null default '{}',
  scores jsonb not null default '{}',
  score_notes jsonb not null default '{}',
  total numeric(5, 1) not null default 0,
  placement text,
  photo_path text,
  notes text,
  created_at timestamptz not null default now()
);

create index on public.fish_traits (fish_id, recorded_on desc);
create index on public.fish_traits (trait_id);
create index on public.fish_traits (user_id);
create index on public.evaluations (fish_id, evaluated_on desc);
create index on public.evaluations (user_id);

do $$
declare t text;
begin
  foreach t in array array['fish_traits', 'evaluations'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "own rows" on public.%I for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t
    );
  end loop;
end $$;

-- IHS 2023 point assignment (item 14): males 100 points, females 10.
create function public.ihs_max_points(sex text, category text) returns numeric
language sql immutable set search_path = '' as $$
  select case sex
    when 'M' then case category
      when 'body_length' then 8 when 'body_form' then 8 when 'body_colour' then 12
      when 'dorsal_length' then 5 when 'dorsal_form' then 8 when 'dorsal_colour' then 10
      when 'caudal_length' then 10 when 'caudal_form' then 20 when 'caudal_colour' then 14
      when 'vitality' then 5
    end
    when 'F' then case category
      when 'size' then 3 when 'form' then 3 when 'matching' then 2 when 'vitality' then 2
    end
  end
$$;

-- Checks every score against its category's maximum and adds up the total.
create function public.score_evaluation() returns trigger
language plpgsql set search_path = '' as $$
declare
  k text;
  v jsonb;
  max_points numeric;
  sum_points numeric := 0;
begin
  if jsonb_typeof(new.scores) <> 'object' then
    raise exception 'Scores must be a set of categories';
  end if;
  for k, v in select * from jsonb_each(new.scores) loop
    max_points := public.ihs_max_points(new.sex, k);
    if max_points is null then
      raise exception 'Unknown IHS category % for sex %', k, new.sex;
    end if;
    if jsonb_typeof(v) <> 'number' or v::numeric < 0 or v::numeric > max_points then
      raise exception 'Score for % must be from 0 to %', k, max_points;
    end if;
    sum_points := sum_points + v::numeric;
  end loop;
  new.total := sum_points;
  return new;
end $$;

create trigger evaluations_score before insert or update on public.evaluations
  for each row execute function public.score_evaluation();
