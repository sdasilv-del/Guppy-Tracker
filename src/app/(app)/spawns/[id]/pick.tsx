import { router, useLocalSearchParams } from 'expo-router';

import { FishForm, type PickedPhoto } from '@/components/fish-form';
import { ErrorText, Loading, Muted, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { addFishPhoto, createFish, type FishInput, getSpawn, listFish, listTanks } from '@/lib/db';
import { useFocusData } from '@/lib/use-data';

// Picking a fry makes it a fish record, with its parents, birth date, strain and generation taken from the spawn.
export default function PickFishScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { data, error } = useFocusData(async () => {
    const [spawn, fish, tanks] = await Promise.all([getSpawn(id), listFish(), listTanks()]);
    return { spawn, fish, tanks };
  });

  if (!data && !error) return <Loading />;
  if (!data?.spawn) return <Screen><ErrorText message={error ?? 'Spawn not found.'} /></Screen>;
  const spawn = data.spawn;

  async function savePick(input: FishInput, photo: PickedPhoto | null) {
    const fish = await createFish(input);
    if (photo && session) await addFishPhoto(session.user.id, fish.id, photo.base64, photo.mimeType);
  }
  const sire = data.fish.find((f) => f.id === spawn.sire_id);

  return (
    <Screen>
      <Muted>
        This fry becomes a fish from {spawn.spawn_code}. Parents, date of birth, strain and generation are filled in
        from the spawn, and you can change anything before saving.
      </Muted>
      <FishForm
        defaults={{
          spawn_id: spawn.id,
          sire_id: spawn.sire_id,
          dam_id: spawn.dam_id,
          date_of_birth: spawn.born_on,
          strain: spawn.strain,
          generation: spawn.generation,
          origin: 'bred',
          tank_id: spawn.tank_id,
          tail_standard: sire?.tail_standard,
          base_colour: sire?.base_colour,
          cover_colours: sire?.cover_colours,
          status: 'show_prospect',
        }}
        allFish={data.fish}
        tanks={data.tanks}
        submitLabel="Save picked fish"
        onSubmit={async (input, photo) => {
          await savePick(input, photo);
          router.back();
        }}
        againLabel="Save and pick another"
        onSubmitAgain={async (input, photo) => {
          await savePick(input, photo);
          // A fresh form for the next fry from the same spawn.
          router.replace({ pathname: '/spawns/[id]/pick', params: { id, n: String(Date.now()) } });
        }}
      />
    </Screen>
  );
}
