-- "Reason for score" selections on IHS evaluations: one list of reason ids per category,
-- e.g. {"body_form": ["bf_outline_minor", "bf_straight"]}. Free-text notes stay in score_notes.

alter table public.evaluations
  add column score_reasons jsonb not null default '{}' check (jsonb_typeof(score_reasons) = 'object');
