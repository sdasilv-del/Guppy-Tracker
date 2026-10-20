import { decode } from 'base64-arraybuffer';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { type FishStatus, INACTIVE_STATUSES } from '@/lib/constants';
import type { FishGene, Gene, GeneMode } from '@/lib/genetics';
import type { LinePlan } from '@/lib/line-plan';
import { ALL_GENERATIONS, collectAncestors } from '@/lib/pedigree';
import { THUMBNAIL_WIDTH, thumbnailOrPhoto, thumbnailPath } from '@/lib/photos';
import type { ScoreSummary } from '@/lib/scores';
import { supabase } from '@/lib/supabase';
import type {
  BreedingGroup,
  CareKind,
  CareLog,
  CustomReminder,
  Evaluation,
  FishTrait,
  Fish,
  FishMove,
  FishPhoto,
  ReminderSnooze,
  Sale,
  ShowEntry,
  Spawn,
  SpawnEvent,
  Tank,
  Trait,
  WaterChange,
  WaterTest,
} from '@/lib/types';

// Throws the Supabase error so screens can show it.
function must<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

// Long id lists are asked for in parts, so the request address stays a safe length.
const IDS_PER_REQUEST = 100;

async function inParts<T>(ids: string[], read: (part: string[]) => Promise<T[]>): Promise<T[]> {
  const unique = [...new Set(ids)];
  const parts: string[][] = [];
  for (let i = 0; i < unique.length; i += IDS_PER_REQUEST) parts.push(unique.slice(i, i + IDS_PER_REQUEST));
  return (await Promise.all(parts.map(read))).flat();
}

// Tanks -------------------------------------------------------------------

export async function listTanks(): Promise<Tank[]> {
  return must(await supabase.from('tanks').select('*').order('seq'));
}

export async function getTank(id: string): Promise<Tank | null> {
  return must(await supabase.from('tanks').select('*').eq('id', id).maybeSingle());
}

export type TankInput = Pick<Tank, 'name' | 'size_gallons' | 'purpose' | 'notes' | 'water_change_every_days'>;

export async function createTank(input: TankInput): Promise<Tank> {
  return must(await supabase.from('tanks').insert(input).select().single());
}

export async function updateTank(id: string, input: TankInput): Promise<void> {
  must(await supabase.from('tanks').update(input).eq('id', id));
}

// Sets how often a tank's water is changed. The Home reminder counts from the last logged change.
export async function setWaterChangeSchedule(tankId: string, everyDays: number | null): Promise<void> {
  must(await supabase.from('tanks').update({ water_change_every_days: everyDays }).eq('id', tankId));
}

export async function deleteTank(id: string): Promise<void> {
  must(await supabase.from('tanks').delete().eq('id', id));
}

// Number of active fish per tank, for the tank list.
export async function fishCountsByTank(): Promise<Record<string, number>> {
  const rows: { tank_id: string | null }[] = must(
    await supabase
      .from('fish')
      .select('tank_id')
      .not('tank_id', 'is', null)
      .not('status', 'in', '(sold,culled,deceased)'),
  );
  const counts: Record<string, number> = {};
  for (const r of rows) if (r.tank_id) counts[r.tank_id] = (counts[r.tank_id] ?? 0) + 1;
  return counts;
}

// Water log ---------------------------------------------------------------

export async function listWaterTests(tankId: string): Promise<WaterTest[]> {
  return must(
    await supabase
      .from('water_tests')
      .select('*')
      .eq('tank_id', tankId)
      .order('tested_on', { ascending: false })
      .order('created_at', { ascending: false }),
  );
}

// Every water test across all tanks, newest first, for export.
export async function listAllWaterTests(): Promise<WaterTest[]> {
  return must(
    await supabase
      .from('water_tests')
      .select('*')
      .order('tested_on', { ascending: false })
      .order('created_at', { ascending: false }),
  );
}

export async function getWaterTest(id: string): Promise<WaterTest | null> {
  return must(await supabase.from('water_tests').select('*').eq('id', id).maybeSingle());
}

export type WaterTestInput = Omit<WaterTest, 'id'>;

export async function saveWaterTest(id: string | null, input: WaterTestInput): Promise<void> {
  if (id) must(await supabase.from('water_tests').update(input).eq('id', id));
  else must(await supabase.from('water_tests').insert(input));
}

export async function deleteWaterTest(id: string): Promise<void> {
  must(await supabase.from('water_tests').delete().eq('id', id));
}

