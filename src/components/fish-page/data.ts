import {
  getFish,
  getSpawn,
  groupIdsForFish,
  listAncestors,
  listBestScores,
  listEvaluations,
  listFishGenes,
  listFishMoves,
  listFishPhotos,
  listFishTraits,
  listGenes,
  listGroups,
  listLittermates,
  listOffspring,
  listSales,
  listShowEntries,
  listShowEntriesForFish,
  listSpawnsWithParent,
  listTanks,
  listTraits,
  signedPhotoUrls,
} from '@/lib/db';
import { bestPlacings, bestScores, resultsByFish } from '@/lib/scores';
import type { Fish, FishPhoto, Spawn } from '@/lib/types';
import type { makeKinship } from '@/lib/kinship';

// Everything the fish page shows, loaded together when the page opens. Only this fish's relatives are
// fetched: every recorded ancestor (inbreeding needs them all), littermates and offspring.
export async function loadFishPage(id: string) {
  const [
    fish, tanks, photos, moves, parentOf, groups, groupIds, traitRecords, evaluations, traits, shows, sales, genes, offspring,
  ] = await Promise.all([
    getFish(id),
    listTanks(),
    listFishPhotos(id),
    listFishMoves(id),
    listSpawnsWithParent(id),
    listGroups(),
    groupIdsForFish(id),
    listFishTraits(id),
    listEvaluations(id),
    listTraits(),
    listShowEntries(id),
    listSales(id),
    listGenes(),
    listOffspring(id),
  ]);
  const [urls, related] = await Promise.all([
    signedPhotoUrls([
      ...photos.map((p) => p.storage_path),
      ...evaluations.map((e) => e.photo_path).filter((p): p is string => !!p),
    ]),
    fish ? loadRelatives(fish, offspring) : null,
  ]);
  return {
    fish,
    ancestors: related?.ancestors ?? [],
    siblings: related?.siblings ?? [],
    offspring,
    tankNames: Object.fromEntries(tanks.map((t) => [t.id, t.name ? `${t.tank_code} ${t.name}` : t.tank_code])),
    photos,
    urls,
    moves,
    fromSpawn: related?.fromSpawn ?? null,
    parentOf,
    groups: groups.filter((g) => groupIds.includes(g.id)),
    traitRecords,
    evaluations,
    shows,
    sales,
    genes,
    geneRecords: related?.geneRecords ?? [],
    bestScores: bestScores(related?.scores ?? []),
    bestPlacings: bestPlacings(related?.placings ?? []),
    results: resultsByFish(related?.scores ?? [], related?.placings ?? []),
    traitNames: Object.fromEntries(traits.map((t) => [t.id, t.name])),
  };
}

// The fish's family, and the scores and genes the page shows for them.
async function loadRelatives(fish: Fish, offspring: Fish[]) {
  const parents = [fish.sire_id, fish.dam_id].filter((p): p is string => !!p);
  const [ancestors, family, fromSpawn, geneRecords] = await Promise.all([
    listAncestors(fish),
    // Scores are shown for the fish, its parents, littermates and offspring, so those are all that's fetched.
    listLittermates(fish).then(async (siblings) => {
      const ids = [fish.id, ...parents, ...siblings.map((f) => f.id), ...offspring.map((f) => f.id)];
      const [scores, placings] = await Promise.all([listBestScores(ids), listShowEntriesForFish(ids)]);
      return { siblings, scores, placings };
    }),
    fish.spawn_id ? getSpawn(fish.spawn_id) : null,
    // Genes are shown for the fish, and a parent's genes say whether it carries one.
    listFishGenes([fish.id, ...parents]),
  ]);
  return { ancestors, ...family, fromSpawn, geneRecords };
}

export type FishPageData = Awaited<ReturnType<typeof loadFishPage>>;

// What each part of the fish page works from: the loaded data plus a few shared helpers.
export type FishPageContext = {
  id: string;
  fish: Fish;
  data: FishPageData;
  kin: ReturnType<typeof makeKinship>;
  sire: Fish | null;
  dam: Fish | null;
  siblings: Fish[];
  offspring: Fish[];
  fromSpawn: Spawn | null | undefined;
  parentOf: Spawn[];
  busy: boolean;
  photoWidth: number;
  addPhoto: (source: 'camera' | 'library') => void;
  confirmDeletePhoto: (photo: FishPhoto) => void;
  openFish: (id: string) => void;
  openSpawn: (id: string) => void;
};
