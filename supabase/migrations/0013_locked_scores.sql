-- Guppy Tracker: judge-signed scores that can't be changed, and the standard each score was given under.
--
-- standard_year records which IHS standard the score follows, so an old score is never re-read under newer rules.
-- Setting locked_at signs the score: it needs a judge's name, gets a seal, and from then on the row can't be
-- edited or deleted. Deleting the whole fish still removes its scores.

alter table public.evaluations
  add column standard_year smallint not null default 2023 check (standard_year between 1990 and 2100),
  add column locked_at timestamptz,
  add column seal text;

-- Runs after evaluations_score (triggers fire in name order), so the seal covers the final total.
create function public.seal_evaluation() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and old.locked_at is not null then
    raise exception 'This score is locked and signed by %, so it can''t be changed', old.judge;
  end if;
  if new.locked_at is null then
    new.seal := null;
    return new;
  end if;
  if new.judge is null or btrim(new.judge) = '' then
    raise exception 'A locked score needs the judge''s name';
  end if;
  new.locked_at := now();
  -- A short fingerprint of what was signed. Anyone holding a printout can compare it with the app.
  new.seal := upper(substr(md5(concat_ws('|',
    new.id, new.fish_id, new.evaluated_on, btrim(new.judge), new.standard_year, new.total, new.scores::text
  )), 1, 10));
  return new;
end $$;

create trigger evaluations_seal before insert or update on public.evaluations
  for each row execute function public.seal_evaluation();

-- A locked score can only go when its fish is deleted.
create function public.keep_locked_evaluation() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.locked_at is not null and exists (select 1 from public.fish where id = old.fish_id) then
    raise exception 'This score is locked and signed by %, so it can''t be deleted', old.judge;
  end if;
  return old;
end $$;

create trigger evaluations_keep_locked before delete on public.evaluations
  for each row execute function public.keep_locked_evaluation();
