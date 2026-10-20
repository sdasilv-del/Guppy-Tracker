import type { Evaluation, Fish, Profile, ShowEntry, Spawn, SpawnEvent, Tank, WaterTest } from '@/lib/types';

let seq = 0;
const nextId = (prefix: string) => `${prefix}${++seq}`;

export function makeFish(over: Partial<Fish> = {}): Fish {
  const id = over.id ?? nextId('fish-');
  return {
    id,
    fish_code: id.toUpperCase(),
    previous_codes: [],
    name: null,
    sex: 'M',
    tail_standard: 'A1',
    base_colour: null,
    cover_colours: [],
    strain: null,
    date_of_birth: null,
    generation: null,
    origin: 'bred',
    foundation: false,
    original_breeder: null,
    sire_id: null,
    dam_id: null,
    tank_id: null,
    status: 'breeder',
    notes: null,
    spawn_id: null,
    pick_reason: null,
    created_at: '2026-01-01T00:00:00Z',
    ...over,
  };
}

export function makeEntry(over: Partial<ShowEntry> = {}): ShowEntry {
  return {
    id: nextId('entry-'),
    fish_id: 'f1',
    evaluation_id: null,
    show_name: 'Spring Show',
    shown_on: '2026-04-01',
    show_class: 'A1 Male',
    placement: null,
    points: null,
    notes: null,
    created_at: '2026-04-01T00:00:00Z',
    ...over,
  };
}

export function makeTank(over: Partial<Tank> = {}): Tank {
  const id = over.id ?? nextId('tank-');
  return {
    id,
    tank_code: id.toUpperCase(),
    name: null,
    size_gallons: null,
    purpose: 'breeding',
    notes: null,
    water_change_every_days: null,
    created_at: '2026-01-01T00:00:00Z',
    ...over,
  };
}

export function makeSpawn(over: Partial<Spawn> = {}): Spawn {
  const id = over.id ?? nextId('spawn-');
  return {
    id,
    spawn_code: id.toUpperCase(),
    group_id: null,
    sire_id: null,
    dam_id: null,
    born_on: '2026-01-01',
    fry_count: 20,
    tank_id: null,
    strain: null,
    generation: null,
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    ...over,
  };
}

export function makeEvent(over: Partial<SpawnEvent> = {}): SpawnEvent {
  return {
    id: nextId('event-'),
    spawn_id: 's1',
    kind: 'loss',
    happened_on: '2026-01-05',
    count: null,
    to_tank_id: null,
    males: null,
    females: null,
    unknown: null,
    reason: null,
    for_sale: false,
    sold_on: null,
    notes: null,
    created_at: '2026-01-05T00:00:00Z',
    ...over,
  };
}

export function makeWaterTest(over: Partial<WaterTest> = {}): WaterTest {
  return {
    id: nextId('test-'),
    tank_id: 't1',
    tested_on: '2026-01-01',
    temperature_c: null,
    ph: null,
    ammonia: null,
    nitrite: null,
    nitrate: null,
    gh: null,
    kh: null,
    notes: null,
    ...over,
  };
}

export function makeEvaluation(over: Partial<Evaluation> = {}): Evaluation {
  return {
    id: nextId('eval-'),
    fish_id: 'f1',
    kind: 'official',
    evaluated_on: '2026-04-01',
    event: null,
    judge: null,
    sex: 'M',
    tail_standard: null,
    base_colour: null,
    cover_colours: [],
    scores: {},
    score_notes: {},
    score_reasons: {},
    total: 80,
    male_id: null,
    female_length_mm: null,
    male_length_mm: null,
    placement: null,
    photo_path: null,
    certificate_path: null,
    notes: null,
    standard_year: 2023,
    locked_at: null,
    seal: null,
    created_at: '2026-04-01T00:00:00Z',
    ...over,
  };
}

export function makeProfile(over: Partial<Profile> = {}): Profile {
  return {
    id: 'p1',
    display_name: 'Sam Breeder',
    breeder_initials: 'SB',
    club: null,
    country: null,
    temperature_unit: 'C',
    test_every_days: 14,
    loss_min: 3,
    loss_percent: 10,
    crowded_per_gallon: 2,
    ...over,
  };
}
