-- Guppy Tracker: colour genes on fish, for pairing predictions.
--
-- genes lists the genes a breeder tracks and how each is inherited.
-- fish_genes records how many copies of a gene a fish has. A missing row means not known.
--   recessive / dominant: 0, 1 or 2 copies
--   x_linked: males 0 or 1, females 0, 1 or 2
--   y_linked: males 0 or 1 (females have no Y)

create table public.genes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  mode text not null check (mode in ('recessive', 'dominant', 'x_linked', 'y_linked')),
  notes text,
  created_at timestamptz not null default now()
);

create unique index genes_user_name on public.genes (user_id, lower(name));

create table public.fish_genes (
  fish_id uuid not null references public.fish (id) on delete cascade,
  gene_id uuid not null references public.genes (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  copies smallint not null check (copies between 0 and 2),
  updated_at timestamptz not null default now(),
  primary key (fish_id, gene_id)
);

create index on public.fish_genes (gene_id);
create index on public.fish_genes (user_id);

do $$
declare t text;
begin
  foreach t in array array['genes', 'fish_genes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "own rows" on public.%I for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t
    );
  end loop;
end $$;
