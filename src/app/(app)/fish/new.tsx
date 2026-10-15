import { router, useLocalSearchParams } from 'expo-router';

import { FishForm } from '@/components/fish-form';
import { ErrorText, Loading, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { addFishPhoto, createFish, listFish, listTanks } from '@/lib/db';
import { useFocusData } from '@/lib/use-data';

export default function NewFishScreen() {
  const { tankId } = useLocalSearchParams<{ tankId?: string }>();
  const { session } = useAuth();
  const { data, error } = useFocusData(async () => {
    const [fish, tanks] = await Promise.all([listFish(), listTanks()]);
    return { fish, tanks };
  });

  if (!data && !error) return <Loading />;
  if (!data) return <Screen><ErrorText message={error} /></Screen>;

  return (
    <Screen>
      <FishForm
        allFish={data.fish}
        tanks={data.tanks}
        initialTankId={tankId}
        submitLabel="Create fish"
        onSubmit={async (input, photo) => {
          const fish = await createFish(input);
          if (photo && session) {
            await addFishPhoto(session.user.id, fish.id, photo.base64, photo.mimeType);
          }
          router.replace({ pathname: '/fish/[id]', params: { id: fish.id } });
        }}
      />
    </Screen>
  );
}
