import type { Href } from 'expo-router';

import { formatDate, fromISODate, toISODate } from '@/lib/format';
import { summarizeBatch } from '@/lib/spawn';
import type { CustomReminder, Fish, ReminderSnooze, Spawn, SpawnEvent, Tank } from '@/lib/types';

// When fry are usually sexed and the males moved out, counted from the day they were born.
export const SEX_FRY_AFTER_DAYS = 28;
export const SEPARATE_MALES_AFTER_DAYS = 42;
// Older batches are left alone: by then they've been sorted, sold or forgotten on purpose.
const SPAWN_REMINDERS_UNTIL_DAYS = 120;

export type ReminderKind = 'water_change' | 'sex_fry' | 'separate_males' | 'custom';

export type Reminder = {
  key: string;
  kind: ReminderKind;
  title: string;
  due: string;
  href: Href;
  // Set on reminders you added yourself, so they can be marked done or edited.
  customId?: string;
  // Set when the reminder was snoozed past its real due date.
  snoozed?: boolean;
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
  custom?: CustomReminder[];
  snoozes?: ReminderSnooze[];
  today: string;
}): Reminder[] {
  const { tanks, lastWaterChange, spawns, events, fish, custom = [], snoozes = [], today } = input;
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

  const fishCode = Object.fromEntries(fish.map((f) => [f.id, f.fish_code]));
  const tankCode = Object.fromEntries(tanks.map((t) => [t.id, t.tank_code]));
  for (const c of custom) {
    const on = c.fish_id ? fishCode[c.fish_id] : c.tank_id ? tankCode[c.tank_id] : undefined;
    out.push({
      key: `custom-${c.id}`,
      kind: 'custom',
      title: on ? `${c.title} (${on})` : c.title,
      due: c.due_on,
      href: c.fish_id
        ? { pathname: '/fish/[id]', params: { id: c.fish_id } }
        : c.tank_id
          ? { pathname: '/tanks/[id]', params: { id: c.tank_id } }
          : { pathname: '/reminders/edit', params: { reminderId: c.id } },
      customId: c.id,
    });
  }

  // A snooze pushes a reminder's date on, but never pulls it earlier.
  const until = Object.fromEntries(snoozes.map((s) => [s.reminder_key, s.snoozed_until]));
  for (const r of out) {
    const u = until[r.key];
    if (u && u > r.due) {
      r.due = u;
      r.snoozed = true;
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

// A plain-English line for a reminder's schedule, shown before saving, e.g. "Every 2 days from 21 Oct"
// or "Once on 21 Oct". The year is only added when it isn't this year.
export function scheduleSummary(dueOn: string, repeatEveryDays: number | null, today: string): string {
  const date = dueOn.slice(0, 4) === today.slice(0, 4) ? formatDate(dueOn).replace(/ \d{4}$/, '') : formatDate(dueOn);
  if (!repeatEveryDays || repeatEveryDays < 1) return `Once on ${date}`;
  const every =
    repeatEveryDays === 1
      ? 'Every day'
      : repeatEveryDays === 7
        ? 'Every week'
        : repeatEveryDays % 7 === 0
          ? `Every ${repeatEveryDays / 7} weeks`
          : `Every ${repeatEveryDays} days`;
  return `${every} from ${date}`;
}
