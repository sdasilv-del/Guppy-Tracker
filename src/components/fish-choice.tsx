import { FishPicker } from '@/components/fish-picker';
import { ListRow, Section } from '@/components/ui';
import { Icons } from '@/constants/icons';
import type { Fish } from '@/lib/types';

// One fish to choose, e.g. the male of a pairing: a picker until chosen, then a row that clears it when tapped.
export function Choice({
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
