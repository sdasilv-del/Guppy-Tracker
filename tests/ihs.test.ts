import { describe, expect, test } from 'bun:test';

import { IHS_FEMALE, IHS_MALE, ihsCategories, ihsMaxTotal, labelOf, TAIL_OPTIONS } from '@/lib/constants';
import { FEMALE_SHEET, femaleReasonOptions } from '@/lib/ihs-female';

const sum = (xs: { max: number }[]) => xs.reduce((s, x) => s + x.max, 0);

describe('IHS score sheets', () => {
  test('category maximums add up to the sheet total', () => {
    expect(sum(IHS_MALE)).toBe(ihsMaxTotal('M'));
    expect(sum(IHS_FEMALE)).toBe(ihsMaxTotal('F'));
    expect(ihsCategories('M')).toBe(IHS_MALE);
    expect(ihsCategories('F')).toBe(IHS_FEMALE);
  });

  test('the female sheet matches the IHS female categories and scales', () => {
    expect(FEMALE_SHEET.map((c) => [c.key, c.max])).toEqual(IHS_FEMALE.map((c) => [c.key, c.max]));
    for (const c of FEMALE_SHEET) {
      expect(Math.max(...c.scale.map((o) => o.points))).toBe(c.max);
      expect(Math.min(...c.scale.map((o) => o.points))).toBe(0);
    }
  });

  test('female reason ids are unique, since they are saved with evaluations', () => {
    const ids = FEMALE_SHEET.flatMap((c) => c.reasons.reasons.map((r) => r.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(femaleReasonOptions('vitality')?.reasons.some((r) => r.id === 'fv_free')).toBe(true);
    expect(femaleReasonOptions('nope')).toBeUndefined();
  });
});

describe('labelOf', () => {
  test('finds a label, or blank for unknown values', () => {
    expect(labelOf(TAIL_OPTIONS, 'A1')).toBe('A1 Fan tail');
    expect(labelOf(TAIL_OPTIONS, 'U')).toBe('Not sure yet');
    expect(labelOf(TAIL_OPTIONS, null)).toBe('');
  });
});
