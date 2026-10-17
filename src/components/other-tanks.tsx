import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, ChipSelect, MultiChipSelect, Muted } from '@/components/ui';
import { labelOf, TANK_PURPOSES, type TankPurpose } from '@/lib/constants';
import { listTanks } from '@/lib/db';
import type { Tank } from '@/lib/types';

// "Also log this for": pick more tanks so one feeding, dose or water change covers a whole row.
// Shortcuts select every tank with one purpose, e.g. all fry growout tanks.
export function OtherTanks({
  currentTankId,
  value,
  onChange,
}: {
  currentTankId: string;
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    listTanks()
      .then((all) => setTanks(all.filter((t) => t.id !== currentTankId)))
      .catch(() => setTanks([]));
  }, [currentTankId]);

  if (tanks.length === 0) return null;
  if (!open) {
    return <Button title="Also log this for other tanks" variant="secondary" small onPress={() => setOpen(true)} />;
  }

  const purposes = TANK_PURPOSES.filter((p) => tanks.some((t) => t.purpose === p.value)).map((p) => ({
    value: p.value,
    label: `All ${labelOf(TANK_PURPOSES, p.value).toLowerCase()}`,
  }));
  const allOf = (purpose: TankPurpose) => tanks.filter((t) => t.purpose === purpose).map((t) => t.id);
  const fullPurpose = purposes.find((p) => {
    const ids = allOf(p.value);
    return ids.length > 0 && ids.every((id) => value.includes(id));
  });

  return (
    <View>
      <ChipSelect
        label="Select by purpose"
        options={purposes}
        value={fullPurpose?.value ?? null}
        onChange={(p) => onChange(p ? [...new Set([...value, ...allOf(p)])] : value)}
      />
      <MultiChipSelect
        label="Also log this for"
        options={tanks.map((t) => ({ value: t.id, label: t.name ? `${t.tank_code} ${t.name}` : t.tank_code }))}
        value={value}
        onChange={onChange}
      />
      {value.length > 0 ? (
        <Muted>{`Saves for this tank and ${value.length} more.`}</Muted>
      ) : null}
      {value.length > 0 ? <Button title="Clear other tanks" variant="secondary" small onPress={() => onChange([])} /> : null}
    </View>
  );
}
