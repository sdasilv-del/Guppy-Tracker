-- Guppy Tracker: a water change schedule per tank, for reminders.
-- Empty means no schedule, so tanks without one never show as due.

alter table public.tanks
  add column water_change_every_days smallint
  check (water_change_every_days between 1 and 90);
