// "Reason for score" options for the male IHS 2023 score sheet.
// A reason explains a score; it never changes the score by itself, except Vitality, where the
// chosen behaviour sets the points. Reason ids are saved with the evaluation, so never rename one.
// Reasons in the same `group` describe the same observation, so choosing one replaces the others.

import type { TailStandard } from '@/lib/constants';

export type Reason = {
  id: string;
  label: string;
  group?: string;
  // Sets the category score when chosen (Vitality only).
  points?: number;
  // Choosing this disqualifies the entry.
  disqualifies?: boolean;
  // A heading the option is listed under, for long lists.
  section?: string;
};

export type CategoryReasons = {
  // Single-select lists allow only one reason at a time.
  single?: boolean;
  // A short line on how the points are split or measured.
  allocation?: string;
  reasons: Reason[];
};

const coverage = (prefix: string): Reason[] => [
  { id: `${prefix}_cover_100`, label: 'Full colour coverage', group: 'coverage' },
  { id: `${prefix}_cover_75`, label: 'Approximately 75% coverage', group: 'coverage' },
  { id: `${prefix}_cover_50`, label: 'Approximately 50% coverage', group: 'coverage' },
  { id: `${prefix}_cover_25`, label: 'Approximately 25% coverage', group: 'coverage' },
  { id: `${prefix}_cover_0`, label: 'No colour coverage', group: 'coverage' },
];

const colourQuality = (prefix: string): Reason[] => [
  { id: `${prefix}_strong`, label: 'Strong, lively colour', group: 'intensity' },
  { id: `${prefix}_weak`, label: 'Weak colour intensity', group: 'intensity' },
  { id: `${prefix}_clear_bounds`, label: 'Clear colour boundaries', group: 'boundaries' },
  { id: `${prefix}_blurred_bounds`, label: 'Blurred colour boundaries', group: 'boundaries' },
];

const shapeMatch = (prefix: string): Reason[] => [
  { id: `${prefix}_shape_match`, label: 'Shape matches selected standard', group: 'shape' },
  { id: `${prefix}_shape_partly`, label: 'Shape partly matches selected standard', group: 'shape' },
  { id: `${prefix}_shape_poor`, label: 'Shape poorly matches selected standard', group: 'shape' },
];