export async function listWaterChanges(tankId: string): Promise<WaterChange[]> {
  return must(
    await supabase
      .from('water_changes')
      .select('*')
      .eq('tank_id', tankId)
      .order('changed_on', { ascending: false })
      .order('created_at', { ascending: false }),
  );
}

// The most recent water change date for each tank, for reminders.
export async function lastWaterChangeByTank(): Promise<Record<string, string>> {
  const rows = must(
    await supabase.from('water_changes').select('tank_id, changed_on').order('changed_on', { ascending: false }),
  ) as Pick<WaterChange, 'tank_id' | 'changed_on'>[];
  const out: Record<string, string> = {};
  for (const r of rows) if (!out[r.tank_id]) out[r.tank_id] = r.changed_on;
  return out;
}

export async function getWaterChange(id: string): Promise<WaterChange | null> {
  return must(await supabase.from('water_changes').select('*').eq('id', id).maybeSingle());
}

export type WaterChangeInput = Omit<WaterChange, 'id'>;

export async function saveWaterChange(id: string | null, input: WaterChangeInput): Promise<void> {
  if (id) must(await supabase.from('water_changes').update(input).eq('id', id));
  else must(await supabase.from('water_changes').insert(input));
}

// The same water change in several tanks, in one request.
export async function addWaterChanges(inputs: WaterChangeInput[]): Promise<void> {
  must(await supabase.from('water_changes').insert(inputs));
}

export async function deleteWaterChange(id: string): Promise<void> {
  must(await supabase.from('water_changes').delete().eq('id', id));
}

// Feeding and treatments ---------------------------------------------------

export async function listCareLogs(tankId: string): Promise<CareLog[]> {
  return must(
    await supabase
      .from('care_logs')
      .select('*')
      .eq('tank_id', tankId)
      .order('logged_on', { ascending: false })
      .order('created_at', { ascending: false }),
  );
}

export async function getCareLog(id: string): Promise<CareLog | null> {
  return must(await supabase.from('care_logs').select('*').eq('id', id).maybeSingle());
}

// Foods or medications used before, most recent first, so the form can offer them as one-tap choices.
export async function recentCareItems(kind: CareKind): Promise<string[]> {
  const rows = must(
    await supabase
      .from('care_logs')
      .select('item')
      .eq('kind', kind)
      .order('created_at', { ascending: false })
      .limit(200),
  ) as Pick<CareLog, 'item'>[];
  return [...new Set(rows.map((r) => r.item))].slice(0, 8);
}

export type CareLogInput = Omit<CareLog, 'id' | 'created_at'>;

export async function saveCareLog(id: string | null, input: CareLogInput): Promise<void> {
  if (id) must(await supabase.from('care_logs').update(input).eq('id', id));
  else must(await supabase.from('care_logs').insert(input));
}

// The same feeding or dose in several tanks, in one request.
export async function addCareLogs(inputs: CareLogInput[]): Promise<void> {
  must(await supabase.from('care_logs').insert(inputs));
}

export async function deleteCareLog(id: string): Promise<void> {
  must(await supabase.from('care_logs').delete().eq('id', id));
}

// Fish --------------------------------------------------------------------

export async function listFish(): Promise<Fish[]> {
  return must(await supabase.from('fish').select('*').order('fish_code'));
}

export async function listFishInTank(tankId: string): Promise<Fish[]> {
  return must(await supabase.from('fish').select('*').eq('tank_id', tankId).order('fish_code'));
}

export async function getFish(id: string): Promise<Fish | null> {
  return must(await supabase.from('fish').select('*').eq('id', id).maybeSingle());
}

// Only the fish asked for, e.g. one generation of a pedigree.
export async function listFishByIds(ids: string[]): Promise<Fish[]> {
  return inParts(ids, async (part) => must(await supabase.from('fish').select('*').in('id', part).order('fish_code')));
}

// A fish's recorded ancestors, a generation per request. Leave out the depth to go all the way back,
// which inbreeding figures need; the pedigree only shows PEDIGREE_DEPTH generations.
export async function listAncestors(fish: Fish, generations = ALL_GENERATIONS): Promise<Fish[]> {
  return collectAncestors(fish, listFishByIds, generations);
}

// Possible littermates: the same spawn, or the same sire and dam when the spawn isn't recorded.
// littermates() in scores.ts makes the final choice and order.
export async function listLittermates(fish: Fish): Promise<Fish[]> {
  let query = supabase.from('fish').select('*').neq('id', fish.id);
  if (fish.spawn_id) query = query.eq('spawn_id', fish.spawn_id);
  else if (fish.sire_id && fish.dam_id) query = query.eq('sire_id', fish.sire_id).eq('dam_id', fish.dam_id);
  else return [];
  return must(await query.order('fish_code'));
}

