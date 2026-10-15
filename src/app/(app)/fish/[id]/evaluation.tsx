import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { pickPhoto, type PickedPhoto } from '@/components/fish-form';
import {
  Body,
  Button,
  Card,
  ChipSelect,
  DateField,
  ErrorText,
  Field,
  Heading,
  InfoRow,
  Loading,
  Muted,
  Screen,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import {
  BASE_COLOURS,
  COVER_COLOURS,
  EVALUATION_KINDS,
  type EvaluationKind,
  type IhsCategory,
  ihsCategories,
  ihsMaxTotal,
  labelOf,
  TAIL_STANDARDS,
} from '@/lib/constants';
import { useAuth } from '@/lib/auth';
import {
  deleteEvaluation,
  getEvaluation,
  getFish,
  removeStoredPhotos,
  saveEvaluation,
  signedPhotoUrls,
  uploadPhoto,
} from '@/lib/db';
import { blankToNull, numberText, parseNumber, todayISO } from '@/lib/format';
import type { Evaluation, Fish } from '@/lib/types';
import { useTheme } from '@/hooks/use-theme';

function ScoreRow({
  category,
  value,
  note,
  onValue,
  onNote,
}: {
  category: IhsCategory;
  value: string;
  note: string;
  onValue: (text: string) => void;
  onNote: (text: string) => void;
}) {
  const theme = useTheme();
  const n = parseNumber(value);
  const bad = value.trim() !== '' && (n === null || n < 0 || n > category.max);
  const inputStyle = [styles.input, { color: theme.text, borderColor: bad ? theme.danger : theme.border }];
  return (
    <View style={styles.scoreRow}>
      <View style={styles.scoreLine}>
        <Text style={[styles.scoreLabel, { color: theme.text }]}>{category.label}</Text>
        <TextInput
          value={value}
          onChangeText={onValue}
          keyboardType="decimal-pad"
          placeholder="–"
          placeholderTextColor={theme.textSecondary}
          style={[inputStyle, styles.scoreInput]}
          accessibilityLabel={`${category.part} ${category.label}, out of ${category.max}`}
        />
        <Text style={[styles.max, { color: theme.textSecondary }]}>/ {category.max}</Text>
      </View>
      <TextInput
        value={note}
        onChangeText={onNote}
        placeholder="Note, e.g. why points were lost"
        placeholderTextColor={theme.textSecondary}
        style={[inputStyle, styles.noteInput]}
        accessibilityLabel={`${category.part} ${category.label} note`}
      />
    </View>
  );
}

export default function EvaluationScreen() {
  const { id, evalId } = useLocalSearchParams<{ id: string; evalId?: string }>();
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fish, setFish] = useState<Fish | null>(null);
  const [existing, setExisting] = useState<Evaluation | null>(null);
  const [kind, setKind] = useState<EvaluationKind>('practice');
  const [date, setDate] = useState<string | null>(todayISO());
  const [event, setEvent] = useState('');
  const [judge, setJudge] = useState('');
  const [placement, setPlacement] = useState('');
  const [scores, setScores] = useState<Record<string, string>>({});
  const [scoreNotes, setScoreNotes] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getFish(id), evalId ? getEvaluation(evalId) : null])
      .then(async ([f, e]) => {
        setFish(f);
        if (e) {
          setExisting(e);
          setKind(e.kind);
          setDate(e.evaluated_on);
          setEvent(e.event ?? '');
          setJudge(e.judge ?? '');
          setPlacement(e.placement ?? '');
          setScores(Object.fromEntries(Object.entries(e.scores).map(([k, v]) => [k, numberText(v)])));
          setScoreNotes(e.score_notes);
          setNotes(e.notes ?? '');
          if (e.photo_path) setPhotoUrl((await signedPhotoUrls([e.photo_path]))[e.photo_path] ?? null);
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
  }, [id, evalId]);

  if (loading) return <Loading />;
  if (!fish) return <Screen><ErrorText message={error ?? 'Fish not found.'} /></Screen>;

  // The class is taken from the fish when first scored, then kept as it was.
  const sex = existing?.sex ?? (fish.sex === 'F' ? 'F' : fish.sex === 'M' ? 'M' : null);
  if (!sex) {
    return (
      <Screen>
        <Muted>IHS scoring is different for males and females. Set the sex of this fish before scoring it.</Muted>
        <Button title="Edit fish" onPress={() => router.replace({ pathname: '/fish/[id]/edit', params: { id } })} />
      </Screen>
    );
  }
  const klass = existing ?? fish;
  const categories = ihsCategories(sex);
  const parts = [...new Set(categories.map((c) => c.part))];
  const total = categories.reduce((sum, c) => sum + (parseNumber(scores[c.key] ?? '') ?? 0), 0);

  async function save() {
    const parsed: Record<string, number> = {};
    for (const c of categories) {
      const text = scores[c.key] ?? '';
      if (text.trim() === '') continue;
      const n = parseNumber(text);
      if (n === null || n < 0 || n > c.max) {
        setError(`${c.part} ${c.label.toLowerCase()} must be from 0 to ${c.max}.`);
        return;
      }
      parsed[c.key] = n;
    }
    const notesByKey = Object.fromEntries(
      categories.map((c) => [c.key, scoreNotes[c.key]?.trim() ?? '']).filter(([, v]) => v !== ''),
    );
    setBusy(true);
    setError(null);
    try {
      let photoPath = existing?.photo_path ?? null;
      if (photo && session) photoPath = await uploadPhoto(session.user.id, id, photo.base64, photo.mimeType);
      await saveEvaluation(evalId ?? null, {
        fish_id: id,
        kind,
        evaluated_on: date ?? todayISO(),
        event: kind === 'official' ? blankToNull(event) : null,
        judge: blankToNull(judge),
        sex: sex!,
        tail_standard: klass.tail_standard,
        base_colour: klass.base_colour,
        cover_colours: klass.cover_colours,
        scores: parsed,
        score_notes: notesByKey,
        placement: kind === 'official' ? blankToNull(placement) : null,
        photo_path: photoPath,
        notes: blankToNull(notes),
      });
      // A replaced photo is no longer used by anything.
      if (existing?.photo_path && photoPath !== existing.photo_path) await removeStoredPhotos([existing.photo_path]);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Delete this evaluation?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteEvaluation(existing!);
          router.back();
        },
      },
    ]);
  }

  async function addPhoto(source: 'camera' | 'library') {
    const picked = await pickPhoto(source);
    if (picked) setPhoto(picked);
  }

  const shownPhoto = photo?.uri ?? photoUrl;

  return (
    <Screen>
      <Stack.Screen options={{ title: evalId ? 'Edit evaluation' : 'New evaluation' }} />
      <Card>
        <InfoRow label="Fish" value={fish.fish_code} />
        <InfoRow label="Class" value={labelOf(TAIL_STANDARDS, klass.tail_standard as Fish['tail_standard'])} />
        <InfoRow label="Base colour" value={labelOf(BASE_COLOURS, klass.base_colour)} />
        <InfoRow label="Cover colour" value={klass.cover_colours.map((c) => labelOf(COVER_COLOURS, c)).join(', ')} />
      </Card>

      <ChipSelect label="Kind" options={EVALUATION_KINDS} value={kind} onChange={(v) => v && setKind(v)} />
      <DateField label="Date" value={date} onChange={setDate} />
      {kind === 'official' ? <Field label="Show or event" value={event} onChangeText={setEvent} /> : null}
      <Field
        label={kind === 'breeder' ? 'Scored by' : 'Judge'}
        value={judge}
        onChangeText={setJudge}
        placeholder="Name"
      />

      {parts.map((part) => (
        <Card key={part}>
          <Heading>{part}</Heading>
          {categories
            .filter((c) => c.part === part)
            .map((c) => (
              <ScoreRow
                key={c.key}
                category={c}
                value={scores[c.key] ?? ''}
                note={scoreNotes[c.key] ?? ''}
                onValue={(text) => setScores({ ...scores, [c.key]: text })}
                onNote={(text) => setScoreNotes({ ...scoreNotes, [c.key]: text })}
              />
            ))}
        </Card>
      ))}

      <Card style={styles.totalCard}>
        <Body style={styles.total}>
          {Math.round(total * 10) / 10} / {ihsMaxTotal(sex)}
        </Body>
        <Muted>Total, added up from the scores above</Muted>
      </Card>

      {kind === 'official' ? (
        <Field label="Placement or award" value={placement} onChangeText={setPlacement} placeholder="e.g. 1st, Best of Show" />
      ) : null}

      {shownPhoto ? <Image source={{ uri: shownPhoto }} style={styles.photo} contentFit="cover" /> : null}
      <View style={styles.buttons}>
        <View style={{ flex: 1 }}>
          <Button title="Take photo" variant="secondary" small onPress={() => addPhoto('camera')} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Choose photo" variant="secondary" small onPress={() => addPhoto('library')} />
        </View>
      </View>
      <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
      <ErrorText message={error} />
      <Button title={evalId ? 'Save changes' : 'Save evaluation'} onPress={save} busy={busy} />
      {evalId ? <Button title="Delete evaluation" variant="danger" onPress={confirmDelete} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scoreRow: { gap: Spacing.one, paddingVertical: Spacing.one },
  scoreLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  scoreLabel: { flex: 1, fontSize: 16 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 15 },
  scoreInput: { width: 64, textAlign: 'center', fontSize: 17 },
  noteInput: { fontSize: 14 },
  max: { width: 36, fontSize: 15 },
  totalCard: { alignItems: 'center', gap: 2 },
  total: { fontSize: 32, lineHeight: 38, fontWeight: '700' },
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: 12 },
  buttons: { flexDirection: 'row', gap: Spacing.two },
});
