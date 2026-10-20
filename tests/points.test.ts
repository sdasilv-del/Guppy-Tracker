import { describe, expect, test } from 'bun:test';

import { entryPoints, placementPoints, pointsTables, seasons } from '@/lib/points';

import { makeEntry, makeFish } from './fixtures';

describe('placementPoints', () => {
  test('gives 10/8/6/4/2 for 1st to 5th', () => {
    expect(['1st', '2nd', '3rd', '4th', '5th'].map(placementPoints)).toEqual([10, 8, 6, 4, 2]);
  });

  test('reads the leading number and ignores surrounding spaces', () => {
    expect(placementPoints('  1 - Best of class ')).toBe(10);
    expect(placementPoints('2')).toBe(8);
  });

  test('gives 0 below 5th, for 0, for text and for null', () => {
    expect(placementPoints('6th')).toBe(0);
    expect(placementPoints('0')).toBe(0);
    expect(placementPoints('HM')).toBe(0);
    expect(placementPoints(null)).toBe(0);
  });
});

describe('entryPoints', () => {
  test('uses the points the show gave, even 0', () => {
    expect(entryPoints(makeEntry({ points: 0, placement: '1st' }))).toEqual({ points: 0, estimated: false });
    expect(entryPoints(makeEntry({ points: 15, placement: '1st' }))).toEqual({ points: 15, estimated: false });
  });

  test('estimates from the placing when the show gave no points', () => {
    expect(entryPoints(makeEntry({ points: null, placement: '3rd' }))).toEqual({ points: 6, estimated: true });
  });
});

describe('seasons', () => {
  test('lists each year once, newest first', () => {
    const entries = ['2024-05-01', '2026-01-02', '2024-11-11', '2025-06-06'].map((d) => makeEntry({ shown_on: d }));
    expect(seasons(entries)).toEqual([2026, 2025, 2024]);
  });
});

describe('pointsTables', () => {
  const a = makeFish({ id: 'a' });
  const b = makeFish({ id: 'b' });

  test('ranks fish by points within a class and only counts the season asked for', () => {
    const entries = [
      makeEntry({ fish_id: 'a', placement: '2nd' }),
      makeEntry({ fish_id: 'b', placement: '1st' }),
      makeEntry({ fish_id: 'a', placement: '1st', shown_on: '2026-06-01' }),
      makeEntry({ fish_id: 'b', placement: '1st', shown_on: '2025-06-01' }),
    ];
    const [table] = pointsTables(entries, [a, b], 2026);
    expect(table.standings.map((s) => [s.fishId, s.points, s.entries, s.wins])).toEqual([
      ['a', 18, 2, 1],
      ['b', 10, 1, 1],
    ]);
    expect(table.standings[0].fish).toBe(a);
  });

  test('merges class names that differ only by case and spacing', () => {
    const entries = [
      makeEntry({ fish_id: 'a', show_class: 'A1 Male', placement: '1st' }),
      makeEntry({ fish_id: 'a', show_class: ' a1   male ', placement: '1st' }),
    ];
    const tables = pointsTables(entries, [a], 2026);
    expect(tables).toHaveLength(1);
    expect(tables[0].name).toBe('A1 Male');
    expect(tables[0].standings[0].points).toBe(20);
  });

  test('puts blank classes under "No class" and orders classes by top points', () => {
    const entries = [
      makeEntry({ fish_id: 'a', show_class: null, placement: '5th' }),
      makeEntry({ fish_id: 'b', show_class: 'B1', placement: '1st' }),
    ];
    expect(pointsTables(entries, [a, b], 2026).map((t) => t.name)).toEqual(['B1', 'No class']);
  });

  test('breaks a points tie on wins', () => {
    const entries = [
      makeEntry({ fish_id: 'a', placement: '2nd', points: null }),
      makeEntry({ fish_id: 'a', placement: '5th', points: 2 }),
      makeEntry({ fish_id: 'b', placement: '1st', points: 10 }),
    ];
    expect(pointsTables(entries, [a, b], 2026)[0].standings.map((s) => s.fishId)).toEqual(['b', 'a']);
  });

  test('marks a standing estimated only when estimated points were added', () => {
    const entries = [
      makeEntry({ fish_id: 'a', placement: '1st', points: null }),
      makeEntry({ fish_id: 'b', placement: '1st', points: 12 }),
      makeEntry({ fish_id: 'b', placement: 'HM', points: null }),
    ];
    const rows = Object.fromEntries(pointsTables(entries, [a, b], 2026)[0].standings.map((s) => [s.fishId, s]));
    expect(rows.a.estimated).toBe(true);
    expect(rows.b.estimated).toBe(false);
  });

  test('keeps a standing for a fish that is no longer on record', () => {
    const [table] = pointsTables([makeEntry({ fish_id: 'gone', placement: '1st' })], [], 2026);
    expect(table.standings[0].fish).toBeNull();
    expect(table.standings[0].fishId).toBe('gone');
  });
});