export const MALE_REASONS: Record<string, CategoryReasons> = {
  body_length: {
    single: true,
    allocation: 'Measure from the snout to the end of the caudal peduncle, not including the tail.',
    reasons: [
      { id: 'bl_26', label: '26 mm or more — 8 points' },
      { id: 'bl_24', label: '24 mm — 7 points' },
      { id: 'bl_22', label: '22 mm — 6 points' },
      { id: 'bl_20', label: '20 mm — 5 points' },
      { id: 'bl_18', label: '18 mm — 4 points' },
      { id: 'bl_16', label: '16 mm — 3 points' },
      { id: 'bl_14', label: '14 mm — 2 points' },
      { id: 'bl_under_14', label: 'Under 14 mm — 1 point' },
    ],
  },
  body_form: {
    // IHS 2023 item 31.
    allocation:
      'IHS deductions (form item 31), up to 8 in total: not streamlined or bulging up to 5 · caudal peduncle too broad up to 2 · body too flat (emaciated) up to 4 · round back up to 2 · strong bend up to 5 · deformed gonopodium up to 3. Humpback, hollow back or a curved spine disqualify.',
    reasons: [
      { id: 'bf_outline_correct', label: 'Correct body outline', group: 'outline' },
      { id: 'bf_outline_minor', label: 'Minor outline faults', group: 'outline' },
      { id: 'bf_outline_major', label: 'Major outline faults', group: 'outline' },
      { id: 'bf_ratio_good', label: 'Correct body proportions', group: 'ratio' },
      { id: 'bf_ratio_medium', label: 'Moderate proportion faults', group: 'ratio' },
      { id: 'bf_ratio_bad', label: 'Poor body proportions', group: 'ratio' },
      { id: 'bf_straight', label: 'Straight body', group: 'straightness' },
      { id: 'bf_curved', label: 'Curved body', group: 'straightness' },
      { id: 'bf_reduced_control', label: 'Reduced control of body movement' },
      { id: 'bf_dq_humpback', label: 'Disqualified: Humpback', disqualifies: true },
      // Kept under its old id so earlier evaluations still show it. IHS item 31 deducts up to 4 for it.
      { id: 'bf_dq_flat', label: 'Flat body (emaciated), deduct up to 4' },
    ],
  },
  body_colour: {
    reasons: [...coverage('bc'), ...colourQuality('bc')],
  },
  dorsal_length: {
    single: true,
    reasons: [
      { id: 'dl_target', label: 'Reaches or exceeds target' },
      { id: 'dl_between', label: 'Between half peduncle and target' },
      { id: 'dl_half', label: 'Reaches half peduncle' },
      { id: 'dl_short', label: 'Ends before half peduncle' },
    ],
  },
  dorsal_form: {
    allocation: 'Shape up to 4 · Condition up to 2 · Display up to 2',
    reasons: [
      ...shapeMatch('df'),
      { id: 'df_edges_intact', label: 'Fin edges intact and even' },
      { id: 'df_edges_uneven', label: 'Uneven or serrated edges' },
      { id: 'df_split', label: 'Split fin' },
      { id: 'df_missing', label: 'Missing fin tissue' },
      { id: 'df_open', label: 'Fin erect and fully open', group: 'display' },
      { id: 'df_half_closed', label: 'Fin half closed', group: 'display' },
      { id: 'df_closed', label: 'Fin closed', group: 'display' },
    ],
  },
  dorsal_colour: {
    reasons: [
      ...coverage('dc'),
      { id: 'dc_transparent_margins', label: 'Transparent margins' },
      ...colourQuality('dc'),
      { id: 'dc_match_caudal', label: 'Same colour, pattern and tone as caudal', group: 'match' },
      { id: 'dc_match_colour_only', label: 'Same colour as caudal, different pattern and/or tone', group: 'match' },
      { id: 'dc_differs_caudal', label: 'Different colour from caudal', group: 'match' },
    ],
  },
  caudal_length: {
    single: true,
    reasons: [
      { id: 'cl_target', label: 'Reaches or exceeds target' },
      { id: 'cl_between', label: 'Between 50% and full target' },
      { id: 'cl_half', label: 'At 50% of target' },
      { id: 'cl_short', label: 'Below 50% of target' },
    ],
  },
  caudal_form: {
    allocation: 'Shape up to 10 · Condition up to 5 · Display up to 5',
    reasons: [
      ...shapeMatch('cf'),
      { id: 'cf_edges_intact', label: 'Fin edges intact and even' },
      { id: 'cf_serrated', label: 'Serrated edges' },
      { id: 'cf_split', label: 'Split tail' },
      { id: 'cf_missing', label: 'Missing fin tissue' },
      { id: 'cf_open', label: 'Fully open display', group: 'display' },
      { id: 'cf_partly_open', label: 'Partly open display', group: 'display' },
      { id: 'cf_poor_display', label: 'Poor display', group: 'display' },
    ],
  },
  caudal_colour: {
    reasons: [
      ...coverage('cc'),
      { id: 'cc_margins', label: 'Transparent or whitish margins' },
      ...colourQuality('cc'),
    ],
  },
  vitality: {
    single: true,
    reasons: [
      { id: 'v_courting', label: 'Courting — 5 points', points: 5 },
      { id: 'v_erect', label: 'Swimming up/down and forward/backward with erect fins — 4 points', points: 4 },
      { id: 'v_hanging', label: 'Swimming up/down and forward/backward with hanging fins — 3 points', points: 3 },
      { id: 'v_motionless', label: 'Motionless in the water column — 2 points', points: 2 },
      { id: 'v_bottom', label: 'Resting on the tank bottom — 1 point', points: 1 },
    ],
  },
};

