import { makeKinship } from '@/lib/kinship';
import type { Fish } from '@/lib/types';

export type Scheme = 'siblings' | 'to_sire' | 'to_dam' | 'outcross';

export type PlanStep = { scheme: Scheme; outcross_id: string | null };

export type LinePlan = {
  id: string;
  name: string;
  sire_id: string | null;
  dam_id: string | null;
  steps: PlanStep[];
  notes: string | null;
  updated_at: string;
};

export const SCHEMES: { value: Scheme; label: string }[] = [
  { value: 'siblings', label: 'Brother × sister' },
  { value: 'to_sire', label: 'Daughter × her father' },
  { value: 'to_dam', label: 'Son × his mother' },
  { value: 'outcross', label: 'Outcross' },
];

export type PlannedGeneration = {
  number: number;
  // Who the parents of this generation are, as fish codes or "G2 son" style names.
  parents: string;
  inbreeding: number;
};

// Above these, the plan warns: 25% is a brother × sister cross from unrelated parents.
export const TIGHT = 0.25;
export const VERY_TIGHT = 0.375;

// Works out each planned generation's inbreeding by adding stand-in fish to the real pedigree.
// Generation 1 is the fry of the starting pair; each step says how generation N is bred to make N + 1.
export function planGenerations(allFish: Fish[], sireId: string, damId: string, steps: PlanStep[]): PlannedGeneration[] {
  const byId = new Map(allFish.map((f) => [f.id, f]));
  const names = new Map<string, string>();
  const code = (id: string) => byId.get(id)?.fish_code ?? names.get(id) ?? '?';
  const virtual: Fish[] = [];
  const stub = (id: string, sex: 'M' | 'F', sire: string, dam: string, name: string) => {
    names.set(id, name);
    virtual.push({ ...(allFish[0] ?? {}), id, sex, sire_id: sire, dam_id: dam, fish_code: name } as Fish);
  };

  const result: PlannedGeneration[] = [];
  let sire = sireId;
  let dam = damId;
  for (let n = 1; n <= steps.length + 1; n++) {
    const kin = makeKinship([...allFish, ...virtual]);
    result.push({ number: n, parents: `${code(sire)} × ${code(dam)}`, inbreeding: kin.offspringInbreeding(sire, dam) });
    // Two full siblings stand for generation n: one son, one daughter.
    const son = `plan-g${n}-m`;
    const daughter = `plan-g${n}-f`;
    stub(son, 'M', sire, dam, `G${n} son`);
    stub(daughter, 'F', sire, dam, `G${n} daughter`);
    const step = steps[n - 1];
    if (!step) break;
    const outcross = step.outcross_id ? byId.get(step.outcross_id) : undefined;
    if (step.scheme === 'siblings') [sire, dam] = [son, daughter];
    else if (step.scheme === 'to_sire') [sire, dam] = [sire, daughter];
    else if (step.scheme === 'to_dam') [sire, dam] = [son, dam];
    else if (outcross) [sire, dam] = outcross.sex === 'F' ? [son, outcross.id] : [outcross.id, daughter];
    else break;
  }
  return result;
}
