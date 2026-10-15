import { router } from 'expo-router';

import { TankForm } from '@/components/tank-form';
import { Screen } from '@/components/ui';
import { createTank } from '@/lib/db';

export default function NewTankScreen() {
  return (
    <Screen>
      <TankForm
        submitLabel="Create tank"
        onSubmit={async (input) => {
          const tank = await createTank(input);
          router.replace({ pathname: '/tanks/[id]', params: { id: tank.id } });
        }}
      />
    </Screen>
  );
}