// Fish with this fish as sire or dam.
export async function listOffspring(fishId: string): Promise<Fish[]> {
  return must(
    await supabase.from('fish').select('*').or(`sire_id.eq.${fishId},dam_id.eq.${fishId}`).order('fish_code'),
  );
}

export type FishInput = Omit<Fish, 'id' | 'fish_code' | 'previous_codes' | 'created_at'>;

export async function createFish(input: FishInput): Promise<Fish> {
  return must(await supabase.from('fish').insert(input).select().single());
}

export async function updateFish(id: string, input: Partial<FishInput>): Promise<void> {
  must(await supabase.from('fish').update(input).eq('id', id));
}

export async function deleteFish(id: string): Promise<void> {
  const [photos, evaluations] = await Promise.all([listFishPhotos(id), listEvaluations(id)]);
  const paths = [
    ...photos.flatMap((p) => [p.storage_path, thumbnailPath(p.storage_path)]),
    ...evaluations.flatMap((e) => [e.photo_path, e.certificate_path]).filter((p): p is string => !!p),
  ];
  if (paths.length > 0) {
    await supabase.storage.from('fish-photos').remove(paths);
  }
  must(await supabase.from('fish').delete().eq('id', id));
}

export async function moveFish(fishIds: string[], tankId: string | null): Promise<void> {
  if (fishIds.length === 0) return;
  must(await supabase.from('fish').update({ tank_id: tankId }).in('id', fishIds));
}

// Status changes for several fish at once. Sold, culled and deceased fish leave their tanks.
export async function setFishStatus(fishIds: string[], status: FishStatus): Promise<void> {
  if (fishIds.length === 0) return;
  const patch = INACTIVE_STATUSES.includes(status) ? { status, tank_id: null } : { status };
  must(await supabase.from('fish').update(patch).in('id', fishIds));
}

export async function listFishMoves(fishId: string): Promise<FishMove[]> {
  return must(
    await supabase
      .from('fish_moves')
      .select('*')
      .eq('fish_id', fishId)
      .order('moved_at', { ascending: false }),
  );
}

// Fish photos ---------------------------------------------------------------

export async function listFishPhotos(fishId: string): Promise<FishPhoto[]> {
  return must(
    await supabase
      .from('fish_photos')
      .select('*')
      .eq('fish_id', fishId)
      .order('taken_on', { ascending: false })
      .order('created_at', { ascending: false }),
  );
}

// Latest photo per fish, for list thumbnails.
export async function latestPhotoPaths(fishIds: string[]): Promise<Record<string, string>> {
  if (fishIds.length === 0) return {};
  const rows: Pick<FishPhoto, 'fish_id' | 'storage_path'>[] = must(
    await supabase
      .from('fish_photos')
      .select('fish_id, storage_path')
      .in('fish_id', fishIds)
      .order('taken_on', { ascending: false })
      .order('created_at', { ascending: false }),
  );
  const out: Record<string, string> = {};
  for (const r of rows) if (!out[r.fish_id]) out[r.fish_id] = r.storage_path;
  return out;
}

// Which fish have at least one photo, for the "records to finish" insight.
export async function fishIdsWithPhotos(): Promise<Set<string>> {
  const rows: Pick<FishPhoto, 'fish_id'>[] = must(await supabase.from('fish_photos').select('fish_id'));
  return new Set(rows.map((r) => r.fish_id));
}

// Uploads a photo under the account's own folder and returns its storage path.
export async function uploadPhoto(
  userId: string,
  fishId: string,
  base64: string,
  mimeType: string,
): Promise<string> {
  const ext = mimeType === 'image/png' ? 'png' : 'jpg';
  const path = `${userId}/${fishId}/${Date.now()}.${ext}`;
  const upload = await supabase.storage
    .from('fish-photos')
    .upload(path, decode(base64), { contentType: mimeType });
  if (upload.error) throw new Error(upload.error.message);
  return path;
}

// A small JPEG copy of a photo for lists, returned as base64.
async function makeThumbnail(base64: string, mimeType: string): Promise<string> {
  const context = ImageManipulator.manipulate(`data:${mimeType};base64,${base64}`);
  try {
    const image = await context.resize({ width: THUMBNAIL_WIDTH }).renderAsync();
    try {
      const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
      if (!saved.base64) throw new Error('The thumbnail could not be made.');
      return saved.base64;
    } finally {
      image.release();
    }
  } finally {
    context.release();
  }
}