export function reasonById(categoryKey: string, id: string): Reason | undefined {
  return MALE_REASONS[categoryKey]?.reasons.find((r) => r.id === id);
}

// Applies a tap on a reason: toggles it, and drops other reasons it can't sit alongside.
export function toggleReason(def: CategoryReasons, selected: string[], id: string): string[] {
  const reason = def.reasons.find((r) => r.id === id);
  if (!reason) return selected;
  if (selected.includes(id)) return selected.filter((s) => s !== id);
  if (def.single) return [id];
  const kept = reason.group
    ? selected.filter((s) => def.reasons.find((r) => r.id === s)?.group !== reason.group)
    : selected;
  return [...kept, id];
}

// The disqualifying reasons chosen anywhere on the sheet.
export function disqualifications(reasons: Record<string, string[]>): Reason[] {
  return Object.entries(reasons).flatMap(([key, ids]) =>
    ids.map((id) => reasonById(key, id)).filter((r): r is Reason => !!r?.disqualifies),
  );
}

// Whether a saved evaluation is disqualified. Only the male sheet has disqualifying reasons.
export function isDisqualified(sex: 'M' | 'F', reasons: Record<string, string[]>): boolean {
  return sex === 'M' && disqualifications(reasons).length > 0;
}

// IHS 2023 guidance that depends on the fish's tail standard, from the standard descriptions.
type StandardGuide = { bodyLength: string; dorsal: string; caudalLength: string; caudalShape: string; colour?: string };

const BROAD_LENGTH = 'Broad tails (form item 30a): 26 mm 8 pts, 24 mm 6, 22 mm 3, 20 mm 1, under 20 mm 0; over 26 mm deduct up to 3.';
const SWORD_LENGTH = 'Sword tails (form item 30b): 25 mm 8 pts, 23 mm 6, 21 mm 3, 19 mm 1, under 19 mm 0; over 25 mm deduct up to 3.';
const SHORT_LENGTH = 'Short tails (form item 30c): 24 mm 8 pts, 22 mm 6, 20 mm 3, 18 mm 1, under 18 mm 0; over 24 mm deduct up to 3.';
const FIRST_THIRD = 'Target: to the end of the first third of the caudal fin.';
const SWORD_COLOUR = 'The basic form between or under the swords may be colourless.';

