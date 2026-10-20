import type { Fish } from '@/lib/types';

export const PEDIGREE_DEPTH = 4;

// Columns of ancestors: [the fish], [sire, dam], [sire's sire, sire's dam, dam's sire, dam's dam], ...
// Unknown parents are null, so every column is twice as long as the one before.
export function pedigreeColumns(fish: Fish, byId: Record<string, Fish>, depth = PEDIGREE_DEPTH): (Fish | null)[][] {
  const columns: (Fish | null)[][] = [[fish]];
  for (let g = 1; g <= depth; g++) {
    columns.push(
      columns[g - 1].flatMap((f) => [
        f?.sire_id ? byId[f.sire_id] ?? null : null,
        f?.dam_id ? byId[f.dam_id] ?? null : null,
      ]),
    );
  }
  return columns;
}

// Ancestors that turn up more than once, a sign of line breeding or inbreeding.
export function repeatedAncestors(columns: (Fish | null)[][]): { fish: Fish; count: number }[] {
  const counts = new Map<string, { fish: Fish; count: number }>();
  for (const column of columns.slice(1)) {
    for (const f of column) {
      if (!f) continue;
      const entry = counts.get(f.id) ?? { fish: f, count: 0 };
      entry.count += 1;
      counts.set(f.id, entry);
    }
  }
  return [...counts.values()].filter((e) => e.count > 1).sort((a, b) => b.count - a.count);
}

// How an ancestor in the tree is related to the fish, e.g. "Sire's dam" for column 2, slot 1.
export function relationLabel(generation: number, index: number): string {
  if (generation === 0) return 'This fish';
  const parts: string[] = [];
  for (let bit = generation - 1; bit >= 0; bit--) parts.push((index >> bit) & 1 ? 'dam' : 'sire');
  const label = parts.join("'s ");
  return label[0].toUpperCase() + label.slice(1);
}

// Enough generations to reach the oldest recorded ancestor in any real line, and a stop for bad data.
export const ALL_GENERATIONS = 50;

// A fish's recorded ancestors, fetched one generation at a time: parents, then grandparents, and so on.
// Each ancestor is fetched once even when it turns up on both sides. Ids are sorted so the same tree
// asks for the same rows, which lets screens share the cached answer.
export async function collectAncestors(
  fish: Fish,
  fetchByIds: (ids: string[]) => Promise<Fish[]>,
  generations = PEDIGREE_DEPTH,
): Promise<Fish[]> {
  const found = new Map<string, Fish>();
  const seen = new Set<string>([fish.id]);
  let level: Fish[] = [fish];
  for (let g = 1; g <= generations && level.length > 0; g++) {
    const ids = [...new Set(level.flatMap((f) => [f.sire_id, f.dam_id]))]
      .filter((p): p is string => !!p && !seen.has(p))
      .sort();
    if (ids.length === 0) break;
    for (const p of ids) seen.add(p);
    level = await fetchByIds(ids);
    for (const f of level) found.set(f.id, f);
  }
  return [...found.values()];
}