// Saves the thumbnail next to the photo. It's an extra: if it fails, lists show the full photo instead.
async function uploadThumbnail(path: string, base64: string, mimeType: string): Promise<void> {
  try {
    const small = await makeThumbnail(base64, mimeType);
    await supabase.storage.from('fish-photos').upload(thumbnailPath(path), decode(small), { contentType: 'image/jpeg' });
  } catch {}
}

export async function addFishPhoto(
  userId: string,
  fishId: string,
  base64: string,
  mimeType: string,
): Promise<void> {
  const path = await uploadPhoto(userId, fishId, base64, mimeType);
  // The thumbnail goes up before the photo is listed, so a list never looks for one still on its way.
  await uploadThumbnail(path, base64, mimeType);
  must(await supabase.from('fish_photos').insert({ fish_id: fishId, storage_path: path }));
}

export async function deleteFishPhoto(photo: FishPhoto): Promise<void> {
  await supabase.storage.from('fish-photos').remove([photo.storage_path, thumbnailPath(photo.storage_path)]);
  must(await supabase.from('fish_photos').delete().eq('id', photo.id));
}

// Photos are private, so screens show them through short-lived signed links. Each link is reused
// for half its life: fewer requests, and the same link lets the image cache show the photo
// without downloading it again.
const SIGNED_SECONDS = 3600;
const signed = new Map<string, { url: string; at: number }>();

export async function signedPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const fresh = Date.now() - (SIGNED_SECONDS * 1000) / 2;
  const missing = [...new Set(paths)].filter((p) => {
    const hit = signed.get(p);
    if (hit && hit.at > fresh) out[p] = hit.url;
    return !out[p];
  });
  if (missing.length === 0) return out;
  const { data, error } = await supabase.storage.from('fish-photos').createSignedUrls(missing, SIGNED_SECONDS);
  if (error) throw new Error(error.message);
  for (const item of data) {
    if (!item.path || !item.signedUrl) continue;
    out[item.path] = item.signedUrl;
    signed.set(item.path, { url: item.signedUrl, at: Date.now() });
  }
  return out;
}

// Links for list rows: each photo's thumbnail, or the full photo when it has none (older photos).
// Thumbnails known to be missing aren't asked for again until the app restarts.
const noThumbnail = new Set<string>();

export async function signedThumbnailUrls(paths: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths)];
  const tryThumbs = unique.filter((p) => !noThumbnail.has(thumbnailPath(p)));
  let thumbs: Record<string, string> = {};
  if (tryThumbs.length > 0) {
    try {
      thumbs = await signedPhotoUrls(tryThumbs.map(thumbnailPath));
      for (const p of tryThumbs) if (!thumbs[thumbnailPath(p)]) noThumbnail.add(thumbnailPath(p));
    } catch {
      // Fall back to the full photos below.
    }
  }
  const full = unique.filter((p) => !thumbs[thumbnailPath(p)]);
  const photos = full.length > 0 ? await signedPhotoUrls(full) : {};
  return thumbnailOrPhoto(unique, thumbs, photos);
}

// Traits ----------------------------------------------------------------------

export async function listTraits(): Promise<Trait[]> {
  return must(await supabase.from('traits').select('id, name').order('name'));
}

export async function createTrait(name: string): Promise<Trait> {
  return must(await supabase.from('traits').insert({ name: name.trim() }).select('id, name').single());
}

// Breeding groups -----------------------------------------------------------------

export async function listGroups(): Promise<BreedingGroup[]> {
  return must(await supabase.from('breeding_groups').select('*').order('seq', { ascending: false }));
}

export async function getGroup(id: string): Promise<BreedingGroup | null> {
  return must(await supabase.from('breeding_groups').select('*').eq('id', id).maybeSingle());
}

export type GroupInput = Omit<BreedingGroup, 'id' | 'group_code' | 'created_at'>;

export async function createGroup(input: GroupInput): Promise<BreedingGroup> {
  return must(await supabase.from('breeding_groups').insert(input).select().single());
}

export async function updateGroup(id: string, input: Partial<GroupInput>): Promise<void> {
  must(await supabase.from('breeding_groups').update(input).eq('id', id));
}

export async function deleteGroup(id: string): Promise<void> {
  must(await supabase.from('breeding_groups').delete().eq('id', id));
}

