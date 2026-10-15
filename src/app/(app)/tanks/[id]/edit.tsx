import { router, useLocalSearchParams } from 'expo-router';
import { Alert } from 'react-native';

import { TankForm } from '@/components/tank-form';
import { Button, ErrorText, Loading, Screen } from '@/components/ui';
import { deleteTank, getTank, updateTank } from '@/lib/db';
import { useFocusData } from '@/lib/use-data';

export default function EditTankScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: tank, error } = useFocusData(() => getTank(id));

  if (!tank && !error) return <Loading />;
  if (!tank) return <Screen><ErrorText message={error ?? 'Tank not found.'} /></Screen>;

  function confirmDelete() {
    Alert.alert(
      `Delete ${tank!.tank_code}?`,
      'Its water log is deleted too. Fish in it stay, but no longer have a tank.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTank(id);
            router.dismissTo('/tanks');
          },
        },
      ],
    );
  }

  return (
    <Screen>
      <TankForm
        initial={tank}
        submitLabel="Save changes"
        onSubmit={async (input) => {
          await updateTank(id, input);
          router.back();
        }}
      />
      <Button title="Delete tank" variant="danger" onPress={confirmDelete} />
    </Screen>
  );
}
