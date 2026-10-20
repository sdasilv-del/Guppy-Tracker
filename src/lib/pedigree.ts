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
