import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { Button, ChipSelect, DateField, ErrorText, Field, Loading, Muted, NumberField, Screen } from '@/components/ui';
import { attempt } from '@/lib/alerts';
import { deleteSale, getSale, saveSale } from '@/lib/db';
import { blankToNull, numberText, parseNumber, todayISO } from '@/lib/format';

const CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP'].map((c) => ({ value: c, label: c }));

export default function SaleScreen() {
  const { id, saleId } = useLocalSearchParams<{ id: string; saleId?: string }>();
  const [loading, setLoading] = useState(!!saleId);
  const [date, setDate] = useState<string | null>(todayISO());
  const [buyer, setBuyer] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('CAD');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!saleId) return;
    getSale(saleId)
      .then((s) => {
        if (s) {
          setDate(s.sold_on);
          setBuyer(s.buyer ?? '');
          setPrice(numberText(s.price));
          setCurrency(s.currency);
          setNotes(s.notes ?? '');
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
  }, [saleId]);

  if (loading) return <Loading />;

  async function save() {
    const amount = parseNumber(price);
    if (price.trim() !== '' && (amount === null || amount < 0)) {
      setError('Price must be a number, 0 or more.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveSale(saleId ?? null, {
        fish_id: id,
        sold_on: date ?? todayISO(),
        buyer: blankToNull(buyer),
        price: amount,
        currency,
        notes: blankToNull(notes),
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Delete this sale?', 'The fish stays marked as sold. Change its status with Edit if needed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => attempt(() => deleteSale(saleId!), () => router.back()),
      },
    ]);
  }

  return (
    <Screen>
      <DateField label="Date sold" value={date} onChange={setDate} />
      <Field label="Buyer" value={buyer} onChangeText={setBuyer} placeholder="Name or club" />
      <NumberField label="Price" value={price} onChangeText={setPrice} placeholder="Optional" />
      <ChipSelect label="Currency" options={CURRENCIES} value={currency} onChange={(v) => v && setCurrency(v)} />
      <Field label="Notes" value={notes} onChangeText={setNotes} multiline placeholder="e.g. shipped, paid by e-transfer" />
      {!saleId ? <Muted>Saving marks this fish as sold and takes it out of its tank.</Muted> : null}
      <ErrorText message={error} />
      <Button title={saleId ? 'Save changes' : 'Save sale'} onPress={save} busy={busy} />
      {saleId ? <Button title="Delete sale" variant="danger" onPress={confirmDelete} /> : null}
    </Screen>
  );
}
