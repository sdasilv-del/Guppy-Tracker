import { ihsMaxTotal } from '@/lib/constants';
import type { Evaluation, Fish, ShowEntry } from '@/lib/types';

// Each fish's best IHS score and show placing, for showing a line's results beside its fish:
// littermates on a fish's page, and ancestors on the pedigree and certificate. Sold fish count
// too, so a show fish that was auctioned still speaks for its brothers and sisters.

export type ScoreSummary = Pick<Evaluation, 'fish_id' | 'sex' | 'total' | 'kind'>;

// The highest share of the maximum, official results first on a tie.
export function bestScores<T extends ScoreSummary>(evaluations: T[]): Map<string, T> {
  const rank = (e: T) => e.total / ihsMaxTotal(e.sex) + (e.kind === 'official' ? 1e-6 : 0);
  const best = new Map<string, T>();
  for (const e of evaluations) {
    const current = best.get(e.fish_id);
    if (!current || rank(e) > rank(current)) best.set(e.fish_id, e);
  }
  return best;
}

export function scoreLabel(e: ScoreSummary): string {
  return `${e.total} / ${ihsMaxTotal(e.sex)}`;
}

function placeNumber(placement: string | null): number {
  const place = Number(placement?.trim().match(/^(\d+)/)?.[1]);
  return Number.isInteger(place) && place > 0 ? place : Infinity;
}

// The best placing each fish has had at a show, e.g. "1st, Trans Canada".
export function bestPlacings(entries: ShowEntry[]): Map<string, string> {
  const best = new Map<string, ShowEntry>();
  for (const e of entries) {
    if (placeNumber(e.placement) === Infinity) continue;
    const current = best.get(e.fish_id);
    if (!current || placeNumber(e.placement) < placeNumber(current.placement)) best.set(e.fish_id, e);
  }
  return new Map([...best].map(([id, e]) => [id, `${e.placement!.trim()}, ${e.show_name}`]));
}

// Brothers and sisters: fish from the same spawn, or with the same sire and dam when the spawn isn't recorded.
export function littermates(fish: Fish, allFish: Fish[]): Fish[] {
  return allFish
    .filter((f) => {
      if (f.id === fish.id) return false;
      if (fish.spawn_id) return f.spawn_id === fish.spawn_id;
      return !!fish.sire_id && !!fish.dam_id && f.sire_id === fish.sire_id && f.dam_id === fish.dam_id;
    })
    .sort((a, b) => a.fish_code.localeCompare(b.fish_code));
}
