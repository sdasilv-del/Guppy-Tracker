import { type Href } from 'expo-router';

import { ihsMaxTotal, INACTIVE_STATUSES } from '@/lib/constants';
import { formatInbreeding, makeKinship } from '@/lib/kinship';
import { daysBetween } from '@/lib/reminders';
import { groupResults, percent, spawnResult, summarizeBatch } from '@/lib/spawn';
import type { BreedingGroup, Evaluation, Fish, Sale, ShowEntry, Spawn, SpawnEvent, Tank, WaterTest } from '@/lib/types';

export type InsightKind = 'water' | 'losses' | 'breeding' | 'inbreeding' | 'top' | 'sales' | 'crowded' | 'records';

// One line on the Home screen. warn marks something that needs looking at.
export type Insight = { key: string; kind: InsightKind; title: string; detail: string; warn: boolean; href?: Href };

export type InsightData = {
  today: string;
  tanks: Tank[];
  fish: Fish[];
  spawns: Spawn[];
  events: SpawnEvent[];
  waterTests: WaterTest[];
  evaluations: Pick<Evaluation, 'id' | 'fish_id' | 'sex' | 'total' | 'kind' | 'evaluated_on' | 'event' | 'placement'>[];
  shows: ShowEntry[];
  sales: Sale[];
  groups: BreedingGroup[];
  members: Record<string, string[]>;
  withPhotos: Set<string>;
};

// A tank goes this long without a test before Home mentions it.
export const TEST_EVERY_DAYS = 14;
// More fish than this per gallon counts as crowded.
export const CROWDED_PER_GALLON = 2;
// Fry losses this week worth a warning: at least 3 fish and a tenth of the batch.
const LOSS_MIN = 3;
const LOSS_SHARE = 0.1;

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function listCodes(fish: Fish[], max = 4): string {
  const codes = fish.slice(0, max).map((f) => f.fish_code);
  return fish.length > max ? `${codes.join(', ')} and ${fish.length - max} more` : codes.join(', ');
}

