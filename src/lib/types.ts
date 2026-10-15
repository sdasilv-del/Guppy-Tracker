import type { EvaluationKind, FishStatus, Origin, Sex, SpawnEventKind, TailStandard, TankPurpose } from '@/lib/constants';

export type Profile = {
  id: string;
  display_name: string;
  breeder_initials: string;
  club: string | null;
  country: string | null;
};

export type Tank = {
  id: string;
  tank_code: string;
  name: string | null;
  size_gallons: number | null;
  purpose: TankPurpose;
  notes: string | null;
  created_at: string;
};

export type WaterTest = {
  id: string;
  tank_id: string;
  tested_on: string;
  temperature_c: number | null;
  ph: number | null;
  ammonia: number | null;
  nitrite: number | null;
  nitrate: number | null;
  gh: number | null;
  kh: number | null;
  notes: string | null;
};

export type WaterChange = {
  id: string;
  tank_id: string;
  changed_on: string;
  percent: number | null;
  notes: string | null;
};

export type Fish = {
  id: string;
  fish_code: string;
  previous_codes: string[];
  name: string | null;
  sex: Sex;
  tail_standard: TailStandard;
  base_colour: number | null;
  cover_colours: number[];
  strain: string | null;
  date_of_birth: string | null;
  generation: string | null;
  origin: Origin;
  foundation: boolean;
  original_breeder: string | null;
  sire_id: string | null;
  dam_id: string | null;
  tank_id: string | null;
  status: FishStatus;
  notes: string | null;
  spawn_id: string | null;
  pick_reason: string | null;
  created_at: string;
};

export type FishPhoto = {
  id: string;
  fish_id: string;
  storage_path: string;
  taken_on: string;
  created_at: string;
};

export type FishMove = {
  id: string;
  fish_id: string;
  from_tank_id: string | null;
  to_tank_id: string | null;
  moved_at: string;
};

export type Trait = {
  id: string;
  name: string;
};

export type BreedingGroup = {
  id: string;
  group_code: string;
  name: string | null;
  tank_id: string | null;
  started_on: string;
  ended_on: string | null;
  goal: string | null;
  notes: string | null;
  created_at: string;
};

export type Spawn = {
  id: string;
  spawn_code: string;
  group_id: string | null;
  sire_id: string | null;
  dam_id: string | null;
  born_on: string;
  fry_count: number;
  tank_id: string | null;
  strain: string | null;
  generation: string | null;
  notes: string | null;
  created_at: string;
};

export type SpawnEvent = {
  id: string;
  spawn_id: string;
  kind: SpawnEventKind;
  happened_on: string;
  count: number | null;
  to_tank_id: string | null;
  males: number | null;
  females: number | null;
  unknown: number | null;
  reason: string | null;
  for_sale: boolean;
  sold_on: string | null;
  notes: string | null;
  created_at: string;
};

export type FishTrait = {
  id: string;
  fish_id: string;
  trait_id: string;
  recorded_on: string;
  value: string | null;
  score: number | null;
  notes: string | null;
  created_at: string;
};

export type Evaluation = {
  id: string;
  fish_id: string;
  kind: EvaluationKind;
  evaluated_on: string;
  event: string | null;
  judge: string | null;
  sex: 'M' | 'F';
  tail_standard: string | null;
  base_colour: number | null;
  cover_colours: number[];
  scores: Record<string, number>;
  score_notes: Record<string, string>;
  score_reasons: Record<string, string[]>;
  total: number;
  male_id: string | null;
  female_length_mm: number | null;
  male_length_mm: number | null;
  placement: string | null;
  photo_path: string | null;
  notes: string | null;
  created_at: string;
};
