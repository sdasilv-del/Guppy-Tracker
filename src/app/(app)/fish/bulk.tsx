import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Button, ChipSelect, DateField, ErrorText, Field, ListRow, Loading, Muted, NumberField, Screen } from '@/components/ui';
import { Icons } from '@/constants/icons';
import { FISH_STATUSES, type FishStatus, INACTIVE_STATUSES, labelOf, TANK_PURPOSES } from '@/lib/constants';
import { addSales, listFish, listTanks, moveFish, setFishStatus } from '@/lib/db';
import { blankToNull, parseNumber, todayISO } from '@/lib/format';
import { useFocusData } from '@/lib/use-data';

export type BulkAction = 'move' | 'status' | 'sale';

const TITLES: Record<BulkAction, string> = { move: 'Move fish', status: 'Change status', sale: 'Record sale' };
const CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP'].map((c) => ({ value: c, label: c }));
// Selling has its own screen action, so it isn't offered as a plain status here.
const STATUS_CHOICES = FISH_STATUSES.filter((s) => s.value !== 'sold');

// Does one thing to several fish picked on the fish list: move them, change their status, or sell them.
export default function BulkFishScreen() {
  const { ids: idsParam, action } = useLocalSearchParams<{ ids: string; action: BulkAction }>();
  const ids = (idsParam ?? '').split(',').filter(Boolean);
  const { data, error } = useFocusData(async () => {
    const [fish, tanks] = await Promise.all([listFish(), listTanks()]);
    return { fish: fish.filter((f) => ids.includes(f.id)), tanks };
  });
  const [status, setStatus] = useState<FishStatus | null>(null);
  const [date, setDate] = useState<string | null>(todayISO());
  const [buyer, setBuyer] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('CAD');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!data && !error) return <Loading />;
  if (!data) return <Screen><ErrorText message={error} /></Screen>;
  const codes = data.fish.map((f) => f.fish_code).join(', ');

  async function run(work: () => Promise<void>) {
    setBusy(true);
    setSaveError(null);
    try {
      await work();
      router.back();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  function saveSales() {
    const each = parseNumber(price);
    if (price.trim() !== '' && (each === null || each < 0)) {
      setSaveError('Price must be a number, 0 or more.');
      return;
    }
    void run(() =>
      addSales(
        data!.fish.map((f) => ({
          fish_id: f.id,
          sold_on: date ?? todayISO(),
          buyer: blankToNull(buyer),
          price: each,
          currency,
          notes: blankToNull(notes),
        })),
      ),
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: `${TITLES[action]} (${data.fish.length})` }} />
      <Muted>{codes}</Muted>
      <ErrorText message={saveError} />

      {action === 'move' ? (
        <>
          <Muted>Tap the tank to move all of them to.</Muted>
          {data.tanks.map((t) => (
            <ListRow
              icon={Icons.tank}
              key={t.id}
              title={t.name ? `${t.tank_code} · ${t.name}` : t.tank_code}
              subtitle={labelOf(TANK_PURPOSES, t.purpose)}
              onPress={busy ? undefined : () => run(() => moveFish(ids, t.id))}
            />
          ))}
          <Button title="Take out of any tank" variant="secondary" onPress={() => run(() => moveFish(ids, null))} busy={busy} />
        </>
      ) : null}

      {action === 'status' ? (
        <>
          <ChipSelect label="New status" options={STATUS_CHOICES} value={status} onChange={setStatus} />
          {status && INACTIVE_STATUSES.includes(status) ? (
            <Muted>{labelOf(FISH_STATUSES, status)} fish are taken out of their tanks.</Muted>
          ) : null}
          <Button
            title={`Set ${data.fish.length} fish to ${status ? labelOf(FISH_STATUSES, status) : '…'}`}
            onPress={() => status && run(() => setFishStatus(ids, status))}
            disabled={!status}
            busy={busy}
          />
        </>
      ) : null}

      {action === 'sale' ? (
        <>
          <DateField label="Date sold" value={date} onChange={setDate} />
          <Field label="Buyer" value={buyer} onChangeText={setBuyer} placeholder="Name or club" />
          <NumberField label="Price for each fish" value={price} onChangeText={setPrice} placeholder="Optional" />
          <ChipSelect label="Currency" options={CURRENCIES} value={currency} onChange={(v) => v && setCurrency(v)} />
          <Field label="Notes" value={notes} onChangeText={setNotes} multiline placeholder="e.g. shipped, paid by e-transfer" />
          <Muted>Each fish gets its own sale record, is marked sold, and is taken out of its tank.</Muted>
          <Button title={`Save ${data.fish.length} sales`} onPress={saveSales} busy={busy} />
        </>
      ) : null}
    </Screen>
  );
}
