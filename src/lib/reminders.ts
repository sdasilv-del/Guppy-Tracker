import type { Href } from 'expo-router';

import { fromISODate, toISODate } from '@/lib/format';
import { summarizeBatch } from '@/lib/spawn';
import type { Fish, Spawn, SpawnEvent, Tank } from '@/lib/types';

// When fry are usually sexed and the males moved out, counted from the day they were born.
export const SEX_FRY_AFTER_DAYS = 28;
export const SEPARATE_MALES_AFTER_DAYS = 42;
// Older batches are left alone: by then they've been sorted, sold or forgotten on purpose.
const SPAWN_REMINDERS_UNTIL_DAYS = 120;

export type ReminderKind = 'water_change' | 'sex_fry' | 'separate_males';

export type Reminder = {
  key: string;
  kind: ReminderKind;
  title: string;
  due: string;
  href: Href;
};

export function addDays(iso: string, days: number): string {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((fromISODate(toIso).getTime() - fromISODate(fromIso).getTime()) / 86_400_000);
}

// Everything with a due date, whether it's due yet or not. Done items drop out:
// logging a water change moves the tank's next date on, and logging a sexing or a move
// on a spawn clears that spawn's reminder.
export function buildReminders(input: {
  tanks: Tank[];
  lastWaterChange: Record<string, string>;
  spawns: Spawn[];
  events: SpawnEvent[];
  fish: Fish[];
  today: string;
}): Reminder[] {
  const { tanks, lastWaterChange, spawns, events, fish, today } = input;
  const out: Reminder[] = [];

  for (const t of tanks) {
    if (!t.water_change_every_days) continue;
    const last = lastWaterChange[t.id];
    const label = t.name ? `${t.tank_code} ${t.name}` : t.tank_code;
    out.push({
      key: `water-${t.id}`,
      kind: 'water_change',
      title: `Water change in ${label}`,
      // Never changed: due now, so the schedule starts from the first change.
      due: last ? addDays(last, t.water_change_every_days) : today,
      href: { pathname: '/tanks/[id]/quick', params: { id: t.id } },
    });
  }

  for (const s of spawns) {
    if (daysBetween(s.born_on, today) > SPAWN_REMINDERS_UNTIL_DAYS) continue;
    if (summarizeBatch(s, events, fish).remaining === 0) continue;
    const own = events.filter((e) => e.spawn_id === s.id);
    const sexing = own.find((e) => e.kind === 'sexing');
    const href: Href = { pathname: '/spawns/[id]', params: { id: s.id } };
    if (!sexing) {
      out.push({
        key: `sex-${s.id}`,
        kind: 'sex_fry',
        title: `Sex the fry in ${s.spawn_code}`,
        due: addDays(s.born_on, SEX_FRY_AFTER_DAYS),
        href,
      });
    } else if (!own.some((e) => e.kind === 'move' && e.happened_on >= sexing.happened_on)) {
      out.push({
        key: `separate-${s.id}`,
        kind: 'separate_males',
        title: `Separate the males in ${s.spawn_code}`,
        due: addDays(s.born_on, SEPARATE_MALES_AFTER_DAYS),
        href,
      });
    }
  }

  return out.sort((a, b) => a.due.localeCompare(b.due) || a.title.localeCompare(b.title));
}

export function dueLabel(due: string, today: string): string {
  const days = daysBetween(today, due);
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days > 1) return `Due in ${days} days`;
  return days === -1 ? '1 day overdue' : `${-days} days overdue`;
}