export const STANDARD_GUIDE: Record<Exclude<TailStandard, 'U'>, StandardGuide> = {
  A1: { bodyLength: BROAD_LENGTH, dorsal: `${FIRST_THIRD} Rises steeply, pointed end.`, caudalLength: 'Target: 10/10 of body length.', caudalShape: 'Elongated triangle at 45° to the body; straight edges, corners slightly rounded.' },
  A2: { bodyLength: BROAD_LENGTH, dorsal: `${FIRST_THIRD} Rises steeply, broad, blunt end.`, caudalLength: 'Target: 8/10 of body length.', caudalShape: 'Triangle at 70° to the body; straight edges, corners slightly rounded.' },
  A3: { bodyLength: BROAD_LENGTH, dorsal: `${FIRST_THIRD} Rounded-off end.`, caudalLength: 'Target: 8/10 of body length; not less than 5/10.', caudalShape: 'Curved upper and lower edges, widest at 3/4 of its length; concave rear edge; width 3/4 of length.' },
  A4: { bodyLength: BROAD_LENGTH, dorsal: `${FIRST_THIRD} Rises steeply, pointed end.`, caudalLength: 'Target: 8/10 of body length; at least 6/10.', caudalShape: 'Rectangle, width 4/10 of body length; rounded-off start.' },
  A5: { bodyLength: BROAD_LENGTH, dorsal: 'Target: overlaps 25% of the caudal, as high as the top edge of the caudal; almost a quarter circle.', caudalLength: 'Target: 2/3 of body length; height 4/3 of body length.', caudalShape: 'Half circle, front edges at 90° to the body (180° total); straight front edges, convex rear.' },
  B1: { bodyLength: SWORD_LENGTH, dorsal: `${FIRST_THIRD} Rises steeply, pointed end.`, caudalLength: 'Target: swords as long as the body (10/10).', caudalShape: 'Oval base with upper and lower swords at 30°; part between swords no more than 4/10 of body length.', colour: SWORD_COLOUR },
  B2: { bodyLength: SWORD_LENGTH, dorsal: `${FIRST_THIRD} Rises steeply, pointed end.`, caudalLength: 'Target: sword 10/10 of body length.', caudalShape: 'Oval base (max 4/10 of body length) with a top sword at 15° or parallel to the body.', colour: SWORD_COLOUR },
  B3: { bodyLength: SWORD_LENGTH, dorsal: `${FIRST_THIRD} Rises steeply, pointed end.`, caudalLength: 'Target: sword 10/10 of body length.', caudalShape: 'Oval base (max 4/10 of body length) with a bottom sword at 15°.', colour: SWORD_COLOUR },
  B4: { bodyLength: SWORD_LENGTH, dorsal: `${FIRST_THIRD} Tip bent outwards.`, caudalLength: 'Target: 8/10 of body length.', caudalShape: 'Lyre shape on a round base 4/10 of body length.', colour: SWORD_COLOUR },
  C1: { bodyLength: SHORT_LENGTH, dorsal: `${FIRST_THIRD} Rises steeply, pointed end.`, caudalLength: 'Target: 5/10 of body length; depth 8/10 of caudal length.', caudalShape: 'Spade shape; upper and lower edges parallel with a noticeable start.' },
  C2: { bodyLength: SHORT_LENGTH, dorsal: `${FIRST_THIRD} Tip bent outwards.`, caudalLength: 'Target: 8/10 of body length; height 6/10 of caudal length.', caudalShape: 'Spear tip.' },
  C3: { bodyLength: SHORT_LENGTH, dorsal: 'Target: to the start of the caudal fin, rounded off.', caudalLength: 'Target: diameter 5/10 of body length.', caudalShape: 'Round.' },
  C4: { bodyLength: SHORT_LENGTH, dorsal: `${FIRST_THIRD} Rises steeply, pointed end.`, caudalLength: 'Target: overall 10/10 of body length.', caudalShape: 'Round base 4/10 of body length; middle rays form a needle.' },
};

// Recessive base colours, except blond, may earn up to 5 extra body colour points within the 12 maximum.
const RECESSIVE_BASES = [2, 4, 5, 6, 7, 8, 9, 10];

// Guidance shown under a category, for the fish's tail standard and base colour.
export function categoryGuide(categoryKey: string, standard: TailStandard | null, baseColour: number | null): string[] {
  const guide = standard && standard !== 'U' ? STANDARD_GUIDE[standard] : null;
  const lines: string[] = [];
  const allocation = MALE_REASONS[categoryKey]?.allocation;
  if (allocation) lines.push(allocation);
  if (guide) {
    if (categoryKey === 'body_length') lines.push(guide.bodyLength);
    if (categoryKey === 'dorsal_length' || categoryKey === 'dorsal_form') lines.push(guide.dorsal);
    if (categoryKey === 'caudal_length') lines.push(guide.caudalLength);
    if (categoryKey === 'caudal_form') lines.push(guide.caudalShape);
    if (categoryKey === 'caudal_colour' && guide.colour) lines.push(guide.colour);
  }
  if (categoryKey === 'body_colour' && baseColour !== null && RECESSIVE_BASES.includes(baseColour)) {
    lines.push('Recessive base colour: up to 5 points may be added, within the 12-point maximum.');
  }
  return lines;
}