// Member fish ids for every group, keyed by group id.
export async function groupMembers(groupIds?: string[]): Promise<Record<string, string[]>> {
  let query = supabase.from('breeding_group_members').select('group_id, fish_id');
  if (groupIds) query = query.in('group_id', groupIds);
  const rows: { group_id: string; fish_id: string }[] = must(await query);
  const out: Record<string, string[]> = {};
  for (const r of rows) (out[r.group_id] ??= []).push(r.fish_id);
  return out;
}

export async function groupTraitIds(groupId: string): Promise<string[]> {
  const rows: { trait_id: string }[] = must(
    await supabase.from('breeding_group_traits').select('trait_id').eq('group_id', groupId),
  );
  return rows.map((r) => r.trait_id);
}

// Replaces a group's rows in a link table with the given ids.
async function setLinks(
  table: 'breeding_group_members' | 'breeding_group_traits',
  column: 'fish_id' | 'trait_id',
  groupId: string,
  current: string[],
  next: string[],
): Promise<void> {
  const removed = current.filter((id) => !next.includes(id));
  const added = next.filter((id) => !current.includes(id));
  if (removed.length > 0) {
    must(await supabase.from(table).delete().eq('group_id', groupId).in(column, removed));
  }
  if (added.length > 0) {
    must(await supabase.from(table).insert(added.map((id) => ({ group_id: groupId, [column]: id }))));
  }
}

export async function setGroupMembers(groupId: string, fishIds: string[]): Promise<void> {
  const current = (await groupMembers([groupId]))[groupId] ?? [];
  await setLinks('breeding_group_members', 'fish_id', groupId, current, fishIds);
}

export async function setGroupTraits(groupId: string, traitIds: string[]): Promise<void> {
  const current = await groupTraitIds(groupId);
  await setLinks('breeding_group_traits', 'trait_id', groupId, current, traitIds);
}

// Groups a fish belongs to.
export async function groupIdsForFish(fishId: string): Promise<string[]> {
  const rows: { group_id: string }[] = must(
    await supabase.from('breeding_group_members').select('group_id').eq('fish_id', fishId),
  );
  return rows.map((r) => r.group_id);
}

// Spawns ------------------------------------------------------------------------------

export async function listSpawns(): Promise<Spawn[]> {
  return must(
    await supabase
      .from('spawns')
      .select('*')
      .order('born_on', { ascending: false })
      .order('seq', { ascending: false }),
  );
}

// Spawns kept in a tank, newest first.
export async function listSpawnsInTank(tankId: string): Promise<Spawn[]> {
  return must(
    await supabase
      .from('spawns')
      .select('*')
      .eq('tank_id', tankId)
      .order('born_on', { ascending: false })
      .order('seq', { ascending: false }),
  );
}

// Only the spawns asked for, newest first.
export async function listSpawnsByIds(ids: string[]): Promise<Spawn[]> {
  return inParts(ids, async (part) =>
    must(
      await supabase
        .from('spawns')
        .select('*')
        .in('id', part)
        .order('born_on', { ascending: false })
        .order('seq', { ascending: false }),
    ),
  );
}

// Spawns a fish was the sire or dam of, newest first.
export async function listSpawnsWithParent(fishId: string): Promise<Spawn[]> {
  return must(
    await supabase
      .from('spawns')
      .select('*')
      .or(`sire_id.eq.${fishId},dam_id.eq.${fishId}`)
      .order('born_on', { ascending: false })
      .order('seq', { ascending: false }),
  );
}

export async function getSpawn(id: string): Promise<Spawn | null> {
  return must(await supabase.from('spawns').select('*').eq('id', id).maybeSingle());
}

export type SpawnInput = Omit<Spawn, 'id' | 'spawn_code' | 'created_at'>;

export async function createSpawn(input: SpawnInput): Promise<Spawn> {
  return must(await supabase.from('spawns').insert(input).select().single());
}

export async function updateSpawn(id: string, input: Partial<SpawnInput>): Promise<void> {
  must(await supabase.from('spawns').update(input).eq('id', id));
}

export async function deleteSpawn(id: string): Promise<void> {
  must(await supabase.from('spawns').delete().eq('id', id));
}

// Batch log entries, oldest first. Pass spawn ids to limit, or nothing for all spawns.
export async function listSpawnEvents(spawnIds?: string[]): Promise<SpawnEvent[]> {
  let query = supabase.from('spawn_events').select('*');
  if (spawnIds) query = query.in('spawn_id', spawnIds);
  return must(await query.order('happened_on').order('created_at'));
}

