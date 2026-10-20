-- Each fish's best IHS result, so screens can read one row per fish instead of every evaluation.
-- Ranked by share of the maximum (100 for males, 10 for females), official results first on a tie.
create or replace view public.fish_best_scores
with (security_invoker = true) as
select distinct on (e.fish_id)
  e.fish_id,
  e.id as evaluation_id,
  e.sex,
  e.total,
  e.kind,
  e.evaluated_on
from public.evaluations e
order by
  e.fish_id,
  e.total / case when e.sex = 'M' then 100.0 else 10.0 end desc,
  (e.kind = 'official') desc,
  e.evaluated_on desc;

grant select on public.fish_best_scores to authenticated;
