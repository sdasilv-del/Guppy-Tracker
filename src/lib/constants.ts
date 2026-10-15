// Fixed lists from the spec and the IKGH colour code sheet (09/02/2020).

export const TANK_PURPOSES = [
  { value: 'breeding', label: 'Breeding' },
  { value: 'fry_growout', label: 'Fry growout' },
  { value: 'male_juvenile_growout', label: 'Male juvenile growout' },
  { value: 'female_juvenile_growout', label: 'Female juvenile growout' },
  { value: 'quarantine', label: 'Quarantine' },
  { value: 'show_conditioning', label: 'Show conditioning' },
  { value: 'retirement', label: 'Retirement' },
  { value: 'cull', label: 'Cull tank' },
] as const;

export type TankPurpose = (typeof TANK_PURPOSES)[number]['value'];

export const SEXES = [
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
  { value: 'U', label: 'Unknown' },
] as const;

export type Sex = (typeof SEXES)[number]['value'];

export const TAIL_STANDARDS = [
  { value: 'A1', label: 'A1 Fan tail' },
  { value: 'A2', label: 'A2 Delta tail' },
  { value: 'A3', label: 'A3 Veil tail' },
  { value: 'A4', label: 'A4 Flag tail' },
  { value: 'A5', label: 'A5 Half moon tail' },
  { value: 'B1', label: 'B1 Double sword' },
  { value: 'B2', label: 'B2 Top sword' },
  { value: 'B3', label: 'B3 Bottom sword' },
  { value: 'B4', label: 'B4 Lyre tail' },
  { value: 'C1', label: 'C1 Spade tail' },
  { value: 'C2', label: 'C2 Spear tail' },
  { value: 'C3', label: 'C3 Round tail' },
  { value: 'C4', label: 'C4 Pin tail' },
] as const;

export type TailStandard = (typeof TAIL_STANDARDS)[number]['value'];

export const BASE_COLOURS = [
  { value: 1, label: '1 Grey' },
  { value: 2, label: '2 Gold / Bronze' },
  { value: 3, label: '3 Blond' },
  { value: 4, label: '4 Blue' },
  { value: 5, label: '5 Pink' },
  { value: 6, label: '6 Albino' },
  { value: 7, label: '7 White' },
  { value: 8, label: '8 Silver' },
  { value: 9, label: '9 Cream' },
  { value: 10, label: '10 Lutino' },
] as const;

export const COVER_COLOURS = [
  { value: 1, label: '1 Red' },
  { value: 2, label: '2 Blue' },
  { value: 3, label: '3 Green' },
  { value: 4, label: '4 Yellow' },
  { value: 5, label: '5 White' },
  { value: 6, label: '6 Black' },
  { value: 7, label: '7 Neon' },
  { value: 8, label: '8 Moscow' },
  { value: 9, label: '9 Metallic' },
  { value: 10, label: '10 1/2 to 3/4 Black' },
  { value: 11, label: '11 Snakeskin / Filigran' },
  { value: 12, label: '12 Viennese Emerald' },
  { value: 13, label: '13 Single coloured' },
  { value: 14, label: '14 Two tone' },
  { value: 15, label: '15 Multi coloured' },
  { value: 16, label: '16 Mosaic' },
  { value: 17, label: '17 Galaxy' },
  { value: 18, label: '18 Japanese & Singa Blue' },
  { value: 19, label: '19 Blue / Red Grass' },
  { value: 20, label: '20 Santa Maria' },
] as const;

export const ORIGINS = [
  { value: 'bred', label: 'Bred by me' },
  { value: 'imported', label: 'Imported' },
  { value: 'purchased', label: 'Purchased' },
] as const;

export type Origin = (typeof ORIGINS)[number]['value'];

export const FISH_STATUSES = [
  { value: 'breeder', label: 'Breeder' },
  { value: 'show_prospect', label: 'Show prospect' },
  { value: 'show_fish', label: 'Show fish' },
  { value: 'for_sale', label: 'For sale' },
  { value: 'sold', label: 'Sold' },
  { value: 'culled', label: 'Culled' },
  { value: 'retired', label: 'Retired' },
  { value: 'deceased', label: 'Deceased' },
] as const;

export type FishStatus = (typeof FISH_STATUSES)[number]['value'];

// Statuses for fish that are no longer in the fish room.
export const INACTIVE_STATUSES: FishStatus[] = ['sold', 'culled', 'deceased'];

export const SPAWN_EVENT_KINDS = [
  { value: 'move', label: 'Move' },
  { value: 'loss', label: 'Loss' },
  { value: 'sexing', label: 'Sexing' },
  { value: 'cull', label: 'Cull' },
] as const;

export type SpawnEventKind = (typeof SPAWN_EVENT_KINDS)[number]['value'];

export function labelOf<T extends string | number>(
  list: readonly { value: T; label: string }[],
  value: T | null | undefined,
): string {
  return list.find((item) => item.value === value)?.label ?? '';
}
