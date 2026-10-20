-- Guppy Tracker: line plans, a breeding plan several generations ahead.
-- A plan starts from a real pair. steps holds how each generation is bred to make the next:
--   [{"scheme": "siblings" | "to_sire" | "to_dam" | "outcross", "outcross_id": uuid | null}, ...]
-- The app works out the inbreeding at each generation; nothing here is a real fish until it is bred.

create table public.line_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  sire_id uuid references public.fish (id) on delete set null,
  dam_id uuid references public.fish (id) on delete set null,
  steps jsonb not null default '[]' check (jsonb_typeof(steps) = 'array'),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.line_plans (user_id);
create index on public.line_plans (sire_id);
create index on public.line_plans (dam_id);

alter table public.line_plans enable row level security;
create policy "own rows" on public.line_plans for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create trigger line_plans_touch before update on public.line_plans
  for each row execute function public.touch_updated_at();
