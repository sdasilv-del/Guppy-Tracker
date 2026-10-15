// The female IHS 2023 score sheet (10 points): Size 3, Form 3, Matching 2, Vitality 2.
// The evaluator picks each score from a fixed scale; reasons explain it and never change it.
// Reason ids are saved with the evaluation, so never rename one.

import type { CategoryReasons } from '@/lib/ihs-reasons';

export type ScoreOption = { points: number; label: string };

const SCALE_3: ScoreOption[] = [
  { points: 3, label: 'Exceptional — 3' },
  { points: 2, label: 'Good — 2' },
  { points: 1, label: 'Bad — 1' },
  { points: 0, label: 'Very bad — 0' },
];

const SCALE_2: ScoreOption[] = [
  { points: 2, label: 'Exceptional — 2' },
  { points: 1, label: 'Good — 1' },
  { points: 0, label: 'Bad — 0' },
];

export type FemaleCategory = {
  key: 'size' | 'form' | 'matching' | 'vitality';
  label: string;
  max: number;
  scale: ScoreOption[];
  guide: string;
  note?: string;
  reasons: CategoryReasons;
};

export const FEMALE_SHEET: FemaleCategory[] = [
  {
    key: 'size',
    label: 'Size',
    max: 3,
    scale: SCALE_3,
    guide:
      'Measure body length from the muzzle to the beginning of the caudal fin, excluding the tail. The ideal female body length is 1.5 times the male’s body length.',
    reasons: {
      reasons: [
        { id: 'fs_ideal', label: 'Ideal female-to-male body length ratio of approximately 3:2', group: 'ratio' },
        { id: 'fs_close', label: 'Close to the ideal size ratio', group: 'ratio' },
        { id: 'fs_below', label: 'Below the ideal size ratio', group: 'ratio' },
        { id: 'fs_well_below', label: 'Substantially below the ideal size ratio', group: 'ratio' },
        { id: 'fs_larger', label: 'Larger than the ideal ratio', group: 'ratio' },
        { id: 'fs_no_male', label: 'Male body length unavailable — comparison incomplete' },
      ],
    },
  },
  {
    key: 'form',
    label: 'Form, including fins',
    max: 3,
    scale: SCALE_3,
    guide:
      'Assess body structure, dorsal and caudal fins together. The female should be robust but graceful, with a strong peduncle and well-formed fins.',
    note: 'A female dorsal may be smaller than the male’s, and several caudal shapes can suit a strain. Neither is a fault on its own.',
    reasons: {
      reasons: [
        { id: 'ff_robust', label: 'Robust and graceful body', section: 'Body structure' },
        { id: 'ff_not_robust', label: 'Body lacks robustness', section: 'Body structure' },
        { id: 'ff_unbalanced', label: 'Body proportions lack balance', section: 'Body structure' },
        { id: 'ff_dorsal_mid', label: 'Dorsal fin base positioned at the midpoint of the body', group: 'dorsal_base', section: 'Body structure' },
        { id: 'ff_dorsal_not_mid', label: 'Dorsal fin base not positioned at the midpoint', group: 'dorsal_base', section: 'Body structure' },
        { id: 'ff_line_straight', label: 'Straight upper body line from muzzle to dorsal fin base', group: 'upper_line', section: 'Body structure' },
        { id: 'ff_line_deviates', label: 'Upper body line deviates from the standard', group: 'upper_line', section: 'Body structure' },
        { id: 'ff_spot_clear', label: 'Clearly visible pregnancy spot', group: 'spot', section: 'Body structure' },
        { id: 'ff_spot_unclear', label: 'Pregnancy spot not clearly visible', group: 'spot', section: 'Body structure' },
        { id: 'ff_peduncle_strong', label: 'Strong, sturdy peduncle', group: 'peduncle', section: 'Body structure' },
        { id: 'ff_peduncle_weak', label: 'Weak or narrow peduncle', group: 'peduncle', section: 'Body structure' },
        { id: 'ff_peduncle_broad', label: 'Peduncle excessively broad', group: 'peduncle', section: 'Body structure' },
        { id: 'ff_dorsal_steep', label: 'Steeply rising dorsal with suitable rounded or pointed end', group: 'dorsal_shape', section: 'Dorsal fin' },
        { id: 'ff_dorsal_deviates', label: 'Dorsal shape deviates from the standard', group: 'dorsal_shape', section: 'Dorsal fin' },
        { id: 'ff_dorsal_rays_even', label: 'Straight, evenly distributed fin rays', group: 'dorsal_rays', section: 'Dorsal fin' },
        { id: 'ff_dorsal_rays_bent', label: 'Bent or unevenly distributed fin rays', group: 'dorsal_rays', section: 'Dorsal fin' },
        { id: 'ff_dorsal_like_male', label: 'Dorsal resembles the male’s standard', group: 'dorsal_male', section: 'Dorsal fin' },
        { id: 'ff_dorsal_unlike_male', label: 'Dorsal differs from the male’s standard', group: 'dorsal_male', section: 'Dorsal fin' },
        { id: 'ff_caudal_strain', label: 'Caudal shape appropriate to the strain', section: 'Caudal fin' },
        { id: 'ff_caudal_spans', label: 'Caudal fin fully spans the peduncle end', group: 'caudal_span', section: 'Caudal fin' },
        { id: 'ff_caudal_not_spans', label: 'Caudal fin does not fully span the peduncle end', group: 'caudal_span', section: 'Caudal fin' },
        { id: 'ff_caudal_fan', label: 'Fan-shaped, evenly distributed fin rays', section: 'Caudal fin' },
        { id: 'ff_caudal_not_fan', label: 'Fin rays not fan-shaped', section: 'Caudal fin' },
        { id: 'ff_caudal_uneven', label: 'Unevenly distributed fin rays', section: 'Caudal fin' },
        { id: 'ff_caudal_split', label: 'Cleaved or split fin', section: 'Caudal fin' },
        { id: 'ff_caudal_serrated', label: 'Strong serrations', section: 'Caudal fin' },
        { id: 'ff_caudal_other', label: 'Other fin defect', section: 'Caudal fin' },
      ],
    },
  },
  {
    key: 'matching',
    label: 'Matching, including colour',
    max: 2,
    scale: SCALE_2,
    guide:
      'Assess whether the female and male form a true matching pair, considering colour, form and size harmony. The ideal male-to-female body length ratio is 2:3. Larger or oversized females receive no size deduction.',
    note: 'A different dorsal or caudal shape may lower Matching points but is never a disqualification on its own.',
    reasons: {
      reasons: [
        { id: 'fm_harmony', label: 'Strong overall pair harmony' },
        { id: 'fm_base', label: 'Matching base colour' },
        { id: 'fm_strain_colour', label: 'Colour and pattern consistent with the male’s strain' },
        { id: 'fm_markings', label: 'Female shows the expected strain markings' },
        { id: 'fm_size_ideal', label: 'Ideal size harmony', group: 'size' },
        { id: 'fm_size_larger', label: 'Female larger than ideal — no size deduction', group: 'size' },
        { id: 'fm_size_smaller', label: 'Female smaller than ideal — reduced size harmony', group: 'size' },
        { id: 'fm_minor', label: 'Minor overall matching differences' },
        { id: 'fm_dorsal_differs', label: 'Dorsal shape differs visually from the male’s standard' },
        { id: 'fm_caudal_differs', label: 'Caudal shape differs visually from the expected pairing' },
      ],
    },
  },
  {
    key: 'vitality',
    label: 'Vitality',
    max: 2,
    scale: SCALE_2,
    guide: 'The female should be free swimming and active, without sulking or hiding on the bottom.',
    reasons: {
      reasons: [
        { id: 'fv_free', label: 'Freely swimming and active' },
        { id: 'fv_alert', label: 'Alert and responsive' },
        { id: 'fv_reduced', label: 'Reduced activity' },
        { id: 'fv_sulking', label: 'Sulking' },
        { id: 'fv_hiding', label: 'Hiding on the bottom' },
        { id: 'fv_resting', label: 'Resting on the bottom rather than swimming' },
      ],
    },
  },
];

