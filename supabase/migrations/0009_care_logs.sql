-- Guppy Tracker: feeding and treatment log per tank.
-- One row per feeding or medication dose, so an outbreak can be traced back
-- through what each tank was fed and treated with.

create table public.care_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tank_id uuid not null references public.tanks (id) on delete cascade,
  kind text not null check (kind in ('feeding', 'treatment')),
  logged_on date not null default current_date,
  -- The food or the medication.
  item text not null check (length(trim(item)) > 0),
  -- Free text, since breeders measure food and doses in many ways ("pinch", "5 ml", "1 tsp per 5 gal").
  amount text,
  -- How long a treatment course runs, counted from logged_on. Feedings leave it empty.
  course_days smallint check (course_days between 1 and 60),
  notes text,
  created_at timestamptz not null default now(),
  check (kind = 'treatment' or course_days is null)
);

create index on public.care_logs (tank_id, logged_on desc);
create index on public.care_logs (user_id, kind);

alter table public.care_logs enable row level security;
create policy "own rows" on public.care_logs
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
