-- Female IHS evaluations compare the female with a male: the linked male and optional body
-- length measurements (mm) for the size ratio. Female reasons and the "Disqualify entry"
-- reasons are kept in score_reasons (key "disqualify"), with its explanation in score_notes.

alter table public.evaluations
  add column male_id uuid references public.fish (id) on delete set null,
  add column female_length_mm numeric(4, 1) check (female_length_mm > 0),
  add column male_length_mm numeric(4, 1) check (male_length_mm > 0);

create index on public.evaluations (male_id);
