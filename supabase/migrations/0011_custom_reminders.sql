-- Guppy Tracker: reminders you add yourself, and snoozing any reminder.

-- A reminder with your own words, e.g. "Move show prospects to conditioning".
-- It can hang off a fish or a tank, and can repeat every so many days.
create table public.custom_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  due_on date not null,
  -- Marking a repeating reminder done moves it this many days on; one-off reminders are deleted.
  repeat_every_days smallint check (repeat_every_days between 1 and 365),
  fish_id uuid references public.fish (id) on delete cascade,
  tank_id uuid references public.tanks (id) on delete cascade,
  notes text,
  created_at timestamptz not null default now()
);

create index on public.custom_reminders (user_id, due_on);
create index on public.custom_reminders (fish_id);
create index on public.custom_reminders (tank_id);

alter table public.custom_reminders enable row level security;
create policy "own rows" on public.custom_reminders
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- A snoozed reminder stays out of the Today list until this date. The key is the app's reminder
-- key (e.g. water-<tank id>, sex-<spawn id>, custom-<id>), so built-in reminders can be snoozed
-- without a row of their own.
create table public.reminder_snoozes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  reminder_key text not null check (length(reminder_key) between 1 and 100),
  snoozed_until date not null,
  primary key (user_id, reminder_key)
);

alter table public.reminder_snoozes enable row level security;
create policy "own rows" on public.reminder_snoozes
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
