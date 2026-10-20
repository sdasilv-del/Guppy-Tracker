import { describe, expect, test } from 'bun:test';

import { relationLabel } from '@/lib/pedigree';
import { scoreHistorySummary } from '@/lib/scores';

describe('relationLabel', () => {
  test('names each ancestor by its path from the fish', () => {
    expect(relationLabel(0, 0)).toBe('This fish');
    expect(relationLabel(1, 0)).toBe('Sire');
    expect(relationLabel(1, 1)).toBe('Dam');
    expect(relationLabel(2, 1)).toBe("Sire's dam");
    expect(relationLabel(2, 2)).toBe("Dam's sire");
    expect(relationLabel(3, 5)).toBe("Dam's sire's dam");
  });
});

describe('scoreHistorySummary', () => {
  const date = (iso: string) => iso;
  test('says first, latest and highest', () => {
    expect(
      scoreHistorySummary(
        [
          { total: 80, sex: 'M', evaluated_on: '2026-03-01' },
          { total: 88, sex: 'M', evaluated_on: '2026-06-01' },
          { total: 86.5, sex: 'M', evaluated_on: '2026-09-01' },
        ],
        date,
      ),
    ).toBe('3 scores. First 80 out of 100 on 2026-03-01. Latest 86.5 out of 100 on 2026-09-01. Highest 88 out of 100 on 2026-06-01.');
  });
  test('notes when the latest is the highest', () => {
    expect(
      scoreHistorySummary(
        [
          { total: 80, sex: 'M', evaluated_on: '2026-03-01' },
          { total: 90, sex: 'M', evaluated_on: '2026-06-01' },
        ],
        date,
      ),
    ).toBe('2 scores. First 80 out of 100 on 2026-03-01. Latest 90 out of 100 on 2026-06-01. Highest was the latest.');
  });
});
