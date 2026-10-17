-- Guppy Tracker: show temperatures in °C or °F.
-- Readings are still stored in °C. Two decimals keep a °F reading the same
-- after it's converted to °C and back (78 °F stays 78, not 78.1).

alter table public.profiles
  add column temperature_unit text not null default 'C' check (temperature_unit in ('C', 'F'));

alter table public.water_tests
  alter column temperature_c type numeric(5, 2);