export async function getSpawnEvent(id: string): Promise<SpawnEvent | null> {
  return must(await supabase.from('spawn_events').select('*').eq('id', id).maybeSingle());
}

export type SpawnEventInput = Omit<SpawnEvent, 'id' | 'created_at'>;

export async function saveSpawnEvent(id: string | null, input: SpawnEventInput): Promise<void> {
  if (id) must(await supabase.from('spawn_events').update(input).eq('id', id));
  else must(await supabase.from('spawn_events').insert(input));
}

export async function deleteSpawnEvent(id: string): Promise<void> {
  must(await supabase.from('spawn_events').delete().eq('id', id));
}

// Parts of batches moved into a tank, for the tank page.
export async function spawnMovesIntoTank(tankId: string): Promise<SpawnEvent[]> {
  return must(
    await supabase
      .from('spawn_events')
      .select('*')
      .eq('kind', 'move')
      .eq('to_tank_id', tankId)
      .order('happened_on', { ascending: false }),
  );
}

// Fish picked from a spawn.
export async function listPicks(spawnId: string): Promise<Fish[]> {
  return must(await supabase.from('fish').select('*').eq('spawn_id', spawnId).order('created_at'));
}

// Fish picked from any of these spawns.
export async function listPicksFromSpawns(spawnIds: string[]): Promise<Fish[]> {
  return inParts(spawnIds, async (part) =>
    must(await supabase.from('fish').select('*').in('spawn_id', part).order('created_at')),
  );
}

// Trait records ---------------------------------------------------------------

export async function listFishTraits(fishId: string): Promise<FishTrait[]> {
  return must(
    await supabase
      .from('fish_traits')
      .select('*')
      .eq('fish_id', fishId)
      .order('recorded_on', { ascending: false })
      .order('created_at', { ascending: false }),
  );
}

// Trait records for several fish, newest first, e.g. a breeding group's members.
export async function listTraitsForFish(fishIds: string[]): Promise<FishTrait[]> {
  if (fishIds.length === 0) return [];
  return must(
    await supabase
      .from('fish_traits')
      .select('*')
      .in('fish_id', fishIds)
      .order('recorded_on', { ascending: false })
      .order('created_at', { ascending: false }),
  );
}

export async function getFishTrait(id: string): Promise<FishTrait | null> {
  return must(await supabase.from('fish_traits').select('*').eq('id', id).maybeSingle());
}

export type FishTraitInput = Omit<FishTrait, 'id' | 'created_at'>;

export async function saveFishTrait(id: string | null, input: FishTraitInput): Promise<void> {
  if (id) must(await supabase.from('fish_traits').update(input).eq('id', id));
  else must(await supabase.from('fish_traits').insert(input));
}

export async function deleteFishTrait(id: string): Promise<void> {
  must(await supabase.from('fish_traits').delete().eq('id', id));
}

// IHS evaluations -------------------------------------------------------------

export async function listEvaluations(fishId: string): Promise<Evaluation[]> {
  return must(
    await supabase
      .from('evaluations')
      .select('*')
      .eq('fish_id', fishId)
      .order('evaluated_on', { ascending: false })
      .order('created_at', { ascending: false }),
  );
}

// Every evaluation's score, for strain and generation stats.
export async function listEvaluationScores(): Promise<Pick<Evaluation, 'fish_id' | 'sex' | 'total' | 'kind'>[]> {
  return must(await supabase.from('evaluations').select('fish_id, sex, total, kind'));
}

// Every evaluation without its sheet details, for the Home insights.
export async function listEvaluationSummaries(): Promise<
  Pick<Evaluation, 'id' | 'fish_id' | 'sex' | 'total' | 'kind' | 'evaluated_on' | 'event' | 'placement'>[]
> {
  return must(
    await supabase
      .from('evaluations')
      .select('id, fish_id, sex, total, kind, evaluated_on, event, placement')
      .order('evaluated_on', { ascending: false }),
  );
}

// Each fish's best IHS result, one row per fish, worked out by the database (fish_best_scores view).
// Pass fish ids to limit it to those fish.
export type BestScore = ScoreSummary & Pick<Evaluation, 'evaluated_on'> & { evaluation_id: string };

const BEST_SCORE_COLUMNS = 'fish_id, evaluation_id, sex, total, kind, evaluated_on';

