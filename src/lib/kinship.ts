import type { Fish } from '@/lib/types';

// Close relationships between fish in a group, from recorded sires and dams.
export function closeRelations(members: Fish[]): string[] {
  const notes: string[] = [];
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const a = members[i];
      const b = members[j];
      if (a.sire_id === b.id || a.dam_id === b.id) notes.push(`${b.fish_code} is a parent of ${a.fish_code}`);
      else if (b.sire_id === a.id || b.dam_id === a.id) notes.push(`${a.fish_code} is a parent of ${b.fish_code}`);
      else {
        const sameSire = !!a.sire_id && a.sire_id === b.sire_id;
        const sameDam = !!a.dam_id && a.dam_id === b.dam_id;
        if (sameSire && sameDam) notes.push(`${a.fish_code} and ${b.fish_code} are full siblings`);
        else if (sameSire || sameDam) notes.push(`${a.fish_code} and ${b.fish_code} are half siblings`);
      }
    }
  }
  return notes;
}

// Wright's inbreeding coefficient from the recorded sires and dams.
// inbreeding(fish) is the chance that both copies of a gene came from the same ancestor:
// 25% for a full-sibling or parent-offspring cross, 12.5% for half siblings, 6.25% for first cousins.
// Only recorded ancestors count, so a fish with unknown grandparents may be more inbred than shown.
export function makeKinship(fish: Fish[]) {
  const byId = new Map(fish.map((f) => [f.id, f]));
  const depthMemo = new Map<string, number>();
  const kinMemo = new Map<string, number>();
  const inbreedingMemo = new Map<string, number>();

  // How many recorded generations sit above a fish. An ancestor always has a smaller depth.
  function depth(id: string, seen = new Set<string>()): number {
    const memo = depthMemo.get(id);
    if (memo !== undefined) return memo;
    const f = byId.get(id);
    if (!f || seen.has(id)) return 0; // unknown fish, or a loop in bad data
    seen.add(id);
    const d = 1 + Math.max(f.sire_id ? depth(f.sire_id, seen) : -1, f.dam_id ? depth(f.dam_id, seen) : -1);
    seen.delete(id);
    depthMemo.set(id, d);
    return d;
  }

  function kinship(a: string | null, b: string | null, guard = 0): number {
    if (!a || !b || !byId.has(a) || !byId.has(b) || guard > 200) return 0;
    if (a === b) return 0.5 * (1 + inbreeding(a, guard + 1));
    // Recurse on the fish further down the tree, which can't be an ancestor of the other.
    if (depth(a) < depth(b)) [a, b] = [b, a];
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    const memo = kinMemo.get(key);
    if (memo !== undefined) return memo;
    const f = byId.get(a)!;
    const k = 0.5 * (kinship(f.sire_id, b, guard + 1) + kinship(f.dam_id, b, guard + 1));
    kinMemo.set(key, k);
    return k;
  }

  function inbreeding(id: string, guard = 0): number {
    const memo = inbreedingMemo.get(id);
    if (memo !== undefined) return memo;
    const f = byId.get(id);
    const value = f ? kinship(f.sire_id, f.dam_id, guard + 1) : 0;
    inbreedingMemo.set(id, value);
    return value;
  }

  return {
    inbreeding: (id: string) => inbreeding(id),
    // The inbreeding of fry from this pair.
    offspringInbreeding: (sireId: string, damId: string) => kinship(sireId, damId),
    // Recorded generations behind a fish, to say how far back the figure reaches.
    generationsKnown: (id: string) => depth(id),
  };
}

export function formatInbreeding(value: number): string {
  const pct = value * 100;
  return `${parseFloat(pct.toFixed(pct < 10 ? 2 : 1))}%`;
}

// Recorded ancestors two fish have in common, closest first, e.g. a grandsire on both sides.
export function sharedAncestors(fish: Fish[], aId: string, bId: string): Fish[] {
  const byId = new Map(fish.map((f) => [f.id, f]));
  function ancestors(id: string): Map<string, number> {
    const found = new Map<string, number>();
    let level: string[] = [id];
    for (let gen = 1; level.length > 0 && gen <= 30; gen++) {
      const next: string[] = [];
      for (const x of level) {
        const f = byId.get(x);
        for (const p of [f?.sire_id, f?.dam_id]) {
          if (p && byId.has(p) && !found.has(p)) {
            found.set(p, gen);
            next.push(p);
          }
        }
      }
      level = next;
    }
    return found;
  }
  const a = ancestors(aId);
  const b = ancestors(bId);
  // One fish can be the other's ancestor too.
  if (b.has(aId)) a.set(aId, 0);
  if (a.has(bId)) b.set(bId, 0);
  const shared = [...a.keys()].filter((id) => b.has(id));
  // Leave out ancestors of a shared ancestor: naming the grandparent explains the great-grandparents.
  const covered = new Set<string>();
  for (const id of shared) for (const anc of ancestors(id).keys()) covered.add(anc);
  return shared
    .filter((id) => !covered.has(id))
    .sort((x, y) => a.get(x)! + b.get(x)! - (a.get(y)! + b.get(y)!))
    .map((id) => byId.get(id)!);
}

// What the number means, so breeders don't have to remember the reference points.
export function inbreedingMeaning(value: number): string {
  if (value === 0) return 'No shared ancestors on record.';
  if (value < 0.0625) return 'Lower than first cousins. Usually safe for line breeding.';
  if (value < 0.125) return 'About first cousins (6.25%).';
  if (value < 0.25) return 'About half siblings (12.5%). Watch for weaker fry.';
  return 'Brother and sister level (25%) or closer. Expect weaker fry unless the line is tested.';
}
