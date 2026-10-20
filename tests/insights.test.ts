import { describe, expect, test } from 'bun:test';

import { buildInsights, DEFAULT_INSIGHT_SETTINGS, type InsightData } from '@/lib/insights';
import type { BreedingGroup } from '@/lib/types';

import { makeEvent, makeFish, makeSpawn, makeTank, makeWaterTest } from './fixtures';

const TODAY = '2026-10-20';

function data(over: Partial<InsightData> = {}): InsightData {
  return {
    today: TODAY,
    tanks: [],
    fish: [],
    spawns: [],
    events: [],
    waterTests: [],
    evaluations: [],
    shows: [],
    sales: [],
    groups: [],
    members: {},
    withPhotos: new Set(),
    settings: DEFAULT_INSIGHT_SETTINGS,
    ...over,
  };
}

const ofKind = (d: InsightData, kind: string) => buildInsights(d).filter((i) => i.kind === kind);

function group(over: Partial<BreedingGroup> = {}): BreedingGroup {
  return {
    id: 'g1',
    group_code: 'G1',
    name: null,
    tank_id: null,
    started_on: '2026-09-01',
    ended_on: null,
    goal: null,
    notes: null,
    created_at: '2026-09-01T00:00:00Z',
    ...over,
  };
}

describe('water insights', () => {
  const tank = makeTank({ id: 't1', tank_code: 'T1' });
  const fish = [makeFish({ tank_id: 't1' })];

  test('warns about ammonia or nitrite in the latest test', () => {
    const out = ofKind(data({ tanks: [tank], waterTests: [makeWaterTest({ tank_id: 't1', tested_on: TODAY, ammonia: 0.25 })] }), 'water');
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe('T1: ammonia 0.25');
    expect(out[0].warn).toBe(true);
  });

  test('asks for a test only once the stocked tank is past the test interval', () => {
    const at14 = makeWaterTest({ tank_id: 't1', tested_on: '2026-10-06' });
    const at15 = makeWaterTest({ tank_id: 't1', tested_on: '2026-10-05' });
    expect(ofKind(data({ tanks: [tank], fish, waterTests: [at14] }), 'water')).toEqual([]);
    const out = ofKind(data({ tanks: [tank], fish, waterTests: [at15] }), 'water');
    expect(out[0].title).toBe('T1: test the water');
    expect(out[0].detail).toBe('Last tested 15 days ago.');
  });

  test('does not ask for tests on an empty tank', () => {
    expect(ofKind(data({ tanks: [tank] }), 'water')).toEqual([]);
  });
});

describe('fry loss insights', () => {
  const spawn = makeSpawn({ id: 's1', spawn_code: 'SP1', born_on: '2026-10-01', fry_count: 40 });
  const loss = (count: number, happened_on = '2026-10-18') => makeEvent({ spawn_id: 's1', kind: 'loss', count, happened_on });

  test('needs both the minimum count and the percent of the batch', () => {
    // 10% of 40 is 4, so 3 losses are under the threshold.
    expect(ofKind(data({ spawns: [spawn], events: [loss(3)] }), 'losses')).toEqual([]);
    const out = ofKind(data({ spawns: [spawn], events: [loss(4)] }), 'losses');
    expect(out[0].title).toBe('SP1: 4 fry lost this week');
    expect(out[0].detail).toMatch(/^10% of the batch/);
  });

  test('only counts losses from the last 7 days', () => {
    expect(ofKind(data({ spawns: [spawn], events: [loss(10, '2026-10-12')] }), 'losses')).toEqual([]);
  });
});

describe('crowded tank insights', () => {
  const tank = makeTank({ id: 't1', tank_code: 'T1', size_gallons: 10 });
  const fishIn = (n: number, status: 'breeder' | 'sold' = 'breeder') =>
    Array.from({ length: n }, () => makeFish({ tank_id: 't1', status }));

  test('warns above 2 fish a gallon, not at exactly 2', () => {
    expect(ofKind(data({ tanks: [tank], fish: fishIn(20) }), 'crowded')).toEqual([]);
    const out = ofKind(data({ tanks: [tank], fish: fishIn(21) }), 'crowded');
    expect(out[0].title).toBe('T1: 21 fish in 10 gal');
  });

  test('does not count sold fish', () => {
    expect(ofKind(data({ tanks: [tank], fish: [...fishIn(20), ...fishIn(5, 'sold')] }), 'crowded')).toEqual([]);
  });
});

describe('inbreeding insights', () => {
  const sire = makeFish({ id: 'S' });
  const dam = makeFish({ id: 'D', sex: 'F' });
  const son = makeFish({ id: 'A', sex: 'M', sire_id: 'S', dam_id: 'D' });
  const daughter = makeFish({ id: 'B', sex: 'F', sire_id: 'S', dam_id: 'D' });
  const fish = [sire, dam, son, daughter];

  test('warns when an active group would give 25% inbred fry', () => {
    const out = ofKind(data({ fish, groups: [group()], members: { g1: ['A', 'B'] } }), 'inbreeding');
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe('G1: fry up to 25% inbred');
  });

  test('ignores ended groups and unrelated pairs', () => {
    expect(ofKind(data({ fish, groups: [group({ ended_on: '2026-10-01' })], members: { g1: ['A', 'B'] } }), 'inbreeding')).toEqual([]);
    expect(ofKind(data({ fish, groups: [group()], members: { g1: ['S', 'D'] } }), 'inbreeding')).toEqual([]);
  });
});

test('warnings come before summaries', () => {
  const tank = makeTank({ id: 't1', size_gallons: 1 });
  const out = buildInsights(data({ tanks: [tank], fish: [makeFish({ tank_id: 't1' }), makeFish({ tank_id: 't1' }), makeFish({ tank_id: 't1' })] }));
  const firstSummary = out.findIndex((i) => !i.warn);
  expect(firstSummary).toBeGreaterThan(0);
  expect(out.slice(firstSummary).every((i) => !i.warn)).toBe(true);
});
