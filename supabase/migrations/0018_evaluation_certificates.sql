-- Guppy Tracker: a photo of the judge's official score sheet or certificate on an official score.
--
-- It's stored in the fish-photos bucket like the fish photo. Locked scores can't change, so it has to be
-- added before the score is signed.

alter table public.evaluations
  add column certificate_path text;
