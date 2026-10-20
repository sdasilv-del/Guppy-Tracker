import { describe, expect, test } from 'bun:test';

import { nextGeneration, percent, summarizeBatch } from '@/lib/spawn';

import { makeEvent, makeFish, makeSpawn } from './fixtures';

describe('summarizeBatch', () => {
  const spawn = makeSpawn({ id: 's1', fry_count: 30 });

  test('takes losses, culls and picks off the count at birth; moves change nothing', () => {
    const events = [
      makeEvent({ spawn_id: 's1', kind: 'loss', count: 3 }),
      makeEvent({ spawn_id: 's1', kind: 'loss', count: null }),
      makeEvent({ spawn_id: 's1', kind: 'cull', count: 5 }),
      makeEvent({ spawn_id: 's1', kind: 'move', count: 10 }),
      makeEvent({ spawn_id: 'other', kind: 'loss', count: 7 }),
    ];
    const picks = [makeFish({ spawn_id: 's1' }), makeFish({ spawn_id: 's1' }), makeFish({ spawn_id: 'other' })];
    expect(summarizeBatch(spawn, events, picks)).toMatchObject({ remaining: 20, lost: 3, culled: 5, picked: 2, sexing: null });
  });

  test('shows the latest sexing in the log', () => {
    const first = makeEvent({ spawn_id: 's1', kind: 'sexing', males: 5 });
    const latest = makeEvent({ spawn_id: 's1', kind: 'sexing', males: 8 });
    expect(summarizeBatch(spawn, [first, latest], []).sexing).toBe(latest);
  });

  test('never goes below zero', () => {
    expect(summarizeBatch(spawn, [makeEvent({ spawn_id: 's1', kind: 'loss', count: 50 })], []).remaining).toBe(0);
  });
});

describe('nextGeneration', () => {
  test('is one more than the higher parent generation', () => {
    expect(nextGeneration(makeFish({ generation: 'F2' }), makeFish({ generation: 'F3' }))).toBe('F4');
    expect(nextGeneration(makeFish({ generation: ' f1 ' }), null)).toBe('F2');
  });

  test('ignores generations that are not F<number>', () => {
    expect(nextGeneration(makeFish({ generation: 'P' }), makeFish({ generation: 'F5' }))).toBe('F6');
    expect(nextGeneration(makeFish({ generation: 'P' }), makeFish({ generation: null }), undefined)).toBeNull();
    expect(nextGeneration()).toBeNull();
  });
});

describe('percent', () => {
  test('rounds to a whole percent and says "not yet" for null', () => {
    expect(percent(0.876)).toBe('88%');
    expect(percent(0)).toBe('0%');
    expect(percent(1)).toBe('100%');
    expect(percent(null)).toBe('not yet');
  });
});
