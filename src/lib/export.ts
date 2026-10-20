import {
  BASE_COLOURS,
  COVER_COLOURS,
  EVALUATION_KINDS,
  FISH_STATUSES,
  ihsMaxTotal,
  labelOf,
  ORIGINS,
  SEXES,
  TAIL_OPTIONS,
} from '@/lib/constants';
import { formatDate, todayISO } from '@/lib/format';
import { pedigreeColumns } from '@/lib/pedigree';
import { entryPoints } from '@/lib/points';
import type { Evaluation, Fish, Profile, Sale, ShowEntry, Tank, WaterTest } from '@/lib/types';

// Spreadsheets and printouts built from the fish room records. Nothing here touches the phone,
// so it can be tested on its own; share.ts saves and shares the result.

type Cell = string | number | boolean | null | undefined;

function csvCell(value: Cell): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  // Spreadsheets run text that starts with these as a formula; a leading ' keeps it as text.
  if (typeof value === 'string' && /^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// The byte-order mark makes Excel read accented names correctly.
export function toCsv(header: string[], rows: Cell[][]): string {
  return '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

function codeOf(byId: Record<string, Fish>, id: string | null) {
  return id ? (byId[id]?.fish_code ?? '') : '';
}

function colours(f: Fish) {
  return {
    base: f.base_colour !== null ? labelOf(BASE_COLOURS, f.base_colour) : '',
    cover: f.cover_colours.map((c) => labelOf(COVER_COLOURS, c)).join('; '),
  };
}

export function fishCsv(fish: Fish[], tanks: Tank[]): string {
  const byId = Object.fromEntries(fish.map((f) => [f.id, f]));
  const tankCode = Object.fromEntries(tanks.map((t) => [t.id, t.tank_code]));
  return toCsv(
    [
      'Code', 'Name', 'Sex', 'Tail', 'Base colour', 'Cover colours', 'Strain', 'Generation', 'Born',
      'Origin', 'Original breeder', 'Status', 'Tank', 'Sire', 'Dam', 'Previous codes', 'Notes',
    ],
    fish.map((f) => {
      const c = colours(f);
      return [
        f.fish_code, f.name, labelOf(SEXES, f.sex), labelOf(TAIL_OPTIONS, f.tail_standard), c.base, c.cover,
        f.strain, f.generation, f.date_of_birth, labelOf(ORIGINS, f.origin), f.original_breeder,
        labelOf(FISH_STATUSES, f.status), f.tank_id ? tankCode[f.tank_id] : '', codeOf(byId, f.sire_id),
        codeOf(byId, f.dam_id), f.previous_codes.join('; '), f.notes,
      ];
    }),
  );
}

export function salesCsv(sales: Sale[], fish: Fish[]): string {
  const byId = Object.fromEntries(fish.map((f) => [f.id, f]));
  return toCsv(
    ['Date', 'Fish', 'Strain', 'Buyer', 'Price', 'Currency', 'Notes'],
    sales.map((s) => [s.sold_on, codeOf(byId, s.fish_id), byId[s.fish_id]?.strain, s.buyer, s.price, s.currency, s.notes]),
  );
}

// The judged score behind a show entry, e.g. "86.5 / 100", from the official evaluation it came from.
export type EntryScore = Pick<Evaluation, 'id' | 'sex' | 'total'>;

export function scoreText(e: ShowEntry, scores: EntryScore[]): string {
  const s = e.evaluation_id ? scores.find((x) => x.id === e.evaluation_id) : undefined;
  return s ? `${s.total} / ${ihsMaxTotal(s.sex)}` : '';
}

export function showsCsv(entries: ShowEntry[], fish: Fish[], scores: EntryScore[] = []): string {
  const byId = Object.fromEntries(fish.map((f) => [f.id, f]));
  return toCsv(
    ['Date', 'Show', 'Fish', 'Class', 'IHS score', 'Placement', 'Points', 'Notes'],
    entries.map((e) => [
      e.shown_on, e.show_name, codeOf(byId, e.fish_id), e.show_class, scoreText(e, scores), e.placement, pointsText(e), e.notes,
    ]),
  );
}

export function waterTestsCsv(tests: WaterTest[], tanks: Tank[]): string {
  const tankCode = Object.fromEntries(tanks.map((t) => [t.id, t.tank_code]));
  return toCsv(
    ['Date', 'Tank', 'Temperature (°C)', 'pH', 'Ammonia (ppm)', 'Nitrite (ppm)', 'Nitrate (ppm)', 'GH (dGH)', 'KH (dKH)', 'Notes'],
    tests.map((t) => [
      t.tested_on, tankCode[t.tank_id], t.temperature_c, t.ph, t.ammonia, t.nitrite, t.nitrate, t.gh, t.kh, t.notes,
    ]),
  );
}

// Printouts ---------------------------------------------------------------

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function breederLine(profile: Profile | null) {
  if (!profile) return '';
  const parts = [profile.display_name, profile.breeder_initials ? `(${profile.breeder_initials})` : '', profile.club, profile.country];
  return escapeHtml(parts.filter(Boolean).join(' '));
}

const PAGE_STYLE = `
  body { font-family: -apple-system, Roboto, Helvetica, sans-serif; color: #111; margin: 24px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color: #555; font-size: 13px; margin-bottom: 16px; }
  table { border-collapse: collapse; width: 100%; font-size: 12px; }
  td, th { border: 1px solid #999; padding: 6px; vertical-align: middle; text-align: left; }
  th { background: #eee; }
  .code { font-weight: 700; font-size: 13px; }
  .muted { color: #555; }
  .foot { margin-top: 24px; font-size: 12px; color: #555; }
  .sign { margin-top: 40px; border-top: 1px solid #111; width: 240px; padding-top: 4px; font-size: 12px; }
`;

function fishDetail(f: Fish) {
  const tail = labelOf(TAIL_OPTIONS, f.tail_standard);
  return [f.strain, f.generation, tail].filter((v): v is string => !!v).map(escapeHtml).join(' · ');
}

const CERT_DEPTH = 3;
const CERT_HEADINGS = ['Fish', 'Parents', 'Grandparents', 'Great-grandparents'];

// A one-page pedigree to hand to a buyer: the fish's details and three generations of ancestors.
// The evaluation to show off: the highest share of the maximum, official results first on a tie.
export function bestEvaluation(evaluations: Evaluation[]): Evaluation | null {
  // On a tie, a signed score wins, then an official one.
  const rank = (e: Evaluation) =>
    e.total / ihsMaxTotal(e.sex) + (e.locked_at ? 2e-6 : 0) + (e.kind === 'official' ? 1e-6 : 0);
  return evaluations.reduce<Evaluation | null>((best, e) => (!best || rank(e) > rank(best) ? e : best), null);
}

export function certificateHtml(
  fish: Fish,
  allFish: Fish[],
  profile: Profile | null,
  extras: { photo?: string | null; best?: Evaluation | null; results?: Map<string, string>; siblings?: Fish[] } = {},
): string {
  const byId = Object.fromEntries(allFish.map((f) => [f.id, f]));
  const columns = pedigreeColumns(fish, byId, CERT_DEPTH);
  const rowsTotal = columns[CERT_DEPTH].length;
  const c = colours(fish);

  // An ancestor's best score and placing, so a buyer sees how the line has shown.
  const result = (f: Fish) => {
    const text = extras.results?.get(f.id);
    return text ? `<div>${escapeHtml(text)}</div>` : '';
  };

  const rows: string[] = [];
  for (let r = 0; r < rowsTotal; r++) {
    let cells = '';
    for (let g = 0; g <= CERT_DEPTH; g++) {
      const span = rowsTotal >> g;
      if (r % span !== 0) continue;
      const i = r / span;
      const f = columns[g][i];
      const role = g === 0 ? '' : i % 2 === 0 ? 'Sire' : 'Dam';
      cells += f
        ? `<td rowspan="${span}"><div class="muted">${role}</div><div class="code">${escapeHtml(f.fish_code)}</div><div class="muted">${fishDetail(f)}</div>${result(f)}</td>`
        : `<td rowspan="${span}" class="muted">${role} unknown</td>`;
    }
    rows.push(`<tr>${cells}</tr>`);
  }

  const details: [string, string][] = [
    ['Code', fish.fish_code],
    ['Name', fish.name ?? ''],
    ['Sex', labelOf(SEXES, fish.sex)],
    ['Tail', labelOf(TAIL_OPTIONS, fish.tail_standard)],
    ['Base colour', c.base],
    ['Cover colours', c.cover.replace(/; /g, ', ')],
    ['Strain', fish.strain ?? ''],
    ['Generation', fish.generation ?? ''],
    ['Born', formatDate(fish.date_of_birth)],
    ['Original breeder', fish.original_breeder ?? ''],
    [
      'Best IHS score',
      extras.best
        ? [
            `${extras.best.total} of ${ihsMaxTotal(extras.best.sex)}`,
            labelOf(EVALUATION_KINDS, extras.best.kind),
            extras.best.event,
            formatDate(extras.best.evaluated_on),
            `IHS ${extras.best.standard_year ?? 2023}`,
            extras.best.locked_at ? `signed by ${extras.best.judge}, seal ${extras.best.seal}` : null,
          ]
            .filter(Boolean)
            .join(', ')
        : '',
    ],
  ];
  const detailRows = details
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><th style="width: 30%">${k}</th><td>${escapeHtml(v)}</td></tr>`)
    .join('');
  const breeder = breederLine(profile);
  const siblings = extras.siblings ?? [];
  const siblingRows = siblings
    .map((f) => `<tr>${[f.fish_code, labelOf(SEXES, f.sex), extras.results?.get(f.id) ?? ''].map((v) => `<td>${escapeHtml(v)}</td>`).join('')}</tr>`)
    .join('');

  return `<html><head><meta charset="utf-8"><style>${PAGE_STYLE}</style></head><body>
    <h1>Pedigree certificate</h1>
    <div class="sub">${escapeHtml(fish.fish_code)}${breeder ? ` · Bred by ${breeder}` : ''}</div>
    ${extras.photo ? `<img src="${escapeHtml(extras.photo)}" style="display: block; max-width: 100%; max-height: 260px; margin: 0 auto 16px; border-radius: 8px;" />` : ''}
    <table>${detailRows}</table>
    <h2 style="font-size: 16px; margin: 20px 0 8px;">Pedigree</h2>
    <table>
      <tr>${CERT_HEADINGS.map((h) => `<th>${h}</th>`).join('')}</tr>
      ${rows.join('')}
    </table>
    ${siblings.length > 0 ? `<h2 style="font-size: 16px; margin: 20px 0 8px;">Littermates</h2>
    <table>
      <tr><th>Fish</th><th>Sex</th><th>Best result</th></tr>
      ${siblingRows}
    </table>` : ''}
    <div class="sign">Breeder's signature</div>
    <div class="foot">Printed ${formatDate(todayISO())} from Guppy Tracker.</div>
  </body></html>`;
}

// Season points for an entry, as on the Season points screen. Points worked out from the placing get a *.
function pointsText(e: ShowEntry): string {
  const { points, estimated } = entryPoints(e);
  if (points === 0 && estimated) return '';
  return estimated ? `${points}*` : String(points);
}

export type ShowKey = { show_name: string; shown_on: string };

// The shows that have entries, newest first, once each.
export function listShows(entries: ShowEntry[]): ShowKey[] {
  const seen = new Map<string, ShowKey>();
  for (const e of entries) {
    const key = `${e.shown_on}|${e.show_name}`;
    if (!seen.has(key)) seen.set(key, { show_name: e.show_name, shown_on: e.shown_on });
  }
  return [...seen.values()].sort((a, b) => b.shown_on.localeCompare(a.shown_on) || a.show_name.localeCompare(b.show_name));
}

// The list of fish entered in one show, to bring to benching or send to the show secretary.
export function showEntryListHtml(
  show: ShowKey,
  entries: ShowEntry[],
  allFish: Fish[],
  profile: Profile | null,
  scores: EntryScore[] = [],
): string {
  const byId = Object.fromEntries(allFish.map((f) => [f.id, f]));
  const mine = entries
    .filter((e) => e.show_name === show.show_name && e.shown_on === show.shown_on)
    .sort((a, b) => (a.show_class ?? '').localeCompare(b.show_class ?? '') || codeOf(byId, a.fish_id).localeCompare(codeOf(byId, b.fish_id)));
  const rows = mine
    .map((e, n) => {
      const f = byId[e.fish_id];
      const c = f ? colours(f) : { base: '', cover: '' };
      const cells = [
        String(n + 1),
        f?.fish_code ?? '',
        e.show_class ?? '',
        f ? labelOf(SEXES, f.sex) : '',
        f ? labelOf(TAIL_OPTIONS, f.tail_standard) : '',
        [c.base, c.cover.replace(/; /g, ', ')].filter(Boolean).join(' / '),
        f?.strain ?? '',
        scoreText(e, scores),
        e.placement ?? '',
        pointsText(e),
      ];
      return `<tr>${cells.map((v) => `<td>${escapeHtml(v)}</td>`).join('')}</tr>`;
    })
    .join('');
  const breeder = breederLine(profile);
  const headings = ['#', 'Fish', 'Class', 'Sex', 'Tail', 'Colours', 'Strain', 'IHS score', 'Placement', 'Points'];
  const estimated = mine.some((e) => e.points === null && entryPoints(e).points > 0);

  return `<html><head><meta charset="utf-8"><style>${PAGE_STYLE}</style></head><body>
    <h1>${escapeHtml(show.show_name)}</h1>
    <div class="sub">${formatDate(show.shown_on)}${breeder ? ` · Entered by ${breeder}` : ''} · ${mine.length} ${mine.length === 1 ? 'entry' : 'entries'}</div>
    <table>
      <tr>${headings.map((h) => `<th>${h}</th>`).join('')}</tr>
      ${rows}
    </table>
    ${estimated ? '<div class="foot">* Points from placing: 1st 10, 2nd 8, 3rd 6, 4th 4, 5th 2.</div>' : ''}
    <div class="foot">Printed ${formatDate(todayISO())} from Guppy Tracker.</div>
  </body></html>`;
}
