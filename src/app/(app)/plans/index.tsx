import { router } from 'expo-router';

import { Button, Empty, ErrorText, ListRow, Loading, Muted, Screen } from '@/components/ui';
import { Icons } from '@/constants/icons';
import { listFish, listLinePlans } from '@/lib/db';
import { formatInbreeding } from '@/lib/kinship';
import { planGenerations } from '@/lib/line-plan';
import { useFocusData } from '@/lib/use-data';

// Saved breeding plans, each a few generations ahead of a real pair.
export default function LinePlansScreen() {
  const { data, error } = useFocusData(async () => {
    const [plans, fish] = await Promise.all([listLinePlans(), listFish()]);
    return { plans, fish };
  });

  if (!data && !error) return <Loading />;
  if (!data) return <Screen><ErrorText message={error} /></Screen>;
  const code = (id: string | null) => data.fish.find((f) => f.id === id)?.fish_code ?? '?';

  return (
    <Screen>
      <Muted>Plan a line three or four generations ahead and see how inbred each generation gets before you breed it.</Muted>
      <Button title="New plan" icon={Icons.add} onPress={() => router.push({ pathname: '/plans/[id]', params: { id: 'new' } })} />
      {data.plans.length === 0 ? <Empty>No plans yet.</Empty> : null}
      {data.plans.map((p) => {
        const gens = p.sire_id && p.dam_id ? planGenerations(data.fish, p.sire_id, p.dam_id, p.steps) : [];
        const last = gens.at(-1);
        return (
          <ListRow
            key={p.id}
            icon={Icons.pedigree}
            title={p.name}
            subtitle={[
              `${code(p.sire_id)} × ${code(p.dam_id)}`,
              `${gens.length} ${gens.length === 1 ? 'generation' : 'generations'}`,
              last ? `G${last.number} ${formatInbreeding(last.inbreeding)}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
            onPress={() => router.push({ pathname: '/plans/[id]', params: { id: p.id } })}
          />
        );
      })}
    </Screen>
  );
}
