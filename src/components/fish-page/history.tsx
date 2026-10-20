import { router } from 'expo-router';

import type { FishPageContext } from '@/components/fish-page/data';
import { Button, Empty, ListRow, Section } from '@/components/ui';
import { Icons } from '@/constants/icons';
import { formatDate } from '@/lib/format';

// The History tab: sales and tank moves.
export function FishHistory({ ctx }: { ctx: FishPageContext }) {
  const { id, fish, data } = ctx;
  return (
    <>
      <Section
        title="Sales"
        action={
          fish.status === 'sold' ? null : (
            <Button
              title="Record sale"
              small
              onPress={() => router.push({ pathname: '/fish/[id]/sale', params: { id } })}
            />
          )
        }>
        {data.sales.length === 0 ? (
          <Empty>{fish.status === 'sold' ? 'Marked sold, with no sale details.' : 'Not sold.'}</Empty>
        ) : null}
        {data.sales.map((s) => (
          <ListRow
            icon={Icons.sale}
            key={s.id}
            title={`${s.price !== null ? `${s.price.toFixed(2)} ${s.currency}` : 'Sold'} · ${formatDate(s.sold_on)}`}
            subtitle={[s.buyer, s.notes].filter(Boolean).join(' · ')}
            onPress={() => router.push({ pathname: '/fish/[id]/sale', params: { id, saleId: s.id } })}
          />
        ))}
      </Section>

      <Section title="Tank history">
        {data.moves.length === 0 ? <Empty>No moves recorded.</Empty> : null}
        {data.moves.map((m) => (
          <ListRow
            icon={Icons.move}
            key={m.id}
            title={formatDate(m.moved_at)}
            subtitle={`${m.from_tank_id ? data.tankNames[m.from_tank_id] ?? 'Deleted tank' : 'No tank'} → ${
              m.to_tank_id ? data.tankNames[m.to_tank_id] ?? 'Deleted tank' : 'No tank'
            }`}
          />
        ))}
      </Section>
    </>
  );
}

