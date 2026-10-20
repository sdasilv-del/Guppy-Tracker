import type { Fish } from '@/lib/types';

export type GeneMode = 'recessive' | 'dominant' | 'x_linked' | 'y_linked';

export type Gene = { id: string; name: string; mode: GeneMode; notes: string | null };

export type FishGene = { fish_id: string; gene_id: string; copies: number };

export const GENE_MODES: { value: GeneMode; label: string; help: string }[] = [
  { value: 'recessive', label: 'Recessive', help: 'Shows only with two copies, e.g. blond or albino.' },
  { value: 'dominant', label: 'Dominant', help: 'Shows with one copy.' },
  { value: 'x_linked', label: 'On the X', help: 'Sons get it from their mother, daughters from both parents.' },
  { value: 'y_linked', label: 'On the Y', help: 'Passed from father to every son, never to daughters.' },
];

// Common examples to start from. Breeders can add their own genes with any inheritance.
export const GENE_PRESETS: { name: string; mode: GeneMode }[] = [
  { name: 'Blond', mode: 'recessive' },
  { name: 'Golden', mode: 'recessive' },
  { name: 'Albino', mode: 'recessive' },
  { name: 'Ribbon', mode: 'dominant' },
];

// The choices for one fish and gene, as copies of the gene and what that means.
export function copyOptions(mode: GeneMode, sex: Fish['sex']): { value: number; label: string }[] {
  if (mode === 'y_linked') {
    return sex === 'F' ? [] : [{ value: 1, label: 'Has it' }, { value: 0, label: "Doesn't have it" }];
  }
  if (mode === 'x_linked' && sex === 'M') return [{ value: 1, label: 'Has it' }, { value: 0, label: "Doesn't have it" }];
  if (mode === 'recessive') {
    return [{ value: 2, label: 'Shows it' }, { value: 1, label: 'Carrier' }, { value: 0, label: "Doesn't carry it" }];
  }
  return [{ value: 2, label: 'Two copies' }, { value: 1, label: 'One copy' }, { value: 0, label: 'None' }];
}

export function copiesLabel(mode: GeneMode, sex: Fish['sex'], copies: number): string {
  return copyOptions(mode, sex).find((o) => o.value === copies)?.label ?? '';
}

// Recessive carriers that can be told from the parents: a fish that doesn't show a recessive gene
// but has a parent who shows it must carry one copy.
export function inferredCarrier(fish: Fish, gene: Gene, copiesOf: (fishId: string) => number | undefined): boolean {
  if (gene.mode !== 'recessive') return false;
  return [fish.sire_id, fish.dam_id].some((p) => !!p && copiesOf(p) === 2);
}

export type Prediction = { gene: Gene; lines: string[]; missing: string[] };

const pct = (p: number) => `${Math.round(p * 100)}%`;

// What fry from this pair should show, gene by gene. Each parent's gene must be recorded to predict it.
export function predict(sire: Fish, dam: Fish, genes: Gene[], records: FishGene[]): Prediction[] {
  const copies = (fishId: string, geneId: string) =>
    records.find((r) => r.fish_id === fishId && r.gene_id === geneId)?.copies;
  return genes.map((gene) => {
    const s = copies(sire.id, gene.id);
    const d = copies(dam.id, gene.id);
    const needDam = gene.mode !== 'y_linked';
    const missing = [s === undefined ? sire.fish_code : null, needDam && d === undefined ? dam.fish_code : null].filter(
      (c): c is string => !!c,
    );
    if (missing.length > 0) return { gene, lines: [], missing };
    const sv = s!;
    const dv = d ?? 0;
    if (gene.mode === 'y_linked') {
      return { gene, lines: [sv >= 1 ? 'Every son has it. Daughters never do.' : 'No fry get it.'], missing };
    }
    if (gene.mode === 'x_linked') {
      // Sons take the mother's X. Daughters take the father's X and one of the mother's.
      const fromDam = dv / 2;
      const fromSire = sv >= 1 ? 1 : 0;
      const two = fromSire * fromDam;
      const one = fromSire * (1 - fromDam) + (1 - fromSire) * fromDam;
      const daughter = [two > 0 ? `${pct(two)} two copies` : null, one > 0 ? `${pct(one)} one copy` : null]
        .filter(Boolean)
        .join(', ');
      return {
        gene,
        lines: [`Sons: ${pct(fromDam)} have it.`, `Daughters: ${daughter || 'none get it'}.`],
        missing,
      };
    }
    const ps = sv / 2;
    const pd = dv / 2;
    const two = ps * pd;
    const one = ps * (1 - pd) + pd * (1 - ps);
    if (gene.mode === 'recessive') {
      const lines = [`${pct(two)} of fry show it.`];
      if (one > 0) lines.push(`${pct(one)} carry it without showing.`);
      return { gene, lines, missing };
    }
    const lines = [`${pct(two + one)} of fry have it.`];
    if (two > 0) lines.push(`${pct(two)} with two copies, so all their fry will have it.`);
    return { gene, lines, missing };
  });
}
