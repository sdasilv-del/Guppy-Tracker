-- Guppy Tracker: show entries come from official show scores.
-- Saving an evaluation of kind 'official' adds or updates its show entry: the show, date and placing follow
-- the evaluation. Class, points and notes stay editable on the entry. Changing the kind away from official,
-- or deleting the evaluation, removes the entry. Older hand-made entries have no evaluation and are kept,
-- but the app no longer lists them.

alter table public.show_entries
  add column evaluation_id uuid unique references public.evaluations (id) on delete cascade;

create function public.sync_show_entry() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.kind <> 'official' then
    delete from public.show_entries where evaluation_id = new.id;
    return null;
  end if;
  insert into public.show_entries (user_id, fish_id, evaluation_id, show_name, shown_on, show_class, placement)
  values (
    new.user_id,
    new.fish_id,
    new.id,
    coalesce(nullif(btrim(new.event), ''), 'Official show'),
    new.evaluated_on,
    nullif(concat_ws(' ', new.tail_standard, case new.sex when 'M' then 'Male' when 'F' then 'Female' end), ''),
    new.placement
  )
  on conflict (evaluation_id) do update set
    fish_id = excluded.fish_id,
    show_name = excluded.show_name,
    shown_on = excluded.shown_on,
    placement = excluded.placement;
  return null;
end $$;

create trigger evaluations_show_entry after insert or update on public.evaluations
  for each row execute function public.sync_show_entry();

-- Official scores saved before this change get their entries now.
insert into public.show_entries (user_id, fish_id, evaluation_id, show_name, shown_on, show_class, placement)
select user_id, fish_id, id, coalesce(nullif(btrim(event), ''), 'Official show'), evaluated_on,
  nullif(concat_ws(' ', tail_standard, case sex when 'M' then 'Male' when 'F' then 'Female' end), ''), placement
from public.evaluations
where kind = 'official'
on conflict (evaluation_id) do nothing;
