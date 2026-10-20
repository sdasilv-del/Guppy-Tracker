import { describe, expect, test } from 'bun:test';

import { bestPlacings, bestScores, littermates, resultsByFish, type ScoreSummary } from '@/lib/scores';

import { makeEntry, makeFish } from './fixtures';

const score = (fish_id: string, sex: 'M' | 'F', total: number, kind: ScoreSummary['kind'] = 'breeder'): ScoreSummary => ({ fish_id, sex, total, kind });

describe('bestScores', () => {
  test('keeps the highest share of the maximum for each fish', () => {
    const best = bestScores([score('a', 'M', 70), score('a', 'M', 86.5), score('b', 'F', 7)]);
    expect(best.get('a')?.total).toBe(86.5);
    expect(best.get('b')?.total).toBe(7);
  });

  test('compares scores out of 10 and out of 100 fairly', () => {
    const best = bestScores([score('a', 'M', 85), score('a', 'F', 9)]);
    expect(best.get('a')?.sex).toBe('F');
  });

  test('prefers an official result on a tie', () => {
    const best = bestScores([score('a', 'M', 80, 'breeder'), score('a', 'M', 80, 'official'), score('a', 'M', 80, 'practice')]);
    expect(best.get('a')?.kind).toBe('official');
  });
});

describe('bestPlacings', () => {
  test('keeps the best numbered placing and ignores unnumbered ones', () => {
    const placings = bestPlacings([
      makeEntry({ fish_id: 'a', placement: '3rd', show_name: 'Spring' }),
      makeEntry({ fish_id: 'a', placement: ' 1st ', show_name: 'Trans Canada' }),
      makeEntry({ fish_id: 'a', placement: '2nd', show_name: 'Fall' }),
      makeEntry({ fish_id: 'b', placement: 'HM', show_name: 'Fall' }),
      makeEntry({ fish_id: 'c', placement: null }),
    ]);
    expect(placings.get('a')).toBe('1st, Trans Canada');
    expect(placings.has('b')).toBe(false);
    expect(placings.has('c')).toBe(false);
  });
});

describe('littermates', () => {
  test('finds fish from the same spawn, sorted by code, without the fish itself', () => {
    const me = makeFish({ id: 'm', fish_code: 'B', spawn_id: 's1' });
    const all = [
      me,
      makeFish({ fish_code: 'C', spawn_id: 's1' }),
      makeFish({ fish_code: 'A', spawn_id: 's1' }),
      makeFish({ fish_code: 'D', spawn_id: 's2' }),
    ];
    expect(littermates(me, all).map((f) => f.fish_code)).toEqual(['A', 'C']);
  });

  test('falls back to the same sire and dam when no spawn is recorded', () => {
    const me = makeFish({ id: 'm', sire_id: 'S', dam_id: 'D' });
    const full = makeFish({ fish_code: 'FULL', sire_id: 'S', dam_id: 'D' });
    const half = makeFish({ fish_code: 'HALF', sire_id: 'S', dam_id: 'E' });
    expect(littermates(me, [me, full, half]).map((f) => f.fish_code)).toEqual(['FULL']);
  });

  test('finds none when the parents are not known', () => {
    const me = makeFish({ id: 'm', sire_id: 'S' });
    expect(littermates(me, [me, makeFish({ sire_id: 'S' })])).toEqual([]);
  });
});

describe('resultsByFish', () => {
  test('joins the best score and placing in one line', () => {
    const results = resultsByFish(
      [score('a', 'M', 86.5), score('c', 'F', 8)],
      [makeEntry({ fish_id: 'a', placement: '1st', show_name: 'Trans Canada' }), makeEntry({ fish_id: 'b', placement: '2nd', show_name: 'Fall' })],
    );
    expect(results.get('a')).toBe('IHS 86.5 / 100 · 1st, Trans Canada');
    expect(results.get('b')).toBe('2nd, Fall');
    expect(results.get('c')).toBe('IHS 8 / 10');
  });
});
