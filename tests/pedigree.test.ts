import { describe, expect, test } from 'bun:test';

import { makeKinship } from '@/lib/kinship';
import { collectAncestors, pedigreeColumns, PEDIGREE_DEPTH } from '@/lib/pedigree';
import type { Fish } from '@/lib/types';

import { makeFish } from './fixtures';

// Six generations of a line bred brother to sister, plus a sibling and an unrelated fish.
//   G0a x G0b -> G1a, G1b -> G2a, G2b -> ... -> G5a, G5b -> T, T2
const line: Fish[] = [makeFish({ id: 'G0a' }), makeFish({ id: 'G0b', sex: 'F' })];
for (let g = 1; g <= 5; g++) {
  line.push(makeFish({ id: `G${g}a`, sire_id: `G${g - 1}a`, dam_id: `G${g - 1}b` }));
  line.push(makeFish({ id: `G${g}b`, sex: 'F', sire_id: `G${g - 1}a`, dam_id: `G${g - 1}b` }));
}
const target = makeFish({ id: 'T', sire_id: 'G5a', dam_id: 'G5b' });
const sibling = makeFish({ id: 'T2', sire_id: 'G5a', dam_id: 'G5b' });
const stranger = makeFish({ id: 'X' });
const all = [...line, target, sibling, stranger];

function fakeFetch() {
  const calls: string[][] = [];
  const byId = new Map(all.map((f) => [f.id, f]));
  const fetch = async (ids: string[]) => {
    calls.push(ids);
    return ids.map((id) => byId.get(id)).filter((f): f is Fish => !!f);
  };
  return { calls, fetch };
}

describe('collectAncestors', () => {
  test('fetches one generation per request, each fish once, ids sorted', async () => {
    const { calls, fetch } = fakeFetch();
    const found = await collectAncestors(target, fetch, 50);
    expect(found.map((f) => f.id).sort()).toEqual(line.map((f) => f.id).sort());
    expect(calls).toEqual([
      ['G5a', 'G5b'],
      ['G4a', 'G4b'],
      ['G3a', 'G3b'],
      ['G2a', 'G2b'],
      ['G1a', 'G1b'],
      ['G0a', 'G0b'],
    ]);
  });

  test('stops at the given depth', async () => {
    const { calls, fetch } = fakeFetch();
    const found = await collectAncestors(target, fetch, 2);
    expect(found.map((f) => f.id).sort()).toEqual(['G4a', 'G4b', 'G5a', 'G5b']);
    expect(calls.length).toBe(2);
  });

  test('makes no request for a fish without recorded parents', async () => {
    const { calls, fetch } = fakeFetch();
    expect(await collectAncestors(stranger, fetch)).toEqual([]);
    expect(calls).toEqual([]);
  });

  test('a loop in bad data does not run forever', async () => {
    const a = makeFish({ id: 'loopA', sire_id: 'loopB' });
    const b = makeFish({ id: 'loopB', sire_id: 'loopA' });
    const found = await collectAncestors(a, async (ids) => [a, b].filter((f) => ids.includes(f.id)), 50);
    expect(found.map((f) => f.id)).toEqual(['loopB']);
  });

  test('the fish and all its ancestors give the same inbreeding as every fish in the account', async () => {
    const { fetch } = fakeFetch();
    const lineage = [target, ...(await collectAncestors(target, fetch, 50))];
    const full = makeKinship(all);
    const partial = makeKinship(lineage);
    expect(partial.inbreeding('T')).toBeCloseTo(full.inbreeding('T'), 12);
    expect(partial.generationsKnown('T')).toBe(full.generationsKnown('T'));
    expect(full.inbreeding('T')).toBeGreaterThan(0.25);
  });

  test('the pedigree depth is enough to draw the pedigree columns', async () => {
    const { fetch } = fakeFetch();
    const byId = Object.fromEntries([target, ...(await collectAncestors(target, fetch))].map((f) => [f.id, f]));
    const fullById = Object.fromEntries(all.map((f) => [f.id, f]));
    expect(pedigreeColumns(target, byId, PEDIGREE_DEPTH)).toEqual(pedigreeColumns(target, fullById, PEDIGREE_DEPTH));
  });
});
