import { decode } from 'base64-arraybuffer';

import { supabase } from '@/lib/supabase';
import type {
  BreedingGroup,
  CareKind,
  CareLog,
  Evaluation,
  FishTrait,
  Fish,
  FishMove,
  FishPhoto,
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

// Tanks -------------------------------------------------------------------

export async function listTanks(): Promise<Tank[]> {
  return must(await supabase.from('tanks').select('*').order('seq'));
}

export async function getTank(id: string): Promise<Tank | null> {
  return must(await supabase.from('tanks').select('*').eq('id', id).maybeSingle());
}

export type TankInput = Pick<Tank, 'name' | 'size_gallons' | 'purpose' | 'notes'>;

export async function createTank(input: TankInput): Promise<Tank> {
  return must(await supabase.from('tanks').insert(input).select().single());
}

export async function updateTank(id: string, input: TankInput): Promise<void> {
  must(await supabase.from('tanks').update(input).eq('id', id));
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

export async function getWaterChange(id: string): Promise<WaterChange | null> {
  return must(await supabase.from('water_changes').select('*').eq('id', id).maybeSingle());
}

export type WaterChangeInput = Omit<WaterChange, 'id'>;

export async function saveWaterChange(id: string | null, input: WaterChangeInput): Promise<void> {
  if (id) must(await supabase.from('water_changes').update(input).eq('id', id));
  else must(await supabase.from('water_changes').insert(input));
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
    ...photos.map((p) => p.storage_path),
    ...evaluations.map((e) => e.photo_path).filter((p): p is string => !!p),
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

export async function addFishPhoto(
  userId: string,
  fishId: string,
  base64: string,
  mimeType: string,
): Promise<void> {
  const path = await uploadPhoto(userId, fishId, base64, mimeType);
  must(await supabase.from('fish_photos').insert({ fish_id: fishId, storage_path: path }));
}

export async function deleteFishPhoto(photo: FishPhoto): Promise<void> {
  await supabase.storage.from('fish-photos').remove([photo.storage_path]);
  must(await supabase.from('fish_photos').delete().eq('id', photo.id));
}

// Photos are private, so screens show them through short-lived signed links.
export async function signedPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage.from('fish-photos').createSignedUrls(paths, 3600);
  if (error) throw new Error(error.message);
  const out: Record<string, string> = {};
  for (const item of data) if (item.path && item.signedUrl) out[item.path] = item.signedUrl;
  return out;
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

export async function getEvaluation(id: string): Promise<Evaluation | null> {
  return must(await supabase.from('evaluations').select('*').eq('id', id).maybeSingle());
}

// The total is added up by the database from the scores.
// The male link and lengths are no longer edited, so a save leaves any old values as they were.
export type EvaluationInput = Omit<Evaluation, 'id' | 'created_at' | 'total' | 'male_id' | 'female_length_mm' | 'male_length_mm'>;

export async function saveEvaluation(id: string | null, input: EvaluationInput): Promise<void> {
  if (id) must(await supabase.from('evaluations').update(input).eq('id', id));
  else must(await supabase.from('evaluations').insert(input));
}

export async function removeStoredPhotos(paths: string[]): Promise<void> {
  if (paths.length > 0) await supabase.storage.from('fish-photos').remove(paths);
}

export async function deleteEvaluation(evaluation: Evaluation): Promise<void> {
  if (evaluation.photo_path) await removeStoredPhotos([evaluation.photo_path]);
  must(await supabase.from('evaluations').delete().eq('id', evaluation.id));
}

// Show entries ------------------------------------------------------------------

export async function listShowEntries(fishId: string): Promise<ShowEntry[]> {
  return must(
    await supabase
      .from('show_entries')
      .select('*')
      .eq('fish_id', fishId)
      .order('shown_on', { ascending: false })
      .order('created_at', { ascending: false }),
  );
}

export async function getShowEntry(id: string): Promise<ShowEntry | null> {
  return must(await supabase.from('show_entries').select('*').eq('id', id).maybeSingle());
}

export type ShowEntryInput = Omit<ShowEntry, 'id' | 'created_at'>;

export async function saveShowEntry(id: string | null, input: ShowEntryInput): Promise<void> {
  if (id) must(await supabase.from('show_entries').update(input).eq('id', id));
  else must(await supabase.from('show_entries').insert(input));
}

export async function deleteShowEntry(id: string): Promise<void> {
  must(await supabase.from('show_entries').delete().eq('id', id));
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

export async function deleteSale(id: string): Promise<void> {
  must(await supabase.from('sales').delete().eq('id', id));
}
