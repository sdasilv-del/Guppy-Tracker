import { decode } from 'base64-arraybuffer';

import { supabase } from '@/lib/supabase';
import type { Fish, FishMove, FishPhoto, Tank, WaterChange, WaterTest } from '@/lib/types';

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
  const photos = await listFishPhotos(id);
  if (photos.length > 0) {
    await supabase.storage.from('fish-photos').remove(photos.map((p) => p.storage_path));
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

export async function addFishPhoto(
  userId: string,
  fishId: string,
  base64: string,
  mimeType: string,
): Promise<void> {
  const ext = mimeType === 'image/png' ? 'png' : 'jpg';
  const path = `${userId}/${fishId}/${Date.now()}.${ext}`;
  const upload = await supabase.storage
    .from('fish-photos')
    .upload(path, decode(base64), { contentType: mimeType });
  if (upload.error) throw new Error(upload.error.message);
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
