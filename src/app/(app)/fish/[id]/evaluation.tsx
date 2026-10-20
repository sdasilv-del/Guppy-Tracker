import { router, Stack, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, type TextInput, View } from 'react-native';

import { DangerZone } from '@/components/evaluation/danger-zone';
import { ClassCard, DisqualifiedNotice, FemaleSheetTitle, LockedNotice } from '@/components/evaluation/header';
import { MaleScoring } from '@/components/evaluation/male-scoring';
import { CertificateCard, ScorePhoto } from '@/components/evaluation/photos';
import { PinnedTotal, PinnedTotalSpace, ScoreKeyboardBar, TotalCard } from '@/components/evaluation/totals';
import { pickPhoto, type PickedPhoto } from '@/components/fish-form';
import { FemaleScoreSheet, type FemaleSheetState, femaleTotals } from '@/components/female-score-sheet';
import { Button, ChipSelect, DateField, ErrorText, Field, Loading, Muted, Screen } from '@/components/ui';
import { Icons } from '@/constants/icons';
import { Spacing } from '@/constants/theme';
import {
  EVALUATION_KINDS,
  type EvaluationKind,
  type IhsCategory,
  ihsCategories,
  IHS_STANDARD_YEAR,
  ihsMaxTotal,
} from '@/lib/constants';
import { useAuth } from '@/lib/auth';
import { femaleReasonOptions } from '@/lib/ihs-female';
import { categoryGuide, disqualifications, MALE_REASONS, reasonById } from '@/lib/ihs-reasons';
import {
  deleteEvaluation,
  getEvaluation,
  getFish,
  lockEvaluation,
  removeStoredPhotos,
  saveEvaluation,
  signedPhotoUrls,
  uploadPhoto,
} from '@/lib/db';
import { blankToNull, numberText, parseNumber, todayISO } from '@/lib/format';
import * as haptics from '@/lib/haptics';
import type { Evaluation, Fish } from '@/lib/types';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { attempt } from '@/lib/alerts';

// The show, judge and kind of the last score saved, offered again for the next fish scored.
const LAST_SCORE_KEY = 'gt-last-evaluation';

