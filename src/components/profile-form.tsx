import { useState } from 'react';

import { Button, ChipSelect, ErrorText, Field } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { blankToNull, type TempUnit } from '@/lib/format';
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const cleanInitials = initials.trim().toUpperCase();
    if (!/^[A-Z]{1,5}$/.test(cleanInitials)) {
      setError('Breeder initials must be 1 to 5 letters.');
      return;
    }
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
      <ErrorText message={error} />
      <Button title="Save profile" onPress={save} busy={busy} />
    </>
  );
}
