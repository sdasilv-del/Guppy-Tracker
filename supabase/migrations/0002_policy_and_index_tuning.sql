-- Supabase advisor fixes: evaluate auth.uid() once per query in policies,
-- and index the foreign keys that had no covering index.

alter policy "own profile" on public.profiles
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

do $$
declare t text;
begin
  foreach t in array array['tanks', 'water_tests', 'water_changes', 'fish', 'fish_photos', 'fish_moves'] loop
    execute format(
      'alter policy "own rows" on public.%I using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t
    );
  end loop;
end $$;

alter policy "own fish photos" on storage.objects
  using (bucket_id = 'fish-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'fish-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create index on public.fish (sire_id);
create index on public.fish (dam_id);
create index on public.fish_moves (from_tank_id);
create index on public.fish_moves (to_tank_id);
create index on public.fish_moves (user_id);
create index on public.fish_photos (user_id);
create index on public.water_changes (user_id);
create index on public.water_tests (user_id);
