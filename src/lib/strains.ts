import { INACTIVE_STATUSES } from '@/lib/constants';
import type { Evaluation, Fish } from '@/lib/types';

type Score = Pick<Evaluation, 'fish_id' | 'sex' | 'total'>;

export type ScoreStats = { count: number; average: number | null; best: { fish: Fish; total: number } | null };

export type GenerationStats = {
  generation: string;
  fish: Fish[];
  active: number;
  males: number;
  females: number;
  unknown: number;
  maleScores: ScoreStats;
  femaleScores: ScoreStats;
};

export type StrainSummary = { name: string; fish: number; active: number; generations: string[] };

// Orders generations as breeders count them: P, F1, F2 ... then anything else alphabetically.
export function generationOrder(a: string, b: string): number {
  const rank = (g: string) => {
    const t = g.trim().toUpperCase();
    if (t === 'P' || t === 'P0' || t === 'F0') return 0;
    const m = t.match(/^F(\d+)$/);
    return m ? Number(m[1]) : Number.POSITIVE_INFINITY;
  };
  const d = rank(a) - rank(b);
  return Number.isNaN(d) || d === 0 ? a.localeCompare(b) : d;
}

const NO_GENERATION = 'No generation';

export function listStrains(fish: Fish[]): StrainSummary[] {
  const byName = new Map<string, Fish[]>();
  for (const f of fish) {
    const name = f.strain?.trim();
    if (!name) continue;
    byName.set(name, [...(byName.get(name) ?? []), f]);
  }
  return [...byName.entries()]
    .map(([name, list]) => ({
      name,
      fish: list.length,
      active: list.filter((f) => !INACTIVE_STATUSES.includes(f.status)).length,
      generations: [...new Set(list.map((f) => f.generation?.trim() || NO_GENERATION))].sort(generationOrder),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Each fish counts once, with its best score, so a fish judged five times doesn't outweigh one judged once.
function scoreStats(fish: Fish[], scores: Score[], sex: 'M' | 'F'): ScoreStats {
  const best = new Map<string, number>();
  for (const s of scores) {
    if (s.sex !== sex) continue;
    const total = Number(s.total);
    const previous = best.get(s.fish_id);
    if (previous === undefined || total > previous) best.set(s.fish_id, total);
  }
  const judged = fish.filter((f) => best.has(f.id)).map((f) => ({ fish: f, total: best.get(f.id)! }));
  if (judged.length === 0) return { count: 0, average: null, best: null };
  const sum = judged.reduce((acc, j) => acc + j.total, 0);
  const top = judged.reduce((a, b) => (b.total > a.total ? b : a));
  return { count: judged.length, average: sum / judged.length, best: top };
}

export function strainGenerations(strain: string, fish: Fish[], scores: Score[]): GenerationStats[] {
  const inStrain = fish.filter((f) => f.strain?.trim() === strain);
  const byGen = new Map<string, Fish[]>();
  for (const f of inStrain) {
    const g = f.generation?.trim() || NO_GENERATION;
    byGen.set(g, [...(byGen.get(g) ?? []), f]);
  }
  return [...byGen.entries()]
    .sort(([a], [b]) => generationOrder(a, b))
    .map(([generation, list]) => ({
      generation,
      fish: list,
      active: list.filter((f) => !INACTIVE_STATUSES.includes(f.status)).length,
      males: list.filter((f) => f.sex === 'M').length,
      females: list.filter((f) => f.sex === 'F').length,
      unknown: list.filter((f) => f.sex === 'U').length,
      maleScores: scoreStats(list, scores, 'M'),
      femaleScores: scoreStats(list, scores, 'F'),
    }));
}
