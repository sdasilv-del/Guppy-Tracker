-- Guppy Tracker: each breeder's own limits for the Home insights.

alter table public.profiles
  add column test_every_days smallint not null default 14 check (test_every_days between 1 and 365),
  add column loss_min smallint not null default 3 check (loss_min between 1 and 1000),
  add column loss_percent smallint not null default 10 check (loss_percent between 1 and 100),
  add column crowded_per_gallon numeric(4, 1) not null default 2 check (crowded_per_gallon > 0 and crowded_per_gallon <= 50);