export async function listBestScores(fishIds?: string[]): Promise<BestScore[]> {
  if (!fishIds) return must(await supabase.from('fish_best_scores').select(BEST_SCORE_COLUMNS));
  return inParts(fishIds, async (part) =>
    must(await supabase.from('fish_best_scores').select(BEST_SCORE_COLUMNS).in('fish_id', part)),
  );
}

// Evaluations from a date on, without their sheet details, e.g. this season's for the Home insights.
export async function listEvaluationSummariesSince(from: string): Promise<
  Pick<Evaluation, 'id' | 'fish_id' | 'sex' | 'total' | 'kind' | 'evaluated_on' | 'event' | 'placement'>[]
> {
  return must(
    await supabase
      .from('evaluations')
      .select('id, fish_id, sex, total, kind, evaluated_on, event, placement')
      .gte('evaluated_on', from)
      .order('evaluated_on', { ascending: false }),
  );
}

export async function getEvaluation(id: string): Promise<Evaluation | null> {
  return must(await supabase.from('evaluations').select('*').eq('id', id).maybeSingle());
}

// The total is added up by the database from the scores.
// The male link and lengths are no longer edited, so a save leaves any old values as they were.
export type EvaluationInput = Omit<
  Evaluation,
  'id' | 'created_at' | 'total' | 'male_id' | 'female_length_mm' | 'male_length_mm' | 'locked_at' | 'seal'
>;

export async function saveEvaluation(id: string | null, input: EvaluationInput): Promise<void> {
  if (id) must(await supabase.from('evaluations').update(input).eq('id', id));
  else must(await supabase.from('evaluations').insert(input));
}

// Signs a score. The database checks there's a judge's name, adds the seal, and refuses any later change.
export async function lockEvaluation(id: string): Promise<void> {
  must(await supabase.from('evaluations').update({ locked_at: new Date().toISOString() }).eq('id', id));
}

export async function removeStoredPhotos(paths: string[]): Promise<void> {
  if (paths.length > 0) await supabase.storage.from('fish-photos').remove(paths);
}

export async function deleteEvaluation(evaluation: Evaluation): Promise<void> {
  await removeStoredPhotos([evaluation.photo_path, evaluation.certificate_path].filter((p): p is string => !!p));
  must(await supabase.from('evaluations').delete().eq('id', evaluation.id));
}

// Show entries ------------------------------------------------------------------
// The database adds an entry for every official show score. Only those are listed; hand-made entries
// from before that are kept but not shown.

export async function listShowEntries(fishId: string): Promise<ShowEntry[]> {
  return must(
    await supabase
      .from('show_entries')
      .select('*')
      .eq('fish_id', fishId)
      .not('evaluation_id', 'is', null)
      .order('shown_on', { ascending: false })
      .order('created_at', { ascending: false }),
  );
}

export async function listAllShowEntries(): Promise<ShowEntry[]> {
  return must(
    await supabase
      .from('show_entries')
      .select('*')
      .not('evaluation_id', 'is', null)
      .order('shown_on', { ascending: false })
      .order('created_at', { ascending: false }),
  );
}

// Show results for some fish only, e.g. a fish's relatives, newest first.
export async function listShowEntriesForFish(fishIds: string[]): Promise<ShowEntry[]> {
  const rows = await inParts(fishIds, async (part) =>
    must(
      await supabase
        .from('show_entries')
        .select('*')
        .in('fish_id', part)
        .not('evaluation_id', 'is', null)
        .order('shown_on', { ascending: false })
        .order('created_at', { ascending: false }),
    ),
  );
  return rows.sort((a, b) => b.shown_on.localeCompare(a.shown_on) || b.created_at.localeCompare(a.created_at));
}

export async function getShowEntry(id: string): Promise<ShowEntry | null> {
  return must(await supabase.from('show_entries').select('*').eq('id', id).maybeSingle());
}

export type ShowEntryInput = Omit<ShowEntry, 'id' | 'created_at' | 'evaluation_id'>;

export async function saveShowEntry(id: string | null, input: ShowEntryInput): Promise<void> {
  if (id) must(await supabase.from('show_entries').update(input).eq('id', id));
  else must(await supabase.from('show_entries').insert(input));
}

// Sales ---------------------------------------------------------------------------

export async function listSales(fishId?: string): Promise<Sale[]> {
  let query = supabase.from('sales').select('*');
  if (fishId) query = query.eq('fish_id', fishId);
  return must(await query.order('sold_on', { ascending: false }).order('created_at', { ascending: false }));
}

export async function getSale(id: string): Promise<Sale | null> {
  return must(await supabase.from('sales').select('*').eq('id', id).maybeSingle());
}