export function buildInsights(d: InsightData): Insight[] {
  const out: Insight[] = [];
  const active = d.fish.filter((f) => !INACTIVE_STATUSES.includes(f.status));
  const byId = new Map(d.fish.map((f) => [f.id, f]));
  const code = (id: string | null) => (id ? byId.get(id)?.fish_code ?? '?' : 'Unknown');
  const tankName = (t: Tank) => (t.name ? `${t.tank_code} ${t.name}` : t.tank_code);
  const fishIn = (tankId: string) => active.filter((f) => f.tank_id === tankId).length;

  // 1. Water: ammonia or nitrite in the last test, or a stocked tank that hasn't been tested lately.
  const lastTest = new Map<string, WaterTest>();
  for (const t of d.waterTests) if (!lastTest.has(t.tank_id)) lastTest.set(t.tank_id, t);
  for (const tank of d.tanks) {
    const test = lastTest.get(tank.id);
    const href: Href = { pathname: '/tanks/[id]', params: { id: tank.id } };
    const bad = [
      test?.ammonia ? `ammonia ${test.ammonia}` : null,
      test?.nitrite ? `nitrite ${test.nitrite}` : null,
    ].filter(Boolean);
    if (test && bad.length > 0) {
      out.push({ key: `water-${tank.id}`, kind: 'water', title: `${tankName(tank)}: ${bad.join(', ')}`, detail: 'In the last water test. Should be 0.', warn: true, href });
    } else if (fishIn(tank.id) > 0 && (!test || daysBetween(test.tested_on, d.today) > TEST_EVERY_DAYS)) {
      out.push({
        key: `water-${tank.id}`,
        kind: 'water',
        title: `${tankName(tank)}: test the water`,
        detail: test ? `Last tested ${daysBetween(test.tested_on, d.today)} days ago.` : 'Never tested.',
        warn: true,
        href,
      });
    }
  }

  // 3. Fry losses this week, for batches still growing out.
  for (const s of d.spawns) {
    if (summarizeBatch(s, d.events, d.fish).remaining === 0) continue;
    const lost = d.events
      .filter((e) => e.spawn_id === s.id && e.kind === 'loss' && daysBetween(e.happened_on, d.today) <= 7)
      .reduce((sum, e) => sum + (e.count ?? 0), 0);
    if (lost >= LOSS_MIN && lost >= s.fry_count * LOSS_SHARE) {
      out.push({
        key: `loss-${s.id}`,
        kind: 'losses',
        title: `${s.spawn_code}: ${plural(lost, 'fry', 'fry')} lost this week`,
        detail: `${Math.round((lost / Math.max(1, s.fry_count)) * 100)}% of the batch. Check water and feeding.`,
        warn: true,
        href: { pathname: '/spawns/[id]', params: { id: s.id } },
      });
    }
  }

  // 4. Breeding at a glance.
  if (d.spawns.length > 0) {
    const month = d.today.slice(0, 7);
    const thisMonth = d.spawns.filter((s) => s.born_on.slice(0, 7) === month);
    const results = d.spawns.map((s) => ({ spawn: s, result: spawnResult(s, d.events, d.fish, d.today) }));
    const [all] = groupResults(results.map((r) => ({ key: 'all', result: r.result })));
    const [bestPair] = groupResults(
      results.filter((r) => r.spawn.sire_id && r.spawn.dam_id).map((r) => ({ key: `${code(r.spawn.sire_id)} × ${code(r.spawn.dam_id)}`, result: r.result })),
    );
    out.push({
      key: 'breeding',
      kind: 'breeding',
      title: `${plural(thisMonth.length, 'spawn')} this month · ${thisMonth.reduce((n, s) => n + s.fry_count, 0)} fry`,
      detail: [
        `8-week survival ${percent(all.survival8)}`,
        bestPair && bestPair.keepers > 0 ? `best pair ${bestPair.key} (${bestPair.keepersPerSpawn.toFixed(1)} keepers a spawn)` : null,
      ]
        .filter(Boolean)
        .join(' · '),
      warn: false,
      href: '/spawns/results',
    });
  }

  // 5. Inbreeding watch: active groups whose fry would be 25% or more.
  const kin = makeKinship(d.fish);
  for (const g of d.groups.filter((x) => !x.ended_on)) {
    const members = (d.members[g.id] ?? []).map((id) => byId.get(id)).filter((f): f is Fish => !!f);
    const males = members.filter((f) => f.sex === 'M');
    const females = members.filter((f) => f.sex === 'F');
    let worst = 0;
    for (const m of males) for (const f of females) worst = Math.max(worst, kin.offspringInbreeding(m.id, f.id));
    if (worst >= 0.25) {
      out.push({
        key: `inbreeding-${g.id}`,
        kind: 'inbreeding',
        title: `${g.name ? `${g.group_code} ${g.name}` : g.group_code}: fry up to ${formatInbreeding(worst)} inbred`,
        detail: 'Brother and sister level or closer. Consider an outcross.',
        warn: true,
        href: { pathname: '/groups/[id]', params: { id: g.id } },
      });
    }
  }

  // 6. Top fish this season, and the latest official result.
  const year = d.today.slice(0, 4);
  const season = d.evaluations.filter((e) => e.evaluated_on.startsWith(year) && byId.has(e.fish_id));
  const best = season.reduce<(typeof season)[number] | null>(
    (b, e) => (!b || e.total / ihsMaxTotal(e.sex) > b.total / ihsMaxTotal(b.sex) ? e : b),
    null,
  );
  if (best) {
    const latest = d.shows.find((s) => byId.has(s.fish_id));
    out.push({
      key: 'top',
      kind: 'top',
      title: `Top fish ${year}: ${code(best.fish_id)} · ${best.total} / ${ihsMaxTotal(best.sex)}`,
      detail: latest
        ? `Latest show: ${latest.show_name}, ${code(latest.fish_id)}${latest.placement ? `, ${latest.placement}` : ''}`
        : 'No official show results yet.',
      warn: false,
      href: { pathname: '/fish/[id]', params: { id: best.fish_id } },
    });
  }

  // 7. Sales this month, with income per currency.
  const month = d.today.slice(0, 7);
  const sold = d.sales.filter((s) => s.sold_on.slice(0, 7) === month);
  if (sold.length > 0) {
    const income = new Map<string, number>();
    for (const s of sold) if (s.price !== null) income.set(s.currency, (income.get(s.currency) ?? 0) + s.price);
    out.push({
      key: 'sales',
      kind: 'sales',
      title: `${plural(sold.length, 'fish', 'fish')} sold this month`,
      detail: income.size > 0 ? [...income].map(([c, v]) => `${v.toFixed(2)} ${c}`).join(' · ') : 'No prices recorded.',
      warn: false,
    });
  }

  // 8. Crowded tanks, counting fish only (not fry batches).
  for (const tank of d.tanks) {
    const n = fishIn(tank.id);
    if (!tank.size_gallons || n / tank.size_gallons <= CROWDED_PER_GALLON) continue;
    out.push({
      key: `crowded-${tank.id}`,
      kind: 'crowded',
      title: `${tankName(tank)}: ${n} fish in ${tank.size_gallons} gal`,
      detail: `${(n / tank.size_gallons).toFixed(1)} a gallon. Think about moving some.`,
      warn: true,
      href: { pathname: '/tanks/[id]', params: { id: tank.id } },
    });
  }

  // 9. Records to finish on fish still in the fish room.
  const noPhoto = active.filter((f) => !d.withPhotos.has(f.id));
  // Bought, imported and foundation fish often have no parents on record, so only home-bred fish count.
  const noParents = active.filter((f) => f.origin === 'bred' && !f.foundation && (!f.sire_id || !f.dam_id));
  const unsure = active.filter((f) => f.tail_standard === 'U');
  const todo = [
    noPhoto.length ? `${plural(noPhoto.length, 'fish', 'fish')} without a photo (${listCodes(noPhoto)})` : null,
    noParents.length ? `${plural(noParents.length, 'home-bred fish', 'home-bred fish')} missing a parent (${listCodes(noParents)})` : null,
    unsure.length ? `${plural(unsure.length, 'tail', 'tails')} still "Not sure yet" (${listCodes(unsure)})` : null,
  ].filter((x): x is string => !!x);
  if (todo.length > 0) {
    out.push({ key: 'records', kind: 'records', title: 'Records to finish', detail: todo.join('\n'), warn: false, href: '/fish' });
  }

  // Problems first, then the summaries.
  return out.sort((a, b) => Number(b.warn) - Number(a.warn));
}
