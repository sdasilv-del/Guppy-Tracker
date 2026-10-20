import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Heading, Muted } from '@/components/ui';
import { Icons } from '@/constants/icons';
import { Spacing } from '@/constants/theme';

type Source = 'camera' | 'library';

function PhotoButtons({ onAdd }: { onAdd: (source: Source) => void }) {
  return (
    <View style={styles.buttons}>
      <View style={styles.half}>
        <Button title="Take photo" icon={Icons.camera} variant="secondary" small onPress={() => onAdd('camera')} />
      </View>
      <View style={styles.half}>
        <Button title="Choose photo" icon={Icons.library} variant="secondary" small onPress={() => onAdd('library')} />
      </View>
    </View>
  );
}

// The judge's score sheet or certificate, for official scores only.
// It can't be added once the score is locked.
export function CertificateCard({ uri, locked, onAdd }: { uri: string | null; locked: boolean; onAdd: (source: Source) => void }) {
  return (
    <Card>
      <Heading>Official certificate</Heading>
      {uri ? (
        <Image source={{ uri }} style={styles.certificate} contentFit="contain" />
      ) : (
        <Muted>
          Take a picture of the judge&apos;s score sheet or certificate. It proves the score is official and prints as its own
          page in the pedigree. Add it before locking, because a locked score can&apos;t change.
        </Muted>
      )}
      {locked ? null : <PhotoButtons onAdd={onAdd} />}
    </Card>
  );
}

// A photo of the fish on the day it was scored.
export function ScorePhoto({ uri, onAdd }: { uri: string | null; onAdd: (source: Source) => void }) {
  return (
    <>
      {uri ? (
        <Image source={{ uri }} style={styles.photo} contentFit="cover" />
      ) : (
        <Muted>Add a photo of the fish today, so this score can be checked against how it looked.</Muted>
      )}
      <PhotoButtons onAdd={onAdd} />
    </>
  );
}

const styles = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: 12 },
  certificate: { width: '100%', aspectRatio: 3 / 4, borderRadius: 8 },
  buttons: { flexDirection: 'row', gap: Spacing.two },
  half: { flex: 1 },
});
