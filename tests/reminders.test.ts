import { describe, expect, test } from 'bun:test';

import { addDays, buildReminders, daysBetween, dueLabel } from '@/lib/reminders';
import type { CustomReminder } from '@/lib/types';

import { makeEvent, makeFish, makeSpawn, makeTank } from './fixtures';

const TODAY = '2026-10-20';

function custom(over: Partial<CustomReminder> = {}): CustomReminder {
  return {
    id: 'c1',
    title: 'Feed baby brine',
    due_on: '2026-10-22',
    repeat_every_days: null,
    fish_id: null,
    tank_id: null,
    notes: null,
    created_at: '2026-10-01T00:00:00Z',
    ...over,
  };
}

const base = { tanks: [], lastWaterChange: {}, spawns: [], events: [], fish: [], today: TODAY };

describe('addDays and daysBetween', () => {
  test('addDays crosses month, year and leap-day boundaries', () => {
    expect(addDays('2026-01-30', 3)).toBe('2026-02-02');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  test('addDays is not thrown off by daylight saving changes', () => {
    expect(addDays('2026-03-01', 14)).toBe('2026-03-15');
    expect(addDays('2026-10-25', 14)).toBe('2026-11-08');
  });

  test('daysBetween counts whole days and can be negative', () => {
    expect(daysBetween('2026-01-01', '2026-03-01')).toBe(59);
    expect(daysBetween('2026-03-01', '2026-01-01')).toBe(-59);
    expect(daysBetween('2026-03-01', '2026-04-01')).toBe(31);
  });
});

describe('buildReminders: water changes', () => {
  test('due one interval after the last change, labelled with the tank name', () => {
    const tank = makeTank({ id: 't1', tank_code: 'T1', name: 'Fry rack', water_change_every_days: 7 });
    const [r] = buildReminders({ ...base, tanks: [tank], lastWaterChange: { t1: '2026-10-15' } });
    expect(r).toMatchObject({ key: 'water-t1', kind: 'water_change', title: 'Water change in T1 Fry rack', due: '2026-10-22' });
  });

  test('due today when the tank has never been changed', () => {
    const tank = makeTank({ id: 't1', tank_code: 'T1', water_change_every_days: 5 });
    const [r] = buildReminders({ ...base, tanks: [tank] });
    expect(r.title).toBe('Water change in T1');
    expect(r.due).toBe(TODAY);
  });

  test('no reminder for tanks without a schedule', () => {
    expect(buildReminders({ ...base, tanks: [makeTank({ water_change_every_days: null })] })).toEqual([]);
  });
});

describe('buildReminders: spawns', () => {
  const spawn = makeSpawn({ id: 's1', spawn_code: 'SP1', born_on: '2026-10-01', fry_count: 20 });

  test('asks to sex the fry 28 days after birth', () => {
    const [r] = buildReminders({ ...base, spawns: [spawn] });
    expect(r).toMatchObject({ key: 'sex-s1', kind: 'sex_fry', title: 'Sex the fry in SP1', due: '2026-10-29' });
  });

  test('after sexing, asks to separate males 42 days after birth until a move is logged', () => {
    const sexing = makeEvent({ spawn_id: 's1', kind: 'sexing', happened_on: '2026-10-29' });
    const [r] = buildReminders({ ...base, spawns: [spawn], events: [sexing] });
    expect(r).toMatchObject({ kind: 'separate_males', due: '2026-11-12' });

    const move = makeEvent({ spawn_id: 's1', kind: 'move', happened_on: '2026-11-01', count: 5 });
    expect(buildReminders({ ...base, spawns: [spawn], events: [sexing, move] })).toEqual([]);
  });

  test('a move logged before the sexing does not clear the separate reminder', () => {
    const move = makeEvent({ spawn_id: 's1', kind: 'move', happened_on: '2026-10-10', count: 5 });
    const sexing = makeEvent({ spawn_id: 's1', kind: 'sexing', happened_on: '2026-10-29' });
    expect(buildReminders({ ...base, spawns: [spawn], events: [move, sexing] })[0].kind).toBe('separate_males');
  });

  test('skips batches older than 120 days and batches with no fry left', () => {
    const old = makeSpawn({ born_on: '2026-06-01' });
    const empty = makeSpawn({ id: 's2', born_on: '2026-10-01', fry_count: 2 });
    const loss = makeEvent({ spawn_id: 's2', kind: 'loss', count: 2 });
    expect(buildReminders({ ...base, spawns: [old, empty], events: [loss] })).toEqual([]);
  });
});

describe('buildReminders: custom reminders and snoozes', () => {
  test('custom reminders name their fish or tank and link to it', () => {
    const fish = makeFish({ id: 'f1', fish_code: 'GT-001' });
    const tank = makeTank({ id: 't9', tank_code: 'T9' });
    const out = buildReminders({
      ...base,
      tanks: [tank],
      fish: [fish],
      custom: [
        custom({ id: 'c1', title: 'Photo', fish_id: 'f1' }),
        custom({ id: 'c2', title: 'Clean filter', tank_id: 't9' }),
        custom({ id: 'c3', title: 'Order food' }),
      ],
    });
    const byId = Object.fromEntries(out.map((r) => [r.customId, r]));
    expect(byId.c1.title).toBe('Photo (GT-001)');
    expect(byId.c1.href).toEqual({ pathname: '/fish/[id]', params: { id: 'f1' } });
    expect(byId.c2.title).toBe('Clean filter (T9)');
    expect(byId.c3.title).toBe('Order food');
    expect(byId.c3.href).toEqual({ pathname: '/reminders/edit', params: { reminderId: 'c3' } });
  });

  test('a repeating reminder shows at its stored due date', () => {
    const [r] = buildReminders({ ...base, custom: [custom({ due_on: '2026-10-25', repeat_every_days: 7 })] });
    expect(r).toMatchObject({ kind: 'custom', due: '2026-10-25', key: 'custom-c1' });
  });

  test('a snooze pushes the due date later but never earlier', () => {
    const later = buildReminders({
      ...base,
      custom: [custom({ due_on: '2026-10-22' })],
      snoozes: [{ reminder_key: 'custom-c1', snoozed_until: '2026-10-30' }],
    });
    expect(later[0]).toMatchObject({ due: '2026-10-30', snoozed: true });

    const earlier = buildReminders({
      ...base,
      custom: [custom({ due_on: '2026-10-22' })],
      snoozes: [{ reminder_key: 'custom-c1', snoozed_until: '2026-10-21' }],
    });
    expect(earlier[0].due).toBe('2026-10-22');
    expect(earlier[0].snoozed).toBeUndefined();
  });

  test('sorts by due date, then title', () => {
    const out = buildReminders({
      ...base,
      custom: [
        custom({ id: 'a', title: 'Zeta', due_on: '2026-10-23' }),
        custom({ id: 'b', title: 'Beta', due_on: '2026-10-21' }),
        custom({ id: 'c', title: 'Alpha', due_on: '2026-10-23' }),
      ],
    });
    expect(out.map((r) => r.title)).toEqual(['Beta', 'Alpha', 'Zeta']);
  });
});

describe('dueLabel', () => {
  test('describes today, tomorrow, the future and overdue', () => {
    expect(dueLabel(TODAY, TODAY)).toBe('Due today');
    expect(dueLabel('2026-10-21', TODAY)).toBe('Due tomorrow');
    expect(dueLabel('2026-10-25', TODAY)).toBe('Due in 5 days');
    expect(dueLabel('2026-10-19', TODAY)).toBe('1 day overdue');
    expect(dueLabel('2026-10-10', TODAY)).toBe('10 days overdue');
  });
});