export type SaleInput = Omit<Sale, 'id' | 'created_at'>;

// A new sale also marks the fish sold and takes it out of its tank.
export async function saveSale(id: string | null, input: SaleInput): Promise<void> {
  if (id) {
    must(await supabase.from('sales').update(input).eq('id', id));
    return;
  }
  must(await supabase.from('sales').insert(input));
  must(await supabase.from('fish').update({ status: 'sold', tank_id: null }).eq('id', input.fish_id));
}

// One sale per fish, all on the same terms, e.g. a group of fry sold to one buyer.
export async function addSales(inputs: SaleInput[]): Promise<void> {
  if (inputs.length === 0) return;
  must(await supabase.from('sales').insert(inputs));
  must(await supabase.from('fish').update({ status: 'sold', tank_id: null }).in('id', inputs.map((i) => i.fish_id)));
}

export async function deleteSale(id: string): Promise<void> {
  must(await supabase.from('sales').delete().eq('id', id));
}

// Reminders ---------------------------------------------------------------------

export async function listCustomReminders(): Promise<CustomReminder[]> {
  return must(await supabase.from('custom_reminders').select('*').order('due_on'));
}

export async function getCustomReminder(id: string): Promise<CustomReminder | null> {
  return must(await supabase.from('custom_reminders').select('*').eq('id', id).maybeSingle());
}

export type CustomReminderInput = Omit<CustomReminder, 'id' | 'created_at'>;

export async function saveCustomReminder(id: string | null, input: CustomReminderInput): Promise<void> {
  if (id) must(await supabase.from('custom_reminders').update(input).eq('id', id));
  else must(await supabase.from('custom_reminders').insert(input));
}

export async function deleteCustomReminder(id: string): Promise<void> {
  must(await supabase.from('custom_reminders').delete().eq('id', id));
}

export async function listSnoozes(): Promise<ReminderSnooze[]> {
  return must(await supabase.from('reminder_snoozes').select('reminder_key, snoozed_until'));
}

export async function snoozeReminder(key: string, until: string): Promise<void> {
  must(
    await supabase
      .from('reminder_snoozes')
      .upsert({ reminder_key: key, snoozed_until: until }, { onConflict: 'user_id,reminder_key' }),
  );
}

// Colour genes ------------------------------------------------------------------

export async function listGenes(): Promise<Gene[]> {
  return must(await supabase.from('genes').select('id, name, mode, notes').order('name'));
}

export async function createGene(name: string, mode: GeneMode): Promise<Gene> {
  return must(await supabase.from('genes').insert({ name: name.trim(), mode }).select('id, name, mode, notes').single());
}

export async function deleteGene(id: string): Promise<void> {
  must(await supabase.from('genes').delete().eq('id', id));
}

export async function listFishGenes(fishIds?: string[]): Promise<FishGene[]> {
  let query = supabase.from('fish_genes').select('fish_id, gene_id, copies');
  if (fishIds) query = query.in('fish_id', fishIds);
  return must(await query);
}

// Null means not known, which removes the record.
export async function setFishGene(fishId: string, geneId: string, copies: number | null): Promise<void> {
  if (copies === null) {
    must(await supabase.from('fish_genes').delete().eq('fish_id', fishId).eq('gene_id', geneId));
    return;
  }
  must(
    await supabase
      .from('fish_genes')
      .upsert({ fish_id: fishId, gene_id: geneId, copies, updated_at: new Date().toISOString() }, { onConflict: 'fish_id,gene_id' }),
  );
}

// Line plans ----------------------------------------------------------------------

export async function listLinePlans(): Promise<LinePlan[]> {
  return must(await supabase.from('line_plans').select('id, name, sire_id, dam_id, steps, notes, updated_at').order('updated_at', { ascending: false }));
}

export async function getLinePlan(id: string): Promise<LinePlan | null> {
  return must(
    await supabase.from('line_plans').select('id, name, sire_id, dam_id, steps, notes, updated_at').eq('id', id).maybeSingle(),
  );
}

export type LinePlanInput = Omit<LinePlan, 'id' | 'updated_at'>;

export async function saveLinePlan(id: string | null, input: LinePlanInput): Promise<void> {
  if (id) must(await supabase.from('line_plans').update(input).eq('id', id));
  else must(await supabase.from('line_plans').insert(input));
}

export async function deleteLinePlan(id: string): Promise<void> {
  must(await supabase.from('line_plans').delete().eq('id', id));
}
