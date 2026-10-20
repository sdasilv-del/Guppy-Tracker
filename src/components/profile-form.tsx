import { useState } from 'react';

import { Button, ChipSelect, ErrorText, Field, Heading, Muted, NumberField } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { blankToNull, numberText, parseNumber, type TempUnit } from '@/lib/format';
import { DEFAULT_INSIGHT_SETTINGS } from '@/lib/insights';
import { supabase } from '@/lib/supabase';

const UNITS = [
  { value: 'C', label: '°C' },
  { value: 'F', label: '°F' },
] as const;

export function ProfileForm({ onSaved }: { onSaved?: () => void }) {
  const { session, profile, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.display_name ?? '');
  const [initials, setInitials] = useState(profile?.breeder_initials ?? '');
  const [club, setClub] = useState(profile?.club ?? '');
  const [country, setCountry] = useState(profile?.country ?? '');
  const [unit, setUnit] = useState<TempUnit>(profile?.temperature_unit ?? 'C');
  const limits = profile ?? DEFAULT_INSIGHT_SETTINGS;
  const [testDays, setTestDays] = useState(numberText(limits.test_every_days));
  const [lossMin, setLossMin] = useState(numberText(limits.loss_min));
  const [lossPercent, setLossPercent] = useState(numberText(limits.loss_percent));
  const [crowded, setCrowded] = useState(numberText(limits.crowded_per_gallon));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const cleanInitials = initials.trim().toUpperCase();
    if (!/^[A-Z]{1,5}$/.test(cleanInitials)) {
      setError('Breeder initials must be 1 to 5 letters.');
      return;
    }
    const whole = (text: string, min: number, max: number) => {
      const n = parseNumber(text);
      return n !== null && Number.isInteger(n) && n >= min && n <= max ? n : null;
    };
    const days = whole(testDays, 1, 365);
    const minLost = whole(lossMin, 1, 1000);
    const pct = whole(lossPercent, 1, 100);
    const perGallon = parseNumber(crowded);
    if (days === null) return setError('Test water every: enter whole days from 1 to 365.');
    if (minLost === null) return setError('Fry losses: enter a whole number of fry, 1 or more.');
    if (pct === null) return setError('Share of the batch: enter a whole percent from 1 to 100.');
    if (perGallon === null || perGallon <= 0 || perGallon > 50) return setError('Crowded: enter fish per gallon, above 0 and up to 50.');
    if (!session) return;
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.from('profiles').upsert({
      id: session.user.id,
      display_name: name.trim(),
      breeder_initials: cleanInitials,
      club: blankToNull(club),
      country: blankToNull(country),
      temperature_unit: unit,
      test_every_days: days,
      loss_min: minLost,
      loss_percent: pct,
      crowded_per_gallon: Math.round(perGallon * 10) / 10,
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    await refreshProfile();
    onSaved?.();
  }

  return (
    <>
      <Field label="Name" value={name} onChangeText={setName} autoComplete="name" />
      <Field
        label="Breeder initials"
        value={initials}
        onChangeText={(t) => setInitials(t.toUpperCase())}
        autoCapitalize="characters"
        maxLength={5}
        hint={`Starts every fish ID, e.g. ${initials.trim().toUpperCase() || 'SD'}-A3-M-001. Changing it later only affects new IDs.`}
      />
      <Field label="Club" value={club} onChangeText={setClub} />
      <Field label="Country" value={country} onChangeText={setCountry} />
      <ChipSelect label="Temperature" options={UNITS} value={unit} onChange={(v) => v && setUnit(v)} />
      <Heading>Home insights</Heading>
      <Muted>When the Home screen warns you.</Muted>
      <NumberField label="Test water every (days)" value={testDays} onChangeText={setTestDays} hint="A stocked tank not tested for longer is flagged." />
      <NumberField label="Fry losses in a week (fry)" value={lossMin} onChangeText={setLossMin} hint="Flag a batch that loses at least this many fry in 7 days..." />
      <NumberField label="Share of the batch (%)" value={lossPercent} onChangeText={setLossPercent} hint="...and at least this share of the batch." />
      <NumberField label="Crowded above (fish per gallon)" value={crowded} onChangeText={setCrowded} hint="Fry batches aren't counted, and tanks without a size aren't checked." />
      <ErrorText message={error} />
      <Button title="Save profile" onPress={save} busy={busy} />
    </>
  );
}
