-- Guppy Tracker: let beginners add a fish before they know its tail standard.
-- 'U' means not sure yet. The fish code uses it like any tail (SD-U-M-001), and picking the
-- real tail later gives the fish its proper code and keeps the old one in previous_codes.

alter table public.fish drop constraint fish_tail_standard_check;
alter table public.fish add constraint fish_tail_standard_check check (tail_standard in (
  'A1', 'A2', 'A3', 'A4', 'A5', 'B1', 'B2', 'B3', 'B4', 'C1', 'C2', 'C3', 'C4', 'U'
));
