import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import type { FishPageContext } from '@/components/fish-page/data';
import { Button, Empty, ListRow, Section } from '@/components/ui';
import { Icons } from '@/constants/icons';
import { Spacing } from '@/constants/theme';
import { EVALUATION_KINDS, ihsMaxTotal, labelOf } from '@/lib/constants';
import { isDisqualified } from '@/lib/ihs-reasons';
import { formatDate } from '@/lib/format';

// The Scores tab: IHS evaluations and official show results.
export function FishScores({ ctx }: { ctx: FishPageContext }) {
  const { id, data } = ctx;
  return (
    <>
      <Section
        title="IHS evaluations"
        action={
          <Button
            title="Score"
            small
            onPress={() => router.push({ pathname: '/fish/[id]/evaluation', params: { id } })}
          />
        }>
        {data.evaluations.length === 0 ? <Empty>No evaluations yet.</Empty> : null}
        {data.evaluations.map((e) => (
          <ListRow
            icon={Icons.evaluation}
            key={e.id}
            title={`${e.total} / ${ihsMaxTotal(e.sex)} · ${formatDate(e.evaluated_on)}`}
            subtitle={[
              isDisqualified(e.sex, e.score_reasons ?? {}) ? 'Disqualified' : null,
              e.locked_at ? 'Signed' : null,
              labelOf(EVALUATION_KINDS, e.kind),
              e.event,
              e.placement,
              e.judge,
            ]
              .filter(Boolean)
              .join(' · ')}
            right={
              e.photo_path && data.urls[e.photo_path] ? (
                <Image source={{ uri: data.urls[e.photo_path] }} style={styles.evalThumb} contentFit="cover" />
              ) : undefined
            }
            onPress={() => router.push({ pathname: '/fish/[id]/evaluation', params: { id, evalId: e.id } })}
          />
        ))}
        {data.evaluations.length > 0 ? (
          <Button
            title="Score history with photos"
            icon={Icons.strain}
            variant="secondary"
            small
            onPress={() => router.push({ pathname: '/fish/[id]/scores', params: { id } })}
          />
        ) : null}
      </Section>

      <Section title="Shows">
        {data.shows.length === 0 ? (
          <Empty>Shows appear here when you score this fish as an official show result.</Empty>
        ) : null}
        {data.shows.map((e) => (
          <ListRow
            icon={Icons.show}
            key={e.id}
            title={`${e.show_name} · ${formatDate(e.shown_on)}`}
            subtitle={[e.show_class, e.placement, e.points !== null ? `${e.points} pts` : null].filter(Boolean).join(' · ')}
            onPress={() => router.push({ pathname: '/fish/[id]/show', params: { id, entryId: e.id } })}
          />
        ))}
      </Section>

    </>
  );
}

const styles = StyleSheet.create({
  photos: { gap: Spacing.two },
  photo: { borderRadius: 14 },
  buttons: { flexDirection: 'row', gap: Spacing.two },
  half: { flex: 1 },
  link: { textDecorationLine: 'underline', fontWeight: '500' },
  evalThumb: { width: 44, height: 44, borderRadius: 6 },
});
