import { router } from 'expo-router';

import type { FishPageContext } from '@/components/fish-page/data';
import { fishLabel } from '@/components/fish-picker';
import { Button, Empty, ListRow, Muted, Section } from '@/components/ui';
import { Icons } from '@/constants/icons';
import { FISH_STATUSES, labelOf, SEXES } from '@/lib/constants';
import { formatDate } from '@/lib/format';
import type { Fish } from '@/lib/types';
import { scoreLabel } from '@/lib/scores';

// The Family tab: parents, littermates, breeding groups, spawns and offspring, with their scores.
export function FishFamily({ ctx }: { ctx: FishPageContext }) {
  const { id, data, sire, dam, siblings, offspring, parentOf, openFish, openSpawn } = ctx;
  const scoredSiblings = siblings.filter((f) => data.bestScores.has(f.id)).length;
  const withResult = (f: Fish) => [fishLabel(f), data.results.get(f.id)].filter(Boolean).join(' · ');
  return (
    <>
      <Section
        title="Parents"
        action={
          <Button
            title="Pedigree"
            small
            onPress={() => router.push({ pathname: '/fish/[id]/pedigree', params: { id } })}
          />
        }>
        {sire ? (
          <ListRow icon={Icons.fish} title={`Sire · ${sire.fish_code}`} subtitle={withResult(sire)} onPress={() => openFish(sire.id)} />
        ) : (
          <ListRow title="Sire · Unknown" />
        )}
        {dam ? (
          <ListRow icon={Icons.fish} title={`Dam · ${dam.fish_code}`} subtitle={withResult(dam)} onPress={() => openFish(dam.id)} />
        ) : (
          <ListRow title="Dam · Unknown" />
        )}
      </Section>

      {siblings.length > 0 ? (
        <Section title={`Littermates (${siblings.length})`}>
          <Muted>
            {scoredSiblings === 0
              ? 'None scored yet. Sold fish stay here, so a score from a fish that was auctioned still counts for this litter.'
              : `${scoredSiblings} of ${siblings.length} scored. Sold fish are included.`}
          </Muted>
          {siblings.map((f) => {
            const best = data.bestScores.get(f.id);
            return (
              <ListRow
                icon={Icons.fish}
                key={f.id}
                title={best ? `${f.fish_code} · ${scoreLabel(best)}` : f.fish_code}
                subtitle={[labelOf(SEXES, f.sex), labelOf(FISH_STATUSES, f.status), data.bestPlacings.get(f.id)]
                  .filter(Boolean)
                  .join(' · ')}
                onPress={() => openFish(f.id)}
              />
            );
          })}
        </Section>
      ) : null}

      {data.groups.length > 0 ? (
        <Section title="Breeding groups">
          {data.groups.map((g) => (
            <ListRow
            icon={Icons.group}
              key={g.id}
              title={g.name ? `${g.group_code} · ${g.name}` : g.group_code}
              subtitle={[g.goal, g.ended_on ? `Ended ${formatDate(g.ended_on)}` : 'Active'].filter(Boolean).join(' · ')}
              onPress={() => router.push({ pathname: '/groups/[id]', params: { id: g.id } })}
            />
          ))}
        </Section>
      ) : null}

      {parentOf.length > 0 ? (
        <Section title={`Spawns as a parent (${parentOf.length})`}>
          {parentOf.map((s) => (
            <ListRow
              icon={Icons.spawn}
              key={s.id}
              title={`${s.spawn_code} · born ${formatDate(s.born_on)}`}
              subtitle={`${s.fry_count} fry at birth`}
              onPress={() => openSpawn(s.id)}
            />
          ))}
        </Section>
      ) : null}

      <Section title={`Offspring (${offspring.length})`}>
        {offspring.length === 0 ? <Empty>No recorded offspring yet.</Empty> : null}
        {offspring.map((f) => (
          <ListRow
            icon={Icons.fish}
            key={f.id}
            title={f.fish_code}
            subtitle={[f.name, f.strain, labelOf(FISH_STATUSES, f.status), data.results.get(f.id)].filter(Boolean).join(' · ')}
            onPress={() => openFish(f.id)}
          />
        ))}
      </Section>

    </>
  );
}

