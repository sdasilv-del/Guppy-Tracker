import type { Fish, ShowEntry } from '@/lib/types';

// Points for a placing when the show didn't give points: 1st 10, 2nd 8, 3rd 6, 4th 4, 5th 2.
const PLACE_POINTS = [10, 8, 6, 4, 2];

export function placementPoints(placement: string | null): number {
  const place = Number(placement?.trim().match(/^(\d+)/)?.[1]);
  return Number.isInteger(place) && place >= 1 && place <= PLACE_POINTS.length ? PLACE_POINTS[place - 1] : 0;
}

export function entryPoints(e: ShowEntry): { points: number; estimated: boolean } {
  return e.points !== null ? { points: e.points, estimated: false } : { points: placementPoints(e.placement), estimated: true };
}

export type Standing = {
  fish: Fish | null;
  fishId: string;
  points: number;
  entries: number;
  wins: number;
  estimated: boolean;
};

export type ClassTable = { name: string; standings: Standing[] };

export function seasons(entries: ShowEntry[]): number[] {
  return [...new Set(entries.map((e) => Number(e.shown_on.slice(0, 4))))].sort((a, b) => b - a);
}

// Season standings for each show class: fish ranked by points, classes in the order of most points.
// Class names are matched without regard to case or spaces, so "A1 male" and "a1 Male " are one class.
export function pointsTables(entries: ShowEntry[], fish: Fish[], season: number): ClassTable[] {
  const byId = new Map(fish.map((f) => [f.id, f]));
  const classes = new Map<string, { name: string; rows: Map<string, Standing> }>();
  for (const e of entries) {
    if (Number(e.shown_on.slice(0, 4)) !== season) continue;
    const name = e.show_class?.trim().replace(/\s+/g, ' ') || 'No class';
    const key = name.toLowerCase();
    const table = classes.get(key) ?? { name, rows: new Map<string, Standing>() };
    classes.set(key, table);
    const row = table.rows.get(e.fish_id) ?? {
      fish: byId.get(e.fish_id) ?? null,
      fishId: e.fish_id,
      points: 0,
      entries: 0,
      wins: 0,
      estimated: false,
    };
    const { points, estimated } = entryPoints(e);
    row.points += points;
    row.entries += 1;
    if (placementPoints(e.placement) === PLACE_POINTS[0]) row.wins += 1;
    row.estimated ||= estimated && points > 0;
    table.rows.set(e.fish_id, row);
  }
  return [...classes.values()]
    .map(({ name, rows }) => ({
      name,
      standings: [...rows.values()].sort((a, b) => b.points - a.points || b.wins - a.wins),
    }))
    .sort((a, b) => (b.standings[0]?.points ?? 0) - (a.standings[0]?.points ?? 0));
}
