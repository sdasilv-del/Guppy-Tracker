import type { Fish, Spawn, SpawnEvent } from '@/lib/types';

export type BatchSummary = {
  remaining: number;
  lost: number;
  culled: number;
  picked: number;
  sexing: SpawnEvent | null;
};

// The current fry count is worked out from the log: losses, culls and picks come off the count at birth.
// Moves don't change it, and the latest sexing is shown as it was recorded.
export function summarizeBatch(spawn: Spawn, events: SpawnEvent[], picks: Fish[]): BatchSummary {
  let lost = 0;
  let culled = 0;
  let sexing: SpawnEvent | null = null;
  for (const e of events) {
    if (e.spawn_id !== spawn.id) continue;
    if (e.kind === 'loss') lost += e.count ?? 0;
    if (e.kind === 'cull') culled += e.count ?? 0;
    if (e.kind === 'sexing') sexing = e;
  }
  const picked = picks.filter((f) => f.spawn_id === spawn.id).length;
  return { remaining: Math.max(0, spawn.fry_count - lost - culled - picked), lost, culled, picked, sexing };
}

// F2 parents give F3 fry. Uses the higher of the two parents' generations; blank when neither is F<number>.
export function nextGeneration(...parents: (Fish | null | undefined)[]): string | null {
  const numbers = parents
    .map((p) => p?.generation?.trim().match(/^F(\d+)$/i)?.[1])
    .filter((n): n is string => !!n)
    .map(Number);
  if (numbers.length === 0) return null;
  return `F${Math.max(...numbers) + 1}`;
}

export function eventSummary(e: SpawnEvent, tankNames: Record<string, string>): string {
  switch (e.kind) {
    case 'move':
      return `${e.count} moved to ${e.to_tank_id ? tankNames[e.to_tank_id] ?? 'a deleted tank' : 'no tank'}`;
    case 'loss':
      return [`${e.count} lost`, e.reason].filter(Boolean).join(' · ');
    case 'sexing':
      return `${e.males ?? 0} M · ${e.females ?? 0} F · ${e.unknown ?? 0} unknown`;
    case 'cull':
      return [
        `${e.count} culled`,
        e.reason,
        e.sold_on ? 'Sold' : e.for_sale ? 'For sale' : null,
      ]
        .filter(Boolean)
        .join(' · ');
  }
}