// Loads the fish and its score, owns the form, and saves, locks or deletes it.
// The parts of the sheet live in src/components/evaluation/.
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
  const [scoreReasons, setScoreReasons] = useState<Record<string, string[]>>({});
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [certificate, setCertificate] = useState<PickedPhoto | null>(null);
  const [certificateUrl, setCertificateUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Males are scored one body part at a time, with the running total pinned below.
  const [partIndex, setPartIndex] = useState(0);
  const [allParts, setAllParts] = useState(false);
  // Score boxes by category, so Next can move to the next one.
  const [inputs] = useState(() => new Map<string, TextInput | null>());
  const [focused, setFocused] = useState<string | null>(null);

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
          setScoreReasons(e.score_reasons ?? {});
          setNotes(e.notes ?? '');
          const paths = [e.photo_path, e.certificate_path].filter((p): p is string => !!p);
          const urls = await signedPhotoUrls(paths);
          if (e.photo_path) setPhotoUrl(urls[e.photo_path] ?? null);
          if (e.certificate_path) setCertificateUrl(urls[e.certificate_path] ?? null);
        } else {
          try {
            const last = JSON.parse((await AsyncStorage.getItem(LAST_SCORE_KEY)) ?? 'null');
            if (last) {
              setKind(last.kind);
              setJudge(last.judge ?? '');
              // A show is only offered on the day it was scored.
              if (last.on === todayISO()) setEvent(last.event ?? '');
            }
          } catch {}
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
  }, [id, evalId]);

  // Unsaved-changes check: compares the form with how it looked once loaded.
  const snapshot = JSON.stringify({ kind, date, event, judge, placement, scores, scoreNotes, scoreReasons, notes, photo: photo?.uri, certificate: certificate?.uri });
  const [baseline, setBaseline] = useState<string | null>(null);
  useEffect(() => {
    // Taken once, right after loading finishes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!loading && baseline === null) setBaseline(snapshot);
  }, [loading, baseline, snapshot]);
  const { allowLeave, blockLeave } = useUnsavedChanges(baseline !== null && snapshot !== baseline);

  if (loading) return <Loading />;
  if (!fish) return <Screen><ErrorText message={error ?? 'Fish not found.'} /></Screen>;

  // The class is taken from the fish when first scored, then kept as it was.
  const sex = existing?.sex ?? (fish.sex === 'F' ? 'F' : fish.sex === 'M' ? 'M' : null);
  if (!sex) {
    return (
      <Screen>
        <Muted>IHS scoring is different for males and females. Set the sex of this fish before scoring it.</Muted>
        <Button title="Edit fish" icon={Icons.edit} onPress={() => router.replace({ pathname: '/fish/[id]/edit', params: { id } })} />
      </Screen>
    );
  }
  const klass = existing ?? fish;
  const categories = ihsCategories(sex);
  const parts = [...new Set(categories.map((c) => c.part))];
  const pointsFor = (list: IhsCategory[]) =>
    Math.round(list.reduce((sum, c) => sum + (parseNumber(scores[c.key] ?? '') ?? 0), 0) * 10) / 10;
  const total = pointsFor(categories);
  const reasonOptions = (key: string) => (sex === 'M' ? MALE_REASONS[key] : undefined);
  // Only the male sheet can disqualify.
  const dq = sex === 'M' ? disqualifications(scoreReasons) : [];
  const dqText = dq.map((r) => r.label.replace('Disqualified: ', '')).join(', ');
  const female = sex === 'F' ? femaleTotals(scores) : null;
  const femaleState: FemaleSheetState = {
    scores,
    reasons: scoreReasons,
    notes: scoreNotes,
  };
  function changeFemale(next: Partial<FemaleSheetState>) {
    if (next.scores) setScores(next.scores);
    if (next.reasons) setScoreReasons(next.reasons);
    if (next.notes) setScoreNotes(next.notes);
  }

  function setReasons(key: string, next: string[]) {
    setScoreReasons({ ...scoreReasons, [key]: next });
    // Vitality's behaviour sets its score; every other reason only explains the score.
    const points = next.length === 1 ? reasonById(key, next[0])?.points : undefined;
    if (points !== undefined) setScores({ ...scores, [key]: String(points) });
  }

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
    // Only reasons that belong to this sheet are saved, so male and female lists never mix.
    const reasonKeys = categories.map((c) => c.key);
    const isReason = (key: string, rid: string) =>
      sex === 'M' ? !!reasonById(key, rid) : !!femaleReasonOptions(key)?.reasons.some((r) => r.id === rid);
    const reasonsByKey = Object.fromEntries(
      reasonKeys
        .map((key) => [key, (scoreReasons[key] ?? []).filter((rid) => isReason(key, rid))] as const)
        .filter(([, ids]) => ids.length > 0),
    );
    const notesByKey = Object.fromEntries(
      reasonKeys.map((key) => [key, scoreNotes[key]?.trim() ?? '']).filter(([, v]) => v !== ''),
    );
    setBusy(true);
    allowLeave();
    setError(null);
    try {
      let photoPath = existing?.photo_path ?? null;
      if (photo && session) photoPath = await uploadPhoto(session.user.id, id, photo.base64, photo.mimeType);
      // The certificate photo only belongs to official scores.
      let certificatePath = kind === 'official' ? existing?.certificate_path ?? null : null;
      if (kind === 'official' && certificate && session) {
        certificatePath = await uploadPhoto(session.user.id, id, certificate.base64, certificate.mimeType);
      }
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
        score_reasons: reasonsByKey,
        placement: kind === 'official' ? blankToNull(placement) : null,
        photo_path: photoPath,
        certificate_path: certificatePath,
        notes: blankToNull(notes),
        standard_year: existing?.standard_year ?? IHS_STANDARD_YEAR,
      });
      // A replaced photo is no longer used by anything.
      if (existing?.photo_path && photoPath !== existing.photo_path) await removeStoredPhotos([existing.photo_path]);
      if (existing?.certificate_path && certificatePath !== existing.certificate_path) {
        await removeStoredPhotos([existing.certificate_path]);
      }
      AsyncStorage.setItem(
        LAST_SCORE_KEY,
        JSON.stringify({ kind, judge: blankToNull(judge), event: blankToNull(event), on: todayISO() }),
      ).catch(() => {});
      haptics.saved();
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      blockLeave();
      setBusy(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Delete this evaluation?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          allowLeave();
          attempt(
            () => deleteEvaluation(existing!),
            () => {
              haptics.deleted();
              router.back();
            },
          ).finally(blockLeave);
        },
      },
    ]);
  }

  const locked = !!existing?.locked_at;
  const unsaved = baseline !== null && snapshot !== baseline;

  function confirmLock() {
    if (!judge.trim()) {
      setError("Enter the judge's name and save before locking.");
      return;
    }
    const noCertificate =
      kind === 'official' && !existing?.certificate_path
        ? "\n\nThere's no photo of the official certificate yet, and one can't be added after locking."
        : '';
    Alert.alert(
      'Lock and sign this score?',
      `Signed by ${judge.trim()}. Once locked, nobody can change or delete it, so buyers and clubs can trust it.${noCertificate}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Lock and sign',
          onPress: () => {
            allowLeave();
            attempt(
              () => lockEvaluation(existing!.id),
              () => {
                haptics.locked();
                router.back();
              },
              "Couldn't lock",
            ).finally(blockLeave);
          },
        },
      ],
    );
  }

  async function addPhoto(source: 'camera' | 'library') {
    const picked = await pickPhoto(source);
    if (picked) setPhoto(picked);
  }

  async function addCertificate(source: 'camera' | 'library') {
    const picked = await pickPhoto(source);
    if (picked) setCertificate(picked);
  }

  // Turning to another body part gives a light tick.
  function changePart(index: number) {
    if (index !== partIndex) haptics.selection();
    setPartIndex(index);
  }

  // Next on the number pad moves to the next score, turning to the next body part when needed.
  function focusNext(key: string) {
    const i = categories.findIndex((c) => c.key === key);
    const next = categories[i + 1];
    if (!next) {
      inputs.get(key)?.blur();
      return;
    }
    const nextPart = parts.indexOf(next.part);
    if (!allParts && nextPart !== partIndex) {
      changePart(nextPart);
      setTimeout(() => inputs.get(next.key)?.focus(), 80);
    } else {
      inputs.get(next.key)?.focus();
    }
  }

  return (
    <View style={styles.page}>
      <Screen>
        <Stack.Screen options={{ title: evalId ? 'Edit evaluation' : 'New evaluation' }} />
        {sex === 'F' ? <FemaleSheetTitle /> : null}
        <ClassCard fishCode={fish.fish_code} klass={klass} standardYear={existing?.standard_year ?? IHS_STANDARD_YEAR} />
        {locked ? <LockedNotice evaluation={existing!} /> : null}
        <View pointerEvents={locked ? 'none' : 'auto'} style={[styles.form, locked && styles.lockedForm]}>
          {dq.length > 0 ? <DisqualifiedNotice dqText={dqText} /> : null}

          <ChipSelect label="Kind" options={EVALUATION_KINDS} value={kind} onChange={(v) => v && setKind(v)} />
          <DateField label="Date" value={date} onChange={setDate} />
          {kind === 'official' ? (
            <>
              <Field label="Show or event" value={event} onChangeText={setEvent} />
              <Muted>Official show results also appear under Shows on this fish and count toward season points.</Muted>
            </>
          ) : null}
          <Field
            label={kind === 'breeder' ? 'Scored by' : 'Judge'}
            value={judge}
            onChangeText={setJudge}
            placeholder="Name"
          />

          {sex === 'F' ? <FemaleScoreSheet state={femaleState} onChange={changeFemale} /> : null}

          {sex === 'M' ? (
            <MaleScoring
              categories={categories}
              parts={parts}
              partIndex={partIndex}
              allParts={allParts}
              onPart={changePart}
              onAllParts={setAllParts}
              pointsFor={pointsFor}
              scores={scores}
              scoreNotes={scoreNotes}
              scoreReasons={scoreReasons}
              onScore={(key, text) => setScores({ ...scores, [key]: text })}
              onNote={(key, text) => setScoreNotes({ ...scoreNotes, [key]: text })}
              onReasons={setReasons}
              reasonOptions={reasonOptions}
              guideFor={(key) => categoryGuide(key, klass.tail_standard as Fish['tail_standard'] | null, klass.base_colour)}
              inputs={inputs}
              onFocus={setFocused}
              onNext={focusNext}
            />
          ) : null}

          <TotalCard
            total={total}
            max={ihsMaxTotal(sex)}
            disqualified={dq.length > 0}
            dqText={dqText}
            missing={female ? female.missing.map((c) => c.label) : []}
          />

          {kind === 'official' ? (
            <Field label="Placement or award" value={placement} onChangeText={setPlacement} placeholder="e.g. 1st, Best of Show" />
          ) : null}

          {kind === 'official' ? (
            <CertificateCard uri={certificate?.uri ?? certificateUrl} locked={locked} onAdd={addCertificate} />
          ) : null}

          <ScorePhoto uri={photo?.uri ?? photoUrl} onAdd={addPhoto} />
          <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
        </View>
        <ErrorText message={error} />
        {locked ? null : (
          <>
            <Button title={evalId ? 'Save changes' : 'Save evaluation'} onPress={save} busy={busy} />
            {evalId ? (
              <Button
                title="Lock and sign"
                icon={Icons.done}
                variant="secondary"
                onPress={confirmLock}
                disabled={unsaved}
              />
            ) : null}
            {evalId && unsaved ? <Muted>Save your changes before locking.</Muted> : null}
            {evalId ? (
              <DangerZone note="Deleting removes this score and its photos for good.">
                <Button title="Delete evaluation" variant="danger" onPress={confirmDelete} />
              </DangerZone>
            ) : null}
          </>
        )}
        {sex === 'M' && !locked ? <PinnedTotalSpace /> : null}
      </Screen>
      {sex === 'M' && !locked ? (
        <PinnedTotal
          total={total}
          max={ihsMaxTotal(sex)}
          disqualified={dq.length > 0}
          detail={allParts ? 'Running total' : `${parts[partIndex]} · part ${partIndex + 1} of ${parts.length}`}
        />
      ) : null}
      <ScoreKeyboardBar onNext={() => (focused ? focusNext(focused) : undefined)} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.three },
  page: { flex: 1 },
  lockedForm: { opacity: 0.7 },
});
