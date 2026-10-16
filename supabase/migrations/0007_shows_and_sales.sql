-- Guppy Tracker: show entries and sales.

-- Show entries ------------------------------------------------------------------
-- One row per fish entered in a show: which show, which class, and how it placed.
-- A judged score sheet stays in evaluations; this records the entry and the result.

create table public.show_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  fish_id uuid not null references public.fish (id) on delete cascade,
  show_name text not null check (length(trim(show_name)) > 0),
  shown_on date not null default current_date,
  show_class text,
  placement text,
  points numeric(6, 1),
  notes text,
  created_at timestamptz not null default now()
);

-- Sales ---------------------------------------------------------------------------
-- One row per fish sold, with the buyer and price. Recording a sale also marks the fish sold in the app.

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  fish_id uuid not null references public.fish (id) on delete cascade,
  sold_on date not null default current_date,
  buyer text,
  price numeric(10, 2) check (price is null or price >= 0),
  currency text not null default 'CAD' check (currency ~ '^[A-Z]{3}$'),
  notes text,
  created_at timestamptz not null default now()
);

create index on public.show_entries (fish_id, shown_on desc);
create index on public.show_entries (user_id);
create index on public.sales (fish_id, sold_on desc);
create index on public.sales (user_id);

do $$
declare t text;
begin
  foreach t in array array['show_entries', 'sales'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "own rows" on public.%I for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t
    );
  end loop;
end $$;
