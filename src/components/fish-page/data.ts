import {
  groupIdsForFish,
  listAllShowEntries,
  listEvaluationSummaries,
  listEvaluations,
  listFish,
  listFishGenes,
  listFishMoves,
  listFishPhotos,
  listFishTraits,
  listGenes,
  listGroups,
  listSales,
  listShowEntries,
  listSpawns,
  listTanks,
  listTraits,
  signedPhotoUrls,
} from '@/lib/db';
import { bestPlacings, bestScores, resultsByFish } from '@/lib/scores';
import type { Fish, FishPhoto, Spawn } from '@/lib/types';
import type { makeKinship } from '@/lib/kinship';

// Everything the fish page shows, loaded together when the page opens.
export async function loadFishPage(id: string) {
  const [
    allFish, tanks, photos, moves, spawns, groups, groupIds, traitRecords, evaluations, traits, shows, sales, genes, geneRecords,
    allScores, allShows,
  ] = await Promise.all([
    listFish(),
    listTanks(),
    listFishPhotos(id),
    listFishMoves(id),
    listSpawns(),
    listGroups(),
    groupIdsForFish(id),
    listFishTraits(id),
    listEvaluations(id),
    listTraits(),
    listShowEntries(id),
    listSales(id),
    listGenes(),
    listFishGenes(),
    listEvaluationSummaries(),
    listAllShowEntries(),
  ]);
  const urls = await signedPhotoUrls([
    ...photos.map((p) => p.storage_path),
    ...evaluations.map((e) => e.photo_path).filter((p): p is string => !!p),
  ]);
  return {
    fish: allFish.find((f) => f.id === id) ?? null,
    allFish,
    tankNames: Object.fromEntries(tanks.map((t) => [t.id, t.name ? `${t.tank_code} ${t.name}` : t.tank_code])),
    photos,
    urls,
    moves,
    spawns,
    groups: groups.filter((g) => groupIds.includes(g.id)),
    traitRecords,
    evaluations,
    shows,
    sales,
    genes,
    geneRecords,
    bestScores: bestScores(allScores),
    bestPlacings: bestPlacings(allShows),
    results: resultsByFish(allScores, allShows),
    traitNames: Object.fromEntries(traits.map((t) => [t.id, t.name])),
  };
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
