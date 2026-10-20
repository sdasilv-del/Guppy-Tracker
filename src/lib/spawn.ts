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

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(fromISO: string, toISO: string): number {
  return Math.round((Date.parse(`${toISO}T00:00:00Z`) - Date.parse(`${fromISO}T00:00:00Z`)) / DAY_MS);
}

export type SpawnResult = {
  born: number;
  // Share of fry still alive at 4 and 8 weeks, from the losses logged before then. Null until the batch is that old.
  survival4: number | null;
  survival8: number | null;
  keepers: number;
  // Keepers are the fry picked to become fish.
  keeperRate: number | null;
};

export function spawnResult(spawn: Spawn, events: SpawnEvent[], picks: Fish[], today: string): SpawnResult {
  const age = daysBetween(spawn.born_on, today);
  const lostBy = (days: number) =>
    events
      .filter((e) => e.spawn_id === spawn.id && e.kind === 'loss' && daysBetween(spawn.born_on, e.happened_on) < days)
      .reduce((sum, e) => sum + (e.count ?? 0), 0);
  const survival = (days: number) =>
    age < days || spawn.fry_count === 0 ? null : Math.max(0, spawn.fry_count - lostBy(days)) / spawn.fry_count;
  const keepers = picks.filter((f) => f.spawn_id === spawn.id).length;
  return {
    born: spawn.fry_count,
    survival4: survival(28),
    survival8: survival(56),
    keepers,
    keeperRate: spawn.fry_count > 0 ? keepers / spawn.fry_count : null,
  };
}

export type ResultGroup = {
  key: string;
  spawns: number;
  born: number;
  averageFry: number;
  survival8: number | null;
  keepers: number;
  keepersPerSpawn: number;
};

// Adds up spawn results for each pair or strain, so the best producers stand out.
export function groupResults(items: { key: string; result: SpawnResult }[]): ResultGroup[] {
  const groups = new Map<string, SpawnResult[]>();
  for (const { key, result } of items) groups.set(key, [...(groups.get(key) ?? []), result]);
  return [...groups.entries()]
    .map(([key, results]) => {
      const born = results.reduce((s, r) => s + r.born, 0);
      const old = results.filter((r) => r.survival8 !== null);
      const oldBorn = old.reduce((s, r) => s + r.born, 0);
      const keepers = results.reduce((s, r) => s + r.keepers, 0);
      return {
        key,
        spawns: results.length,
        born,
        averageFry: born / results.length,
        // Weighted by fry, so a batch of 40 counts more than a batch of 4.
        survival8: oldBorn > 0 ? old.reduce((s, r) => s + r.survival8! * r.born, 0) / oldBorn : null,
        keepers,
        keepersPerSpawn: keepers / results.length,
      };
    })
    .sort((a, b) => b.keepersPerSpawn - a.keepersPerSpawn || b.averageFry - a.averageFry);
}

export function percent(value: number | null): string {
  return value === null ? 'not yet' : `${Math.round(value * 100)}%`;
}
