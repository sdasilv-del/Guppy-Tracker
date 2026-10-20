import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { FishPicker } from '@/components/fish-picker';
import { Body, Button, Card, ErrorText, ListRow, Loading, Muted, Screen, Section } from '@/components/ui';
import { Icons } from '@/constants/icons';
import { useTheme } from '@/hooks/use-theme';
import { INACTIVE_STATUSES } from '@/lib/constants';
import { listFish } from '@/lib/db';
import { closeRelations, formatInbreeding, makeKinship, sharedAncestors } from '@/lib/kinship';
import type { Fish } from '@/lib/types';
import { useFocusData } from '@/lib/use-data';

// What the number means, so breeders don't have to remember the reference points.
function meaning(value: number): string {
  if (value === 0) return 'No shared ancestors on record.';
  if (value < 0.0625) return 'Lower than first cousins. Usually safe for line breeding.';
  if (value < 0.125) return 'About first cousins (6.25%).';
  if (value < 0.25) return 'About half siblings (12.5%). Watch for weaker fry.';
  return 'Brother and sister level (25%) or closer. Expect weaker fry unless the line is tested.';
}

function Choice({
  label,
  fish,
  chosen,
  onChoose,
}: {
  label: string;
  fish: Fish[];
  chosen: Fish | undefined;
  onChoose: (id: string | null) => void;
}) {
  if (chosen) {
    return (
      <ListRow
        icon={Icons.fish}
        title={`${label}: ${chosen.fish_code}`}
        subtitle={[chosen.name, chosen.strain, chosen.generation].filter(Boolean).join(' · ') || 'Tap to change'}
        onPress={() => onChoose(null)}
      />
    );
  }
  return (
    <Section title={`Choose a ${label.toLowerCase()}`}>
      <FishPicker fish={fish} selected={[]} onToggle={onChoose} emptyText={`No ${label.toLowerCase()}s found.`} />
    </Section>
  );
}

// Try any male and female and see how inbred their fry would be, before setting up a group.
export default function TrialPairingScreen() {
  const theme = useTheme();
  const { data: allFish, error } = useFocusData(listFish);
  const [maleId, setMaleId] = useState<string | null>(null);
  const [femaleId, setFemaleId] = useState<string | null>(null);

  if (!allFish && !error) return <Loading />;
  if (!allFish) return <Screen><ErrorText message={error} /></Screen>;

  const active = allFish.filter((f) => !INACTIVE_STATUSES.includes(f.status));
  const males = active.filter((f) => f.sex === 'M');
  const females = active.filter((f) => f.sex === 'F');
  const male = allFish.find((f) => f.id === maleId);
  const female = allFish.find((f) => f.id === femaleId);
  const kin = makeKinship(allFish);

  // With one fish chosen, suggest the least related partners for it.
  const partnerPool = male && !female ? females : female && !male ? males : [];
  const suggestions = partnerPool
    .map((p) => ({ p, value: male ? kin.offspringInbreeding(male.id, p.id) : kin.offspringInbreeding(p.id, female!.id) }))
    .sort((a, b) => a.value - b.value || a.p.fish_code.localeCompare(b.p.fish_code))
    .slice(0, 5);

  const value = male && female ? kin.offspringInbreeding(male.id, female.id) : null;
  const relations = male && female ? closeRelations([male, female]) : [];
  const shared = male && female ? sharedAncestors(allFish, male.id, female.id).slice(0, 5) : [];

  return (
    <Screen>
      <Muted>Pick a male and a female to see how inbred their fry would be. Nothing is saved.</Muted>
      <Choice label="Male" fish={males} chosen={male} onChoose={setMaleId} />
      <Choice label="Female" fish={females} chosen={female} onChoose={setFemaleId} />

      {suggestions.length > 0 ? (
        <Card>
          <Body>{male ? `Least related females for ${male.fish_code}` : `Least related males for ${female!.fish_code}`}</Body>
          {suggestions.map(({ p, value: v }) => (
            <ListRow
              key={p.id}
              title={p.fish_code}
              subtitle={`Fry ${formatInbreeding(v)}${p.strain ? ` · ${p.strain}` : ''}`}
              onPress={() => (male ? setFemaleId(p.id) : setMaleId(p.id))}
            />
          ))}
        </Card>
      ) : null}

      {value !== null && male && female ? (
        <Card>
          <Muted>Fry inbreeding</Muted>
          <Text style={[styles.big, { color: theme.text }]}>{formatInbreeding(value)}</Text>
          <Body>{meaning(value)}</Body>
          {relations.map((r) => (
            <Muted key={r}>{r}</Muted>
          ))}
          {shared.length > 0 ? <Muted>{`Shared ancestors: ${shared.map((f) => f.fish_code).join(', ')}`}</Muted> : null}
          <Muted>
            {`Pedigree on record: ${male.fish_code} ${kin.generationsKnown(male.id)} generations, ${female.fish_code} ${kin.generationsKnown(female.id)}. Unrecorded ancestors aren't counted, so the real figure may be higher.`}
          </Muted>
          <Button
            title="Start a group with these two"
            icon={Icons.group}
            onPress={() => router.push({ pathname: '/groups/new', params: { members: `${male.id},${female.id}` } })}
          />
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  big: { fontSize: 34, fontWeight: '700' },
});
