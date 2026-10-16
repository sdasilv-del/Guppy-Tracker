import { router, useLocalSearchParams } from 'expo-router';
import { Alert } from 'react-native';

import { GroupForm } from '@/components/group-form';
import { Button, ErrorText, Loading, Screen } from '@/components/ui';
import {
  deleteGroup,
  getGroup,
  groupMembers,
  groupTraitIds,
  listFish,
  listTanks,
  listTraits,
  moveFish,
  setGroupMembers,
  setGroupTraits,
  updateGroup,
} from '@/lib/db';
import { useFocusData } from '@/lib/use-data';
import { attempt } from '@/lib/alerts';

export default function EditGroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error } = useFocusData(async () => {
    const [group, members, traitIds, fish, tanks, traits] = await Promise.all([
      getGroup(id),
      groupMembers([id]),
      groupTraitIds(id),
      listFish(),
      listTanks(),
      listTraits(),
    ]);
    return { group, memberIds: members[id] ?? [], traitIds, fish, tanks, traits };
  });

  if (!data && !error) return <Loading />;
  if (!data?.group) return <Screen><ErrorText message={error ?? 'Group not found.'} /></Screen>;
  const group = data.group;

  function confirmDelete() {
    Alert.alert(
      `Delete ${group.group_code}?`,
      'The group is removed. Its spawns and fish are kept. To keep the group on record, set a date ended instead.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => attempt(() => deleteGroup(id), () => router.dismissTo('/breeding')),
        },
      ],
    );
  }

  return (
    <Screen>
      <GroupForm
        initial={group}
        initialMemberIds={data.memberIds}
        initialTraitIds={data.traitIds}
        allFish={data.fish}
        tanks={data.tanks}
        traits={data.traits}
        submitLabel="Save changes"
        onSubmit={async ({ input, memberIds, traitIds, moveIntoTank }) => {
          await updateGroup(id, input);
          await Promise.all([setGroupMembers(id, memberIds), setGroupTraits(id, traitIds)]);
          if (moveIntoTank && input.tank_id) {
            const away = data.fish.filter((f) => memberIds.includes(f.id) && f.tank_id !== input.tank_id);
            await moveFish(away.map((f) => f.id), input.tank_id);
          }
          router.back();
        }}
      />
      <Button title="Delete group" variant="danger" onPress={confirmDelete} />
    </Screen>
  );
}
