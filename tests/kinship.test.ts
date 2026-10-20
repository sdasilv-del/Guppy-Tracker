import { describe, expect, test } from 'bun:test';

import { closeRelations, formatInbreeding, inbreedingMeaning, makeKinship, sharedAncestors } from '@/lib/kinship';

import { makeFish } from './fixtures';

// A small family tree:
//   S x D -> A (M), B (F), C (F)   full siblings
//   S x E -> H (F)                  half sibling of A, B, C
//   X x Y -> Z (M)
//   A x B -> K (M)                  inbred (full-sib mating)
//   Z x C -> P (M), W x H -> Q (F)  P and Q are cousins via S
const S = makeFish({ id: 'S', fish_code: 'S', sex: 'M', foundation: true });
const D = makeFish({ id: 'D', fish_code: 'D', sex: 'F', foundation: true });
const E = makeFish({ id: 'E', fish_code: 'E', sex: 'F', foundation: true });
const X = makeFish({ id: 'X', fish_code: 'X', sex: 'M', foundation: true });
const Y = makeFish({ id: 'Y', fish_code: 'Y', sex: 'F', foundation: true });
const W = makeFish({ id: 'W', fish_code: 'W', sex: 'M', foundation: true });
const A = makeFish({ id: 'A', fish_code: 'A', sex: 'M', sire_id: 'S', dam_id: 'D' });
const B = makeFish({ id: 'B', fish_code: 'B', sex: 'F', sire_id: 'S', dam_id: 'D' });
const C = makeFish({ id: 'C', fish_code: 'C', sex: 'F', sire_id: 'S', dam_id: 'D' });
const H = makeFish({ id: 'H', fish_code: 'H', sex: 'F', sire_id: 'S', dam_id: 'E' });
const Z = makeFish({ id: 'Z', fish_code: 'Z', sex: 'M', sire_id: 'X', dam_id: 'Y' });
const K = makeFish({ id: 'K', fish_code: 'K', sex: 'M', sire_id: 'A', dam_id: 'B' });
const P = makeFish({ id: 'P', fish_code: 'P', sex: 'M', sire_id: 'Z', dam_id: 'C' });
const Q = makeFish({ id: 'Q', fish_code: 'Q', sex: 'F', sire_id: 'W', dam_id: 'H' });
const all = [S, D, E, X, Y, W, A, B, C, H, Z, K, P, Q];

describe('makeKinship', () => {
  const kin = makeKinship(all);

  test('full-sibling mating gives 25%', () => {
    expect(kin.offspringInbreeding('A', 'B')).toBeCloseTo(0.25, 10);
    expect(kin.inbreeding('K')).toBeCloseTo(0.25, 10);
  });

  test('half-sibling mating gives 12.5%', () => {
    expect(kin.offspringInbreeding('A', 'H')).toBeCloseTo(0.125, 10);
  });

  test('parent-offspring mating gives 25%', () => {
    expect(kin.offspringInbreeding('S', 'B')).toBeCloseTo(0.25, 10);
  });

  test('half first cousins (one shared grandparent) give 3.125%', () => {
    // P and Q share only grandsire S (their dams C and H are half sisters).
    expect(kin.offspringInbreeding('P', 'Q')).toBeCloseTo(0.03125, 10);
  });

  test('first cousins (both grandparents shared) give 6.25%', () => {
    const R = makeFish({ id: 'R', sex: 'F', sire_id: 'W', dam_id: 'B' });
    expect(makeKinship([...all, R]).offspringInbreeding('P', 'R')).toBeCloseTo(0.0625, 10);
  });

  test('unrelated and unknown fish give 0', () => {
    expect(kin.offspringInbreeding('A', 'Y')).toBe(0);
    expect(kin.inbreeding('A')).toBe(0);
    expect(kin.offspringInbreeding('A', 'missing')).toBe(0);
  });

  test('a mating with an inbred fish counts its own inbreeding', () => {
    // K is 25% inbred; K x B (son to mother) = 1/2 (kinship(A,B) + kinship(B,B)) = 1/2 (0.25 + 0.5) = 0.375
    expect(kin.offspringInbreeding('K', 'B')).toBeCloseTo(0.375, 10);
  });

  test('generationsKnown counts recorded generations', () => {
    expect(kin.generationsKnown('S')).toBe(0);
    expect(kin.generationsKnown('A')).toBe(1);
    expect(kin.generationsKnown('K')).toBe(2);
  });

  test('does not hang on a loop in bad data', () => {
    const loop = [makeFish({ id: 'L1', sire_id: 'L2' }), makeFish({ id: 'L2', sire_id: 'L1' })];
    const k = makeKinship(loop);
    expect(Number.isFinite(k.inbreeding('L1'))).toBe(true);
    expect(Number.isFinite(k.offspringInbreeding('L1', 'L2'))).toBe(true);
  });
});

describe('closeRelations', () => {
  test('names parents, full siblings and half siblings', () => {
    expect(closeRelations([S, A])).toEqual(['S is a parent of A']);
    expect(closeRelations([A, S])).toEqual(['S is a parent of A']);
    expect(closeRelations([A, B])).toEqual(['A and B are full siblings']);
    expect(closeRelations([A, H])).toEqual(['A and H are half siblings']);
  });

  test('says nothing about unrelated fish or fish with no parents on record', () => {
    expect(closeRelations([A, Z])).toEqual([]);
    expect(closeRelations([S, D, X])).toEqual([]);
  });
});

describe('sharedAncestors', () => {
  test('full siblings share both parents', () => {
    expect(sharedAncestors(all, 'A', 'B').map((f) => f.id).sort()).toEqual(['D', 'S']);
  });

  test('cousins share the grandparent, not the grandparent’s ancestors', () => {
    expect(sharedAncestors(all, 'P', 'Q').map((f) => f.id)).toEqual(['S']);
  });

  test('one fish can be the other’s ancestor', () => {
    expect(sharedAncestors(all, 'K', 'A').map((f) => f.id)).toEqual(['A']);
  });

  test('unrelated fish share nothing', () => {
    expect(sharedAncestors(all, 'A', 'Z')).toEqual([]);
  });
});

describe('formatInbreeding and inbreedingMeaning', () => {
  test('formats with 2 decimals under 10% and 1 decimal above, without trailing zeros', () => {
    expect(formatInbreeding(0)).toBe('0%');
    expect(formatInbreeding(0.0625)).toBe('6.25%');
    expect(formatInbreeding(0.125)).toBe('12.5%');
    expect(formatInbreeding(0.25)).toBe('25%');
    expect(formatInbreeding(1 / 3)).toBe('33.3%');
  });

  test('explains the reference points', () => {
    expect(inbreedingMeaning(0)).toMatch(/No shared ancestors/);
    expect(inbreedingMeaning(0.03125)).toMatch(/Lower than first cousins/);
    expect(inbreedingMeaning(0.125)).toMatch(/half siblings/);
    expect(inbreedingMeaning(0.25)).toMatch(/Brother and sister/);
  });
});
