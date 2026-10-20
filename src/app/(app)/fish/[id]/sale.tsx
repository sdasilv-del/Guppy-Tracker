import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

import {
  Button,
  ChipSelect,
  DangerZone,
  DateField,
  ErrorText,
  Field,
  Loading,
  Muted,
  NumberField,
  Screen,
} from '@/components/ui';
import { attempt } from '@/lib/alerts';
import { deleteSale, getSale, listShowEntries, recentSaleTerms, saveSale } from '@/lib/db';
import { blankToNull, formatDate, numberText, parseNumber, todayISO } from '@/lib/format';

const CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP'];

// At shows such as the Trans Canada every shown fish is auctioned, so an auction is saved as a sale
// to this buyer, with the show in the notes.
const SHOW_AUCTION = 'Show auction';
const QUICK = [{ value: 'auction', label: 'Auctioned at a show' }];

// The price is optional, but when given it must be a number, 0 or more.
function priceProblem(text: string): string | null {
  const amount = parseNumber(text);
  return text.trim() !== '' && (amount === null || amount < 0) ? 'Price must be a number, 0 or more.' : null;
}

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
  const [priceError, setPriceError] = useState<string | null>(null);
  const [recentBuyers, setRecentBuyers] = useState<string[]>([]);
  const [auctionNote, setAuctionNote] = useState('Auctioned at a show');
  // Set once a currency is chosen or loaded, so the last-used default doesn't overwrite it.
  const currencyPicked = useRef(false);

  useEffect(() => {
    if (!saleId) return;
    getSale(saleId)
      .then((s) => {
        if (s) {
          currencyPicked.current = true;
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

  // Recent buyers, the last currency used and the fish's latest show load in the background;
  // the form works without them.
  useEffect(() => {
    recentSaleTerms()
      .then(({ buyers, currency: last }) => {
        setRecentBuyers(buyers.filter((b) => b !== SHOW_AUCTION));
        if (last && !saleId && !currencyPicked.current) setCurrency(last);
      })
      .catch(() => {});
    listShowEntries(id)
      .then(([latest]) => {
        if (latest) setAuctionNote(`Auctioned at ${latest.show_name}, ${formatDate(latest.shown_on)}`);
      })
      .catch(() => {});
  }, [id, saleId]);

  if (loading) return <Loading />;

  const isAuction = buyer === SHOW_AUCTION;
  const currencies = CURRENCIES.includes(currency) ? CURRENCIES : [...CURRENCIES, currency];

  function pickAuction(on: boolean) {
    if (on) {
      setBuyer(SHOW_AUCTION);
      if (!notes.trim()) setNotes(auctionNote);
    } else {
      setBuyer('');
      if (notes === auctionNote) setNotes('');
    }
  }

  async function save() {
    const problem = priceProblem(price);
    setPriceError(problem);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveSale(saleId ?? null, {
        fish_id: id,
        sold_on: date ?? todayISO(),
        buyer: blankToNull(buyer),
        price: parseNumber(price),
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
      <ChipSelect
        label="Quick fill"
        options={QUICK}
        value={isAuction ? 'auction' : null}
        onChange={(v) => pickAuction(v === 'auction')}
        allowClear
      />
      {isAuction ? (
        <Muted>
          Bought it back at the auction? Save the price you paid, then set the fish&apos;s status back with Edit.
        </Muted>
      ) : null}
      <DateField label="Date sold" value={date} onChange={setDate} />
      <Field label="Buyer" value={buyer} onChangeText={setBuyer} placeholder="Name or club" />
      {recentBuyers.length > 0 ? (
        <ChipSelect
          label="Recent buyers"
          options={recentBuyers.map((b) => ({ value: b, label: b }))}
          value={recentBuyers.includes(buyer) ? buyer : null}
          onChange={(v) => setBuyer(v ?? '')}
          allowClear
        />
      ) : null}
      <NumberField
        label="Price"
        value={price}
        onChangeText={(text) => {
          setPrice(text);
          // Once flagged, the error clears as soon as the value is fixed.
          if (priceError) setPriceError(priceProblem(text));
        }}
        onBlur={() => setPriceError(priceProblem(price))}
        error={priceError}
        placeholder="Optional"
      />
      <ChipSelect
        label="Currency"
        options={currencies.map((c) => ({ value: c, label: c }))}
        value={currency}
        onChange={(v) => {
          if (!v) return;
          currencyPicked.current = true;
          setCurrency(v);
        }}
      />
      <Field label="Notes" value={notes} onChangeText={setNotes} multiline placeholder="e.g. shipped, paid by e-transfer" />
      {!saleId ? <Muted>Saving marks this fish as sold and takes it out of its tank.</Muted> : null}
      <ErrorText message={error} />
      <Button title={saleId ? 'Save changes' : 'Save sale'} onPress={save} busy={busy} />
      {saleId ? (
        <DangerZone note="Deleting removes this sale record for good.">
          <Button title="Delete sale" variant="danger" onPress={confirmDelete} />
        </DangerZone>
      ) : null}
    </Screen>
  );
}