// Saved under score_reasons.disqualify; the explanation for "Other" goes in score_notes.disqualify.
export const DISQUALIFY_KEY = 'disqualify';
export const DISQUALIFY_OTHER = 'dq_other';

export const FEMALE_DISQUALIFY: CategoryReasons = {
  reasons: [
    { id: 'dq_not_pair', label: 'Pair is not evidently a true matching pair', disqualifies: true },
    { id: 'dq_base_colours', label: 'Incompatible base colours', disqualifies: true },
    { id: 'dq_strain_colours', label: 'Incompatible strain colours or patterns, such as a blue/red grass mix', disqualifies: true },
    { id: 'dq_markings', label: 'Missing expected strain markings, such as half-black markings', disqualifies: true },
    { id: 'dq_body_form', label: 'Body form demonstrates that the fish are not a true pair', disqualifies: true },
    { id: 'dq_sick', label: 'Sick fish', disqualifies: true },
    { id: 'dq_disfigured', label: 'Disfigured fish', disqualifies: true },
    { id: DISQUALIFY_OTHER, label: 'Other — explanation required', disqualifies: true },
  ],
};

export function femaleReasonOptions(key: string): CategoryReasons | undefined {
  if (key === DISQUALIFY_KEY) return FEMALE_DISQUALIFY;
  return FEMALE_SHEET.find((c) => c.key === key)?.reasons;
}

// Female body length divided by male body length; 1.5 is ideal. Null until both are entered.
export function sizeRatio(femaleMm: number | null, maleMm: number | null): number | null {
  if (!femaleMm || !maleMm) return null;
  return Math.round((femaleMm / maleMm) * 100) / 100;
}
